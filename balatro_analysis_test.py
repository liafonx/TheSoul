#!/usr/bin/env python3
# Run with: python balatro_analysis_test.py

import os
import re
import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent
JS_SCRIPT = ROOT_DIR / "balatro_analysis.js"
OUTPUTS_DIR = ROOT_DIR / "outputs"


def normalize_text(value: str) -> str:
    return value.replace("\r\n", "\n").replace("\r", "\n")


def run_balatro_cli(input_path: Path) -> str:
    """Run the balatro_analysis.js CLI on a single input file and return stdout."""
    result = subprocess.run(
        ["node", str(JS_SCRIPT), str(input_path)],
        cwd=str(ROOT_DIR),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=True,
    )
    return normalize_text(result.stdout)


def build_raw_ante_map(lines):
    """
    Python port of buildRawAnteMap from balatro_analysis.test.js.
    Collects tags and shop entries keyed by ante number.
    """
    ante_header_re = re.compile(r"^\s*(?:==)?\s*ANTE\s+(\d+)(?:==)?", re.IGNORECASE)
    raw_map = {}
    current = None
    state = None

    for raw_line in lines:
        m = ante_header_re.match(raw_line)
        if m:
            number = m.group(1)
            current = {
                "number": number,
                "tags": [],
                "shop_entries": {},
            }
            raw_map[number] = current
            state = None
            continue

        if current is None:
            continue

        line = raw_line.strip()
        if not line:
            state = None
            continue

        if line.startswith("Shop Queue"):
            state = "shop"
            continue

        if line.startswith("Tags"):
            parts = line.split(":", 1)
            tag_list = parts[1] if len(parts) > 1 else ""
            tags = [tag.strip() for tag in tag_list.split(",") if tag.strip()]
            current["tags"] = tags
            state = None
            continue

        if line.startswith("Boss") or line.startswith("Voucher"):
            state = None
            continue

        if state == "shop":
            m = re.match(r"^(\d+)\)\s+(.*)$", line)
            if m:
                index = int(m.group(1))
                current["shop_entries"][index] = m.group(2)

    return raw_map


def parse_summary_output(summary_text: str):
    """
    Parse CLI summary output into a map keyed by ante number.
    Each entry contains:
      - tag_names: list of tag names (Negative/Double/Voucher)
      - jester_cards: list of {name, index, negative}
    """
    summary_map = {}
    line_re = re.compile(r"^\s*(\d+)\s*：\s*(.*)$")
    jester_re = re.compile(r"([^、|#]+?)(‼️)?#(\d+)")

    for raw_line in summary_text.splitlines():
        raw_line = raw_line.strip()
        if not raw_line:
            continue

        m = line_re.match(raw_line)
        if not m:
            continue

        number = m.group(1)
        rest = m.group(2)

        # Parse tag names from the non-jester segments.
        tag_names = []
        parts = [part.strip() for part in rest.split("|")]
        for part in parts:
            if "(" in part:
                # Skip segments that contain card entries.
                continue
            if any(sym in part for sym in ("🎞️", "🖇️", "🎟️")):
                if "🎞️" in part:
                    tag_names.append("Negative Tag")
                if "🖇️" in part:
                    tag_names.append("Double Tag")
                if "🎟️" in part:
                    tag_names.append("Voucher Tag")
                break

        jester_cards = []
        for jm in jester_re.finditer(rest):
            negative_flag = bool(jm.group(2))
            name = re.sub(r"^[^A-Za-z]*(?=[A-Za-z])", "", jm.group(1).strip())
            index = int(jm.group(3))
            if not name:
                continue
            jester_cards.append(
                {
                    "name": name,
                    "index": index,
                    "negative": negative_flag,
                }
            )

        summary_map[number] = {
            "tag_names": tag_names,
            "jester_cards": jester_cards,
        }

    return summary_map


def summarize_text_via_cli(raw_text: str) -> str:
    """Write raw_text to a temporary file and summarize via the CLI."""
    with tempfile.NamedTemporaryFile(
        mode="w",
        encoding="utf-8",
        suffix=".txt",
        delete=False,
    ) as tmp:
        tmp.write(raw_text)
        tmp_path = Path(tmp.name)

    try:
        return run_balatro_cli(tmp_path)
    finally:
        try:
            tmp_path.unlink()
        except FileNotFoundError:
            pass


