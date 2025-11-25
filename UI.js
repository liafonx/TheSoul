//UI loader split: dynamically load modular UI pieces
(function () {
  const scripts = ["ui.data.js", "ui.renderers.js", "ui.app.js"];
  let index = 0;

  function applyFilterRowLayout() {
    // Filter row layout start
    const toggleContainer = document.querySelector(".toggle-container");
    if (!toggleContainer) {
      return;
    }
    const toggleGroups = toggleContainer.querySelectorAll(".toggle-group");
    toggleGroups.forEach((group) => {
      if (group.classList.contains("filter-row")) {
        return;
      }
      group.classList.add("filter-row");

      const label = group.querySelector(".toggle-group-title");
      if (label) {
        label.classList.add("filter-label");
      }

      const buttonWrapper = document.createElement("div");
      buttonWrapper.className = "filter-buttons";
      Array.from(group.children)
        .filter((child) => child.tagName === "BUTTON")
        .forEach((button) => {
          buttonWrapper.appendChild(button);
        });

      if (buttonWrapper.children.length > 0) {
        group.appendChild(buttonWrapper);
      }
    });
    // Filter row layout end
  }

  function loadNext() {
    if (index >= scripts.length) {
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
      index += 1;
      loadNext();
    };
    script.onerror = (err) => {
      console.error(`Failed to load ${script.src}`, err);
    };
    document.head.appendChild(script);
  }

  loadNext();
})();
