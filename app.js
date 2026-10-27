(function () {
  "use strict";
  var T = window.TRIP;
  var P = window.PHOTOS || { home: "", bgs: [], day: {}, hotel: [], list: {}, credits: [] };
  var view = document.getElementById("view");
  var reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  var previewBus = null; // 検索結果から他のバスの予定を見ているときだけ設定（自分のバスの設定は変えない）
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem("trip:" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem("trip:" + k, JSON.stringify(v)); } catch (e) { /* 保存できない環境では無視 */ } }
  };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var pad = function (n) { return n < 10 ? "0" + n : "" + n; };
  var todayStr = function () { var d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
  var bus = function () { return store.get("bus", ""); };

  /* ---------- 写真 ---------- */
  function src(k) { return "img/" + k + ".jpg"; }
  function cap(k) { return (P.list[k] && P.list[k].cap) || ""; }
  function pic(k, lazy) { return k ? '<img src="' + src(k) + '" alt="' + esc(cap(k)) + '"' + (lazy ? ' loading="lazy" decoding="async"' : "") + ">" : ""; }

  /* ---------- 背景スライドショー ---------- */
  var Bg = (function () {
    var list = P.bgs || [], layers = [], cur = 0, idx = -1, timer = null;
    var capEl = document.getElementById("cap");
    function init() {
      layers = [].slice.call(document.querySelectorAll("#bg .bgimg"));
      if (!list.length || layers.length < 2) return;
      idx = Math.floor(Math.random() * list.length) - 1; // 開くたびに違う写真から始める
      next(true);
      play();
    }
    function show(k, first) {
      var nxt = first ? layers[0] : layers[1 - cur], old = first ? null : layers[cur];
      var im = new Image();
      im.onload = function () {
        nxt.style.backgroundImage = "url(" + src(k) + ")";
        nxt.classList.remove("kb"); void nxt.offsetWidth;
        if (!reduce) nxt.classList.add("kb");
        nxt.classList.add("on");
        if (old) { old.classList.remove("on"); setTimeout(function () { old.classList.remove("kb"); }, 2600); }
        cur = layers.indexOf(nxt);
        if (capEl) capEl.textContent = "📍 " + cap(k);
      };
      im.onerror = function () { /* 読み込めない写真は飛ばす */ };
      im.src = src(k);
    }
    function next(first) {
      idx = (idx + 1) % list.length;
      show(list[idx], first);
      var pre = new Image(); pre.src = src(list[(idx + 1) % list.length]); // 次の写真を先読み
    }
    function play() {
      stop();
      if (reduce || list.length < 2) return;
      timer = setInterval(function () { next(false); }, 9000);
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else play(); });
    return { init: init, manual: function () { next(false); play(); } };
  })();

  /* ---------- 日程データの扱い ---------- */
  function dayItems(day) {
    if (day.buses) {
      var b = previewBus || bus();
      if (b && day.buses[b]) return { key: b, name: day.buses[b].name, sub: day.buses[b].sub, items: day.buses[b].items };
      return null;
    }
    return { key: "", items: day.items };
  }
  /* ---------- 次の予定 ----------
     予定の時刻は、日本時間（tz: 9）か現地時間（既定はカリフォルニアの標準時 UTC-8）。
     世界共通の時刻に直して、「いま」と比べる（日本とアメリカをまたぐ日でも正しく数えるため）。 */
  var LOCAL_TZ = -8;
  function evTime(day, t, tz) {
    var m = /^(\d{1,2}):(\d{2})/.exec(t);
    if (!m) return null; // 「夕方」「移動」など、時刻のない予定は対象にしない
    var p = day.date.split("-");
    return Date.UTC(+p[0], +p[1] - 1, +p[2], +m[1], +m[2]) - (tz === undefined ? LOCAL_TZ : tz) * 3600000;
  }

  // すべての予定を時刻順に並べる。バスで分かれる日は、自分のバスの予定を使う（未選択のときは目印だけ）
  function allEvents() {
    var ev = [];
    T.days.forEach(function (d) {
      var items = d.items;
      if (d.buses) {
        var b = bus();
        items = b && d.buses[b] ? d.buses[b].items : null;
        if (!items) {
          ev.push({ ts: evTime(d, "6:30"), day: d, e: d.label.slice(0, 5) + "はバスごとに予定が違います", nobus: true });
          return;
        }
      }
      items.forEach(function (it) {
        var ts = evTime(d, it.t, it.tz);
        if (ts !== null) ev.push({ ts: ts, day: d, item: it, e: it.e, t: it.t, hot: !!it.hot });
      });
    });
    return ev.sort(function (a, b) { return a.ts - b.ts; });
  }

  function leftText(ms) {
    var m = Math.floor(ms / 60000);
    if (m < 1) return "まもなく";
    var d = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60), mi = m % 60;
    return "あと " + (d >= 1 ? d + "日" + h + "時間" : h >= 1 ? h + "時間" + (mi ? mi + "分" : "") : mi + "分");
  }

  // pre を渡すと、各行に id（検索結果からの移動用）を付ける。nextItem は「次」の印を付ける予定
  function rows(items, nextItem, pre) {
    var nextIdx = nextItem ? items.indexOf(nextItem) : -1;
    return items.map(function (it, i) {
      return '<div class="row' + (it.hot ? " hot" : "") + (i === nextIdx ? " now" : "") + '"' + (pre ? ' id="' + pre + i + '"' : "") + '><div class="time">' + esc(it.t) +
        '</div><div>' + esc(it.e) + (it.tag ? '<span class="tag">' + esc(it.tag) + "</span>" : "") + (i === nextIdx ? '<span class="tag">次</span>' : "") + "</div></div>";
    }).join("");
  }

  /* ---------- 画面 ---------- */
  function strip() {
    return '<h2>📍 行く場所</h2><div class="strip">' + T.days.map(function (d) {
      var k = P.day[d.n];
      return '<a href="#" class="sp" data-day="' + d.n + '">' + pic(k, true) + '<span class="chip">Day ' + d.n + '</span><span class="cp">' + esc(cap(k)) + "</span></a>";
    }).join("") + "</div>";
  }

  function home() {
    var now = Date.now(), evs = allEvents();
    var idx = evs.findIndex(function (e) { return e.ts > now; }), nx = idx >= 0 ? evs[idx] : null;
    var today = todayStr(), cur = T.days.filter(function (d) { return d.date === today; })[0], html = "";
    if (!nx) { // すべての予定が終わった
      html += '<div class="hero">' + pic(P.day[10]) + '<div class="in"><div class="h">おつかれさまでした！</div><div class="capt">帰国後アンケートの回答を忘れずに。</div></div></div>';
    } else if (idx === 0) { // まだ出発前：最初の予定（集合）までの時間
      html += '<div class="hero">' + pic(P.home) + '<div class="in"><div class="muted" style="color:#dfe6ff">出発まで</div><div class="big" id="nx-cd" data-ts="' + nx.ts + '">' + leftText(nx.ts - now) +
        '</div><div class="h">11/17（火）15:30 関西空港に集合</div><div class="capt">📷 ' + esc(cap(P.home)) + "</div></div></div>";
    } else { // 研修中：次の予定と、その予定までの時間
      var after = evs[idx + 1];
      html += '<div class="hero">' + pic(P.day[nx.day.n]) + '<div class="in"><div><span class="chip' + (nx.hot ? " hotchip" : "") + '">' + (nx.hot ? "集合・大事な予定" : "次の予定") + '</span><span class="chip alt">Day ' + nx.day.n + "</span></div>" +
        '<div class="big' + (nx.hot ? " hot" : "") + '" id="nx-cd" data-ts="' + nx.ts + '">' + leftText(nx.ts - now) + "</div>" +
        '<div class="h">' + esc(nx.day.label) + (nx.t ? " " + esc(nx.t) : "") + "　" + esc(nx.e) + "</div>" +
        (nx.nobus ? '<div class="capt"><a href="#" data-go="tool">「便利」のマイ情報でバスを選ぶ</a></div>'
          : after && !after.nobus ? '<div class="capt">そのあと：' + (after.day === nx.day ? "" : esc(after.day.label) + " ") + esc(after.t || "") + "　" + esc(after.e) + "</div>" : "") +
        "</div></div>";
    }
    if (cur) {
      var di = dayItems(cur);
      html += '<div class="card"><h3>今日の予定（Day ' + cur.n + "｜" + esc(cur.area) + ")</h3>";
      if (cur.note) html += '<p class="muted">' + esc(cur.note) + "</p>";
      if (di) html += (di.name ? "<b>" + esc(di.name) + "</b>" : "") + rows(di.items, nx && nx.item);
      else html += '<p>この日はバスごとに予定が違います。<a href="#" data-go="tool">便利タブの「マイ情報」</a>でバスを選んでください。</p>';
      html += "</div>";
    }
    html += strip();
    var all = T.tasks.length, done = T.tasks.filter(function (t) { return store.get("c:" + t.id, false); }).length;
    html += '<div class="card"><h3>出発前のやること</h3><div class="bar"><i style="width:' + Math.round(done / all * 100) + '%"></i></div><div class="muted">' + done + " / " + all + ' 完了　<a href="#" data-go="prep">準備タブへ</a></div></div>';
    html += '<div class="warn">⚠️ パスポートの原本・ESTAの控え・赤いジップロックは<b>手荷物</b>に。スーツケースには入れない。</div>';
    html += '<div class="card"><h3>大事なポイント</h3><ul class="pl"><li>出発は<b>関西空港</b>、帰国は<b>伊丹空港</b>（到着空港が違う）</li><li>点呼のあとはホテルから出ない／一人で行動しない</li><li>研修中は飲酒・喫煙は厳禁</li><li>カードしか使えない店が多い（$20札以下の現金も少し）</li></ul></div>';
    return html;
  }

  function plan() {
    var b = bus(), today = todayStr();
    var notice = previewBus ? '<div class="warn">👀 バス' + esc(previewBus) + "の予定を見ています（あなたのバス：" + (b ? "バス" + esc(b) : "未選択") + '）。<a href="#" data-preview="off">戻す</a></div>' : "";
    return '<div class="card"><b>11/19のバス</b><div class="seg" id="busSeg">' +
      ["1", "2", "3"].map(function (n) { return '<button data-bus="' + n + '" class="' + (b === n ? "on" : "") + '">バス' + n + "</button>"; }).join("") +
      "</div></div>" + notice +
      T.days.map(function (d) {
        var open = d.date === today ? " open" : "";
        var di = dayItems(d), body = "";
        if (d.note) body += '<p class="muted">' + esc(d.note) + "</p>";
        if (d.buses) {
          if (di) body += "<b>" + esc(di.name) + '</b><div class="muted small">' + esc(di.sub) + "</div>" + rows(di.items, null, "r-" + d.n + "-b" + di.key + "-");
          else body += '<div class="muted">上のボタンでバスを選ぶと表示されます。</div>';
          if (d.tip) body += '<div class="warn">' + esc(d.tip) + "</div>";
        } else body += rows(d.items, null, "r-" + d.n + "-");
        body += '<p class="muted small">' + esc(d.meal) + "　📷 " + esc(cap(P.day[d.n])) + "</p>";
        return '<details class="card pic" id="day-' + d.n + '"' + open + "><summary>" +
          '<div class="dbanner">' + pic(P.day[d.n], true) + '<div class="dt"><span class="chip">Day ' + d.n + "</span><b>" + esc(d.label) + '</b><span class="ar">' + esc(d.area) + "</span></div></div></summary>" +
          '<div class="dbody">' + body + "</div></details>";
      }).join("") +
      '<p class="muted small">※訪問先の都合や天候で変更になることがあります。最新は先生の案内と学校の資料を確認してください。</p>';
  }

  // 保存用のキーは key+番号、画面上の id は key+"-"+番号（検索結果からの移動用）
  function list(key, items, label) {
    var done = items.filter(function (_, i) { return store.get("c:" + key + i, false); }).length;
    return '<div class="card" id="card-' + key + '"><h3>' + label + '</h3><div class="muted">' + done + " / " + items.length + "</div>" +
      '<div class="bar"><i style="width:' + Math.round(done / items.length * 100) + '%"></i></div>' +
      items.map(function (t, i) {
        var on = store.get("c:" + key + i, false);
        return '<label class="chk' + (on ? " done" : "") + '" id="' + key + "-" + i + '"><input type="checkbox" data-k="' + key + i + '"' + (on ? " checked" : "") + "><span>" + esc(t) + "</span></label>";
      }).join("") + "</div>";
  }

  // 自分用の持ち物（この端末だけに保存）。上の欄に入力して追加すると、下に並ぶ
  function mine() {
    var items = store.get("mine", []);
    var done = items.filter(function (x) { return x.d; }).length;
    return '<div class="card" id="mine"><h3>自分の持ち物</h3>' +
      '<div class="addrow"><input type="text" id="mine-in" maxlength="60" placeholder="追加したい持ち物を入力" enterkeyhint="done" autocomplete="off">' +
      '<button class="btn primary" type="button" data-add="1">追加</button></div>' +
      (items.length ?
        '<div class="muted">' + done + " / " + items.length + "</div>" +
        '<div class="bar"><i style="width:' + Math.round(done / items.length * 100) + '%"></i></div>' +
        items.map(function (x, i) {
          return '<div class="chk mine' + (x.d ? " done" : "") + '"><label><input type="checkbox" data-m="' + i + '"' + (x.d ? " checked" : "") + "><span>" + esc(x.t) + '</span></label><button class="del" type="button" data-del="' + i + '" aria-label="削除">✕</button></div>';
        }).join("") :
        '<p class="muted small">薬、充電器、お土産リストなど、自分に必要なものを追加できます。</p>') + "</div>";
  }

  function addMine() {
    var inp = document.getElementById("mine-in");
    var t = inp ? inp.value.trim() : "";
    if (!t) { if (inp) inp.focus(); return; }
    var items = store.get("mine", []);
    items.push({ t: t, d: false });
    store.set("mine", items);
    refresh();
    var n = document.getElementById("mine-in"); if (n) n.focus();
  }

  function prep() {
    var tasks = '<div class="card" id="card-tasks"><h3>出発前のやること</h3>' + T.tasks.map(function (t) {
      var on = store.get("c:" + t.id, false);
      return '<label class="chk' + (on ? " done" : "") + '" id="tk-' + esc(t.id) + '"><input type="checkbox" data-k="' + esc(t.id) + '"' + (on ? " checked" : "") + "><span>" + esc(t.t) + '<em class="due">' + esc(t.due) + "</em></span></label>";
    }).join("") + "</div>";
    return '<div class="hero" style="min-height:150px">' + pic("palace") + '<div class="in"><div class="h">✈️ 準備はできた？</div><div class="capt">チェックはこの端末に保存されます</div></div></div>' +
      tasks + mine() + list("pc", T.pack.carry, "機内に持ち込む手荷物") + list("ps", T.pack.suit, "預けるスーツケース") +
      '<div class="card" id="card-bag"><h3>荷物のルール</h3><ul class="pl">' + T.baggage.map(function (x, i) { return '<li id="bg-' + i + '">' + esc(x) + "</li>"; }).join("") + "</ul></div>";
  }

  // pre を渡すと、各項目に id（検索結果からの移動用）を付ける
  function plainList(arr, pre) { return '<ul class="pl plain">' + arr.map(function (x, i) { return "<li" + (pre ? ' id="' + pre + "-" + i + '"' : "") + ">" + esc(x) + "</li>"; }).join("") + "</ul>"; }

  function rule() {
    return '<div class="hero" style="min-height:150px">' + pic("sf-neon") + '<div class="in"><div class="h">📖 ルールとマナー</div><div class="capt">安全に、楽しく過ごすために</div></div></div>' +
      T.rules.map(function (r, i) { return '<details class="card" id="rl-' + i + '"><summary>' + esc(r.h) + "</summary>" + plainList(r.p, "rl-" + i) + "</details>"; }).join("") +
      '<details class="card" id="rl-money"><summary>お金・チップ・カード</summary>' + plainList(T.money, "rl-money") + "</details>" +
      '<details class="card" id="rl-phone"><summary>スマホ・Wi-Fi・eSIM</summary>' + plainList(T.phones, "rl-phone") + "</details>";
  }

  function hotel() {
    return '<div class="hero" style="min-height:150px">' + pic("bay-bridge") + '<div class="in"><div class="h">🏨 ホテル情報</div><div class="capt">3か所のホテルの使い方</div></div></div>' +
      T.hotels.map(function (h, i) {
        var map = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(h.name + " " + h.addr);
        var k = P.hotel[i];
        return '<details class="card pic" id="ht-' + i + '"><summary><div class="dbanner">' + pic(k, true) + '<div class="dt"><b>' + esc(h.area) + '</b><span class="ar">' + esc(h.name) + "</span></div></div></summary>" +
          '<div class="dbody"><div class="muted">' + esc(h.addr) + '</div><div class="muted">Tel ' + esc(h.tel) + '</div><p><a href="' + map + '" target="_blank" rel="noopener">地図で開く</a></p>' + plainList(h.points, "ht-" + i) + "</div></details>";
      }).join("") +
      '<details class="card" id="ht-common" open><summary>全ホテル共通の注意</summary>' + plainList(T.hotelCommon, "htc") + "</details>";
  }

  function credits() {
    return '<details class="card" id="tool-credits"><summary>📷 写真クレジット</summary><div class="plain"><p class="muted small">背景や各ページの写真は、Wikimedia Commons の作品を、リサイズして使用しています。</p>' +
      (P.credits || []).map(function (c) {
        var lic = c.licenseUrl ? '<a href="' + esc(c.licenseUrl) + '" target="_blank" rel="noopener">' + esc(c.license) + "</a>" : esc(c.license);
        return '<div class="cr"><b>' + esc(cap(c.file)) + '</b><div class="muted small">撮影：' + esc(c.artist) + "｜" + lic + '｜<a href="' + esc(c.page) + '" target="_blank" rel="noopener">元の写真</a></div></div>';
      }).join("") + '<div class="cr"><b>地図</b><div class="muted small">地図の画像・お店のデータ：© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors（ODbL）｜地図の部品：<a href="https://leafletjs.com/" target="_blank" rel="noopener">Leaflet</a>（BSD-2-Clause）</div></div></div></details>';
  }

  function tool() {
    var rate = store.get("rate", ""), emg = store.get("emg", ""), memo = store.get("memo", ""), b = bus();
    // 一番上は、英語（翻訳・よく使う英語カード）
    var html = (window.TripEnglish ? window.TripEnglish.html() : "") + '<div class="card" id="tool-my"><h3>マイ情報</h3><div class="muted small">この端末のブラウザにだけ保存され、公開されません。</div>' +
      '<label class="lb">11/19のバス</label><div class="seg" id="busSeg2">' + ["1", "2", "3"].map(function (n) { return '<button data-bus="' + n + '" class="' + (b === n ? "on" : "") + '">バス' + n + "</button>"; }).join("") + "</div>" +
      '<label class="lb">緊急連絡先（先生・学校の番号などを自分で入力）</label><textarea id="emg" placeholder="例：引率の先生の連絡先、緊急時電話番号">' + esc(emg) + "</textarea>" +
      '<label class="lb">メモ（部屋番号・Wi-Fiなど）</label><textarea id="memo">' + esc(memo) + "</textarea></div>";
    html += '<div class="card" id="tool-tip"><h3>チップ・金額計算</h3><label class="lb">食事代（$）</label><input type="number" id="meal" inputmode="decimal" placeholder="例：32.50">' +
      '<div class="seg" id="tipSeg" style="margin-top:8px"><button data-p="15">15%</button><button data-p="18" class="on">18%</button><button data-p="20">20%</button></div>' +
      '<p id="tipOut" class="big">—</p><div class="muted small">レストランでは食事代の約18%。ファストフードやスーパーは不要。</div>' +
      '<label class="lb">今日のレート（1ドル＝何円）</label><input type="number" id="rate" inputmode="decimal" placeholder="例：150" value="' + esc(rate) + '">' +
      '<label class="lb">ドル → 円</label><input type="number" id="usd" inputmode="decimal" placeholder="$"><p id="yenOut" class="big">—</p></div>';
    html += '<div class="card" id="tool-time"><h3>時差</h3><p>日本 − カリフォルニア ＝ <b>17時間</b>（11月は夏時間が終わっているため）。日本の時刻から17時間戻すとカリフォルニアの時刻。</p><div id="clock" class="big" style="font-size:1.1rem"></div></div>';
    return html + credits();
  }

  function bindTool() {
    var tip = 18;
    function calc() {
      var m = parseFloat(document.getElementById("meal").value);
      document.getElementById("tipOut").textContent = isNaN(m) ? "—" : "チップ $" + (m * tip / 100).toFixed(2) + "　合計 $" + (m * (1 + tip / 100)).toFixed(2);
      var r = parseFloat(document.getElementById("rate").value), u = parseFloat(document.getElementById("usd").value);
      document.getElementById("yenOut").textContent = (isNaN(r) || isNaN(u)) ? "—" : "約 " + Math.round(r * u).toLocaleString("ja-JP") + " 円";
    }
    document.getElementById("tipSeg").addEventListener("click", function (e) {
      var p = e.target.getAttribute("data-p"); if (!p) return; tip = +p;
      [].forEach.call(this.children, function (c) { c.classList.toggle("on", c === e.target); }); calc();
    });
    ["meal", "rate", "usd"].forEach(function (id) { document.getElementById(id).addEventListener("input", function () { if (id === "rate") store.set("rate", this.value); calc(); }); });
    document.getElementById("emg").addEventListener("input", function () { store.set("emg", this.value); });
    document.getElementById("memo").addEventListener("input", function () { store.set("memo", this.value); });
    function clock() {
      var el = document.getElementById("clock"); if (!el) return;
      var f = function (tz) { return new Date().toLocaleString("ja-JP", { timeZone: tz, month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" }); };
      el.innerHTML = '<div class="muted small">日本</div>' + f("Asia/Tokyo") + '<div class="muted small">カリフォルニア</div>' + f("America/Los_Angeles");
    }
    clock(); clearInterval(window.__clk); window.__clk = setInterval(clock, 30000);
    calc();
  }

  /* ---------- タブ切り替え・移動 ---------- */
  var tabs = { home: home, plan: plan, prep: prep, rule: rule, hotel: hotel, map: function () { return window.TripMap.html() + window.TripNearby.html(); }, tool: tool };
  var cur = store.get("tab", "home");

  // 指定した場所まで移動し、閉じている項目は開いて、少し光らせる
  function focusEl(el) {
    var d = el.closest("details");
    while (d) { d.open = true; d = d.parentElement && d.parentElement.closest("details"); }
    setTimeout(function () {
      el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: el.tagName === "DETAILS" ? "start" : "center" });
      el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
      setTimeout(function () { el.classList.remove("flash"); }, 2800);
    }, 60);
  }

  function go(name, still, focusId) {
    if (!tabs[name]) name = "home";
    if (name !== "plan") previewBus = null;
    cur = name; store.set("tab", name);
    view.classList.toggle("still", !!still); // 再描画のときは、ふわっと表示を繰り返さない
    view.innerHTML = tabs[name]();
    if (name === "tool") bindTool();
    if (name === "map") { window.TripMap.bind(); window.TripNearby.bind(); } else window.TripMap.stop();

    var el = focusId ? document.getElementById(focusId) : null;
    if (el) focusEl(el); else window.scrollTo(0, 0);
  }

  function refresh() {
    var y = window.scrollY;
    var opened = [].map.call(view.querySelectorAll("details"), function (d) { return d.open; });
    go(cur, true);
    [].forEach.call(view.querySelectorAll("details"), function (d, i) { if (opened[i]) d.open = true; }); // 開いていた項目はそのまま
    window.scrollTo(0, y);
  }

  // 検索結果から呼ばれる。他のバスの予定は、自分のバスの設定を変えずに表示する
  function openTarget(t) {
    previewBus = (t.tab === "plan" && t.bus && t.bus !== bus()) ? t.bus : null;
    go(t.tab, false, t.id);
  }

  /* ---------- 目次（右上の≡）。ページを押すと、そのタブへ移動する ---------- */
  function menuData() {
    return [
      { tab: "home", icon: "🏠", name: "ホーム" },
      { tab: "plan", icon: "🗓", name: "日程" },
      { tab: "prep", icon: "✅", name: "準備" },
      { tab: "rule", icon: "📖", name: "ルール" },
      { tab: "hotel", icon: "🏨", name: "ホテル" },
      { tab: "map", icon: "🗺", name: "地図" },
      { tab: "tool", icon: "🧰", name: "便利" }
    ];
  }

  var menuEl = null, menuBtn = document.getElementById("menuBtn");
  function menuOpen() {
    if (!menuEl) {
      menuEl = document.createElement("div");
      menuEl.id = "menu";
      menuEl.innerHTML = '<div class="mback" data-mclose="1"></div><aside class="mpanel" role="dialog" aria-label="目次"><div class="mhead"><b>目次</b><button type="button" data-mclose="1" aria-label="閉じる">✕</button></div><div class="mbody"></div></aside>';
      document.body.appendChild(menuEl);
      menuEl.addEventListener("click", function (e) {
        if (e.target.closest("[data-mclose]")) { menuClose(); return; }
        var b = e.target.closest("[data-mtab]"); if (!b) return;
        var tab = b.getAttribute("data-mtab");
        menuClose();
        previewBus = null;
        go(tab);
      });
    }
    menuEl.querySelector(".mbody").innerHTML = menuData().map(function (s) {
      return '<div class="msec' + (s.tab === cur ? " on" : "") + '"><button type="button" class="mtab" data-mtab="' + s.tab + '"><span>' + s.icon + "</span>" + esc(s.name) + "</button></div>";
    }).join("");
    menuEl.classList.add("open");
    menuBtn.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  }
  function menuClose() {
    if (!menuEl) return;
    menuEl.classList.remove("open");
    menuBtn.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }
  menuBtn.addEventListener("click", function () { if (menuEl && menuEl.classList.contains("open")) menuClose(); else menuOpen(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") menuClose(); });

  view.addEventListener("click", function (e) {
    if (e.target.closest("[data-add]")) { e.preventDefault(); addMine(); return; }
    var dl = e.target.closest("[data-del]");
    if (dl) {
      var arr = store.get("mine", []), di = +dl.getAttribute("data-del");
      if (arr[di] && confirm("「" + arr[di].t + "」を削除しますか？")) { arr.splice(di, 1); store.set("mine", arr); refresh(); }
      return;
    }
    var g = e.target.closest("[data-go]");
    if (g) { e.preventDefault(); go(g.getAttribute("data-go")); return; }
    var d = e.target.closest("[data-day]");
    if (d) { e.preventDefault(); go("plan", false, "day-" + d.getAttribute("data-day")); return; }
    var pv = e.target.closest("[data-preview]");
    if (pv) { e.preventDefault(); previewBus = null; refresh(); return; }
    var bb = e.target.closest("[data-bus]");
    if (bb) { previewBus = null; store.set("bus", bb.getAttribute("data-bus")); refresh(); }
  });
  view.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.isComposing && e.keyCode !== 229 && e.target.id === "mine-in") { e.preventDefault(); addMine(); }
  });
  view.addEventListener("change", function (e) {
    var m = e.target.getAttribute && e.target.getAttribute("data-m");
    if (m !== null && m !== undefined) {
      var arr = store.get("mine", []);
      if (arr[+m]) { arr[+m].d = e.target.checked; store.set("mine", arr); refresh(); }
      return;
    }
    var k = e.target.getAttribute && e.target.getAttribute("data-k");
    if (k) { store.set("c:" + k, e.target.checked); refresh(); }
  });
  document.getElementById("bgBtn").addEventListener("click", function () { Bg.manual(); });

  // 残り時間を、画面を開いたまま自動で更新する。予定の時刻を過ぎたら、次の予定に切り替える
  function tick() {
    if (cur !== "home") return;
    var el = document.getElementById("nx-cd");
    if (!el) return;
    var left = +el.getAttribute("data-ts") - Date.now();
    if (left <= 0) { refresh(); return; }
    el.textContent = leftText(left);
  }
  setInterval(tick, 15000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) tick(); });

  Bg.init();
  go(cur);
  if (window.TripSearch) window.TripSearch.init({ open: openTarget, button: document.getElementById("srchBtn") });
  if (window.TripMap) window.TripMap.init(function () { previewBus = null; go("map"); });
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () { /* オフライン対応なしで動作 */ });
})();
