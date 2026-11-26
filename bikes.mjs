const models = [
  // Model ID, display name, category, displacement, PS, years, base buy and sale values (TL).
  ['honda-cb125f', 'Honda CB 125F', 'commuter', 124, 10.9, 2016, 2024, 26900, 34800],
  ['bajaj-pulsar-ns200', 'Bajaj Pulsar NS 200', 'naked', 199.5, 24.5, 2015, 2025, 38500, 50700],
  ['yamaha-ybr125', 'Yamaha YBR 125', 'commuter', 124, 10, 2009, 2017, 29500, 39200],
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
  ['ktm-duke390', 'KTM Duke 390', 'naked', 373.2, 44, 2017, 2023, 149000, 182000],
  ['bajaj-dominar400', 'Bajaj Dominar 400', 'naked', 373.3, 40, 2019, 2025, 106000, 134000],
  ['kawasaki-ninja400', 'Kawasaki Ninja 400', 'sport', 399, 45, 2018, 2023, 188000, 224000],
  ['kawasaki-z900', 'Kawasaki Z900', 'naked', 948, 125, 2017, 2025, 319000, 371000],
  ['rks-arome125', 'RKS Arome 125', 'scooter', 125, 8.7, 2021, 2025, 35700, 45900],
];

export const catalog = models.map(([id,name,category,cc,hp,firstYear,lastYear,price,value]) =>
  ({ id,name,category,cc,hp,firstYear,lastYear,price,value,brand:name.split(' ')[0] }));
const byName = new Map(catalog.map(model => [model.name,model]));

export const categoryLabel = { commuter: 'Şehir motosikleti', naked: 'Naked', sport: 'Sport', scooter: 'Scooter' };
export const modelOf = bike => byName.get(bike.name);
export const spriteUrl = bike => {
  const model = modelOf(bike);
  return model ? new URL(`./assets/models/${model.id}.webp`,import.meta.url).href : null;
};

export function filterListings(listings, {brand,maxPrice,maxKm,maxCc}) {
  return listings.filter(listing => {
    const model = modelOf(listing);
    return (!brand || model?.brand === brand)
      && (maxPrice === null || listing.price <= maxPrice)
      && (maxKm === null || listing.km <= maxKm)
      && (maxCc === null || (model && model.cc <= maxCc));
  });
}
