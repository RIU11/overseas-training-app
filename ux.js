// 使いやすさのための部品：表示の設定（文字サイズ・背景・高コントラスト）、オフライン表示、初回ガイド、ホームの時計・天気・ショートカット。
(function () {
  "use strict";
  var VERSION = "2026-10-28 v14";
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem("trip:" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem("trip:" + k, JSON.stringify(v)); } catch (e) { /* 保存できない環境では無視 */ } }
  };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

  /* ---------- 表示の設定（屋外で見やすくする） ---------- */
  function ui() { var u = store.get("ui", {}) || {}; return { fs: u.fs || 1, bg: u.bg || "normal", hc: !!u.hc }; }
  function apply() {
    var u = ui(), r = document.documentElement;
    r.style.setProperty("--fs", u.fs);
    r.setAttribute("data-bg", u.bg);
    r.setAttribute("data-hc", u.hc ? "1" : "0");
    if (window.TripBg) window.TripBg.refresh();
  }
  apply();

  var OPTS = {
    fs: [["1", "標準"], ["1.15", "大"], ["1.3", "特大"]],
    bg: [["normal", "ふつう"], ["dim", "暗く"], ["still", "止める"], ["off", "なし"]],
    hc: [["0", "ふつう"], ["1", "高コントラスト"]]
  };
  function seg(key) {
    var u = ui(), cur = String(key === "hc" ? (u.hc ? "1" : "0") : u[key]);
    return '<div class="seg" data-ui="' + key + '">' + OPTS[key].map(function (o) {
      return '<button type="button" data-v="' + o[0] + '" class="' + (cur === o[0] ? "on" : "") + '">' + o[1] + "</button>";
    }).join("") + "</div>";
  }
  function settingsHtml() {
    return '<div class="card" id="tool-view"><h3>表示の設定</h3><div class="muted small">屋外の明るい場所で見づらいときに使います。この端末だけに保存されます。</div>' +
      '<label class="lb">文字の大きさ</label>' + seg("fs") +
      '<label class="lb">背景の写真</label>' + seg("bg") +
      '<label class="lb">見やすさ（文字と背景のコントラスト）</label>' + seg("hc") +
      '<div style="margin-top:12px"><button class="btn" type="button" data-guide="1">📘 使い方ガイドをもう一度見る</button></div>' +
      '<p class="muted small" style="margin:10px 0 0">アプリの更新：' + VERSION + "</p></div>";
  }
  function bindSettings() {
    var card = document.getElementById("tool-view"); if (!card) return;
    card.addEventListener("click", function (e) {
      if (e.target.closest("[data-guide]")) { guide(); return; }
      var b = e.target.closest(".seg button"); if (!b) return;
      var key = b.parentNode.getAttribute("data-ui"), v = b.getAttribute("data-v"), u = ui();
      if (key === "fs") u.fs = parseFloat(v); else if (key === "bg") u.bg = v; else u.hc = v === "1";
      store.set("ui", u); apply();
      [].forEach.call(b.parentNode.children, function (c) { c.classList.toggle("on", c === b); });
    });
  }

  /* ---------- オフライン表示 ---------- */
  var pill = document.createElement("div");
  pill.id = "netpill"; pill.hidden = true; pill.setAttribute("role", "status");
  pill.textContent = "📴 オフライン中（保存済みの情報を表示しています）";
  function net() { pill.hidden = navigator.onLine !== false; }
  document.body.appendChild(pill);
  window.addEventListener("online", net); window.addEventListener("offline", net); net();

  /* ---------- 初回ガイド ---------- */
  function standalone() { return (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true; }
  function steps() {
    return [
      { t: "① ホーム画面に追加する", h: standalone() ? "<p>✅ すでにホーム画面から開いています。</p>" :
        "<p>アプリのように、ホーム画面のアイコンから開けるようにします。</p>" +
        "<p><b>iPhone（Safari）</b><br>画面下の共有ボタン → 「ホーム画面に追加」</p>" +
        "<p><b>Android（Chrome）</b><br>右上の︙ → 「ホーム画面に追加」または「アプリをインストール」</p>" },
      { t: "② 電波なしで開けるか確認", h: "<p>出発前に、ネットにつながった状態で一度ぜんぶのページを開いてください。そのあと機内モードにして、アプリを開き直し、日程や持ち物が見られれば大丈夫です。</p>" +
        '<p class="muted small">電波がなくても見られるのは、日程・準備・ルール・ホテル・英語カードなど。翻訳と地図、お店の最新取得には電波が必要です。</p>' },
      { t: "③ 現在地を許可する", h: "<p>次に「現在地を使いますか？」と出ます。OKを押して「許可」にすると、現在地が地図に出て、近くの予定の場所のお店が自動で選ばれます。</p>" +
        '<p class="muted small">位置情報は、この端末の中だけで使われます。</p>' }
    ];
  }
  function guide(done) {
    if (document.getElementById("guide")) return;
    var list = steps(), i = 0, el = document.createElement("div");
    el.id = "guide";
    function draw() {
      var s = list[i], last = i === list.length - 1;
      el.innerHTML = '<div class="lbox" role="dialog" aria-modal="true" aria-label="使い方ガイド"><div class="muted small">使い方ガイド ' + (i + 1) + " / " + list.length + "</div>" +
        "<h3>" + s.t + "</h3>" + s.h +
        '<div class="lbtn">' + (i > 0 ? '<button class="btn" type="button" data-g="prev">戻る</button>' : '<button class="btn" type="button" data-g="skip">あとで</button>') +
        '<button class="btn primary" type="button" data-g="' + (last ? "end" : "next") + '">' + (last ? "はじめる" : "次へ") + "</button></div></div>";
    }
    function close() { store.set("guideSeen", true); el.remove(); if (typeof done === "function") done(); }
    el.addEventListener("click", function (e) {
      var b = e.target.closest("[data-g]"); if (!b) return;
      var a = b.getAttribute("data-g");
      if (a === "next") { i++; draw(); } else if (a === "prev") { i--; draw(); } else close();
    });
    draw(); document.body.appendChild(el);
  }
  // 初めて開いたときだけ出す。見たあと（または見ているとき以外）は、すぐ done を呼ぶ
  function firstRun(done) {
    if (store.get("guideSeen", false)) { done(); return; }
    setTimeout(function () { guide(done); }, 500);
  }

  /* ---------- ホーム：ショートカット・時計・天気 ---------- */
  var WX = { 0: ["☀️", "快晴"], 1: ["🌤", "晴れ"], 2: ["⛅", "薄曇り"], 3: ["☁️", "くもり"], 45: ["🌫", "霧"], 48: ["🌫", "霧"],
    51: ["🌦", "霧雨"], 53: ["🌦", "霧雨"], 55: ["🌦", "霧雨"], 56: ["🌧", "凍る霧雨"], 57: ["🌧", "凍る霧雨"], 61: ["🌧", "雨"], 63: ["🌧", "雨"], 65: ["🌧", "強い雨"],
    66: ["🌧", "凍る雨"], 67: ["🌧", "凍る雨"], 71: ["🌨", "雪"], 73: ["🌨", "雪"], 75: ["🌨", "大雪"], 77: ["🌨", "雪"], 80: ["🌦", "にわか雨"], 81: ["🌦", "にわか雨"],
    82: ["🌧", "激しいにわか雨"], 85: ["🌨", "にわか雪"], 86: ["🌨", "にわか雪"], 95: ["⛈", "雷雨"], 96: ["⛈", "雷雨"], 99: ["⛈", "雷雨"] };
  function outfit(tmax) {
    return tmax < 10 ? "厚手のコートと防寒具が必要です。" : tmax < 16 ? "ジャケットやコートが欲しい気温です。" : tmax < 22 ? "薄手の上着があると安心です。" : "半袖に羽織れるものがあると安心です。";
  }

  function homeHtml() {
    return '<div class="quick">' +
      '<button type="button" data-goto="tool|en-tr"><span>🌐</span>英語翻訳</button>' +
      '<button type="button" data-goto="map"><span>🗺</span>地図・お店</button>' +
      '<button type="button" data-goto="tool|cdc-0"><span>🆘</span>緊急の英語</button>' +
      '<button type="button" data-goto="prep|mine"><span>🎒</span>持ち物</button></div>' +
      '<div class="card" id="nowcard"><div class="clocks"><div><div class="muted small">日本</div><b id="clk-jp">—</b></div><div><div class="muted small">現地（カリフォルニア）</div><b id="clk-us">—</b></div></div>' +
      '<div id="wx" class="wx muted small"></div></div>';
  }

  function clocks() {
    var a = document.getElementById("clk-jp"), b = document.getElementById("clk-us"); if (!a || !b) return;
    var f = function (tz) { return new Date().toLocaleString("ja-JP", { timeZone: tz, month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" }); };
    a.textContent = f("Asia/Tokyo"); b.textContent = f("America/Los_Angeles");
  }

  function targetDay() {
    var T = window.TRIP, SP = window.TRIP_SPOTS || [];
    if (!T || !SP.length) return null;
    var today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
    var d = T.days.filter(function (x) { return x.date === today; })[0] || T.days.filter(function (x) { return x.date > today; })[0];
    if (!d) return null;
    var sp = SP.filter(function (s) { return s.day === d.n; })[0];
    if (!sp) return null;
    var days = Math.round((Date.parse(d.date) - Date.parse(today)) / 86400000);
    return { d: d, sp: sp, days: days, isToday: d.date === today };
  }

  function weather() {
    var el = document.getElementById("wx"); if (!el) return;
    var t = targetDay();
    if (!t) { el.textContent = ""; return; }
    if (t.days > 15) { el.textContent = "🌤 天気予報は、出発の約2週間前から表示されます。"; return; }
    var key = "wx:" + t.d.date + ":" + t.sp.id, hit = store.get(key, null);
    var show = function (r) {
      var el2 = document.getElementById("wx"); if (!el2) return;
      var w = WX[r.code] || ["🌡", ""];
      el2.innerHTML = w[0] + " <b>" + (t.isToday ? "今日" : "Day " + t.d.n) + "（" + esc(t.d.label) + "）" + esc(t.sp.name) + "付近</b>　" + esc(w[1]) +
        "<br>最高 " + Math.round(r.max) + "°C ／ 最低 " + Math.round(r.min) + "°C　降水確率 " + (r.rain == null ? "—" : r.rain + "%") +
        "<br>" + outfit(r.max) + '<span class="muted small">（予報。外部の天気サービスから取得）</span>';
    };
    if (hit && Date.now() - hit.ts < 3 * 3600 * 1000) { show(hit.r); return; }
    el.textContent = "天気を取得しています…";
    var url = "https://api.open-meteo.com/v1/forecast?latitude=" + t.sp.lat + "&longitude=" + t.sp.lng +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&start_date=" + t.d.date + "&end_date=" + t.d.date;
    fetch(url).then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); }).then(function (j) {
      var d = j.daily; if (!d || !d.time || !d.time.length) throw new Error("nodata");
      var r = { code: d.weather_code[0], max: d.temperature_2m_max[0], min: d.temperature_2m_min[0], rain: d.precipitation_probability_max ? d.precipitation_probability_max[0] : null };
      store.set(key, { ts: Date.now(), r: r }); show(r);
    }).catch(function () {
      if (hit) { show(hit.r); return; }
      var e2 = document.getElementById("wx"); if (e2) e2.textContent = "天気を取得できませんでした（電波がないか、まだ予報が出ていません）。";
    });
  }

  var clk = null;
  function homeBind() {
    clocks(); weather();
    if (clk) clearInterval(clk);
    clk = setInterval(clocks, 20000);
  }

  window.TripUX = { settingsHtml: settingsHtml, bindSettings: bindSettings, guide: guide, firstRun: firstRun, homeHtml: homeHtml, homeBind: homeBind, version: VERSION };
})();
