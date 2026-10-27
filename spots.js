// 予定表の行き先（座標は OpenStreetMap で確認した場所）。r は、周辺のお店を探す範囲（メートル）。
// 会社・施設の訪問先のうち、周辺にお店を探す意味が薄いものは入れていない。
window.TRIP_SPOTS = [
  { id: "twin", day: 1, name: "ツイン・ピークス", lat: 37.7544, lng: -122.4477, r: 900 },
  { id: "ggb", day: 1, name: "ゴールデン・ゲート・ブリッジ", lat: 37.8077, lng: -122.4750, r: 700 },
  { id: "palace", day: 1, name: "パレス・オブ・ファイン・アーツ", lat: 37.8029, lng: -122.4484, r: 600 },
  { id: "apple", day: 1, name: "アップル・パーク・ビジター・センター", lat: 37.3328, lng: -122.0054, r: 700 },
  { id: "hotel1", day: 1, name: "ホテル（Embassy Suites Milpitas）", lat: 37.4346, lng: -121.8919, r: 700 },
  { id: "intel", day: 2, name: "インテル・ミュージアム", lat: 37.3878, lng: -121.9634, r: 800 },
  { id: "chm", day: 2, name: "コンピューター・ヒストリー・ミュージアム", lat: 37.4143, lng: -122.0774, r: 900 },
  { id: "google", day: 2, name: "グーグル・ビジター・エクスペリエンス", lat: 37.4219, lng: -122.0803, r: 900 },
  { id: "hpg", day: 3, name: "HPガレージ", lat: 37.4429, lng: -122.1546, r: 700 },
  { id: "pier39", day: 3, name: "ピア39", lat: 37.8088, lng: -122.4101, r: 450 },
  { id: "wharf", day: 3, name: "フィッシャーマンズワーフ", lat: 37.8081, lng: -122.4166, r: 450 },
  { id: "tunnel", day: 3, name: "トンネルトップパーク", lat: 37.8029, lng: -122.4559, r: 700 },
  { id: "wdfm", day: 3, name: "ウォルト・ディズニー・ファミリー・ミュージアム", lat: 37.8014, lng: -122.4587, r: 700 },
  { id: "hotel2", day: 3, name: "ホテル（SpringHill Suites Modesto）", lat: 37.6646, lng: -121.0266, r: 800 },
  { id: "yosemite", day: 4, name: "ヨセミテ・ロッジ周辺", lat: 37.7433, lng: -119.5984, r: 900 },
  { id: "hollywood", day: 5, name: "ハリウッド（TCLチャイニーズ・シアター周辺）", lat: 34.1021, lng: -118.3410, r: 450 },
  { id: "hotel3", day: 5, name: "ホテル（Residence Inn Torrance）", lat: 33.8383, lng: -118.3521, r: 800 },
  { id: "otis", day: 6, name: "オーティス・カレッジ・オブ・アート・アンド・デザイン", lat: 33.9567, lng: -118.4172, r: 800 },
  { id: "comicbug", day: 6, name: "コミック・バグ", lat: 33.8876, lng: -118.3804, r: 500 },
  { id: "science", day: 7, name: "サイエンス・センター", lat: 34.0160, lng: -118.2863, r: 700 },
  { id: "smonica", day: 7, name: "サンタモニカ・ビーチ／ピア", lat: 34.0089, lng: -118.4974, r: 500 },
  { id: "disney", day: 8, name: "ディズニーランド・リゾート", lat: 33.8137, lng: -117.9197, r: 800 },
  { id: "lax", day: 9, name: "ロサンゼルス空港", lat: 33.9422, lng: -118.4214, r: 1200 }
];
