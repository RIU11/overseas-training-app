// announce-data.json の先頭（最新）が、前回送った分と違っていたら、全員にプッシュ通知を送る。
// GitHub Actions が main への push ごとに実行するが、違いが無ければ何もしない（安全）。
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import webpush from "web-push";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_URL = "https://training-share-bd181-default-rtdb.firebaseio.com";

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount), databaseURL: DB_URL });
const db = admin.database();

webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

async function main() {
  const entries = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "announce-data.json"), "utf8"));
  const top = entries[0];
  if (!top) { console.log("no entries"); return; }

  const metaRef = db.ref("announceMeta/lastSentId");
  const lastSent = (await metaRef.get()).val();
  if (lastSent === top.id) { console.log("already sent: " + top.id); return; }

  const subsSnap = await db.ref("pushSubs").get();
  const subs = subsSnap.val() || {};
  const ids = Object.keys(subs);
  console.log("new entry " + top.id + ", subs=" + ids.length);

  const bodyText = (top.body || []).map(function (b) { return typeof b === "string" ? b : ((b.loc ? "【" + b.loc + "】" : "") + b.text); }).join("\n");
  const payload = JSON.stringify({ title: top.title || "お知らせ", body: bodyText, tag: "trip-announce-" + top.id });

  for (const id of ids) {
    try {
      await webpush.sendNotification(subs[id], payload);
      console.log("  sent ok -> " + id);
    } catch (err) {
      console.log("  send failed -> " + id + " status=" + err.statusCode);
      if (err.statusCode === 404 || err.statusCode === 410) await db.ref("pushSubs/" + id).remove();
    }
  }

  await metaRef.set(top.id);
  console.log("updated lastSentId -> " + top.id);
}

// firebase-adminのRTDB接続は開いたままになるため、処理が終わってもNodeプロセスが自然には終了しない。
// 明示的に終了させる（しないとGitHub Actionsのステップがタイムアウトするまで固まる）。
main().then(function () { process.exit(0); }).catch(function (e) { console.error(e); process.exit(1); });
