// 研修の便（UA34・UA32・JL3009）の状況を AeroDataBox で調べ、flight-status.json（flight-data ブランチ）に書き出す。
// 遅れ・早まり・欠航が新しく出たときは、お知らせの通知をオンにしている人へプッシュ通知も送る。
// GitHub Actions が20分ごとに実行する。調べるのは各便の出発6時間前〜到着2時間後だけ（無料枠を使い切らないため）。
//   node check-flights.mjs --window  … 今が調べる時間帯かどうかだけを出力する（ライブラリのインストール前に使う）
import { FLIGHTS, inWindow, buildNotice, pickFlight } from "./flight-lib.mjs";
import fs from "fs";

const now = Date.now();
const active = FLIGHTS.filter(function (f) { return inWindow(f, now); });

if (process.argv.includes("--window")) {
  console.log("active flights: " + (active.map(function (f) { return f.id; }).join(",") || "none"));
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, "active=" + (active.length ? "true" : "false") + "\n");
  process.exit(0);
}

const REPO = process.env.GITHUB_REPOSITORY || "RIU11/overseas-training-app";
const BRANCH = "flight-data";
const FILE = "flight-status.json";
const GH = { Authorization: "Bearer " + process.env.GITHUB_TOKEN, Accept: "application/vnd.github+json", "User-Agent": "trip-flight-status" };
const DB_URL = "https://training-share-bd181-default-rtdb.firebaseio.com";

async function readPrev() {
  const r = await fetch("https://api.github.com/repos/" + REPO + "/contents/" + FILE + "?ref=" + BRANCH, { headers: GH });
  if (!r.ok) { console.log("prev file not found: " + r.status); return { sha: null, data: { flights: [] } }; }
  const j = await r.json();
  let data = { flights: [] };
  try { data = JSON.parse(Buffer.from(j.content, "base64").toString("utf8")); } catch (e) { /* 壊れていたら作り直す */ }
  return { sha: j.sha, data };
}

async function writeFile(sha, data) {
  const body = { message: "便の状況を更新 " + data.checked, branch: BRANCH, content: Buffer.from(JSON.stringify(data, null, 1) + "\n").toString("base64") };
  if (sha) body.sha = sha;
  const r = await fetch("https://api.github.com/repos/" + REPO + "/contents/" + FILE, { method: "PUT", headers: GH, body: JSON.stringify(body) });
  console.log("write " + FILE + ": " + r.status);
  if (!r.ok) throw new Error("write failed " + r.status + " " + (await r.text()));
}

async function lookup(f) {
  const url = "https://aerodatabox.p.rapidapi.com/flights/number/" + f.id + "/" + f.date + "?withAircraftImage=false&withLocation=false&dateLocalRole=Departure";
  const r = await fetch(url, { headers: { "X-RapidAPI-Key": process.env.AERODATABOX_KEY, "X-RapidAPI-Host": "aerodatabox.p.rapidapi.com" } });
  console.log(f.id + ": http " + r.status);
  if (r.status === 204) return { ok: true, info: null };
  if (!r.ok) return { ok: false };
  const list = await r.json();
  const info = pickFlight(list, f);
  if (info) console.log("  status=" + info.status + " dep.rev=" + JSON.stringify(info.departure && (info.departure.revisedTime || info.departure.predictedTime)) + " arr.rev=" + JSON.stringify(info.arrival && (info.arrival.revisedTime || info.arrival.predictedTime)));
  return { ok: true, info };
}

let pushCtx = null;
async function pushAll(title, body, tag) {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT || !process.env.VAPID_PRIVATE_KEY) { console.log("push skipped (no secrets)"); return; }
  if (!pushCtx) {
    const admin = (await import("firebase-admin")).default, webpush = (await import("web-push")).default;
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)), databaseURL: DB_URL });
    webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    pushCtx = { db: admin.database(), webpush };
  }
  const subs = (await pushCtx.db.ref("pushSubs").get()).val() || {};
  const payload = JSON.stringify({ title, body, tag });
  for (const id of Object.keys(subs)) {
    try { await pushCtx.webpush.sendNotification(subs[id], payload); }
    catch (err) {
      console.log("  send failed -> " + id + " status=" + err.statusCode);
      if (err.statusCode === 404 || err.statusCode === 410) await pushCtx.db.ref("pushSubs/" + id).remove();
    }
  }
  console.log("pushed to " + Object.keys(subs).length + ": " + body);
}

async function main() {
  if (!active.length) { console.log("no flight in window"); return; }
  if (!process.env.AERODATABOX_KEY) { console.log("AERODATABOX_KEY is not set. skip."); return; }
  const prev = await readPrev();
  const prevById = {};
  (prev.data.flights || []).forEach(function (x) { prevById[x.id] = x; });
  const checked = new Date(now).toISOString();
  const out = [];
  for (const f of FLIGHTS) {
    if (!inWindow(f, now)) { if (prevById[f.id]) out.push(prevById[f.id]); continue; }
    const res = await lookup(f);
    if (!res.ok) { if (prevById[f.id]) out.push(prevById[f.id]); continue; } // 取れなかったら前回の分を残す
    const n = buildNotice(f, res.info, checked);
    if (n.state === "unknown" && prevById[f.id]) { out.push(prevById[f.id]); continue; }
    out.push(n);
    const before = prevById[f.id] ? prevById[f.id].sig : "ontime";
    if (n.sig !== before && ["delay", "early", "cancel", "divert"].indexOf(n.state) >= 0) {
      await pushAll("✈ 飛行機の情報（" + f.label + "）", n.text, "trip-flight-" + f.id);
    }
  }
  await writeFile(prev.sha, { checked, flights: out });
}

main().then(function () { process.exit(0); }).catch(function (e) { console.error(e); process.exit(1); });
