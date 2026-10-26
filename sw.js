// オフラインでも使えるよう、同じ場所のファイルをキャッシュする
var CACHE = "trip-guide-v1";
var FILES = ["./", "index.html", "style.css", "app.js", "data.js", "manifest.webmanifest", "icon.svg"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }));
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});

// ネットワーク優先、失敗したらキャッシュ（更新がすぐ反映され、電波がなくても開ける）
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      return res;
    }).catch(function () { return caches.match(e.request); })
  );
});
