import { ISTANBUL, provinceName } from './provinces.mjs?v=0.12.5';
import { additions } from './catalog-data.mjs?v=0.12.5';
import { damageGrade, GRADE_LABELS } from './damage.mjs?v=0.12.5';

const models = [
  // Model ID, display name, category, displacement, PS, years, base buy and sale values (TL).
  ['honda-cb125f', 'Honda CB 125F', 'commuter', 124, 10.9, 2016, 2024, 49000, 79000],
  ['bajaj-pulsar-ns200', 'Bajaj Pulsar NS 200', 'naked', 199.5, 24.5, 2015, 2025, 38500, 50700],
  ['yamaha-ybr125', 'Yamaha YBR 125', 'commuter', 124, 10, 2009, 2017, 39000, 57000],
  ['suzuki-gn125', 'Suzuki GN 125', 'commuter', 124, 12, 2005, 2018, 25400, 32800],
  ['tvs-apache-rtr160', 'TVS Apache RTR 160', 'naked', 159.7, 15.5, 2016, 2024, 33800, 44800],
  ['mondial-drift-l', 'Mondial Drift L', 'commuter', 125, 11, 2016, 2023, 21700, 29100],
  ['honda-cbr125r', 'Honda CBR 125R', 'sport', 124.7, 13.3, 2011, 2017, 35400, 47000],
  ['yamaha-delight125', 'Yamaha Delight 125', 'scooter', 125, 8.4, 2018, 2025, 31200, 39400],
  ['yamaha-mt25', 'Yamaha MT-25', 'naked', 249, 36, 2016, 2025, 112000, 141000],
  ['yamaha-r25', 'Yamaha R25', 'sport', 249, 36, 2015, 2025, 125000, 155000],
  ['yamaha-mt07', 'Yamaha MT-07', 'naked', 689, 73.4, 2014, 2025, 233000, 279000],
  ['yamaha-mt09', 'Yamaha MT-09', 'naked', 889, 119, 2021, 2025, 345000, 398000],
  ['honda-cb250r', 'Honda CB250R', 'naked', 249, 27, 2018, 2024, 117000, 146000],
  ['honda-cbr250r', 'Honda CBR250R', 'sport', 249.6, 26, 2011, 2016, 81000, 104000],
  ['honda-pcx125', 'Honda PCX 125', 'scooter', 125, 12.5, 2021, 2025, 96000, 122000],
  ['honda-forza250', 'Honda Forza 250', 'scooter', 249, 23, 2018, 2025, 157000, 189000],
  ['ktm-duke250', 'KTM Duke 250', 'naked', 248.8, 30, 2017, 2023, 99000, 124000],
  ['ktm-duke390', 'KTM Duke 390', 'naked', 373.2, 44, 2017, 2023, 179000, 221000],
  ['bajaj-dominar400', 'Bajaj Dominar 400', 'naked', 373.3, 40, 2019, 2025, 106000, 134000],
  ['kawasaki-ninja400', 'Kawasaki Ninja 400', 'sport', 399, 45, 2018, 2023, 188000, 224000],
  ['kawasaki-z900', 'Kawasaki Z900', 'naked', 948, 125, 2017, 2025, 319000, 371000],
  ['rks-arome125', 'RKS Arome 125', 'scooter', 125, 8.7, 2021, 2025, 35700, 45900],
];

const additionsInLira = additions.map(([id,name,category,cc,hp,first,last,buy,value,paints]) =>
  [id,name,category,Number(cc),Number(hp),Number(first),Number(last),1000 * Number(buy),1000 * Number(value),paints]);

export const PAINT_COLORS = {
  black:{name:'Siyah',hex:'#292b2e'}, grey:{name:'Gri',hex:'#a0a6ae'}, white:{name:'Beyaz',hex:'#eae6da'},
  red:{name:'Kırmızı',hex:'#c93838'}, blue:{name:'Mavi',hex:'#3564ba'}, green:{name:'Yeşil',hex:'#639d34'},
  duke23orange:{name:'Turuncu / Mavi-gri',hex:'#e86920',accent:'#526279'},
  duke23grey:{name:'Mat gri / Siyah',hex:'#747c82',accent:'#292b2e'},
  orange:{name:'Turuncu',hex:'#e86920'}, yellow:{name:'Sarı',hex:'#e7b843'}, mirror:{name:'Ayna siyahı',hex:'#383a40'},
};

const legacyPaints = {
  'honda-cb125f':'black red white', 'bajaj-pulsar-ns200':'black white red', 'yamaha-ybr125':'black red blue',
  'suzuki-gn125':'black red', 'tvs-apache-rtr160':'black red grey', 'mondial-drift-l':'black red',
  'honda-cbr125r':'red black white', 'yamaha-delight125':'white grey black',
  'yamaha-mt25':'black blue', 'yamaha-r25':'blue black', 'yamaha-mt07':'black blue',
  'yamaha-mt09':'grey blue black', 'honda-cb250r':'black red', 'honda-cbr250r':'red black',
  'honda-pcx125':'white grey black', 'honda-forza250':'white grey black', 'ktm-duke250':'white orange black',
  'ktm-duke390':'white orange black', 'bajaj-dominar400':'black green',
  'kawasaki-ninja400':'green black', 'kawasaki-z900':'green black', 'rks-arome125':'white grey',
};

