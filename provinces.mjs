// Approximate provincial-centre coordinates, ordered by Turkish plate code.
const centres = [
  ['Adana',37.00,35.32],['Adıyaman',37.76,38.28],['Afyonkarahisar',38.76,30.54],
  ['Ağrı',39.72,43.05],['Amasya',40.65,35.83],['Ankara',39.93,32.86],
  ['Antalya',36.90,30.70],['Artvin',41.18,41.82],['Aydın',37.85,27.84],
  ['Balıkesir',39.65,27.89],['Bilecik',40.14,29.98],['Bingöl',38.88,40.50],
  ['Bitlis',38.40,42.11],['Bolu',40.73,31.61],['Burdur',37.72,30.29],
  ['Bursa',40.19,29.06],['Çanakkale',40.15,26.41],['Çankırı',40.60,33.62],
  ['Çorum',40.55,34.95],['Denizli',37.78,29.09],['Diyarbakır',37.92,40.23],
  ['Edirne',41.68,26.56],['Elazığ',38.67,39.22],['Erzincan',39.75,39.49],
  ['Erzurum',39.90,41.27],['Eskişehir',39.77,30.52],['Gaziantep',37.07,37.38],
  ['Giresun',40.91,38.39],['Gümüşhane',40.46,39.48],['Hakkâri',37.57,43.74],
  ['Hatay',36.20,36.16],['Isparta',37.76,30.55],['Mersin',36.80,34.63],
  ['İstanbul',41.01,28.98],['İzmir',38.42,27.14],['Kars',40.60,43.10],
  ['Kastamonu',41.38,33.78],['Kayseri',38.73,35.49],['Kırklareli',41.73,27.22],
  ['Kırşehir',39.15,34.16],['Kocaeli',40.77,29.92],['Konya',37.87,32.49],
  ['Kütahya',39.42,29.98],['Malatya',38.36,38.31],['Manisa',38.61,27.43],
  ['Kahramanmaraş',37.58,36.93],['Mardin',37.31,40.74],['Muğla',37.22,28.36],
  ['Muş',38.73,41.51],['Nevşehir',38.63,34.71],['Niğde',37.97,34.68],
  ['Ordu',40.98,37.88],['Rize',41.03,40.52],['Sakarya',40.78,30.40],
  ['Samsun',41.29,36.33],['Siirt',37.93,41.94],['Sinop',42.03,35.15],
  ['Sivas',39.75,37.02],['Tekirdağ',40.98,27.51],['Tokat',40.32,36.55],
  ['Trabzon',41.00,39.72],['Tunceli',39.11,39.55],['Şanlıurfa',37.16,38.79],
  ['Uşak',38.68,29.41],['Van',38.50,43.38],['Yozgat',39.82,34.80],
  ['Zonguldak',41.45,31.79],['Aksaray',38.37,34.03],['Bayburt',40.26,40.23],
  ['Karaman',37.18,33.22],['Kırıkkale',39.85,33.51],['Batman',37.89,41.13],
  ['Şırnak',37.52,42.46],['Bartın',41.63,32.34],['Ardahan',41.11,42.70],
  ['Iğdır',39.92,44.04],['Yalova',40.66,29.27],['Karabük',41.20,32.62],
  ['Kilis',36.72,37.12],['Osmaniye',37.07,36.25],['Düzce',40.84,31.16],
];

export const PROVINCES = Object.freeze(centres.map(([name,lat,lon],index)=>
  Object.freeze({id:index+1,name,lat,lon})));
export const ISTANBUL = 34;
export const provinceOf = id => Number.isInteger(id) ? PROVINCES[id-1] : undefined;
export const provinceName = id => provinceOf(id ?? ISTANBUL)?.name;

const radians = degrees => degrees * Math.PI / 180;
export function shippingQuote(origin = ISTANBUL, destination = ISTANBUL) {
  const from = provinceOf(origin);
  const to = provinceOf(destination);
  if (!from || !to) throw new RangeError('Nakliye ili geçersiz.');
  if (origin === destination) return {km:0,fee:0,days:0};

  const arc = Math.sin(radians(to.lat-from.lat)/2)**2
    + Math.cos(radians(from.lat))*Math.cos(radians(to.lat))*Math.sin(radians(to.lon-from.lon)/2)**2;
  // A road-distance estimate for the simulation, using a detour factor and a minimum route.
  const km = Math.max(25,Math.round(6371*2*Math.asin(Math.sqrt(Math.min(1,arc)))*1.25));
  return {km,fee:Math.round((350+km*2.4)/10)*10,days:km <= 350 ? 1 : km <= 900 ? 2 : 3};
}

export function marketPressure(day, province, demand, supplyShare) {
  // Category demand and local stock both affect the listing price. The local cycle
  // shifts daily and is deterministic per province, so filtering never rerolls it.
  const categoryPressure = (demand - .1)*.32;
  const stockPressure = (.25 - supplyShare)*.045;
  const localCycle = Math.sin(day*.71 + province*2.39)*.025;
  return Math.max(-.05,Math.min(.05,categoryPressure + stockPressure + localCycle));
}
