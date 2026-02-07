(function (global) {
  "use strict";

  var gameZh = global.BalatroLocale_zhCN || {};
  var uiZh = global.BalatroUiLocale_zhCN || {};
  var zhCN = Object.freeze(Object.assign({}, gameZh, uiZh));
  var empty = Object.freeze({});

  var locales = Object.freeze({
    "zh-CN": zhCN,
    "en-US": empty,
  });

  function normalizeLocale(locale) {
    var raw = String(locale || "").trim().toLowerCase();
    if (!raw) return "zh-CN";
    if (raw === "zh" || raw === "zh-cn" || raw === "zh_cn") return "zh-CN";
    return "en-US";
  }

  var currentLocale = normalizeLocale(global.__BALATRO_LOCALE__ || "zh-CN");

  function t(key, locale) {
    var textKey = String(key ?? "");
    var resolved = normalizeLocale(locale || currentLocale);
    if (resolved === "zh-CN") {
      var translated = zhCN[textKey];
      return typeof translated === "string" && translated.length ? translated : textKey;
    }
    return textKey;
  }

  function has(key, locale) {
    var textKey = String(key ?? "");
    var resolved = normalizeLocale(locale || currentLocale);
    return resolved === "zh-CN" ? Object.prototype.hasOwnProperty.call(zhCN, textKey) : false;
  }

  function setLocale(locale) {
    currentLocale = normalizeLocale(locale);
    return currentLocale;
  }

  function getLocale() {
    return currentLocale;
  }

  var api = Object.freeze({
    t: t,
    has: has,
    setLocale: setLocale,
    getLocale: getLocale,
    locales: locales,
  });

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (global) {
    global.BalatroI18n = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);

