// オフラインでも使えるよう、同じ場所のファイルをキャッシュする
var CACHE = "trip-guide-v2";
var IMGS = ["gg-dusk", "gg-glow", "gg-alcatraz", "sf-night", "sf-neon", "bay-bridge", "palace", "silicon-valley", "pier39", "yosemite", "hollywood", "la-night", "la-night2", "la-dusk", "santa-monica", "santa-monica-night", "disneyland"];
var FILES = ["./", "index.html", "style.css", "app.js", "data.js", "photos.js", "manifest.webmanifest", "icon.svg"]
  .concat(IMGS.map(function (n) { return "img/" + n + ".jpg"; }));

self.addEventListener("install", function (e) {
  // 1つ取得に失敗しても、残りはキャッシュする
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(FILES.map(function (f) { return c.add(f).catch(function () { /* 無視 */ }); }));
  }));
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
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      }
      return res;
    }).catch(function () { return caches.match(e.request); })
  );
});
