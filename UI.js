/**
 * UI.js - UI module loader
 * Loads all UI modules in correct dependency order and initializes the shop UI.
 *
 * Load order:
 * 1. ui.data.js - Game data (jokers, tags, etc.)
 * 2. ui.renderers.js - Canvas rendering helpers
 * 3. ui.utils.js - Shared utilities (requires BalatroSharedLists)
 * 4. ui.search.js - Search/highlight (requires BalatroData, BalatroUtils)
 * 5. ui.cards.js - Card rendering (requires BalatroUtils, BalatroRenderers)
 * 6. ui.packs.js - Pack rendering (requires BalatroUtils, BalatroRenderers)
 * 7. ui.app.js - Main orchestrator (requires all above)
 */
(function () {
  "use strict";

  const scripts = [
    "ui.data.js",
    "ui.renderers.js",
    "ui.utils.js",
    "ui.search.js",
    "ui.cards.js",
    "ui.packs.js",
    "ui.app.js",
  ];

  let index = 0;

  /**
   * Apply filter-row layout to toggle groups
   */
  function applyFilterRowLayout() {
    document.querySelectorAll(".toggle-group").forEach((group) => {
      const title = group.querySelector(".toggle-group-title");
      const buttons = group.querySelectorAll(".toggle-button");

      if (!title || !buttons.length) return;

      // Create wrapper for buttons if not already wrapped
      let wrapper = group.querySelector(".toggle-buttons-wrapper");
      if (!wrapper) {
        wrapper = document.createElement("div");
        wrapper.className = "toggle-buttons-wrapper";
        buttons.forEach((btn) => wrapper.appendChild(btn));
        group.appendChild(wrapper);
      }

      group.classList.add("filter-row");
    });
  }

  /**
   * Load scripts sequentially
   */
  function loadNext() {
    if (index >= scripts.length) {
      // All scripts loaded - initialize UI
      if (window.initShopUI) {
        window.initShopUI();
        applyFilterRowLayout();
      } else {
        console.error("initShopUI not found after loading scripts.");
      }
      return;
    }

    const script = document.createElement("script");
    script.src = scripts[index];
    script.onload = () => {
      index++;
      loadNext();
    };
    script.onerror = (err) => {
      console.error(`Failed to load ${script.src}`, err);
    };
    document.head.appendChild(script);
  }

  loadNext();
})();
