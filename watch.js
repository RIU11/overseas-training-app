/* ---------- 保護者用の画面：ホーム／日程／現在地（学生が共有した情報を見る）----------
   学生のアプリが共有した「最新の位置・無事です・乗るバス」を、10秒ごとに読む。
   予定表は、学生のアプリと同じデータ（data.js）。学生が選んだバスの予定を出す。 */
(function () {
  var CFG = window.TRIP_SHARE || {};
  var T = window.TRIP || { days: [] };
  var SP = window.TRIP_SPOTS || [];
  var root = document.getElementById("view");
  var token = (location.hash || "").replace(/^#/, "");
  var LOCAL_TZ = -8; // 予定の時刻は、基本的に現地（カリフォルニア標準時 UTC-8）。日本時間の予定には tz: 9 が付いている

  var pub = null, state = "loading", tab = "home";
  var map = null, marker = null, circle = null, first = true, touched = false;
  var planDay = null, planBus = null;
  var wx = { mode: null, rows: null, ts: 0, stale: false, hr: null };

  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  function pad(n) { return ("0" + n).slice(-2); }
  function clock(ts, tz) { return new Date(ts).toLocaleTimeString("ja-JP", { timeZone: tz, hour: "2-digit", minute: "2-digit" }); }
  function fullClock(tz) { return new Date().toLocaleString("ja-JP", { timeZone: tz, month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" }); }
  function ago(ms) {
    var m = Math.floor(ms / 60000);
    if (m < 1) return "いま";
    if (m < 60) return m + "分前";
    var h = Math.floor(m / 60);
    return h < 24 ? h + "時間" + (m % 60 ? (m % 60) + "分" : "") + "前" : Math.floor(h / 24) + "日前";
  }
  function laDate() { return new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" }); }
  function laHour() { return +new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", hour12: false }) % 24; }
  function leftText(ms) {
    var m = Math.floor(ms / 60000);
    if (m < 1) return "まもなく";
    var d = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60), mi = m % 60;
    return "あと " + (d >= 1 ? d + "日" + h + "時間" : h >= 1 ? h + "時間" + (mi ? mi + "分" : "") : mi + "分");
  }
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem("trip:" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem("trip:" + k, JSON.stringify(v)); } catch (e) { /* 保存できない環境では無視 */ } }
  };

  /* ---------- 予定表（学生のアプリと同じ考え方）---------- */
  function busNow() { return (pub && pub.bus) || ""; }
  function evTime(day, t, tz, endPart) {
    var m = endPart ? /^\d{1,2}:\d{2}\s*[-~〜]\s*(\d{1,2}):(\d{2})/.exec(t) : /^(\d{1,2}):(\d{2})/.exec(t);
    if (!m) return null; // 「夕方」「移動」など、時刻のない予定は対象にしない
    var p = day.date.split("-");
    return Date.UTC(+p[0], +p[1] - 1, +p[2], +m[1], +m[2]) - (tz === undefined ? LOCAL_TZ : tz) * 3600000;
  }
  function itemsOf(d, b) { return d.buses ? (b && d.buses[b] ? d.buses[b].items : null) : d.items; }
  function allEvents() {
    var ev = [], b = busNow();
    T.days.forEach(function (d) {
      var items = itemsOf(d, b);
      if (!items) { ev.push({ ts: evTime(d, "6:30"), day: d, e: d.label.slice(0, 5) + "はバスごとに予定が違います", nobus: true }); return; }
      items.forEach(function (it) {
        var ts = evTime(d, it.t, it.tz);
        if (ts !== null) ev.push({ ts: ts, end: evTime(d, it.t, it.tz, true), day: d, item: it, e: it.e, t: it.t, hot: !!it.hot });
      });
    });
    return ev.sort(function (a, b2) { return a.ts - b2.ts; });
  }
  function evLine(ev) { return esc(ev.day.label) + (ev.t ? " " + esc(ev.t) : "") + "　" + esc(ev.e); }

  /* ---------- ホーム ---------- */
  function nowHtml() {
    var now = Date.now(), evs = allEvents(), idx = evs.findIndex(function (e) { return e.ts > now; });
    if (!evs.length) return "";
    if (idx < 0) return '<div class="card nowc"><div class="nlab">研修は終了しました</div><div class="ncur">おつかれさまでした。</div></div>';
    var nx = evs[idx], after = evs[idx + 1], h = "";
    if (idx === 0) {
      h += '<div class="card nowc"><div class="nlab">いまの予定</div><div class="ncur">まだ出発前です</div><div class="nsub">11/17（火）15:30 関西空港に集合</div></div>';
    } else {
      var cur = evs[idx - 1], over = cur.end && now > cur.end;
      h += '<div class="card nowc"><div class="nlab">いまの予定</div>' + (cur.nobus ? '<div class="ncur">バスを選ぶと表示されます</div><div class="nsub">' + esc(cur.e) + "。学生が、アプリでバスを選ぶと、ここに出ます。</div>" :
        '<div class="ncur">' + esc(cur.e) + '</div><div class="nsub">' + esc(cur.day.label) + " " + esc(cur.t) + (over ? "（予定の時間は終わり、次の予定へ移動中など）" : "") + "</div>") + "</div>";
    }
    h += '<div class="card nowc nxt"><span class="chip' + (nx.hot ? " hotchip" : "") + '">' + (idx === 0 ? "出発まで" : nx.hot ? "集合・大事な予定" : "次の予定") + '</span><div class="big' + (nx.hot ? " hot" : "") + '" id="nx-cd" data-ts="' + nx.ts + '">' + leftText(nx.ts - now) + '</div>' +
      '<div class="h">' + (nx.nobus ? esc(nx.e) : evLine(nx)) + "</div></div>";
    if (after && !after.nobus && !nx.nobus) h += '<div class="afterbar"><span class="al">そのあと</span><span class="at">' + (after.day === nx.day ? "" : esc(after.day.label) + " ") + esc(after.t || "") + "　" + esc(after.e) + "</span></div>";
    return h;
  }
  function statusHtml() {
    var p = pub, now = Date.now();
    if (state === "none") return '<div class="card"><span class="wst off">見られません</span> <span class="muted small">URLが無効か、共有が終わっています。</span></div>';
    if (state === "off") return '<div class="card"><span class="wst off">準備中</span></div>';
    if (!p) return '<div class="card"><span class="muted small">学生の状態を読み込んでいます…</span></div>';
    var ended = p.exp && now > p.exp, age = now - p.t;
    var st = ended ? ["共有は終了", "off"] : p.on === false ? ["共有を停止中", "off"] : age > 5 * 60000 ? ["しばらく更新なし", "warn"] : ["共有中", "ok"];
    return '<div class="card hstat"><div><span class="wst ' + st[1] + '">' + st[0] + "</span> <b>" + esc(p.name || "研修中の学生") + '</b></div>' +
      (p.on !== false && !ended ? '<div class="muted small">最終更新 ' + ago(age) + (p.bus ? "　乗るバス：バス" + esc(p.bus) : "") + "</div>" : "") +
      (p.ok ? '<div class="wok">無事です（' + ago(now - p.ok) + "）</div>" : "") +
      '<p><button class="btn" type="button" data-go="loc">現在地を見る</button></p></div>';
  }
  function homeFrame() {
    return '<div id="hstat"></div><div id="hnow"></div>' +
      '<div class="card"><div class="clocks"><div><div class="muted small">日本</div><b id="pclk-jp">—</b></div><div><div class="muted small">現地（カリフォルニア）</div><b id="pclk-us">—</b></div></div></div>' +
      '<div class="card" id="wxcard"><h3>現地の天気</h3><div id="wx2"></div></div>';
  }
  function paintHome() {
    var a = document.getElementById("hstat"), b = document.getElementById("hnow");
    if (a) a.innerHTML = statusHtml();
    if (b) b.innerHTML = nowHtml();
    clocks();
  }
  function clocks() {
    var a = document.getElementById("pclk-jp"), b = document.getElementById("pclk-us");
    if (a) a.textContent = fullClock("Asia/Tokyo");
    if (b) b.textContent = fullClock("America/Los_Angeles");
  }

  /* ---------- 天気（学生のアプリと同じ：研修10日間／当日は時間ごと）---------- */
  var WX = { 0: ["☀️", "快晴"], 1: ["🌤", "晴れ"], 2: ["⛅", "薄曇り"], 3: ["☁️", "くもり"], 45: ["🌫", "霧"], 48: ["🌫", "霧"],
    51: ["🌦", "霧雨"], 53: ["🌦", "霧雨"], 55: ["🌦", "霧雨"], 56: ["🌧", "凍る霧雨"], 57: ["🌧", "凍る霧雨"], 61: ["🌧", "雨"], 63: ["🌧", "雨"], 65: ["🌧", "強い雨"],
    66: ["🌧", "凍る雨"], 67: ["🌧", "凍る雨"], 71: ["🌨", "雪"], 73: ["🌨", "雪"], 75: ["🌨", "大雪"], 77: ["🌨", "雪"], 80: ["🌦", "にわか雨"], 81: ["🌦", "にわか雨"],
    82: ["🌧", "激しいにわか雨"], 85: ["🌨", "にわか雪"], 86: ["🌨", "にわか雪"], 95: ["⛈", "雷雨"], 96: ["⛈", "雷雨"], 99: ["⛈", "雷雨"] };
  function wxIcon(code, hour) { if (hour !== undefined && (hour < 6 || hour >= 19) && (code === 0 || code === 1)) return "🌙"; return (WX[code] || ["🌡"])[0]; }
  function wxPlace(n) {
    if (n === 10) return { lat: 34.7855, lng: 135.4382 };
    return SP.filter(function (s) { return s.day === n; })[0] || null;
  }
  function stamp(ts) { var d = new Date(ts); return (d.getMonth() + 1) + "/" + d.getDate() + " " + pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function wxGet(key, url, maxAge, cb) {
    var hit = store.get(key, null);
    if (hit && hit.d && Date.now() - hit.ts < maxAge) { cb(hit.d, hit.ts, false); return; }
    fetch(url).then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); }).then(function (j) {
      var ts = Date.now(); store.set(key, { ts: ts, d: j }); cb(j, ts, false);
    }).catch(function () { if (hit && hit.d) cb(hit.d, hit.ts, true); else cb(null, 0, true); });
  }
  function asList(j) { return Array.isArray(j) ? j : [j]; }
  function todayDay() { var t = laDate(); return T.days.filter(function (d) { return d.date === t; })[0] || null; }

  function wxAllHtml() {
    var today = laDate(), a = wx;
    if (a.rows === null) return '<p class="muted small">天気を取得しています…</p>';
    if (!a.ts) return '<p class="muted small">天気を取得できませんでした（電波がないか、まだ予報が出ていません）。</p>';
    var cells = T.days.map(function (d) {
      var r = a.rows[d.n], isNow = d.date === today;
      return '<div class="wxd' + (isNow ? " now" : "") + (d.date < today ? " past" : "") + '"><div class="wxdn">Day ' + d.n + (isNow ? "・今日" : "") + '</div><div class="muted small">' + esc(d.label) + "</div>" +
        (r ? '<div class="wxi">' + wxIcon(r.code) + "</div><b>" + Math.round(r.max) + '°</b><span class="lo">' + Math.round(r.min) + '°</span><span class="rn">降水 ' + (r.rain == null ? "—" : r.rain + "%") + "</span>"
          : '<div class="wxi">—</div><div class="muted small">予報<br>まだ</div>') + "</div>";
    }).join("");
    return '<div class="wxscroll" id="wxs">' + cells + '</div><p class="muted small wxnote">最高 / 最低（℃）と降水確率。各日の最初の行き先付近の予報です。更新：' + stamp(a.ts) + (a.stale ? "（取得できず、前回の分）" : "") + "</p>";
  }
  function wxHourHtml() {
    var h = wx.hr, now = laHour();
    if (!h) return '<p class="muted small">時間ごとの天気を取得できませんでした。</p>';
    var cells = h.time.map(function (t, i) {
      var hr = +t.slice(11, 13), tp = h.temp[i], pr = h.rain[i];
      return '<div class="wxh' + (hr === now ? " now" : "") + (hr < now ? " past" : "") + '"><div class="muted small">' + hr + '時</div><div class="wxi">' + wxIcon(h.code[i], hr) + "</div><b>" + (tp === null ? "—" : Math.round(tp) + "°") + '</b><span class="rn">降水 ' + (pr == null ? "—" : pr + "%") + "</span></div>";
    }).join("");
    return '<div class="wxscroll" id="wxs">' + cells + '</div><p class="muted small wxnote">' + (h.where || "現地") + "の、現地時間の予報です（気温℃・降水確率）。更新：" + stamp(h.ts) + (h.stale ? "（取得できず、前回の分）" : "") + "</p>";
  }
  function wxRender() {
    var box = document.getElementById("wx2"); if (!box) return;
    var td = todayDay(), canHour = td && td.n !== 10 && wxPlace(td.n);
    var mode = wx.mode || (canHour ? "hour" : "all");
    if (mode === "hour" && !canHour) mode = "all";
    var tabs = canHour ? '<div class="wxtabs"><button type="button" class="' + (mode === "hour" ? "on" : "") + '" data-wxmode="hour">今日（時間ごと）</button><button type="button" class="' + (mode === "all" ? "on" : "") + '" data-wxmode="all">10日間</button></div>' : "";
    box.innerHTML = tabs + (mode === "hour" ? wxHourHtml() : wxAllHtml());
    var s = document.getElementById("wxs"), t = s && (s.querySelector(".wxh.now") || s.querySelector(".wxd.now") || s.querySelector(".wxd:not(.past)"));
    if (s && t) s.scrollLeft = Math.max(0, t.offsetLeft - 8);
  }
  function loadWeather() {
    var places = T.days.map(function (d) { return wxPlace(d.n); });
    if (!places.every(function (p) { return p; })) return;
    var url = "https://api.open-meteo.com/v1/forecast?latitude=" + places.map(function (p) { return p.lat; }).join(",") + "&longitude=" + places.map(function (p) { return p.lng; }).join(",") +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=16";
    wxGet("pwx1", url, 3600000, function (j, ts, stale) {
      var rows = {};
      if (j) asList(j).forEach(function (loc, i) {
        var d = loc && loc.daily, dd = T.days[i]; if (!d || !d.time || !dd) return;
        var k = d.time.indexOf(dd.date); if (k < 0) return;
        rows[dd.n] = { code: d.weather_code[k], max: d.temperature_2m_max[k], min: d.temperature_2m_min[k], rain: d.precipitation_probability_max ? d.precipitation_probability_max[k] : null };
      });
      wx.rows = j ? rows : {}; wx.ts = j ? ts : 0; wx.stale = stale; wxRender();
    });
    var td = todayDay();
    if (td && td.n !== 10 && wxPlace(td.n)) {
      var pl = wxPlace(td.n), where = "その日の行き先付近";
      if (pub && pub.on !== false && pub.la !== undefined && Date.now() - pub.t < 30 * 60000) { pl = { lat: pub.la, lng: pub.lo }; where = "学生の現在地付近"; }
      var u2 = "https://api.open-meteo.com/v1/forecast?latitude=" + pl.lat.toFixed(2) + "&longitude=" + pl.lng.toFixed(2) + "&hourly=temperature_2m,precipitation_probability,weather_code&timezone=auto&start_date=" + td.date + "&end_date=" + td.date;
      wxGet("pwhr1:" + td.date + ":" + pl.lat.toFixed(2) + "," + pl.lng.toFixed(2), u2, 1800000, function (j, ts, stale) {
        var h = j && asList(j)[0] && asList(j)[0].hourly;
        wx.hr = h && h.time ? { time: h.time, temp: h.temperature_2m, rain: h.precipitation_probability, code: h.weather_code, ts: ts, stale: stale, where: where } : null;
        wxRender();
      });
    }
  }

  /* ---------- 日程 ---------- */
  function planHtml() {
    var td = todayDay(), sel = planDay || (td ? td.n : (laDate() < T.days[0].date ? 1 : T.days.length));
    var chips = '<div class="pdays" id="pdays">' + T.days.map(function (d) {
      return '<button type="button" class="pd' + (d.n === sel ? " on" : "") + '" data-day="' + d.n + '"><b>Day ' + d.n + "</b><span>" + esc(d.label) + "</span></button>";
    }).join("") + "</div>";
    var d = T.days.filter(function (x) { return x.n === sel; })[0], h = "", stuBus = busNow();
    var evs = allEvents(), nxEv = evs.filter(function (e) { return e.ts > Date.now(); })[0], nextItem = nxEv && nxEv.item;
    h += '<div class="card"><h3>Day ' + d.n + "｜" + esc(d.label) + '</h3><div class="muted small">' + esc(d.area) + "</div>" + (d.note ? '<p class="muted">' + esc(d.note.replace(/（マイ情報で選ぶと自分のコースを表示）/, "")) + "</p>" : "");
    var items = d.items, bname = "";
    if (d.buses) {
      var use = planBus || stuBus;
      h += '<div class="seg" id="pbus">' + ["1", "2", "3"].map(function (n) { return '<button data-bus="' + n + '" class="' + (use === n ? "on" : "") + '">バス' + n + (stuBus === n ? "（学生）" : "") + "</button>"; }).join("") + "</div>";
      if (!stuBus) h += '<p class="muted small">学生は、まだバスを選んでいません。見たいバスを選んでください。</p>';
      var bb = use && d.buses[use];
      if (bb) { items = bb.items; bname = "<b>" + esc(bb.name) + '</b><div class="muted small">' + esc(bb.sub) + "</div>"; } else items = null;
    }
    if (items) {
      h += bname + items.map(function (it) {
        return '<div class="row' + (it.hot ? " hot" : "") + (it === nextItem ? " now" : "") + '"><div class="time">' + esc(it.t) + "</div><div>" + esc(it.e) + (it.tag ? '<span class="tag">' + esc(it.tag) + "</span>" : "") + (it === nextItem ? '<span class="tag">次</span>' : "") + "</div></div>";
      }).join("");
    } else if (d.buses) h += '<p class="muted">上のボタンで、バスを選ぶと表示されます。</p>';
    if (d.tip) h += '<div class="warn">' + esc(d.tip) + "</div>";
    h += '<p class="muted small">' + esc(d.meal) + "</p></div>" +
      '<p class="muted small">予定の時刻は、現地（カリフォルニア）の時刻です。日本時間の予定には、そのまま日本の時刻が出ています。訪問先の都合や天候で、変わることがあります。</p>';
    return chips + h;
  }
  function paintPlan() {
    var el = document.getElementById("t-plan"); if (!el) return;
    var keep = document.getElementById("pdays"), x = keep ? keep.scrollLeft : 0;
    el.innerHTML = planHtml();
    var s = document.getElementById("pdays"), on = s && s.querySelector(".pd.on");
    if (s) s.scrollLeft = keep ? x : (on ? Math.max(0, on.offsetLeft - 8) : 0);
  }

  /* ---------- 現在地 ---------- */
  function locFrame() {
    return '<div class="card mapcard"><div id="wmap" role="application" aria-label="位置の地図"></div></div><div class="card" id="winfo"></div>' +
      '<div class="card"><p class="muted small">この画面は、学生が共有した、<b>最新の1点</b>だけを表示します（移動の履歴は残りません）。学生のアプリを開いている間だけ、位置が更新されます。このURLは、他の人に転送しないでください。</p></div>';
  }
  function ensureMap() {
    if (map || !document.getElementById("wmap")) return;
    map = L.map("wmap", { zoomControl: true }).setView([37.7749, -122.4194], 11);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap contributors" }).addTo(map);
    map.on("mousedown touchstart", function () { touched = true; });
  }
  function paintLoc() {
    var el = document.getElementById("winfo"); if (!el) return;
    var p = pub, now = Date.now(), h = "";
    if (state === "none") { el.innerHTML = '<h3>見られません</h3><p>このURLは、無効か、共有が終わっています。学生に、新しいURLを送ってもらってください。</p>'; return; }
    if (state === "off") { el.innerHTML = '<h3>共有の準備中です</h3><p class="muted">サーバーの設定が済むと、ここに位置が出ます。</p>'; return; }
    if (state === "error" && !p) { el.innerHTML = '<h3>読み込めませんでした</h3><p class="muted">電波を確認してください。自動で、もう一度試します。</p>'; return; }
    if (!p) { el.innerHTML = '<p class="muted">読み込んでいます…</p>'; return; }
    var ended = (p.exp && now > p.exp), age = now - p.t, name = p.name ? esc(p.name) : "研修中の学生";
    var status = ended ? "共有は終了しました" : p.on === false ? "共有を停止中" : (age > 5 * 60000 ? "しばらく更新がありません" : "共有中");
    var cls = ended || p.on === false ? "wst off" : age > 5 * 60000 ? "wst warn" : "wst ok";
    h += "<h3>" + name + '</h3><div class="' + cls + '">' + status + "</div>";
    if (p.on !== false && !ended) {
      h += "<p>最終更新：<b>" + ago(age) + "</b>（現地 " + clock(p.t, "America/Los_Angeles") + "／日本 " + clock(p.t, "Asia/Tokyo") + "）</p>";
      if (age > 5 * 60000) h += '<p class="muted small">アプリを閉じている、画面が消えている、または電波がない可能性があります。位置は、アプリを開いている間だけ更新されます。</p>';
      if (p.la !== undefined && p.lo !== undefined) {
        h += '<p class="muted small">位置の誤差：約' + (p.ac || 0) + 'm</p><p><a class="btn" target="_blank" rel="noopener" href="https://www.google.com/maps?q=' + p.la + "," + p.lo + '">Googleマップで開く</a> ' +
          '<a class="btn" target="_blank" rel="noopener" href="https://maps.apple.com/?ll=' + p.la + "," + p.lo + '&q=' + encodeURIComponent("研修中の位置") + '">マップ（iPhone）で開く</a></p>';
      } else h += '<p class="muted small">まだ位置が届いていません。</p>';
    }
    if (p.ok) h += '<div class="wok">無事です（' + ago(now - p.ok) + "｜現地 " + clock(p.ok, "America/Los_Angeles") + "／日本 " + clock(p.ok, "Asia/Tokyo") + "）</div>";
    else h += '<p class="muted small">「無事です」は、まだ届いていません。</p>';
    el.innerHTML = h;
  }
  function drawMap() {
    var p = pub;
    if (!map) return;
    if (!p || p.on === false || (p.exp && Date.now() > p.exp) || p.la === undefined) {
      if (marker) { map.removeLayer(marker); marker = null; }
      if (circle) { map.removeLayer(circle); circle = null; }
      return;
    }
    var ll = [p.la, p.lo];
    if (!marker) marker = L.circleMarker(ll, { radius: 9, weight: 3, color: "#fff", fillColor: "#ef4444", fillOpacity: 1 }).addTo(map); else marker.setLatLng(ll);
    if (!circle) circle = L.circle(ll, { radius: p.ac || 30, weight: 1, color: "#ef4444", fillOpacity: 0.12 }).addTo(map); else { circle.setLatLng(ll); circle.setRadius(p.ac || 30); }
    if (first || !touched) { map.setView(ll, first ? 16 : map.getZoom()); first = false; }
  }

  /* ---------- 全体 ---------- */
  function show(t) {
    tab = t;
    ["home", "plan", "loc"].forEach(function (k) {
      document.getElementById("t-" + k).hidden = k !== t;
      var b = document.querySelector('.btabs [data-tab="' + k + '"]'); if (b) b.classList.toggle("on", k === t);
    });
    if (t === "loc") { ensureMap(); if (map) setTimeout(function () { map.invalidateSize(); drawMap(); }, 60); }
    window.scrollTo(0, 0);
  }
  function load() {
    if (!CFG.db) { state = "off"; paintAll(); return; }
    var url = CFG.db.replace(/\/$/, "") + "/share/" + token + "/pub.json";
    fetch(url, { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); }).then(function (j) {
      var oldBus = busNow();
      if (!j) { state = "none"; pub = null; } else { state = "ok"; pub = j; }
      if (oldBus !== busNow()) { paintPlan(); }
      if (j && !wx.locDone) { wx.locDone = true; loadWeather(); }
      paintAll(); drawMap();
    }).catch(function () { if (!pub) state = "error"; paintAll(); });
  }
  function paintAll() { paintHome(); paintLoc(); }

  function start() {
    if (!/^[A-Za-z0-9_-]{32}$/.test(token)) { root.innerHTML = '<div class="card"><h3>URLが正しくありません</h3><p>学生から送られた、URLか、QRコードを、もう一度開いてください。</p></div>'; return; }
    root.innerHTML = '<section id="t-home">' + homeFrame() + '</section><section id="t-plan" hidden></section><section id="t-loc" hidden>' + locFrame() + "</section>" +
      '<nav class="btabs" aria-label="画面の切り替え">' +
      '<button type="button" class="on" data-tab="home">' + TripIco.i("home", 24) + "<span>ホーム</span></button>" +
      '<button type="button" data-tab="plan">' + TripIco.i("plan", 24) + "<span>日程</span></button>" +
      '<button type="button" data-tab="loc">' + TripIco.i("pin", 24) + "<span>現在地</span></button></nav>";
    paintPlan(); paintAll(); loadWeather(); wxRender();
    root.addEventListener("click", function (e) {
      var b;
      if ((b = e.target.closest("[data-tab]"))) { show(b.getAttribute("data-tab")); return; }
      if ((b = e.target.closest("[data-go]"))) { show(b.getAttribute("data-go")); return; }
      if ((b = e.target.closest("[data-day]"))) { planDay = +b.getAttribute("data-day"); planBus = null; paintPlan(); return; }
      if ((b = e.target.closest("#pbus [data-bus]"))) { planBus = b.getAttribute("data-bus"); paintPlan(); return; }
      if ((b = e.target.closest("[data-wxmode]"))) { wx.mode = b.getAttribute("data-wxmode"); wxRender(); }
    });
    load();
    setInterval(function () { if (!document.hidden) { load(); } }, 10000);
    setInterval(function () {
      var el = document.getElementById("nx-cd"), left = el ? +el.getAttribute("data-ts") - Date.now() : 1;
      if (left <= 0) paintHome(); else { if (el) el.textContent = leftText(left); clocks(); }
    }, 15000);
    setInterval(function () { if (!document.hidden) { loadWeather(); paintPlan(); } }, 600000);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) { load(); paintHome(); } });
  }
  start();
})();
