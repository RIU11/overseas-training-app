// 使いやすさのための部品：表示の設定（文字サイズ・背景・高コントラスト）、オフライン表示、初回ガイド、ホームの時計・天気・ショートカット。
(function () {
  "use strict";
  var VERSION = "2026-10-28 v19";
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
      '<div style="margin-top:12px"><button class="btn" type="button" data-guide="1">使い方ガイドをもう一度見る</button></div>' +
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
  pill.textContent = "オフライン中（保存済みの情報を表示しています）";
  function net() { pill.hidden = navigator.onLine !== false; }
  document.body.appendChild(pill);
  window.addEventListener("online", net); window.addEventListener("offline", net); net();

  /* ---------- ホーム画面への追加 ---------- */
  function standalone() { return (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true; }
  function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); }

  // Android の Chrome などは、ページ側から「追加しますか？」の確認を出せる（その合図を、先に受け取っておく）
  var deferred = null;
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferred = e; });
  window.addEventListener("appinstalled", function () { deferred = null; store.set("installAsked", true); toast("ホーム画面に追加しました"); });

  function toast(msg) {
    var t = document.getElementById("toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("on");
    setTimeout(function () { t.classList.remove("on"); }, 2600);
  }

  var SHARE_ICON = '<svg class="shareic" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4M8 8l4-4 4 4M6 12H5a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1h-1"/></svg>';

  // ホーム画面に追加する案内。追加できる端末では、OKを押すとそのまま追加の確認が出る（iPhone は仕組み上、手順を案内するだけ）
  function installPrompt(done, force) {
    var fin = function () { if (typeof done === "function") done(); };
    if (document.getElementById("guide") || document.getElementById("install")) return;
    if (standalone()) { if (force) toast("すでにホーム画面から開いています"); fin(); return; }
    if (!force && store.get("installAsked", false)) { fin(); return; }
    var el = document.createElement("div");
    el.id = "install";
    var ios = isIOS(), can = !!deferred;
    function close(asked) { if (asked) store.set("installAsked", true); el.remove(); fin(); }
    function ask() {
      el.innerHTML = '<div class="lbox" role="dialog" aria-modal="true" aria-label="ホーム画面に追加"><h3>ホーム画面に追加しますか？</h3>' +
        "<p>アプリのように、ホーム画面のアイコンからすぐ開けます。電波のない場所でも、日程などが見られます。</p>" +
        (can ? "" : ios ? '<p class="muted small">iPhone は、アプリ側から自動で追加できません。OKを押すと、追加のしかたを案内します。</p>' : '<p class="muted small">この端末では、ブラウザのメニューから追加します。OKを押すと、追加のしかたを案内します。</p>') +
        '<div class="lbtn"><button class="btn" type="button" data-i="no">あとで</button><button class="btn primary" type="button" data-i="ok">OK</button></div></div>';
    }
    function howto() {
      el.innerHTML = '<div class="lbox" role="dialog" aria-modal="true" aria-label="追加のしかた"><h3>追加のしかた</h3>' +
        (ios ? "<ol class=\"howto\"><li>Safari で開いていることを確認します（他のアプリの中のブラウザでは追加できません）。</li>" +
          "<li>画面下の共有ボタン " + SHARE_ICON + " を押します。</li><li>メニューを下にずらして「<b>ホーム画面に追加</b>」を押します。</li><li>右上の「<b>追加</b>」を押します。</li></ol>"
          : "<ol class=\"howto\"><li>ブラウザの右上の「︙」メニューを開きます。</li><li>「<b>ホーム画面に追加</b>」または「<b>アプリをインストール</b>」を押します。</li><li>確認が出たら「<b>追加</b>」を押します。</li></ol>") +
        '<div class="lbtn"><button class="btn primary" type="button" data-i="end">わかった</button></div></div>';
    }
    el.addEventListener("click", function (e) {
      var b = e.target.closest("[data-i]"); if (!b) return;
      var a = b.getAttribute("data-i");
      if (a === "no") { close(true); return; }
      if (a === "end") { close(true); return; }
      if (can && deferred) { // そのまま追加の確認を出す
        var p = deferred; deferred = null; el.remove();
        try { p.prompt(); p.userChoice.then(function (c) { store.set("installAsked", true); if (c && c.outcome === "accepted") toast("ホーム画面に追加しています…"); fin(); }).catch(fin); } catch (er) { fin(); }
        return;
      }
      howto();
    });
    ask(); document.body.appendChild(el);
  }

  /* ---------- 使い方ガイド（メニュー・設定から、いつでも見られる） ---------- */
  function steps() {
    return [
      { t: "① 現在地を許可する", h: "<p>最初に「現在地を使いますか？」と出ます。OKを押して「許可」にすると、現在地が地図に出て、近くの予定の場所のお店が自動で選ばれます。</p>" +
        '<p class="muted small">位置情報は、この端末の中だけで使われます。許可していないときは、「地図」ページの「現在地を表示」から設定できます。</p>' },
      { t: "② ホーム画面に追加する", h: standalone() ? "<p>すでにホーム画面から開いています。</p>" :
        "<p>アプリのように、ホーム画面のアイコンから開けるようにします。</p>" +
        '<p><button class="btn primary" type="button" data-g="install">今すぐ追加する</button></p>' +
        "<p class=\"muted small\">iPhone（Safari）：共有ボタン → 「ホーム画面に追加」<br>Android（Chrome）：︙ → 「ホーム画面に追加」または「アプリをインストール」</p>" },
      { t: "③ 電波なしで開けるか確認", h: "<p>出発前に、ネットにつながった状態で一度ぜんぶのページを開いてください。そのあと機内モードにして、アプリを開き直し、日程や持ち物が見られれば大丈夫です。</p>" +
        '<p class="muted small">電波がなくても見られるのは、日程・準備・ルール・ホテル・英語カードなど。翻訳と地図、お店の最新取得には電波が必要です。</p>' }
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
        '<div class="lbtn">' + (i > 0 ? '<button class="btn" type="button" data-g="prev">戻る</button>' : "") +
        '<button class="btn primary" type="button" data-g="' + (last ? "end" : "next") + '">' + (last ? "閉じる" : "次へ") + "</button></div></div>";
    }
    function close() { el.remove(); if (typeof done === "function") done(); }
    el.addEventListener("click", function (e) {
      var b = e.target.closest("[data-g]"); if (!b) return;
      var a = b.getAttribute("data-g");
      if (a === "next") { i++; draw(); } else if (a === "prev") { i--; draw(); }
      else if (a === "install") { el.remove(); installPrompt(null, true); }
      else close();
    });
    draw(); document.body.appendChild(el);
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
      '<button type="button" data-goto="tool|en-tr"><span>' + TripIco.i("globe", 26) + '</span>英語翻訳</button>' +
      '<button type="button" data-goto="map"><span>' + TripIco.i("map", 26) + '</span>地図・お店</button>' +
      '<button type="button" data-goto="prep|mine"><span>' + TripIco.i("bag", 26) + '</span>持ち物</button></div>' +
      '<div class="card" id="nowcard"><div class="clocks"><div><div class="muted small">日本</div><b id="clk-jp">—</b></div><div><div class="muted small">現地（カリフォルニア）</div><b id="clk-us">—</b></div></div>' +
      '</div><div class="card" id="wxcard"><h3>現地の天気</h3><div id="wx2"></div></div>';
  }

  function clocks() {
    var a = document.getElementById("clk-jp"), b = document.getElementById("clk-us"); if (!a || !b) return;
    var f = function (tz) { return new Date().toLocaleString("ja-JP", { timeZone: tz, month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" }); };
    a.textContent = f("Asia/Tokyo"); b.textContent = f("America/Los_Angeles");
  }

  /* ---------- 天気：研修10日間の見通し／当日は時間ごと ----------
     Open-Meteo（無料・キー不要）。10日間は、各日の最初の行き先付近の予報を、開くたびに（1時間より古ければ）取り直す。
     予報が出ていない先の日は「予報まだ」と表示する（予報が出る範囲は約16日先まで）。
     研修当日は、その日の行き先ごとの時間ごとの気温と降水確率を出す。 */
  var wxSt = { mode: null, spot: 0, all: null, hr: {}, ts: 0 };

  function wxDays() { return (window.TRIP && window.TRIP.days) || []; }
  function wxSpots(n) { return (window.TRIP_SPOTS || []).filter(function (s) { return s.day === n; }); }
  function wxPlace(n) {
    if (n === 10) return { id: "itami", name: "伊丹空港付近", lat: 34.7855, lng: 135.4382 };
    return wxSpots(n)[0] || null;
  }
  function laDate() { return new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" }); }
  function laHour() { return +new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", hour12: false }) % 24; }
  function wxToday() { var t = laDate(); return wxDays().filter(function (d) { return d.date === t; })[0] || null; }

  // 取得して、保存した結果を使い回す（maxAge を過ぎたら取り直す。取れなければ古い保存分を出す）
  function wxGet(key, url, maxAge, cb) {
    var hit = store.get(key, null);
    if (hit && hit.d && Date.now() - hit.ts < maxAge) { cb(hit.d, hit.ts, false); return; }
    fetch(url).then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); }).then(function (j) {
      var ts = Date.now(); store.set(key, { ts: ts, d: j }); cb(j, ts, false);
    }).catch(function () { if (hit && hit.d) cb(hit.d, hit.ts, true); else cb(null, 0, true); });
  }
  function asList(j) { return Array.isArray(j) ? j : [j]; }

  function wxIcon(code, hour) {
    var w = WX[code] || ["🌡", ""];
    if (hour !== undefined && (hour < 6 || hour >= 19) && (code === 0 || code === 1)) return "🌙";
    return w[0];
  }
  function stamp(ts) { var d = new Date(ts); return (d.getMonth() + 1) + "/" + d.getDate() + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); }

  function wxAllHtml() {
    var days = wxDays(), today = laDate(), a = wxSt.all, firstIdx = -1, tmaxForHint = null;
    if (a && !a.ts) return '<p class="muted small">天気を取得できませんでした（電波がないか、まだ予報が出ていません）。</p>';
    var cells = days.map(function (d, i) {
      var r = a && a.rows ? a.rows[d.n] : null, isNow = d.date === today;
      if (!r && !a) return "";
      if (r && firstIdx < 0 && d.date >= today) { firstIdx = i; tmaxForHint = r.max; }
      return '<div class="wxd' + (isNow ? " now" : "") + (d.date < today ? " past" : "") + '" data-d="' + d.n + '"><div class="wxdn">Day ' + d.n + (isNow ? "・今日" : "") + '</div><div class="muted small">' + esc(d.label) + "</div>" +
        (r ? '<div class="wxi">' + wxIcon(r.code) + "</div><b>" + Math.round(r.max) + '°</b><span class="lo">' + Math.round(r.min) + '°</span><span class="rn">降水 ' + (r.rain == null ? "—" : r.rain + "%") + "</span>"
          : '<div class="wxi">—</div><div class="muted small">予報<br>まだ</div>') + "</div>";
    }).join("");
    return '<div class="wxscroll" id="wxs">' + cells + "</div>" +
      '<p class="muted small wxnote">最高 / 最低（℃）と降水確率。各日の最初の行き先付近の予報です。' + (a && a.ts ? " 更新：" + stamp(a.ts) + (a.stale ? "（取得できず、前回の分）" : "") : "") + "</p>" +
      (tmaxForHint !== null ? '<p class="small wxnote">服装：' + outfit(tmaxForHint) + "</p>" : "");
  }

  function wxHourHtml(day) {
    var spots = wxSpots(day.n), sp = spots[wxSt.spot] || spots[0], h = wxSt.hr[sp.id], now = laHour();
    var chips = spots.length > 1 ? '<div class="qrow" style="margin:6px 0">' + spots.map(function (s, i) {
      return '<button class="qchip' + (i === wxSt.spot ? " on" : "") + '" type="button" data-wxspot="' + i + '">' + esc(s.name) + "</button>";
    }).join("") + "</div>" : "";
    var body;
    if (!h) body = '<p class="muted small">時間ごとの天気を取得できませんでした（電波がないか、まだ予報が出ていません）。</p>';
    else {
      var tmax = -99, cells = h.time.map(function (t, i) {
        var hr = +t.slice(11, 13), tp = h.temp[i], pr = h.rain[i];
        if (tp !== null && tp > tmax) tmax = tp;
        return '<div class="wxh' + (hr === now ? " now" : "") + (hr < now ? " past" : "") + '" data-h="' + hr + '"><div class="muted small">' + hr + '時</div><div class="wxi">' + wxIcon(h.code[i], hr) + "</div><b>" + (tp === null ? "—" : Math.round(tp) + "°") + '</b><span class="rn">降水 ' + (pr === null || pr === undefined ? "—" : pr + "%") + "</span></div>";
      }).join("");
      body = '<div class="wxscroll" id="wxs">' + cells + "</div>" +
        '<p class="muted small wxnote">' + esc(sp.name) + "付近の、現地時間の予報です（気温℃・降水確率）。" + (h.ts ? " 更新：" + stamp(h.ts) + (h.stale ? "（取得できず、前回の分）" : "") : "") + "</p>" +
        (tmax > -99 ? '<p class="small wxnote">服装：' + outfit(tmax) + "</p>" : "");
    }
    return chips + body;
  }

  function wxRender() {
    var box = document.getElementById("wx2"); if (!box) return;
    var td = wxToday(), canHour = td && td.n !== 10 && wxSpots(td.n).length;
    var mode = wxSt.mode || (canHour ? "hour" : "all");
    if (mode === "hour" && !canHour) mode = "all";
    var tabs = canHour ? '<div class="wxtabs"><button type="button" class="' + (mode === "hour" ? "on" : "") + '" data-wxmode="hour">今日（時間ごと）</button><button type="button" class="' + (mode === "all" ? "on" : "") + '" data-wxmode="all">10日間</button></div>' : "";
    var head = mode === "hour" ? "<b>Day " + td.n + "（" + esc(td.label) + "）の天気</b>" : "<b>研修10日間の天気（現地）</b>";
    box.innerHTML = tabs + '<div class="wxhead">' + head + "</div>" + (mode === "hour" ? wxHourHtml(td) : wxAllHtml());
    var s = document.getElementById("wxs"), t = s && (s.querySelector(".wxh.now") || s.querySelector(".wxd.now") || s.querySelector(".wxd:not(.past)"));
    if (s && t) s.scrollLeft = Math.max(0, t.offsetLeft - 8);
  }

  function weather() {
    var box = document.getElementById("wx2"); if (!box) return;
    if (!box.innerHTML) box.innerHTML = '<p class="muted small">天気を取得しています…</p>';
    var days = wxDays(), places = days.map(function (d) { return wxPlace(d.n); }), ok = places.every(function (p) { return p; });
    if (!ok) { box.innerHTML = ""; return; }
    var url = "https://api.open-meteo.com/v1/forecast?latitude=" + places.map(function (p) { return p.lat; }).join(",") + "&longitude=" + places.map(function (p) { return p.lng; }).join(",") +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=16";
    wxGet("wxall1", url, 3600000, function (j, ts, stale) {
      var rows = {};
      if (j) asList(j).forEach(function (loc, i) {
        var d = loc && loc.daily, dd = days[i]; if (!d || !d.time || !dd) return;
        var k = d.time.indexOf(dd.date); if (k < 0) return;
        rows[dd.n] = { code: d.weather_code[k], max: d.temperature_2m_max[k], min: d.temperature_2m_min[k], rain: d.precipitation_probability_max ? d.precipitation_probability_max[k] : null };
      });
      wxSt.all = j ? { rows: rows, ts: ts, stale: stale } : { rows: {}, ts: 0 };
      wxRender();
    });
    var td = wxToday();
    if (td && td.n !== 10) {
      var sps = wxSpots(td.n);
      if (sps.length) {
        var u2 = "https://api.open-meteo.com/v1/forecast?latitude=" + sps.map(function (p) { return p.lat; }).join(",") + "&longitude=" + sps.map(function (p) { return p.lng; }).join(",") +
          "&hourly=temperature_2m,precipitation_probability,weather_code&timezone=auto&start_date=" + td.date + "&end_date=" + td.date;
        wxGet("wxhr1:" + td.date, u2, 1800000, function (j, ts, stale) {
          if (j) asList(j).forEach(function (loc, i) {
            var h = loc && loc.hourly; if (!h || !h.time || !sps[i]) return;
            wxSt.hr[sps[i].id] = { time: h.time, temp: h.temperature_2m, rain: h.precipitation_probability, code: h.weather_code, ts: ts, stale: stale };
          });
          wxRender();
        });
      }
    }
  }

  function wxBind() {
    var box = document.getElementById("wx2"); if (!box || box.getAttribute("data-b")) return;
    box.setAttribute("data-b", "1");
    box.addEventListener("click", function (e) {
      var m = e.target.closest("[data-wxmode]"), s = e.target.closest("[data-wxspot]");
      if (m) { wxSt.mode = m.getAttribute("data-wxmode"); wxRender(); }
      else if (s) { wxSt.spot = +s.getAttribute("data-wxspot"); wxRender(); }
    });
  }

  var clk = null, wxTimer = null;
  function homeBind() {
    clocks(); wxBind(); weather();
    if (clk) clearInterval(clk);
    clk = setInterval(clocks, 20000);
    if (wxTimer) clearInterval(wxTimer);
    wxTimer = setInterval(function () { if (document.getElementById("wx2")) weather(); }, 600000);
  }

  window.TripUX = { settingsHtml: settingsHtml, bindSettings: bindSettings, guide: guide, installPrompt: installPrompt, homeHtml: homeHtml, homeBind: homeBind, version: VERSION };
})();
