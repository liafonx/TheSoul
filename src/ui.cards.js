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
  function resolveCardRenderScale() {
    const root = document.documentElement;
    if (root?.classList.contains("ua-desktop")) return 2;
    if (root?.classList.contains("ua-mobile")) return 1.2;

    const ua = navigator.userAgent || "";
    const isMobile = /Android|iPhone|iPad|iPod|Mobile|Windows Phone|webOS|HarmonyOS/i.test(ua);
    return isMobile ? 1.2 : 2;
  }
  const CARD_RENDER_SCALE = resolveCardRenderScale();

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
    if (!fn) throw new Error("BalatroUtils.createElement is unavailable.");
    return fn(tag, className, text);
  };

  function setCanvasResolution(canvas, logicalWidth, logicalHeight) {
    const scale = CARD_RENDER_SCALE;
    canvas.width = Math.round(logicalWidth * scale);
    canvas.height = Math.round(logicalHeight * scale);
  }

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
        setCanvasResolution(canvas, 80, 107);

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
   * Build a card entry container.
   * @param {HTMLElement|null} node - Queue item node
   * @returns {HTMLElement}
   */
  function buildCardEntry(node) {
    const entry = createElement("div", "cardGroupEntry");
    if (!node) return entry;
    if (node.classList?.contains("queueItemTextOnly")) {
      entry.classList.add("cardGroupEntry-textOnly");
    }
    entry.append(node);
    return entry;
  }

  /**
   * Render queue nodes into grouped card list
   * @param {HTMLElement} cardList - Container element
   * @param {HTMLElement[]} queueNodes - Queue item nodes
   */
  function renderCardGroups(cardList, queueNodes) {
    cardList.innerHTML = "";
    if (!queueNodes.length) {
      cardList.classList.remove("cardList-text-only");
      global.BalatroSearch?.markSearchDomDirty?.();
      return;
    }

    const textOnlyMode = queueNodes.every((node) =>
      node?.classList?.contains("queueItemTextOnly")
    );
    cardList.classList.toggle("cardList-text-only", textOnlyMode);

    const groupSize = currentGroupSize;
    const totalGroups = Math.ceil(queueNodes.length / groupSize);

    for (let i = 0; i < totalGroups; i++) {
      const wrapper = createElement("div", "cardGroup");
      wrapper.classList.add(i % 2 === 0 ? "group-style-yellow" : "group-style-grey");
      wrapper.dataset.group = String(i + 1);

      const start = i * groupSize;
      const end = Math.min(start + groupSize, queueNodes.length);
      const groupHeader = createElement("div", "cardGroupHeader");
      const groupBadge = createElement("span", "group-badge", String(i + 1));
      const groupRange = createElement("span", "group-range", `${start + 1}-${end}`);
      groupHeader.append(groupBadge, groupRange);
      wrapper.appendChild(groupHeader);

      const groupItems = createElement("div", "cardGroupItems");
      const cardsInGroup = Math.max(1, end - start);
      wrapper.style.setProperty("--group-card-count", String(cardsInGroup));
      groupItems.style.setProperty("--cards-per-row", String(cardsInGroup));

      for (let j = start; j < end; j++) {
        const entry = buildCardEntry(queueNodes[j]);
        groupItems.appendChild(entry);
      }

      wrapper.appendChild(groupItems);
      cardList.appendChild(wrapper);
    }
    global.BalatroSearch?.markSearchDomDirty?.();
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
    const label = createElement("span", "groupSizeLabel", t("ui.group_size"));
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

    const button = createElement("button", "cardSetToggle cardSetIconToggle", "");
    button.type = "button";

    const setMode = (mode) => {
      layoutMode = mode;
      const useGrid = mode === "grid";
      cardList.classList.toggle("scrollable", !useGrid);
      cardList.classList.toggle("grid-layout", useGrid);
      cardList.classList.toggle("no-select", !useGrid);
      const actionLabel = useGrid ? t("ui.switch_to_carousel") : t("ui.switch_to_grid");
      button.textContent = useGrid ? "↔" : "▦";
      button.title = actionLabel;
      button.setAttribute("aria-label", actionLabel);
    };

    button.addEventListener("click", () => {
      if (button.disabled) return;
      button.disabled = true;
      if (setButtonLoadingState) setButtonLoadingState(button, true);

      requestAnimationFrame(() => {
        setMode(layoutMode === "scroll" ? "grid" : "scroll");
        onLayoutChange?.(layoutMode);
        button.disabled = false;
        if (setButtonLoadingState) setButtonLoadingState(button, false);
      });
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
    const searchInput = document.getElementById("searchInput");
    const manualTerms = (searchInput?.value || "")
      .split(/[,\uFF0C]/)
      .map((term) => term.trim().toLowerCase())
      .filter((term) => term.length > 0);

    cardList.querySelectorAll(".cardGroup").forEach((group) => {
      const hasHighlightClass = !!group.querySelector(
        ".queueItem.highlight, .queueItem.highlight-search, .queueItem.highlight-track"
      );
      const hasSearchMatch = !hasHighlightClass && manualTerms.length > 0
        ? [...group.querySelectorAll(".queueItem")]
          .some((item) => {
            const corpus = (
              item.dataset.searchCorpusTextOnly ||
              item.dataset.searchCorpus ||
              item.dataset.searchText ||
              item.textContent ||
              ""
            ).toLowerCase();
            return manualTerms.some((term) => corpus.includes(term));
          })
        : false;
      const hasHighlight = hasHighlightClass || hasSearchMatch;
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