class BalatroAnalysisTest(unittest.TestCase):
    def test_fixture_files_match_raw_data(self):
        """Verify CLI summaries agree with raw analysis text for all fixtures."""
        self.assertTrue(
            OUTPUTS_DIR.is_dir(),
            f"Outputs directory not found: {OUTPUTS_DIR}",
        )

        analysis_files = sorted(OUTPUTS_DIR.glob("*_analysis.txt"))
        self.assertTrue(analysis_files, "No *_analysis.txt fixtures found in outputs/")

        # Normalization helper for raw text.
        for analysis_path in analysis_files:
            with self.subTest(fixture=analysis_path.name):
                raw_text = normalize_text(analysis_path.read_text(encoding="utf-8"))
                lines = raw_text.split("\n")

                raw_map = build_raw_ante_map(lines)
                self.assertTrue(raw_map, f"No antes parsed from {analysis_path.name}")

                cli_output = run_balatro_cli(analysis_path)
                summary_map = parse_summary_output(cli_output)
                self.assertTrue(
                    summary_map,
                    f"No summary lines parsed for {analysis_path.name}",
                )

                for ante_number, summary in summary_map.items():
                    self.assertIn(
                        ante_number,
                        raw_map,
                        f"Ante {ante_number} missing in raw data "
                        f"for {analysis_path.name}",
                    )
                    raw = raw_map[ante_number]

                    # Verify that tag emojis correspond to tags in the raw data.
                    for tag_name in summary["tag_names"]:
                        self.assertIn(
                            tag_name,
                            raw["tags"],
                            f"Ante {ante_number}: expected tag '{tag_name}' "
                            f"not found in raw data ({analysis_path.name})",
                        )

                    # Verify that jester cards reported by the CLI exist in the shop
                    # entries and that the negative flag matches the raw line.
                    for card in summary["jester_cards"]:
                        idx = card["index"]
                        name = card["name"]
                        negative = card["negative"]

                        self.assertIn(
                            idx,
                            raw["shop_entries"],
                            f"Ante {ante_number}: no shop entry #{idx} "
                            f"in raw data for {name} ({analysis_path.name})",
                        )
                        shop_line = raw["shop_entries"][idx]

                        name_pattern = re.compile(r"\b" + re.escape(name) + r"\b")
                        self.assertRegex(
                            shop_line,
                            name_pattern,
                            f"Ante {ante_number}: shop entry #{idx} does not "
                            f"mention {name} ({analysis_path.name})",
                        )

                        raw_negative = bool(
                            re.search(
                                r"\bNegative\s+" + re.escape(name) + r"\b",
                                shop_line,
                            )
                        )
                        self.assertEqual(
                            raw_negative,
                            negative,
                            f"Ante {ante_number}: negative flag mismatch for "
                            f"{name} at #{idx} ({analysis_path.name})",
                        )

    def test_king_variant_formatting(self):
        """Verify that king variants are formatted as expected."""
        fixture = """
==ANTE 1==
Boss: The Ox
Voucher: X
Tags:
Shop Queue:
Packs:
Standard Pack - Red Seal King of Hearts

==ANTE 2==
Boss: The Ox
Voucher: X
Tags:
Shop Queue:
Packs:
Standard Pack - Steel King of Clubs

==ANTE 3==
Boss: The Ox
Voucher: X
Tags:
Shop Queue:
Packs:
Standard Pack - Gold King of Diamonds

==ANTE 4==
Boss: The Ox
Voucher: X
Tags:
Shop Queue:
Packs:
Standard Pack - Red Seal Steel King of Spades

==ANTE 5==
Boss: The Ox
Voucher: X
Tags:
Shop Queue:
Packs:
Standard Pack - Red Seal Gold King of Hearts
"""
        summary = summarize_text_via_cli(normalize_text(fixture)).strip().split("\n")
        self.assertEqual(
            5,
            len(summary),
            f"Expected 5 antes in king test fixture, got {len(summary)}",
        )

        expected_snippets = [
            "♔Red Seal King",
            "♔Steel King",
            "♔Gold King",
            "♔Red Seal Steel King",
            "♔Red Seal Gold King",
        ]

        for idx, snippet in enumerate(expected_snippets):
            self.assertIn(
                snippet,
                summary[idx],
                f"Ante line {idx + 1}: expected to contain '{snippet}', "
                f"got: {summary[idx]}",
            )


if __name__ == "__main__":
    unittest.main()
