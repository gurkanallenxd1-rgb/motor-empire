// Artwork drawn for the project. Links document body differences and colors;
// they do not grant use of manufacturer photography or approve an illustration.
const yamaha = 'https://www.yamaha-motor.eu';
const honda = 'https://www.honda.co.uk/motorcycles';
const ktm2023 = 'https://press.ktm.com/news-ktm-updates-its-2023-street-range-with-fresh-new-colorways?id=168537&l=international&menueid=3050';
const r25 = 'https://bike-rental.yamaha-motor.co.jp/jp/bike/info/list';
const rows = [
  ['yamaha-mt07',2014,2017,'İlk kasa · Halojen far',0,0,yamaha+'/me/sr/news/2017/yamaha-reveal-2018-model-range/'],
  ['yamaha-mt07',2018,2020,'2018 makyajı · Ön maske',0,1,'https://cdn2.yamaha-motor.eu/prod/product-assets/2018/MT07/Factsheets/2018-MT07_en.pdf'],
  ['yamaha-mt07',2021,2024,'2021 kasa · Y biçimli LED',0,2,yamaha+'/ee/et/news/2020/2021-mt-07--dark-attraction/'],
  ['yamaha-mt07',2025,2025,'2025 kasa · Ters maşa ve yeni far',0,3,yamaha+'/al/en/news/2024/mt-07-2025/'],
  ['yamaha-mt09',2021,2023,'Üçüncü nesil · Açık merkez projektör',0,4,'https://cdn2.yamaha-motor.eu/prod/product-assets/2021/MT09/Factsheets/2021-MT09_en.pdf'],
  ['yamaha-mt09',2024,2025,'Dördüncü nesil · Kapalı far ve yeni depo',0,5,yamaha+'/gb/en/news/2023/2024-mt-09/'],
  ['honda-pcx125',2021,2024,'2021 kasa · İlk LED ön yüz',1,0,'https://hondanews.eu/eu/et/motorcycles/media/pressreleases/312509/21ym-honda-pcx125'],
  ['honda-pcx125',2025,2025,'2025 makyajı · Yeni ön panel',1,1,'https://hondanews.eu/eu/en/motorcycles/media/pressreleases/503766/photos'],
  ['ktm-duke390',2017,2022,'373 cc kasa · Bölünmüş LED',1,2,'https://www.ktm.com/fr-fr/parts---wear/powerparts/products.html'],
  ['ktm-duke390',2023,2023,'373 cc kasa · 2023 renk paketi',1,3,ktm2023],
  ['yamaha-r25',2015,2018,'İlk kasa · Geleneksel ön maşa',2,0,'https://www.yamaha-motor.co.jp/mc/yamaha-motor-life/2024/11/20241129-001.html'],
  ['yamaha-r25',2019,2024,'2019 makyajı · Çift LED ve ters maşa',2,1,'https://www.yamaha-motor.co.jp/mc/yamaha-motor-life/2019/03/20190305-001.html'],
  ['yamaha-r25',2025,2025,'2025 ön grenajı',2,2,r25],
  ['honda-cb125f',2016,2020,'İlk CB125F kasası',2,3,honda+'/ride-with-us/news/new-cb125f-makes-european-debut-at-motorcycle-live.html'],
  ['honda-cb125f',2021,2024,'eSP kasası · Güncellenen gövde',2,4,'https://hondanews.eu/gb/en/motorcycles/media/pressreleases/308250/21ym-honda-cb125f-37'],
  ['kawasaki-z900',2017,2019,'İlk Sugomi kasası',3,0,'https://storage.kawasaki.eu/repository/nl/nl-NL/Brochures_MY20/20MY_Supernaked_brochure-web.pdf'],
  ['kawasaki-z900',2020,2024,'2020 makyajı · LED ön yüz',3,1,'https://storage.kawasaki.eu/repository/nl/nl-NL/Brochures_MY20/20MY_Supernaked_brochure-web.pdf'],
  ['kawasaki-z900',2025,2025,'2025 Sugomi · Yeni far ve yan kapaklar',3,2,'https://www.kawasaki.eu/en/news/2024/october/new-season-z900-delivers-a-feast-for-the-senses.html'],
  ['yamaha-mt25',2016,2019,'İlk kasa · Halojen far',3,3,'https://global.yamaha-motor.com/news/2015/0608/mt-25.html'],
  ['yamaha-mt25',2020,2024,'2020 kasa · İkili konum ışığı',3,4,'https://global.yamaha-motor.com/jp/news/2020/0225/mt-25.html'],
  ['yamaha-mt25',2025,2025,'2025 kasa · Güncellenen ön yüz',3,5,r25],
];

const standalone = {
  'vespa-primavera125': [
    {firstYear:2024,lastYear:2024,label:'2024 makyajı · LED aydınlatma',
      source:'https://www.vespa.com/es_ES/models/primavera/primavera-red-125-4s3v-2024/'},
    {firstYear:2021,lastYear:2023,label:'Primavera 125 i-get · Yuvarlak far',
      source:'https://wlassets.vespa.com/wlassets/vespa/de/tech_spec/2021-07_TD_Vespa_Primavera-125-RED.pdf/original/2021-07_TD_Vespa_Primavera-125-RED.pdf.pdf'},
  ],
  'ktm-super-duke1390': [
    {firstYear:2024,lastYear:2024,label:'1390 Super Duke R · LED far ve depo kanatları',
      source:'https://press.ktm.com/news-introducing-the-ktm-1390-super-duke-r-the-beast-reborn?id=189969&l=uk&menueid=5904'},
  ],
};

export function generationFor(modelId,year) {
  if (!Number.isInteger(year)) return null;
  if (Object.prototype.hasOwnProperty.call(standalone,modelId)) {
    const generation = standalone[modelId].find(item=>year>=item.firstYear && year<=item.lastYear);
    if (!generation) return null;
    const path = `generations/${modelId}-${generation.firstYear}`;
    return {...generation,base:`${path}.webp`,mask:`${path}-mask.webp`,minWidth:640};
  }
  const row = rows.find(([id,first,last])=>id === modelId && year >= first && year <= last);
  if (!row) return null;
  const [,firstYear,lastYear,label,atlas,cell,source] = row;
  return {
    firstYear,lastYear,label,source,
    base:`generations/gen-${atlas}.webp`,mask:`generations/gen-${atlas}-mask.webp`,
    rect:[(cell % 3)*360,Math.floor(cell / 3)*280,360,280],
  };
}
