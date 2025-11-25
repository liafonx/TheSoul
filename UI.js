//UI additions by Aquila
//Only thing I want to add later is images/searching for bosses
const jokers = [
  { name: "Joker", pos: { x: 0, y: 0 } },
  { name: "Greedy Joker", pos: { x: 6, y: 1 } },
  { name: "Lusty Joker", pos: { x: 7, y: 1 } },
  { name: "Wrathful Joker", pos: { x: 8, y: 1 } },
  { name: "Gluttonous Joker", pos: { x: 9, y: 1 } },
  { name: "Jolly Joker", pos: { x: 2, y: 0 } },
  { name: "Zany Joker", pos: { x: 3, y: 0 } },
  { name: "Mad Joker", pos: { x: 4, y: 0 } },
  { name: "Crazy Joker", pos: { x: 5, y: 0 } },
  { name: "Droll Joker", pos: { x: 6, y: 0 } },
  { name: "Sly Joker", pos: { x: 0, y: 14 } },
  { name: "Wily Joker", pos: { x: 1, y: 14 } },
  { name: "Clever Joker", pos: { x: 2, y: 14 } },
  { name: "Devious Joker", pos: { x: 3, y: 14 } },
  { name: "Crafty Joker", pos: { x: 4, y: 14 } },
  { name: "Half Joker", pos: { x: 7, y: 0 } },
  { name: "Joker Stencil", pos: { x: 2, y: 5 } },
  { name: "Four Fingers", pos: { x: 6, y: 6 } },
  { name: "Mime", pos: { x: 4, y: 1 } },
  { name: "Credit Card", pos: { x: 5, y: 1 } },
  { name: "Ceremonial Dagger", pos: { x: 5, y: 5 } },
  { name: "Banner", pos: { x: 1, y: 2 } },
  { name: "Mystic Summit", pos: { x: 2, y: 2 } },
  { name: "Marble Joker", pos: { x: 3, y: 2 } },
  { name: "Loyalty Card", pos: { x: 4, y: 2 } },
  { name: "8 Ball", pos: { x: 0, y: 5 } },
  { name: "Misprint", pos: { x: 6, y: 2 } },
  { name: "Dusk", pos: { x: 4, y: 7 } },
  { name: "Raised Fist", pos: { x: 8, y: 2 } },
  { name: "Chaos the Clown", pos: { x: 1, y: 0 } },
  { name: "Fibonacci", pos: { x: 1, y: 5 } },
  { name: "Steel Joker", pos: { x: 7, y: 2 } },
  { name: "Scary Face", pos: { x: 2, y: 3 } },
  { name: "Abstract Joker", pos: { x: 3, y: 3 } },
  { name: "Delayed Gratification", pos: { x: 4, y: 3 } },
  { name: "Hack", pos: { x: 5, y: 2 } },
  { name: "Pareidolia", pos: { x: 6, y: 3 } },
  { name: "Gros Michel", pos: { x: 7, y: 6 } },
  { name: "Even Steven", pos: { x: 8, y: 3 } },
  { name: "Odd Todd", pos: { x: 9, y: 3 } },
  { name: "Scholar", pos: { x: 3, y: 6 } },
  { name: "Business Card", pos: { x: 1, y: 4 } },
  { name: "Supernova", pos: { x: 2, y: 4 } },
  { name: "Ride the Bus", pos: { x: 1, y: 6 } },
  { name: "Space Joker", pos: { x: 3, y: 5 } },
  { name: "Egg", pos: { x: 0, y: 10 } },
  { name: "Burglar", pos: { x: 1, y: 10 } },
  { name: "Blackboard", pos: { x: 2, y: 10 } },
  { name: "Runner", pos: { x: 3, y: 10 } },
  { name: "Ice Cream", pos: { x: 4, y: 10 } },
  { name: "DNA", pos: { x: 5, y: 10 } },
  { name: "Splash", pos: { x: 6, y: 10 } },
  { name: "Blue Joker", pos: { x: 7, y: 10 } },
  { name: "Sixth Sense", pos: { x: 8, y: 10 } },
  { name: "Constellation", pos: { x: 9, y: 10 } },
  { name: "Hiker", pos: { x: 0, y: 11 } },
  { name: "Faceless Joker", pos: { x: 1, y: 11 } },
  { name: "Green Joker", pos: { x: 2, y: 11 } },
  { name: "Superposition", pos: { x: 3, y: 11 } },
  { name: "To Do List", pos: { x: 4, y: 11 } },
  { name: "Cavendish", pos: { x: 5, y: 11 } },
  { name: "Card Sharp", pos: { x: 6, y: 11 } },
  { name: "Red Card", pos: { x: 7, y: 11 } },
  { name: "Madness", pos: { x: 8, y: 11 } },
  { name: "Square Joker", pos: { x: 9, y: 11 } },
  { name: "Seance", pos: { x: 0, y: 12 } },
  { name: "Riff-raff", pos: { x: 1, y: 12 } },
  { name: "Vampire", pos: { x: 2, y: 12 } },
  { name: "Shortcut", pos: { x: 3, y: 12 } },
  { name: "Hologram", pos: { x: 4, y: 12 } },
  { name: "Vagabond", pos: { x: 5, y: 12 } },
  { name: "Baron", pos: { x: 6, y: 12 } },
  { name: "Cloud 9", pos: { x: 7, y: 12 } },
  { name: "Rocket", pos: { x: 8, y: 12 } },
  { name: "Obelisk", pos: { x: 9, y: 12 } },
  { name: "Midas Mask", pos: { x: 0, y: 13 } },
  { name: "Luchador", pos: { x: 1, y: 13 } },
  { name: "Photograph", pos: { x: 2, y: 13 } },
  { name: "Gift Card", pos: { x: 3, y: 13 } },
  { name: "Turtle Bean", pos: { x: 4, y: 13 } },
  { name: "Erosion", pos: { x: 5, y: 13 } },
  { name: "Reserved Parking", pos: { x: 6, y: 13 } },
  { name: "Mail In Rebate", pos: { x: 7, y: 13 } },
  { name: "To the Moon", pos: { x: 8, y: 13 } },
  { name: "Hallucination", pos: { x: 9, y: 13 } },
  { name: "Fortune Teller", pos: { x: 7, y: 5 } },
  { name: "Juggler", pos: { x: 0, y: 1 } },
  { name: "Drunkard", pos: { x: 1, y: 1 } },
  { name: "Stone Joker", pos: { x: 9, y: 0 } },
  { name: "Golden Joker", pos: { x: 9, y: 2 } },
  { name: "Lucky Cat", pos: { x: 5, y: 14 } },
  { name: "Baseball Card", pos: { x: 6, y: 14 } },
  { name: "Bull", pos: { x: 7, y: 14 } },
  { name: "Diet Cola", pos: { x: 8, y: 14 } },
  { name: "Trading Card", pos: { x: 9, y: 14 } },
  { name: "Flash Card", pos: { x: 0, y: 15 } },
  { name: "Popcorn", pos: { x: 1, y: 15 } },
  { name: "Spare Trousers", pos: { x: 4, y: 15 } },
  { name: "Ancient Joker", pos: { x: 7, y: 15 } },
  { name: "Ramen", pos: { x: 2, y: 15 } },
  { name: "Walkie Talkie", pos: { x: 8, y: 15 } },
  { name: "Seltzer", pos: { x: 3, y: 15 } },
  { name: "Castle", pos: { x: 9, y: 15 } },
  { name: "Smiley Face", pos: { x: 6, y: 15 } },
  { name: "Campfire", pos: { x: 5, y: 15 } },
  { name: "Golden Ticket", pos: { x: 5, y: 3 } },
  { name: "Mr. Bones", pos: { x: 3, y: 4 } },
  { name: "Acrobat", pos: { x: 2, y: 1 } },
  { name: "Sock and Buskin", pos: { x: 3, y: 1 } },
  { name: "Swashbuckler", pos: { x: 9, y: 5 } },
  { name: "Troubadour", pos: { x: 0, y: 2 } },
  { name: "Certificate", pos: { x: 8, y: 8 } },
  { name: "Smeared Joker", pos: { x: 4, y: 6 } },
  { name: "Throwback", pos: { x: 5, y: 7 } },
  { name: "Hanging Chad", pos: { x: 9, y: 6 } },
  { name: "Rough Gem", pos: { x: 9, y: 7 } },
  { name: "Bloodstone", pos: { x: 0, y: 8 } },
  { name: "Arrowhead", pos: { x: 1, y: 8 } },
  { name: "Onyx Agate", pos: { x: 2, y: 8 } },
  { name: "Glass Joker", pos: { x: 1, y: 3 } },
  { name: "Showman", pos: { x: 6, y: 5 } },
  { name: "Flower Pot", pos: { x: 0, y: 6 } },
  { name: "Blueprint", pos: { x: 0, y: 3 } },
  { name: "Wee Joker", pos: { x: 0, y: 4 } },
  { name: "Merry Andy", pos: { x: 8, y: 0 } },
  { name: "Oops! All 6s", pos: { x: 5, y: 6 } },
  { name: "The Idol", pos: { x: 6, y: 7 } },
  { name: "Seeing Double", pos: { x: 4, y: 4 } },
  { name: "Matador", pos: { x: 4, y: 5 } },
  { name: "Hit the Road", pos: { x: 8, y: 5 } },
  { name: "The Duo", pos: { x: 5, y: 4 } },
  { name: "The Trio", pos: { x: 6, y: 4 } },
  { name: "The Family", pos: { x: 7, y: 4 } },
  { name: "The Order", pos: { x: 8, y: 4 } },
  { name: "The Tribe", pos: { x: 9, y: 4 } },
  { name: "Stuntman", pos: { x: 8, y: 6 } },
  { name: "Invisible Joker", pos: { x: 1, y: 7 } },
  { name: "Brainstorm", pos: { x: 7, y: 7 } },
  { name: "Satellite", pos: { x: 8, y: 7 } },
  { name: "Shoot the Moon", pos: { x: 2, y: 6 } },
  { name: "Drivers License", pos: { x: 0, y: 7 } },
  { name: "Cartomancer", pos: { x: 7, y: 3 } },
  { name: "Astronomer", pos: { x: 2, y: 7 } },
  { name: "Burnt Joker", pos: { x: 3, y: 7 } },
  { name: "Bootstraps", pos: { x: 9, y: 8 } },
  { name: "Canio", pos: { x: 3, y: 8 } },
  { name: "Triboulet", pos: { x: 4, y: 8 } },
  { name: "Yorick", pos: { x: 5, y: 8 } },
  { name: "Chicot", pos: { x: 6, y: 8 } },
  { name: "Perkeo", pos: { x: 7, y: 8 } },
];
const tarotsAndPlanets = [
  { name: "The Fool", pos: { x: 0, y: 0 } },
  { name: "The Magician", pos: { x: 1, y: 0 } },
  { name: "The High Priestess", pos: { x: 2, y: 0 } },
  { name: "The Empress", pos: { x: 3, y: 0 } },
  { name: "The Emperor", pos: { x: 4, y: 0 } },
  { name: "The Hierophant", pos: { x: 5, y: 0 } },
  { name: "The Lovers", pos: { x: 6, y: 0 } },
  { name: "The Chariot", pos: { x: 7, y: 0 } },
  { name: "Justice", pos: { x: 8, y: 0 } },
  { name: "The Hermit", pos: { x: 9, y: 0 } },
  { name: "The Wheel of Fortune", pos: { x: 0, y: 1 } },
  { name: "Strength", pos: { x: 1, y: 1 } },
  { name: "The Hanged Man", pos: { x: 2, y: 1 } },
  { name: "Death", pos: { x: 3, y: 1 } },
  { name: "Temperance", pos: { x: 4, y: 1 } },
  { name: "The Devil", pos: { x: 5, y: 1 } },
  { name: "The Tower", pos: { x: 6, y: 1 } },
  { name: "The Star", pos: { x: 7, y: 1 } },
  { name: "The Moon", pos: { x: 8, y: 1 } },
  { name: "The Sun", pos: { x: 9, y: 1 } },
  { name: "Judgement", pos: { x: 0, y: 2 } },
  { name: "The World", pos: { x: 1, y: 2 } },
  { name: "Mercury", pos: { x: 0, y: 3 } },
  { name: "Venus", pos: { x: 1, y: 3 } },
  { name: "Earth", pos: { x: 2, y: 3 } },
  { name: "Mars", pos: { x: 3, y: 3 } },
  { name: "Jupiter", pos: { x: 4, y: 3 } },
  { name: "Saturn", pos: { x: 5, y: 3 } },
  { name: "Uranus", pos: { x: 6, y: 3 } },
  { name: "Neptune", pos: { x: 7, y: 3 } },
  { name: "Pluto", pos: { x: 8, y: 3 } },
  { name: "Planet X", pos: { x: 9, y: 2 } },
  { name: "Ceres", pos: { x: 8, y: 2 } },
  { name: "Eris", pos: { x: 3, y: 2 } },
  { name: "Familiar", pos: { x: 0, y: 4 } },
  { name: "Grim", pos: { x: 1, y: 4 } },
  { name: "Incantation", pos: { x: 2, y: 4 } },
  { name: "Talisman", pos: { x: 3, y: 4 } },
  { name: "Aura", pos: { x: 4, y: 4 } },
  { name: "Wraith", pos: { x: 5, y: 4 } },
  { name: "Sigil", pos: { x: 6, y: 4 } },
  { name: "Ouija", pos: { x: 7, y: 4 } },
  { name: "Ectoplasm", pos: { x: 8, y: 4 } },
  { name: "Immolate", pos: { x: 9, y: 4 } },
  { name: "Ankh", pos: { x: 0, y: 5 } },
  { name: "Deja Vu", pos: { x: 1, y: 5 } },
  { name: "Hex", pos: { x: 2, y: 5 } },
  { name: "Trance", pos: { x: 3, y: 5 } },
  { name: "Medium", pos: { x: 4, y: 5 } },
  { name: "Cryptid", pos: { x: 5, y: 5 } },
  { name: "The Soul", pos: { x: 2, y: 2 } },
  { name: "Black Hole", pos: { x: 9, y: 3 } },
];
const tags = [
  { name: "Uncommon Tag", pos: { x: 0, y: 0 } },
  { name: "Rare Tag", pos: { x: 1, y: 0 } },
  { name: "Negative Tag", pos: { x: 2, y: 0 } },
  { name: "Foil Tag", pos: { x: 3, y: 0 } },
  { name: "Holographic Tag", pos: { x: 0, y: 1 } },
  { name: "Polychrome Tag", pos: { x: 1, y: 1 } },
  { name: "Investment Tag", pos: { x: 2, y: 1 } },
  { name: "Voucher Tag", pos: { x: 3, y: 1 } },
  { name: "Boss Tag", pos: { x: 0, y: 2 } },
  { name: "Standard Tag", pos: { x: 1, y: 2 } },
  { name: "Charm Tag", pos: { x: 2, y: 2 } },
  { name: "Meteor Tag", pos: { x: 3, y: 2 } },
  { name: "Buffoon Tag", pos: { x: 4, y: 2 } },
  { name: "Handy Tag", pos: { x: 1, y: 3 } },
  { name: "Garbage Tag", pos: { x: 2, y: 3 } },
  { name: "Ethereal Tag", pos: { x: 3, y: 3 } },
  { name: "Coupon Tag", pos: { x: 4, y: 0 } },
  { name: "Double Tag", pos: { x: 5, y: 0 } },
  { name: "Juggle Tag", pos: { x: 5, y: 1 } },
  { name: "D6 Tag", pos: { x: 5, y: 3 } },
  { name: "Top-up Tag", pos: { x: 4, y: 1 } },
  { name: "Speed Tag", pos: { x: 0, y: 3 } },
  { name: "Orbital Tag", pos: { x: 5, y: 2 } },
  { name: "Economy Tag", pos: { x: 4, y: 3 } },
];
const vouchers = [
  { name: "Overstock", pos: { x: 0, y: 0 } },
  { name: "Clearance Sale", pos: { x: 3, y: 0 } },
  { name: "Hone", pos: { x: 4, y: 0 } },
  { name: "Reroll Surplus", pos: { x: 0, y: 2 } },
  { name: "Crystal Ball", pos: { x: 2, y: 2 } },
  { name: "Telescope", pos: { x: 3, y: 2 } },
  { name: "Grabber", pos: { x: 5, y: 0 } },
  { name: "Wasteful", pos: { x: 6, y: 0 } },
  { name: "Tarot Merchant", pos: { x: 1, y: 0 } },
  { name: "Planet Merchant", pos: { x: 2, y: 0 } },
  { name: "Seed Money", pos: { x: 1, y: 2 } },
  { name: "Blank", pos: { x: 7, y: 0 } },
  { name: "Magic Trick", pos: { x: 4, y: 2 } },
  { name: "Hieroglyph", pos: { x: 5, y: 2 } },
  { name: "Director's Cut", pos: { x: 6, y: 2 } },
  { name: "Paint Brush", pos: { x: 7, y: 2 } },
  { name: "Overstock Plus", pos: { x: 0, y: 1 } },
  { name: "Liquidation", pos: { x: 3, y: 1 } },
  { name: "Glow Up", pos: { x: 4, y: 1 } },
  { name: "Reroll Glut", pos: { x: 0, y: 3 } },
  { name: "Omen Globe", pos: { x: 2, y: 3 } },
  { name: "Observatory", pos: { x: 3, y: 3 } },
  { name: "Nacho Tong", pos: { x: 5, y: 1 } },
  { name: "Recyclomancy", pos: { x: 6, y: 1 } },
  { name: "Tarot Tycoon", pos: { x: 1, y: 1 } },
  { name: "Planet Tycoon", pos: { x: 2, y: 1 } },
  { name: "Money Tree", pos: { x: 1, y: 3 } },
  { name: "Antimatter", pos: { x: 7, y: 1 } },
  { name: "Illusion", pos: { x: 4, y: 3 } },
  { name: "Petroglyph", pos: { x: 5, y: 3 } },
  { name: "Retcon", pos: { x: 6, y: 3 } },
  { name: "Palette", pos: { x: 7, y: 3 } },
];

