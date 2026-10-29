/* ---------- 保護者用の画面：学生が共有した、最新の位置を見る ---------- */
(function () {
  var CFG = window.TRIP_SHARE || {};
  var T = window.TRIP || { days: [] };
  var view = document.getElementById("view");
  var token = (location.hash || "").replace(/^#/, "");
  var map = null, marker = null, circle = null, first = true, touched = false, timer = null, lastPub = null, state = "loading";

  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  function pad(n) { return ("0" + n).slice(-2); }
  function clock(ts, tz) { return new Date(ts).toLocaleTimeString("ja-JP", { timeZone: tz, hour: "2-digit", minute: "2-digit" }); }
  function ago(ms) {
    var m = Math.floor(ms / 60000);
    if (m < 1) return "いま";
    if (m < 60) return m + "分前";
    var h = Math.floor(m / 60);
    return h < 24 ? h + "時間" + (m % 60 ? (m % 60) + "分" : "") + "前" : Math.floor(h / 24) + "日前";
  }

  function frame() {
    view.innerHTML = '<div class="card mapcard"><div id="wmap" role="application" aria-label="位置の地図"></div></div>' +
      '<div class="card" id="winfo"></div>' +
      '<div class="card" id="wplan"></div>' +
      '<div class="card"><p class="muted small">この画面は、学生が共有した、<b>最新の1点</b>だけを表示します（移動の履歴は残りません）。学生のアプリを開いている間だけ、位置が更新されます。このURLは、他の人に転送しないでください。</p></div>';
    map = L.map("wmap", { zoomControl: true }).setView([37.7749, -122.4194], 11);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap contributors" }).addTo(map);
    map.on("dragstart zoomstart", function (e) { if (e && e.originalEvent) touched = true; });
    map.on("mousedown touchstart", function () { touched = true; });
  }

  function planCard() {
    var el = document.getElementById("wplan"); if (!el) return;
    var today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
    var d = (T.days || []).filter(function (x) { return x.date === today; })[0];
    if (!d) { el.hidden = true; return; }
    el.hidden = false;
    var h = "<h3>今日の予定（Day " + d.n + "｜" + esc(d.label) + "）</h3>";
    if (d.buses) h += '<p class="muted small">この日は、バスごとに予定が違います。</p>';
    else h += (d.items || []).map(function (it) { return '<div class="row' + (it.hot ? " hot" : "") + '"><div class="time">' + esc(it.t) + "</div><div>" + esc(it.e) + "</div></div>"; }).join("");
    h += '<p class="muted small">予定の時刻は現地（カリフォルニア）の時刻です。日本時間の予定には、そのまま日本の時刻が出ています。訪問先の都合や天候で変わることがあります。</p>';
    el.innerHTML = h;
  }

  function paint() {
    var el = document.getElementById("winfo"); if (!el) return;
    var p = lastPub, now = Date.now(), h = "";
    if (state === "none") { el.innerHTML = '<h3>見られません</h3><p>このURLは、無効か、共有が終わっています。学生に、新しいURLを送ってもらってください。</p>'; return; }
    if (state === "off") { el.innerHTML = '<h3>共有の準備中です</h3><p class="muted">サーバーの設定が済むと、ここに位置が出ます。</p>'; return; }
    if (state === "error") { el.innerHTML = '<h3>読み込めませんでした</h3><p class="muted">電波を確認してください。自動で、もう一度試します。</p>'; return; }
    if (!p) { el.innerHTML = '<p class="muted">読み込んでいます…</p>'; return; }
    var ended = (p.exp && now > p.exp);
    var name = p.name ? esc(p.name) : "研修中の学生";
    var age = now - p.t;
    var status = ended ? "共有は終了しました" : p.on === false ? "共有を停止中" : (age > 5 * 60000 ? "しばらく更新がありません" : "共有中");
    var cls = ended || p.on === false ? "wst off" : age > 5 * 60000 ? "wst warn" : "wst ok";
    h += '<h3>' + name + '</h3><div class="' + cls + '">' + status + "</div>";
    if (p.on !== false && !ended) {
      h += '<p>最終更新：<b>' + ago(age) + "</b>（現地 " + clock(p.t, "America/Los_Angeles") + "／日本 " + clock(p.t, "Asia/Tokyo") + "）</p>";
      if (age > 5 * 60000) h += '<p class="muted small">アプリを閉じている、画面が消えている、または電波がない可能性があります。位置は、アプリを開いている間だけ更新されます。</p>';
      if (p.la !== undefined && p.lo !== undefined) {
        h += '<p class="muted small">位置の誤差：約' + (p.ac || 0) + 'm</p><p><a class="btn" target="_blank" rel="noopener" href="https://www.google.com/maps?q=' + p.la + "," + p.lo + '">Googleマップで開く</a> ' +
          '<a class="btn" target="_blank" rel="noopener" href="https://maps.apple.com/?ll=' + p.la + "," + p.lo + '&q=' + encodeURIComponent("研修中の位置") + '">マップ（iPhone）で開く</a></p>';
      } else h += '<p class="muted small">まだ位置が届いていません。</p>';
    }
    if (p.ok) h += '<div class="wok">無事です（' + ago(now - p.ok) + "｜現地 " + clock(p.ok, "America/Los_Angeles") + "／日本 " + clock(p.ok, "Asia/Tokyo") + "）</div>";
    else h += '<p class="muted small">「無事です」は、まだ届いていません。</p>';
    h += '<p class="muted small">いまの時刻　現地 ' + clock(now, "America/Los_Angeles") + "／日本 " + clock(now, "Asia/Tokyo") + "</p>";
    el.innerHTML = h;
  }

  function draw() {
    var p = lastPub;
    if (!map || !p || p.on === false || (p.exp && Date.now() > p.exp) || p.la === undefined) {
      if (marker) { map.removeLayer(marker); marker = null; }
      if (circle) { map.removeLayer(circle); circle = null; }
      return;
    }
    var ll = [p.la, p.lo];
    if (!marker) marker = L.circleMarker(ll, { radius: 9, weight: 3, color: "#fff", fillColor: "#ef4444", fillOpacity: 1 }).addTo(map); else marker.setLatLng(ll);
    if (!circle) circle = L.circle(ll, { radius: p.ac || 30, weight: 1, color: "#ef4444", fillOpacity: 0.12 }).addTo(map); else { circle.setLatLng(ll); circle.setRadius(p.ac || 30); }
    if (first || !touched) { map.setView(ll, first ? 16 : map.getZoom()); first = false; }
  }

  function load() {
    if (!CFG.db) { state = "off"; paint(); return; }
    var url = CFG.db.replace(/\/$/, "") + "/share/" + token + "/pub.json";
    fetch(url, { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); }).then(function (j) {
      if (!j) { state = "none"; lastPub = null; } else { state = "ok"; lastPub = j; }
      paint(); draw();
    }).catch(function () { if (!lastPub) state = "error"; paint(); });
  }

  function start() {
    if (!/^[A-Za-z0-9_-]{32}$/.test(token)) { view.innerHTML = '<div class="card"><h3>URLが正しくありません</h3><p>学生から送られた、URLか、QRコードを、もう一度開いてください。</p></div>'; return; }
    frame(); planCard(); paint(); load();
    timer = setInterval(function () { if (!document.hidden) { load(); planCard(); } else paint(); }, 10000);
    setInterval(paint, 30000);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) load(); });
  }
  start();
})();
