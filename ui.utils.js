/**
 * ui.utils.js - Shared UI utilities
 * Contains: face emoji maps, button loading states, DOM helpers
 */
(function (global) {
  "use strict";

  const sharedLists = global.BalatroSharedLists || {};
  const summaryFaceEmojiMapRaw = sharedLists.SUMMARY_FACE_EMOJI || {};
  const jokerTranslations = sharedLists.JOKER_TRANSLATIONS || {};

  // Build normalized maps for face emoji lookups
  // summaryFaceEmojiMap: emoji -> { color, cards: [eng], cardColors: { eng: color } }
  // summaryFaceCardMap: eng -> { emoji, color, cn }
  const summaryFaceEmojiMap = {};
  const summaryFaceCardMap = {};

  Object.entries(summaryFaceEmojiMapRaw).forEach(([emoji, value]) => {
    const color = value && typeof value === "object" ? value.color || "" : value || "";
    let cards = [];
    let cardColors = {};
    if (value && typeof value === "object" && value.cards) {
      cards = Array.isArray(value.cards) ? value.cards : Object.keys(value.cards);
    }
    if (value && typeof value === "object" && value.cardColors) {
      cardColors = value.cardColors;
    }
    summaryFaceEmojiMap[emoji] = { color, cards, cardColors };
    cards.forEach((name) => {
      const cn = jokerTranslations[name] || name;
      const cardColor = cardColors[name] || color;
      summaryFaceCardMap[name] = { emoji, color: cardColor, cn };
    });
  });

  /**
   * Get face info for a text segment (matches joker names)
   * @param {string} seg - Text segment to check
   * @returns {{ emoji: string, color: string, cn: string } | null}
   */
  function getFaceInfoForSegment(seg) {
    const text = seg || "";
    for (const [cardName, info] of Object.entries(summaryFaceCardMap)) {
      if (info.cn && text.includes(info.cn)) return info;
      if (text.includes(cardName)) return info;
    }
    return null;
  }

  /**
   * Set loading state on a button (adds spinner, disables)
   * @param {HTMLButtonElement} btn - Button element
   * @param {boolean} flag - Loading state
   */
  function setButtonLoadingState(btn, flag) {
    if (!btn) return;
    const isLoading = Boolean(flag);
    btn.disabled = isLoading;
    if (isLoading) {
      btn.classList.remove("is-loading");
      void btn.offsetWidth; // force reflow
      btn.classList.add("is-loading");
    } else {
      btn.classList.remove("is-loading");
    }
  }

  /**
   * Create a DOM element with optional class and text
   * @param {string} tag - HTML tag name
   * @param {string} [className] - CSS class(es)
   * @param {string} [text] - Text content
   * @returns {HTMLElement}
   */
  function createElement(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  /**
   * Parse summary text into segments with face info
   * @param {string} text - Summary text line
   * @param {Object} options - Options { containerClass, itemClass, delimiterClass, pipeClass }
   * @returns {DocumentFragment}
   */
  function renderSummarySegments(text, options = {}) {
    const {
      itemClass = "summaryFaceSegment",
      delimiterClass = "summaryDelimiter",
      pipeClass = "summaryPipe",
    } = options;

    const frag = document.createDocumentFragment();
    const segments = text.split("、");

    segments.forEach((seg, idx) => {
      const trimmedSeg = seg.trim();
      if (!trimmedSeg) return;

      // Split on '|' so pipe keeps default color
      const chunks = trimmedSeg.split(/(\|)/);
      chunks.forEach((chunk) => {
        if (!chunk) return;
        if (chunk === "|") {
          const pipeSpan = createElement("span", pipeClass, " | ");
          frag.appendChild(pipeSpan);
          return;
        }

        const info = getFaceInfoForSegment(chunk);
        const span = createElement("span", info ? itemClass : null, chunk);
        if (info) {
          span.dataset.faceEmoji = info.emoji;
          const isNegative = chunk.includes("‼️");
          if (isNegative) {
            span.classList.add("negativeFace");
          } else if (info.color) {
            span.style.color = info.color;
          }
        }
        frag.appendChild(span);
      });

      // Add delimiter between items
      if (idx < segments.length - 1) {
        const delim = createElement("span", delimiterClass, "、");
        frag.appendChild(delim);
        frag.appendChild(document.createTextNode(" "));
      }
    });

    return frag;
  }

  /**
   * Clean summary line (remove ante prefix)
   * @param {string} rawLine - Raw summary line
   * @returns {string}
   */
  function cleanSummaryLine(rawLine) {
    return rawLine
      .replace(/^\s*ante\s*\d+\s*[：:]\s*/i, "")
      .replace(/^\s*\d+\s*[：:]\s*/, "")
      .trim() || rawLine;
  }

  /**
   * Setup drag-to-scroll on an element
   * @param {HTMLElement} element - Scrollable element
   */
  function setupDragScroll(element) {
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    element.addEventListener("mousedown", (e) => {
      if (!element.classList.contains("scrollable")) return;
      isDown = true;
      element.classList.add("active");
      startX = e.pageX - element.offsetLeft;
      scrollLeft = element.scrollLeft;
      element.classList.add("no-select");
    });

    element.addEventListener("mouseleave", () => {
      if (!element.classList.contains("scrollable")) return;
      isDown = false;
      element.classList.remove("active", "no-select");
    });

    element.addEventListener("mouseup", () => {
      if (!element.classList.contains("scrollable")) return;
      isDown = false;
      element.classList.remove("active", "no-select");
    });

    element.addEventListener("mousemove", (e) => {
      if (!isDown || !element.classList.contains("scrollable")) return;
      e.preventDefault();
      const x = e.pageX - element.offsetLeft;
      element.scrollLeft = scrollLeft - (x - startX);
    });
  }

  /**
   * Setup pointer-based horizontal drag scroll (for touch/mouse)
   * @param {HTMLElement} element - Element to scroll
   * @param {Object} callbacks - Optional { onDragStart, onDragEnd }
   * @returns {{ isDragging: () => boolean }}
   */
  function setupPointerDragScroll(element, callbacks = {}) {
    let isDragging = false;
    let startX = 0;
    let startScrollLeft = 0;

    element.addEventListener("pointerdown", (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      isDragging = false;
      startX = e.clientX;
      startScrollLeft = element.scrollLeft;
      element.setPointerCapture(e.pointerId);
      callbacks.onDragStart?.();
    });

    element.addEventListener("pointermove", (e) => {
      if (!element.hasPointerCapture(e.pointerId)) return;
      const deltaX = e.clientX - startX;
      if (!isDragging && Math.abs(deltaX) > 4) isDragging = true;
      if (isDragging) element.scrollLeft = startScrollLeft - deltaX;
    });

    const onEnd = (e) => {
      if (element.hasPointerCapture(e.pointerId)) {
        element.releasePointerCapture(e.pointerId);
      }
      if (isDragging) e.preventDefault();
      setTimeout(() => { isDragging = false; }, 0);
      callbacks.onDragEnd?.();
    };

    element.addEventListener("pointerup", onEnd);
    element.addEventListener("pointercancel", onEnd);

    return { isDragging: () => isDragging };
  }

  // Initialize global emoji filter state
  global.summaryEmojiFilter = global.summaryEmojiFilter || {};
  Object.keys(summaryFaceEmojiMap).forEach((emoji) => {
    if (!(emoji in global.summaryEmojiFilter)) {
      global.summaryEmojiFilter[emoji] = true;
    }
  });

  // Initialize global color toggle state
  global.summaryColorOff = Boolean(global.summaryColorOff);

  // Export utilities
  global.BalatroUtils = {
    summaryFaceEmojiMap,
    summaryFaceCardMap,
    getFaceInfoForSegment,
    setButtonLoadingState,
    createElement,
    renderSummarySegments,
    cleanSummaryLine,
    setupDragScroll,
    setupPointerDragScroll,
  };
})(window);

