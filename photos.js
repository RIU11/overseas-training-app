// 写真データ（Wikimedia Commons の作品を、リサイズして使用）
// 各写真の撮影者・ライセンスは credits に記載し、アプリの「便利 → 写真クレジット」に表示する。
window.PHOTOS = {
  home: "gg-dusk",
  // 背景スライドショーの順番（夜景中心）
  bgs: ["gg-dusk", "sf-night", "la-night", "disneyland", "bay-bridge", "santa-monica-night", "sf-neon", "palace", "la-night2", "gg-glow"],
  // 日程の各日の写真
  day: { 1: "gg-glow", 2: "silicon-valley", 3: "pier39", 4: "yosemite", 5: "hollywood", 6: "la-night", 7: "santa-monica", 8: "disneyland", 9: "la-dusk", 10: "gg-alcatraz" },
  // ホテル（T.hotels の順）の写真
  hotel: ["silicon-valley", "yosemite", "la-night2"],
  list: {
    "gg-dusk": { cap: "ゴールデン・ゲート・ブリッジ（フォート・ポイント）" },
    "gg-glow": { cap: "夕暮れのゴールデン・ゲート・ブリッジ" },
    "sf-night": { cap: "サンフランシスコのスカイライン" },
    "bay-bridge": { cap: "ベイ・ブリッジの夜景" },
    "sf-neon": { cap: "フェリービルディングと夜のサンフランシスコ" },
    "palace": { cap: "パレス・オブ・ファイン・アーツ" },
    "silicon-valley": { cap: "サンノゼの夜景（シリコンバレー）" },
    "pier39": { cap: "ピア39とフィッシャーマンズワーフ" },
    "yosemite": { cap: "ヨセミテ渓谷（トンネルビュー）" },
    "hollywood": { cap: "ハリウッドサイン" },
    "la-night": { cap: "ダウンタウン・ロサンゼルスの夜景" },
    "la-night2": { cap: "ロサンゼルスの夜景" },
    "santa-monica": { cap: "夕暮れのサンタモニカ・ピア" },
    "santa-monica-night": { cap: "夜のサンタモニカ・ピア" },
    "disneyland": { cap: "ディズニーランド（眠れる森の美女の城）" },
    "la-dusk": { cap: "夕暮れのロサンゼルス・ダウンタウン" },
    "gg-alcatraz": { cap: "アルカトラズ島から見た夕暮れのゴールデン・ゲート・ブリッジ" }
  },
  credits: [
    { file: "gg-dusk", artist: "Brocken Inaglory", license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/", page: "https://commons.wikimedia.org/wiki/File:Fort_Point_National_Historic_Site_and_Golden_Gate_Bridge.jpg" },
    { file: "gg-glow", artist: "Regicreate", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", page: "https://commons.wikimedia.org/wiki/File:Golden_Gate_at_dusk.jpg" },
    { file: "sf-night", artist: "Dllu", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", page: "https://commons.wikimedia.org/wiki/File:San_Francisco_skyline_of_April_2017_seen_from_Treasure_Island.jpg" },
    { file: "bay-bridge", artist: "Dllu", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", page: "https://commons.wikimedia.org/wiki/File:San_Francisco_Bay_Bridge_Western_Span_at_night.jpg" },
    { file: "sf-neon", artist: "Dllu", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", page: "https://commons.wikimedia.org/wiki/File:View_of_the_Ferry_Building_from_Treasure_Island,_San_Francisco_dllu.jpg" },
    { file: "palace", artist: "King of Hearts", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", page: "https://commons.wikimedia.org/wiki/File:Palace_of_Fine_Arts_San_Francisco_January_2014_001.jpg" },
    { file: "silicon-valley", artist: "Ben Loomis", license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0/", page: "https://commons.wikimedia.org/wiki/File:San_Jose_CA_skyline_at_night_2014.jpg" },
    { file: "pier39", artist: "Dietmar Rabich", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", page: "https://commons.wikimedia.org/wiki/File:San_Francisco_(CA,_USA),_Fisherman%27s_Wharf,_Pier_39_--_2012_--_4196.jpg" },
    { file: "yosemite", artist: "Diliff", license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/", page: "https://commons.wikimedia.org/wiki/File:Tunnel_View,_Yosemite_Valley,_Yosemite_NP_-_Diliff.jpg" },
    { file: "hollywood", artist: "AramilFeraxa", license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/", page: "https://commons.wikimedia.org/wiki/File:Hollywood_sign_seen_from_Dolby_Theatre.jpg" },
    { file: "la-night", artist: "Camiloarenivar", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", page: "https://commons.wikimedia.org/wiki/File:Downtown_Los_Angeles_at_Night.jpg" },
    { file: "la-night2", artist: "Hannes Flo from Austria", license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0/", page: "https://commons.wikimedia.org/wiki/File:Los_angeles_at_night_ii_-_Flickr_-_hannes-flo.jpg" },
    { file: "santa-monica", artist: "Erwin Kreijne", license: "CC BY 3.0", licenseUrl: "https://creativecommons.org/licenses/by/3.0/", page: "https://commons.wikimedia.org/wiki/File:Santa_Monica_Pier_after_Sunset_-_panoramio.jpg" },
    { file: "santa-monica-night", artist: "Evasion Photography", license: "Public domain", licenseUrl: "", page: "https://commons.wikimedia.org/wiki/File:SantaMonicaPierFerrisWheel.jpg" },
    { file: "disneyland", artist: "MatthiasKabel", license: "CC BY 2.5", licenseUrl: "https://creativecommons.org/licenses/by/2.5/", page: "https://commons.wikimedia.org/wiki/File:Disneyland_Castle_Sleeping_Beauty_at_night.jpg" },
    { file: "la-dusk", artist: "Michael Chusid", license: "CC0", licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/", page: "https://commons.wikimedia.org/wiki/File:SkylineFromThe101LookingWest-Winter.jpg" },
    { file: "gg-alcatraz", artist: "William Warby", license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0/", page: "https://commons.wikimedia.org/wiki/File:Golden_Gate_Bridge_at_dusk,_seen_from_Alcatraz_island,_San_Francisco,_California.jpg" }
  ]
};
