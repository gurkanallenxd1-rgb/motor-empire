export const CAPACITY = 2;
export const INSPECTION_FEE = 450;
export const STORAGE_KEY = 'motor-empire.v1';

export const PARTS = {
  zincir: { name: 'Zincir seti', cost: 1650, hours: 2 },
  fren: { name: 'Fren balataları', cost: 2100, hours: 3 },
  debriyaj: { name: 'Debriyaj seti', cost: 4350, hours: 5 },
  lastik: { name: 'Lastik takımı', cost: 5800, hours: 3 },
  akü: { name: 'Akü', cost: 1850, hours: 1 },
};

const catalog = [
  { name: 'Honda CB 125F', year: 2018, km: 28400, price: 26900, value: 34800, color: '#ee664b', faults: ['zincir', 'akü'] },
  { name: 'Bajaj Pulsar NS 200', year: 2017, km: 36700, price: 38500, value: 50700, color: '#a9bfce', faults: ['fren', 'lastik'] },
  { name: 'Yamaha YBR 125', year: 2016, km: 31200, price: 29500, value: 39200, color: '#659ad8', faults: ['debriyaj', 'fren'] },
  { name: 'Suzuki GN 125', year: 2015, km: 24900, price: 25400, value: 32800, color: '#d0a86a', faults: ['akü', 'lastik'] },
  { name: 'TVS Apache RTR 160', year: 2019, km: 22800, price: 33800, value: 44800, color: '#a0a7df', faults: ['zincir', 'debriyaj', 'fren'] },
  { name: 'Mondial Drift L', year: 2018, km: 19200, price: 21700, value: 29100, color: '#79b8a7', faults: ['fren', 'akü'] },
];

function market(day) {
  return Array.from({ length: 3 }, (_, slot) => {
    const model = catalog[((day - 1) * 2 + slot) % catalog.length];
    return { ...model, id: `${day}-${slot}`, price: model.price + ((day - 1) % 5) * 150 };
  });
}

export function newGame() {
  return { version: 1, day: 1, cash: 75000, listings: market(1), garage: [], sales: [] };
}

export function repairQuote(bike) {
  return bike.faults.reduce((total, fault) => ({
    cost: total.cost + PARTS[fault].cost,
    hours: total.hours + PARTS[fault].hours,
  }), { cost: 0, hours: 0 });
}

function customers(bike, day) {
  const names = ['Deniz', 'Ece', 'Mert', 'Selin', 'Kerem', 'İpek'];
  const adjustment = (day % 4) * 0.01;
  return [0.77, 0.91, 1.03].map((rate, index) => ({
    name: names[(day + index) % names.length],
    price: Math.round(bike.value * (rate + adjustment) / 50) * 50,
  }));
}

export function perform(state, action, id, offerIndex) {
  const next = JSON.parse(JSON.stringify(state));
  const bike = next.garage.find(item => item.id === id);
  let message;

  function pay(cost) {
    if (next.cash < cost) throw new Error('Kasanızda yeterli bakiye yok.');
    next.cash -= cost;
  }

  switch (action) {
    case 'buy': {
      const listing = next.listings.find(item => item.id === id);
      if (!listing) throw new Error('Bu ilan artık açık değil.');
      if (next.garage.length >= CAPACITY) throw new Error('Garajınız dolu.');
      pay(listing.price);
      next.listings = next.listings.filter(item => item.id !== id);
      const slot = [0, 1].find(index => !next.garage.some(item => item.slot === index));
      next.garage.push({ ...listing, slot, stage: 'unchecked', spent: listing.price });
      message = `${listing.name} garaja alındı.`;
      break;
    }
    case 'inspect':
      if (bike?.stage !== 'unchecked') throw new Error('Ekspertiz şu anda yapılamıyor.');
      pay(INSPECTION_FEE);
      bike.spent += INSPECTION_FEE;
      bike.stage = 'inspected';
      message = 'Ekspertiz tamamlandı. Parça ve işçilik dökümü hazır.';
      break;
    case 'repair': {
      if (bike?.stage !== 'inspected') throw new Error('Önce ekspertiz yaptırın.');
      const quote = repairQuote(bike);
      pay(quote.cost);
      bike.spent += quote.cost;
      bike.readyDay = next.day + Math.ceil(quote.hours / 8);
      bike.stage = 'repairing';
      message = `Tamir başladı. Teslim günü ${bike.readyDay}.`;
      break;
    }
    case 'list':
      if (bike?.stage !== 'ready') throw new Error('Satışa çıkarmak için tamir tamamlanmalı.');
      bike.stage = 'listed';
      bike.offers = customers(bike, next.day);
      message = 'İlan açıldı. Müşteri teklifleri geldi.';
      break;
    case 'sell': {
      const offer = bike?.stage === 'listed' && bike.offers[offerIndex];
      if (!offer) throw new Error('Bu teklif artık geçerli değil.');
      next.garage = next.garage.filter(item => item.id !== id);
      next.cash += offer.price;
      next.sales.unshift({ name: bike.name, day: next.day, price: offer.price, spent: bike.spent });
      message = `${bike.name}, ${offer.name} adlı müşteriye satıldı.`;
      break;
    }
    case 'advance': {
      next.day += 1;
      next.listings = market(next.day);
      let completed = 0;
      for (const item of next.garage) {
        if (item.stage === 'repairing' && item.readyDay <= next.day) {
          item.stage = 'ready';
          completed += 1;
        }
        if (item.stage === 'listed') item.offers = customers(item, next.day);
      }
      message = completed ? `${completed} motosikletin tamiri tamamlandı.` : 'Yeni ilanlar ve müşteri teklifleri güncellendi.';
      break;
    }
    default:
      throw new Error('Geçersiz işlem.');
  }
  return { state: next, message };
}

export function loadGame(storage) {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) return newGame();
  const saved = JSON.parse(raw);
  if (saved?.version !== 1 || !Number.isFinite(saved.cash) || !Number.isInteger(saved.day)
      || !Array.isArray(saved.listings) || !Array.isArray(saved.garage) || !Array.isArray(saved.sales)) {
    throw new Error('Kayıt biçimi geçersiz.');
  }
  return saved;
}

export function saveGame(storage, state) {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}
