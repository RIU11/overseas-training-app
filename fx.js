// ホームの「ドル → 円」の枠：今のレート／ドルの入力欄／カメラで値札を映すだけで円を表示。
// レート：ExchangeRate-API（キー不要・1日1回更新）。取れなければ別の無料データ、それもだめなら前回の保存分。
// カメラ：撮影はしない。映像から値札の文字をスマホの中で読み取り（Tesseract.js）、金額の判断は price-parse.js。
(function () {
  "use strict";
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem("trip:" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem("trip:" + k, JSON.stringify(v)); } catch (e) { /* 無視 */ } }
  };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var TAX = 0.1; // カリフォルニアの消費税（市によって約9〜10%）の目安

  /* ---------- レート ---------- */
  var rate = store.get("fx", null); // { r: 159.39, at: 更新時刻(ms), ts: 取得した時刻(ms), src }
  function getRate(cb) {
    if (rate && Date.now() - rate.ts < 3 * 3600000) { cb(); return; }
    fetch("https://open.er-api.com/v6/latest/USD", { cache: "no-store" }).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (j) {
      if (j.result !== "success" || !j.rates || !j.rates.JPY) throw 0;
      return { r: j.rates.JPY, at: j.time_last_update_unix * 1000, src: "er" };
    }).catch(function () {
      return fetch("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json", { cache: "no-store" }).then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function (j) { if (!j.usd || !j.usd.jpy) throw 0; return { r: j.usd.jpy, at: Date.parse(j.date + "T00:00:00Z"), src: "fa" }; });
    }).then(function (v) { v.ts = Date.now(); rate = v; store.set("fx", v); cb(); }).catch(function () { cb(); });
  }
  function yen(usd) { return rate ? Math.round(usd * rate.r) : null; }
  function yenText(usd) { var y = yen(usd); return y === null ? "—" : "約" + y.toLocaleString("ja-JP") + "円"; }
  function usdText(u) { return "$" + (u % 1 ? u.toFixed(2) : String(u)); }
  function when(ms) { var d = new Date(ms); return d.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }); }

  /* ---------- ホームの枠 ---------- */
  function html() { return '<div class="card" id="fxcard"></div>'; }
  function cardHtml() {
    var v = store.get("fxusd", "");
    return '<h3>ドル → 円</h3>' +
      '<div class="fxrate">' + (rate ? "<b>1ドル ＝ " + rate.r.toFixed(2) + "円</b>" : "<b>レートを取得しています…</b>") +
      (rate ? '<span class="muted small">' + when(rate.at) + "（日本時間）の値" + (Date.now() - rate.ts > 26 * 3600000 ? "・前回の保存分" : "") + "</span>" : "") + "</div>" +
      '<div class="fxin"><span class="fxd">$</span><input type="text" inputmode="decimal" id="fx-usd" autocomplete="off" placeholder="ドルを入力（例：2.50）" aria-label="ドルの金額" value="' + esc(v) + '">' +
      '<span class="fxeq">＝</span><b id="fx-jpy">—</b></div>' +
      '<p class="muted small fxtax" id="fx-tax"></p>' +
      '<button type="button" class="btn primary fxcambtn" id="fx-cam">' + (window.TripIco ? TripIco.i("camera", 20) : "") + "<span>カメラで値札を映す</span></button>" +
      '<p class="muted small" style="margin:8px 0 0">レートは1日1回更新の目安です。両替所やカードの換算とは少し違います。<a href="https://www.exchangerate-api.com" target="_blank" rel="noopener">Rates By Exchange Rate API</a></p>';
  }
  function calc() {
    var i = document.getElementById("fx-usd"), o = document.getElementById("fx-jpy"), t = document.getElementById("fx-tax"); if (!i || !o) return;
    var s = i.value.replace(/[^\d.]/g, ""), u = parseFloat(s);
    store.set("fxusd", i.value);
    if (!s || isNaN(u)) { o.textContent = "—"; t.textContent = ""; return; }
    o.textContent = yenText(u);
    t.textContent = rate ? "税（約10%）がかかる場合：" + usdText(Math.round(u * (1 + TAX) * 100) / 100) + " → " + yenText(u * (1 + TAX)) : "";
  }
  function paint() {
    var box = document.getElementById("fxcard"); if (!box) return;
    var focused = document.activeElement && document.activeElement.id === "fx-usd";
    if (focused) { calc(); return; } // 入力中は作り直さない
    box.innerHTML = cardHtml(); calc();
  }
  function bind() {
    var box = document.getElementById("fxcard"); if (!box) return;
    paint(); getRate(paint);
    if (box.getAttribute("data-b")) return;
    box.setAttribute("data-b", "1");
    box.addEventListener("input", function (e) { if (e.target.id === "fx-usd") calc(); });
    box.addEventListener("click", function (e) { if (e.target.closest("#fx-cam")) openCam(); });
  }

  /* ---------- カメラ ---------- */
  var cam = { on: false, stream: null, worker: null, loading: null, last: null, same: 0, shown: null, busy: false };

  function loadScript(src) {
    return new Promise(function (ok, ng) { var s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = ng; document.head.appendChild(s); });
  }
  function abs(p) { return new URL(p, location.href).href; }
  function getWorker() {
    if (cam.worker) return Promise.resolve(cam.worker);
    if (cam.loading) return cam.loading;
    cam.loading = (window.Tesseract ? Promise.resolve() : loadScript("vendor/tesseract/tesseract.min.js")).then(function () {
      return window.Tesseract.createWorker("eng", 1, { workerPath: abs("vendor/tesseract/worker.min.js"), corePath: abs("vendor/tesseract/"), langPath: abs("vendor/tesseract/") });
    }).then(function (w) {
      cam.worker = w; return w;
    }).catch(function (e) { cam.loading = null; throw e; });
    return cam.loading;
  }

  function camHtml() {
    return '<div id="fxcam" role="dialog" aria-label="カメラで値札を読み取る">' +
      '<video id="fxv" playsinline muted autoplay></video>' +
      '<div id="fxguide"><span>値札をこの枠に入れてください</span></div>' +
      '<div id="fxtag" hidden></div>' +
      '<button type="button" id="fxclose" aria-label="閉じる">✕</button>' +
      '<div id="fxpanel"><div id="fxmsg">カメラを準備しています…</div>' +
      '<div class="fxbtns"><button type="button" class="btn" id="fxuse" disabled>この金額を入力欄へ</button><button type="button" class="btn" id="fxclose2">閉じる</button></div></div></div>';
  }
  function msg(h) { var m = document.getElementById("fxmsg"); if (m) m.innerHTML = h; }

  function openCam() {
    if (cam.on) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { alert("この端末・ブラウザでは、カメラを使えません。"); return; }
    cam.on = true; cam.last = null; cam.same = 0; cam.shown = null;
    document.body.insertAdjacentHTML("beforeend", camHtml());
    document.documentElement.classList.add("fxopen");
    var root = document.getElementById("fxcam");
    root.addEventListener("click", function (e) {
      if (e.target.closest("#fxclose") || e.target.closest("#fxclose2")) closeCam();
      else if (e.target.closest("#fxuse") && cam.shown) {
        var i = document.getElementById("fx-usd"), u = cam.shown.multi ? cam.shown.multi.total : cam.shown.usd;
        if (i) { i.value = u % 1 ? u.toFixed(2) : String(u); calc(); }
        closeCam();
      }
    });
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1920 } } /* 向きを決めない（縦長の映像が切り取られないように） */, audio: false }).then(function (s) {
      if (!cam.on) { s.getTracks().forEach(function (t) { t.stop(); }); return; }
      cam.stream = s;
      var v = document.getElementById("fxv"); v.srcObject = s; v.play().catch(function () { /* 無視 */ });
      msg(cam.worker ? "値札を枠の中に映してください" : "読み取りの準備をしています…（初回だけ数秒〜数十秒かかります）");
      getRate(function () {});
      return getWorker().then(function () { msg("値札を枠の中に映してください"); loop(); }, function () {
        msg("読み取りの準備ができませんでした。電波のある場所で、もう一度開いてください。");
      });
    }).catch(function () {
      msg("カメラを使えませんでした。カメラの許可を「許可」にしてから、もう一度お試しください。");
    });
  }
  function closeCam() {
    cam.on = false;
    if (cam.stream) cam.stream.getTracks().forEach(function (t) { t.stop(); });
    cam.stream = null;
    var r = document.getElementById("fxcam"); if (r) r.parentNode.removeChild(r);
    document.documentElement.classList.remove("fxopen");
  }

  // 枠の部分だけを切り出して、白黒にする（読み取りやすく、速くするため）
  var cv = document.createElement("canvas"), cx = cv.getContext("2d", { willReadFrequently: true });
  var cvg = document.createElement("canvas"), cxg = cvg.getContext("2d", { willReadFrequently: true }); // 整える前（白黒にしただけ）
  function grab() {
    var v = document.getElementById("fxv"), g = document.getElementById("fxguide");
    if (!v || !g || !v.videoWidth) return null;
    var vr = v.getBoundingClientRect(), gr = g.getBoundingClientRect();
    var sc = Math.max(vr.width / v.videoWidth, vr.height / v.videoHeight); // object-fit: cover
    var offX = vr.left + (vr.width - v.videoWidth * sc) / 2, offY = vr.top + (vr.height - v.videoHeight * sc) / 2;
    var sx = Math.max(0, (gr.left - offX) / sc), sy = Math.max(0, (gr.top - offY) / sc);
    var sw = Math.min(v.videoWidth - sx, gr.width / sc), sh = Math.min(v.videoHeight - sy, gr.height / sc);
    var k = Math.min(1, 1000 / sw);
    cv.width = Math.round(sw * k); cv.height = Math.round(sh * k);
    cx.drawImage(v, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
    cvg.width = cv.width; cvg.height = cv.height; cxg.filter = "grayscale(1)"; cxg.drawImage(cv, 0, 0);
    clean(cv);
    return { k: k, sx: sx, sy: sy, sc: sc, offX: offX, offY: offY };
  }

  // 読み取りやすく整える：白黒の2色にする（明るさの境目は自動で決める）→ 暗い背景なら反転 → 枠線・罫線（長い直線）を消す
  function clean(c) {
    var x = c.getContext("2d", { willReadFrequently: true }), W = c.width, H = c.height;
    if (!W || !H) return;
    var im = x.getImageData(0, 0, W, H), d = im.data, n = W * H, g = new Uint8Array(n), hist = new Array(256).fill(0), i;
    for (i = 0; i < n; i++) { var y = (d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114) | 0; g[i] = y; hist[y]++; }
    // 大津の方法で、白と黒の境目を決める
    var sum = 0, sumB = 0, wB = 0, best = 0, th = 128;
    for (i = 0; i < 256; i++) sum += i * hist[i];
    for (i = 0; i < 256; i++) {
      wB += hist[i]; if (!wB) continue; var wF = n - wB; if (!wF) break;
      sumB += i * hist[i]; var mB = sumB / wB, mF = (sum - sumB) / wF, v = wB * wF * (mB - mF) * (mB - mF);
      if (v > best) { best = v; th = i; }
    }
    var b = new Uint8Array(n), dark = 0; // 1 = 文字（黒）
    for (i = 0; i < n; i++) { b[i] = g[i] <= th ? 1 : 0; dark += b[i]; }
    if (dark > n * 0.5) for (i = 0; i < n; i++) b[i] = 1 - b[i]; // 暗い背景に明るい文字 → 反転
    // 横に長い線（幅の45%以上）と、縦に長い線（高さの75%以上）を消す
    var r, k, run;
    for (r = 0; r < H; r++) { run = 0; for (k = 0; k <= W; k++) { if (k < W && b[r * W + k]) run++; else { if (run > W * 0.45) for (var q = k - run; q < k; q++) b[r * W + q] = 2; run = 0; } } }
    for (k = 0; k < W; k++) { run = 0; for (r = 0; r <= H; r++) { if (r < H && b[r * W + k] === 1) run++; else { if (run > H * 0.75) for (var q2 = r - run; q2 < r; q2++) b[q2 * W + k] = 2; run = 0; } } }
    for (i = 0; i < n; i++) { var o = b[i] === 1 ? 0 : 255; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = o; d[i * 4 + 3] = 255; }
    x.putImageData(im, 0, 0);
  }

  function toLines(data) {
    var out = [];
    (data && data.blocks || []).forEach(function (b) { (b.paragraphs || []).forEach(function (p) { (p.lines || []).forEach(function (l) {
      out.push({ words: (l.words || []).filter(function (w) { return w.confidence > 30; }).map(function (w) { return { text: w.text, bbox: w.bbox, symbols: (w.symbols || []).map(function (s) { return { text: s.text, bbox: s.bbox }; }) }; }) });
    }); }); });
    return out;
  }

  // 小さく上に書いたセントが読み崩れたとき：その部分だけ拡大して、数字だけを読む設定で読み直す
  var cv2 = document.createElement("canvas"), cx2 = cv2.getContext("2d");
  function refine(worker, src, r) {
    if (!r || !r.pending || !r.centsBox) return Promise.resolve(r);
    return refineBox(worker, src, r, r.centsBox).then(function (rr) {
      return rr.pending && r.centsBox2 ? refineBox(worker, src, rr, r.centsBox2) : rr;
    });
  }
  function refineBox(worker, src, r, b) {
    var pw = (b.x1 - b.x0) * 0.25, ph = (b.y1 - b.y0) * 0.25;
    var x = Math.max(0, b.x0 - pw), y = Math.max(0, b.y0 - ph), w = Math.min(src.width - x, b.x1 - b.x0 + pw * 2), hh = Math.min(src.height - y, b.y1 - b.y0 + ph * 2);
    if (w < 2 || hh < 2) return Promise.resolve(r);
    var k = Math.max(1, 110 / hh);
    cv2.width = Math.round(w * k) + 40; cv2.height = Math.round(hh * k) + 40;
    cx2.fillStyle = "#fff"; cx2.fillRect(0, 0, cv2.width, cv2.height);
    cx2.drawImage(src, x, y, w, hh, 20, 20, w * k, hh * k);
    return worker.setParameters({ tessedit_char_whitelist: "0123456789", tessedit_pageseg_mode: "7" })
      .then(function () { return worker.recognize(cv2); })
      .then(function (res) {
        var d = (res.data.text || "").replace(/\D/g, "");
        if (d.length === 2) { r.usd = Math.round((r.dollars + +d / 100) * 100) / 100; r.sure = true; r.pending = false; }
        return r;
      }, function () { return r; });
  }

  // 1枚の画像から値段を読む：まず「ひとかたまりの文章」として読み（値札の枠線があっても読める）、
  // 金額が見つからなければ「ばらばらの文字」として読み直す。最後に、小さいセントを拡大して読み直す
  // srcs：読む画像の一覧（整えた画像、整える前の画像の順）。金額が決まったら、そこで終わる
  function readPrice(worker, srcs) {
    srcs = [].concat(srcs);
    var i = 0, fallback = null;
    function next() {
      if (i >= srcs.length) return Promise.resolve(fallback);
      var s = srcs[i++];
      return readOne(worker, s).then(function (r) {
        if (r && !r.pending) return r;
        if (r && !fallback) fallback = r;
        return next();
      });
    }
    return next();
  }
  function readOne(worker, src) {
    function tryMode(psm) {
      return worker.setParameters({ tessedit_pageseg_mode: psm, tessedit_char_whitelist: "" })
        .then(function () { return worker.recognize(src, {}, { blocks: true }); })
        .then(function (res) { return window.TripPrice ? window.TripPrice.parse(toLines(res.data)) : null; });
    }
    return tryMode("6").then(function (r) { return r || tryMode("11"); }).then(function (r) { return refine(worker, src, r); });
  }

  function loop() {
    if (!cam.on || !cam.worker) return;
    if (document.hidden) { setTimeout(loop, 500); return; }
    var g = grab();
    if (!g) { setTimeout(loop, 300); return; }
    readPrice(cam.worker, [cv, cvg]).then(function (r) { if (cam.on) show(r, g); }).catch(function () { /* 1回の失敗は無視して続ける */ }).then(function () { if (cam.on) setTimeout(loop, 120); });
  }

  // 同じ結果が2回続いたら表示を変える（ちらつき防止）
  function show(r, g) {
    var key = r ? [r.usd, r.alt, r.unit, r.multi && r.multi.qty].join("|") : "";
    if (key === cam.last) cam.same++; else { cam.last = key; cam.same = 1; }
    var tag = document.getElementById("fxtag"), use = document.getElementById("fxuse");
    if (!r) {
      if (cam.same >= 4) { msg("値札の数字を、枠の中に大きく映してください"); if (tag) tag.hidden = true; if (use) use.disabled = true; cam.shown = null; }
      return;
    }
    if (cam.same < 2 && cam.shown) return;
    cam.shown = r;
    var main = r.multi ? r.multi.total : r.usd;
    var line = r.pending
      ? '<div class="fxbig">$' + r.dollars + ".?? → <b>約" + (yen(r.dollars) || 0).toLocaleString("ja-JP") + "〜" + (yen(r.dollars + 0.99) || 0).toLocaleString("ja-JP") + "円</b></div>"
      : '<div class="fxbig">' + esc(usdText(main)) + " → <b>" + esc(yenText(main)) + "</b></div>";
    if (r.pending) r.why = "セント（小さい数字）が読み取れませんでした。もう少し近づけてください";
    var sub = [];
    if (r.multi) sub.push(r.multi.qty + "個で " + usdText(r.multi.total) + "（1個あたり " + usdText(Math.round(r.multi.total / r.multi.qty * 100) / 100) + " → " + yenText(r.multi.total / r.multi.qty) + "）");
    if (r.unit === "lb") sub.push("1ポンド（約454g）あたりの値段です");
    else if (r.unit === "oz") sub.push("1オンス（約28g）あたりの値段です");
    else if (r.unit === "ea") sub.push("1個あたりの値段です");
    if (r.card) sub.push("会員カードが必要な値段かもしれません");
    if (r.alt != null) sub.push('<span class="fxalt">' + esc(usdText(r.alt)) + "なら " + esc(yenText(r.alt)) + "</span>（小数点が読み取れず、どちらか決められませんでした）");
    sub.push('<span class="muted">' + esc(r.why) + (r.sure ? "" : "・目安") + "</span>");
    msg(line + '<div class="fxsub">' + sub.join("<br>") + "</div>");
    if (use) use.disabled = !!r.pending;
    // 値札の上に、円を重ねて出す
    if (tag && r.bbox) {
      var x = g.offX + (g.sx + r.bbox.x0 / g.k) * g.sc, y = g.offY + (g.sy + r.bbox.y0 / g.k) * g.sc;
      var w = (r.bbox.x1 - r.bbox.x0) / g.k * g.sc;
      tag.textContent = r.pending ? "約" + (yen(r.dollars) || 0).toLocaleString("ja-JP") + "円〜" : yenText(main);
      tag.style.left = Math.max(4, Math.min(window.innerWidth - 150, x + w / 2 - 70)) + "px";
      tag.style.top = Math.max(4, y - 44) + "px";
      tag.hidden = false;
    }
  }

  document.addEventListener("visibilitychange", function () { if (document.hidden && cam.on) closeCam(); });

  window.TripFx = { html: html, bind: bind, closeCam: closeCam, readPrice: readPrice, clean: clean };
})();
