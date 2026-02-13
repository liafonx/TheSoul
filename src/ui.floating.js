/**
 * ui.floating.js - Floating window management
 * Handles open/close/toggle for all floating windows, Esc handler,
 * outside-click handler, and scroll-to-top button.
 */
(function () {
  "use strict";

  // DOM references
  var summaryFloatingWindow = document.getElementById("summaryFloatingWindow");
  var summaryFilterWindow = document.getElementById("summaryFilterWindow");
  var searchFloatingWindow = document.getElementById("searchFloatingWindow");
  var emojiLegendWindow = document.getElementById("emojiLegendWindow");
  var summaryToggleButton = document.getElementById("summaryFloatingToggle");
  var summaryFilterToggle = document.getElementById("summaryFilterToggle");
  var searchFloatingToggle = document.getElementById("searchFloatingToggle");
  var emojiLegendButton = document.getElementById("emojiLegendButton");
  var scrollToTopButton = document.getElementById("scrollToTopButton");
  var checkboxesOverlay = document.getElementById("checkboxesOverlay");

  // ---- Floating window coordination ----

  function closeOtherFloatingWindows(exceptWindow) {
    if (summaryFloatingWindow && summaryFloatingWindow !== exceptWindow) {
      window.setSummaryFloatingVisible(false);
    }
    [summaryFilterWindow, searchFloatingWindow, emojiLegendWindow].forEach(function (win) {
      if (win && win !== exceptWindow) win.classList.remove("visible");
    });
  }

  // ---- Toggle handlers ----

  summaryToggleButton?.addEventListener("click", function (e) {
    e.stopPropagation();
    var nowVisible = !summaryFloatingWindow.classList.contains("visible");
    if (nowVisible) closeOtherFloatingWindows(summaryFloatingWindow);
    window.setSummaryFloatingVisible(nowVisible);
  });

  summaryFilterToggle?.addEventListener("click", function (e) {
    e.stopPropagation();
    if (!summaryFilterWindow) return;
    var nowVisible = !summaryFilterWindow.classList.contains("visible");
    if (nowVisible) closeOtherFloatingWindows(summaryFilterWindow);
    summaryFilterWindow.classList.toggle("visible", nowVisible);
    if (nowVisible) window.buildSummaryFilterUI?.();
  });

  summaryFilterWindow?.addEventListener("click", function (e) {
    e.stopPropagation();
  });

  searchFloatingToggle?.addEventListener("click", function (e) {
    e.stopPropagation();
    if (!searchFloatingWindow) return;
    var nowVisible = !searchFloatingWindow.classList.contains("visible");
    if (nowVisible) closeOtherFloatingWindows(searchFloatingWindow);
    searchFloatingWindow.classList.toggle("visible", nowVisible);
  });

  searchFloatingWindow?.addEventListener("click", function (e) {
    e.stopPropagation();
  });

  emojiLegendButton?.addEventListener("click", function (e) {
    e.stopPropagation();
    if (!emojiLegendWindow) return;
    var nowVisible = !emojiLegendWindow.classList.contains("visible");
    if (nowVisible) closeOtherFloatingWindows(emojiLegendWindow);
    emojiLegendWindow.classList.toggle("visible", nowVisible);
    if (nowVisible) window.buildEmojiLegendUI?.();
  });

  emojiLegendWindow?.addEventListener("click", function (e) {
    e.stopPropagation();
  });

  // ---- Close all floating windows ----

  function closeFloatingWindows() {
    var closedAny = false;
    if (summaryFloatingWindow?.classList.contains("visible")) {
      window.setSummaryFloatingVisible(false);
      closedAny = true;
    }
    if (summaryFilterWindow?.classList.contains("visible")) {
      summaryFilterWindow.classList.remove("visible");
      closedAny = true;
    }
    if (searchFloatingWindow?.classList.contains("visible")) {
      searchFloatingWindow.classList.remove("visible");
      closedAny = true;
    }
    if (emojiLegendWindow?.classList.contains("visible")) {
      emojiLegendWindow.classList.remove("visible");
      closedAny = true;
    }
    if (checkboxesOverlay?.style.display === "block") {
      window.closeOverlay?.();
      closedAny = true;
    }
    return closedAny;
  }

  // ---- Scroll-to-top button ----

  function updateScrollToTopButton() {
    if (!scrollToTopButton) return;
    var visible = window.scrollY > 320;
    scrollToTopButton.classList.toggle("visible", visible);
  }

  scrollToTopButton?.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  window.addEventListener("scroll", updateScrollToTopButton, { passive: true });
  updateScrollToTopButton();

  // ---- Escape key handler ----

  window.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (closeFloatingWindows()) {
      e.preventDefault();
      e.stopPropagation();
    }
  });

  // ---- Outside click handler ----

  window.addEventListener("click", function (e) {
    if (e.target === checkboxesOverlay) {
      window.closeOverlay?.();
    }
    if (summaryFloatingWindow?.classList.contains("visible")) {
      if (!(e.target === summaryFloatingWindow || summaryFloatingWindow.contains(e.target) || e.target === summaryToggleButton)) {
        window.setSummaryFloatingVisible(false);
      }
    }
    if (summaryFilterWindow?.classList.contains("visible")) {
      if (!(e.target === summaryFilterWindow || summaryFilterWindow.contains(e.target) || e.target === summaryFilterToggle)) {
        summaryFilterWindow.classList.remove("visible");
      }
    }
    if (searchFloatingWindow?.classList.contains("visible")) {
      if (!(e.target === searchFloatingWindow || searchFloatingWindow.contains(e.target) || e.target === searchFloatingToggle)) {
        searchFloatingWindow.classList.remove("visible");
      }
    }
    if (emojiLegendWindow?.classList.contains("visible")) {
      var localeContainer = document.getElementById("localeToggleContainer");
      if (!(e.target === emojiLegendWindow || emojiLegendWindow.contains(e.target) || localeContainer?.contains(e.target))) {
        emojiLegendWindow.classList.remove("visible");
      }
    }
  });

  // ---- Exports ----
  window.closeOtherFloatingWindows = closeOtherFloatingWindows;
  window.closeFloatingWindows = closeFloatingWindows;
})();
