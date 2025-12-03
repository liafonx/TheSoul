(function (global) {
  let groupButtonsLoader = null;
  function initShopUI() {
    const data = global.BalatroData || {};
    const renderers = global.BalatroRenderers || {};

    const {
      trackedJokers = [],
      trackedSpectrals = [],
      trackedTags = [],
      trackedBosses = [],
      trackedVouchers = [],
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
        ...trackedVouchers,
      ].map((term) => term.toLowerCase())
    );
    const groupSizes = [2, 3, 4];
    let currentGroupSize = groupSizes[0];
    const groupButtonUpdaters = new Set();
    const cardGroupRenderers = new Set();
    const cardGroupFilterUpdaters = new Set();
    const jokerFilterButtons = new Map();
    const allGroupSizeButtons = new Set();
    const ANTES_PER_PAGE = 4;
    const summaryFaceEmojiMapRaw =
      (global.BalatroSharedLists &&
        global.BalatroSharedLists.SUMMARY_FACE_EMOJI) ||
      null;

    // summaryFaceEmojiMap: emoji -> { color, cards: [eng], cardsMap: { eng: cn } }
    // summaryFaceCardMap: eng -> { emoji, color, cn }
    const summaryFaceEmojiMap = {};
    const summaryFaceCardMap = {};
    if (summaryFaceEmojiMapRaw) {
      Object.entries(summaryFaceEmojiMapRaw).forEach(([emoji, value]) => {
        const color =
          value && typeof value === "object" ? value.color || "" : value || "";
        let cards = [];
        let cardsMap = {};
        if (value && typeof value === "object" && value.cards) {
          if (Array.isArray(value.cards)) {
            cards = value.cards;
          } else if (typeof value.cards === "object") {
            cards = Object.keys(value.cards);
            cardsMap = value.cards;
          }
        }
        summaryFaceEmojiMap[emoji] = { color, cards, cardsMap };
        cards.forEach((name) => {
          const cn = cardsMap[name] || name;
          summaryFaceCardMap[name] = { emoji, color, cn };
        });
      });
    }

    const getMiniFaceInfoForSegment = (seg) => {
      const text = seg || "";
      for (const [cardName, info] of Object.entries(summaryFaceCardMap)) {
        const cnName = info.cn;
        if (cnName && text.includes(cnName)) {
          return info;
        }
        if (text.includes(cardName)) {
          return info;
        }
      }
      return null;
    };
    let currentPageIndex = 0;
    let paginationContainer = null;
    let allShopQueues = [];

    const setGlobalGroupSize = (size) => {
      if (currentGroupSize === size) {
        return;
      }
      currentGroupSize = size;
      groupButtonUpdaters.forEach((update) => update(size));
      cardGroupRenderers.forEach((render) => render());
    };

    const setButtonLoadingState = (btn, flag) => {
      if (!btn) return;
      const isLoading = Boolean(flag);
      btn.disabled = isLoading;
      if (isLoading) {
        btn.classList.remove("is-loading");
        void btn.offsetWidth;
        btn.classList.add("is-loading");
      } else {
        btn.classList.remove("is-loading");
      }
    };

    const setGroupButtonsLoading = (flag) => {
      const buttons = document.querySelectorAll(".groupSizeButton");
      console.log("[GroupButtons] Loading", flag, "count", buttons.length);
      buttons.forEach((btn) => setButtonLoadingState(btn, flag));
    };
    groupButtonsLoader = setGroupButtonsLoading;

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
        const isTextOnlyQueueItem = item.classList.contains("queueItemTextOnly");

        let itemText = item.textContent.toLowerCase();
        let nameEl = null;
        let enName = null;

        if (isTextOnlyQueueItem) {
          nameEl = item.querySelector(".cardName");
          if (nameEl) {
            enName =
              nameEl.dataset.enName ||
              nameEl.dataset.originalText ||
              nameEl.textContent ||
              "";
            itemText = enName.toLowerCase();
          }
        }

        const shouldHighlight =
          searchTerms.length > 0 &&
          searchTerms.some((term) => itemText.includes(term));

        if (shouldHighlight) {
          const faceEmoji = item.dataset.faceEmoji || "";
          const isNegativeFace = item.dataset.negativeFace === "1";
          let color = "";
          if (isNegativeFace) {
            color = "#f5a5a5";
          } else if (
            faceEmoji &&
            summaryFaceEmojiMap &&
            summaryFaceEmojiMap[faceEmoji]
          ) {
            color = summaryFaceEmojiMap[faceEmoji].color || "";
          }
          if (color) {
            item.style.setProperty("--highlight-color", color);
          } else {
            item.style.removeProperty("--highlight-color");
          }
          item.classList.add("highlight");
        } else {
          item.classList.remove("highlight");
          item.style.removeProperty("--highlight-color");
        }

        // In text-only per-ante view, swap card name to Chinese when highlighted
        if (isTextOnlyQueueItem) {
          if (!nameEl) {
            nameEl = item.querySelector(".cardName");
          }
          if (!nameEl) return;

          if (!enName) {
            enName =
              nameEl.dataset.enName ||
              nameEl.dataset.originalText ||
              nameEl.textContent ||
              "";
          }

          if (!enName || !summaryFaceCardMap || !summaryFaceCardMap[enName]) {
            return;
          }
          const faceInfoForName = summaryFaceCardMap[enName];
          const baseChinese = faceInfoForName.cn || enName;
          const faceInfo =
            summaryFaceCardMap && summaryFaceCardMap[enName]
              ? summaryFaceCardMap[enName]
              : null;
          const faceEmoji = faceInfo && faceInfo.emoji ? faceInfo.emoji : "";
          const hasNegative = nameEl.dataset.negativeTag === "1";
          const displayText = `${faceEmoji}${
            hasNegative ? "‼️" : ""
          }${baseChinese}`;
          if (shouldHighlight) {
            nameEl.textContent = displayText;
            nameEl.classList.add("cardName-cn");
          } else {
            nameEl.textContent =
              nameEl.dataset.originalText || nameEl.textContent;
            nameEl.classList.remove("cardName-cn");
          }
        }

      });

      // After highlight changes, re-apply per-card-set group filters
      cardGroupFilterUpdaters.forEach((update) => update());
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
        { title: "Vouchers:", items: trackedVouchers },
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
          if (group.title === "Jokers:") {
            button.dataset.filterCategory = "joker";
            button.dataset.cardName = term;
            jokerFilterButtons.set(term, button);
          }
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

      const filterPanel = document.createElement("details");
      filterPanel.className = "filter-panel";

      const filterSummary = document.createElement("summary");
      filterSummary.className = "filter-summary";
      filterSummary.textContent = "Search Filters";

      filterPanel.appendChild(filterSummary);
      filterPanel.appendChild(toggleContainer);
      document.body.appendChild(filterPanel);

      document
        .getElementById("searchInput")
        .addEventListener("input", searchAndHighlight);

      const scrollingContainer = document.createElement("div");
      scrollingContainer.id = "scrollingContainer";
      document.body.appendChild(scrollingContainer);

      paginationContainer = document.createElement("div");
      paginationContainer.id = "paginationContainer";
      document.body.appendChild(paginationContainer);


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
        const text =
          (window.lastRawOutput && window.lastRawOutput.length
            ? window.lastRawOutput
            : "") || "";
        allShopQueues = extractShopQueues(text);
        currentPageIndex = 0;
        renderPaginationControls();
        renderCurrentPage();
      }

      function renderCurrentPage() {
        const totalPages = Math.ceil(allShopQueues.length / ANTES_PER_PAGE);
        scrollingContainer.innerHTML = "";

        if (totalPages === 0) {
          paginationContainer.innerHTML = "";
          paginationContainer.style.display = "none";
          groupButtonUpdaters.clear();
          cardGroupRenderers.clear();
          cardGroupFilterUpdaters.clear();
          return;
        }

        paginationContainer.style.display =
          totalPages <= 1 ? "none" : "flex";
        groupButtonUpdaters.clear();
        cardGroupRenderers.clear();
        cardGroupFilterUpdaters.clear();

        const start = currentPageIndex * ANTES_PER_PAGE;
        const end = start + ANTES_PER_PAGE;
        const pageQueues = allShopQueues.slice(start, end);

        pageQueues.forEach(({ title, queue, boss, voucher, tags, packs }) => {
          const queueContainer = document.createElement("div");
          queueContainer.className = "queueContainer";

          const queueInfo = document.createElement("div");
          queueInfo.className = "queueInfo";

          const metaColumn = document.createElement("div");
          metaColumn.className = "queueMetaColumn";

          const queueTitle = document.createElement("div");
          queueTitle.className = "queueTitle anteTitle";
          const cleanTitle = (title.match(/ANTE\s*\d+/i) || [
            title.replace(/=+/g, "").trim(),
          ])[0];
          let anteNumVal = null;
          const m = cleanTitle.match(/^(ANTE)\s*(\d+)/i);
          if (m) {
            anteNumVal = parseInt(m[2], 10);
            let numClass = "anteNum";
            if (anteNumVal >= 32) numClass += " anteNumRed";
            else if (anteNumVal >= 22) numClass += " anteNumOrange";
            else if (anteNumVal == 24) numClass += " anteNumOrange";
            else if (anteNumVal >= 12) numClass += " anteNumYellow";
            queueTitle.innerHTML = `${m[1]} <span class="${numClass}">${m[2]}</span>`;
          } else {
            queueTitle.textContent = cleanTitle;
          }
          metaColumn.appendChild(queueTitle);

          const metaRow = document.createElement("div");
          metaRow.className = "queueMetaRow";

          const voucherElement = document.createElement("div");
          voucherElement.className = "metaBlock";
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
          metaRow.appendChild(voucherElement);

          const tagsElement = document.createElement("div");
          tagsElement.className = "metaBlock";
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
          metaRow.appendChild(tagsElement);

          const bossElement = document.createElement("div");
          bossElement.className = "metaBlock";
          bossElement.innerHTML = "<b>Boss</b>";
          bossElement.style = "font-size: 16px;";

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

          metaRow.appendChild(bossElement);

          metaColumn.appendChild(metaRow);
          queueInfo.appendChild(metaColumn);

          if (anteNumVal !== null) {
            const summaryLookup =
              window.lastSummariesByAnte instanceof Map
                ? window.lastSummariesByAnte
                : null;

            const miniWrapper = document.createElement("div");
            miniWrapper.className = "miniSummaryWrapper";

            const miniLabel = document.createElement("div");
            miniLabel.className = "miniSummaryLabel";
            miniLabel.textContent = "Nearby Summaries";
            miniWrapper.appendChild(miniLabel);

            const miniList = document.createElement("div");
            miniList.className = "miniSummaryList";

            // current ante + next 3 antes (total 4)
            for (let offset = 0; offset < 4; offset += 1) {
              const anteKey = anteNumVal + offset;
              const text =
                summaryLookup && summaryLookup.get(anteKey)
                  ? summaryLookup.get(anteKey)
                  : `Ante ${anteKey}: No summary yet`;

              const row = document.createElement("div");
              row.className = "miniSummaryEntry";

              const anteSpan = document.createElement("span");
              anteSpan.className = "miniSummaryAnte";
              anteSpan.textContent = `Ante ${anteKey}`;

              const textSpan = document.createElement("span");
              textSpan.className = "miniSummaryText";
              const cleaned = text
                .replace(/^ante\s*\d+\s*[：:]\s*/i, "")
                .replace(/^\d+\s*[：:]\s*/, "")
                .trim();
              const baseLine = cleaned || text;

              // Split into logical items separated by "、"
              const segments = baseLine.split("、");
              textSpan.textContent = "";
              segments.forEach((seg, idx) => {
                const trimmedSeg = seg.trim();
                if (!trimmedSeg) return;

                // Further split on '|' so the divider can keep default color
                const chunks = trimmedSeg.split(/(\|)/);
                chunks.forEach((chunk) => {
                  if (!chunk) return;
                  if (chunk === "|") {
                    const pipeSpan = document.createElement("span");
                    pipeSpan.className = "miniSummaryPipe";
                    pipeSpan.textContent = " | ";
                    textSpan.appendChild(pipeSpan);
                  } else {
                    const part = document.createElement("span");
                    part.className = "miniSummaryItem";
                    part.textContent = chunk;

                    const info = getMiniFaceInfoForSegment(chunk);
                    if (info) {
                      part.dataset.faceEmoji = info.emoji;
                      const isNegativeChunk = chunk.includes("‼️");
                      if (isNegativeChunk) {
                        part.classList.add("negativeFace");
                      } else if (info.color) {
                        part.style.color = info.color;
                      }
                    }
                    textSpan.appendChild(part);
                  }
                });

                // Re-add the delimiter between items so wrapping can occur there
                if (idx < segments.length - 1) {
                  const delim = document.createElement("span");
                  delim.className = "miniSummaryDelimiter";
                  delim.textContent = "、";
                  textSpan.appendChild(delim);
                  textSpan.appendChild(document.createTextNode(" "));
                }
              });

              row.append(anteSpan, textSpan);
              // full-content popup for this mini summary row
              const popup = document.createElement("div");
              popup.className = "miniSummaryPopup";
              const popupAnte = anteSpan.cloneNode(true);
              popupAnte.classList.add("miniSummaryPopupAnte");
              const popupText = textSpan.cloneNode(true);
              popupText.classList.add("miniSummaryTextFull");
              popup.append(popupAnte, popupText);
              row.appendChild(popup);

              row.addEventListener("click", (event) => {
                event.stopPropagation();
                const isOpen = popup.classList.contains("visible");
                document
                  .querySelectorAll(".miniSummaryPopup.visible")
                  .forEach((el) => el.classList.remove("visible"));
                if (!isOpen) {
                  popup.classList.add("visible");
                }
              });

              popup.addEventListener("click", (event) => {
                event.stopPropagation();
                popup.classList.remove("visible");
              });

              miniList.appendChild(row);
            }

            miniWrapper.appendChild(miniList);
            queueInfo.appendChild(miniWrapper);
          }

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

          const groupControls = document.createElement("div");
          groupControls.className = "groupSizeControls";

          const groupLabel = document.createElement("span");
          groupLabel.className = "groupSizeLabel";
          groupLabel.textContent = "Group Size:";
          groupControls.appendChild(groupLabel);

          const localButtons = [];
          const updateLocalButtons = (size) => {
            localButtons.forEach((btn) => {
              btn.classList.toggle("active", Number(btn.dataset.size) === size);
            });
          };
          groupButtonUpdaters.add(updateLocalButtons);

          groupSizes.forEach((size) => {
            const button = document.createElement("button");
            button.type = "button";
            button.dataset.size = size;
            button.className = "cardSetToggle groupSizeButton";
            button.textContent = size;
            button.addEventListener("click", () => {
              if (button.disabled) return;
              console.log("[GroupSize] click", size);
              setButtonLoadingState(button, true);

              // defer heavy re-render so the spinner appears immediately
              setTimeout(() => {
                console.log("[GroupSize] apply", size);
                setGlobalGroupSize(size);
                setButtonLoadingState(button, false);
              }, 0);
            });
            localButtons.push(button);
            allGroupSizeButtons.add(button);
            groupControls.appendChild(button);
          });
          updateLocalButtons(currentGroupSize);

          cardSetHeader.appendChild(groupControls);

          // per-ante re-run controls
          const anteRecalcControls = document.createElement("div");
          anteRecalcControls.className = "groupSizeControls";

          const anteInputLabel = document.createElement("span");
          anteInputLabel.className = "groupSizeLabel";
          anteInputLabel.textContent = "Cards (this Ante):";
          anteRecalcControls.appendChild(anteInputLabel);

          const anteCardsInput = document.createElement("input");
          anteCardsInput.type = "number";
          anteCardsInput.min = "1";
          anteCardsInput.max = "9999";
          anteCardsInput.value = "1000";
          anteCardsInput.className = "anteCardsInput";
          anteRecalcControls.appendChild(anteCardsInput);

          const anteRecalcButton = document.createElement("button");
          anteRecalcButton.type = "button";
          anteRecalcButton.className = "cardSetToggle anteRecalcButton";
          anteRecalcButton.textContent = "Re-run";
          anteRecalcControls.appendChild(anteRecalcButton);

          const anteRestoreButton = document.createElement("button");
          anteRestoreButton.type = "button";
          anteRestoreButton.className = "cardSetToggle anteRestoreButton";
          anteRestoreButton.textContent = "Restore";
          anteRecalcControls.appendChild(anteRestoreButton);

          // toggle to hide/show groups without highlighted items
          let hideNonHighlightGroups = false;
          const hideGroupsToggle = document.createElement("button");
          hideGroupsToggle.type = "button";
          hideGroupsToggle.className = "cardSetToggle";
          const updateHideToggleLabel = () => {
            hideGroupsToggle.textContent = hideNonHighlightGroups
              ? "Show all groups"
              : "Only groups with hits";
          };
          updateHideToggleLabel();
          anteRecalcControls.appendChild(hideGroupsToggle);

          cardSetHeader.appendChild(anteRecalcControls);
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
            if (layoutToggle.disabled) return;
            layoutToggle.disabled = true;
            layoutToggle.classList.remove("is-loading");
            layoutToggle.style.animation = "none";
            void layoutToggle.offsetWidth;
            layoutToggle.style.animation = "";
            layoutToggle.classList.add("is-loading");

            setTimeout(() => {
              applyLayoutMode(layoutMode === "scroll" ? "grid" : "scroll");
              renderCardGroups();
              layoutToggle.disabled = false;
              layoutToggle.classList.remove("is-loading");
            }, 600);
          });

          applyLayoutMode(layoutMode);
          let queueNodes = [];
          const buildQueueNodes = (items, options = {}) => {
            const textOnly = Boolean(options.textOnly);
            queueNodes = items.map((item) => {
              const { cardName, itemModifiers, itemStickers } =
                parseCardItem(item);

              const negMatch = /^(‼️|🔘)\s*/.exec(cardName);
              const hasNegativeTagPrefix = !!negMatch;
              const baseName = hasNegativeTagPrefix
                ? cardName.slice(negMatch[0].length)
                : cardName;

              const queueItem = document.createElement("div");
              queueItem.className = "queueItem";
              if (textOnly) {
                queueItem.classList.add("queueItemTextOnly");
              }

              const faceInfo = getMiniFaceInfoForSegment(baseName);
              if (faceInfo) {
                queueItem.dataset.faceEmoji = faceInfo.emoji;
                if (faceInfo.color) {
                  queueItem.dataset.faceColor = faceInfo.color;
                }
              }
              const isNegativeFace =
                faceInfo &&
                (itemModifiers.includes("Negative") || hasNegativeTagPrefix);
              if (isNegativeFace) {
                queueItem.dataset.negativeFace = "1";
              }

              if (!textOnly) {
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

                const overlayMod = itemModifiers.find((mod) =>
                  ["Foil", "Holographic", "Polychrome", "Negative"].includes(
                    mod
                  )
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
                    modifierText.classList.add("negAtive");
                  } else if (lower === "holographic") {
                    modifierText.classList.add("holographic");
                  }

                  modifierText.textContent = overlayMod;
                  canvasWrapper.appendChild(modifierText);
                }

                queueItem.appendChild(canvasWrapper);

                itemStickers.forEach((stick) => {
                  const stickerText = document.createElement("div");
                  stickerText.className = "sticker";
                  stickerText.textContent = stick;
                  queueItem.appendChild(stickerText);
                });
              }

              const itemText = document.createElement("div");
              itemText.textContent = cardName;
              itemText.className = "cardName";
              itemText.dataset.enName = baseName;
              itemText.dataset.originalText = cardName;
              if (hasNegativeTagPrefix) {
                itemText.dataset.negativeTag = "1";
              }
              queueItem.appendChild(itemText);

              return queueItem;
            });
          };

          buildQueueNodes(queue, { textOnly: false });

          const buildCardEntry = (
            node,
            groupIndex,
            positionInGroup,
            isLastInGroup
          ) => {
            const entry = document.createElement("div");
            entry.className = "cardGroupEntry";
            if (positionInGroup === 0) {
              entry.classList.add("cardGroupEntry-first");
            }
            if (isLastInGroup) {
              entry.classList.add("cardGroupEntry-last");
            }

            const indicator = document.createElement("div");
            indicator.className = "group-indicator";
            if (positionInGroup === 0) {
              const badge = document.createElement("span");
              badge.className = "group-badge";
              badge.textContent = groupIndex;
              indicator.appendChild(badge);
            }
            const line = document.createElement("span");
            line.className = "group-line";
            line.classList.add(
              positionInGroup % 2 === 0 ? "line-forward" : "line-reverse"
            );
            indicator.appendChild(line);

            entry.appendChild(indicator);
            entry.appendChild(node);
            return entry;
          };

          const applyGroupHighlightFilter = () => {
            const groups = cardList.querySelectorAll(".cardGroup");
            groups.forEach((group) => {
              const hasHighlight = !!group.querySelector(
                ".queueItem.highlight"
              );
              if (hideNonHighlightGroups && !hasHighlight) {
                group.style.display = "none";
              } else {
                group.style.display = "";
              }
            });
          };

          const renderCardGroups = () => {
            cardList.innerHTML = "";
            if (queueNodes.length === 0) {
              return;
            }
            const groupSize = currentGroupSize;
            const totalGroups = Math.ceil(queueNodes.length / groupSize);

            for (let groupIndex = 0; groupIndex < totalGroups; groupIndex += 1) {
              const wrapper = document.createElement("div");
              wrapper.className = "cardGroup";
              wrapper.classList.add(
                groupIndex % 2 === 0 ? "group-style-yellow" : "group-style-grey"
              );

              const groupItems = document.createElement("div");
              groupItems.className = "cardGroupItems";

              const start = groupIndex * groupSize;
              const end = Math.min(start + groupSize, queueNodes.length);
              for (let idx = start; idx < end; idx += 1) {
                const entry = buildCardEntry(
                  queueNodes[idx],
                  groupIndex,
                  idx - start,
                  idx === end - 1
                );
                groupItems.appendChild(entry);
              }

              wrapper.appendChild(groupItems);
              cardList.appendChild(wrapper);
            }

            applyGroupHighlightFilter();
          };
          cardGroupRenderers.add(renderCardGroups);
          cardGroupFilterUpdaters.add(applyGroupHighlightFilter);

          renderCardGroups();

          hideGroupsToggle.addEventListener("click", () => {
            hideNonHighlightGroups = !hideNonHighlightGroups;
            updateHideToggleLabel();
            applyGroupHighlightFilter();
          });

          anteRestoreButton.addEventListener("click", () => {
            if (anteRestoreButton.disabled) return;
            if (!anteNumVal) {
              return;
            }
            if (typeof window.computeSingleAnteQueue !== "function") {
              console.error("computeSingleAnteQueue not available.");
              return;
            }
            const globalCardsInput =
              document.getElementById("cardsPerAnte");
            const globalLimit = Math.max(
              0,
              Number(globalCardsInput && globalCardsInput.value) || 0
            );
            if (!globalLimit) {
              return;
            }
            setButtonLoadingState(anteRestoreButton, true);
            setTimeout(() => {
              try {
                const items =
                  window.computeSingleAnteQueue(anteNumVal, globalLimit) || [];
                buildQueueNodes(items, { textOnly: false });
                applyLayoutMode("scroll"); // restore image carousel view
                renderCardGroups();
                searchAndHighlight();
              } finally {
                setButtonLoadingState(anteRestoreButton, false);
              }
            }, 0);
          });

          anteRecalcButton.addEventListener("click", () => {
            if (anteRecalcButton.disabled) return;
            const limit = Math.max(
              0,
              Number(anteCardsInput.value) || 0
            );
            if (!limit || !anteNumVal) {
              return;
            }
            if (typeof window.computeSingleAnteQueue !== "function") {
              console.error("computeSingleAnteQueue not available.");
              return;
            }
            setButtonLoadingState(anteRecalcButton, true);
            setTimeout(() => {
              try {
                const items =
                  window.computeSingleAnteQueue(anteNumVal, limit) || [];
                buildQueueNodes(items, { textOnly: true });
                applyLayoutMode("grid"); // auto-switch to grid for re-run view
                renderCardGroups();
                searchAndHighlight();
              } finally {
                setButtonLoadingState(anteRecalcButton, false);
              }
            }, 0);
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

            let packsRendered = false;

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
                const faceInfo = getMiniFaceInfoForSegment(parsedCardName);
                if (faceInfo) {
                  cardContainer.dataset.faceEmoji = faceInfo.emoji;
                  if (faceInfo.color) {
                    cardContainer.dataset.faceColor = faceInfo.color;
                  }
                }
                const isNegativeFace =
                  faceInfo && itemModifiers.includes("Negative");
                if (isNegativeFace) {
                  cardContainer.dataset.negativeFace = "1";
                }

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
                itemText.dataset.originalText = parsedCardName;
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
            // collapse / expand pack area by clicking header (default: hidden)
            let packsCollapsed = true;
            const updatePackVisibility = () => {
              const displayStyle = packsCollapsed ? "none" : "";
              packToggles.style.display = displayStyle;
              packsContainer.style.display = displayStyle;
            };
            updatePackVisibility();

            packHeaderRow.addEventListener("click", () => {
              packsCollapsed = !packsCollapsed;
              updatePackVisibility();
              if (!packsCollapsed && !packsRendered) {
                renderPacks();
                packsRendered = true;
              }
            });
          }

          scrollingContainer.appendChild(queueContainer);
        });

        const topOffset = scrollingContainer.getBoundingClientRect().top;
        const absoluteTop = window.scrollY + topOffset - 12;
        window.scrollTo({ top: absoluteTop, behavior: "smooth" });

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

        if (typeof window.applySummaryEmojiFilter === "function") {
          window.applySummaryEmojiFilter();
        }

        if (window.pendingScrollToResults) {
          window.pendingScrollToResults = false;
          requestAnimationFrame(() => {
            const container = document.getElementById("scrollingContainer");
            if (container) {
              container.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }
          });
        }
      }

      function renderPaginationControls() {
        const totalPages = Math.ceil(allShopQueues.length / ANTES_PER_PAGE);
        paginationContainer.innerHTML = "";
        if (totalPages <= 1) {
          paginationContainer.style.display = "none";
          return;
        }

        paginationContainer.style.display = "flex";

        const goToPage = (targetPage) => {
          const clamped = Math.max(0, Math.min(targetPage, totalPages - 1));
          if (clamped === currentPageIndex) {
            return;
          }
          currentPageIndex = clamped;
          renderPaginationControls();
          renderCurrentPage();
        };

        // Expose a helper so summary list can jump to the page for a given ante number
        window.goToAntePage = (anteNumber) => {
          if (!Number.isFinite(anteNumber)) return;
          if (!allShopQueues.length) return;

          const index = allShopQueues.findIndex(({ title }) =>
            new RegExp(`ANTE\\s+${anteNumber}\\b`, "i").test(title || "")
          );
          if (index === -1) return;

          const page = Math.floor(index / ANTES_PER_PAGE);
          if (page === currentPageIndex) return;
          currentPageIndex = page;
          renderPaginationControls();
          renderCurrentPage();
        };

        const prevButton = document.createElement("button");
        prevButton.type = "button";
        prevButton.className = "paginationButton";
        prevButton.textContent = "Prev";
        prevButton.disabled = currentPageIndex === 0;
        prevButton.addEventListener("click", () => {
          if (prevButton.disabled) return;
          setButtonLoadingState(prevButton, true);
          setTimeout(() => {
            goToPage(currentPageIndex - 1);
          }, 0);
        });

        const nextButton = document.createElement("button");
        nextButton.type = "button";
        nextButton.className = "paginationButton";
        nextButton.textContent = "Next";
        nextButton.disabled = currentPageIndex >= totalPages - 1;
        nextButton.addEventListener("click", () => {
          if (nextButton.disabled) return;
          setButtonLoadingState(nextButton, true);
          setTimeout(() => {
            goToPage(currentPageIndex + 1);
          }, 0);
        });

        const info = document.createElement("div");
        info.className = "paginationInfo";

        const pageSelect = document.createElement("select");
        pageSelect.className = "paginationInfoSelect";
        for (let i = 0; i < totalPages; i += 1) {
          const option = document.createElement("option");
          option.value = i;
          option.textContent = `Page ${i + 1}`;
          if (i === currentPageIndex) {
            option.selected = true;
          }
          pageSelect.appendChild(option);
        }
        pageSelect.addEventListener("change", (event) => {
          goToPage(Number(event.target.value));
        });

        const totalSpan = document.createElement("span");
        totalSpan.className = "paginationInfoTotal";
        totalSpan.textContent = `/ ${totalPages}`;

        info.appendChild(pageSelect);
        info.appendChild(totalSpan);

        paginationContainer.append(prevButton, info, nextButton);
      }

      displayShopQueues();
      global.refreshShopDisplay = displayShopQueues;

      // clicking anywhere outside a mini summary row closes any open popup
      document.addEventListener("click", () => {
        document
          .querySelectorAll(".miniSummaryPopup.visible")
          .forEach((el) => el.classList.remove("visible"));
      });

      // Sync emoji filters (from SUMMARY_FACE_EMOJI) into search filters
      global.syncEmojiFilterToSearch = () => {
        const filter = global.summaryEmojiFilter || {};
        if (!Object.keys(summaryFaceCardMap).length) {
          return;
        }
        Object.entries(summaryFaceCardMap).forEach(([engName, info]) => {
          const emoji = info.emoji;
          if (!emoji || !(emoji in filter)) {
            return;
          }
          const shouldBeOn = filter[emoji] !== false;
          const btn = jokerFilterButtons.get(engName);
          if (!btn) {
            return;
          }
          const lower = engName.toLowerCase();
          const currentlyActive = btn.classList.contains("active");
          if (shouldBeOn && !currentlyActive) {
            btn.classList.add("active");
            activeToggleTerms.add(lower);
          } else if (!shouldBeOn && currentlyActive) {
            btn.classList.remove("active");
            activeToggleTerms.delete(lower);
          }
        });
        searchAndHighlight();
      };
    })();
  }

  global.initShopUI = initShopUI;
  global.setGroupButtonsLoading = (flag) => {
    if (typeof flag !== "boolean") return;
    if (typeof groupButtonsLoader === "function") {
      groupButtonsLoader(flag);
    }
  };
})(window);
