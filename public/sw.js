const CACHE_NAME = "staff-onboard-v3";
const APP_SHELL = [
  "/",
  "/signup.html",
  "/register.html",
  "/login.html",
  "/profile.html",
  "/admin.html",
  "/cms.html",
  "/cms-login.html",
  "/styles.css",
  "/signup.js",
  "/login.js",
  "/profile.js",
  "/admin.js",
  "/cms.js",
  "/cms-login.js",
  "/atmosphere.js",
  "/pwa.js",
  "/manifest.webmanifest",
  "/icons/icon-any.svg",
  "/icons/icon-maskable.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : null))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match("/signup.html"));
    })
  );
});
