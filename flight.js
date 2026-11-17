// 飛行機の遅れ・早まり・欠航のお知らせ枠（ホームの「次の予定」の枠の上に出す）。
// GitHub Actions が定期的に便の状況を調べて flight-status.json（flight-data ブランチ）に書き出す。ここではそれを読んで表示するだけ。
// 表示は必ず1行。枠に収まるときは止めて表示し、収まらないときは電光掲示板のように流す（押している間は止まる）。
(function () {
  "use strict";
  var URL_ = window.TRIP_FLIGHT_URL || "https://raw.githubusercontent.com/RIU11/overseas-training-app/flight-data/flight-status.json";
  var KEY = "trip:flight";
  var st = { d: null, ts: 0, busy: false };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  try { var saved = JSON.parse(localStorage.getItem(KEY) || "null"); if (saved && saved.d) { st.d = saved.d; st.ts = saved.ts || 0; } } catch (e) { /* 保存できない環境では無視 */ }

  // 今出すお知らせ（期限内で、ふつう以外のもの）
  function notices() {
    var list = (st.d && st.d.flights) || [], now = Date.now();
    return list.filter(function (f) { return f && f.text && f.state && f.state !== "ontime" && (!f.until || Date.parse(f.until) > now); });
  }
  function checkedText() {
    var c = st.d && st.d.checked ? new Date(st.d.checked) : null;
    if (!c || isNaN(c)) return "";
    return c.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) + "（日本時間）時点";
  }

  function html() { return '<div id="fltbox" hidden></div>'; }

  function render() {
    var box = document.getElementById("fltbox"); if (!box) return;
    var ns = notices();
    if (!ns.length) { box.hidden = true; box.innerHTML = ""; return; }
    box.hidden = false;
    box.innerHTML = ns.map(function (f) {
      return '<div class="flt ' + esc(f.state) + '" title="' + esc(f.text) + '"><span class="fltl">✈ ' + esc(f.label || "") + "</span>" +
        '<div class="fltv"><span class="fltt">' + esc(f.text) + "</span></div></div>";
    }).join("") + '<div class="fltc">' + esc(checkedText()) + "（航空会社の発表で変わることがあります。先生の指示を優先）</div>";
    fit(box);
  }

  // 1行に収まるかを実際の幅で調べて、収まらないものだけ流す
  function fit(box) {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    [].forEach.call(box.querySelectorAll(".fltv"), function (v) {
      var t = v.firstChild; if (!t) return;
      v.classList.remove("run", "cut"); t.style.animationDuration = ""; t.style.removeProperty("--fw");
      var vw = v.clientWidth, tw = t.scrollWidth;
      if (!vw || tw <= vw + 1) return; // 収まる：止めて表示
      if (reduce) { v.classList.add("cut"); return; } // 動きを減らす設定：止めて「…」で省略
      t.style.setProperty("--fw", vw + "px");
      t.style.animationDuration = Math.max(6, (vw + tw) / 55) + "s"; // 1秒に約55px
      v.classList.add("run");
    });
  }

  function load(force) {
    if (st.busy) return;
    if (!force && st.d && Date.now() - st.ts < 120000) { render(); return; }
    st.busy = true;
    fetch(URL_ + (URL_.indexOf("?") < 0 ? "?" : "&") + "t=" + Math.floor(Date.now() / 60000), { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
      .then(function (j) {
        st.d = j; st.ts = Date.now();
        try { localStorage.setItem(KEY, JSON.stringify({ d: j, ts: st.ts })); } catch (e) { /* 無視 */ }
      })
      .catch(function () { /* 取れなければ前回の分を出す */ })
      .then(function () { st.busy = false; render(); });
  }

  var timer = null, bound = false;
  function bind() {
    render(); load(false);
    if (!timer) timer = setInterval(function () { if (!document.hidden && document.getElementById("fltbox")) load(true); }, 180000);
    if (!bound) {
      bound = true;
      var re = null;
      window.addEventListener("resize", function () { clearTimeout(re); re = setTimeout(function () { var b = document.getElementById("fltbox"); if (b && !b.hidden) fit(b); }, 200); });
      document.addEventListener("visibilitychange", function () { if (!document.hidden && document.getElementById("fltbox")) load(false); });
      // 押している間は止める（読み切れないとき用）
      var hold = function (on) { return function (e) { var v = e.target.closest && e.target.closest(".fltv"); if (on && v) v.classList.add("hold"); if (!on) [].forEach.call(document.querySelectorAll(".fltv.hold"), function (x) { x.classList.remove("hold"); }); }; };
      document.addEventListener("pointerdown", hold(true));
      ["pointerup", "pointercancel"].forEach(function (t) { document.addEventListener(t, hold(false)); });
    }
  }

  window.TripFlight = { html: html, bind: bind, render: render };
})();
