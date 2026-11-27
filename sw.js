// Ayah Studio service worker: works offline for the app itself.
// Verse text, recitation audio and stock clips always come from the internet.
const VERSION = "ayah-studio-v11";
const SHELL = ["./", "./index.html", "./manifest.webmanifest",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/maskable-512.png", "./icons/apple-180.png", "./icons/favicon-32.png"];
const EXTRA = ["https://cdn.jsdelivr.net/npm/mp4-muxer@5.1.3/build/mp4-muxer.js"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(async c => {
    await c.addAll(SHELL);
    await Promise.all(EXTRA.map(u => c.add(u).catch(() => {}))); // optional, never blocks install
  }).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if(req.method !== "GET") return;
  const url = new URL(req.url);
  // App page: newest version when online, cached copy when offline
  if(req.mode === "navigate"){
    e.respondWith(fetch(req).then(r => { caches.open(VERSION).then(c => c.put("./index.html", r.clone())); return r; })
      .catch(() => caches.match("./index.html")));
    return;
  }
  // Fonts, icons and the MP4 library: cache first
  const isStatic = url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname) || url.hostname === "cdn.jsdelivr.net";
  if(isStatic){
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
      if(r.ok || r.type === "opaque"){ const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return r;
    })));
  }
  // Everything else (Quran API, audio, stock video) goes straight to the network
});
