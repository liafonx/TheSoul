(function (global) {
  function initShopUI() {
    const data = global.BalatroData || {};
    const renderers = global.BalatroRenderers || {};

    const {
      trackedJokers = [],
      trackedSpectrals = [],
      trackedTags = [],
      trackedBosses = [],
    } = data;
    const {
      maskToCanvas,
      renderStandardCard,
      renderBoss,
      renderTag,
      renderVoucher,
      parseCardItem,
      determineItemType,
      getPackTypeFromName,
      parseStandardCardName,
      getStandardCardName,
      getModifierColor,
    } = renderers;

    if (
      !maskToCanvas ||
      !renderStandardCard ||
      !renderBoss ||
      !renderTag ||
      !renderVoucher
    ) {
      console.error("Balatro render helpers missing; aborting UI init.");
      return;
    }

    const activeToggleTerms = new Set(
      [
        ...trackedJokers,
        ...trackedSpectrals,
        ...trackedTags,
        ...trackedBosses,
      ].map((term) => term.toLowerCase())
    );

    function searchAndHighlight() {
      const searchInput = document.getElementById("searchInput");
      const manualTerms = searchInput.value
        .split(",")
        .map((term) => term.trim().toLowerCase())
        .filter((term) => term.length >= 3);

      const searchTerms = [...manualTerms, ...activeToggleTerms];

      const queueItems = document.querySelectorAll(
        ".queueItem, .packItem > div, .voucherContainer, .tagContainer, .bossContainer"
      );

      queueItems.forEach((item) => {
        const itemText = item.textContent.toLowerCase();
        const shouldHighlight =
          searchTerms.length > 0 &&
          searchTerms.some((term) => itemText.includes(term));
        item.classList.toggle("highlight", shouldHighlight);
      });
    }

    (function () {
      const searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.id = "searchInput";
      searchInput.placeholder = "Enter search terms (comma-separated)";

      const searchLabel = document.createElement("label");
      searchLabel.setAttribute("for", "searchInput");
      searchLabel.textContent =
        "Press enter to search (comma separated values, min length 3 char)";

      const searchContainer = document.createElement("div");
      searchContainer.className = "search-container";
      searchContainer.appendChild(searchLabel);
      searchContainer.appendChild(searchInput);

      document.body.appendChild(searchContainer);
      const toggleContainer = document.createElement("div");
      toggleContainer.className = "toggle-container";
      const toggleGroups = [
        { title: "Jokers:", items: trackedJokers },
        { title: "Spectrals:", items: trackedSpectrals },
        { title: "Tags:", items: trackedTags },
        { title: "Bosses:", items: trackedBosses },
      ];

      toggleGroups.forEach((group) => {
        const groupDiv = document.createElement("div");
        groupDiv.className = "toggle-group";

        const titleSpan = document.createElement("span");
        titleSpan.className = "toggle-group-title";
        titleSpan.textContent = group.title;
        groupDiv.appendChild(titleSpan);

        group.items.forEach((term) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "toggle-button active";
          button.textContent = term;
          const lower = term.toLowerCase();
          button.addEventListener("click", () => {
            if (button.classList.contains("active")) {
              button.classList.remove("active");
              activeToggleTerms.delete(lower);
            } else {
              button.classList.add("active");
              activeToggleTerms.add(lower);
            }
            searchAndHighlight();
          });
          groupDiv.appendChild(button);
        });

        toggleContainer.appendChild(groupDiv);
      });

      document.body.appendChild(toggleContainer);

      document
        .getElementById("searchInput")
        .addEventListener("input", searchAndHighlight);

      const scrollingContainer = document.createElement("div");
      scrollingContainer.id = "scrollingContainer";
      document.body.appendChild(scrollingContainer);

      document
        .getElementById("searchInput")
        .addEventListener("keydown", function (event) {
          if (event.key === "Enter") {
            const highlightedItem = document.querySelector(".highlight");
            if (highlightedItem) {
              highlightedItem.scrollIntoView({
                behavior: "smooth",
                block: "center",
                inline: "center",
              });
            } else {
              console.log("No highlighted item found");
            }
          }
        });

      function extractShopQueues(text) {
        const shopQueues = [];
        const regex = /==ANTE \d+==[\s\S]*?(?=(?:==ANTE \d+==|$))/g;
        const matches = text.match(regex);

        if (matches) {
          matches.forEach((match) => {
            const titleMatch = match.match(/==ANTE \d+==/);
            const title = titleMatch ? titleMatch[0] : "Untitled";
            const bossMatch = match.match(/Boss: (.+)/);
            const voucherMatch = match.match(/Voucher: (.+)/);
            const tagsMatch = match.match(/Tags: (.+)/);
            const queueMatch = match.match(/Shop Queue:([\s\S]*?)(?=Packs:|$)/);
            const packsMatch = match.match(
              /Packs:([\s\S]*?)(?=(?:==ANTE \d+==|$))/
            );

            const boss = bossMatch ? bossMatch[1].trim() : "";
            const voucher = voucherMatch ? voucherMatch[1].trim() : "";
            const tags = tagsMatch
              ? tagsMatch[1]
                  .trim()
                  .split(",")
                  .map((tag) => tag.trim())
              : [];
            const queue = queueMatch
              ? queueMatch[1]
                  .trim()
                  .split("\n")
                  .filter((item) => item.trim() !== "")
              : [];
            const packs = packsMatch
              ? packsMatch[1]
                  .trim()
                  .split("\n")
                  .filter((item) => item.trim() !== "")
              : [];

            shopQueues.push({ title, queue, boss, voucher, tags, packs });
          });
        }

        return shopQueues;
      }

      function displayShopQueues() {
        const textarea = document.getElementById("outputBox");
        const text = textarea.value;
        const shopQueues = extractShopQueues(text);

        scrollingContainer.innerHTML = "";

        shopQueues.forEach(({ title, queue, boss, voucher, tags, packs }) => {
          const queueContainer = document.createElement("div");
          queueContainer.className = "queueContainer";

          const queueTitle = document.createElement("div");
          queueTitle.className = "queueTitle";
          queueTitle.classList.add("anteTitle");
          const cleanTitle = (title.match(/ANTE\s*\d+/i) || [
            title.replace(/=+/g, "").trim(),
          ])[0];
          const m = cleanTitle.match(/^(ANTE)\s*(\d+)/i);
          if (m) {
            const anteNumVal = parseInt(m[2], 10);
            let numClass = "anteNum";
            if (anteNumVal >= 32) numClass += " anteNumRed";
            else if (anteNumVal >= 25) numClass += " anteNumOrange";
            queueTitle.innerHTML = `${m[1]} <span class="${numClass}">${m[2]}</span>`;
          } else {
            queueTitle.textContent = cleanTitle;
          }
          queueContainer.appendChild(queueTitle);

          const queueInfo = document.createElement("div");
          queueInfo.className = "queueInfo";

          const voucherElement = document.createElement("div");
          voucherElement.innerHTML = "<b>Voucher</b>";
          voucherElement.style = "font-size: 16px";
          if (voucher) {
            const voucherContainer = document.createElement("div");
            voucherContainer.className = "voucherContainer";

            const voucherCanvas = document.createElement("canvas");
            voucherCanvas.width = 84;
            voucherCanvas.height = 112;
            renderVoucher(voucherCanvas, voucher);
            voucherContainer.appendChild(voucherCanvas);

            const voucherNameElement = document.createElement("div");
            voucherNameElement.textContent = voucher;
            voucherNameElement.classList.add("voucherName");
            voucherContainer.appendChild(voucherNameElement);

            voucherElement.appendChild(voucherContainer);
          }
          queueInfo.appendChild(voucherElement);

          const tagsElement = document.createElement("div");
          tagsElement.innerHTML = "<b>Tags</b>";
          tagsElement.style = "font-size: 16px";

          const tagsContainer = document.createElement("div");
          tagsContainer.className = "tagsContainer";

          tags.forEach((tag) => {
            const tagContainer = document.createElement("div");
            tagContainer.className = "tagContainer";

            const tagCanvas = document.createElement("canvas");
            tagCanvas.width = 34;
            tagCanvas.height = 34;
            renderTag(tagCanvas, tag);
            tagContainer.appendChild(tagCanvas);

            const tagNameElement = document.createElement("div");
            tagNameElement.textContent = tag;
            tagNameElement.classList.add("tagName");
            tagContainer.appendChild(tagNameElement);

            tagsContainer.appendChild(tagContainer);
          });

          tagsElement.appendChild(tagsContainer);
          queueInfo.appendChild(tagsElement);

          const bossElement = document.createElement("div");
          bossElement.innerHTML = "<b>Boss</b>";
          bossElement.style = "font-size: 16px";

          if (boss) {
            const bossContainer = document.createElement("div");
            bossContainer.className = "bossContainer";

            const bossCanvas = document.createElement("canvas");
            bossCanvas.width = 34;
            bossCanvas.height = 34;
            renderBoss(bossCanvas, boss);
            bossContainer.appendChild(bossCanvas);

            const bossNameElement = document.createElement("div");
            bossNameElement.textContent = boss;
            bossNameElement.classList.add("bossName");
            bossContainer.appendChild(bossNameElement);

            bossElement.appendChild(bossContainer);
          }

          queueInfo.appendChild(bossElement);

          queueContainer.appendChild(queueInfo);

          const cardSet = document.createElement("div");
          cardSet.className = "cardSet";

          const cardSetHeader = document.createElement("div");
          cardSetHeader.className = "cardSetHeader";

          const layoutToggle = document.createElement("button");
          layoutToggle.type = "button";
          layoutToggle.className = "cardSetToggle";
          layoutToggle.textContent = "Switch to Grid";
          cardSetHeader.appendChild(layoutToggle);
          cardSet.appendChild(cardSetHeader);

          const cardList = document.createElement("div");
          cardList.className = "cardList scrollable no-select";
          cardSet.appendChild(cardList);
          queueContainer.appendChild(cardSet);

          let layoutMode = "scroll";
          const applyLayoutMode = (mode) => {
            layoutMode = mode;
            const useGrid = layoutMode === "grid";
            cardList.classList.toggle("scrollable", !useGrid);
            cardList.classList.toggle("grid-layout", useGrid);
            cardList.classList.toggle("no-select", !useGrid);
            layoutToggle.textContent = useGrid
              ? "Switch to Carousel"
              : "Switch to Grid";
          };

          layoutToggle.addEventListener("click", () => {
            applyLayoutMode(layoutMode === "scroll" ? "grid" : "scroll");
          });

          applyLayoutMode(layoutMode);

          queue.forEach((item) => {
            const { cardName, itemModifiers, itemStickers } =
              parseCardItem(item);

            const queueItem = document.createElement("div");
            queueItem.className = "queueItem";

            // Wrapper so we can anchor overlays to the image area itself
            const canvasWrapper = document.createElement("div");
            canvasWrapper.className = "cardCanvasWrapper";

            const canvas = document.createElement("canvas");
            canvas.width = 80;
            canvas.height = 107;

            const itemType = determineItemType(cardName);
            if (itemType !== "unknown") {
              maskToCanvas(
                canvas,
                cardName,
                itemType,
                itemModifiers,
                itemStickers
              );
            }

            canvasWrapper.appendChild(canvas);
            queueItem.appendChild(canvasWrapper);

            const itemText = document.createElement("div");
            itemText.textContent = cardName;
            queueItem.appendChild(itemText);

            // Create a single overlaid modifier label for edition-like modifiers
            const overlayMod = itemModifiers.find((mod) =>
              ["Foil", "Holographic", "Polychrome", "Negative"].includes(mod)
            );

            if (overlayMod) {
              const modifierText = document.createElement("div");
              modifierText.classList.add("modifier");

              const lower = overlayMod.toLowerCase();
              if (lower === "polychrome") {
                modifierText.classList.add("polychrome");
              } else if (lower === "foil") {
                modifierText.classList.add("foil");
              } else if (lower === "negative") {
                // use the custom class name spelling used in CSS
                modifierText.classList.add("negAtive");
              } else if (lower === "holographic") {
                modifierText.classList.add("holographic");
              }

              // keep the label text as the original modifier
              modifierText.textContent = overlayMod;
              canvasWrapper.appendChild(modifierText);
            }

            itemStickers.forEach((stick) => {
              const stickerText = document.createElement("div");
              stickerText.className = "sticker";
              stickerText.textContent = stick;
              queueItem.appendChild(stickerText);
            });
            cardList.appendChild(queueItem);
          });

          if (packs.length > 0) {
            // 只允许一个 pack 过滤器激活：
            // "ALL" 显示所有，其它则按类型过滤
            // 先统计当前 ANTE 中有哪些 pack 类型
            const packTypesPresent = new Set();
            packs.forEach((packStr) => {
              const packNameOnly = packStr.split(" - ")[0];
              const type = getPackTypeFromName(packNameOnly);
              if (type) {
                packTypesPresent.add(type);
              }
            });

            const hasSpectralBuffoon =
              packTypesPresent.has("Spectral Pack") ||
              packTypesPresent.has("Buffoon Pack");
            const hasArcana = packTypesPresent.has("Arcana Pack");
            const hasCelestial = packTypesPresent.has("Celestial Pack");
            const hasStandard = packTypesPresent.has("Standard Pack");

            // 默认优先选 Spectral&Buffoon；
            // 如果没有，则按 Standard → Arcana → Celestial 的顺序
            // 选择第一个存在的类型；如果都没有，则退回 All Packs
            let activePackFilter = "ALL";
            if (hasSpectralBuffoon) {
              activePackFilter = "SPECTRAL_BUFFOON";
            } else if (hasStandard) {
              activePackFilter = "STANDARD";
            } else if (hasArcana) {
              activePackFilter = "ARCANA";
            } else if (hasCelestial) {
              activePackFilter = "CELESTIAL";
            }

            const packHeaderRow = document.createElement("div");
            packHeaderRow.className = "packHeaderRow";

            const packsTitle = document.createElement("div");
            packsTitle.className = "queueTitle packTitle";
            packsTitle.textContent = "Packs";
            packHeaderRow.appendChild(packsTitle);

            const packToggles = document.createElement("div");
            packToggles.className = "pack-filter pack-inline";

            // 定义 pack 过滤按钮：All, Arcana, Celestial, Standard, Spectral&Buffoon
            const toggleDefs = [
              { key: "ALL", label: "All Packs" },
              { key: "SPECTRAL_BUFFOON", label: "Spectral&Buffoon" },
              { key: "STANDARD", label: "Standard" },
              { key: "ARCANA", label: "Arcana" },
              { key: "CELESTIAL", label: "Celestial" },
            ];

            const packFilterButtons = {};

            toggleDefs.forEach((def) => {
              const btn = document.createElement("button");
              btn.type = "button";
              btn.className = "toggle-button";
              btn.textContent = def.label;

              // 根据当前 ANTE 中的 pack 类型决定按钮是否可用
              let isEnabled = true;
              if (def.key === "ALL") {
                isEnabled = packs.length > 0;
              } else if (def.key === "SPECTRAL_BUFFOON") {
                isEnabled = hasSpectralBuffoon;
              } else if (def.key === "ARCANA") {
                isEnabled = hasArcana;
              } else if (def.key === "CELESTIAL") {
                isEnabled = hasCelestial;
              } else if (def.key === "STANDARD") {
                isEnabled = hasStandard;
              }

              btn.disabled = !isEnabled;

              // 默认激活当前选中的过滤器（前提是可用）
              if (def.key === activePackFilter && isEnabled) {
                btn.classList.add("active");
              }

              btn.addEventListener("click", () => {
                if (btn.disabled) return;

                // 把当前点击的设为唯一激活
                activePackFilter = def.key;

                // 更新所有按钮的 active 状态
                Object.values(packFilterButtons).forEach((b) =>
                  b.classList.remove("active")
                );
                btn.classList.add("active");

                renderPacks();
              });

              packFilterButtons[def.key] = btn;
              packToggles.appendChild(btn);
            });
            // Header row only contains the title and separator
            queueContainer.appendChild(packHeaderRow);
            // Pack toggle buttons are rendered on a separate line below the header
            queueContainer.appendChild(packToggles);

            const packsContainer = document.createElement("div");
            queueContainer.appendChild(packsContainer);

            function shouldShowPack(packName) {
              const packType = getPackTypeFromName(packName);

              // All Packs 模式：显示所有
              if (activePackFilter === "ALL") {
                return true;
              }

              // 没法识别类型时，非 ALL 模式下隐藏
              if (!packType) {
                return false;
              }

              if (activePackFilter === "ARCANA") {
                return packType === "Arcana Pack";
              }

              if (activePackFilter === "CELESTIAL") {
                return packType === "Celestial Pack";
              }

              if (activePackFilter === "STANDARD") {
                return packType === "Standard Pack";
              }

              if (activePackFilter === "SPECTRAL_BUFFOON") {
                return (
                  packType === "Spectral Pack" || packType === "Buffoon Pack"
                );
              }

              // 兜底：万一有什么未知值，就都显示
              return true;
            }

            function renderPacks() {
              packsContainer.innerHTML = "";
              packs.forEach((pack) => {
                const packItems = pack.split(" - ");
                const packName = packItems[0];
                const packType = getPackTypeFromName(packName);
                if (!shouldShowPack(packName)) {
                  return;
                }
                const packCards = packItems[1] ? packItems[1].split(", ") : [];

                const packItem = document.createElement("div");
                packItem.className = "packItem";

                const packNameElement = document.createElement("div");
                packNameElement.textContent = packName + ": ";
                packNameElement.classList.add("packName");
                packItem.appendChild(packNameElement);

                packCards.forEach((cardName) => {
                  const {
                    cardName: parsedCardName,
                    itemModifiers,
                    itemStickers,
                  } = parseCardItem(cardName);
                  const itemType = determineItemType(parsedCardName);

                  const cardContainer = document.createElement("div");

                  if (itemType !== "unknown") {
                    // For Buffoon Pack cards (jokers, etc.), use the same overlaid
                    // modifier label on the image as in the main queue.
                    // Pack card canvas size now matches queue cards (80x107).

                    // Wrap canvas so we can anchor overlays on the image itself
                    const canvasWrapper = document.createElement("div");
                    canvasWrapper.className = "cardCanvasWrapper";

                    const canvas = document.createElement("canvas");
                    canvas.width = 80;
                    canvas.height = 107;
                    maskToCanvas(
                      canvas,
                      parsedCardName,
                      itemType,
                      itemModifiers,
                      itemStickers
                    );
                    canvasWrapper.appendChild(canvas);
                    cardContainer.appendChild(canvasWrapper);

                    const itemText = document.createElement("div");
                    itemText.textContent = parsedCardName;
                    itemText.classList.add("cardName");
                    cardContainer.appendChild(itemText);

                    if (packType === "Buffoon Pack") {
                      // Edition-like modifiers become an overlaid label on the image
                      const overlayMod = itemModifiers.find((mod) =>
                        [
                          "Foil",
                          "Holographic",
                          "Polychrome",
                          "Negative",
                        ].includes(mod)
                      );

                      if (overlayMod) {
                        const modifierLabel = document.createElement("div");
                        modifierLabel.classList.add("modifier");

                        const lower = overlayMod.toLowerCase();
                        if (lower === "polychrome") {
                          modifierLabel.classList.add("polychrome");
                        } else if (lower === "foil") {
                          modifierLabel.classList.add("foil");
                        } else if (lower === "negative") {
                          modifierLabel.classList.add("negAtive");
                        } else if (lower === "holographic") {
                          modifierLabel.classList.add("holographic");
                        }

                        modifierLabel.textContent = overlayMod;
                        canvasWrapper.appendChild(modifierLabel);
                      }
                    } else {
                      // Non-Buffoon packs keep textual modifier labels under the card
                      itemModifiers.forEach((mod) => {
                        const modifierText = document.createElement("div");
                        modifierText.classList.add("modifier");
                        modifierText.textContent = mod;
                        cardContainer.appendChild(modifierText);
                      });
                    }

                    // Stickers are always shown as text under the card
                    itemStickers.forEach((stick) => {
                      const stickerText = document.createElement("div");
                      stickerText.classList.add("sticker");
                      stickerText.textContent = stick;
                      cardContainer.appendChild(stickerText);
                    });
                  } else {
                    const parsed = parseStandardCardName(cardName);
                    if (!parsed) {
                      return;
                    }
                    const { rank, suit, modifiers, seal } = parsed;

                    const canvas = document.createElement("canvas");
                    canvas.width = 80;
                    canvas.height = 107;
                    renderStandardCard(canvas, rank, suit, modifiers, seal);
                    cardContainer.appendChild(canvas);

                    const cardText = document.createElement("div");
                    cardText.textContent = getStandardCardName(cardName);
                    cardText.classList.add("standardCardName");
                    cardContainer.appendChild(cardText);

                    modifiers.forEach((modifier) => {
                      const modifierText = document.createElement("div");
                      modifierText.textContent = modifier;
                      modifierText.classList.add("modifier");
                      modifierText.style.color = getModifierColor(modifier);
                      cardContainer.appendChild(modifierText);
                    });

                    if (seal) {
                      const sealText = document.createElement("div");
                      sealText.textContent = seal;
                      sealText.classList.add("seal");
                      sealText.style.color = getModifierColor(seal);
                      cardContainer.appendChild(sealText);
                    }
                  }

                  packItem.appendChild(cardContainer);
                });

                packsContainer.appendChild(packItem);
              });

              // Re-apply highlight state to newly rendered pack cards
              searchAndHighlight();
            }

            renderPacks();
          }

          scrollingContainer.appendChild(queueContainer);
        });

        document.querySelectorAll(".scrollable").forEach((scrollable) => {
          let isDown = false;
          let startX;
          let scrollLeft;
          const isScrollLayout = () =>
            scrollable.classList.contains("scrollable");

          scrollable.addEventListener("mousedown", (e) => {
            if (!isScrollLayout()) return;
            isDown = true;
            scrollable.classList.add("active");
            startX = e.pageX - scrollable.offsetLeft;
            scrollLeft = scrollable.scrollLeft;
            scrollable.classList.add("no-select");
          });

          scrollable.addEventListener("mouseleave", () => {
            if (!isScrollLayout()) {
              isDown = false;
              return;
            }
            isDown = false;
            scrollable.classList.remove("active");
            scrollable.classList.remove("no-select");
          });

          scrollable.addEventListener("mouseup", () => {
            if (!isScrollLayout()) {
              isDown = false;
              return;
            }
            isDown = false;
            scrollable.classList.remove("active");
            scrollable.classList.remove("no-select");
          });

          scrollable.addEventListener("mousemove", (e) => {
            if (!isDown || !isScrollLayout()) return;
            e.preventDefault();
            const x = e.pageX - scrollable.offsetLeft;
            const walk = x - startX;
            scrollable.scrollLeft = scrollLeft - walk;
          });
        });
        searchAndHighlight();
      }

      document
        .getElementById("analyzeButton")
        .addEventListener("click", displayShopQueues);

      displayShopQueues();
      global.refreshShopDisplay = displayShopQueues;
    })();
  }

  global.initShopUI = initShopUI;
})(window);
