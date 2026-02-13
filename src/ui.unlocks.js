/**
 * ui.unlocks.js - Unlock checkbox overlay system
 * Manages the "Modify Unlocks" popup with item lock/unlock state.
 */
(function () {
  "use strict";

  var t = function (key) { return window.BalatroI18n?.t ? window.BalatroI18n.t(key) : key; };
  var nameToKey = function (name) { return window.BalatroI18n?.nameToKey ? window.BalatroI18n.nameToKey(name) : name; };

  var options = [
    "Negative Tag", "Foil Tag", "Holographic Tag", "Polychrome Tag", "Rare Tag",
    "Golden Ticket", "Mr. Bones", "Acrobat", "Sock and Buskin", "Swashbuckler",
    "Troubadour", "Certificate", "Smeared Joker", "Throwback", "Hanging Chad",
    "Rough Gem", "Bloodstone", "Arrowhead", "Onyx Agate", "Glass Joker",
    "Showman", "Flower Pot", "Blueprint", "Wee Joker", "Merry Andy",
    "Oops! All 6s", "The Idol", "Seeing Double", "Matador", "Hit the Road",
    "The Duo", "The Trio", "The Family", "The Order", "The Tribe",
    "Stuntman", "Invisible Joker", "Brainstorm", "Satellite", "Shoot the Moon",
    "Drivers License", "Cartomancer", "Astronomer", "Burnt Joker", "Bootstraps",
    "Overstock Plus", "Liquidation", "Glow Up", "Reroll Glut", "Omen Globe",
    "Observatory", "Nacho Tong", "Recyclomancy", "Tarot Tycoon", "Planet Tycoon",
    "Money Tree", "Antimatter", "Illusion", "Petroglyph", "Retcon", "Palette",
  ];

  window.unlockOptions = options;
  window.selectedOptions = Array(61).fill(true);

  // DOM references
  var openCheckboxesBtn = document.getElementById("openCheckboxesBtn");
  var checkboxesOverlay = document.getElementById("checkboxesOverlay");
  var checkboxesContainer = document.getElementById("checkboxesContainer");
  var submitBtn = document.getElementById("submitBtn");
  var lockBtn = document.getElementById("lockBtn");
  var unlockBtn = document.getElementById("unlockBtn");

  function createCheckboxes() {
    checkboxesContainer.innerHTML = "";

    options.forEach(function (optionName, index) {
      var row = document.createElement("div");
      row.className = "unlock-item";

      var checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = optionName;
      checkbox.checked = Boolean(window.selectedOptions[index]);
      checkbox.dataset.index = String(index);
      checkbox.id = "unlockOption_" + index;

      var label = document.createElement("label");
      label.setAttribute("for", checkbox.id);
      label.textContent = t(nameToKey(optionName));

      row.append(checkbox, label);
      checkboxesContainer.appendChild(row);
    });
  }

  function handleSubmit() {
    var checkboxes = checkboxesContainer.querySelectorAll('input[type="checkbox"]');
    var next = Array(options.length).fill(false);
    checkboxes.forEach(function (checkbox) {
      var idx = Number(checkbox.dataset.index);
      if (Number.isInteger(idx) && idx >= 0 && idx < next.length) {
        next[idx] = checkbox.checked;
      }
    });
    window.selectedOptions = next;
    closeOverlay();
  }

  function handleLock() {
    checkboxesContainer.querySelectorAll('input[type="checkbox"]').forEach(function (cb) { cb.checked = false; });
  }

  function handleUnlock() {
    checkboxesContainer.querySelectorAll('input[type="checkbox"]').forEach(function (cb) { cb.checked = true; });
  }

  function openOverlay() {
    createCheckboxes();
    checkboxesOverlay.style.display = "block";
  }

  function closeOverlay() {
    checkboxesOverlay.style.display = "none";
  }

  // Event listeners
  openCheckboxesBtn.addEventListener("click", openOverlay);
  submitBtn.addEventListener("click", handleSubmit);
  lockBtn.addEventListener("click", handleLock);
  unlockBtn.addEventListener("click", handleUnlock);

  // Exports
  window.createCheckboxes = createCheckboxes;
  window.openOverlay = openOverlay;
  window.closeOverlay = closeOverlay;
})();
