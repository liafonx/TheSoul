/**
 * ui.analysis.js - WASM analysis engine
 * Handles Immolate instance creation, seed analysis, single-ante computation,
 * and summary output generation.
 */
(function () {
  "use strict";

  var t = function (key) { return window.BalatroI18n?.t ? window.BalatroI18n.t(key) : key; };

  // ---- Lazy loading of balatro_analysis.js ----

  var balatroAnalysisPromise = null;

  function ensureBalatroAnalysisLoaded() {
    if (window.BalatroAnalysis?.summarizeText) return Promise.resolve(window.BalatroAnalysis);
    if (!balatroAnalysisPromise) {
      balatroAnalysisPromise = new Promise(function (resolve, reject) {
        var script = document.createElement("script");
        var version = window.__ASSET_VERSION__ || "1";
        script.src = "src/balatro_analysis.js?v=" + version;
        script.onload = function () {
          window.BalatroAnalysis?.summarizeText ? resolve(window.BalatroAnalysis) : reject(new Error("BalatroAnalysis missing after load."));
        };
        script.onerror = function () { reject(new Error("Failed to load balatro_analysis.js")); };
        document.head.appendChild(script);
      });
    }
    return balatroAnalysisPromise;
  }

  // ---- Summarize output ----

  function summarizeOutput(sourceButton) {
    var rawText = window.lastRawOutput || "";
    if (!rawText) {
      alert(t("ui.nothing_to_summarize"));
      return Promise.resolve();
    }

    var summaryFloatingContent = document.getElementById("summaryFloatingContent");
    if (summaryFloatingContent) summaryFloatingContent.textContent = t("ui.summarizing");

    var currentLocale = window.BalatroI18n?.getLocale?.() || window.__BALATRO_LOCALE__ || "zh-CN";
    var summaryOptions = String(currentLocale).toLowerCase() === "zh-cn" ? { chineseOnly: true } : {};

    var summaryToggleButton = document.getElementById("summaryFloatingToggle");
    if (sourceButton) window.setButtonLoadingState(sourceButton, true);
    if (summaryToggleButton) window.setButtonLoadingState(summaryToggleButton, true);

    return ensureBalatroAnalysisLoaded()
      .then(function (balatro) {
        var anteMap = balatro.summarizeToAnteMap?.(rawText, summaryOptions);
        if (anteMap?.size) {
          window.lastBaseSummariesByAnte = new Map(anteMap);
          window.lastSummariesByAnte = new Map(anteMap);
          window.lastSummary = Array.from(anteMap.values()).join("\n");
        } else {
          var summary = balatro.summarizeText(rawText, summaryOptions) || rawText;
          var summaryMap = window.buildSummaryLookup(summary);
          window.lastBaseSummariesByAnte = new Map(summaryMap);
          window.lastSummariesByAnte = new Map(summaryMap);
          window.lastSummary = summary;
        }
        window.renderSummaryList();
        window.resetSummaryFloatingScrollPosition();
        window.applyEmojiFilter();
        window.refreshShopDisplay?.();
      })
      .catch(function (err) {
        console.error("Failed to run balatro_analysis:", err);
        var summaryMap = window.buildSummaryLookup(rawText);
        window.lastBaseSummariesByAnte = new Map(summaryMap);
        window.lastSummariesByAnte = new Map(summaryMap);
        window.lastSummary = rawText;

        window.renderSummaryList();
        window.resetSummaryFloatingScrollPosition();
        window.applyEmojiFilter();
        window.refreshShopDisplay?.();
      })
      .finally(function () {
        if (sourceButton) window.setButtonLoadingState(sourceButton, false);
        if (summaryToggleButton) window.setButtonLoadingState(summaryToggleButton, false);
      });
  }

  // ---- Immolate instance creation ----

  function createImmolateInstance(seed, deck, stake, version) {
    var inst = new Immolate.Instance(seed);
    inst.params = new Immolate.InstParams(deck, stake, false, version);
    inst.initLocks(1, false, false);
    ["Overstock Plus", "Liquidation", "Glow Up", "Reroll Glut", "Omen Globe", "Observatory",
     "Nacho Tong", "Recyclomancy", "Tarot Tycoon", "Planet Tycoon", "Money Tree",
     "Antimatter", "Illusion", "Petroglyph", "Retcon", "Palette"].forEach(function (v) { inst.lock(v); });

    var options = window.unlockOptions;
    var selectedOptions = window.selectedOptions;
    options.forEach(function (opt, i) {
      if (!selectedOptions[i]) inst.lock(opt);
    });
    inst.setStake(stake);
    inst.setDeck(deck);
    return inst;
  }

  // ---- Main analysis ----

  function performAnalysis() {
    var anteInput = document.getElementById("ante");
    var cardsPerAnteInput = document.getElementById("cardsPerAnte");
    var deckSelect = document.getElementById("deck");
    var stakeSelect = document.getElementById("stake");
    var versionSelect = document.getElementById("version");
    var seedInput = document.getElementById("seed");
    var analyzeButton = document.getElementById("analyzeButton");
    var omitBeforeAnte9Checkbox = document.getElementById("omitBeforeAnte9");

    var ante = window.clampAnteValue(anteInput.value);
    anteInput.value = String(ante);
    var cardsPerAnte = Array(ante).fill(Number(cardsPerAnteInput.value));
    var cardsPerAnteValue = Number(cardsPerAnteInput.value);
    var deck = deckSelect.value;
    var stake = stakeSelect.value;
    var version = parseInt(versionSelect.value);
    var seed = seedInput.value.toUpperCase().replace(/0/g, "O");

    var output = "";
    var outputChunks = [];
    var workload = ante * cardsPerAnteValue;
    window.setButtonLoadingState(analyzeButton, true);
    window.setGroupButtonsLoading?.(true);
    window.__RESET_SUMMARY_ON_NEXT_OPEN__ = true;
    window.resetSummaryFloatingScrollPosition();

    if (!Number.isFinite(ante) || ante < 1 || !Number.isFinite(cardsPerAnteValue) || cardsPerAnteValue < 0) {
      alert(t("ui.analyze_failed"));
      window.setButtonLoadingState(analyzeButton, false);
      window.setGroupButtonsLoading?.(false);
      return;
    }


    setTimeout(function () {
      var inst = null;
      var didFinalize = false;
      var finalizeAnalysis = function () {
        if (didFinalize) return;
        didFinalize = true;
        window.setButtonLoadingState(analyzeButton, false);
        window.setGroupButtonsLoading?.(false);
      };

      try {
        inst = createImmolateInstance(seed, deck, stake, version);
        var omitBeforeAnte9 = omitBeforeAnte9Checkbox.checked;

        for (var a = 1; a <= ante; a++) {
          inst.initUnlocks(a, false);
          var shouldOutput = !(omitBeforeAnte9 && a < 9);
          var addOutput = shouldOutput ? function (t) { outputChunks.push(t); } : function () {};

          addOutput("==ANTE " + a + "==\n");
          addOutput("Boss: " + inst.nextBoss(a) + "\n");
          var voucher = inst.nextVoucher(a);
          addOutput("Voucher: " + voucher + "\n");
          inst.lock(voucher);

          for (var i = 0; i < Immolate.VOUCHERS.size(); i += 2) {
            if (Immolate.VOUCHERS.get(i) === voucher) {
              if (window.selectedOptions[window.unlockOptions.indexOf(Immolate.VOUCHERS.get(i + 1))]) {
                inst.unlock(Immolate.VOUCHERS.get(i + 1));
              }
            }
          }

          addOutput("Tags: " + inst.nextTag(a) + ", " + inst.nextTag(a) + "\n");
          addOutput("Shop Queue: \n");

          for (var q = 1; q <= cardsPerAnte[a - 1]; q++) {
            addOutput(q + ") ");
            var item = inst.nextShopItem(a);
            if (item.type === "Joker") {
              if (item.jokerData.stickers.eternal) addOutput("Eternal ");
              if (item.jokerData.stickers.perishable) addOutput("Perishable ");
              if (item.jokerData.stickers.rental) addOutput("Rental ");
              if (item.jokerData.edition !== "No Edition") addOutput(item.jokerData.edition + " ");
            }
            addOutput(item.item + "\n");
            item.delete();
          }

          addOutput("\nPacks: \n");
          var numPacks = a === 1 ? 4 : 6;
          for (var p = 1; p <= numPacks; p++) {
            var pack = inst.nextPack(a);
            addOutput(pack + " - ");
            var packInfo = Immolate.packInfo(pack);

            if (packInfo.type === "Celestial Pack") {
              var cards = inst.nextCelestialPack(packInfo.size, a);
              for (var c = 0; c < packInfo.size; c++) {
                addOutput(cards.get(c));
                if (c + 1 !== packInfo.size) addOutput(", ");
              }
              cards.delete();
            }
            if (packInfo.type === "Arcana Pack") {
              var cards = inst.nextArcanaPack(packInfo.size, a);
              for (var c = 0; c < packInfo.size; c++) {
                addOutput(cards.get(c));
                if (c + 1 !== packInfo.size) addOutput(", ");
              }
              cards.delete();
            }
            if (packInfo.type === "Spectral Pack") {
              var cards = inst.nextSpectralPack(packInfo.size, a);
              for (var c = 0; c < packInfo.size; c++) {
                addOutput(cards.get(c));
                if (c + 1 !== packInfo.size) addOutput(", ");
              }
              cards.delete();
            }
            if (packInfo.type === "Buffoon Pack") {
              var cards = inst.nextBuffoonPack(packInfo.size, a);
              for (var c = 0; c < packInfo.size; c++) {
                var joker = cards.get(c);
                if (joker.stickers.eternal) addOutput("Eternal ");
                if (joker.stickers.perishable) addOutput("Perishable ");
                if (joker.stickers.rental) addOutput("Rental ");
                if (joker.edition !== "No Edition") addOutput(joker.edition + " ");
                addOutput(joker.joker);
                if (c + 1 !== packInfo.size) addOutput(", ");
                joker.delete();
              }
              cards.delete();
            }
            if (packInfo.type === "Standard Pack") {
              var cards = inst.nextStandardPack(packInfo.size, a);
              for (var c = 0; c < packInfo.size; c++) {
                var card = cards.get(c);
                if (card.seal !== "No Seal") addOutput(card.seal + " ");
                if (card.edition !== "No Edition") addOutput(card.edition + " ");
                if (card.enhancement !== "No Enhancement") addOutput(card.enhancement + " ");
                var rank = card.base[2];
                var rankName = { T: "10", J: "Jack", Q: "Queen", K: "King", A: "Ace" }[rank] || rank;
                var suitName = { C: "Clubs", S: "Spades", D: "Diamonds", H: "Hearts" }[card.base[0]];
                addOutput(rankName + " of " + suitName);
                if (c + 1 !== packInfo.size) addOutput(", ");
                card.delete();
              }
              cards.delete();
            }
            addOutput("\n");
          }
          addOutput("\n");
        }

        output = outputChunks.join("");
        window.lastRawOutput = output;
        summarizeOutput().finally(function () {
          finalizeAnalysis();
          window.pendingScrollToResults = true;
          window.refreshShopDisplay?.() || document.getElementById("scrollingContainer")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      } catch (err) {
        console.error("Analyze failed:", err);
        alert(t("ui.analyze_failed"));
        finalizeAnalysis();
      } finally {
        if (inst) {
          try {
            inst.delete();
          } catch (_deleteErr) {
            // Ignore cleanup errors
          }
        }
      }
    }, 0);
  }

  // ---- Single ante queue computation ----

  function computeSingleAnteQueue(targetAnte, cardsLimit) {
    var deckSelect = document.getElementById("deck");
    var stakeSelect = document.getElementById("stake");
    var versionSelect = document.getElementById("version");
    var seedInput = document.getElementById("seed");

    var deck = deckSelect.value;
    var stake = stakeSelect.value;
    var version = parseInt(versionSelect.value);
    var seed = seedInput.value.toUpperCase().replace(/0/g, "O");
    var anteNum = Number(targetAnte);
    var limit = Math.max(0, Number(cardsLimit) || 0);

    if (!Number.isFinite(anteNum) || anteNum < 1 || !limit) return [];
    if (typeof Immolate === "undefined" || !Immolate.Instance) {
      console.error("Immolate wasm not ready for single-ante compute.");
      return [];
    }

    var inst = null;
    var lines = [];

    try {
      inst = createImmolateInstance(seed, deck, stake, version);
      inst.initUnlocks(anteNum, false);

      for (var q = 1; q <= limit; q++) {
        var item = inst.nextShopItem(anteNum);
        try {
          var line = q + ") ";
          if (item.type === "Joker" && item.jokerData) {
            if (item.jokerData.stickers.eternal) line += "Eternal ";
            if (item.jokerData.stickers.perishable) line += "Perishable ";
            if (item.jokerData.stickers.rental) line += "Rental ";
            if (item.jokerData.edition === "Negative") line += "\u203C\uFE0F ";
            line += item.item;
          } else {
            line += item.item;
          }
          lines.push(line);
        } finally {
          item.delete();
        }
      }
    } finally {
      if (inst) {
        try {
          inst.delete();
        } catch (_err) {
          // Ignore cleanup errors.
        }
      }
    }
    return lines;
  }

  // ---- Exports ----
  window.summarizeOutput = summarizeOutput;
  window.performAnalysis = performAnalysis;
  window.computeSingleAnteQueue = computeSingleAnteQueue;
})();
