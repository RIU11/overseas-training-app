// 英語：日本語を入力すると自動で英語に翻訳（Google翻訳のような操作）、読み上げ、相手に見せる大きな画面、よく使う英語カード
(function () {
  "use strict";
  var CARDS = window.TRIP_CARDS || [];
  var view = document.getElementById("view");
  var SLOW_KEY = "trip:slow";

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function loadSlow() { try { return localStorage.getItem(SLOW_KEY) === "1"; } catch (e) { return false; } }
  function saveSlow(v) { try { localStorage.setItem(SLOW_KEY, v ? "1" : "0"); } catch (e) { /* 保存できない環境では無視 */ } }

  var state = { text: "", res: null, slow: loadSlow() };

  // スピーカーのアイコン
  var ICON_SPEAKER = '<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" stroke="currentColor" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" stroke-linejoin="round"/><path d="M16 8.5a5 5 0 0 1 0 7M18.8 5.8a9 9 0 0 1 0 12.4" fill="none" stroke-width="2" stroke-linecap="round"/></svg>';

  /* ---------- 文字の正規化（日本語の入力と、カードの日本語を比べるため） ---------- */
  function fold(s) {
    var out = "";
    s = String(s);
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i);
      if (c.normalize) c = c.normalize("NFKC");
      c = c.toLowerCase();
      for (var j = 0; j < c.length; j++) {
        var ch = c.charAt(j), code = ch.charCodeAt(0);
        if (code >= 0x30A1 && code <= 0x30F6) ch = String.fromCharCode(code - 0x60); // カタカナ→ひらがな
        if (/[\s・\-、。,，.?？!！()（）「」『』:：]/.test(ch)) continue;
        out += ch;
      }
    }
    return out;
  }
  // 「〜ください」「〜です」など、どの文にも出てくる2文字は、似ているかの判断から外す
  var STOP = {};
  ["くだ", "ださ", "さい", "てく", "いま", "ます", "まし", "した", "です", "すか", "ませ", "せん", "ので", "いで", "てい", "いた"].forEach(function (g) { STOP[g] = 1; });
  function bigrams(f) { var o = {}, n = 0; for (var i = 0; i < f.length - 1; i++) { var g = f.substr(i, 2); if (!STOP[g] && !o[g]) { o[g] = 1; n++; } } return { set: o, n: n }; }

  var INDEX = [];
  CARDS.forEach(function (c, ci) {
    c.items.forEach(function (it, i) { var f = fold(it.ja); INDEX.push({ ci: ci, i: i, f: f, b: bigrams(f) }); });
  });

  // 入力に近いカードを探す（通信なしで使える）
  function nearCards(q) {
    var f = fold(q);
    if (f.length < 2) return [];
    var qb = bigrams(f), res = [];
    INDEX.forEach(function (e) {
      var inter = 0;
      for (var g in qb.set) if (e.b.set[g]) inter++;
      var dice = (qb.n + e.b.n) ? 2 * inter / (qb.n + e.b.n) : 0;
      // カードの言葉の大部分が、入力の中に入っている場合（長い文の一部分に当てはまるカード）
      if (e.b.n >= 3 && inter / e.b.n >= 0.6) dice = Math.max(dice, 0.8 * inter / e.b.n);
      if (e.f.indexOf(f) >= 0 || (f.indexOf(e.f) >= 0 && e.f.length >= 4)) dice = Math.max(dice, 0.9);
      if (dice >= 0.34) res.push({ e: e, s: dice });
    });
    res.sort(function (a, b) { return b.s - a.s; });
    return res.slice(0, 4).map(function (r) { return r.e; });
  }

  // カードの日本語と（記号・かな・全角半角の違いを除いて）同じ文なら、通信せずにカードの英語を使う
  function exactCard(text) {
    var f = fold(text);
    if (!f) return null;
    for (var k = 0; k < INDEX.length; k++) if (INDEX[k].f === f) return CARDS[INDEX[k].ci].items[INDEX[k].i];
    return null;
  }

  /* ---------- 読み上げ ---------- */
  var voice = null;
  function pickVoice() {
    if (!("speechSynthesis" in window)) return;
    var vs = speechSynthesis.getVoices().filter(function (v) { return /^en[-_]US/i.test(v.lang); });
    if (!vs.length) vs = speechSynthesis.getVoices().filter(function (v) { return /^en/i.test(v.lang); });
    var pref = /Google US English|Samantha|Aria|Jenny|Zira|Alex|Ava/i;
    voice = vs.filter(function (v) { return pref.test(v.name); })[0] || vs[0] || null;
  }
  if ("speechSynthesis" in window) { pickVoice(); try { speechSynthesis.addEventListener("voiceschanged", pickVoice); } catch (e) { /* 無視 */ } }

  var toastTimer = null;
  function toast(msg) {
    var t = document.getElementById("toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("on");
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove("on"); }, 2400);
  }

  var speakingBtn = null;
  function say(text, btn) {
    if (!("speechSynthesis" in window)) { toast("この端末では、読み上げが使えません"); return; }
    try {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US";
      u.rate = state.slow ? 0.6 : 0.95;
      if (voice) u.voice = voice;
      if (speakingBtn) speakingBtn.classList.remove("speaking");
      speakingBtn = btn || null;
      if (btn) {
        btn.classList.add("speaking");
        var stop = function () { btn.classList.remove("speaking"); };
        u.onend = stop; u.onerror = stop;
      }
      speechSynthesis.speak(u);
    } catch (e) { toast("読み上げに失敗しました"); }
  }

  function copyText(text, btn) {
    var orig = btn ? btn.textContent : "";
    var done = function (ok) { if (btn) { btn.textContent = ok ? "コピーしました" : "コピーできません"; setTimeout(function () { btn.textContent = orig; }, 1600); } };
    try { navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); }); } catch (e) { done(false); }
  }

  /* ---------- 翻訳（外部サービス MyMemory。入力した文はそこへ送られる） ---------- */
  function decode(s) { var t = document.createElement("textarea"); t.innerHTML = s; return t.value; }
  function translate(text, from, to) {
    var url = "https://api.mymemory.translated.net/get?q=" + encodeURIComponent(text) + "&langpair=" + from + "|" + to;
    return fetch(url, { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("http " + r.status);
      return r.json();
    }).then(function (j) {
      var t = j && j.responseData && j.responseData.translatedText;
      if (!t || String(j.responseStatus) !== "200") throw new Error("status " + (j && j.responseStatus));
      if (/MYMEMORY WARNING/i.test(t)) throw new Error("quota");
      return decode(t);
    });
  }

  // 入力が止まってから翻訳する（無料サービスの1日の上限を使いすぎないため）。古い結果は捨てる
  var seq = 0, cache = {}, trTimer = null, nearTimer = null;
  function schedule() {
    clearTimeout(trTimer);
    var text = state.text.trim();
    seq++;
    if (!text) { state.res = null; paintOut(); return; }
    if (cache[text]) { state.res = { en: cache[text], ja: text, back: "" }; paintOut(); return; }
    var card = exactCard(text);
    if (card) { state.res = { en: card.en, ja: text, back: "", card: true }; paintOut(); return; }
    state.res = { loading: true };
    paintOut();
    var mine = seq;
    trTimer = setTimeout(function () { runTranslate(text, mine); }, 800);
  }

  function runTranslate(text, mine) {
    if (navigator.onLine === false) { state.res = { err: "net" }; paintOut(); return; }
    translate(text, "ja", "en").then(function (en) {
      if (mine !== seq) return;
      cache[text] = en;
      state.res = { en: en, ja: text, back: "" };
      paintOut();
    }, function (err) {
      if (mine !== seq) return;
      state.res = { err: String(err && err.message) === "quota" ? "quota" : "net" };
      paintOut();
    });
  }

  // 英語を日本語に戻して、意味が合っているか確認する（押したときだけ。無料サービスの上限を節約）
  function backTranslate() {
    var r = state.res;
    if (!r || !r.en) return;
    r.backLoading = true; paintOut();
    var en = r.en;
    translate(en, "en", "ja").then(function (ja) {
      if (state.res && state.res.en === en) { state.res.back = ja; state.res.backLoading = false; paintOut(); }
    }, function () {
      if (state.res && state.res.en === en) { state.res.backLoading = false; state.res.backErr = true; paintOut(); }
    });
  }

  /* ---------- 画面の部品 ---------- */
  function btns(src) {
    return '<div class="qbtn"><button type="button" class="btn" data-act="say" data-src="' + src + '">読み上げ</button>' +
      '<button type="button" class="btn" data-act="show" data-src="' + src + '">相手に見せる</button>' +
      '<button type="button" class="btn" data-act="copy" data-src="' + src + '">コピー</button></div>';
  }

  function outHtml() {
    var r = state.res;
    if (!r) return '<div class="tr-ph">ここに英語が表示されます</div>';
    if (r.loading) return '<div class="tr-ph">翻訳しています…</div>';
    if (r.err) {
      return '<p class="small tr-err">' + (r.err === "quota" ? "翻訳サービスの1日の利用上限に達しました。下のカードから探してください。" : "翻訳できませんでした。ネットにつながっているか確認してください（つながらない場所では、下のカードを使えます）。") + "</p>";
    }
    return '<div class="tr-en">' + esc(r.en) + "</div>" +
      '<div class="tr-tools">' +
      '<button type="button" class="ic" data-act="say" data-src="tr" aria-label="英語を読み上げる" title="読み上げ">' + ICON_SPEAKER + "</button>" +
      '<button type="button" class="chipbtn' + (state.slow ? " on" : "") + '" data-act="slow" aria-pressed="' + (state.slow ? "true" : "false") + '">ゆっくり</button>' +
      '<button type="button" class="chipbtn" data-act="copy" data-src="tr">コピー</button>' +
      '<button type="button" class="chipbtn" data-act="show" data-src="tr">見せる</button></div>' +
      (r.card ? '<p class="muted small">よく使う英語カードの英語です。</p>' : "") +
      (r.back ? '<p class="muted small">日本語に戻すと：' + esc(r.back) + "</p>"
        : r.backLoading ? '<p class="muted small">確認しています…</p>'
        : r.backErr ? '<p class="muted small">日本語に戻せませんでした。</p>'
        : r.card ? "" : '<p class="small"><a href="#" data-act="back">日本語に戻して確認する</a></p>') +
      '<p class="muted small">機械翻訳です。体調・安全・お金など大事なことは、カードか、先生・現地スタッフに確認してください。</p>';
  }

  function nearHtml() {
    var n = nearCards(state.text);
    if (!n.length) return "";
    return '<div class="muted small tr-h">近いカード（通信なしで使えます）</div>' + n.map(function (e) {
      var it = CARDS[e.ci].items[e.i];
      return '<div class="cdrow"><div class="cd-en">' + esc(it.en) + '</div><div class="muted small">' + esc(it.ja) + "</div>" + btns("card:" + e.ci + ":" + e.i) + "</div>";
    }).join("");
  }

  function paintOut() { var el = document.getElementById("tr-out"); if (el) el.innerHTML = outHtml(); }
  function paintNear() { var el = document.getElementById("tr-near"); if (el) el.innerHTML = nearHtml(); }
  function syncSlow() {
    [].forEach.call(document.querySelectorAll("[data-speed]"), function (b) { b.classList.toggle("on", (b.getAttribute("data-speed") === "1") === state.slow); });
    [].forEach.call(document.querySelectorAll("[data-act=slow]"), function (b) { b.classList.toggle("on", state.slow); b.setAttribute("aria-pressed", state.slow ? "true" : "false"); });
  }

  function html() {
    var tr = '<div class="card" id="en-tr"><h3>英語にして伝える</h3>' +
      '<div class="tr-box"><div class="tr-lang">日本語</div>' +
      '<textarea id="tr-in" maxlength="200" rows="3" placeholder="日本語を入力（例：トイレはどこですか？）" aria-label="翻訳したい日本語">' + esc(state.text) + "</textarea>" +
      '<button type="button" class="tr-clear" data-act="clear" aria-label="入力を消す">✕</button></div>' +
      '<div class="tr-box tr-outbox"><div class="tr-lang">English</div><div id="tr-out">' + outHtml() + "</div></div>" +
      '<div id="tr-near">' + nearHtml() + "</div>" +
      '<p class="muted small tr-priv">入力した文は、翻訳のために外部の翻訳サービス（MyMemory）に送られます。名前・住所・電話番号などは入れないでください。</p></div>';
    var list = '<div class="card" id="en-cards"><h3>よく使う英語カード</h3>' +
      '<div class="seg" id="speedSeg"><button type="button" data-speed="0" class="' + (state.slow ? "" : "on") + '">ふつうの速さ</button><button type="button" data-speed="1" class="' + (state.slow ? "on" : "") + '">ゆっくり</button></div>' +
      '<p class="muted small">カードの「読み上げ」で発音を聞けます。「相手に見せる」で、大きな画面になります。</p></div>' +
      CARDS.map(function (c, ci) {
        return '<details class="card cdcat" id="cdc-' + ci + '"' + (c.open ? " open" : "") + "><summary>" + esc(c.h) + ' <span class="muted small">(' + c.items.length + ")</span></summary>" +
          (c.note ? '<p class="muted small cdnote">' + esc(c.note) + "</p>" : "") +
          c.items.map(function (it, i) {
            return '<div class="cdrow" id="cd-' + ci + "-" + i + '"><div class="cd-en">' + esc(it.en) + '</div><div class="muted small">' + esc(it.ja) + "</div>" +
              (it.n ? '<div class="small cdn">' + esc(it.n) + "</div>" : "") + btns("card:" + ci + ":" + i) + "</div>";
          }).join("") + "</details>";
      }).join("");
    return tr + list;
  }

  /* ---------- 相手に見せる画面 ---------- */
  var sc, scList = [], scIdx = 0, scOpen = false, wake = null;

  function resolve(src) {
    if (src === "tr") return state.res && state.res.en ? { en: state.res.en, ja: state.res.ja } : null;
    var p = src.split(":");
    var it = CARDS[+p[1]] && CARDS[+p[1]].items[+p[2]];
    return it ? { en: it.en, ja: it.ja, n: it.n } : null;
  }

  function paintShow() {
    var it = scList[scIdx];
    var en = sc.querySelector("#sc-en");
    en.textContent = it.en;
    en.className = "sc-en " + (it.en.length <= 28 ? "xl" : it.en.length <= 70 ? "lg" : "md");
    sc.querySelector("#sc-ja").textContent = it.ja || "";
    sc.querySelector("#sc-note").textContent = it.n || "";
    sc.querySelector("#sc-prev").disabled = scIdx <= 0;
    sc.querySelector("#sc-next").disabled = scIdx >= scList.length - 1;
    sc.querySelector("#sc-nav").style.visibility = scList.length > 1 ? "visible" : "hidden";
    sc.querySelector("#sc-slow").textContent = state.slow ? "ゆっくり：入" : "ゆっくり";
    sc.querySelector("#sc-slow").classList.toggle("on", state.slow);
  }

  function requestWake() {
    try { if (navigator.wakeLock) navigator.wakeLock.request("screen").then(function (l) { wake = l; }, function () { /* 無視 */ }); } catch (e) { /* 無視 */ }
  }
  function releaseWake() { try { if (wake) { wake.release(); wake = null; } } catch (e) { /* 無視 */ } }

  function openShow(list, idx) {
    scList = list; scIdx = idx; scOpen = true;
    sc.classList.add("open");
    document.body.style.overflow = "hidden";
    try { history.pushState({ show: 1 }, ""); } catch (e) { /* 履歴が使えない環境では無視 */ }
    paintShow(); requestWake();
  }
  function closeShow(fromPop) {
    if (!scOpen) return;
    scOpen = false;
    sc.classList.remove("open");
    document.body.style.overflow = "";
    releaseWake();
    try { speechSynthesis.cancel(); } catch (e) { /* 無視 */ }
    if (!fromPop) { try { if (history.state && history.state.show) history.back(); } catch (e) { /* 無視 */ } }
  }

  function buildShow() {
    sc = document.createElement("div");
    sc.id = "showcard";
    sc.setAttribute("role", "dialog"); sc.setAttribute("aria-modal", "true"); sc.setAttribute("aria-label", "相手に見せる英語");
    sc.innerHTML = '<button type="button" class="sc-x" id="sc-x" aria-label="閉じる">✕</button>' +
      '<div class="sc-body"><div class="sc-en xl" id="sc-en"></div><div class="sc-ja" id="sc-ja"></div><div class="sc-note" id="sc-note"></div></div>' +
      '<div class="sc-bar"><div class="sc-nav" id="sc-nav"><button type="button" id="sc-prev" aria-label="前のカード">◀</button><button type="button" id="sc-next" aria-label="次のカード">▶</button></div>' +
      '<button type="button" class="sc-say" id="sc-say">読み上げ</button><button type="button" id="sc-slow">ゆっくり</button></div>';
    document.body.appendChild(sc);
    sc.querySelector("#sc-x").addEventListener("click", function () { closeShow(false); });
    sc.querySelector("#sc-say").addEventListener("click", function () { say(scList[scIdx].en); });
    sc.querySelector("#sc-slow").addEventListener("click", function () { state.slow = !state.slow; saveSlow(state.slow); paintShow(); syncSlow(); say(scList[scIdx].en); });
    sc.querySelector("#sc-prev").addEventListener("click", function () { if (scIdx > 0) { scIdx--; paintShow(); } });
    sc.querySelector("#sc-next").addEventListener("click", function () { if (scIdx < scList.length - 1) { scIdx++; paintShow(); } });
    window.addEventListener("popstate", function () { if (scOpen) closeShow(true); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && scOpen) closeShow(false); });
    document.addEventListener("visibilitychange", function () { if (scOpen && !document.hidden) requestWake(); });
  }

  /* ---------- 操作 ---------- */
  function onClick(e) {
    var sp = e.target.closest("[data-speed]");
    if (sp) { state.slow = sp.getAttribute("data-speed") === "1"; saveSlow(state.slow); syncSlow(); return; }
    var b = e.target.closest("[data-act]");
    if (!b) return;
    var act = b.getAttribute("data-act"), src = b.getAttribute("data-src");
    if (act === "slow") { state.slow = !state.slow; saveSlow(state.slow); syncSlow(); return; }
    if (act === "back") { e.preventDefault(); backTranslate(); return; }
    if (act === "clear") {
      state.text = ""; state.res = null; seq++; clearTimeout(trTimer);
      var ta = document.getElementById("tr-in"); if (ta) { ta.value = ""; ta.focus(); }
      paintNear(); paintOut();
      return;
    }
    var it = src ? resolve(src) : null;
    if (!it) return;
    if (act === "say") say(it.en, b);
    else if (act === "copy") copyText(it.en, b);
    else if (act === "show") {
      if (src === "tr") { openShow([it], 0); return; }
      var p = src.split(":"), ci = +p[1];
      openShow(CARDS[ci].items.map(function (x) { return { en: x.en, ja: x.ja, n: x.n }; }), +p[2]);
    }
  }

  function onInput(e) {
    if (e.target.id !== "tr-in") return;
    state.text = e.target.value;
    clearTimeout(nearTimer);
    nearTimer = setTimeout(paintNear, 150);
    if (e.isComposing) return; // 変換の途中は翻訳しない（確定してから）
    schedule();
  }
  function onCompositionEnd(e) {
    if (e.target.id !== "tr-in") return;
    state.text = e.target.value;
    schedule();
  }

  function init() {
    buildShow();
    view.addEventListener("click", onClick);
    view.addEventListener("input", onInput);
    view.addEventListener("compositionend", onCompositionEnd);
  }
  init();

  window.TripEnglish = { html: html };
})();