const yearPaints = {
  'ktm-duke390': [[2017,2020,'white orange'],[2021,2022,'grey white'],[2023,2023,'duke23orange duke23grey']],
  'ktm-duke250': [[2017,2019,'white orange'],[2020,2023,'grey black']],
  'yamaha-mt09': [[2021,2023,'grey blue black'],[2024,2025,'blue black']],
  'bajaj-dominar400': [[2019,2020,'black green'],[2021,2025,'black green']],
  'honda-pcx125': [[2021,2024,'white grey black'],[2025,2025,'grey black']],
};

const yearSpecs = {
  'honda-cb125f': [[2016,2020,124.7,10.6]],
  'yamaha-mt07': [[2014,2020,689,74.8]],
  'kawasaki-z900': [[2025,2025,948,124]],
  'honda-cbr125r': [[2011,2017,124.7,13.3]],
};

export const catalog = [...models,...additionsInLira].map(([id,name,category,cc,hp,firstYear,lastYear,price,value,paints]) => ({
  id,name,category,cc,hp,firstYear,lastYear,price,value,
  brand:name.startsWith('Royal Enfield ') ? 'Royal Enfield' : name.split(' ')[0],
  palettes:(yearPaints[id] ?? [[firstYear,lastYear,paints ?? legacyPaints[id]]]).map(([from,to,keys]) =>
    ({from,to,colors:keys.split(' ').map(key=>PAINT_COLORS[key])})),
  maintenance:Math.round((850 + cc * 3.8) / 50) * 50,
  faultRisk:Math.min(.46,.18 + (2025 - firstYear) * .009 + cc / 10000),
  demand:({commuter:.18,scooter:.17,naked:.10,sport:.07,adventure:.09,touring:.06,cruiser:.05})[category],
  segment:price <= 50000 ? 'budget' : value >= 1_000_000 ? 'rare' : value >= 400000 ? 'premium' : 'mid',
}));
const byName = new Map(catalog.map(model => [model.name,model]));

export const categoryLabel = {
  commuter:'Şehir motosikleti', naked:'Naked', sport:'Sport', scooter:'Scooter',
  adventure:'Macera', touring:'Tur', cruiser:'Cruiser',
};
export const segmentLabel = { budget:'Ekonomik', mid:'Orta segment', premium:'Premium', rare:'Nadir' };
export const gradeLabel = GRADE_LABELS;
export const listingGrade = damageGrade;

export const modelOf = bike => byName.get(bike.name);
export function specsFor(bike) {
  const model = modelOf(bike);
  if (!model) return null;
  const variant = yearSpecs[model.id]?.find(([first,last])=>bike.year >= first && bike.year <= last);
  return variant ? { cc:variant[2], hp:variant[3] } : {cc:model.cc,hp:model.hp};
}

export function paintOptions(model,year) {
  return model?.palettes.find(({from,to})=>year >= from && year <= to)?.colors ?? [];
}

export function normalizePaint(bike) {
  const choices = paintOptions(modelOf(bike),bike.year);
  if (!choices.length) return bike;
  const paint = choices.find(item=>item.hex.toLowerCase() === String(bike.color ?? '').toLowerCase() || item.name === bike.colorName) ?? choices[0];
  bike.color = paint.hex;
  bike.colorName = paint.name;
  return bike;
}

const searchKey = value => String(value ?? '').toLowerCase().normalize('NFKD')
  .replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/[^a-z0-9]+/g,' ').trim();

export function filterListings(listings, filters = {}, estimatedProfit = () => 0) {
  const {brand,modelId,color,category,grade,search,sort,province} = filters;
  const within = (value,min,max) => (min == null || value >= min) && (max == null || value <= max);
  const words = searchKey(search).split(' ').filter(Boolean);
  const filtered = listings.filter(listing => {
    const model = modelOf(listing);
    const specs = specsFor(listing);
    const text = searchKey(listing.name);
    return (!province || (listing.province ?? ISTANBUL) === province)
      && (!brand || model?.brand === brand)
      && (!modelId || model?.id === modelId)
      && (!color || listing.colorName === color)
      && (!category || model?.category === category)
      && (!grade || listingGrade(listing) === grade)
      && words.every(word=>text.includes(word) || text.replaceAll(' ','').includes(word))
      && within(listing.price,filters.minPrice,filters.maxPrice)
      && within(listing.km,filters.minKm,filters.maxKm)
      && (specs ? within(specs.cc,filters.minCc,filters.maxCc) : filters.minCc == null && filters.maxCc == null)
      && within(listing.year,filters.minYear,filters.maxYear);
  });
  const compare = (a,b) => a.localeCompare(b,'tr');
  const modelName = bike => {
    const model = modelOf(bike);
    return model ? model.name.slice(model.brand.length+1) : bike.name;
  };
  const profits = sort === 'profit-desc' ? new Map(filtered.map(bike=>[bike,estimatedProfit(bike)])) : null;
  const order = {
    'price-asc': (a,b)=>a.price-b.price, 'price-desc': (a,b)=>b.price-a.price,
    'km-asc': (a,b)=>a.km-b.km, 'year-desc': (a,b)=>b.year-a.year,
    'condition-desc': (a,b)=>(b.condition ?? 100)-(a.condition ?? 100),
    'city-asc': (a,b)=>compare(provinceName(a.province),provinceName(b.province)),
    'brand-asc': (a,b)=>compare(modelOf(a)?.brand ?? a.name,modelOf(b)?.brand ?? b.name),
    'model-asc': (a,b)=>compare(modelName(a),modelName(b)),
    'profit-desc': (a,b)=>profits.get(b)-profits.get(a),
  }[sort];
  if (typeof order === 'function') filtered.sort(order);
  return filtered;
}
