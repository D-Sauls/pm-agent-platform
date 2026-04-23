const APP_SHELL_CACHE = "learnhub-shell-v3";
const CONTENT_CACHE = "learnhub-content-v3";

function scopePath(path) {
  const scopeUrl = new URL(self.registration.scope);
  const scopeBase = scopeUrl.pathname.replace(/\/$/, "");
  if (!scopeBase) {
    return path;
  }
  return `${scopeBase}${path.startsWith("/") ? path : `/${path}`}`;
}

const OFFLINE_URL = scopePath("/offline.html");
const SHELL_URLS = [
  scopePath("/"),
  scopePath("/manifest.webmanifest"),
  OFFLINE_URL,
  scopePath("/pwa-icon-192.svg"),
  scopePath("/pwa-icon-512.svg")
];
const API_PREFIX = scopePath("/api/");

function toAbsolute(input) {
  return new URL(input, self.location.origin).toString();
}

async function cacheShell() {
  const cache = await caches.open(APP_SHELL_CACHE);
  await cache.addAll(SHELL_URLS);
}

async function cleanupCaches() {
  const keys = await caches.keys();
  await Promise.all(keys.filter((key) => ![APP_SHELL_CACHE, CONTENT_CACHE].includes(key)).map((key) => caches.delete(key)));
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok && request.url.startsWith(self.location.origin)) {
      const cache = await caches.open(CONTENT_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    if (request.mode === "navigate") {
      return (await caches.match(OFFLINE_URL)) || new Response("Offline", { status: 503 });
    }
    return new Response("Offline", { status: 503 });
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const network = fetch(request)
    .then(async (response) => {
      if (response.ok && request.url.startsWith(self.location.origin)) {
        const cache = await caches.open(CONTENT_CACHE);
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);

  return cached || network || new Response("Offline", { status: 503 });
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheShell());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(cleanupCaches());
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "CACHE_URLS" && Array.isArray(event.data.urls)) {
    event.waitUntil(
      caches.open(CONTENT_CACHE).then((cache) =>
        Promise.all(
          event.data.urls.map((url) => {
            const absoluteUrl = toAbsolute(url);
            return fetch(absoluteUrl, { credentials: "same-origin" })
              .then((response) => {
                if (response.ok) {
                  return cache.put(absoluteUrl, response.clone());
                }
                return undefined;
              })
              .catch(() => undefined);
          })
        )
      )
    );
  }

  if (event.data?.type === "INVALIDATE_URLS" && Array.isArray(event.data.urls)) {
    event.waitUntil(
      caches.open(CONTENT_CACHE).then((cache) =>
        Promise.all(event.data.urls.map((url) => cache.delete(toAbsolute(url))))
      )
    );
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);
  const isNavigate = event.request.mode === "navigate";
  const isAsset = url.origin === self.location.origin && !url.pathname.startsWith(API_PREFIX);

  if (isNavigate) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (isAsset) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  event.respondWith(networkFirst(event.request));
});
