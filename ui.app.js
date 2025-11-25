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
      [...trackedJokers, ...trackedSpectrals, ...trackedTags, ...trackedBosses].map(
        (term) => term.toLowerCase()
      )
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

            queueItem.appendChild(canvas);

            const itemText = document.createElement("div");
            itemText.textContent = cardName;
            queueItem.appendChild(itemText);

            itemModifiers.forEach((mod) => {
              const modifierText = document.createElement("div");
              modifierText.className = "modifier";
              modifierText.textContent = mod;
              queueItem.appendChild(modifierText);
            });

            itemStickers.forEach((stick) => {
              const stickerText = document.createElement("div");
              stickerText.className = "sticker";
              stickerText.textContent = stick;
              queueItem.appendChild(stickerText);
            });
            cardList.appendChild(queueItem);
          });

          if (packs.length > 0) {
            const packFilters = {
              "Arcana Pack": false,
              "Celestial Pack": false,
              "Standard Pack": false,
            };

            const packHeaderRow = document.createElement("div");
            packHeaderRow.className = "packHeaderRow";

            const packsTitle = document.createElement("div");
            packsTitle.className = "queueTitle packTitle";
            packsTitle.textContent = "Packs";
            packHeaderRow.appendChild(packsTitle);

            const packsSep = document.createElement("div");
            packsSep.className = "packSep";
            packsSep.textContent = "|";
            packHeaderRow.appendChild(packsSep);

            const packToggles = document.createElement("div");
            packToggles.className = "pack-filter pack-inline";
            const toggleTypes = [
              "Arcana Pack",
              "Celestial Pack",
              "Standard Pack",
            ];
            toggleTypes.forEach((type) => {
              const btn = document.createElement("button");
              btn.type = "button";
              btn.className = "toggle-button";
              btn.textContent = type.replace(" Pack", "");

              if (packFilters[type]) btn.classList.add("active");

              btn.addEventListener("click", () => {
                packFilters[type] = !packFilters[type];
                btn.classList.toggle("active", packFilters[type]);
                renderPacks();
              });

              packToggles.appendChild(btn);
            });
            packHeaderRow.appendChild(packToggles);

            queueContainer.appendChild(packHeaderRow);
            const packsContainer = document.createElement("div");
            queueContainer.appendChild(packsContainer);

            function shouldShowPack(packName) {
              const packType = getPackTypeFromName(packName);
              if (!packType) return true;
              if (packType === "Buffoon Pack" || packType === "Spectral Pack")
                return true;
              return Boolean(packFilters[packType]);
            }

            function renderPacks() {
              packsContainer.innerHTML = "";
              packs.forEach((pack) => {
                const packItems = pack.split(" - ");
                const packName = packItems[0];
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
                    const canvas = document.createElement("canvas");
                    canvas.width = 71;
                    canvas.height = 95;
                    maskToCanvas(
                      canvas,
                      parsedCardName,
                      itemType,
                      itemModifiers,
                      itemStickers
                    );
                    cardContainer.appendChild(canvas);

                    const itemText = document.createElement("div");
                    itemText.textContent = parsedCardName;
                    itemText.classList.add("cardName");
                    cardContainer.appendChild(itemText);

                    itemModifiers.forEach((mod) => {
                      const modifierText = document.createElement("div");
                      modifierText.classList.add("modifier");
                      modifierText.textContent = mod;
                      cardContainer.appendChild(modifierText);
                    });

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
                    canvas.width = 71;
                    canvas.height = 95;
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
