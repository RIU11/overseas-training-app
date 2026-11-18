// 値札の文字（カメラで読み取ったもの）から、ドルの金額を判断する。通信はしない。
//
// アメリカの値札の書き方と、このアプリでの読み方（実装前に調べて割り当てたもの）
//  1. $2.50 / 2.50 / $1,299.00 …… 小数点あり。書いてあるとおり。（確実）
//  2. $2⁵⁰ / 2⁹⁹ …………………… セントを小さく上に書く（スーパー・ドラッグストア・ファストフード）。
//                                   後ろ2桁の文字が小さい／上にずれている → 2.50 / 2.99。（確実）
//  3. 99¢ / 99c ………………………… セント。0.99ドル。（確実）
//  4. .99 …………………………………… 0.99ドル。（確実）
//  5. 12.5 ………………………………… レストランのメニュー。12.50ドル。（確実）
//  6. $25 / 25 …………………………… 服・おみやげ・メニュー（12 = 12ドル）。整数のドル。
//  7. 2/$5 / 2 for $5 / 3 for $10 … まとめ買い。合計の金額と、1個あたりも出す。
//  8. $3.99/lb / ea / /oz …………… 重さ・1個あたりの値段。/lb は「1ポンド（約454g）あたり」と添える。
//                                   /oz（小さく書かれた単価）は、本体の値段より優先しない。
//  9. Reg / Was / Save と Now / Sale …… 元の値段・割引額より、今の値段（Now / Sale）を優先する。
//     with card / member ………… 会員カードが必要な値段。そのことを添える。
// 小数点やセントの小ささが読み取れず、2.99 か 299 か（2.5 か 25 か）決められないとき：
//  → 値札にある商品名を読み、商品の相場に合う方を選ぶ（下の PRODUCTS）。
//  → それでも決まらなければ、可能性が高い方を大きく、もう一方を小さく両方出す。
(function () {
  "use strict";

  // 商品名（英語の単語）と、カリフォルニアでのふつうの値段の範囲（ドル）。上から順に照合する（長い語を先に）
  var PRODUCTS = [
    [["water bottle", "tumbler"], "水筒・タンブラー", 12, 60],
    [["pizza slice", "slice"], "ピザ1切れ", 3, 9],
    [["key chain", "keychain", "keyring"], "キーホルダー", 3, 18],
    [["t-shirt", "tshirt", "tee", "shirt"], "Tシャツ", 10, 50],
    [["sweatshirt", "hoodie", "sweater", "pullover"], "パーカー・トレーナー", 25, 100],
    [["jacket", "coat"], "上着", 35, 250],
    [["cap", "hat", "beanie"], "帽子", 12, 50],
    [["socks"], "くつ下", 4, 25],
    [["ears"], "カチューシャ（耳）", 20, 50],
    [["plush", "stuffed", "plushie"], "ぬいぐるみ", 8, 60],
    [["mug", "cup"], "マグカップ", 6, 35],
    [["magnet"], "マグネット", 2, 14],
    [["postcard", "post card"], "ポストカード", 0.5, 5],
    [["sticker", "stickers"], "ステッカー", 1, 10],
    [["pin", "pins", "badge"], "ピンバッジ", 4, 25],
    [["tote", "bag"], "バッグ", 3, 60],
    [["poster", "print"], "ポスター", 5, 50],
    [["book", "comic", "manga"], "本", 5, 60],
    [["notebook", "journal"], "ノート", 2, 25],
    [["pen", "pencil"], "ペン", 1, 12],
    [["chocolate", "candy", "gum", "mints"], "お菓子", 0.5, 8],
    [["chips", "crisps", "snack", "pretzels", "popcorn", "cracker", "crackers"], "スナック菓子", 1, 8],
    [["cookie", "cookies", "donut", "doughnut", "muffin", "bagel", "croissant", "pastry"], "パン・焼き菓子", 1, 7],
    [["water", "soda", "coke", "pepsi", "sprite", "drink", "tea", "lemonade", "gatorade"], "飲みもの", 0.8, 7],
    [["juice", "smoothie"], "ジュース", 2, 12],
    [["coffee", "latte", "espresso", "cappuccino", "mocha", "frappuccino"], "コーヒー", 2, 9],
    [["milk", "yogurt"], "牛乳・ヨーグルト", 1, 9],
    [["banana", "apple", "orange", "fruit"], "くだもの", 0.3, 9],
    [["bread", "cereal", "granola"], "パン・シリアル", 2, 10],
    [["sandwich", "wrap", "sub"], "サンドイッチ", 5, 20],
    [["burger", "cheeseburger"], "ハンバーガー", 4, 22],
    [["fries"], "ポテト", 2, 8],
    [["burrito", "bowl"], "ブリトー・ボウル", 7, 20],
    [["taco", "tacos"], "タコス", 2, 8],
    [["salad"], "サラダ", 5, 20],
    [["sushi", "roll"], "寿司", 5, 30],
    [["ramen", "noodle", "noodles", "pho"], "ラーメン・麺", 10, 26],
    [["pizza"], "ピザ", 8, 40],
    [["steak"], "ステーキ", 18, 70],
    [["ice cream", "gelato", "sundae", "cone"], "アイス", 3, 12],
    [["combo", "meal"], "セットメニュー", 7, 22],
    [["toothpaste", "toothbrush"], "歯みがき", 2, 10],
    [["shampoo", "conditioner", "lotion", "soap"], "シャンプー・せっけん", 2, 18],
    [["sunscreen", "spf"], "日焼け止め", 6, 25],
    [["tylenol", "advil", "ibuprofen", "medicine", "allergy"], "薬", 4, 25],
    [["battery", "batteries"], "電池", 4, 25],
    [["charger", "cable", "adapter"], "充電器・ケーブル", 8, 45],
    [["umbrella", "poncho"], "傘・ポンチョ", 4, 30]
  ];

  var CENT_ENDS = /(99|98|95|89|79|69|59|49|39|29|19|09|50|25|75)$/;
  var UNIT_RE = /^\/?(lb|lbs|1b|ib|oz|0z|ea|each|ct|pk|pkg)\.?$/i;

  function digitsOf(s) {
    // 数字の中に紛れた、読み違えやすい文字を直す（数字が1つ以上ある語だけ）
    if (!/\d/.test(s)) return s;
    return s.replace(/[Oo]/g, "0").replace(/[lI|]/g, "1").replace(/S(?=\d)/g, "5");
  }
  function h(b) { return b ? Math.max(1, b.y1 - b.y0) : 0; }
  function union(a, b) { if (!a) return b; if (!b) return a; return { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) }; }

  // 1語の中の数字が「大きい数字＋小さい2桁（セント）」になっているかを、文字の高さと位置で調べる
  // 戻り値：比（小さい2桁の高さ ÷ 大きい数字の高さ）と、上にずれているか
  function superInfo(word) {
    var sy = (word.symbols || []).filter(function (s) { return /\d/.test(digitsOf(s.text || "")); });
    if (sy.length < 3) return null;
    var lead = sy.slice(0, sy.length - 2), tail = sy.slice(-2);
    var lh = Math.max.apply(null, lead.map(function (s) { return h(s.bbox); }));
    var th = (h(tail[0].bbox) + h(tail[1].bbox)) / 2;
    var leadBottom = Math.max.apply(null, lead.map(function (s) { return s.bbox.y1; }));
    var tailBottom = Math.max(tail[0].bbox.y1, tail[1].bbox.y1);
    return { ratio: th / lh, raised: tailBottom < leadBottom - lh * 0.25 };
  }

  function round2(x) { return Math.round(x * 100) / 100; }

  // lines: [{ words: [{ text, bbox:{x0,y0,x1,y1}, symbols:[{ text, bbox }] }] }]
  function parse(lines) {
    var cands = [], allText = [];
    (lines || []).forEach(function (line) {
      var ws = (line.words || []).filter(function (w) { return w && w.text && w.text.trim(); });
      ws.forEach(function (w) { allText.push(w.text.toLowerCase()); });
      for (var i = 0; i < ws.length; i++) {
        var i0 = i;
        var raw = ws[i].text.trim(), unitIn = null, um = /^(.*\d.*?)\/?(1b|lb|lbs|ib|1bs|oz|0z|ea|ct)\.?$/i.exec(ws[i].text.trim());
        if (um && /\d/.test(um[1])) { raw = um[1]; unitIn = um[2].toLowerCase().replace(/^(1b|ib|1bs|lbs)$/, "lb").replace("0z", "oz"); }
        var prev = i > 0 ? ws[i - 1].text.trim().toLowerCase() : "", next = ws[i + 1] ? ws[i + 1].text.trim() : "", next2 = ws[i + 2] ? ws[i + 2].text.trim() : "";
        var t = digitsOf(raw), dollar = /^\$/.test(t) || prev === "$", m;
        t = t.replace(/^\$/, "");
        var comma = /^\d{1,3}(,\d{3})+(\.\d{2})?$/.test(t);
        if (comma) t = t.replace(/,/g, ""); // 1,299.00 / 1,299（カンマがあれば整数のドル）
        var c = null, box = ws[i].bbox;

        // 7. まとめ買い：2/$5、2/5.00
        if ((m = /^(\d{1,2})\/\$?(\d+(?:\.\d{1,2})?)$/.exec(t))) {
          var tot = parseFloat(m[2]); c = { usd: tot, sure: true, why: "まとめ買いの値札", multi: { qty: +m[1], total: tot } };
        }
        // 7. まとめ買い：2 for $5
        else if (/^\d{1,2}$/.test(t) && /^for$/i.test(next) && (m = /^\$?(\d+(?:\.\d{1,2})?)$/.exec(digitsOf(next2)))) {
          var tot2 = parseFloat(m[1]); c = { usd: tot2, sure: true, why: "まとめ買いの値札", multi: { qty: +t, total: tot2 } };
          box = union(box, union(ws[i + 1].bbox, ws[i + 2].bbox)); i += 2;
        }
        // 3. 99¢
        else if ((m = /^(\d{1,2})[¢c]$/.exec(t)) || (/^\d{1,2}$/.test(t) && /^[¢c]$/.test(next))) {
          c = { usd: +(m ? m[1] : t) / 100, sure: true, why: "セント（¢）の値札" };
        }
        // 4. .99
        else if ((m = /^\.(\d{2})$/.exec(t))) {
          c = { usd: +m[1] / 100, sure: true, why: "小数点のある値札" };
        }
        // 1. 2.50
        else if ((m = /^(\d{1,5})\.(\d{2})$/.exec(t))) {
          c = { usd: parseFloat(m[1] + "." + m[2]), sure: true, why: "小数点のある値札" };
        }
        // 5. $付きで小数が1桁（$3.9）→ 1桁を読み落とした可能性が高い。小数点のあとを拡大して読み直す
        else if (dollar && (m = /^(\d{1,4})\.(\d)$/.exec(t))) {
          var sy5 = (ws[i].symbols || []), dp = -1, cb5 = null;
          sy5.forEach(function (s, k) { if (s.text === ".") dp = k; });
          sy5.slice(dp + 1).forEach(function (s) { cb5 = union(cb5, s.bbox); });
          if (!cb5 || dp < 0) { var bw5 = box.x1 - box.x0; cb5 = { x0: box.x1 - bw5 * 0.4, y0: box.y0, x1: box.x1, y1: box.y1 }; }
          var cbw5 = { x0: cb5.x0, y0: Math.min(cb5.y0, box.y0), x1: Math.max(cb5.x1, box.x1) + h(box) * 0.5, y1: Math.max(cb5.y1, box.y1) };
          c = { usd: +m[1], dollars: +m[1], pending: true, centsBox: cbw5, centsBox2: cbw5, sure: false, why: "小数点のある値札" };
        }
        // 5. 12.5（メニュー。$ が付かない）
        else if ((m = /^(\d{1,4})\.(\d)$/.exec(t))) {
          c = { usd: parseFloat(m[1] + "." + m[2] + "0"), sure: true, why: "メニューの書き方（12.5 = 12.50ドル）" };
        }
        // 2・6. 整数だけ（2⁹⁹ かもしれないし、25ドルかもしれない）
        else if ((m = /^(\d{1,4})(\.?)([^\d\s.]{1,4})$/.exec(t)) && !/^(ea|ct|lb|oz)$/i.test(m[3])) {
          // 文字の高さで、大きい数字（ドル）と、小さい文字（セント）を分ける
          var syms = (ws[i].symbols || []).filter(function (s) { return s.text !== "$"; }), cb = null, dol = m[1];
          if (syms.length) {
            var dh = syms.filter(function (s) { return /\d/.test(digitsOf(s.text)); }).map(function (s) { return h(s.bbox); });
            var mh = dh.length ? Math.max.apply(null, dh) : 0, k = 0, dd = "";
            while (k < syms.length && /\d/.test(digitsOf(syms[k].text)) && h(syms[k].bbox) >= mh * 0.78) { dd += digitsOf(syms[k].text); k++; }
            while (k < syms.length && syms[k].text === ".") k++;
            syms.slice(k).forEach(function (s) { cb = union(cb, s.bbox); });
            if (dd) dol = dd;
          }
          if (!cb) { var bw = box.x1 - box.x0; cb = { x0: box.x1 - bw * 0.35, y0: box.y0, x1: box.x1, y1: box.y1 }; }
          // 読み崩れた文字の範囲は狭く出ることがあるので、読めなかったとき用に、語の右端・上下いっぱいまで広げた範囲も持つ
          var cbw = { x0: cb.x0, y0: Math.min(cb.y0, box.y0), x1: Math.max(cb.x1, box.x1), y1: Math.max(cb.y1, box.y1) };
          c = { usd: +dol, dollars: +dol, pending: true, centsBox: cb, centsBox2: cbw, sure: false, why: "セントを小さく書いた値札" };
        }
        // 次の語が、小さく上にずれた読めない文字（別の語として読まれたセント）
        else if (/^\d{1,4}$/.test(t) && ws[i + 1] && !/\d/.test(next) && !UNIT_RE.test(next) && !/^(for|[¢c])$/i.test(next) && h(ws[i + 1].bbox) < h(box) * 0.78 && ws[i + 1].bbox.y1 < box.y1 - h(box) * 0.25 && ws[i + 1].bbox.x0 >= box.x1 - h(box) * 0.3) {
          c = { usd: +t, dollars: +t, pending: true, centsBox: ws[i + 1].bbox, sure: false, why: "セントを小さく書いた値札" };
          box = union(box, ws[i + 1].bbox); i += 1;
        }
        else if (comma && /^\d+$/.test(t)) {
          c = { usd: +t, sure: true, why: "ドルの値札" };
        }
        else if (/^\d{1,5}$/.test(t)) {
          var si = superInfo(ws[i]);
          // 次の語が、小さく上に書かれた2桁（別の語として読まれたセント）
          var nb = ws[i + 1] && /^\d{2}$/.test(digitsOf(next)) ? ws[i + 1].bbox : null;
          if (nb && h(nb) < h(box) * 0.78 && nb.x0 >= box.x1 - h(box) * 0.3) {
            c = { usd: parseFloat(t + "." + digitsOf(next)), sure: true, why: "セントを小さく書いた値札" };
            box = union(box, nb); i += 1;
          } else if (si && (si.ratio < 0.78 || si.raised)) {
            c = { usd: parseFloat(t.slice(0, -2) + "." + t.slice(-2)), sure: true, why: "セントを小さく書いた値札" };
          } else {
            var whole = +t, cents = t.length >= 3 ? parseFloat(t.slice(0, -2) + "." + t.slice(-2)) : (t.length === 2 ? parseFloat(t[0] + "." + t[1] + "0") : null);
            if (cents === null) c = { usd: whole, sure: true, why: "ドルの値札" };
            else {
              // どちらが確からしいか：セントの大きさの手がかり（少し小さい）、末尾の数字（.99 などはセントの可能性が高い）
              var leanCents = (si && si.ratio < 0.9) || (t.length >= 3 && CENT_ENDS.test(t) && !dollar) || (t.length >= 3 && /(99|98|95|49)$/.test(t));
              if (t.length === 2) {
                // 2桁（25 など）は、ふつうはそのままのドル。小数点の読み落とし（2.5）の可能性は小さく出す
                c = { usd: whole, sure: false, alt: cents, why: "小数点が読み取れなかった値札" };
              } else {
                c = leanCents ? { usd: cents, sure: false, alt: whole, why: "小数点が読み取れなかった値札" } : { usd: whole, sure: false, alt: cents, why: "小数点が読み取れなかった値札" };
              }
            }
          }
        }
        if (!c) continue;
        // 8. 単位（/lb など）
        var unit = unitIn || (UNIT_RE.test(next) ? next.replace(/[\/.]/g, "") : null);
        if (unit) c.unit = unit.toLowerCase().replace(/^(lbs|1b|ib)$/, "lb").replace("0z", "oz").replace("each", "ea");
        // 9. 前後の言葉（Reg / Was / Save は元の値段・割引額、Now / Sale は今の値段）
        // すぐ前の言葉（数字を含まないもの、2語まで）だけを見る
        var ctxw = [];
        for (var j = i0 - 1; j >= 0 && j >= i0 - 2 && !/\d/.test(ws[j].text); j--) ctxw.unshift(ws[j].text.toLowerCase());
        var ctx = ctxw.join(" ");
        c.role = /\b(save|off)\b/.test(ctx) ? "save" : /\b(reg|regular|was|orig|compare)\b/.test(ctx) ? "reg" : /\b(now|sale|only|special)\b/.test(ctx) ? "now" : "";
        c.size = h(box); c.bbox = box; c.dollar = dollar;
        cands.push(c);
      }
    });
    if (!cands.length) return null;

    var text = " " + allText.join(" ") + " ";
    var card = /\b(with card|card price|member|members|club price|rewards)\b/.test(text);
    // 本体の値段を選ぶ：文字の大きさが基本。今の値段（Now/Sale）を優先し、元値・割引額・小さい単価（/oz）は下げる
    var maxSize = Math.max.apply(null, cands.map(function (c) { return c.size; }));
    cands.forEach(function (c) {
      c.score = c.size / maxSize + (c.role === "now" ? 0.35 : 0) - (c.role === "reg" ? 0.4 : 0) - (c.role === "save" ? 0.6 : 0) - (c.unit === "oz" ? 0.5 : 0) + (c.dollar ? 0.1 : 0) + (c.sure ? 0.05 : 0);
    });
    cands.sort(function (a, b) { return b.score - a.score; });
    var best = cands[0];
    if (best.role === "save") return null;
    // セールの値札で、今の値段が読めず元の値段（Reg / Was）しか読めなかったときは、出さずに読み直す
    if (best.role === "reg" && /\b(now|sale|special)\b/.test(text)) return null;

    // 商品名から相場を調べる
    var prod = null;
    for (var p = 0; p < PRODUCTS.length && !prod; p++) {
      for (var q = 0; q < PRODUCTS[p][0].length; q++) {
        var kw = PRODUCTS[p][0][q];
        if (new RegExp("[^a-z]" + kw.replace(/[-\s]/g, "[-\\s]?") + "[^a-z]").test(text)) { prod = { name: PRODUCTS[p][1], min: PRODUCTS[p][2], max: PRODUCTS[p][3] }; break; }
      }
    }
    var r = { pending: !!best.pending, dollars: best.dollars, centsBox: best.centsBox || null, centsBox2: best.centsBox2 || null, usd: round2(best.usd), sure: best.sure, why: best.why, alt: best.alt != null ? round2(best.alt) : null, unit: best.unit || null, multi: best.multi || null, card: card, bbox: best.bbox, product: prod ? prod.name : null };
    if (!r.sure && r.alt != null && prod) {
      var inMain = r.usd >= prod.min && r.usd <= prod.max, inAlt = r.alt >= prod.min && r.alt <= prod.max;
      if (inAlt && !inMain) { var tmp = r.usd; r.usd = r.alt; r.alt = tmp; }
      if (inAlt !== inMain) { r.sure = true; r.why = "商品名（" + prod.name + "）のふつうの値段から判断"; r.alt = null; }
    }
    if (r.sure) r.alt = null;
    return r;
  }

  window.TripPrice = { parse: parse, PRODUCTS: PRODUCTS };
})();
