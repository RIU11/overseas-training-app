// 位置の共有に使うサーバー（Firebase Realtime Database）の URL。
// 設定していないあいだは、共有の機能は「準備中」と表示され、何も送られません。
// 例: "https://（プロジェクト名）-default-rtdb.firebaseio.com"
window.TRIP_SHARE = { db: "https://training-share-bd181-default-rtdb.firebaseio.com" };

// 仕様変更のお知らせを、アプリを閉じていてもプッシュ通知で受け取るための公開鍵（秘密鍵は別途サーバー側だけで保管）
window.VAPID_PUBLIC_KEY = "BIeekMnNQ-Me42hwFC8D-jcia6_swHKq8JKA8j2rgVCVWfEyJ8voARyq5qxAJSbHFRKxPCzcJEgohwpSVZ5u4_c";
