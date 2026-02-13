(function (global) {
  const data = global.BalatroData || {};
  const {
    jokers = [],
    tarotsAndPlanets = [],
    tags = [],
    vouchers = [],
    bosses = [],
    editionMap = {},
    stickerMap = {},
  } = data;
  const JOKER_MAP = new Map(jokers.map((entry) => [entry.name, entry]));
  const TAROT_PLANET_MAP = new Map(
    tarotsAndPlanets.map((entry) => [entry.name, entry])
  );
  const TAG_MAP = new Map(tags.map((entry) => [entry.name, entry]));
  const VOUCHER_MAP = new Map(vouchers.map((entry) => [entry.name, entry]));
  const BOSS_MAP = new Map(bosses.map((entry) => [entry.name, entry]));
  const MODIFIERS = Object.freeze([
    "Foil",
    "Holographic",
    "Polychrome",
    "Negative",
  ]);
  const STICKERS = Object.freeze(["Perishable", "Rental", "Eternal"]);
  const MODIFIER_REGEXES = MODIFIERS.map((mod) => [
    mod,
    new RegExp(`\\b${mod}\\b`, "i"),
  ]);
  const STICKER_REGEXES = STICKERS.map((stick) => [
    stick,
    new RegExp(`\\b${stick}\\b`, "i"),
  ]);

  // Image cache for preloaded spritesheets
  const imageCache = {};
  const imagePendingCallbacks = {};
  const hookedImages = new WeakSet();
  const IMAGE_SOURCES = [
    "images/Jokers.png",
    "images/Tarots.png",
    "images/Editions.png",
    "images/stickers.png",
    "images/8BitDeck.png",
    "images/Enhancers.png",
    "images/BlindChips.png",
    "images/tags.png",
    "images/Vouchers.png",
  ];
  const PRIORITY_IMAGE_SOURCES = [
    "images/Jokers.png",
    "images/Tarots.png",
    "images/BlindChips.png",
    "images/tags.png",
    "images/Vouchers.png",
  ];
  const DEFERRED_IMAGE_SOURCES = IMAGE_SOURCES.filter(
    (src) => !PRIORITY_IMAGE_SOURCES.includes(src)
  );
  const isMobileUa =
    Boolean(global.__UI_IS_MOBILE_UA__) ||
    /Android|iPhone|iPad|iPod|Mobile|Windows Phone|webOS/i.test(
      navigator.userAgent || ""
    );

  /**
   * Preload all spritesheets into cache
   */
  function preloadImages() {
    IMAGE_SOURCES.forEach((src) => {
      const img = new Image();
      img.src = src;
      imageCache[src] = img;
    });
  }

  function preloadImageList(list) {
    list.forEach((src) => {
      if (imageCache[src]) return;
      const img = new Image();
      img.src = src;
      imageCache[src] = img;
    });
  }

  function scheduleDeferredPreload() {
    const run = () => preloadImageList(DEFERRED_IMAGE_SOURCES);
    if (typeof global.requestIdleCallback === "function") {
      global.requestIdleCallback(run, { timeout: 2500 });
    } else {
      setTimeout(run, 800);
    }
  }

  /**
   * Get cached image, loading if needed
   */
  function getCachedImage(src) {
    if (!imageCache[src]) {
      const img = new Image();
      img.src = src;
      imageCache[src] = img;
    }
    return imageCache[src];
  }

  /**
   * Execute callback when image is ready
   */
  function withImage(src, callback) {
    const img = getCachedImage(src);
    if (img.complete && img.naturalWidth > 0) {
      callback(img);
    } else if (img.complete) {
      // Failed image load: skip drawing to keep UI responsive.
      return;
    } else {
      imagePendingCallbacks[src] = imagePendingCallbacks[src] || [];
      imagePendingCallbacks[src].push(callback);
      if (!hookedImages.has(img)) {
        hookedImages.add(img);
        const flush = () => {
          const pending = imagePendingCallbacks[src] || [];
          delete imagePendingCallbacks[src];
          if (img.naturalWidth > 0) {
            pending.forEach((cb) => cb(img));
          }
        };
        img.addEventListener("load", flush);
        img.addEventListener("error", flush);
      }
    }
  }

  // Aggressive preload on desktop; phased preload on mobile to reduce startup pressure.
  if (isMobileUa) {
    preloadImageList(PRIORITY_IMAGE_SOURCES);
    scheduleDeferredPreload();
  } else {
    preloadImages();
  }

  function maskToCanvas(canvas, itemName, type, itemModifiers, itemStickers) {
    let itemData;
    let imgSrc;
    let gridWidth;
    let gridHeight;

    if (type === "joker") {
      itemData = JOKER_MAP.get(itemName);
      imgSrc = "images/Jokers.png";
      gridWidth = 10;
      gridHeight = 16;
    } else if (type === "tarot" || type === "planet") {
      itemData = TAROT_PLANET_MAP.get(itemName);
      imgSrc = "images/Tarots.png";
      gridWidth = 10;
      gridHeight = 6;
    }

    if (!itemData) {
      console.error(
        `${type.charAt(0).toUpperCase() + type.slice(1)} not found:`,
        itemName
      );
      return;
    }

    const imageWidth = 710;
    const imageHeight = imgSrc.includes("Jokers.png") ? 1520 : 570;

    const itemWidth = imageWidth / gridWidth;
    const itemHeight = imageHeight / gridHeight;

    const ctx = canvas.getContext("2d");
    withImage(imgSrc, (img) => {
      ctx.drawImage(
        img,
        itemData.pos.x * itemWidth,
        itemData.pos.y * itemHeight,
        itemWidth,
        itemHeight,
        0,
        0,
        canvas.width,
        canvas.height
      );

      const overlayModifier = itemModifiers.find((mod) =>
        ["Foil", "Holographic", "Polychrome"].includes(mod)
      );
      if (overlayModifier) {
        overlayEdition(ctx, canvas, editionMap[overlayModifier]);
      }

      itemStickers.forEach((stick) => {
        if (stickerMap[stick]) {
          overlaySticker(ctx, canvas, stickerMap[stick]);
        }
      });

      if (itemModifiers.includes("Negative")) {
        canvas.style.filter = "invert(0.8)";
      }
    });
  }

  function overlayEdition(ctx, canvas, index) {
    withImage("images/Editions.png", (editionImg) => {
      const editionWidth = editionImg.width / 5;
      const editionHeight = editionImg.height;

      ctx.drawImage(
        editionImg,
        index * editionWidth,
        0,
        editionWidth,
        editionHeight,
        0,
        0,
        canvas.width,
        canvas.height
      );
    });
  }

  function overlaySticker(ctx, canvas, position) {
    withImage("images/stickers.png", (stickerImg) => {
      const stickerWidth = stickerImg.width / 5;
      const stickerHeight = stickerImg.height / 3;

      ctx.drawImage(
        stickerImg,
        position.x * stickerWidth,
        position.y * stickerHeight,
        stickerWidth,
        stickerHeight,
        0,
        0,
        canvas.width,
        canvas.height
      );
    });
  }

  function getStandardCardName(cardName) {
    return cardName
      .replace(/\b(Purple|Red|Blue|Gold) Seal\b/g, "")
      .replace(/\b(Bonus|Mult|Wild|Glass|Steel|Stone|Gold|Lucky)\b/g, "")
      .replace(/\b(Foil|Holographic|Polychrome)\b/g, "")
      .trim();
  }

  function getStandardCardPosition(rank, suit) {
    const rankMap = {
      2: 0,
      3: 1,
      4: 2,
      5: 3,
      6: 4,
      7: 5,
      8: 6,
      9: 7,
      10: 8,
      Jack: 9,
      Queen: 10,
      King: 11,
      Ace: 12,
    };
    const suitMap = {
      Hearts: 0,
      Clubs: 1,
      Diamonds: 2,
      Spades: 3,
    };

    const x = rankMap[rank];
    const y = suitMap[suit];

    return { x, y };
  }

  function renderStandardCard(canvas, rank, suit, modifiers, seal) {
    const ctx = canvas.getContext("2d");
    const cardWidth = canvas.width;
    const cardHeight = canvas.height;
    const deckWidth = 923;
    const deckHeight = 380;
    const enhancersWidth = 497;
    const enhancersHeight = 475;

    const { x: cardX, y: cardY } = getStandardCardPosition(rank, suit);

    function drawCard(deckImg, enhancersImg) {
      const enhancerPos = getEnhancerPosition(modifiers);
      ctx.drawImage(
        enhancersImg,
        enhancerPos.x * (enhancersWidth / 7),
        enhancerPos.y * (enhancersHeight / 5),
        enhancersWidth / 7,
        enhancersHeight / 5,
        0,
        0,
        cardWidth,
        cardHeight
      );

      ctx.drawImage(
        deckImg,
        cardX * (deckWidth / 13),
        cardY * (deckHeight / 4),
        deckWidth / 13,
        deckHeight / 4,
        0,
        0,
        cardWidth,
        cardHeight
      );

      const edition = modifiers.find((mod) =>
        ["Foil", "Holographic", "Polychrome"].includes(mod)
      );
      if (edition) {
        overlayEdition(ctx, canvas, editionMap[edition]);
      }

      if (seal) {
        const sealPos = getSealPosition(seal);
        ctx.drawImage(
          enhancersImg,
          sealPos.x * (enhancersWidth / 7),
          sealPos.y * (enhancersHeight / 5),
          enhancersWidth / 7,
          enhancersHeight / 5,
          0,
          0,
          cardWidth,
          cardHeight
        );
      }
    }

    let drawn = false;
    let deckImage = null;
    let enhancersImage = null;
    const tryDraw = () => {
      if (drawn || !deckImage || !enhancersImage) return;
      drawn = true;
      drawCard(deckImage, enhancersImage);
    };

    withImage("images/8BitDeck.png", (img) => {
      deckImage = img;
      tryDraw();
    });
    withImage("images/Enhancers.png", (img) => {
      enhancersImage = img;
      tryDraw();
    });
  }

  function getEnhancerPosition(modifiers) {
    const enhancerMap = {
      Bonus: { x: 1, y: 1 },
      Mult: { x: 2, y: 1 },
      Wild: { x: 3, y: 1 },
      Glass: { x: 5, y: 1 },
      Steel: { x: 6, y: 1 },
      Stone: { x: 5, y: 0 },
      Gold: { x: 6, y: 0 },
      Lucky: { x: 4, y: 1 },
    };

    const enhancer = modifiers.find((mod) => enhancerMap[mod]);
    return enhancer ? enhancerMap[enhancer] : { x: 1, y: 0 };
  }

  function getSealPosition(seal) {
    const sealMap = {
      "Gold Seal": { x: 2, y: 0 },
      "Purple Seal": { x: 4, y: 4 },
      "Red Seal": { x: 5, y: 4 },
      "Blue Seal": { x: 6, y: 4 },
    };

    return sealMap[seal];
  }

  function parseStandardCardName(cardName) {
    const sealRegex = /(Purple|Red|Blue|Gold) Seal/;
    const sealMatch = cardName.match(sealRegex);
    const seal = sealMatch ? sealMatch[0] : null;

    let cleanedCardName = seal
      ? cardName.replace(sealRegex, "").trim()
      : cardName;

    const modifierRegex =
      /(Foil|Holographic|Polychrome|Bonus|Mult|Wild|Glass|Steel|Stone|Gold|Lucky)/g;
    const modifiers = cleanedCardName.match(modifierRegex) || [];
    cleanedCardName = cleanedCardName.replace(modifierRegex, "").trim();

    const parts = cleanedCardName.split(" of ");
    if (parts.length !== 2) {
      console.error("Invalid card name format:", cardName);
      return null;
    }

    const suit = parts[1].trim();
    const rankPart = parts[0].trim();
    const rank = rankPart.split(" ").pop();

    return { rank, suit, modifiers, seal };
  }

  function getModifierColor(modifier) {
    if (modifier.includes("Seal")) {
      return "#ff80ff";
    } else if (
      modifier.includes("Bonus") ||
      modifier.includes("Mult") ||
      modifier.includes("Wild")
    ) {
      return "#ff8080";
    } else if (
      modifier.includes("Glass") ||
      modifier.includes("Steel") ||
      modifier.includes("Stone") ||
      modifier.includes("Gold") ||
      modifier.includes("Lucky")
    ) {
      return "#8080ff";
    } else if (
      modifier.includes("Foil") ||
      modifier.includes("Holographic") ||
      modifier.includes("Polychrome")
    ) {
      return "#80ff80";
    }
    return "#ffffff";
  }

  function renderBoss(canvas, bossName) {
    const bossData = BOSS_MAP.get(bossName);
    if (!bossData) {
      console.error("Boss not found:", bossName);
      return;
    }

    const ctx = canvas.getContext("2d");
    withImage("images/BlindChips.png", (img) => {
      const bossWidth = 714 / 21;
      const bossHeight = 1054 / 31;

      ctx.drawImage(
        img,
        bossData.pos.x * bossWidth,
        bossData.pos.y * bossHeight,
        bossWidth,
        bossHeight,
        0,
        0,
        canvas.width,
        canvas.height
      );
    });
  }

  function renderTag(canvas, tagName) {
    const tagData = TAG_MAP.get(tagName);
    if (!tagData) {
      console.error("Tag not found:", tagName);
      return;
    }

    const ctx = canvas.getContext("2d");
    withImage("images/tags.png", (img) => {
      const tagWidth = 204 / 6;
      const tagHeight = 170 / 5;

      ctx.drawImage(
        img,
        tagData.pos.x * tagWidth,
        tagData.pos.y * tagHeight,
        tagWidth,
        tagHeight,
        0,
        0,
        canvas.width,
        canvas.height
      );
    });
  }

  function renderVoucher(canvas, voucherName) {
    const voucherData = VOUCHER_MAP.get(voucherName);
    if (!voucherData) {
      console.error("Voucher not found:", voucherName);
      return;
    }

    const ctx = canvas.getContext("2d");
    withImage("images/Vouchers.png", (img) => {
      const voucherWidth = 639 / 9;
      const voucherHeight = 380 / 4;

      ctx.drawImage(
        img,
        voucherData.pos.x * voucherWidth,
        voucherData.pos.y * voucherHeight,
        voucherWidth,
        voucherHeight,
        0,
        0,
        canvas.width,
        canvas.height
      );
    });
  }

  function parseCardItem(item) {
    let cardName = String(item || "").replace(/^\d+\)/, "").trim();
    let itemModifiers = [];
    let itemStickers = [];

    MODIFIER_REGEXES.forEach(([mod, regex]) => {
      if (regex.test(cardName)) {
        itemModifiers.push(mod);
        cardName = cardName.replace(regex, "").trim();
      }
    });

    STICKER_REGEXES.forEach(([stick, regex]) => {
      if (regex.test(cardName)) {
        itemStickers.push(stick);
        cardName = cardName.replace(regex, "").trim();
      }
    });

    return { cardName, itemModifiers, itemStickers };
  }

  function determineItemType(itemName) {
    if (JOKER_MAP.has(itemName)) {
      return "joker";
    } else if (TAROT_PLANET_MAP.has(itemName)) {
      return "tarot";
    } else {
      return "unknown";
    }
  }

  function getPackTypeFromName(packName) {
    if (!packName) return null;
    if (packName.includes("Celestial Pack")) return "Celestial Pack";
    if (packName.includes("Arcana Pack")) return "Arcana Pack";
    if (packName.includes("Standard Pack")) return "Standard Pack";
    if (packName.includes("Buffoon Pack")) return "Buffoon Pack";
    if (packName.includes("Spectral Pack")) return "Spectral Pack";
    return null;
  }

  global.BalatroRenderers = {
    preloadImages,
    maskToCanvas,
    getStandardCardName,
    parseStandardCardName,
    getModifierColor,
    renderStandardCard,
    renderBoss,
    renderTag,
    renderVoucher,
    parseCardItem,
    determineItemType,
    getPackTypeFromName,
  };
})(window);
