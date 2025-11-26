#!/usr/bin/env python3
"""Dev server that swallows BrokenPipe noise from python -m http.server."""

from __future__ import annotations

import argparse
import os
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class QuietHandler(SimpleHTTPRequestHandler):
    """SimpleHTTPRequestHandler that ignores BrokenPipe errors."""

    def log_error(self, format: str, *args) -> None:  # noqa: A003 (match base sig)
        if args and isinstance(args[-1], BrokenPipeError):
            return
        super().log_error(format, *args)

    def copyfile(self, source, outputfile) -> None:
        try:
            super().copyfile(source, outputfile)
        except BrokenPipeError:
            # Client closed the socket before we finished writing; nothing to do.
            pass


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Serve the static UI locally.")
    parser.add_argument(
        "--port",
        type=int,
        default=4173,
        help="Port to bind to (default: 4173)",
    )
    parser.add_argument(
        "--directory",
        default=os.getcwd(),
        help="Root directory to serve (default: current working directory)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    directory = os.path.abspath(args.directory)
    handler_cls = partial(QuietHandler, directory=directory)
    server = ThreadingHTTPServer(("127.0.0.1", args.port), handler_cls)
    print(f"Serving {directory} at http://127.0.0.1:{args.port} (Ctrl+C to stop)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
