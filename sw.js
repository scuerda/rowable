/* Rowable service worker.
 *
 * Caches the app shell so the icon on your home screen opens instantly and
 * still opens with no signal.
 *
 * It deliberately does NOT cache the weather or tide APIs. This app's whole job
 * is reporting current conditions, and a service worker silently serving a
 * three-hour-old forecast as if it were live would be actively dangerous on the
 * water. Offline data is handled in the page instead, where it can be shown
 * with its age attached. See loadLastGood() in index.html.
 */
const VERSION = "rowable-v1";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-180.png",
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(VERSION)
      // Individually, so one 404 cannot fail the whole install.
      .then(cache => Promise.all(SHELL.map(url =>
        cache.add(new Request(url, { cache: "reload" }))
          .catch(err => console.warn("[sw] could not cache", url, err)))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const timeout = (promise, ms) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
]);

/**
 * Network first, so an online launch always gets the latest code and a push to
 * main lands on the next open. Falls back to the cache after a short timeout, so
 * a weak signal at the boathouse opens the app rather than hanging on a spinner.
 */
async function networkFirst(request) {
  const cache = await caches.open(VERSION);
  try {
    const fresh = await timeout(fetch(request), 3500);
    if (fresh && fresh.ok) cache.put(request, fresh.clone()).catch(() => {});
    return fresh;
  } catch (err) {
    const hit = await cache.match(request);
    if (hit) return hit;
    if (request.mode === "navigate") {
      const shell = (await cache.match("./index.html")) || (await cache.match("./"));
      if (shell) return shell;
    }
    throw err;
  }
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  // Same-origin only: the APIs must always go straight to the network.
  if (new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(networkFirst(request));
});
