/* ---------- 仕様変更のお知らせ（アプリ内ポップアップ＋プッシュ通知）----------
   ・開いたときに一度だけ出るポップアップ（「今後表示しない」にできる）
   ・設定でオンにすると、アプリを閉じていてもプッシュ通知が届く
   どちらも announce-data.json の内容（一番上が最新）を使う。 */
(function () {
  "use strict";
  var CFG = window.TRIP_SHARE || {};
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem("trip:" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem("trip:" + k, JSON.stringify(v)); } catch (e) { /* 保存できない環境では無視 */ } }
  };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

  function configured() { return !!(CFG.db && /^https:\/\//.test(CFG.db)) && !!window.VAPID_PUBLIC_KEY; }

  function rnd() {
    var a = new Uint8Array(24), s = "";
    (window.crypto || window.msCrypto).getRandomValues(a);
    for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function mySubId() {
    var id = store.get("pushSubId", "");
    if (!id) { id = rnd(); store.set("pushSubId", id); }
    return id;
  }
  function urlB64ToUint8Array(b64) {
    var pad = "=".repeat((4 - (b64.length % 4)) % 4);
    var base64 = (b64 + pad).replace(/-/g, "+").replace(/_/g, "/");
    var raw = atob(base64), out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  /* ---------- お知らせポップアップ ---------- */
  var ENTRIES = null;
  function loadEntries(cb) {
    if (ENTRIES) { cb(ENTRIES); return; }
    fetch("announce-data.json", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (j) {
      ENTRIES = Array.isArray(j) ? j : []; cb(ENTRIES);
    }).catch(function () { cb([]); });
  }

  function show(e) {
    var html = '<div class="lbox" role="dialog" aria-modal="true" aria-label="お知らせ"><div class="shead" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">' +
      "<h3 style=\"margin:0\">" + esc(e.title || "お知らせ") + '</h3><button type="button" data-an="close" aria-label="閉じる" style="background:none;border:0;color:var(--sub);font-size:1.1rem">✕</button></div>' +
      (e.body || []).map(function (t) { return "<p>" + esc(t) + "</p>"; }).join("") +
      '<label class="lb" style="display:flex;align-items:center;gap:8px;margin-top:10px"><input type="checkbox" id="an-dontshow" style="width:18px;height:18px"> 今後表示しない</label>' +
      '<p style="margin-top:12px"><button class="btn primary" type="button" data-an="close" style="width:100%">閉じる</button></p></div>';
    var old = document.getElementById("announce"); if (old) old.remove();
    var d = document.createElement("div");
    d.id = "announce";
    d.innerHTML = html;
    document.body.appendChild(d);
    d.addEventListener("click", function (ev) {
      if (ev.target.closest("[data-an=\"close\"]")) {
        if (d.querySelector("#an-dontshow").checked) store.set("announceSeen", e.id);
        d.remove();
      }
    });
  }

  function checkAndShow() {
    loadEntries(function (list) {
      var e = list[0]; if (!e) return;
      var seen = store.get("announceSeen", null);
      if (seen !== e.id) show(e);
    });
  }

  /* ---------- プッシュ通知の登録・解除 ---------- */
  function isOn() { return !!store.get("announceOn", false); }

  function subscribe(cb) {
    if (!configured() || !("serviceWorker" in navigator) || !("PushManager" in window)) { cb(false, "この端末・ブラウザでは通知が使えません。"); return; }
    Notification.requestPermission().then(function (perm) {
      if (perm !== "granted") { cb(false, "通知が許可されなかったため、通知はオフのままにします。"); return; }
      navigator.serviceWorker.ready.then(function (reg) {
        return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(window.VAPID_PUBLIC_KEY) });
      }).then(function (sub) {
        var url = CFG.db.replace(/\/$/, "") + "/pushSubs/" + mySubId() + ".json";
        return fetch(url, { method: "PUT", body: JSON.stringify(sub.toJSON()) });
      }).then(function (r) {
        if (!r.ok) throw new Error("http " + r.status);
        store.set("announceOn", true);
        cb(true);
      }).catch(function () { cb(false, "通知の登録に失敗しました。時間をおいて、もう一度お試しください。"); });
    });
  }

  function unsubscribe(cb) {
    store.set("announceOn", false);
    var url = CFG.db.replace(/\/$/, "") + "/pushSubs/" + mySubId() + ".json";
    fetch(url, { method: "DELETE" }).then(function () { cb(true); }).catch(function () { cb(true); });
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.getSubscription(); }).then(function (sub) { if (sub) sub.unsubscribe(); }).catch(function () { /* 無視 */ });
    }
  }

  window.TripAnnounce = { checkAndShow: checkAndShow, isOn: isOn, subscribe: subscribe, unsubscribe: unsubscribe };
})();
