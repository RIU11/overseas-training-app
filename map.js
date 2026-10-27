// 地図ページ。現在地は端末のブラウザの中だけで使い、このアプリの運営側には送らない（サーバーが無い）。
// 地図の表示には、Leaflet（vendor/）と OpenStreetMap の地図画像を使う。
(function () {
  "use strict";
  var SF = [37.7749, -122.4194];
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem("trip:" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem("trip:" + k, JSON.stringify(v)); } catch (e) { /* 保存できない環境では無視 */ } }
  };
  var map = null, dot = null, ring = null, watchId = null, last = null, follow = true;

  var MSG = {
    idle: "「現在地を表示」を押すと、許可の確認が出ます。",
    asking: "現在地を調べています…（許可の確認が出たら「許可」を押してください）",
    ok: "現在地を表示しています。",
    denied: "現在地の使用が許可されていません。ブラウザやスマホの設定で、このサイトの位置情報を「許可」にしてから、もう一度押してください。",
    unavailable: "現在地を取得できませんでした。電波の良い場所で、もう一度お試しください。",
    timeout: "現在地の取得に時間がかかっています。もう一度お試しください。",
    unsupported: "この端末のブラウザは、現在地の取得に対応していません。",
    nomap: "地図の部品を読み込めませんでした。ネットにつながっているか確認してください。"
  };
  var BAD = { denied: 1, unavailable: 1, timeout: 1, unsupported: 1, nomap: 1 };

  function setState(s) {
    var el = document.getElementById("map-msg");
    if (el) { el.textContent = MSG[s] || ""; el.className = "muted small" + (BAD[s] ? " warnmsg" : ""); }
    var b = document.getElementById("map-start");
    if (b) b.textContent = watchId === null ? "📍 現在地を表示" : "📍 現在地へ戻る";
    var g = document.getElementById("map-g");
    if (g) g.hidden = !last;
  }

  function onPos(p) {
    last = { lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy };
    store.set("locAsked", true);
    if (map) {
      var ll = [last.lat, last.lng];
      if (!dot) {
        ring = L.circle(ll, { radius: last.acc, weight: 1, color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.15 }).addTo(map);
        dot = L.circleMarker(ll, { radius: 8, weight: 3, color: "#fff", fillColor: "#2563eb", fillOpacity: 1 }).addTo(map);
        map.setView(ll, 16);
      } else {
        dot.setLatLng(ll); ring.setLatLng(ll); ring.setRadius(last.acc);
        if (follow) map.panTo(ll);
      }
    }
    setState("ok");
  }

  function onErr(e) {
    stopWatch();
    setState(e && e.code === 1 ? "denied" : e && e.code === 3 ? "timeout" : "unavailable");
  }

  function startWatch() {
    if (!("geolocation" in navigator)) { setState("unsupported"); return; }
    if (watchId !== null) {
      // すでに追跡中なら、現在地へ戻るだけ
      follow = true;
      if (map && last) map.setView([last.lat, last.lng], Math.max(map.getZoom(), 16));
      return;
    }
    follow = true;
    watchId = navigator.geolocation.watchPosition(onPos, onErr, { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 });
    setState("asking");
  }

  function stopWatch() {
    if (watchId !== null) { try { navigator.geolocation.clearWatch(watchId); } catch (e) { /* 無視 */ } watchId = null; }
  }

  // ページを離れるときは、地図を片付けて、電池を使わないよう追跡も止める
  function stop() {
    stopWatch();
    if (map) { try { map.remove(); } catch (e) { /* 無視 */ } }
    map = null; dot = null; ring = null;
  }

  function html() {
    return '<div class="hero" style="min-height:130px"><div class="in"><div class="h">🗺 地図</div><div class="capt">現在地を、地図に表示します</div></div></div>' +
      '<div class="card"><div id="map" role="application" aria-label="地図"></div>' +
      '<div class="maprow"><button class="btn primary" id="map-start" type="button">📍 現在地を表示</button>' +
      '<a class="btn" id="map-g" target="_blank" rel="noopener" hidden>Googleマップで開く</a></div>' +
      '<p id="map-msg" class="muted small"></p>' +
      '<p class="muted small">現在地は、この端末のブラウザの中だけで使います（このアプリが保存したり、送ったりはしません）。地図の画像は、OpenStreetMap から読み込みます。ネットにつながっていないときは、地図が表示されません。</p></div>';
  }

  function bind() {
    var el = document.getElementById("map");
    if (!el) return;
    if (!window.L) { setState("nomap"); return; }
    stop();
    map = L.map(el, { zoomControl: true, attributionControl: true }).setView(last ? [last.lat, last.lng] : SF, last ? 16 : 11);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
    map.on("dragstart", function () { follow = false; });
    document.getElementById("map-start").addEventListener("click", startWatch);
    document.getElementById("map-g").addEventListener("click", function (e) {
      if (!last) { e.preventDefault(); return; }
      this.href = "https://www.google.com/maps/search/?api=1&query=" + last.lat + "," + last.lng;
    });
    setState("idle");
    // すでに許可されているなら、確認なしでそのまま現在地を出す
    try {
      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: "geolocation" }).then(function (r) {
          if (r.state === "granted" && document.getElementById("map")) startWatch();
          else if (r.state === "denied") setState("denied");
        }).catch(function () { /* 対応していない端末は、ボタンで開始 */ });
      }
    } catch (e) { /* 無視 */ }
  }

  // 初めて開いたときに、現在地の許可をお願いする案内を出す（OKを押すと、ブラウザの許可の確認が出る）
  function init(openMap) {
    if (store.get("locAsked", false) || !("geolocation" in navigator)) return;
    var ask = function () {
      if (document.getElementById("locask")) return;
      var d = document.createElement("div");
      d.id = "locask";
      d.innerHTML = '<div class="lbox" role="dialog" aria-modal="true" aria-label="現在地の許可"><h3>📍 現在地を使いますか？</h3>' +
        "<p>現在地を地図に表示するために、位置情報を使います。OKを押すと、スマホから許可の確認が出るので「許可」を押してください。</p>" +
        '<p class="muted small">位置情報は、この端末の中だけで使われます。あとから「地図」ページでも設定できます。</p>' +
        '<div class="lbtn"><button class="btn" type="button" data-l="no">あとで</button><button class="btn primary" type="button" data-l="ok">OK</button></div></div>';
      document.body.appendChild(d);
      d.addEventListener("click", function (e) {
        var b = e.target.closest("[data-l]"); if (!b) return;
        store.set("locAsked", true);
        d.remove();
        if (b.getAttribute("data-l") === "ok") { openMap(); startWatch(); }
      });
    };
    var later = function () { setTimeout(ask, 700); };
    try {
      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: "geolocation" }).then(function (r) {
          if (r.state === "prompt") later();
          else store.set("locAsked", true);
        }).catch(later);
        return;
      }
    } catch (e) { /* 下へ */ }
    later();
  }

  window.TripMap = { html: html, bind: bind, stop: stop, init: init };
})();
