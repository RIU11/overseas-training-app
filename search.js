// 検索：日程・準備・ルール・ホテル・英語をまとめて検索し、結果をタップすると該当の場所へ移動する
(function () {
  "use strict";
  var T = window.TRIP;
  if (!T) return;

  var CAT = { plan: "日程", prep: "準備", rule: "ルール", hotel: "ホテル", tool: "便利" };
  var SUGGEST = ["チップ", "Wi-Fi", "パスポート", "充電", "両替", "集合", "薬", "ディズニー", "洗濯", "点呼"];
  var PAGE = 40;

  /* ---------- 文字の正規化 ----------
     全角/半角・大文字/小文字・カタカナ/ひらがな・記号や空白の違いを無視して探す
     （例：「Ｗｉ-Ｆｉ」「wifi」「ちっぷ」「チップ」が、それぞれ一致する） */
  var DROP = /[\s・\-‐‑−–—_\/／、。,，.()（）「」『』:：]/;
  function foldMap(s) {
    var out = "", map = [];
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      if (ch.normalize) ch = ch.normalize("NFKC");
      ch = ch.toLowerCase();
      for (var j = 0; j < ch.length; j++) {
        var c = ch.charAt(j), code = c.charCodeAt(0);
        if (code >= 0x30A1 && code <= 0x30F6) c = String.fromCharCode(code - 0x60);
        if (DROP.test(c)) continue;
        out += c; map.push(i);
      }
    }
    return { t: out, map: map };
  }
  function fold(s) { return foldMap(String(s)).t; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function uniq(a) { return a.filter(function (x, i) { return x && a.indexOf(x) === i; }); }

  /* ---------- 言い換え（ひらがなで入力しても、漢字の項目が見つかるように） ---------- */
  var SYN = {};
  function group(words) {
    var f = words.map(fold);
    f.forEach(function (w) { SYN[w] = uniq((SYN[w] || []).concat(f.filter(function (x) { return x !== w; }))); });
  }
  group(["携帯", "けいたい", "スマホ", "すまほ"]);
  group(["充電", "じゅうでん", "バッテリー", "ばってりー"]);
  group(["トイレ", "お手洗い", "おてあらい", "restroom", "toilet"]);
  group(["薬", "くすり", "常備薬"]);
  group(["鍵", "かぎ", "key"]);
  group(["空港", "くうこう", "airport"]);
  group(["集合", "しゅうごう"]);
  group(["点呼", "てんこ", "門限", "もんげん"]);
  group(["洗濯", "せんたく", "ランドリー"]);
  group(["飛行機", "ひこうき", "機内", "フライト"]);
  group(["荷物", "にもつ", "手荷物", "スーツケース"]);
  group(["朝食", "ちょうしょく", "朝ごはん", "朝ご飯", "あさごはん", "breakfast"]);
  group(["昼食", "ちゅうしょく", "昼ごはん", "昼ご飯", "ひるごはん", "lunch"]);
  group(["夕食", "ゆうしょく", "夕ごはん", "夕ご飯", "夜ごはん", "晩ごはん", "ばんごはん", "dinner"]);
  group(["チップ", "tip"]);
  group(["パスポート", "passport"]);
  group(["ホテル", "hotel", "宿"]);
  group(["両替", "りょうがえ", "現金", "げんきん", "ドル", "cash"]);
  // お金 → 関連する項目（一方向）
  ["お金", "おかね", "money"].forEach(function (w) { SYN[fold(w)] = uniq(["両替", "現金", "ドル", "チップ", "カード", "支払"].map(fold)); });

  /* ---------- 検索の対象を作る ---------- */
  var E = [];
  function add(e) {
    e.fl = fold(e.label);
    e.hay = fold([e.label, e.sub || "", e.group || "", e.extra || ""].join(" "));
    E.push(e);
  }

  function build() {
    T.days.forEach(function (d) {
      add({ cat: "plan", label: d.label + "｜" + d.area, sub: [d.note, d.tip, d.meal].filter(Boolean).join(" ／ "), meta: "日程 › Day " + d.n, id: "day-" + d.n, extra: "Day " + d.n });
      var groups = d.buses
        ? Object.keys(d.buses).map(function (k) { return { bus: k, name: d.buses[k].name, sub: d.buses[k].sub, items: d.buses[k].items }; })
        : [{ bus: "", items: d.items }];
      groups.forEach(function (g) {
        if (g.bus) {
          // どの職種がどのバスかを探せるように、バスの説明も対象にする
          add({ cat: "plan", label: g.name, sub: g.sub, meta: "日程 › " + d.label + " › バスの分かれ方", id: "day-" + d.n, bus: g.bus });
        }
        g.items.forEach(function (it, i) {
          add({
            cat: "plan", label: it.e, sub: "", meta: "日程 › " + d.label + (g.bus ? " › バス" + g.bus : "") + "　" + it.t,
            id: d.buses ? "r-" + d.n + "-b" + g.bus + "-" + i : "r-" + d.n + "-" + i, bus: g.bus, extra: (it.tag || "") + " " + it.t + (g.bus ? " バス" + g.bus : "")
          });
        });
      });
    });

    T.tasks.forEach(function (t) {
      add({ cat: "prep", label: t.t, sub: "期限：" + t.due, meta: "準備 › 出発前のやること", id: "tk-" + t.id });
    });
    T.pack.carry.forEach(function (x, i) { add({ cat: "prep", label: x, sub: "", meta: "準備 › 機内に持ち込む手荷物", id: "pc-" + i }); });
    T.pack.suit.forEach(function (x, i) { add({ cat: "prep", label: x, sub: "", meta: "準備 › 預けるスーツケース", id: "ps-" + i }); });
    T.baggage.forEach(function (x, i) { add({ cat: "prep", label: x, sub: "", meta: "準備 › 荷物のルール", id: "bg-" + i }); });

    T.rules.forEach(function (r, ri) {
      r.p.forEach(function (x, i) { add({ cat: "rule", label: x, sub: "", meta: "ルール › " + r.h, group: r.h, id: "rl-" + ri + "-" + i }); });
    });
    T.money.forEach(function (x, i) { add({ cat: "rule", label: x, sub: "", meta: "ルール › お金・チップ・カード", group: "お金", id: "rl-money-" + i }); });
    T.phones.forEach(function (x, i) { add({ cat: "rule", label: x, sub: "", meta: "ルール › スマホ・Wi-Fi・eSIM", group: "スマホ", id: "rl-phone-" + i }); });

    T.hotels.forEach(function (h, hi) {
      add({ cat: "hotel", label: h.name, sub: h.addr + " ／ Tel " + h.tel, meta: "ホテル › " + h.area, id: "ht-" + hi });
      h.points.forEach(function (x, i) { add({ cat: "hotel", label: x, sub: "", meta: "ホテル › " + h.area, group: h.area, id: "ht-" + hi + "-" + i }); });
    });
    T.hotelCommon.forEach(function (x, i) { add({ cat: "hotel", label: x, sub: "", meta: "ホテル › 全ホテル共通の注意", id: "htc-" + i }); });

    T.phrases.forEach(function (p, i) {
      add({ cat: "tool", label: p.en, sub: p.ja + (p.ans ? " → " + p.ans : ""), meta: "便利 › 使える英語", id: "ph-" + i });
    });
    if (T.customs) add({ cat: "tool", label: T.customs, sub: "", meta: "便利 › 使える英語", id: "ph-customs" });
    // 便利タブのカード（入力欄・計算など）
    add({ cat: "tool", label: "マイ情報（バス・緊急連絡先・メモ）", sub: "バスの選択、緊急連絡先、部屋番号などのメモ。この端末にだけ保存されます", meta: "便利 › マイ情報", id: "tool-my", extra: "緊急 連絡先 バス メモ 部屋番号" });
    add({ cat: "tool", label: "チップ・金額計算（ドル → 円）", sub: "食事代からチップを計算／ドルを円に換算", meta: "便利 › 計算", id: "tool-tip", extra: "レート 為替 計算 tip" });
    add({ cat: "tool", label: "時差（日本とカリフォルニア）", sub: "日本 − カリフォルニア ＝ 17時間。それぞれの現在時刻も表示", meta: "便利 › 時差", id: "tool-time", extra: "時計 時間" });
    add({ cat: "tool", label: "写真クレジット", sub: "背景や各ページの写真の撮影者とライセンス", meta: "便利 › 写真クレジット", id: "tool-credits", extra: "著作権 ライセンス" });
  }

  /* ---------- 検索 ---------- */
  function search(q) {
    var toks = q.trim().split(/\s+/).filter(Boolean).slice(0, 6);
    var tk = toks.map(function (t) {
      var f = fold(t);
      return uniq([f].concat(SYN[f] || []));
    }).filter(function (a) { return a.length; });
    if (!tk.length) return { hits: [], tk: [] };
    var hits = [];
    E.forEach(function (e, idx) {
      var score = 0;
      for (var i = 0; i < tk.length; i++) {
        var best = 0;
        for (var j = 0; j < tk[i].length; j++) {
          var a = tk[i][j];
          if (e.hay.indexOf(a) < 0) continue;
          var p = e.fl.indexOf(a);
          best = Math.max(best, p === 0 ? 4 : p > 0 ? 3 : 1); // 見出しの先頭 > 見出しの中 > それ以外
        }
        if (!best) return; // すべての言葉を含む項目だけ残す
        score += best;
      }
      hits.push({ e: e, score: score, idx: idx });
    });
    hits.sort(function (a, b) { return b.score - a.score || a.idx - b.idx; });
    return { hits: hits, tk: tk };
  }

  // 一致した部分に印をつける（記号などを無視して一致した場合も、元の文字の位置で示す）
  function hl(text, alts) {
    var m = foldMap(text), ranges = [];
    alts.forEach(function (a) {
      var from = 0, p;
      while ((p = m.t.indexOf(a, from)) >= 0) { ranges.push([m.map[p], m.map[p + a.length - 1]]); from = p + a.length; }
    });
    if (!ranges.length) return esc(text);
    ranges.sort(function (x, y) { return x[0] - y[0]; });
    var merged = [ranges[0].slice()];
    for (var i = 1; i < ranges.length; i++) {
      var last = merged[merged.length - 1];
      if (ranges[i][0] <= last[1] + 1) last[1] = Math.max(last[1], ranges[i][1]); else merged.push(ranges[i].slice());
    }
    var out = "", pos = 0;
    merged.forEach(function (r) {
      out += esc(text.slice(pos, r[0])) + "<mark>" + esc(text.slice(r[0], r[1] + 1)) + "</mark>";
      pos = r[1] + 1;
    });
    return out + esc(text.slice(pos));
  }

  /* ---------- 画面 ---------- */
  function loadRecent() { try { return JSON.parse(localStorage.getItem("trip:recent") || "[]"); } catch (e) { return []; } }
  function saveRecent(a) { try { localStorage.setItem("trip:recent", JSON.stringify(a)); } catch (e) { /* 保存できない環境では無視 */ } }

  var api, el, input, res, current = null, shown = PAGE, isOpen = false, prevOverflow = "";

  function chips(list, icon) {
    return list.map(function (q) { return '<button type="button" class="qchip" data-q="' + esc(q) + '">' + icon + esc(q) + "</button>"; }).join("");
  }

  function renderEmpty() {
    current = null;
    var recent = loadRecent();
    res.innerHTML = '<div class="sn muted small">よく探すもの</div><div class="qrow">' + chips(SUGGEST, "") + "</div>" +
      (recent.length ? '<div class="sn muted small">最近の検索　<a href="#" data-clear="1">消す</a></div><div class="qrow">' + chips(recent, "🕘 ") + "</div>" : "") +
      '<p class="muted small sn">日程・準備・ルール・ホテル・英語をまとめて探せます。ひらがな／カタカナ／英語どれでもOK。スペースで区切ると、すべての言葉を含むものだけ表示します。</p>';
  }

  function render() {
    var q = input.value;
    if (!q.trim()) { renderEmpty(); return; }
    var r = search(q);
    current = r;
    if (!r.hits.length) {
      res.innerHTML = '<p class="sn">「' + esc(q.trim()) + '」は見つかりませんでした。</p><p class="muted small">ひらがな・カタカナ・英語など、別の言葉でも試してみてください。</p><div class="qrow">' + chips(SUGGEST, "") + "</div>";
      return;
    }
    var flat = [].concat.apply([], r.tk);
    var html = '<div class="sn muted small">' + r.hits.length + "件</div>";
    r.hits.slice(0, shown).forEach(function (h, n) {
      var e = h.e;
      html += '<button type="button" class="hit" data-n="' + n + '"><span class="hc">' + CAT[e.cat] + '</span><span class="hl">' + hl(e.label, flat) + "</span>" +
        (e.sub ? '<span class="hs">' + hl(e.sub, flat) + "</span>" : "") + '<span class="hm">' + esc(e.meta) + "</span></button>";
    });
    if (r.hits.length > shown) html += '<button type="button" class="more" data-more="1">さらに表示（残り ' + (r.hits.length - shown) + "件）</button>";
    res.innerHTML = html;
  }

  function open() {
    if (isOpen) return;
    isOpen = true;
    el.classList.add("open");
    prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    try { history.pushState({ search: 1 }, ""); } catch (e) { /* 履歴が使えない環境では無視 */ }
    input.value = ""; shown = PAGE; // 開くたびに、よく探すものと最近の検索を表示する
    render();
    setTimeout(function () { input.focus(); }, 60);
  }

  function close(fromPop) {
    if (!isOpen) return;
    isOpen = false;
    el.classList.remove("open");
    document.body.style.overflow = prevOverflow;
    input.blur();
    if (!fromPop) { try { if (history.state && history.state.search) history.back(); } catch (e) { /* 無視 */ } }
    if (api.button) api.button.focus();
  }

  function remember(q) {
    q = q.trim(); if (!q) return;
    var a = loadRecent().filter(function (x) { return x !== q; });
    a.unshift(q); saveRecent(a.slice(0, 6));
  }

  function init(a) {
    api = a || {};
    build();
    el = document.createElement("div");
    el.id = "search";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-label", "検索");
    el.innerHTML = '<div class="sbar"><input id="sq" type="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="日程・ルール・持ち物などを検索" aria-label="検索ワード">' +
      '<button type="button" id="sx" aria-label="閉じる">✕</button></div><div class="sres" id="sres"></div>';
    document.body.appendChild(el);
    input = el.querySelector("#sq");
    res = el.querySelector("#sres");

    input.addEventListener("input", function () { shown = PAGE; render(); res.scrollTop = 0; });
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); input.blur(); } }); // キーボードを閉じて結果を見やすくする
    el.querySelector("#sx").addEventListener("click", function () { close(false); });
    res.addEventListener("click", function (e) {
      var c = e.target.closest("[data-q]");
      if (c) { input.value = c.getAttribute("data-q"); shown = PAGE; render(); res.scrollTop = 0; return; }
      if (e.target.closest("[data-clear]")) { e.preventDefault(); saveRecent([]); renderEmpty(); return; }
      if (e.target.closest("[data-more]")) { shown += PAGE; render(); return; }
      var h = e.target.closest(".hit");
      if (h && current) {
        var t = current.hits[+h.getAttribute("data-n")];
        if (!t) return;
        remember(input.value);
        close(false);
        api.open({ tab: t.e.cat, id: t.e.id, bus: t.e.bus || "" });
      }
    });
    window.addEventListener("popstate", function () { if (isOpen) close(true); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen) { close(false); return; }
      var tag = (document.activeElement && document.activeElement.tagName) || "";
      if (e.key === "/" && !isOpen && !/INPUT|TEXTAREA|SELECT/.test(tag)) { e.preventDefault(); open(); }
    });
    if (api.button) api.button.addEventListener("click", open);
  }

  window.TripSearch = { init: init };
})();
