/**
 * ui.cards.js - Card rendering and group management
 * Contains: queue node building, card groups, layout modes
 */
(function (global) {
  "use strict";

  const t = (key) => global.BalatroI18n?.t ? global.BalatroI18n.t(key) : key;

  // Lazy getters for dependencies
  const getUtils = () => global.BalatroUtils || {};
  const getRenderers = () => global.BalatroRenderers || {};

  // Group size state
  const GROUP_SIZES = [2, 3, 4];
  let currentGroupSize = GROUP_SIZES[0];

  // Callbacks for group size changes
  const groupSizeCallbacks = new Set();
  const groupRenderCallbacks = new Set();
  const groupFilterCallbacks = new Set();

  /**
   * Get current group size
   * @returns {number}
   */
  function getGroupSize() {
    return currentGroupSize;
  }

  /**
   * Set global group size and trigger re-renders
   * @param {number} size
   */
  function setGroupSize(size) {
    if (currentGroupSize === size) return;
    currentGroupSize = size;
    groupSizeCallbacks.forEach((cb) => cb(size));
    groupRenderCallbacks.forEach((cb) => cb());
  }

  /**
   * Register callback for group size changes
   * @param {Function} callback - Receives new size
   */
  function onGroupSizeChange(callback) {
    if (typeof callback === "function") groupSizeCallbacks.add(callback);
  }

  /**
   * Register callback for group re-renders
   * @param {Function} callback
   */
  function onGroupRender(callback) {
    if (typeof callback === "function") groupRenderCallbacks.add(callback);
  }

  /**
   * Register callback for group filter updates
   * @param {Function} callback
   */
  function onGroupFilterUpdate(callback) {
    if (typeof callback === "function") groupFilterCallbacks.add(callback);
  }

  /**
   * Clear all registered callbacks (call on page change)
   */
  function clearCallbacks() {
    groupSizeCallbacks.clear();
    groupRenderCallbacks.clear();
    groupFilterCallbacks.clear();
  }

  /**
   * Trigger group filter updates
   */
  function triggerFilterUpdate() {
    groupFilterCallbacks.forEach((cb) => cb());
  }

  /** Helper: get createElement from utils */
  const createElement = (tag, className, text) => {
    const fn = getUtils().createElement;
    if (fn) return fn(tag, className, text);
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  };

  /**
   * Build queue item nodes from raw queue items
   * @param {string[]} items - Queue item strings
   * @param {Object} options - { textOnly: boolean }
   * @returns {HTMLElement[]}
   */
  function buildQueueNodes(items, options = {}) {
    const utils = getUtils();
    const renderers = getRenderers();
    const {
      getFaceInfoForSegment,
      getSummaryEmojisForText,
      translateGameText = (x) => x,
    } = utils;
    const { maskToCanvas, determineItemType, parseCardItem } = renderers;
    const textOnly = Boolean(options.textOnly);

    return items.map((item) => {
      const { cardName, itemModifiers, itemStickers } = parseCardItem(item);
      const negMatch = /^(‼️|🔘)\s*/.exec(cardName);
      const hasNegativePrefix = !!negMatch;
      const baseName = hasNegativePrefix ? cardName.slice(negMatch[0].length) : cardName;

      const queueItem = createElement("div", "queueItem");
      queueItem.dataset.searchText = [baseName, ...itemModifiers, ...itemStickers].join(" ");
      if (textOnly) queueItem.classList.add("queueItemTextOnly");

      // Set face info data attributes
      const faceInfo = getFaceInfoForSegment?.(baseName);
      if (faceInfo) {
        queueItem.dataset.faceEmoji = faceInfo.emoji;
        if (faceInfo.color) queueItem.dataset.faceColor = faceInfo.color;
      }
      if (faceInfo && (itemModifiers.includes("Negative") || hasNegativePrefix)) {
        queueItem.dataset.negativeFace = "1";
      }
      const summaryEmojis = getSummaryEmojisForText
        ? getSummaryEmojisForText(`${item || ""} ${baseName || ""}`)
        : [];
      if (summaryEmojis.length) {
        queueItem.dataset.summaryEmojis = summaryEmojis.join(",");
      }

      // Render card image (unless text-only)
      if (!textOnly) {
        const canvasWrapper = createElement("div", "cardCanvasWrapper");
        const canvas = document.createElement("canvas");
        canvas.width = 80;
        canvas.height = 107;

        const itemType = determineItemType?.(baseName);
        if (itemType !== "unknown" && maskToCanvas) {
          maskToCanvas(canvas, baseName, itemType, itemModifiers, itemStickers);
        }
        canvasWrapper.appendChild(canvas);

        // Add modifier overlay
        const overlayMod = itemModifiers.find((m) =>
          ["Foil", "Holographic", "Polychrome", "Negative"].includes(m)
        );
        if (overlayMod) {
          const modLabel = createElement("div", "modifier", translateGameText(overlayMod));
          modLabel.classList.add(overlayMod.toLowerCase());
          canvasWrapper.appendChild(modLabel);
        }

        queueItem.appendChild(canvasWrapper);

        // Add sticker labels
        itemStickers.forEach((stick) => {
          queueItem.appendChild(createElement("div", "sticker", translateGameText(stick)));
        });
      }

      // Card name label
      const localizedBase = translateGameText(baseName);
      const localizedCardName = `${hasNegativePrefix ? `${negMatch[1]} ` : ""}${localizedBase}`;
      const nameEl = createElement("div", "cardName", localizedCardName);
      nameEl.dataset.enName = baseName;
      nameEl.dataset.originalText = cardName;
      nameEl.dataset.defaultText = localizedCardName;
      if (hasNegativePrefix) nameEl.dataset.negativeTag = "1";
      queueItem.appendChild(nameEl);

      return queueItem;
    });
  }

  /**
   * Build a card entry with group indicator
   * @param {HTMLElement} node - Queue item node
   * @param {number} groupIndex - Group number
   * @param {number} positionInGroup - Position within group (0-based)
   * @param {boolean} isLast - Is last in group
   * @returns {HTMLElement}
   */
  function buildCardEntry(node, groupIndex, positionInGroup, isLast) {
    const entry = createElement("div", "cardGroupEntry");
    if (positionInGroup === 0) entry.classList.add("cardGroupEntry-first");
    if (isLast) entry.classList.add("cardGroupEntry-last");

    const indicator = createElement("div", "group-indicator");

    // Badge for first item in group
    if (positionInGroup === 0) {
      const badge = createElement("span", "group-badge", String(groupIndex));
      indicator.appendChild(badge);
    }

    // Connecting line
    const line = createElement("span", "group-line");
    line.classList.add(positionInGroup % 2 === 0 ? "line-forward" : "line-reverse");
    indicator.appendChild(line);

    entry.append(indicator, node);
    return entry;
  }

  /**
   * Render queue nodes into grouped card list
   * @param {HTMLElement} cardList - Container element
   * @param {HTMLElement[]} queueNodes - Queue item nodes
   */
  function renderCardGroups(cardList, queueNodes) {
    cardList.innerHTML = "";
    if (!queueNodes.length) return;

    const groupSize = currentGroupSize;
    const totalGroups = Math.ceil(queueNodes.length / groupSize);

    for (let i = 0; i < totalGroups; i++) {
      const wrapper = createElement("div", "cardGroup");
      wrapper.classList.add(i % 2 === 0 ? "group-style-yellow" : "group-style-grey");

      const groupItems = createElement("div", "cardGroupItems");
      const start = i * groupSize;
      const end = Math.min(start + groupSize, queueNodes.length);

      for (let j = start; j < end; j++) {
        const entry = buildCardEntry(queueNodes[j], i, j - start, j === end - 1);
        groupItems.appendChild(entry);
      }

      wrapper.appendChild(groupItems);
      cardList.appendChild(wrapper);
    }
  }

  /**
   * Create group size control buttons
   * @param {Function} onSizeChange - Callback when size changes
   * @returns {HTMLElement}
   */
  function createGroupControls(onSizeChange) {
    const utils = getUtils();
    const { setButtonLoadingState } = utils;

    const controls = createElement("div", "groupSizeControls");
    const label = createElement("span", "groupSizeLabel", t("Group Size:"));
    controls.appendChild(label);

    const localButtons = [];

    const updateButtons = (size) => {
      localButtons.forEach((btn) => {
        btn.classList.toggle("active", Number(btn.dataset.size) === size);
      });
    };

    // Register for global updates
    onGroupSizeChange(updateButtons);

    GROUP_SIZES.forEach((size) => {
      const btn = createElement("button", "cardSetToggle groupSizeButton", String(size));
      btn.type = "button";
      btn.dataset.size = size;

      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        if (setButtonLoadingState) setButtonLoadingState(btn, true);
        setTimeout(() => {
          setGroupSize(size);
          onSizeChange?.(size);
          if (setButtonLoadingState) setButtonLoadingState(btn, false);
        }, 0);
      });

      localButtons.push(btn);
      controls.appendChild(btn);
    });

    updateButtons(currentGroupSize);
    return controls;
  }

  /**
   * Create layout toggle button (grid/carousel)
   * @param {HTMLElement} cardList - Card list container
   * @param {Function} onLayoutChange - Callback with new mode
   * @returns {{ button: HTMLElement, setMode: Function, getMode: Function }}
   */
  function createLayoutToggle(cardList, onLayoutChange) {
    const utils = getUtils();
    const { setButtonLoadingState } = utils;
    let layoutMode = "scroll";

    const button = createElement("button", "cardSetToggle", t("Switch to Grid"));
    button.type = "button";

    const setMode = (mode) => {
      layoutMode = mode;
      const useGrid = mode === "grid";
      cardList.classList.toggle("scrollable", !useGrid);
      cardList.classList.toggle("grid-layout", useGrid);
      cardList.classList.toggle("no-select", !useGrid);
      button.textContent = useGrid ? t("Switch to Carousel") : t("Switch to Grid");
    };

    button.addEventListener("click", () => {
      if (button.disabled) return;
      button.disabled = true;
      if (setButtonLoadingState) setButtonLoadingState(button, true);

      setTimeout(() => {
        setMode(layoutMode === "scroll" ? "grid" : "scroll");
        onLayoutChange?.(layoutMode);
        button.disabled = false;
        if (setButtonLoadingState) setButtonLoadingState(button, false);
      }, 300);
    });

    setMode(layoutMode);
    return { button, setMode, getMode: () => layoutMode };
  }

  /**
   * Apply highlight filter to card groups (hide non-matching)
   * @param {HTMLElement} cardList - Card list container
   * @param {boolean} hideNonHighlighted - Whether to hide groups without highlights
   */
  function applyGroupHighlightFilter(cardList, hideNonHighlighted) {
    cardList.querySelectorAll(".cardGroup").forEach((group) => {
      const hasHighlight = !!group.querySelector(".queueItem.highlight");
      group.style.display = hideNonHighlighted && !hasHighlight ? "none" : "";
    });
  }

  // Export cards module
  global.BalatroCards = {
    GROUP_SIZES,
    getGroupSize,
    setGroupSize,
    onGroupSizeChange,
    onGroupRender,
    onGroupFilterUpdate,
    clearCallbacks,
    triggerFilterUpdate,
    buildQueueNodes,
    buildCardEntry,
    renderCardGroups,
    createGroupControls,
    createLayoutToggle,
    applyGroupHighlightFilter,
  };
})(window);