const bosses = [
  { name: "Small Blind", pos: { x: 0, y: 0 } },
  { name: "Big Blind", pos: { x: 0, y: 1 } },
  { name: "The Ox", pos: { x: 0, y: 2 } },
  { name: "The Hook", pos: { x: 0, y: 7 } },
  { name: "The Mouth", pos: { x: 0, y: 18 } },
  { name: "The Fish", pos: { x: 0, y: 5 } },
  { name: "The Club", pos: { x: 0, y: 4 } },
  { name: "The Manacle", pos: { x: 0, y: 8 } },
  { name: "The Tooth", pos: { x: 0, y: 22 } },
  { name: "The Wall", pos: { x: 0, y: 9 } },
  { name: "The House", pos: { x: 0, y: 3 } },
  { name: "The Mark", pos: { x: 0, y: 23 } },
  { name: "Cerulean Bell", pos: { x: 0, y: 26 } },
  { name: "The Wheel", pos: { x: 0, y: 10 } },
  { name: "The Arm", pos: { x: 0, y: 11 } },
  { name: "The Psychic", pos: { x: 0, y: 12 } },
  { name: "The Goad", pos: { x: 0, y: 13 } },
  { name: "The Water", pos: { x: 0, y: 14 } },
  { name: "The Eye", pos: { x: 0, y: 17 } },
  { name: "The Plant", pos: { x: 0, y: 19 } },
  { name: "The Needle", pos: { x: 0, y: 20 } },
  { name: "The Head", pos: { x: 0, y: 21 } },
  { name: "Verdant Leaf", pos: { x: 0, y: 28 } },
  { name: "Violet Vessel", pos: { x: 0, y: 29 } },
  { name: "The Window", pos: { x: 0, y: 6 } },
  { name: "The Serpent", pos: { x: 0, y: 15 } },
  { name: "The Pillar", pos: { x: 0, y: 16 } },
  { name: "The Flint", pos: { x: 0, y: 24 } },
  { name: "Amber Acorn", pos: { x: 0, y: 27 } },
  { name: "Crimson Heart", pos: { x: 0, y: 25 } },
];
const editionMap = {
  Foil: 1,
  Holographic: 2,
  Polychrome: 3,
};
const stickerMap = {
  Eternal: { x: 0, y: 0 },
  Perishable: { x: 0, y: 2 },
  Rental: { x: 1, y: 2 },
};


