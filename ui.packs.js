/**
 * ui.packs.js - Pack rendering and filtering
 * Contains: pack card rendering, pack type filtering
 */
(function (global) {
  "use strict";

  // Lazy getters for dependencies
  const getUtils = () => global.BalatroUtils || {};
  const getRenderers = () => global.BalatroRenderers || {};

  // Pack filter definitions
  const PACK_FILTERS = [
    { key: "ALL", label: "All Packs" },
    { key: "SPECTRAL_BUFFOON", label: "Spectral&Buffoon" },
    { key: "STANDARD", label: "Standard" },
    { key: "ARCANA", label: "Arcana" },
    { key: "CELESTIAL", label: "Celestial" },
  ];

  /**
   * Helper: create element with class and text
   */
  function createElement(tag, className, text) {
    const utils = getUtils();
    if (utils.createElement) {
      return utils.createElement(tag, className, text);
    }
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  /**
   * Determine which pack types are present in a list of packs
   * @param {string[]} packs - Pack strings
   * @returns {Set<string>}
   */
  function getPackTypesPresent(packs) {
    const renderers = getRenderers();
    const { getPackTypeFromName } = renderers;
    const types = new Set();
    packs.forEach((packStr) => {
      const packName = packStr.split(" - ")[0];
      const type = getPackTypeFromName?.(packName);
      if (type) types.add(type);
    });
    return types;
  }

  /**
   * Determine default pack filter based on available types
   * @param {Set<string>} typesPresent - Available pack types
   * @returns {string}
   */
  function getDefaultPackFilter(typesPresent) {
    if (typesPresent.has("Spectral Pack") || typesPresent.has("Buffoon Pack")) return "SPECTRAL_BUFFOON";
    if (typesPresent.has("Standard Pack")) return "STANDARD";
    if (typesPresent.has("Arcana Pack")) return "ARCANA";
    if (typesPresent.has("Celestial Pack")) return "CELESTIAL";
    return "ALL";
  }

  /**
   * Check if pack should be shown based on filter
   * @param {string} packName - Pack name
   * @param {string} activeFilter - Current filter key
   * @returns {boolean}
   */
  function shouldShowPack(packName, activeFilter) {
    const renderers = getRenderers();
    const { getPackTypeFromName } = renderers;

    if (activeFilter === "ALL") return true;

    const packType = getPackTypeFromName?.(packName);
    if (!packType) return false;

    switch (activeFilter) {
      case "ARCANA": return packType === "Arcana Pack";
      case "CELESTIAL": return packType === "Celestial Pack";
      case "STANDARD": return packType === "Standard Pack";
      case "SPECTRAL_BUFFOON": return packType === "Spectral Pack" || packType === "Buffoon Pack";
      default: return true;
    }
  }

  /**
   * Render a single pack card
   * @param {string} cardName - Card name string
   * @param {string} packType - Pack type
   * @returns {HTMLElement}
   */
  function renderPackCard(cardName, packType) {
    const utils = getUtils();
    const renderers = getRenderers();
    const { getFaceInfoForSegment } = utils;
    const {
      maskToCanvas,
      determineItemType,
      parseCardItem,
      renderStandardCard,
      parseStandardCardName,
      getStandardCardName,
      getModifierColor,
    } = renderers;

    const { cardName: parsedName, itemModifiers, itemStickers } = parseCardItem(cardName);
    const itemType = determineItemType?.(parsedName);
    const container = createElement("div");

    // Set face info
    const faceInfo = getFaceInfoForSegment?.(parsedName);
    if (faceInfo) {
      container.dataset.faceEmoji = faceInfo.emoji;
      if (faceInfo.color) container.dataset.faceColor = faceInfo.color;
    }
    if (faceInfo && itemModifiers.includes("Negative")) {
      container.dataset.negativeFace = "1";
    }

    if (itemType !== "unknown") {
      // Known card type (joker, tarot, etc.)
      const canvasWrapper = createElement("div", "cardCanvasWrapper");
      const canvas = document.createElement("canvas");
      canvas.width = 80;
      canvas.height = 107;
      if (maskToCanvas) {
        maskToCanvas(canvas, parsedName, itemType, itemModifiers, itemStickers);
      }
      canvasWrapper.appendChild(canvas);
      container.appendChild(canvasWrapper);

      // Card name
      const nameEl = createElement("div", "cardName", parsedName);
      nameEl.dataset.originalText = parsedName;
      container.appendChild(nameEl);

      // Buffoon pack: overlay modifier on image
      if (packType === "Buffoon Pack") {
        const overlayMod = itemModifiers.find((m) =>
          ["Foil", "Holographic", "Polychrome", "Negative"].includes(m)
        );
        if (overlayMod) {
          const modLabel = createElement("div", "modifier", overlayMod);
          modLabel.classList.add(overlayMod.toLowerCase());
          canvasWrapper.appendChild(modLabel);
        }
      } else {
        // Other packs: show modifiers as text
        itemModifiers.forEach((mod) => {
          container.appendChild(createElement("div", "modifier", mod));
        });
      }

      // Stickers always as text
      itemStickers.forEach((stick) => {
        container.appendChild(createElement("div", "sticker", stick));
      });
    } else {
      // Standard playing card
      const parsed = parseStandardCardName?.(cardName);
      if (parsed) {
        const { rank, suit, modifiers, seal } = parsed;
        const canvas = document.createElement("canvas");
        canvas.width = 80;
        canvas.height = 107;
        if (renderStandardCard) {
          renderStandardCard(canvas, rank, suit, modifiers, seal);
        }
        container.appendChild(canvas);

        const cardText = createElement("div", "standardCardName", getStandardCardName?.(cardName) || cardName);
        container.appendChild(cardText);

        modifiers.forEach((mod) => {
          const modEl = createElement("div", "modifier", mod);
          if (getModifierColor) modEl.style.color = getModifierColor(mod);
          container.appendChild(modEl);
        });

        if (seal) {
          const sealEl = createElement("div", "seal", seal);
          if (getModifierColor) sealEl.style.color = getModifierColor(seal);
          container.appendChild(sealEl);
        }
      }
    }

    return container;
  }

  /**
   * Create pack section for an ante
   * @param {string[]} packs - Pack strings
   * @param {Function} onRender - Callback after render (for highlight sync)
   * @returns {{ header: HTMLElement, toggles: HTMLElement, container: HTMLElement }}
   */
  function createPackSection(packs, onRender) {
    const renderers = getRenderers();
    const { getPackTypeFromName } = renderers;

    const typesPresent = getPackTypesPresent(packs);
    let activeFilter = getDefaultPackFilter(typesPresent);

    // Header row
    const headerRow = createElement("div", "packHeaderRow");
    const title = createElement("div", "queueTitle packTitle", "Packs");
    headerRow.appendChild(title);

    // Filter toggles
    const toggles = createElement("div", "pack-filter pack-inline");
    const filterButtons = {};

    PACK_FILTERS.forEach((def) => {
      const btn = createElement("button", "toggle-button", def.label);
      btn.type = "button";

      // Check if filter is available
      let isEnabled = true;
      if (def.key === "ALL") isEnabled = packs.length > 0;
      else if (def.key === "SPECTRAL_BUFFOON") isEnabled = typesPresent.has("Spectral Pack") || typesPresent.has("Buffoon Pack");
      else if (def.key === "ARCANA") isEnabled = typesPresent.has("Arcana Pack");
      else if (def.key === "CELESTIAL") isEnabled = typesPresent.has("Celestial Pack");
      else if (def.key === "STANDARD") isEnabled = typesPresent.has("Standard Pack");

      btn.disabled = !isEnabled;
      if (def.key === activeFilter && isEnabled) btn.classList.add("active");

      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        activeFilter = def.key;
        Object.values(filterButtons).forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        renderPacks();
      });

      filterButtons[def.key] = btn;
      toggles.appendChild(btn);
    });

    // Packs container
    const container = createElement("div");

    function renderPacks() {
      container.innerHTML = "";

      packs.forEach((pack) => {
        const [packName, cardListStr] = pack.split(" - ");
        const packType = getPackTypeFromName?.(packName);

        if (!shouldShowPack(packName, activeFilter)) return;

        const packCards = cardListStr ? cardListStr.split(", ") : [];
        const packItem = createElement("div", "packItem");

        // Pack name
        const nameEl = createElement("div", "packName", packName + ": ");
        packItem.appendChild(nameEl);

        // Pack cards
        packCards.forEach((cardNameStr) => {
          const cardEl = renderPackCard(cardNameStr, packType);
          packItem.appendChild(cardEl);
        });

        container.appendChild(packItem);
      });

      onRender?.();
    }

    // Collapsed by default
    let collapsed = true;
    toggles.style.display = "none";
    container.style.display = "none";

    headerRow.addEventListener("click", () => {
      collapsed = !collapsed;
      toggles.style.display = collapsed ? "none" : "";
      container.style.display = collapsed ? "none" : "";
      if (!collapsed) renderPacks();
    });

    return { header: headerRow, toggles, container };
  }

  // Export packs module
  global.BalatroPacks = {
    PACK_FILTERS,
    getPackTypesPresent,
    getDefaultPackFilter,
    shouldShowPack,
    renderPackCard,
    createPackSection,
  };
})(window);
