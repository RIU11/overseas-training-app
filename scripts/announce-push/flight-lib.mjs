// 便の情報から、お知らせの文を作る（通信しない部分。ブラウザでも試せるように、Node 専用の機能は使わない）。
// 便は資料（予定表）に書いてあるものだけ。label は「いつ乗る便か」がひと目でわかる札。

export const FLIGHTS = [
  { id: "UA34", from: "KIX", label: "行き 11/17(火)", route: "関西→サンフランシスコ", date: "2026-11-17", dep: "2026-11-17T09:35:00Z", arr: "2026-11-17T19:50:00Z" },
  { id: "UA32", from: "LAX", label: "帰り 11/25(水)", route: "ロサンゼルス→成田", date: "2026-11-25", dep: "2026-11-25T19:05:00Z", arr: "2026-11-26T07:30:00Z" },
  { id: "JL3009", from: "NRT", label: "帰り 乗り継ぎ 11/26(木)", route: "成田→伊丹", date: "2026-11-26", dep: "2026-11-26T09:25:00Z", arr: "2026-11-26T10:55:00Z" }
];

const H = 3600000;
// 調べる時間帯：出発の6時間前から、到着の2時間後まで
export function inWindow(f, now) {
  return now >= Date.parse(f.dep) - 6 * H && now <= Date.parse(f.arr) + 2 * H;
}
// お知らせを出しておく期限：到着の3時間後まで
export function untilOf(f) { return new Date(Date.parse(f.arr) + 3 * H).toISOString(); }

// "2026-11-17 18:35+09:00" → { hm: "18:35", md: "11/17", off: "+09:00" }
function partsOf(local) {
  const m = /(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::\d{2})?(Z|[+-]\d{2}:?\d{2})?/.exec(local || "");
  if (!m) return null;
  return { hm: m[4] + ":" + m[5], md: +m[2] + "/" + +m[3], off: m[6] || "" };
}
function ms(t) {
  if (!t) return NaN;
  const s = (t.utc || "").replace(" ", "T").replace(/Z?$/, "Z");
  return Date.parse(s);
}
function zoneName(off) { return /^\+09/.test(off) ? "日本時間" : "現地時間"; }

// 予定の時刻と、新しい時刻（見込み）から、何分ずれたかと表示用の文を作る
function shift(side) {
  if (!side) return null;
  const sch = side.scheduledTime, rev = side.revisedTime || side.predictedTime;
  if (!sch || !rev) return null;
  const a = ms(sch), b = ms(rev);
  if (isNaN(a) || isNaN(b)) return null;
  const min = Math.round((b - a) / 60000);
  const p1 = partsOf(sch.local), p2 = partsOf(rev.local);
  if (!p1 || !p2) return { min };
  const t2 = (p1.md !== p2.md ? p2.md + " " : "") + p2.hm;
  return { min, from: p1.hm, to: t2, zone: zoneName(p2.off || p1.off) };
}

const DONE_DEP = ["Departed", "EnRoute", "Approaching", "Arrived"];
const TH = 10; // 10分以上ずれたらお知らせにする

function amount(min) {
  const a = Math.abs(min), h = Math.floor(a / 60), m = a % 60;
  return "約" + (h ? h + "時間" + (m ? m + "分" : "") : m + "分");
}

// AeroDataBox の1便分（なければ null）から、お知らせ1件を作る
export function buildNotice(f, info, nowIso) {
  const base = { id: f.id, label: f.label, route: f.route, until: untilOf(f), state: "ontime", text: "", sig: "ontime", checked: nowIso };
  if (!info) return Object.assign(base, { state: "unknown", sig: "unknown" });
  const status = info.status || "";
  const head = f.route + "（" + f.id + "）";
  if (/Cancel/i.test(status)) {
    return Object.assign(base, { state: "cancel", sig: "cancel", text: head + "は欠航と発表されています。先生の指示に従ってください。" });
  }
  if (/Divert/i.test(status)) {
    return Object.assign(base, { state: "divert", sig: "divert", text: head + "は、ほかの空港へ行き先が変わりました（ダイバート）。先生の指示に従ってください。" });
  }
  const d = shift(info.departure), a = shift(info.arrival), parts = [];
  const departed = DONE_DEP.indexOf(status) >= 0, arrived = status === "Arrived";
  if (d && d.from && Math.abs(d.min) >= TH) {
    parts.push("出発が" + amount(d.min) + (d.min > 0 ? (departed ? "遅れました" : "遅れる見込み") : (departed ? "早まりました" : "早まる見込み")) +
      "（" + d.from + "→" + d.to + " " + d.zone + "）");
  }
  if (a && a.from && Math.abs(a.min) >= TH) {
    parts.push("到着が" + amount(a.min) + (a.min > 0 ? (arrived ? "遅れました" : "遅れる見込み") : (arrived ? "早まりました" : "早まる見込み")) +
      "（" + a.from + "→" + a.to + " " + a.zone + "）");
  }
  if (!parts.length) return base;
  // 遅れが1つでもあれば「遅れ」、なければ「早まり」
  const late = (d && d.min >= TH) || (a && a.min >= TH);
  const state = late ? "delay" : "early";
  // 通知を送り直すかの目安：15分きざみで変わったときだけ
  const bucket = function (x) { return x ? Math.round(x.min / 15) : 0; };
  return Object.assign(base, { state, sig: state + ":" + bucket(d) + ":" + bucket(a), text: head + "：" + parts.join("／") });
}

// AeroDataBox の結果（配列）から、その便の出発日の1件を選ぶ。
// 同じ便名で別の区間を飛ぶことがある（UA32 は成田→セブも UA32）ので、出発空港が合うものだけを見る
export function pickFlight(list, f) {
  if (!Array.isArray(list) || !list.length) return null;
  const want = Date.parse(f.dep);
  let best = null, bd = Infinity;
  for (const x of list) {
    const ap = x && x.departure && x.departure.airport && x.departure.airport.iata;
    if (ap && f.from && ap !== f.from) continue;
    const t = ms(x && x.departure && x.departure.scheduledTime);
    const dd = isNaN(t) ? Infinity : Math.abs(t - want);
    if (dd < bd) { bd = dd; best = x; }
  }
  return bd <= 12 * H ? best : null;
}
