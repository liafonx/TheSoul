const CACHE_NAME = "the-soul-static-v2";
const CORE_PRECACHE = [
  "/",
  "/index.html",
  "/base.css",
  "/ui.css",
  "/UI.js",
  "/ui.data.js",
  "/ui.renderers.js",
  "/ui.utils.js",
  "/ui.search.js",
  "/ui.cards.js",
  "/ui.packs.js",
  "/ui.app.js",
  "/balatro_lists.js",
  "/balatro_analysis.js",
  "/localization/generated/zh-CN.game.js",
  "/localization/ui-zh-CN.js",
  "/localization/i18n.global.js",
  "/immolate.js",
  "/immolate.wasm",
  "/images/icon.ico",
];

function makeCacheKey(requestUrl) {
  const url = new URL(requestUrl);
  return new Request(url.origin + url.pathname, { method: "GET" });
}

function shouldCacheRequest(request) {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/.playwright-cli/")) return false;
  if (request.mode === "navigate") return true;
  const destination = request.destination || "";
  if (["script", "style", "image", "font", "worker"].includes(destination)) {
    return true;
  }
  return /\.(wasm|json|txt)$/i.test(url.pathname);
}

function isNetworkFirstRequest(request) {
  if (request.mode === "navigate") return true;
  const destination = request.destination || "";
  if (["script", "style", "worker"].includes(destination)) return true;
  const url = new URL(request.url);
  return /\.(wasm|json|txt)$/i.test(url.pathname);
}

async function networkFirst(request, cache, cacheKey) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(cacheKey, networkResponse.clone());
    }
    return networkResponse;
  } catch (_err) {
    return (await cache.match(cacheKey)) || Response.error();
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (!shouldCacheRequest(request)) return;

  const cacheKey = makeCacheKey(request.url);
  const networkFirstMode = isNetworkFirstRequest(request);

  if (networkFirstMode) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const response = await networkFirst(request, cache, cacheKey);
        if (response.type === "error" && request.mode === "navigate") {
          return (await cache.match("/index.html")) || Response.error();
        }
        return response;
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(cacheKey);
      const networkPromise = fetch(request)
        .then((response) => {
          if (response.ok) {
            cache.put(cacheKey, response.clone());
          }
          return response;
        })
        .catch(() => null);

      if (cached) {
        event.waitUntil(networkPromise);
        return cached;
      }

      return networkPromise || Response.error();
    })()
  );
});
