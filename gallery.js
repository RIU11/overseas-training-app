/* ---------- みんなの写真共有（全員が同じ場所に投稿する、合言葉なしの共有ギャラリー）----------
   Firebase Realtime Database の /photos に、縮小した写真（base64）・一言を置く。
   自分が投稿したものだけ、この端末に記録した鍵（ownerKey）で削除できる。 */
(function () {
  var CFG = window.TRIP_SHARE || {};
  var C = window.TripIco ? { i: window.TripIco.i } : { i: function () { return ""; } };
  var MAX_IMG_CHARS = 280000; // Firebaseルールの上限（30万）より少し手前で止める

  var store = {
    get: function (k, d) { try { var v = localStorage.getItem("trip:" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem("trip:" + k, JSON.stringify(v)); } catch (e) { /* 保存できない環境では無視 */ } }
  };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

  function configured() { return !!(CFG.db && /^https:\/\//.test(CFG.db)); }

  function rnd() {
    var a = new Uint8Array(24), s = "";
    (window.crypto || window.msCrypto).getRandomValues(a);
    for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function myKey() {
    var k = store.get("photoKey", "");
    if (!k) { k = rnd(); store.set("photoKey", k); }
    return k;
  }
  function myIds() { return store.get("myPhotoIds", []); }
  function addMyId(id) {
    var a = myIds(); a.push(id);
    if (a.length > 300) a = a.slice(a.length - 300);
    store.set("myPhotoIds", a);
  }
  function myName() {
    var s = store.get("share", null);
    return (s && s.name) ? s.name : "";
  }

  var list = [], loaded = false;

  function load(cb) {
    if (!configured()) { cb && cb(); return; }
    var url = CFG.db.replace(/\/$/, "") + '/photos.json?orderBy="t"&limitToLast=60';
    fetch(url, { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); }).then(function (j) {
      var arr = [];
      if (j) Object.keys(j).forEach(function (id) { var v = j[id]; v.id = id; if (!v.del) arr.push(v); });
      arr.sort(function (a, b) { return (b.t || 0) - (a.t || 0); });
      list = arr; loaded = true; cb && cb();
    }).catch(function () { cb && cb(); });
  }

  /* ---------- 画像の縮小・圧縮 ---------- */
  function resizeAndEncode(file, cb) {
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var max = 1280, w = img.naturalWidth, h = img.naturalHeight;
        var scale = Math.min(1, max / Math.max(w, h));
        var cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
        var canvas = document.createElement("canvas");
        canvas.width = cw; canvas.height = ch;
        canvas.getContext("2d").drawImage(img, 0, 0, cw, ch);
        var q = 0.72, out = canvas.toDataURL("image/jpeg", q);
        while (out.length > MAX_IMG_CHARS && q > 0.35) { q -= 0.1; out = canvas.toDataURL("image/jpeg", q); }
        cb(out.replace(/^data:image\/jpeg;base64,/, ""));
      };
      img.onerror = function () { cb(null); };
      img.src = reader.result;
    };
    reader.onerror = function () { cb(null); };
    reader.readAsDataURL(file);
  }

  /* ---------- 送信 ---------- */
  function post(img, cap, cb) {
    var url = CFG.db.replace(/\/$/, "") + "/photos.json";
    var body = { t: Date.now(), name: myName(), cap: cap, img: img, ownerKey: myKey() };
    fetch(url, { method: "POST", body: JSON.stringify(body) }).then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); }).then(function (j) {
      if (j && j.name) addMyId(j.name);
      cb(true);
    }).catch(function () { cb(false); });
  }
  function remove(item, cb) {
    var url = CFG.db.replace(/\/$/, "") + "/photos/" + item.id + ".json";
    fetch(url, { method: "PUT", body: JSON.stringify({ t: item.t, ownerKey: myKey(), del: true }) }).then(function (r) {
      if (!r.ok) throw new Error("http " + r.status);
      cb(true);
    }).catch(function () { cb(false); });
  }

  /* ---------- 画面 ---------- */
  function thumb(it) {
    return '<button type="button" class="gph" data-gal-view="' + esc(it.id) + '"><img src="data:image/jpeg;base64,' + it.img + '" alt="">' +
      (it.cap ? '<span class="gphcap">' + esc(it.cap) + "</span>" : "") + "</button>";
  }
  function stripHtml() {
    if (!loaded) return '<p class="muted small">読み込んでいます…</p>';
    if (!list.length) return '<p class="muted small">まだ写真がありません。</p>';
    return '<div class="strip" id="gal-strip">' + list.map(thumb).join("") + "</div>";
  }
  function html(opts) {
    opts = opts || {};
    var h = '<div class="card" id="galcard"><h3>みんなの写真</h3><div id="gal-body">';
    if (!configured()) {
      h += '<p class="muted small">写真の共有は、準備中です。</p></div></div>';
      return h;
    }
    h += stripHtml() + "</div>";
    if (opts.canPost) {
      h += '<p style="margin-top:10px"><button class="btn primary" type="button" id="gal-post-btn">' + C.i("camera", 18) + " 写真を投稿</button></p>" +
        '<input type="file" accept="image/*" capture="environment" id="gal-cam" style="display:none">' +
        '<input type="file" accept="image/*" id="gal-lib" style="display:none">';
    }
    h += "</div>";
    return h;
  }

  /* ---------- オーバーレイ（選択シート／投稿フォーム／ライトボックス）---------- */
  function overlay(id, inner) {
    var old = document.getElementById(id); if (old) old.remove();
    var d = document.createElement("div");
    d.id = id;
    d.innerHTML = '<div class="lbox" role="dialog" aria-modal="true">' + inner + "</div>";
    document.body.appendChild(d);
    return d;
  }
  function closeOverlay(id) { var el = document.getElementById(id); if (el) el.remove(); }

  function openPick() {
    var d = overlay("galpick",
      "<h3>写真を投稿</h3>" +
      '<p class="muted small">撮るか、選ぶかを選んでください。</p>' +
      '<p><button class="btn primary" type="button" data-p="cam" style="width:100%;margin-bottom:8px">' + C.i("camera", 18) + " 写真を撮る</button>" +
      '<button class="btn" type="button" data-p="lib" style="width:100%;margin-bottom:8px">' + C.i("image", 18) + " 写真を選ぶ</button>" +
      '<button class="btn" type="button" data-p="no" style="width:100%">やめる</button></p>');
    d.addEventListener("click", function (e) {
      var b = e.target.closest("[data-p]"); if (!b) return;
      var a = b.getAttribute("data-p");
      closeOverlay("galpick");
      if (a === "cam") { var c = document.getElementById("gal-cam"); if (c) c.click(); }
      else if (a === "lib") { var l = document.getElementById("gal-lib"); if (l) l.click(); }
    });
  }
  var pending = null; // { img }
  function openForm() {
    var d = overlay("galpost",
      '<h3>写真を投稿</h3><div class="galprev"><img src="data:image/jpeg;base64,' + pending.img + '" alt=""></div>' +
      '<label class="lb">一言（任意・場所や名前などもここに）</label><input type="text" id="gf-cap" maxlength="80" placeholder="例：ゴールデンゲートブリッジ・みんなで記念写真">' +
      '<p style="margin-top:10px"><button class="btn primary" type="button" id="gf-send" style="width:100%;margin-bottom:8px">投稿する</button>' +
      '<button class="btn" type="button" id="gf-cancel" style="width:100%">やめる</button></p>');
    d.querySelector("#gf-cancel").addEventListener("click", function () { closeOverlay("galpost"); pending = null; });
    d.querySelector("#gf-send").addEventListener("click", function () {
      var btn = d.querySelector("#gf-send"); btn.disabled = true; btn.textContent = "送信中…";
      var cap = d.querySelector("#gf-cap").value.trim();
      post(pending.img, cap, function (ok) {
        pending = null;
        if (!ok) { alert("送れませんでした。電波を確認して、もう一度お試しください。"); closeOverlay("galpost"); return; }
        closeOverlay("galpost");
        load(function () { refreshStrip(); });
      });
    });
  }
  function openView(id) {
    var it = list.filter(function (x) { return x.id === id; })[0]; if (!it) return;
    var mine = myIds().indexOf(id) >= 0;
    var d = document.getElementById("galview");
    var when = new Date(it.t || 0).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
    var body = '<div class="galbig"><img src="data:image/jpeg;base64,' + it.img + '" alt=""></div>' +
      (it.cap ? "<p>" + esc(it.cap) + "</p>" : "") +
      '<p class="muted small">' + (it.name ? esc(it.name) + "・" : "") + esc(when) + "</p>" +
      '<p style="margin-top:8px">' + (mine ? '<button class="btn" type="button" id="gv-del" style="width:100%;margin-bottom:8px">' + C.i("trash", 18) + " この写真を削除</button>" : "") +
      '<button class="btn primary" type="button" id="gv-close" style="width:100%">閉じる</button></p>';
    if (!d) { d = overlay("galview", body); } else { d.querySelector(".lbox").innerHTML = body; }
    d.querySelector("#gv-close").addEventListener("click", function () { closeOverlay("galview"); });
    var del = d.querySelector("#gv-del");
    if (del) del.addEventListener("click", function () {
      if (!confirm("この写真を削除しますか？")) return;
      del.disabled = true; del.textContent = "削除中…";
      remove(it, function (ok) {
        closeOverlay("galview");
        if (!ok) { alert("削除できませんでした。電波を確認して、もう一度お試しください。"); return; }
        load(function () { refreshStrip(); });
      });
    });
  }

  function refreshStrip() {
    var body = document.getElementById("gal-body");
    if (body) body.innerHTML = stripHtml();
  }
  function refresh() { load(refreshStrip); }

  var bound = false;
  function bind(opts) {
    opts = opts || {};
    load(refreshStrip);
    var card = document.getElementById("galcard"); if (!card) return;
    card.addEventListener("click", function (e) {
      var v = e.target.closest("[data-gal-view]"); if (v) { openView(v.getAttribute("data-gal-view")); return; }
      if (e.target.closest("#gal-post-btn")) { openPick(); return; }
    });
    var cam = document.getElementById("gal-cam"), lib = document.getElementById("gal-lib");
    [cam, lib].forEach(function (inp) {
      if (!inp) return;
      inp.addEventListener("change", function () {
        var f = inp.files && inp.files[0]; inp.value = "";
        if (!f) return;
        resizeAndEncode(f, function (img) {
          if (!img) { alert("この画像は使えませんでした。別の写真でお試しください。"); return; }
          pending = { img: img };
          openForm();
        });
      });
    });
  }

  window.TripGallery = { html: html, bind: bind, refresh: refresh };
})();
