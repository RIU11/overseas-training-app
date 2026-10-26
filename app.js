(function () {
  "use strict";
  var T = window.TRIP;
  var view = document.getElementById("view");
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem("trip:" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem("trip:" + k, JSON.stringify(v)); } catch (e) { /* 保存できない環境では無視 */ } }
  };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var pad = function (n) { return n < 10 ? "0" + n : "" + n; };
  var todayStr = function () { var d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
  var bus = function () { return store.get("bus", ""); };

  function dayItems(day) {
    if (day.buses) {
      var b = bus();
      if (b && day.buses[b]) return { name: day.buses[b].name, sub: day.buses[b].sub, items: day.buses[b].items };
      return null;
    }
    return { items: day.items };
  }

  function parseStart(t) {
    var m = /^(\d{1,2}):(\d{2})/.exec(t);
    return m ? +m[1] * 60 + +m[2] : null;
  }

  function rows(items, nowMin) {
    var nextIdx = -1;
    if (nowMin !== null) {
      for (var i = 0; i < items.length; i++) { var s = parseStart(items[i].t); if (s !== null && s >= nowMin) { nextIdx = i; break; } }
    }
    return items.map(function (it, i) {
      return '<div class="row' + (it.hot ? " hot" : "") + (i === nextIdx ? " now" : "") + '"><div class="time">' + esc(it.t) +
        '</div><div>' + esc(it.e) + (it.tag ? '<span class="tag">' + esc(it.tag) + "</span>" : "") + (i === nextIdx ? '<span class="tag">次</span>' : "") + "</div></div>";
    }).join("");
  }

  function countdown() {
    var diff = new Date(T.start).getTime() - Date.now();
    if (diff <= 0) return null;
    var d = Math.floor(diff / 864e5), h = Math.floor(diff % 864e5 / 36e5);
    return d + "日" + h + "時間";
  }

  function home() {
    var today = todayStr(), cd = countdown();
    var cur = T.days.filter(function (d) { return d.date === today; })[0];
    var html = "";
    if (cur) {
      var now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes();
      var di = dayItems(cur);
      html += '<div class="card"><div class="muted">今日 ' + esc(cur.label) + "｜Day " + cur.n + "｜" + esc(cur.area) + "</div>";
      if (cur.note) html += '<p class="muted">' + esc(cur.note) + "</p>";
      if (di) html += (di.name ? "<b>" + esc(di.name) + "</b>" : "") + rows(di.items, nowMin);
      else html += '<p>この日はバスごとに予定が違います。<a href="#" data-go="tool">便利タブの「マイ情報」</a>でバスを選んでください。</p>';
      html += "</div>";
    } else if (cd) {
      html += '<div class="card"><div class="muted">出発まであと</div><div class="big">' + cd + '</div><div class="muted">11/17（火）15:30 関西空港 第1ターミナル4階 Cカウンター前に集合</div></div>';
    } else {
      html += '<div class="card"><h3>おつかれさまでした！</h3><p class="muted">帰国後アンケートの回答を忘れずに。</p></div>';
    }
    var all = T.tasks.length, done = T.tasks.filter(function (t) { return store.get("c:" + t.id, false); }).length;
    html += '<div class="card"><h3>出発前のやること</h3><div class="bar"><i style="width:' + Math.round(done / all * 100) + '%"></i></div><div class="muted">' + done + " / " + all + ' 完了　<a href="#" data-go="prep">準備タブへ</a></div></div>';
    html += '<div class="warn">⚠️ パスポートの原本・ESTAの控え・赤いジップロックは<b>手荷物</b>に。スーツケースには入れない。</div>';
    html += '<div class="card"><h3>大事なポイント</h3><ul class="pl"><li>出発は<b>関西空港</b>、帰国は<b>伊丹空港</b>（到着空港が違う）</li><li>点呼のあとはホテルから出ない／一人で行動しない</li><li>研修中は飲酒・喫煙は厳禁</li><li>カードしか使えない店が多い（$20札以下の現金も少し）</li></ul></div>';
    return html;
  }

  function plan() {
    var b = bus(), today = todayStr();
    return '<div class="card"><b>11/19のバス</b><div class="seg" id="busSeg">' +
      ["1", "2", "3"].map(function (n) { return '<button data-bus="' + n + '" class="' + (b === n ? "on" : "") + '">バス' + n + "</button>"; }).join("") +
      "</div></div>" +
      T.days.map(function (d) {
        var open = d.date === today ? " open" : "";
        var di = dayItems(d), body = "";
        if (d.note) body += '<p class="muted">' + esc(d.note) + "</p>";
        if (d.buses) {
          if (di) body += "<b>" + esc(di.name) + '</b><div class="muted small">' + esc(di.sub) + "</div>" + rows(di.items, null);
          else body += '<div class="muted">上のボタンでバスを選ぶと表示されます。</div>';
          if (d.tip) body += '<div class="warn">' + esc(d.tip) + "</div>";
        } else body += rows(d.items, null);
        body += '<p class="muted small">' + esc(d.meal) + "</p>";
        return '<details class="card"' + open + "><summary>" + esc(d.label) + "　Day " + d.n + "｜" + esc(d.area) + "</summary>" + body + "</details>";
      }).join("") +
      '<p class="muted small">※訪問先の都合や天候で変更になることがあります。最新は先生の案内と学校の資料を確認してください。</p>';
  }

  function list(id, items, label) {
    var done = items.filter(function (_, i) { return store.get("c:" + id + i, false); }).length;
    return '<div class="card"><h3>' + label + '</h3><div class="muted">' + done + " / " + items.length + "</div>" +
      '<div class="bar"><i style="width:' + Math.round(done / items.length * 100) + '%"></i></div>' +
      items.map(function (t, i) {
        var on = store.get("c:" + id + i, false);
        return '<label class="chk' + (on ? " done" : "") + '"><input type="checkbox" data-k="' + id + i + '"' + (on ? " checked" : "") + "><span>" + esc(t) + "</span></label>";
      }).join("") + "</div>";
  }

  function prep() {
    var tasks = '<div class="card"><h3>出発前のやること</h3>' + T.tasks.map(function (t) {
      var on = store.get("c:" + t.id, false);
      return '<label class="chk' + (on ? " done" : "") + '"><input type="checkbox" data-k="' + t.id + '"' + (on ? " checked" : "") + "><span>" + esc(t.t) + '<em class="due">' + esc(t.due) + "</em></span></label>";
    }).join("") + "</div>";
    return tasks + list("pc", T.pack.carry, "機内に持ち込む手荷物") + list("ps", T.pack.suit, "預けるスーツケース") +
      '<div class="card"><h3>荷物のルール</h3><ul class="pl">' + T.baggage.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>";
  }

  function rule() {
    return T.rules.map(function (r) {
      return '<details class="card"><summary>' + esc(r.h) + '</summary><ul class="pl">' + r.p.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></details>";
    }).join("") +
      '<details class="card"><summary>お金・チップ・カード</summary><ul class="pl">' + T.money.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></details>" +
      '<details class="card"><summary>スマホ・Wi-Fi・eSIM</summary><ul class="pl">' + T.phones.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></details>";
  }

  function hotel() {
    return T.hotels.map(function (h) {
      var map = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(h.name + " " + h.addr);
      return '<details class="card"><summary>' + esc(h.area) + "</summary><b>" + esc(h.name) + '</b><div class="muted">' + esc(h.addr) + '</div><div class="muted">Tel ' + esc(h.tel) + '</div><p><a href="' + map + '" target="_blank" rel="noopener">地図で開く</a></p><ul class="pl">' +
        h.points.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></details>";
    }).join("") +
      '<details class="card" open><summary>全ホテル共通の注意</summary><ul class="pl">' + T.hotelCommon.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></details>";
  }

  function tool() {
    var rate = store.get("rate", ""), emg = store.get("emg", ""), memo = store.get("memo", ""), b = bus();
    var html = '<div class="card"><h3>マイ情報</h3><div class="muted small">この端末のブラウザにだけ保存され、公開されません。</div>' +
      '<label class="lb">11/19のバス</label><div class="seg" id="busSeg2">' + ["1", "2", "3"].map(function (n) { return '<button data-bus="' + n + '" class="' + (b === n ? "on" : "") + '">バス' + n + "</button>"; }).join("") + "</div>" +
      '<label class="lb">緊急連絡先（先生・学校の番号などを自分で入力）</label><textarea id="emg" placeholder="例：引率の先生の連絡先、緊急時電話番号">' + esc(emg) + "</textarea>" +
      '<label class="lb">メモ（部屋番号・Wi-Fiなど）</label><textarea id="memo">' + esc(memo) + "</textarea></div>";
    html += '<div class="card"><h3>チップ・金額計算</h3><label class="lb">食事代（$）</label><input type="number" id="meal" inputmode="decimal" placeholder="例：32.50">' +
      '<div class="seg" id="tipSeg" style="margin-top:8px"><button data-p="15">15%</button><button data-p="18" class="on">18%</button><button data-p="20">20%</button></div>' +
      '<p id="tipOut" class="big">—</p><div class="muted small">レストランでは食事代の約18%。ファストフードやスーパーは不要。</div>' +
      '<label class="lb">今日のレート（1ドル＝何円）</label><input type="number" id="rate" inputmode="decimal" placeholder="例：150" value="' + esc(rate) + '">' +
      '<label class="lb">ドル → 円</label><input type="number" id="usd" inputmode="decimal" placeholder="$"><p id="yenOut" class="big">—</p></div>';
    html += '<div class="card"><h3>使える英語</h3>' + T.phrases.map(function (p) {
      return '<div class="ph"><b>' + esc(p.en) + '</b><span class="muted">' + esc(p.ja) + "</span>" + (p.ans ? '<div>→ <b>' + esc(p.ans) + "</b></div>" : "") + "</div>";
    }).join("") + '<p class="muted small">' + esc(T.customs) + "</p></div>";
    html += '<div class="card"><h3>時差</h3><p>日本 − カリフォルニア ＝ <b>17時間</b>（11月は夏時間が終わっているため）。日本の時刻から17時間戻すとカリフォルニアの時刻。</p><div id="clock" class="big"></div></div>';
    return html;
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

  var tabs = { home: home, plan: plan, prep: prep, rule: rule, hotel: hotel, tool: tool };
  var cur = store.get("tab", "home");
  function go(name) {
    if (!tabs[name]) name = "home";
    cur = name; store.set("tab", name);
    view.innerHTML = tabs[name]();
    [].forEach.call(document.querySelectorAll("#tabs button"), function (b) { b.classList.toggle("on", b.getAttribute("data-tab") === name); });
    if (name === "tool") bindTool();
    window.scrollTo(0, 0);
  }

  document.getElementById("tabs").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (b) go(b.getAttribute("data-tab"));
  });
  view.addEventListener("click", function (e) {
    var g = e.target.closest("[data-go]");
    if (g) { e.preventDefault(); go(g.getAttribute("data-go")); return; }
    var bb = e.target.closest("[data-bus]");
    if (bb) { store.set("bus", bb.getAttribute("data-bus")); var y = window.scrollY; go(cur); window.scrollTo(0, y); }
  });
  view.addEventListener("change", function (e) {
    var k = e.target.getAttribute && e.target.getAttribute("data-k");
    if (k) { store.set("c:" + k, e.target.checked); var y = window.scrollY; go(cur); window.scrollTo(0, y); }
  });

  document.getElementById("themeBtn").addEventListener("click", function () {
    var dark = document.documentElement.getAttribute("data-theme") === "dark" || (!document.documentElement.getAttribute("data-theme") && matchMedia("(prefers-color-scheme: dark)").matches);
    var n = dark ? "light" : "dark"; document.documentElement.setAttribute("data-theme", n); store.set("theme", n);
  });
  var th = store.get("theme", ""); if (th) document.documentElement.setAttribute("data-theme", th);

  go(cur);
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () { /* オフライン対応なしで動作 */ });
})();
