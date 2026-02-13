/**
 * ui.locale.js - Localization application and locale toggle
 * Applies translated text to all UI labels and handles language switching.
 */
(function () {
  "use strict";

  var t = function (key) { return window.BalatroI18n?.t ? window.BalatroI18n.t(key) : key; };

  function applyUiLocalization() {
    var settingsHeader = document.querySelector(".input-section h2");
    if (settingsHeader) settingsHeader.textContent = t("ui.config_analyze");

    var setText = function (selector, text) {
      var el = document.querySelector(selector);
      if (el) el.textContent = text;
    };
    var nameToKey = window.BalatroI18n?.nameToKey || function (n) { return n; };
    var localizeSelectOptions = function (selectEl) {
      if (!selectEl) return;
      Array.from(selectEl.options || []).forEach(function (option) {
        var engName = option.value || option.textContent || "";
        var key = nameToKey(engName);
        option.textContent = t(key !== engName ? key : engName);
      });
    };

    setText('label[for="seed"]', t("ui.seed"));
    setText('label[for="ante"]', t("ui.max_ante"));
    setText('label[for="cardsPerAnte"]', t("ui.cards_per_ante"));
    setText('label[for="deck"]', t("ui.deck"));
    setText('label[for="stake"]', t("ui.stake"));
    setText('label[for="version"]', t("ui.version"));
    setText('label[for="omitBeforeAnte9"]', t("ui.omit_before_ante9"));

    var analyzeButton = document.getElementById("analyzeButton");
    var openCheckboxesBtn = document.getElementById("openCheckboxesBtn");
    var copyLinkButton = document.getElementById("copyButton");
    var downloadButton = document.getElementById("downloadButton");
    var exportButton = document.getElementById("exportButton");
    var summaryToggleButton = document.getElementById("summaryFloatingToggle");
    var summaryFilterToggle = document.getElementById("summaryFilterToggle");
    var searchFloatingToggle = document.getElementById("searchFloatingToggle");
    var scrollToTopButton = document.getElementById("scrollToTopButton");
    var localeToggleButton = document.getElementById("localeToggleButton");
    var emojiLegendButton = document.getElementById("emojiLegendButton");
    var submitBtn = document.getElementById("submitBtn");
    var unlockBtn = document.getElementById("unlockBtn");
    var lockBtn = document.getElementById("lockBtn");
    var deckSelect = document.getElementById("deck");
    var stakeSelect = document.getElementById("stake");

    if (analyzeButton) analyzeButton.textContent = t("ui.analyze");
    if (openCheckboxesBtn) openCheckboxesBtn.textContent = t("ui.modify_unlocks");
    if (copyLinkButton) copyLinkButton.textContent = t("ui.copy_link");
    if (downloadButton) downloadButton.textContent = t("ui.download_output");
    if (exportButton) exportButton.textContent = t("ui.copy_summary");
    if (summaryToggleButton) summaryToggleButton.textContent = t("ui.summary");
    if (summaryFilterToggle) summaryFilterToggle.textContent = t("ui.settings");
    if (searchFloatingToggle) {
      searchFloatingToggle.textContent = "\uD83D\uDD0D";
      searchFloatingToggle.title = t("ui.search");
    }
    if (scrollToTopButton) {
      scrollToTopButton.textContent = "\u2191";
      scrollToTopButton.title = t("ui.back_to_top");
      scrollToTopButton.setAttribute("aria-label", t("ui.back_to_top"));
    }

    setText("#checkboxesPopup h2", t("ui.unlocked_items"));
    if (submitBtn) submitBtn.textContent = t("ui.submit");
    if (unlockBtn) unlockBtn.textContent = t("ui.unlock_all");
    if (lockBtn) lockBtn.textContent = t("ui.lock_all");

    var checkboxesOverlay = document.getElementById("checkboxesOverlay");
    if (checkboxesOverlay && checkboxesOverlay.style.display === "block") {
      window.createCheckboxes?.();
    }

    localizeSelectOptions(deckSelect);
    localizeSelectOptions(stakeSelect);

    var localeNow = window.BalatroI18n?.getLocale?.() || window.__BALATRO_LOCALE__ || "zh-CN";
    if (localeToggleButton) {
      var switchToEnglish = localeNow === "zh-CN";
      localeToggleButton.textContent = switchToEnglish ? "EN" : "\u4E2D\u6587";
      localeToggleButton.title = switchToEnglish ? "Switch to English" : "\u5207\u6362\u5230\u4E2D\u6587";
    }
    if (emojiLegendButton) {
      emojiLegendButton.textContent = t("ui.intro");
      emojiLegendButton.title = t("ui.intro");
    }

    var emojiLegendWindow = document.getElementById("emojiLegendWindow");
    if (emojiLegendWindow?.classList.contains("visible")) {
      emojiLegendWindow.classList.remove("visible");
      window.buildEmojiLegendUI?.();
    }
    var summaryFilterWindow = document.getElementById("summaryFilterWindow");
    if (summaryFilterWindow?.classList.contains("visible")) {
      window.buildSummaryFilterUI?.();
    }
  }

  // ---- Locale toggle ----

  var localeToggleButton = document.getElementById("localeToggleButton");
  localeToggleButton?.addEventListener("click", function () {
    var localeNow = window.BalatroI18n?.getLocale?.() || window.__BALATRO_LOCALE__ || "zh-CN";
    var nextLocale = localeNow === "zh-CN" ? "en-US" : "zh-CN";
    try {
      localStorage.setItem("balatro.locale", nextLocale);
    } catch (_err) {
      // Ignore storage failures; reload still picks fallback.
    }
    window.__BALATRO_LOCALE__ = nextLocale;
    window.location.reload();
  });

  // ---- Exports ----
  window.applyUiLocalization = applyUiLocalization;
})();
