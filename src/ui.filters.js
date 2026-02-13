/**
 * ui.filters.js - Settings panel (summary filter UI) and Intro panel (emoji legend)
 * Builds the floating Settings and Intro window content.
 */
(function () {
  "use strict";

  var getUtils = function () { return window.BalatroUtils || {}; };
  var t = function (key) { return window.BalatroI18n?.t ? window.BalatroI18n.t(key) : key; };

  // ---- Summary filter UI (Settings panel) ----

  function buildSummaryFilterUI() {
    var summaryFilterContent = document.getElementById("summaryFilterContent");
    if (!summaryFilterContent) return;
    var utils = getUtils();
    var faceEmojiMap = utils.summaryFaceEmojiMap || {};
    var emojiVisible = window.summaryEmojiVisible !== false;
    summaryFilterContent.innerHTML = "";

    // Emoji visibility toggle
    var emojiToggleBtn = document.createElement("button");
    emojiToggleBtn.type = "button";
    emojiToggleBtn.className = "summaryFilterButton";
    emojiToggleBtn.classList.toggle("active", emojiVisible);
    emojiToggleBtn.textContent = emojiVisible ? t("ui.emojis_visible") : t("ui.emojis_hidden");
    emojiToggleBtn.addEventListener("click", function () {
      window.summaryEmojiVisible = !emojiVisible;
      window.applyEmojiFilter();
      buildSummaryFilterUI();
    });
    summaryFilterContent.appendChild(emojiToggleBtn);

    // Color toggle
    var colorBtn = document.createElement("button");
    colorBtn.type = "button";
    colorBtn.className = "summaryFilterButton";
    var updateColorBtn = function () {
      colorBtn.classList.toggle("active", !window.summaryColorOff);
      colorBtn.textContent = window.summaryColorOff ? t("ui.color_default") : t("ui.color_colorful");
    };
    updateColorBtn();
    colorBtn.addEventListener("click", function () {
      window.summaryColorOff = !window.summaryColorOff;
      document.body?.classList.toggle("summary-color-off", window.summaryColorOff);
      updateColorBtn();
    });
    summaryFilterContent.appendChild(colorBtn);

    // Nearby summaries toggle
    var nearbyBtn = document.createElement("button");
    nearbyBtn.type = "button";
    nearbyBtn.className = "summaryFilterButton";
    var updateNearbyBtn = function () {
      var hasContent = window.hasActiveSearchOrTracking();
      var visible = hasContent && window.summaryNearbyVisible !== false;
      nearbyBtn.classList.toggle("active", visible);
      nearbyBtn.textContent = visible ? t("ui.nearby_visible") : t("ui.nearby_hidden");
      nearbyBtn.disabled = !hasContent;
      nearbyBtn.title = !hasContent ? t("ui.no_tracking_items") : "";
    };
    updateNearbyBtn();
    window.updateNearbySummaryButton = updateNearbyBtn;
    nearbyBtn.addEventListener("click", function () {
      if (!window.hasActiveSearchOrTracking()) return;
      var nextVisible = window.summaryNearbyVisible === false;
      window.summaryNearbyVisible = nextVisible;
      window.setNearbySummariesVisible?.(nextVisible);
      updateNearbyBtn();
    });
    summaryFilterContent.appendChild(nearbyBtn);

    // Emoji filter buttons
    Object.keys(faceEmojiMap).forEach(function (emoji) {
      if (!(emoji in window.summaryEmojiFilter)) {
        window.summaryEmojiFilter[emoji] = true;
      }
    });

    Object.entries(faceEmojiMap).forEach(function (_ref) {
      var emoji = _ref[0], data = _ref[1];
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "summaryFilterButton";
      var isOn = window.summaryEmojiFilter?.[emoji] !== false;
      btn.classList.toggle("active", isOn);

      btn.addEventListener("click", function () {
        var nowOn = !btn.classList.contains("active");
        btn.classList.toggle("active", nowOn);

        window._emojiSyncActive = true;
        try {
          window.summaryEmojiFilter[emoji] = nowOn;
          window.syncEmojiFilterToSearch?.();
          if (typeof window.invalidateTrackingCache === "function") {
            window.invalidateTrackingCache();
          }
          window.extractTrackingItems?.();
          window.renderSummaryList?.();
          window.applyEmojiFilter();
          if (typeof window.refreshNearbySummaries === "function") {
            window.refreshNearbySummaries();
            window.applyEmojiFilter();
          }
          window.BalatroSearch?.searchAndHighlight?.();
          if (typeof window.updateNearbySummaryButton === "function") {
            window.updateNearbySummaryButton();
          }
        } finally {
          window._emojiSyncActive = false;
        }
      });

      var emojiSpan = document.createElement("span");
      emojiSpan.className = "summaryFilterEmoji";
      emojiSpan.textContent = emoji;
      if (data.color) emojiSpan.style.color = data.color;

      btn.appendChild(emojiSpan);
      summaryFilterContent.appendChild(btn);
    });
  }

  // ---- Emoji legend UI (Intro panel) ----

  function buildEmojiLegendUI() {
    var emojiLegendContent = document.getElementById("emojiLegendContent");
    if (!emojiLegendContent) return;
    var utils = getUtils();
    var emojiMap = utils.summaryFaceEmojiMap || {};

    var toDisplayName = function (name) {
      if (name === "Negative marker") return t("ui.negative_marker");
      if (name === "King Cards") return t("ui.king_cards");
      var localized = utils.translateGameText ? utils.translateGameText(name) : name;
      return localized;
    };

    var buildLegendTab = function (container) {
      Object.entries(emojiMap).forEach(function (_ref) {
        var emoji = _ref[0], data = _ref[1];
        var row = document.createElement("div");
        row.className = "emojiLegendRow";

        var icon = document.createElement("span");
        icon.className = "emojiLegendIcon";
        icon.textContent = emoji;
        if (data?.color) icon.style.color = data.color;

        var text = document.createElement("span");
        text.className = "emojiLegendText";
        text.textContent = (data?.cards || []).map(toDisplayName).join(" / ");

        row.append(icon, text);
        container.appendChild(row);
      });

      var packRow = document.createElement("div");
      packRow.className = "emojiLegendRow";
      var packIcon = document.createElement("span");
      packIcon.className = "emojiLegendIcon";
      packIcon.textContent = "\uD83D\uDC5D";
      var packText = document.createElement("span");
      packText.className = "emojiLegendText";
      packText.textContent = t("ui.in_packs_marker");
      packRow.append(packIcon, packText);
      container.appendChild(packRow);
    };

    var buildTipsTab = function (container) {
      var tips = [
        t("ui.tip_click_ante"),
        t("ui.tip_double_click"),
        t("ui.tip_nearby_scroll"),
        t("ui.tip_settings_emoji"),
        t("ui.tip_icon_sync"),
        t("ui.tip_select_all"),
        t("ui.tip_hit_only"),
      ];
      tips.forEach(function (tipText) {
        var row = document.createElement("div");
        row.className = "introTipRow";
        var bullet = Object.assign(document.createElement("span"), { className: "introTipBullet", textContent: "\u2022" });
        var text = Object.assign(document.createElement("span"), { className: "introTipText", textContent: tipText });
        row.append(bullet, text);
        container.appendChild(row);
      });

      var iconTitle = Object.assign(document.createElement("div"), {
        className: "emojiLegendTitle introSubTitle",
        textContent: t("ui.icon_only_buttons"),
      });
      container.appendChild(iconTitle);

      var iconRows = [
        [["\uD83D\uDD0D"], t("ui.open_search_window")],
        [["\u25A6", "\u2194"], t("ui.toggle_card_layout")],
        [["\u25CE", "\u25C9"], t("ui.toggle_hit_only")],
      ];
      iconRows.forEach(function (_ref) {
        var icons = _ref[0], desc = _ref[1];
        var row = document.createElement("div");
        row.className = "emojiLegendRow introIconRow";
        var icon = document.createElement("span");
        icon.className = "emojiLegendIcon introTextIcon" + (icons.length > 1 ? " introTextIconPair" : "");
        if (icons.length > 1) {
          icons.forEach(function (iconText, idx) {
            var glyph = Object.assign(document.createElement("span"), { className: "introPairGlyph", textContent: iconText });
            icon.appendChild(glyph);
            if (idx < icons.length - 1) {
              var sep = Object.assign(document.createElement("span"), { className: "introPairSep", textContent: "/" });
              sep.setAttribute("aria-hidden", "true");
              icon.appendChild(sep);
            }
          });
        } else {
          icon.textContent = icons[0] || "";
        }
        var text = Object.assign(document.createElement("span"), { className: "emojiLegendText", textContent: desc });
        row.append(icon, text);
        container.appendChild(row);
      });
    };

    emojiLegendContent.innerHTML = "";

    var tabs = document.createElement("div");
    tabs.className = "introTabs";
    var legendTabBtn = Object.assign(document.createElement("button"), { type: "button", className: "introTabButton", textContent: t("ui.emoji_legend") });
    var tipsTabBtn = Object.assign(document.createElement("button"), { type: "button", className: "introTabButton", textContent: t("ui.ui_tips") });
    tabs.append(legendTabBtn, tipsTabBtn);
    emojiLegendContent.appendChild(tabs);

    var body = document.createElement("div");
    body.className = "introTabBody";
    emojiLegendContent.appendChild(body);

    var setTab = function (tabName) {
      var showLegend = tabName === "legend";
      legendTabBtn.classList.toggle("active", showLegend);
      tipsTabBtn.classList.toggle("active", !showLegend);
      body.innerHTML = "";
      if (showLegend) buildLegendTab(body);
      else buildTipsTab(body);
      window.__INTRO_ACTIVE_TAB__ = tabName;
    };

    legendTabBtn.addEventListener("click", function () { setTab("legend"); });
    tipsTabBtn.addEventListener("click", function () { setTab("tips"); });
    setTab(window.__INTRO_ACTIVE_TAB__ === "tips" ? "tips" : "legend");
  }

  // ---- Exports ----
  window.buildSummaryFilterUI = buildSummaryFilterUI;
  window.buildEmojiLegendUI = buildEmojiLegendUI;
})();
