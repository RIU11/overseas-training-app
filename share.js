/* ---------- 位置の共有（学生側）----------
   学生のアプリが、いまの位置を、サーバー（Firebase Realtime Database）の「自分だけの合言葉つきの場所」に送る。
   保護者は、その合言葉つきのURL（watch.html）を開くと、最新の1点が見られる。履歴は残さない。
   位置が送られるのは、このアプリを開いていて、画面がついているあいだだけ（ブラウザの仕組みの制限）。 */
(function () {
  var CFG = window.TRIP_SHARE || {};
  var SEND_MS = 10000;                      // 位置を送る間隔の目安
  var EXP = Date.parse("2026-12-05T00:00:00Z"); // 研修のあと、この日を過ぎたら、送るのも見るのも終わり

  var store = {
    get: function (k, d) { try { var v = localStorage.getItem("trip:" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem("trip:" + k, JSON.stringify(v)); } catch (e) { /* 保存できない環境では無視 */ } }
  };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

  var S = store.get("share", null);          // { token, key, name, on, okAt }
  var watchId = null, last = null, lastSent = 0, hb = null, lock = null, msg = "";

  function configured() { return !!(CFG.db && /^https:\/\//.test(CFG.db)); }
  function pad(n) { return ("0" + n).slice(-2); }
  function hhmm(ts) { var d = new Date(ts); return pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds()); }

  // 推測できない合言葉（24バイトの乱数 → 32文字）
  function rnd() {
    var a = new Uint8Array(24), s = "";
    (window.crypto || window.msCrypto).getRandomValues(a);
    for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function viewUrl() { return location.href.replace(/[#?].*$/, "").replace(/[^\/]*$/, "") + "watch.html#" + S.token; }
  function save() { store.set("share", S); }

  /* ---------- サーバーへ送る ---------- */
  function put(pub, tok, key) {
    var url = CFG.db.replace(/\/$/, "") + "/share/" + tok + ".json";
    return fetch(url, { method: "PUT", body: JSON.stringify({ k: key, pub: pub }) }).then(function (r) {
      if (!r.ok) throw new Error("http " + r.status);
    });
  }
  var noBus = false; // サーバーのルールが、乗るバスの項目に、まだ対応していないとき（送れなかったら、バスなしで送り直す）
  function pubNow() {
    var p = { t: Date.now(), on: !!(S && S.on), exp: EXP };
    var b = store.get("bus", "");
    if (b && !noBus) p.bus = String(b);
    if (S.name) p.name = S.name;
    if (S.okAt) p.ok = S.okAt;
    if (S.on && last) { p.la = +last.la.toFixed(5); p.lo = +last.lo.toFixed(5); p.ac = Math.round(last.ac || 0); }
    return p;
  }
  function send() {
    if (!S || !configured()) return Promise.resolve();
    lastSent = Date.now();
    var p = pubNow();
    return put(p, S.token, S.key).catch(function (e) {
      if (p.bus) { noBus = true; return put(pubNow(), S.token, S.key); } // バスの項目で拒否されたなら、バスなしで、もう一度
      throw e;
    }).then(function () { msg = "最後に送った時刻 " + hhmm(lastSent) + (last ? "（誤差 約" + Math.round(last.ac || 0) + "m）" : "（位置はまだ取れていません）"); paint(); })
      .catch(function () { msg = "送れませんでした（電波がないか、サーバーの設定を確認してください）。つながると、自動で再開します。"; paint(); });
  }

  /* ---------- 位置の取得（アプリを開いているあいだだけ動く）---------- */
  function onPos(p) {
    var firstFix = !last;
    last = { la: p.coords.latitude, lo: p.coords.longitude, ac: p.coords.accuracy };
    if (firstFix || Date.now() - lastSent >= SEND_MS) send(); else paint(); // 最初の位置は、すぐ送る
  }
  function onErr(e) {
    msg = e && e.code === 1 ? "現在地が許可されていません。ブラウザの設定で、位置情報を許可してください。" : "現在地を取得できません。電波の良い場所で、もう一度お試しください。";
    paint();
  }
  function keepAwake() {
    if (!S || !S.on || store.get("shareAwake", true) === false) return;
    try {
      if (!navigator.wakeLock || lock) return;
      navigator.wakeLock.request("screen").then(function (l) { lock = l; l.addEventListener("release", function () { lock = null; }); }).catch(function () { /* 使えない端末 */ });
    } catch (e) { /* 無視 */ }
  }
  function startWatch() {
    if (watchId !== null || !S || !S.on || !configured()) return;
    if (Date.now() > EXP) { S.on = false; save(); return; }
    if (!("geolocation" in navigator)) { onErr(); return; }
    watchId = navigator.geolocation.watchPosition(onPos, onErr, { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 });
    if (hb) clearInterval(hb);
    hb = setInterval(function () { if (S && S.on && Date.now() - lastSent >= SEND_MS + 4000) send(); }, 5000); // 位置が変わらない間も、定期的に送る
    keepAwake();
  }
  function stopWatch() {
    if (watchId !== null) { try { navigator.geolocation.clearWatch(watchId); } catch (e) { /* 無視 */ } watchId = null; }
    if (hb) { clearInterval(hb); hb = null; }
    if (lock) { try { lock.release(); } catch (e) { /* 無視 */ } lock = null; }
  }
  document.addEventListener("visibilitychange", function () {
    if (document.hidden || !S || !S.on) return;
    keepAwake();
    if (Date.now() - lastSent >= SEND_MS) send();
  });

  /* ---------- 操作 ---------- */
  function begin() {
    if (!S) S = { token: rnd(), key: rnd(), name: "", on: false, okAt: 0 };
    S.on = true; save(); last = null; msg = "位置を取得しています…";
    startWatch(); send(); render();
  }
  function end() {
    if (!S) return;
    S.on = false; save(); stopWatch();
    var s = send(); last = null; msg = "共有を止めました。保護者の画面には、「共有を停止中」と出ます。"; render(); return s;
  }
  function renew() {
    if (!S) return;
    var old = { token: S.token, key: S.key }, wasOn = S.on;
    S.on = false;
    put({ t: Date.now(), on: false, exp: EXP }, old.token, old.key).catch(function () { /* 古い方は、期限で見えなくなる */ });
    S = { token: rnd(), key: rnd(), name: S.name, on: wasOn, okAt: 0 }; save();
    msg = "新しいURLを作りました。古いURLでは、見られなくなります。"; render(); if (wasOn) send();
  }
  function safe() {
    if (!S) return;
    S.okAt = Date.now(); save();
    if (!S.on) { msg = "「無事です」は、共有を始めると、保護者に届きます。"; render(); return; }
    send(); render();
  }

  /* ---------- 画面 ---------- */
  function qrSvg(text) {
    try { var q = qrcode(0, "M"); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 5, margin: 2, scalable: true }); } catch (e) { return ""; }
  }
  function html() {
    var h = '<div class="hero" style="min-height:130px"><div class="in"><div class="h">位置の共有</div><div class="capt">保護者に、いまの場所を知らせます</div></div></div><div id="sh-root">';
    if (!configured()) {
      return h + '<div class="card"><h3>共有は、準備中です</h3><p class="muted">サーバーの設定が済むと、ここから保護者に位置を共有できます。</p></div></div>';
    }
    if (!S || !S.on) {
      h += '<div class="card"><h3>保護者に位置を共有する</h3>' +
        "<p>始めると、あなた専用のURLとQRコードができます。保護者がそれを開くと、あなたのいまの場所が地図に出ます。</p>" +
        '<ul class="pl"><li>送るのは、<b>最新の1点だけ</b>です。移動の履歴は残しません。</li><li>URLを知っている人は、誰でも見られます。<b>保護者にだけ</b>送ってください。</li><li>いつでも、止められます。研修のあとは、自動で終わります。</li></ul>' +
        '<p><button class="btn primary" type="button" data-sh="ask">共有を始める</button></p>' + (msg ? '<p class="muted small">' + esc(msg) + "</p>" : "") + "</div>";
      if (S) h += renewCard();
      return h + noteCard() + "</div>";
    }
    var u = viewUrl();
    h += '<div class="card"><h3><span class="shdot"></span>共有中</h3>' +
      '<p class="small" id="sh-st">' + esc(msg) + "</p>" +
      '<div class="shqr">' + qrSvg(u) + "</div>" +
      '<p class="muted small" style="text-align:center">保護者が、このQRコードを読み取るか、下のURLを開くと、位置が見られます。</p>' +
      '<input class="shurl" id="sh-url" type="text" readonly value="' + esc(u) + '" aria-label="共有URL">' +
      '<div class="shbtns"><button class="btn" type="button" data-sh="copy">URLをコピー</button>' + (navigator.share ? '<button class="btn primary" type="button" data-sh="send">URLを送る</button>' : "") + "</div></div>" +
      '<div class="card"><h3>無事です</h3><p class="muted small">押すと、保護者の画面に、時刻つきで「無事です」と出ます。' + (S.okAt ? "（最後に押した時刻 " + hhmm(S.okAt) + "）" : "") + '</p><p><button class="btn primary shok" type="button" data-sh="safe">無事です</button> <button class="btn" type="button" data-sh="now">いまの位置を送る</button></p></div>' +
      '<div class="card"><h3>設定</h3>' +
      '<label class="lb">呼び名（保護者の画面に出ます。本名でなくてもよいです）</label><input class="shname" id="sh-name" type="text" maxlength="20" value="' + esc(S.name) + '" placeholder="例：たろう">' +
      '<label class="shchk"><input type="checkbox" id="sh-awake"' + (store.get("shareAwake", true) !== false ? " checked" : "") + '> 画面を点けたままにする（位置が止まりにくくなります。電池は減りやすくなります）</label>' +
      '<p><button class="btn" type="button" data-sh="stop">共有を止める</button></p></div>' + renewCard() + noteCard() + "</div>";
    return h;
  }
  function renewCard() {
    return '<div class="card"><h3>URLを作り直す</h3><p class="muted small">URLを、見せたくない人に知られたときに使います。古いURLでは、見られなくなります。保護者には、新しいURLを送り直してください。</p><p><button class="btn" type="button" data-sh="renew">作り直す</button></p></div>';
  }
  function noteCard() {
    return '<div class="card"><p class="muted small">位置が送られるのは、<b>このアプリを開いていて、画面がついている間だけ</b>です。画面が消えたり、ほかのアプリを開いたりすると、止まります。保護者の画面には、最後に届いた時刻が出ます。位置の情報は、サーバー（Firebase）に、最新の1点だけ保存され、研修のあとに削除されます。</p></div>';
  }
  function paint() {
    var el = document.getElementById("sh-st"); if (el) el.textContent = msg;
  }
  function render() {
    var root = document.getElementById("sh-root");
    if (!root) return;
    var wrap = document.getElementById("view");
    if (wrap) { var y = window.scrollY; wrap.innerHTML = html(); window.scrollTo(0, y); bind(); }
  }

  function confirmStart() {
    if (document.getElementById("sharecfm")) return;
    var d = document.createElement("div");
    d.id = "sharecfm";
    d.innerHTML = '<div class="lbox" role="dialog" aria-modal="true" aria-label="位置の共有"><h3>位置を共有しますか？</h3>' +
      "<p>共有を始めると、このURLを知っている人は、あなたのいまの場所を見られます。</p>" +
      '<ul class="pl"><li>送るのは、最新の1点だけ（履歴は残しません）</li><li>URLは、保護者にだけ送ります</li><li>いつでも止められます</li></ul>' +
      '<div class="lbtn"><button class="btn" type="button" data-c="no">やめる</button><button class="btn primary" type="button" data-c="ok">共有を始める</button></div></div>';
    d.addEventListener("click", function (e) {
      var b = e.target.closest("[data-c]"); if (!b) return;
      d.remove();
      if (b.getAttribute("data-c") === "ok") begin();
    });
    document.body.appendChild(d);
  }

  function bind() {
    var root = document.getElementById("sh-root"); if (!root) return;
    root.addEventListener("click", function (e) {
      var b = e.target.closest("[data-sh]"); if (!b) return;
      var a = b.getAttribute("data-sh");
      if (a === "ask") confirmStart();
      else if (a === "stop") end();
      else if (a === "renew") { if (window.confirm("古いURLを使えなくして、新しいURLを作ります。よろしいですか？")) renew(); }
      else if (a === "safe") safe();
      else if (a === "now") { if (S && S.on) { send(); } }
      else if (a === "copy") {
        var inp = document.getElementById("sh-url"), u = inp ? inp.value : "";
        var done = function () { b.textContent = "コピーしました"; setTimeout(function () { b.textContent = "URLをコピー"; }, 1800); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(u).then(done).catch(function () { if (inp) { inp.select(); try { document.execCommand("copy"); done(); } catch (er) { /* 無視 */ } } });
        else if (inp) { inp.select(); try { document.execCommand("copy"); done(); } catch (er) { /* 無視 */ } }
      } else if (a === "send") {
        try { navigator.share({ title: "研修中の位置", text: "研修中の位置を共有します。", url: viewUrl() }).catch(function () { /* 閉じられた */ }); } catch (er) { /* 無視 */ }
      }
    });
    root.addEventListener("change", function (e) {
      if (e.target.id === "sh-awake") { store.set("shareAwake", e.target.checked); if (e.target.checked) keepAwake(); else if (lock) { try { lock.release(); } catch (er) { /* 無視 */ } lock = null; } }
    });
    root.addEventListener("input", function (e) {
      if (e.target.id === "sh-name" && S) { S.name = e.target.value.slice(0, 20); save(); }
    });
    root.addEventListener("focusout", function (e) { if (e.target.id === "sh-name" && S && S.on) send(); });
  }

  // アプリを開いたとき、共有の途中だったら、そのまま再開する
  function resume() { if (S && S.on) startWatch(); }

  window.TripShare = { html: html, bind: bind, resume: resume, active: function () { return !!(S && S.on); } };
})();
