/**
 * ui.init.js - Initialization, URL parameters, and event wiring
 * Service worker registration, URL param parsing, input validation,
 * button event listeners, and search callback registration.
 */
(function () {
  "use strict";

  var t = function (key) { return window.BalatroI18n?.t ? window.BalatroI18n.t(key) : key; };
  var isLocalHost = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);

  // ---- Service worker ----

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    if (!(window.isSecureContext || isLocalHost)) return;
    var swVersion = encodeURIComponent(window.__ASSET_VERSION__ || "1");
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("./sw.js?v=" + swVersion).catch(function (err) {
        console.warn("Service worker registration failed:", err);
      });
    }, { once: true });
  }
  registerServiceWorker();

  // ---- Copy link ----

  function copyLink() {
    var seedInput = document.getElementById("seed");
    var anteInput = document.getElementById("ante");
    var cardsPerAnteInput = document.getElementById("cardsPerAnte");
    var deckSelect = document.getElementById("deck");
    var stakeSelect = document.getElementById("stake");
    var versionSelect = document.getElementById("version");
    var omitBeforeAnte9Checkbox = document.getElementById("omitBeforeAnte9");

    var baseUrl = window.location.origin + window.location.pathname;
    var params = new URLSearchParams();

    var selectedOptions = window.selectedOptions;
    var binaryString = selectedOptions.map(function (u) { return u ? "1" : "0"; }).join("");
    var byteArray = [];
    for (var i = 0; i < binaryString.length; i += 8) {
      byteArray.push(parseInt(binaryString.substr(i, 8).padEnd(8, "0"), 2));
    }
    var base64Unlocks = btoa(String.fromCharCode.apply(null, byteArray));

    if (anteInput.value !== "39") params.append("ante", anteInput.value);
    if (cardsPerAnteInput.value !== "300") params.append("cardsPerAnte", cardsPerAnteInput.value);
    if (deckSelect.value !== "Plasma Deck") params.append("deck", deckSelect.value);
    if (stakeSelect.value !== "White Stake") params.append("stake", stakeSelect.value);
    if (versionSelect.value !== "10115") params.append("version", versionSelect.value);
    if (!omitBeforeAnte9Checkbox.checked) params.append("omitBeforeAnte9", "false");
    if (seedInput.value !== "") params.append("seed", seedInput.value);
    if (base64Unlocks !== "/////////x/4") params.append("unlocks", base64Unlocks);

    navigator.clipboard.writeText(baseUrl + "?" + params.toString())
      .then(function () { alert(t("ui.link_copied")); })
      .catch(function (err) { console.error("Failed to copy link:", err); });
  }

  // ---- Download output ----

  function downloadOutput() {
    var content = window.lastRawOutput || "";
    if (!content) {
      alert(t("ui.nothing_to_download"));
      return;
    }
    var seedInput = document.getElementById("seed");
    var blob = new Blob([content], { type: "text/plain" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = seedInput.value + "_analysis.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---- Input validation helpers ----

  function filterSeed(seed) {
    return seed.replace(/[^A-Za-z0-9]/g, "").toUpperCase().replace(/0/g, "O").slice(0, 8);
  }

  // ---- Wire up button event listeners ----

  var copyLinkButton = document.getElementById("copyButton");
  var downloadButton = document.getElementById("downloadButton");
  var analyzeButton = document.getElementById("analyzeButton");

  copyLinkButton?.addEventListener("click", copyLink);
  downloadButton?.addEventListener("click", downloadOutput);
  analyzeButton?.addEventListener("click", function () { window.performAnalysis?.(); });

  // ---- DOMContentLoaded: URL params, input validation, initial render ----

  window.addEventListener("DOMContentLoaded", function () {
    var urlParams = new URLSearchParams(window.location.search);

    var seedInput = document.getElementById("seed");
    var anteInput = document.getElementById("ante");
    var cardsPerAnteInput = document.getElementById("cardsPerAnte");
    var deckSelect = document.getElementById("deck");
    var stakeSelect = document.getElementById("stake");
    var versionSelect = document.getElementById("version");
    var omitBeforeAnte9Checkbox = document.getElementById("omitBeforeAnte9");

    // Decode unlocks from URL
    var urlUnlocks = urlParams.get("unlocks");
    if (urlUnlocks) {
      var binaryString = atob(urlUnlocks).split("").map(function (c) { return c.charCodeAt(0).toString(2).padStart(8, "0"); }).join("");
      var paddingLength = binaryString.length % 8;
      var unpadded = paddingLength > 0 ? binaryString.slice(0, -paddingLength) : binaryString;
      window.selectedOptions = unpadded.split("").map(function (b) { return b === "1"; });
    }

    // Apply URL parameters
    var urlAnte = urlParams.get("ante");
    var urlCardsPerAnte = urlParams.get("cardsPerAnte");
    var urlDeck = urlParams.get("deck");
    var urlStake = urlParams.get("stake");
    var urlSeed = urlParams.get("seed");
    var urlVersion = urlParams.get("version");
    var urlOmitBeforeAnte9 = urlParams.get("omitBeforeAnte9");

    if (urlAnte) {
      anteInput.value = window.clampAnteValue(urlAnte);
      cardsPerAnteInput.value = urlCardsPerAnte || "300";
    }
    if (urlCardsPerAnte) cardsPerAnteInput.value = urlCardsPerAnte;
    if (urlDeck) deckSelect.value = urlDeck;
    if (urlStake) stakeSelect.value = urlStake;
    if (urlVersion) versionSelect.value = urlVersion;
    if (urlOmitBeforeAnte9 !== null) omitBeforeAnte9Checkbox.checked = urlOmitBeforeAnte9 !== "false" && urlOmitBeforeAnte9 !== "0";

    if (urlSeed) {
      seedInput.value = filterSeed(urlSeed);
      window.instantAnalysis = true;
    }

    // Input validation
    seedInput.addEventListener("input", function () { seedInput.value = filterSeed(seedInput.value); });
    anteInput.addEventListener("input", function () { anteInput.value = window.clampAnteValue(anteInput.value); });
    cardsPerAnteInput.addEventListener("input", function () { cardsPerAnteInput.value = Math.max(Number(cardsPerAnteInput.value), 0); });

    // Initial render
    window.applyUiLocalization?.();
    window.renderSummaryList?.();
    window.applyEmojiFilter();

    // ---- Search callback registration ----
    // Must wait for BalatroSearch to be available (loaded dynamically by UI.js)

    function registerSearchCallback() {
      if (window.BalatroSearch?.onSearchChange) {
        window.BalatroSearch.onSearchChange(function () {
          // Skip when emoji click handler is managing the full pipeline
          if (window._emojiSyncActive) return;
          // Refresh tracking data from raw output using current activeToggleTerms.
          // extractTrackingItems updates lastTrackingSummariesByAnte, then calls
          // augmentSummaryWithSearch internally — so we must NOT call augment separately.
          if (typeof window.invalidateTrackingCache === "function") {
            window.invalidateTrackingCache();
          }
          window.extractTrackingItems?.();
          window.renderSummaryList?.();
          if (typeof window.updateNearbySummaryButton === "function") {
            window.updateNearbySummaryButton();
          }
          // Update nearby summaries in-place (no full page re-render)
          if (typeof window.refreshNearbySummaries === "function") {
            window.refreshNearbySummaries();
            window.applyEmojiFilter();
          }
        });
      } else {
        requestAnimationFrame(function () { setTimeout(registerSearchCallback, 50); });
      }
    }

    registerSearchCallback();
  });
})();