function maskToCanvas(canvas, itemName, type, itemModifiers, itemStickers) {
  let itemData;
  let imgSrc;
  let gridWidth;
  let gridHeight;

  if (type === "joker") {
    itemData = jokers.find((j) => j.name === itemName);
    imgSrc = "images/Jokers.png";
    gridWidth = 10;
    gridHeight = 16;
  } else if (type === "tarot" || type === "planet") {
    itemData = tarotsAndPlanets.find((t) => t.name === itemName);
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

  const imageWidth = 710; // Width of your images
  const imageHeight = imgSrc.includes("Jokers.png") ? 1520 : 570; // Height of your images

  const itemWidth = imageWidth / gridWidth;
  const itemHeight = imageHeight / gridHeight;

  const ctx = canvas.getContext("2d");
  const img = new Image();
  img.src = imgSrc;
  img.onload = function () {
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
  };
}

function overlayEdition(ctx, canvas, index) {
  const editionImg = new Image();
  editionImg.src = "images/Editions.png";
  editionImg.onload = function () {
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
  };
}

function overlaySticker(ctx, canvas, position) {
  const stickerImg = new Image();
  stickerImg.src = "images/stickers.png";
  stickerImg.onload = function () {
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
  };
}

function getStandardCardName(cardName) {
  return cardName
    .replace(/\b(Purple|Red|Blue|Gold) Seal\b/g, "")
    .replace(/\b(Bonus|Mult|Wild|Glass|Steel|Stone|Gold|Lucky)\b/g, "")
    .replace(/\b(Foil|Holographic|Polychrome)\b/g, "")
    .trim();
}

function getStandardCardModifiers(cardName) {
  const sealRegex = /\b(Purple Seal|Red Seal|Blue Seal|Gold Seal)\b/g;
  const enhancementRegex =
    /\b(Bonus|Mult|Wild|Glass|Steel|Stone|Gold|Lucky)\b/g;
  const editionRegex = /\b(Foil|Holographic|Polychrome)\b/g;

  const seals = [];
  let sealMatch;
  while ((sealMatch = sealRegex.exec(cardName)) !== null) {
    seals.push(sealMatch[0]);
  }

  // Remove the seal text from the card name
  const cardNameWithoutSeals = cardName.replace(sealRegex, "").trim();

  const enhancements = cardNameWithoutSeals.match(enhancementRegex) || [];
  const editions = cardNameWithoutSeals.match(editionRegex) || [];

  return [...seals, ...enhancements, ...editions];
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

  const deckImg = new Image();
  deckImg.src = "images/8BitDeck.png";
  const enhancersImg = new Image();
  enhancersImg.src = "images/Enhancers.png";

  const cardWidth = canvas.width;
  const cardHeight = canvas.height;
  const deckWidth = 923;
  const deckHeight = 380;
  const enhancersWidth = 497;
  const enhancersHeight = 475;

  const { x: cardX, y: cardY } = getStandardCardPosition(rank, suit);

  deckImg.onload = function () {
    enhancersImg.onload = function () {
      // Draw the card background
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

      // Draw the card rank and suit
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

      // Draw the edition overlay
      const edition = modifiers.find((mod) =>
        ["Foil", "Holographic", "Polychrome"].includes(mod)
      );
      if (edition) {
        overlayEdition(ctx, canvas, editionMap[edition]);
      }

      // Draw the seal overlay
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
    };
  };
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

  const enhancer = modifiers.find((mod) =>
    Object.keys(enhancerMap).includes(mod)
  );
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

  // Remove all modifiers from the cleaned card name
  cleanedCardName = cleanedCardName.replace(modifierRegex, "").trim();

  const parts = cleanedCardName.split(" of ");
  if (parts.length !== 2) {
    console.error("Invalid card name format:", cardName);
    return null;
  }

  const suit = parts[1].trim();
  const rankPart = parts[0].trim();
  const rank = rankPart.split(" ").pop(); // Get the last word as rank

  return { rank, suit, modifiers, seal };
}

function getModifierColor(modifier) {
  if (modifier.includes("Seal")) {
    return "#ff80ff"; // Light Purple
  } else if (
    modifier.includes("Bonus") ||
    modifier.includes("Mult") ||
    modifier.includes("Wild")
  ) {
    return "#ff8080"; // Light Red
  } else if (
    modifier.includes("Glass") ||
    modifier.includes("Steel") ||
    modifier.includes("Stone") ||
    modifier.includes("Gold") ||
    modifier.includes("Lucky")
  ) {
    return "#8080ff"; // Light Blue
  } else if (
    modifier.includes("Foil") ||
    modifier.includes("Holographic") ||
    modifier.includes("Polychrome")
  ) {
    return "#80ff80"; // Light Green
  }
  return "#ffffff"; // White (default)
}

function renderBoss(canvas, bossName) {
  const bossData = bosses.find((boss) => boss.name === bossName);
  if (!bossData) {
    console.error("Boss not found:", bossName);
    return;
  }

  const ctx = canvas.getContext("2d");
  const img = new Image();
  img.src = "images/BlindChips.png";
  img.onload = function () {
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
  };
}

function renderTag(canvas, tagName) {
  const tagData = tags.find((tag) => tag.name === tagName);
  if (!tagData) {
    console.error("Tag not found:", tagName);
    return;
  }

  const ctx = canvas.getContext("2d");
  const img = new Image();
  img.src = "images/tags.png";
  img.onload = function () {
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
  };
}

function renderVoucher(canvas, voucherName) {
  const voucherData = vouchers.find((voucher) => voucher.name === voucherName);
  if (!voucherData) {
    console.error("Voucher not found:", voucherName);
    return;
  }

  const ctx = canvas.getContext("2d");
  const img = new Image();
  img.src = "images/Vouchers.png";
  img.onload = function () {
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
  };
}

const trackedJokers = [
  "Baron",
  "Blueprint",
  "Brainstorm",
  "Burglar",
  "Diet Cola",
  "DNA",
  "Invisible Joker",
  "Mime",
  "Reserved Parking",
  "Seance",
  "Showman",
  "Sixth Sense",
  "Turtle Bean",
].sort((a, b) => a.localeCompare(b));

const trackedSpectrals = ["Cryptid", "Deja Vu", "Ectoplasm", "The Soul"].sort(
  (a, b) => a.localeCompare(b)
);
const trackedTags = ["Double Tag", "Negative Tag", "Voucher Tag"].sort((a, b) =>
  a.localeCompare(b)
);
const trackedBosses = ["The Ox", "The Psychic", "The Plant"].sort((a, b) =>
  a.localeCompare(b)
);

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

  // Function to extract shop queues from the textarea content
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

  // Function to separate card names, modifiers, and stickers
  function parseCardItem(item) {
    const modifiers = ["Foil", "Holographic", "Polychrome", "Negative"];
    const stickers = ["Perishable", "Rental", "Eternal"];
    let cardName = item.replace(/^\d+\)/, "").trim();
    let itemModifiers = [];
    let itemStickers = [];

    modifiers.forEach((mod) => {
      const regex = new RegExp(`\\b${mod}\\b`, "i");
      if (regex.test(cardName)) {
        itemModifiers.push(mod);
        cardName = cardName.replace(regex, "").trim();
      }
    });

    stickers.forEach((stick) => {
      const regex = new RegExp(`\\b${stick}\\b`, "i");
      if (regex.test(cardName)) {
        itemStickers.push(stick);
        cardName = cardName.replace(regex, "").trim();
      }
    });

    return { cardName, itemModifiers, itemStickers };
  }

  // Function to determine item type (joker, tarot, or planet)
  function determineItemType(itemName) {
    if (jokers.find((j) => j.name === itemName)) {
      return "joker";
    } else if (tarotsAndPlanets.find((tp) => tp.name === itemName)) {
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

  // Function to create and display the side-scrolling list
  function displayShopQueues() {
    const textarea = document.getElementById("outputBox");
    const text = textarea.value;
    const shopQueues = extractShopQueues(text);

    scrollingContainer.innerHTML = ""; // Clear previous content

    shopQueues.forEach(({ title, queue, boss, voucher, tags, packs }) => {
      const queueContainer = document.createElement("div");
      queueContainer.className = "queueContainer";

      const queueTitle = document.createElement("div");
      queueTitle.className = "queueTitle";
      queueTitle.classList.add("anteTitle");
      const cleanTitle = (title.match(/ANTE\\s*\\d+/i) || [
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

      const scrollable = document.createElement("div");
      scrollable.className = "scrollable no-select";
      cardSet.appendChild(scrollable);
      queueContainer.appendChild(cardSet);

      queue.forEach((item) => {
        const { cardName, itemModifiers, itemStickers } = parseCardItem(item);

        const queueItem = document.createElement("div");
        queueItem.className = "queueItem";

        const canvas = document.createElement("canvas");
        canvas.width = 80;
        canvas.height = 107;

        const itemType = determineItemType(cardName);
        if (itemType !== "unknown") {
          maskToCanvas(canvas, cardName, itemType, itemModifiers, itemStickers);
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
        scrollable.appendChild(queueItem);
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

        // Insert separator between Packs and toggles
        const packsSep = document.createElement("div");
        packsSep.className = "packSep";
        packsSep.textContent = "|";
        packHeaderRow.appendChild(packsSep);

        const packToggles = document.createElement("div");
        packToggles.className = "pack-filter pack-inline";
        const toggleTypes = ["Arcana Pack", "Celestial Pack", "Standard Pack"];
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
                const { rank, suit, modifiers, seal } =
                  parseStandardCardName(cardName);

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

    // Add draggable scrolling functionality
    document.querySelectorAll(".scrollable").forEach((scrollable) => {
      let isDown = false;
      let startX;
      let scrollLeft;

      scrollable.addEventListener("mousedown", (e) => {
        isDown = true;
        scrollable.classList.add("active");
        startX = e.pageX - scrollable.offsetLeft;
        scrollLeft = scrollable.scrollLeft;
        scrollable.classList.add("no-select");
      });

      scrollable.addEventListener("mouseleave", () => {
        isDown = false;
        scrollable.classList.remove("active");
        scrollable.classList.remove("no-select");
      });

      scrollable.addEventListener("mouseup", () => {
        isDown = false;
        scrollable.classList.remove("active");
        scrollable.classList.remove("no-select");
      });

      scrollable.addEventListener("mousemove", (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - scrollable.offsetLeft;
        const walk = x - startX; // One-to-one scroll
        scrollable.scrollLeft = scrollLeft - walk;
      });
    });
    searchAndHighlight();
  }

  // Add event listener to the "Analyze" button
  document
    .getElementById("analyzeButton")
    .addEventListener("click", displayShopQueues);

  // Initialize the display
  displayShopQueues();
  // Expose a refresh helper so other scripts (e.g., pack toggles) can re-render immediately
  window.refreshShopDisplay = displayShopQueues;
})();
