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
- HTML/CSS/JavaScript だけで動きます（ビルド不要）。
- 一度開けば、電波がなくても見られます（Service Worker）。
- チェックやメモは、各自のブラウザの中にだけ保存されます。

## 注意
- 配布資料の内容を、文字で整理したものです。変更があった場合は、学校の最新の資料と先生の案内を優先してください。
- 資料の画像、QRコード、ログイン情報、個人名、緊急連絡先は含めていません。
- 緊急連絡先などは、アプリの「便利 → マイ情報」に各自で入力します（端末内にだけ保存）。

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
