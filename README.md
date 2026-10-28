# 研修ガイド（サンフランシスコ・ロサンゼルス）

海外実学研修（2026/11/17〜11/26）で使う、スマホ向けの個人用ガイドアプリです。
日程、持ち物チェックリスト、ルール、ホテル情報、チップ計算などをまとめています。
背景には、行き先の夜景や名所の写真をスライドショーで表示します。

- 右上の🔍で、日程・準備・ルール・ホテル・英語をまとめて検索できます（ひらがな／カタカナ／全角半角の違いを無視。結果をタップすると、その場所へ移動して光ります）。
- ホームでは、出発前は集合までの残り時間、出発後は「次の予定」とその残り時間を自動で表示します（集合などの大事な予定は赤で強調）。日本時間と現地時間の予定を、世界共通の時刻に直して数えています。
- 「便利」タブの一番上に、英語の機能があります。
  - 日本語を入力すると、入力が止まったところで自動で英語に翻訳し、下に表示します（Google翻訳のような操作）。英語の下のスピーカーを押すと、音声で読み上げます。無料の翻訳サービス MyMemory を使うため、ネット接続が必要です。入力した文は翻訳のためにそのサービスへ送られるので、名前・住所・電話番号などは入れないでください。
  - よく使う英語カードと同じ文は、通信なしでカードの英語をすぐ表示します。
  - 入力に近い「よく使う英語カード」を、通信なしで表示します。カードは8分野・約90枚（緊急・体調／聞き返す／ホテル／食事・買い物／移動・場所／研修先で／空港・入国審査／あいさつ）。
  - 英語の読み上げ（ふつう／ゆっくり）と、相手に見せる大きな画面（画面が消えないようにします）があります。
- 「準備」タブの「自分の持ち物」に、自分用の持ち物を追加できます（上の欄に入力して「追加」。下にチェックリストとして並び、削除もできます。端末内にだけ保存）。
- 右上の≡を押すと目次が開きます。ホーム・日程・準備・ルール・ホテル・便利の各ページを押すと移動します。画面下のタブはなく、ページの移動はすべてこの目次から行います。
- 「地図」ページの一番上に地図があり、その下の「日にちを選ぶ」バーで1日目〜9日目を選ぶと、その日に行く場所（★）と、そのまわりのお店が地図に丸い印で出ます（食事＝赤、カフェ＝茶、お店＝紫）。★や行き先のボタンを押すと、その場所のお店の一覧（種類・距離・値段の目安・Googleマップへのリンク）が下に出ます。レストランには「$〜$$$」の値段の目安（お店の種類から付けたもので、正確ではありません）と、為替レートを入れていれば日本円の目安を出します。現在地が予定の場所の近くなら、その場所を自動で選びます。
- 「地図」ページで、現在地を地図に表示します。初めて開いたときに「現在地を使いますか？」と出て、OKを押して許可すると表示されます（あとから地図ページの「現在地を表示」でも使えます）。現在地はこの端末の中だけで使い、保存や送信はしません。地図の画像は OpenStreetMap から読み込むため、ネット接続が必要です。
- HTML/CSS/JavaScript だけで動きます（ビルド不要）。
- 一度開けば、電波がなくても見られます（Service Worker）。
- チェックやメモは、各自のブラウザの中にだけ保存されます。

## 注意
- 配布資料の内容を、文字で整理したものです。変更があった場合は、学校の最新の資料と先生の案内を優先してください。
- 資料の画像、QRコード、ログイン情報、個人名、緊急連絡先は含めていません。
- 緊急連絡先などは、アプリの「便利 → マイ情報」に各自で入力します（端末内にだけ保存）。

## アイコンについて
ホーム画面のアイコンは、`img/gg-dusk.jpg`（Brocken Inaglory 撮影、CC BY-SA 3.0）を切り抜き、ポップ体のカラフルな文字を重ねたものです。同じライセンス（CC BY-SA 3.0）で公開します。

## 写真について
`img/` の写真は、すべて Wikimedia Commons で公開されている作品です。
スマホで見やすいように、リサイズとJPEGの再圧縮をしています（内容の加工はしていません）。
各写真の著作権は撮影者にあり、下記のライセンスに従って使用しています。アプリの「便利 → 写真クレジット」にも同じ内容を表示しています。

