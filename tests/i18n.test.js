#!/usr/bin/env node
"use strict";

const assert = require("assert");
const path = require("path");
const locale = require("../localization/generated/zh-CN.game.json");
const shared = require(path.join(__dirname, "..", "src", "balatro_lists.js"));

function run() {
  assert(Object.keys(locale).length >= 300, "locale should contain at least 300 entries");
  assert.strictEqual(locale.Blueprint, "蓝图", "Blueprint translation");
  assert.strictEqual(locale.Baron, "男爵", "Baron translation");
  assert.strictEqual(locale.Retcon, "重构", "Retcon translation");

  assert.strictEqual(shared.translateKey("Blueprint"), "蓝图");
  assert.strictEqual(shared.translateKey("NonExistentKey"), "NonExistentKey");

  assert.strictEqual(shared.JOKER_TRANSLATIONS.Blueprint, "蓝图");
  assert.strictEqual(shared.SPECTRAL_TRANSLATIONS["The Soul"], "灵魂");
  assert.strictEqual(shared.getTagDisplay("Negative Tag"), "🎞️ 负片标签");
  assert.strictEqual(shared.getVoucherDisplay("Retcon"), "🔄 重构");

  console.log("i18n tests passed.");
}

if (require.main === module) {
  try {
    run();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

module.exports = { run };
