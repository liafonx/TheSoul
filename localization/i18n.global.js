(function (global) {
  "use strict";

  // Game locale maps (key → display name)
  var gameEn = global.BalatroLocale_enUS || {};
  var gameZh = global.BalatroLocale_zhCN || {};

  // UI locale maps (ui.key → display text)
  var uiEn = global.BalatroUiLocale_enUS || {};
  var uiZh = global.BalatroUiLocale_zhCN || {};

  // Reverse map (English name → internal key)
  var reverseMap = global.BalatroNameToKey || {};

  // Merged locale maps
  var enUS = Object.freeze(Object.assign({}, gameEn, uiEn));
  var zhCN = Object.freeze(Object.assign({}, gameZh, uiZh));

  var locales = Object.freeze({
    "zh-CN": zhCN,
    "en-US": enUS,
  });

  function normalizeLocale(locale) {
    var raw = String(locale || "").trim().toLowerCase();
    if (!raw) return "zh-CN";
    if (raw === "zh" || raw === "zh-cn" || raw === "zh_cn") return "zh-CN";
    return "en-US";
  }

  var currentLocale = normalizeLocale(global.__BALATRO_LOCALE__ || "en-US");

  /**
   * Translate a key to the current locale.
   * @param {string} key - Internal key (e.g., "j_seeing_double", "ui.settings")
   * @param {string} [locale] - Optional locale override
   * @returns {string} Translated text or key as fallback
   */
  function t(key, locale) {
    var textKey = String(key ?? "");
    var resolved = normalizeLocale(locale || currentLocale);
    var localeMap = resolved === "zh-CN" ? zhCN : enUS;

    var translated = localeMap[textKey];
    if (typeof translated === "string" && translated.length) {
      return translated;
    }

    // Fallback to en-US for missing zh-CN keys
    if (resolved === "zh-CN") {
      var enFallback = enUS[textKey];
      if (typeof enFallback === "string" && enFallback.length) {
        return enFallback;
      }
    }

    // Return key as final fallback
    return textKey;
  }

  /**
   * Check if a key exists in the locale map.
   * @param {string} key - Internal key
   * @param {string} [locale] - Optional locale override
   * @returns {boolean}
   */
  function has(key, locale) {
    var textKey = String(key ?? "");
    var resolved = normalizeLocale(locale || currentLocale);
    var localeMap = resolved === "zh-CN" ? zhCN : enUS;
    return Object.prototype.hasOwnProperty.call(localeMap, textKey);
  }

  /**
   * Set the current locale.
   * @param {string} locale - Locale identifier
   * @returns {string} Normalized locale
   */
  function setLocale(locale) {
    currentLocale = normalizeLocale(locale);
    return currentLocale;
  }

  /**
   * Get the current locale.
   * @returns {string}
   */
  function getLocale() {
    return currentLocale;
  }

  /**
   * Convert an English name to its internal key.
   * @param {string} englishName - English display name (e.g., "Seeing Double")
   * @returns {string} Internal key (e.g., "j_seeing_double") or original name if not found
   */
  function nameToKey(englishName) {
    var name = String(englishName ?? "");
    return reverseMap[name] || name;
  }

  var api = Object.freeze({
    t: t,
    has: has,
    setLocale: setLocale,
    getLocale: getLocale,
    nameToKey: nameToKey,
    locales: locales,
  });

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (global) {
    global.BalatroI18n = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