| ファイル | 内容 | 撮影者 | ライセンス | 元の写真 |
|---|---|---|---|---|
| gg-dusk | ゴールデン・ゲート・ブリッジ（フォート・ポイント） | Brocken Inaglory | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) | [Commons](https://commons.wikimedia.org/wiki/File:Fort_Point_National_Historic_Site_and_Golden_Gate_Bridge.jpg) |
| gg-glow | 夕暮れのゴールデン・ゲート・ブリッジ | Regicreate | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons](https://commons.wikimedia.org/wiki/File:Golden_Gate_at_dusk.jpg) |
| sf-night | サンフランシスコのスカイライン | Dllu | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons](https://commons.wikimedia.org/wiki/File:San_Francisco_skyline_of_April_2017_seen_from_Treasure_Island.jpg) |
| bay-bridge | ベイ・ブリッジの夜景 | Dllu | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons](https://commons.wikimedia.org/wiki/File:San_Francisco_Bay_Bridge_Western_Span_at_night.jpg) |
| sf-neon | フェリービルディングと夜のサンフランシスコ | Dllu | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons](https://commons.wikimedia.org/wiki/File:View_of_the_Ferry_Building_from_Treasure_Island,_San_Francisco_dllu.jpg) |
| palace | パレス・オブ・ファイン・アーツ | King of Hearts | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons](https://commons.wikimedia.org/wiki/File:Palace_of_Fine_Arts_San_Francisco_January_2014_001.jpg) |
| silicon-valley | サンノゼの夜景（シリコンバレー） | Ben Loomis | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) | [Commons](https://commons.wikimedia.org/wiki/File:San_Jose_CA_skyline_at_night_2014.jpg) |
| pier39 | ピア39とフィッシャーマンズワーフ | Dietmar Rabich | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons](https://commons.wikimedia.org/wiki/File:San_Francisco_(CA,_USA),_Fisherman%27s_Wharf,_Pier_39_--_2012_--_4196.jpg) |
| yosemite | ヨセミテ渓谷（トンネルビュー） | Diliff | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) | [Commons](https://commons.wikimedia.org/wiki/File:Tunnel_View,_Yosemite_Valley,_Yosemite_NP_-_Diliff.jpg) |
| hollywood | ハリウッドサイン | AramilFeraxa | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | [Commons](https://commons.wikimedia.org/wiki/File:Hollywood_sign_seen_from_Dolby_Theatre.jpg) |
| la-night | ダウンタウン・ロサンゼルスの夜景 | Camiloarenivar | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons](https://commons.wikimedia.org/wiki/File:Downtown_Los_Angeles_at_Night.jpg) |
| la-night2 | ロサンゼルスの夜景 | Hannes Flo from Austria | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) | [Commons](https://commons.wikimedia.org/wiki/File:Los_angeles_at_night_ii_-_Flickr_-_hannes-flo.jpg) |
| santa-monica | 夕暮れのサンタモニカ・ピア | Erwin Kreijne | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) | [Commons](https://commons.wikimedia.org/wiki/File:Santa_Monica_Pier_after_Sunset_-_panoramio.jpg) |
| santa-monica-night | 夜のサンタモニカ・ピア | Evasion Photography | パブリックドメイン | [Commons](https://commons.wikimedia.org/wiki/File:SantaMonicaPierFerrisWheel.jpg) |
| disneyland | ディズニーランド（眠れる森の美女の城） | MatthiasKabel | [CC BY 2.5](https://creativecommons.org/licenses/by/2.5/) | [Commons](https://commons.wikimedia.org/wiki/File:Disneyland_Castle_Sleeping_Beauty_at_night.jpg) |
| la-dusk | 夕暮れのロサンゼルス・ダウンタウン | Michael Chusid | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) | [Commons](https://commons.wikimedia.org/wiki/File:SkylineFromThe101LookingWest-Winter.jpg) |
| gg-alcatraz | アルカトラズ島から見た夕暮れのゴールデン・ゲート・ブリッジ | William Warby | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) | [Commons](https://commons.wikimedia.org/wiki/File:Golden_Gate_Bridge_at_dusk,_seen_from_Alcatraz_island,_San_Francisco,_California.jpg) |

## ローカルで試す
`index.html` をブラウザで開く。または `python -m http.server` で配信して http://localhost:8000 を開く。

## 地図について
- 地図の画像: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors（ODbL）。無料の公開タイルサーバーを、個人の少人数の利用の範囲で使っています。
- 地図の部品: [Leaflet](https://leafletjs.com/) 1.9.4（BSD-2-Clause）を `vendor/` に同梱しています。

## お店のデータについて
- 地図ページのお店のデータは [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors（ODbL）です。予定の行き先のまわりのお店は、事前に取り込んだデータ（`shops-data.js`）を使い、「最新の情報に更新」を押すと、公開の Overpass API から最新を取得します（公開サーバーは混んでいて、遅いことや、つながらないことがあります）。
- 現在地の周辺を調べたときは、その座標を Overpass API へ送ってお店を探します。結果は、その端末に保存されます。
- 値段は、お店の種類から付けた目安です。営業時間・閉店・移転は、最新ではないことがあります。

## 使いやすさの工夫
- メニューは、右下に浮かぶ「≡ メニュー」ボタンから開きます（親指で届く位置。下から出るパネルで、2列に並びます）。
- ホームに、ショートカット（英語翻訳・地図とお店・持ち物）、日本と現地の時計、現地の天気を表示します。天気は [Open-Meteo](https://open-meteo.com/)（無料・キー不要）から取得します。研修の10日間は、各日の最初の行き先付近の最高・最低気温と降水確率を、横にスクロールして見られます（開くたびに、1時間より古ければ取り直します。予報が出る約16日先までが対象で、先の日は「予報まだ」と出ます）。研修当日は、その日の行き先ごとの、時間ごとの気温と降水確率が出ます。取得に使うのは、予定の場所の座標だけです。
- 地図の日にちバーは、研修期間中は今日の日にちを最初から選びます（現在地が分かれば、近くの予定の場所を優先します）。
- 押す場所は 44px 以上にそろえています。
- 「便利 › 表示の設定」で、文字の大きさ（標準・大・特大）、背景の写真（ふつう・暗く・止める・なし）、高コントラストを切り替えられます。
- ネットにつながっていないときは、左下に「オフライン中」と表示します。
- 初めて開いたときは、①現在地の許可 → ②ホーム画面への追加、の順に案内します。Android（Chrome など）は、OKを押すとそのまま追加の確認が出ます。iPhone は仕組み上、アプリ側から自動では追加できないため、OKを押すと共有メニューを自動で開き、そのあとの操作（「ホーム画面に追加」→「追加」）を案内します。使い方ガイド（現在地／ホーム画面に追加／電波なしの確認）は、メニューや「表示の設定」から、いつでも見られます。
