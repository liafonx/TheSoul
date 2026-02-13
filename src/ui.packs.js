/**
 * ui.packs.js - Pack rendering and filtering
 * Contains: pack card rendering, pack type filtering
 */
(function (global) {
  "use strict";

  const t = (key) => global.BalatroI18n?.t ? global.BalatroI18n.t(key) : key;

  // Lazy getters for dependencies
  const getUtils = () => global.BalatroUtils || {};
  const getRenderers = () => global.BalatroRenderers || {};

  // Pack filter definitions
  const PACK_FILTERS = [
    { key: "ALL", label: "ui.all_packs" },
    { key: "SPECTRAL_BUFFOON", label: "ui.spectral_buffoon" },
    { key: "STANDARD", label: "ui.standard" },
    { key: "ARCANA", label: "ui.arcana" },
    { key: "CELESTIAL", label: "ui.celestial" },
  ];
  function resolveCardRenderScale() {
    const root = document.documentElement;
    if (root?.classList.contains("ua-desktop")) return 2;
    if (root?.classList.contains("ua-mobile")) return 1.2;

    const ua = navigator.userAgent || "";
    const isMobile = /Android|iPhone|iPad|iPod|Mobile|Windows Phone|webOS|HarmonyOS/i.test(ua);
    return isMobile ? 1.2 : 2;
  }
  const CARD_RENDER_SCALE = resolveCardRenderScale();

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
    const {
      getFaceInfoForSegment,
      getSummaryEmojisForText,
      translateGameText = (x) => x,
    } = utils;
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
    const container = createElement("div", "packContainer");
    container.dataset.searchText = [parsedName, ...itemModifiers, ...itemStickers].join(" ");

    // Set face info
    const faceInfo = getFaceInfoForSegment?.(parsedName);
    if (faceInfo) {
      container.dataset.faceEmoji = faceInfo.emoji;
      if (faceInfo.color) container.dataset.faceColor = faceInfo.color;
    }
    if (faceInfo && itemModifiers.includes("Negative")) {
      container.dataset.negativeFace = "1";
    }
    const summaryEmojis = getSummaryEmojisForText
      ? getSummaryEmojisForText(`${cardName || ""} ${parsedName || ""}`)
      : [];
    if (summaryEmojis.length) {
      container.dataset.summaryEmojis = summaryEmojis.join(",");
    }

    if (itemType !== "unknown") {
      // Known card type (joker, tarot, etc.)
      const canvasWrapper = createElement("div", "cardCanvasWrapper");
      const canvas = document.createElement("canvas");
      setCanvasResolution(canvas, 80, 107);
      if (maskToCanvas) {
        maskToCanvas(canvas, parsedName, itemType, itemModifiers, itemStickers);
      }
      canvasWrapper.appendChild(canvas);
      container.appendChild(canvasWrapper);

      // Card name
      const nameEl = createElement("div", "cardName", translateGameText(parsedName));
      nameEl.dataset.enName = parsedName;
      nameEl.dataset.originalText = parsedName;
      container.appendChild(nameEl);

      // Buffoon pack: overlay modifier on image
      if (packType === "Buffoon Pack") {
        const overlayMod = itemModifiers.find((m) =>
          ["Foil", "Holographic", "Polychrome", "Negative"].includes(m)
        );
        if (overlayMod) {
          const modLabel = createElement("div", "modifier", translateGameText(overlayMod));
          modLabel.classList.add(overlayMod.toLowerCase());
          canvasWrapper.appendChild(modLabel);
        }
      } else {
        // Other packs: show modifiers as text
        itemModifiers.forEach((mod) => {
          container.appendChild(createElement("div", "modifier", translateGameText(mod)));
        });
      }

      // Stickers always as text
      itemStickers.forEach((stick) => {
        container.appendChild(createElement("div", "sticker", translateGameText(stick)));
      });
    } else {
      // Standard playing card
      const parsed = parseStandardCardName?.(cardName);
      if (parsed) {
        const { rank, suit, modifiers, seal } = parsed;
        const canvas = document.createElement("canvas");
        setCanvasResolution(canvas, 80, 107);
        if (renderStandardCard) {
          renderStandardCard(canvas, rank, suit, modifiers, seal);
        }
        container.appendChild(canvas);

        const standardEnglishName = getStandardCardName?.(cardName) || cardName;
        const cardText = createElement("div", "standardCardName", translateGameText(standardEnglishName));
        cardText.dataset.enName = standardEnglishName;
        cardText.dataset.originalText = standardEnglishName;
        container.appendChild(cardText);
        container.dataset.searchText = [standardEnglishName, ...modifiers, seal || ""].join(" ").trim();

        modifiers.forEach((mod) => {
          const modEl = createElement("div", "modifier", translateGameText(mod));
          if (getModifierColor) modEl.style.color = getModifierColor(mod);
          container.appendChild(modEl);
        });

        if (seal) {
          const sealEl = createElement("div", "seal", translateGameText(seal));
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
    const utils = getUtils();
    const data = global.BalatroData || {};
    const renderers = getRenderers();
    const { getPackTypeFromName, parseCardItem } = renderers;
    const localizePackName = utils.localizePackName || ((x) => x);
    const trackedItems = new Set(
      [
        ...(data.trackedJokers || []),
        ...(data.trackedSpectrals || []),
        ...(data.trackedTags || []),
        ...(data.trackedBosses || []),
        ...(data.trackedVouchers || []),
      ].map((name) => String(name || "").trim().toLowerCase())
    );

    const typesPresent = getPackTypesPresent(packs);
    let activeFilter = getDefaultPackFilter(typesPresent);

    const hasTrackedPackItem = packs.some((pack) => {
      const [, cardListStr = ""] = String(pack || "").split(" - ");
      if (!cardListStr) return false;
      return cardListStr.split(", ").some((cardNameStr) => {
        const parsed = parseCardItem?.(cardNameStr);
        const baseName = String(parsed?.cardName || cardNameStr || "").trim().toLowerCase();
        return trackedItems.has(baseName);
      });
    });
    if (hasTrackedPackItem) activeFilter = "ALL";

    // Header row
    const headerRow = createElement("div", "packHeaderRow");
    const title = createElement("div", "queueTitle packTitle", t("ui.packs"));
    const toggleIndicator = createElement("span", "packToggleIndicator", "▾");
    toggleIndicator.setAttribute("aria-hidden", "true");
    title.appendChild(toggleIndicator);
    headerRow.appendChild(title);
    headerRow.setAttribute("role", "button");
    headerRow.setAttribute("tabindex", "0");

    // Filter toggles
    const toggles = createElement("div", "pack-filter pack-inline");
    const filterButtons = {};

    PACK_FILTERS.forEach((def) => {
      const btn = createElement("button", "toggle-button", t(def.label));
      btn.type = "button";

      // Check if filter is available
      let isEnabled = true;
      if (def.key === "ALL") isEnabled = packs.length > 0;
      else if (def.key === "SPECTRAL_BUFFOON") isEnabled = typesPresent.has("Spectral Pack") || typesPresent.has("Buffoon Pack");
      else if (def.key === "ARCANA") isEnabled = typesPresent.has("Arcana Pack");
      else if (def.key === "CELESTIAL") isEnabled = typesPresent.has("Celestial Pack");
      else if (def.key === "STANDARD") isEnabled = typesPresent.has("Standard Pack");

      btn.disabled = !isEnabled;
      btn.classList.toggle("disabled", !isEnabled);
      btn.setAttribute("aria-disabled", String(!isEnabled));
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
    let packsBuilt = false;
    let onRenderRaf = 0;
    const packItems = [];

    function scheduleOnRender() {
      if (onRenderRaf) cancelAnimationFrame(onRenderRaf);
      onRenderRaf = requestAnimationFrame(() => {
        onRenderRaf = 0;
        global.BalatroSearch?.markSearchDomDirty?.();
        onRender?.();
      });
    }

    function ensurePacksBuilt() {
      if (packsBuilt) return;
      packsBuilt = true;
      container.innerHTML = "";
      packItems.length = 0;

      packs.forEach((pack) => {
        const [packName, cardListStr] = pack.split(" - ");
        const packType = getPackTypeFromName?.(packName);
        const packCards = cardListStr ? cardListStr.split(", ") : [];
        const packItem = createElement("div", "packItem");

        // Pack name
        const nameEl = createElement("div", "packName", `${localizePackName(packName)}: `);
        nameEl.dataset.enName = packName;
        nameEl.dataset.originalText = packName;
        packItem.appendChild(nameEl);

        const cardsWrap = createElement("div", "packCards");

        // Pack cards
        packCards.forEach((cardNameStr) => {
          const cardEl = renderPackCard(cardNameStr, packType);
          cardsWrap.appendChild(cardEl);
        });

        packItem.appendChild(cardsWrap);
        container.appendChild(packItem);
        packItems.push({ packName, element: packItem });
      });
    }

    function renderPacks() {
      ensurePacksBuilt();
      packItems.forEach(({ packName, element }) => {
        const visible = shouldShowPack(packName, activeFilter);
        element.style.display = visible ? "" : "none";
      });
      scheduleOnRender();
    }

    // Auto-expand when packs contain tracked items
    let collapsed = !hasTrackedPackItem;

    function applyCollapsedState() {
      headerRow.classList.toggle("collapsed", collapsed);
      headerRow.setAttribute("aria-expanded", String(!collapsed));
      toggleIndicator.textContent = collapsed ? "▸" : "▾";
      toggles.style.display = collapsed ? "none" : "";
      container.style.display = collapsed ? "none" : "";
    }

    applyCollapsedState();
    if (!collapsed) renderPacks();

    function toggleCollapsed() {
      collapsed = !collapsed;
      applyCollapsedState();
      if (!collapsed) renderPacks();
    }

    headerRow.addEventListener("click", toggleCollapsed);
    headerRow.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      toggleCollapsed();
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
