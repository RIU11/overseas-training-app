// 「お店」ページ。予定の行き先（または現在地）の周りにある、レストラン・カフェ・お店を表示する。
// お店のデータは OpenStreetMap（Overpass API）から取得する。値段は、お店の種類から付けた「目安」で、正確な値段ではない。
(function () {
  "use strict";
  var SPOTS = window.TRIP_SPOTS || [];
  var ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
  var DAY_MS = 24 * 3600 * 1000;
  var SNAP = window.TRIP_SHOPS || {};
  var SNAP_DATE = window.TRIP_SHOPS_DATE || "";
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem("trip:" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem("trip:" + k, JSON.stringify(v)); } catch (e) { /* 容量不足などは無視 */ } }
  };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

  var CUISINE = {
    japanese: "和食", sushi: "寿司", ramen: "ラーメン", noodle: "麺類", burger: "ハンバーガー", pizza: "ピザ", seafood: "シーフード",
    mexican: "メキシコ料理", chinese: "中華", italian: "イタリアン", american: "アメリカ料理", coffee_shop: "コーヒー", sandwich: "サンドイッチ",
    chicken: "チキン", steak_house: "ステーキ", indian: "インド料理", thai: "タイ料理", vietnamese: "ベトナム料理", korean: "韓国料理",
    french: "フレンチ", breakfast: "朝食", bbq: "バーベキュー", barbecue: "バーベキュー", ice_cream: "アイス", dessert: "デザート", donut: "ドーナツ",
    bakery: "パン", vegan: "ビーガン", vegetarian: "ベジタリアン", mediterranean: "地中海料理", greek: "ギリシャ料理", hot_dog: "ホットドッグ",
    fish_and_chips: "フィッシュ＆チップス", regional: "ご当地料理", tacos: "タコス", taco: "タコス", crepe: "クレープ", pancake: "パンケーキ",
    sandwiches: "サンドイッチ", salad: "サラダ", soup: "スープ", oyster: "牡蠣", fine_dining: "高級レストラン", tea: "お茶", juice: "ジュース",
    bubble_tea: "タピオカ", cafe: "カフェ", pasta: "パスタ", asian: "アジア料理", seafood_restaurant: "シーフード", wings: "手羽先", deli: "デリ",
    kebab: "ケバブ", frozen_yogurt: "フローズンヨーグルト", "tex-mex": "テクスメクス", pretzel: "プレッツェル", taiwanese: "台湾料理", spanish: "スペイン料理",
    turkish: "トルコ料理", poke: "ポキ", steak: "ステーキ", soft_serve: "ソフトクリーム", noodles: "麺類", pakistani: "パキスタン料理", sushi_restaurant: "寿司"
  };
  var SHOP = {
    supermarket: "スーパー（食料品・日用品）", convenience: "コンビニ（飲み物・軽食・日用品）", gift: "お土産・ギフト", souvenir: "お土産",
    clothes: "洋服", shoes: "靴", books: "本", toys: "おもちゃ", chocolate: "チョコレート", confectionery: "お菓子", bakery: "パン",
    alcohol: "お酒", wine: "ワイン", art: "アート", jewelry: "ジュエリー", electronics: "電気製品", computer: "パソコン", mobile_phone: "スマホ・携帯",
    cosmetics: "化粧品", beauty: "美容", department_store: "デパート", mall: "ショッピングモール", variety_store: "雑貨・日用品（ダラーストア）",
    general: "雑貨", deli: "惣菜", seafood: "魚介", coffee: "コーヒー豆", tea: "お茶", video_games: "ゲーム", sports: "スポーツ用品", outdoor: "アウトドア用品",
    bicycle: "自転車", pharmacy: "薬局（薬・日用品）", chemist: "ドラッグストア", florist: "花", stationery: "文房具", craft: "手芸・クラフト",
    music: "音楽", musical_instrument: "楽器", games: "ゲーム・ボードゲーム", hobby: "ホビー", collector: "コレクター向け", antiques: "骨董品",
    second_hand: "古着・中古", bag: "バッグ", watches: "時計", optician: "メガネ", photo: "写真・カメラ", camera: "カメラ", newsagent: "新聞・雑誌・飲み物",
    kiosk: "キオスク", farm: "農産物", greengrocer: "野菜・果物", butcher: "精肉", health_food: "健康食品", nutrition_supplements: "サプリメント",
    candles: "キャンドル", houseware: "生活雑貨", furniture: "家具", gift_shop: "お土産・ギフト", clothing: "洋服", fashion_accessories: "ファッション小物",
    ice_cream: "アイス", frozen_food: "冷凍食品", fishing: "釣り用品", comic: "漫画・コミック", anime: "アニメグッズ",
    ticket: "チケット・ツアーの受付", pastry: "パン・ペストリー", beverages: "飲み物", spices: "スパイス", perfumery: "香水", interior_decoration: "インテリア雑貨", pet: "ペット用品", hardware: "工具・日用品"
  };
  var KIND = { restaurant: "レストラン", fast_food: "ファストフード", cafe: "カフェ", food_court: "フードコート", ice_cream: "アイス", bar: "バー", pub: "パブ", pharmacy: "薬局" };

  // お店の種類から、1人あたりの値段の目安（ドル）を付ける。正確な値段ではない
  var CHEAP = /burger|pizza|sandwich|taco|hot_dog|donut|fish_and_chips|chicken|bakery|crepe|pancake|wings|breakfast|juice|bubble_tea|ice_cream|coffee|deli|salad/;
  var UPPER = /steak|fine_dining|french|oyster/;
  var TIERS = [
    null,
    { mark: "$", lo: 0, hi: 15, note: "〜$15" },
    { mark: "$$", lo: 15, hi: 35, note: "$15〜35" },
    { mark: "$$$", lo: 35, hi: 60, note: "$35〜60" }
  ];
  function tierOf(t) {
    var a = t.amenity, c = (t.cuisine || "").toLowerCase();
    if (a === "fast_food" || a === "cafe" || a === "ice_cream" || a === "food_court") return 1;
    if (a === "bar" || a === "pub") return 2;
    if (a !== "restaurant") return 0;
    if (UPPER.test(c)) return 3;
    if (CHEAP.test(c) && !/fine/.test(c)) return 1;
    return 2;
  }

  function dist(a, b, c, d) {
    var R = 6371000, r = Math.PI / 180, dLat = (c - a) * r, dLng = (d - b) * r;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a * r) * Math.cos(c * r) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }

  function query(lat, lng, r) {
    var around = "(around:" + r + "," + lat + "," + lng + ")";
    return '[out:json][timeout:25];(' +
      "nwr" + around + '[amenity~"^(restaurant|fast_food|cafe|food_court|ice_cream|bar|pub|pharmacy)$"][name];' +
      "nwr" + around + "[shop][name];);out center tags 400;";
  }

  function fetchOne(url, body) {
    var ctl = typeof AbortController === "function" ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, 60000) : null;
    return fetch(url, { method: "POST", body: "data=" + encodeURIComponent(body), headers: { "Content-Type": "application/x-www-form-urlencoded" }, signal: ctl ? ctl.signal : undefined })
      .then(function (r) { if (timer) clearTimeout(timer); if (!r.ok) throw new Error("http " + r.status); return r.json(); })
      .catch(function (e) { if (timer) clearTimeout(timer); throw e; });
  }
  function fetchOverpass(body) {
    return fetchOne(ENDPOINTS[0], body).catch(function () { return fetchOne(ENDPOINTS[1], body); });
  }

  // Overpass の結果を、保存用の軽い形（lite）にまとめる。事前に取り込んだデータ（shops-data.js）も同じ形
  function toLite(json) {
    var seen = {}, out = [];
    (json.elements || []).forEach(function (e) {
      var t = e.tags || {}, la = e.lat != null ? e.lat : e.center && e.center.lat, lo = e.lon != null ? e.lon : e.center && e.center.lon;
      if (!t.name || la == null || lo == null) return;
      var key = t.name.toLowerCase() + "|" + la.toFixed(3) + "|" + lo.toFixed(3);
      if (seen[key]) return; seen[key] = 1;
      var o = { n: t.name, la: +la.toFixed(5), lo: +lo.toFixed(5) };
      if (t.shop) o.s = t.shop;
      if (t.amenity) o.a = t.amenity;
      if (t.cuisine) o.c = t.cuisine.slice(0, 60);
      if (t.opening_hours) o.h = t.opening_hours.slice(0, 120);
      out.push(o);
    });
    return out;
  }

  // lite を、表示用（種類・距離・値段の目安つき）に直す
  function shape(list, lat, lng) {
    var out = (list || []).map(function (o) {
      var item = { n: o.n, la: o.la, lo: o.lo, d: Math.round(dist(lat, lng, o.la, o.lo)) };
      var food = /^(restaurant|fast_food|cafe|food_court|ice_cream|bar|pub)$/.test(o.a || "");
      if (food) {
        item.g = (o.a === "cafe" || o.a === "ice_cream") ? "cafe" : "eat";
        item.a = o.a; if (o.c) item.c = o.c;
        item.t = tierOf({ amenity: o.a, cuisine: o.c });
      } else {
        item.g = "shop"; item.s = String(o.s || o.a || "").split(";")[0];
        if (!SHOP[item.s]) return null; // 理容室・修理店など、旅行者に関係ないお店は出さない
      }
      if (o.h) item.h = o.h;
      return item;
    }).filter(Boolean);
    out.sort(function (a, b) { return a.d - b.d; });
    return out.slice(0, 160);
  }

  // 読み込みの順番：①最新を取得（更新ボタン）→ ②この端末に保存した最新取得（7日以内）→ ③事前に取り込んだデータ → ④その場で取得
  function load(spot, force) {
    var ck = "nb2:" + spot.key, hit = store.get(ck, null), snap = SNAP[spot.key];
    var asSnap = function (stale) { return { items: shape(snap, spot.lat, spot.lng), from: "snap", stale: stale }; };
    if (!force) {
      if (hit && Date.now() - hit.ts < 7 * DAY_MS) return Promise.resolve({ items: shape(hit.list, spot.lat, spot.lng), from: "live", ts: hit.ts });
      if (snap) return Promise.resolve(asSnap(false));
    }
    return fetchOverpass(query(spot.lat, spot.lng, spot.r)).then(function (json) {
      var list = toLite(json);
      store.set(ck, { ts: Date.now(), list: list.slice(0, 200) });
      return { items: shape(list, spot.lat, spot.lng), from: "live", ts: Date.now() };
    }).catch(function (e) {
      if (hit) return { items: shape(hit.list, spot.lat, spot.lng), from: "live", ts: hit.ts, stale: true };
      if (snap) return asSnap(true);
      throw e;
    });
  }

  /* ---------- 画面 ---------- */
  var cur = null;            // { key, name, lat, lng, r }
  var data = null;           // 読み込み結果
  var status = "idle";       // idle | locating | loading | error | done | denied
  var more = { eat: false, cafe: false, shop: false };
  var seq = 0;

  function yen(usd) {
    var rate = parseFloat(store.get("rate", ""));
    return rate > 0 ? Math.round(usd * rate / 100) * 100 : null;
  }
  function priceText(tier) {
    var t = TIERS[tier]; if (!t) return "";
    var y = yen(t.hi), yl = yen(t.lo);
    var s = '<span class="pr">' + t.mark + '</span> 1人 ' + t.note;
    if (y) s += yl ? "（約" + yl.toLocaleString() + "〜" + y.toLocaleString() + "円）" : "（約" + y.toLocaleString() + "円まで）";
    return s;
  }
  function gmap(it) {
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(it.n) + "%20" + it.la + "," + it.lo;
  }
  function distText(m) { return m < 1000 ? "約" + (Math.round(m / 10) * 10) + "m" : "約" + (m / 1000).toFixed(1) + "km"; }

  function itemHtml(it) {
    var kind, line = [];
    if (it.g === "shop") {
      kind = SHOP[it.s] || "お店";
      line.push('<span class="kd">' + esc(kind) + "</span>");
    } else {
      var cs = (it.c || "").split(";").map(function (x) { return CUISINE[x.trim().toLowerCase()]; }).filter(Boolean);
      kind = (cs.length ? cs.slice(0, 2).join("・") : KIND[it.a] || "");
      line.push('<span class="kd">' + esc(kind) + "</span>" + (KIND[it.a] && cs.length ? " " + esc(KIND[it.a]) : ""));
    }
    var meta = '<span class="ds">' + distText(it.d) + "（徒歩" + Math.max(1, Math.round(it.d / 80)) + "分）</span>";
    var price = it.t ? '<div class="pc">' + priceText(it.t) + "</div>" : "";
    var hours = it.h ? '<div class="hr">🕒 ' + esc(it.h) + "</div>" : "";
    return '<div class="shopit"><div class="sn1"><b>' + esc(it.n) + "</b></div><div class=\"sm\">" + line.join("") + " " + meta + "</div>" + price + hours +
      '<a class="gm" href="' + gmap(it) + '" target="_blank" rel="noopener">Googleマップで口コミ・値段を見る</a></div>';
  }

  function section(key, title, hint) {
    var list = (data && data.items || []).filter(function (x) { return x.g === key; });
    if (!list.length) return '<div class="card"><h3>' + title + '</h3><p class="muted small">この範囲では見つかりませんでした。範囲を広げるには、Googleマップで検索してください。</p></div>';
    var shown = more[key] ? list : list.slice(0, 10);
    return '<div class="card"><h3>' + title + ' <span class="muted small">(' + list.length + ")</span></h3>" + (hint ? '<p class="muted small">' + hint + "</p>" : "") +
      shown.map(itemHtml).join("") +
      (list.length > shown.length ? '<button class="more" type="button" data-nb-more="' + key + '">もっと見る（残り' + (list.length - shown.length) + "件）</button>" : "") + "</div>";
  }

  function picker() {
    var days = {};
    SPOTS.forEach(function (s) { (days[s.day] = days[s.day] || []).push(s); });
    return '<div class="card"><h3>予定の場所から選ぶ</h3>' + Object.keys(days).map(function (d) {
      return '<div class="muted small" style="margin:8px 0 4px">Day ' + d + "</div><div class=\"qrow\">" + days[d].map(function (s) {
        return '<button class="qchip' + (cur && cur.key === s.id ? " on" : "") + '" type="button" data-nb-spot="' + s.id + '">' + esc(s.name) + "</button>";
      }).join("") + "</div>";
    }).join("") + "</div>";
  }

  function body() {
    var h = '<div class="hero" style="min-height:130px"><div class="in"><div class="h">🍽 周辺のお店</div><div class="capt">予定の場所の近くのレストランとお店</div></div></div>';
    h += '<div class="card"><button class="btn primary" type="button" data-nb-here="1">📍 現在地の周辺を調べる</button>' +
      '<p class="muted small">予定の場所の近くにいるときは、その場所のお店を出します。許可の確認が出たら「許可」を押してください。</p>' +
      (status === "locating" ? '<p class="muted small">現在地を調べています…</p>' : "") +
      (status === "denied" ? '<p class="warnmsg small">現在地を使えませんでした。許可を確認するか、下の一覧から場所を選んでください。</p>' : "") + "</div>";
    h += picker();
    if (cur) {
      h += '<div class="card" id="nb-res"><h3>📍 ' + esc(cur.name) + "</h3>" +
        '<div class="muted small">半径 約' + cur.r + "m のお店を、近い順に表示します。</div>" +
        (status === "loading" ? '<p class="muted">お店を探しています…（公開サーバーが混んでいると、1分ほどかかります）</p>' : "") +
        (status === "error" ? '<p class="warnmsg">お店の情報を取得できませんでした。ネット接続を確認して、もう一度お試しください。<br><button class="btn" type="button" data-nb-retry="1">もう一度</button></p>' : "") +
        (data && status === "done" ? '<p class="muted small">' + (data.from === "snap" ?
          "お店のデータ：事前に取り込んだ情報（OpenStreetMap" + (SNAP_DATE ? "、" + esc(SNAP_DATE) + "時点" : "") + "）" :
          "お店のデータ：" + (data.ts ? new Date(data.ts).toLocaleDateString("ja-JP") : "") + "に取得した最新の情報") +
          (data.stale ? "（最新の取得に失敗したため、こちらを表示しています）" : "") +
          ' <button class="btn" type="button" data-nb-retry="1" style="margin-left:6px">最新の情報に更新</button></p>' : "") + "</div>";
      if (status === "done" || (data && data.items)) {
        h += section("eat", "🍴 レストラン・食事", "値段は、お店の種類から付けた目安です。レストランでは、別にチップ（約18%）がかかります。") +
          section("cafe", "☕ カフェ・軽食・スイーツ", "") +
          section("shop", "🛍 お店（何を売っているか）", "");
      }
    }
    h += '<div class="card"><p class="muted small">お店の情報は、OpenStreetMap の地図データから取得しています。閉店・移転・営業時間が古いことや、載っていないお店もあります。値段は「お店の種類からの目安」で、正確ではありません。行く前に、Googleマップで口コミと最新の値段・営業時間を確認してください。現在地や場所の座標は、お店を探すために地図データのサービス（Overpass API）へ送られます。取得した結果は、この端末に1日だけ保存されます。</p></div>';
    return h;
  }

  function render() {
    var el = document.getElementById("view");
    if (!el || !document.getElementById("nb-root")) return;
    var y = window.scrollY;
    document.getElementById("nb-root").innerHTML = body();
    window.scrollTo(0, y);
  }

  function html() { return '<div id="nb-root">' + body() + "</div>"; }

  function select(spot, force) {
    var my = ++seq;
    cur = spot; data = null; status = "loading"; more = { eat: false, cafe: false, shop: false };
    render();
    load(spot, force).then(function (res) {
      if (my !== seq) return;
      data = res; status = "done"; render();
      var r = document.getElementById("nb-res"); if (r && !force) r.scrollIntoView({ behavior: "smooth", block: "start" });
    }).catch(function () { if (my !== seq) return; status = "error"; render(); });
  }

  function here() {
    if (!("geolocation" in navigator)) { status = "denied"; render(); return; }
    status = "locating"; render();
    navigator.geolocation.getCurrentPosition(function (p) {
      var la = p.coords.latitude, lo = p.coords.longitude, best = null, bd = 1e9;
      SPOTS.forEach(function (s) { var d = dist(la, lo, s.lat, s.lng); if (d < bd) { bd = d; best = s; } });
      store.set("locAsked", true);
      if (best && bd <= best.r + 250) select({ key: best.id, name: best.name + "の近く", lat: best.lat, lng: best.lng, r: best.r });
      else select({ key: "gps:" + la.toFixed(3) + "," + lo.toFixed(3), name: "現在地の周辺", lat: la, lng: lo, r: 500 });
    }, function () { status = "denied"; render(); }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 });
  }

  function bind() {
    var rootEl = document.getElementById("nb-root");
    if (!rootEl) return;
    rootEl.addEventListener("click", function (e) {
      var t = e.target.closest("[data-nb-spot],[data-nb-here],[data-nb-more],[data-nb-retry]"); if (!t) return;
      if (t.hasAttribute("data-nb-here")) { here(); return; }
      if (t.hasAttribute("data-nb-retry")) { if (cur) select(cur, true); return; }
      if (t.hasAttribute("data-nb-more")) { more[t.getAttribute("data-nb-more")] = true; render(); return; }
      var id = t.getAttribute("data-nb-spot");
      var s = SPOTS.filter(function (x) { return x.id === id; })[0];
      if (s) select({ key: s.id, name: s.name, lat: s.lat, lng: s.lng, r: s.r });
    });
    // すでに許可されているなら、開いたときに自動で今いる場所を判定する
    try {
      if (!cur && navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: "geolocation" }).then(function (r) { if (r.state === "granted" && !cur && document.getElementById("nb-root")) here(); }).catch(function () { /* ボタンで開始 */ });
      }
    } catch (e) { /* 無視 */ }
  }

  window.TripNearby = { html: html, bind: bind };
})();
