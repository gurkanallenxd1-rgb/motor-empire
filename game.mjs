export const INSPECTION_FEE = 450;
export const LEGACY_STORAGE_KEY = 'motor-empire.v1';
export const STORAGE_KEY = 'motor-empire.v2';
export const DAILY_OVERHEAD = 250;
export const DAILY_WAGE = 750;
export const BRANCH_COST = 250000;
export const LOAN_LIMIT = 250000;
export const RENTAL_DAYS = Object.freeze([1, 3, 7]);
export const GARAGE_LEVELS = Object.freeze([
  { capacity: 2, cost: 0 },
  { capacity: 4, cost: 50000 },
  { capacity: 6, cost: 125000 },
  { capacity: 10, cost: 250000 },
]);

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
  { name: 'Honda CBR 125R', year: 2017, km: 26900, price: 35400, value: 47000, color: '#f47b38', faults: ['zincir', 'lastik'] },
  { name: 'Yamaha Delight 125', year: 2019, km: 17200, price: 31200, value: 39400, color: '#8fc6bd', faults: ['akü', 'fren'] },
];

function market(day) {
  return Array.from({ length: 3 }, (_, slot) => {
    const model = catalog[((day - 1) * 2 + slot) % catalog.length];
    return { ...model, id: `${day}-${slot}`, price: model.price + ((day - 1) % 5) * 150 };
  });
}

function createBranch(id) {
  return { id, name: id === 1 ? 'İstanbul Merkez' : `İstanbul Şubesi ${id}`, level: 1, staff: 0, garage: [] };
}

export function newGame() {
  return { version: 2, day: 1, cash: 75000, debt: 0, listings: market(1), branches: [createBranch(1)], sales: [], ledger: [] };
}

export const branchCapacity = branch => GARAGE_LEVELS[branch.level - 1].capacity;
export const repairCapacity = branch => 8 * (1 + branch.staff);
export const operatingCost = branch => DAILY_OVERHEAD + branch.staff * DAILY_WAGE;

export function repairQuote(bike) {
  return bike.faults.reduce((total, fault) => ({
    cost: total.cost + PARTS[fault].cost,
    hours: total.hours + PARTS[fault].hours,
  }), { cost: 0, hours: 0 });
}

function roadValue(bike) {
  return Math.round(bike.value * bike.condition / 100);
}

export function rentalRate(bike) {
  return decimal(roadValue(bike) * .006);
}

export function assets(state) {
  let equipment = 0;
  let inventory = 0;
  for (const branch of state.branches) {
    equipment += (branch.id === 1 ? 0 : BRANCH_COST)
      + GARAGE_LEVELS.slice(0, branch.level).reduce((total, level) => total + level.cost, 0);
    for (const bike of branch.garage) {
      const partsDue = ['unchecked', 'inspected'].includes(bike.stage) ? repairQuote(bike).cost : 0;
      inventory += Math.max(0, roadValue(bike) - partsDue);
    }
  }
  const total = state.cash + equipment + inventory;
  return { equipment, inventory, total, net: total - state.debt };
}

export function dailyTotals(ledger, day) {
  const summary = { income: 0, expenses: 0, net: 0 };
  for (const entry of ledger) {
    if (entry.day !== day) continue;
    if (entry.kind === 'income') summary.income += entry.amount;
    if (entry.kind === 'expense') summary.expenses += entry.amount;
  }
  summary.income = decimal(summary.income);
  summary.expenses = decimal(summary.expenses);
  summary.net = decimal(summary.income - summary.expenses);
  return summary;
}

function customers(bike, day) {
  const names = ['Deniz', 'Ece', 'Mert', 'Selin', 'Kerem', 'İpek'];
  const adjustment = (day % 4) * 0.01;
  return [0.77, 0.91, 1.03].map((rate, index) => ({
    name: names[(day + index) % names.length],
    price: Math.max(50, Math.round(roadValue(bike) * (rate + adjustment) / 50) * 50),
  }));
}

const decimal = value => Math.round(value * 100) / 100;
const validMoney = value => Number.isFinite(value) && value >= 0 && Number.isSafeInteger(Math.round(value * 100));
const validAmount = value => validMoney(value) && value > 0 && decimal(value) === value;

export function perform(state, action, id, amount, branchId = 1) {
  const next = JSON.parse(JSON.stringify(state));
  const branch = next.branches.find(item => item.id === branchId);
  if (!branch) throw new Error('Şube bulunamadı.');
  const bike = branch.garage.find(item => item.id === id);

  function record(kind, value, label, at = branch) {
    next.ledger.unshift({ day: next.day, branchId: at?.id ?? null, kind, amount: value, label });
  }

  function pay(cost, label, at = branch, mandatory = false) {
    if (next.cash < cost) {
      if (!mandatory) throw new Error('Kasanızda yeterli nakit yok. Finans bölümünden borç alabilirsiniz.');
      const shortfall = decimal(cost - next.cash);
      next.debt = decimal(next.debt + shortfall);
      next.cash = decimal(next.cash + shortfall);
      record('loan', shortfall, 'Zorunlu gider için borç', at);
    }
    next.cash = decimal(next.cash - cost);
    record('expense', cost, label, at);
  }

  function earn(value, label, at = branch) {
    next.cash = decimal(next.cash + value);
    record('income', value, label, at);
  }

  let message;
  switch (action) {
    case 'buy': {
      const listing = next.listings.find(item => item.id === id);
      if (!listing) throw new Error('Bu ilan artık açık değil.');
      if (branch.garage.length >= branchCapacity(branch)) throw new Error('Bu şubenin garajı dolu.');
      const slot = Array.from({ length: branchCapacity(branch) }, (_, index) => index)
        .find(index => !branch.garage.some(item => item.slot === index));
      pay(listing.price, `${listing.name} alımı`);
      next.listings = next.listings.filter(item => item.id !== id);
      branch.garage.push({ ...listing, slot, stage: 'unchecked', spent: listing.price, condition: 100 });
      message = `${listing.name} · ${branch.name} garajına alındı.`;
      break;
    }
    case 'inspect':
      if (bike?.stage !== 'unchecked') throw new Error('Ekspertiz şu anda yapılamıyor.');
      pay(INSPECTION_FEE, `${bike.name} ekspertizi`);
      bike.spent += INSPECTION_FEE;
      bike.stage = 'inspected';
      message = 'Ekspertiz tamamlandı. Parça ve işçilik dökümü hazır.';
      break;
    case 'repair': {
      if (bike?.stage !== 'inspected') throw new Error('Önce ekspertiz yaptırın.');
      const quote = repairQuote(bike);
      pay(quote.cost, `${bike.name} tamir parçaları`);
      bike.spent += quote.cost;
      bike.remainingHours = quote.hours;
      bike.repairOrder = (next.repairOrder ?? 0) + 1;
      next.repairOrder = bike.repairOrder;
      bike.stage = 'repairing';
      message = 'Tamir iş sırasına alındı.';
      break;
    }
    case 'list':
      if (bike?.stage !== 'ready') throw new Error('Yalnızca satışa hazır motosikletler ilana çıkabilir.');
      bike.stage = 'listed';
      bike.offers = customers(bike, next.day);
      message = 'İlan açıldı. Müşteri teklifleri geldi.';
      break;
    case 'unlist':
      if (bike?.stage !== 'listed') throw new Error('Bu motosiklet satışta değil.');
      bike.stage = 'ready';
      delete bike.offers;
      message = 'Satış ilanı kaldırıldı.';
      break;
    case 'sell': {
      const offer = bike?.stage === 'listed' && Number.isInteger(amount) && bike.offers[amount];
      if (!offer) throw new Error('Bu teklif artık geçerli değil.');
      branch.garage = branch.garage.filter(item => item.id !== id);
      earn(offer.price, `${bike.name} satışı`);
      next.sales.unshift({ name: bike.name, day: next.day, price: offer.price, spent: bike.spent });
      message = `${bike.name}, ${offer.name} adlı müşteriye satıldı.`;
      break;
    }
    case 'rent':
      if (bike?.stage !== 'ready' || !RENTAL_DAYS.includes(amount)) throw new Error('Geçerli süreyle satışa hazır bir motosiklet seçin.');
      bike.stage = 'rented';
      bike.rental = { endDay: next.day + amount, days: amount, rate: rentalRate(bike) };
      message = `${bike.name} ${amount} günlüğüne kiralandı.`;
      break;
    case 'hire':
      if (!validMoney(operatingCost({ staff: branch.staff + 1 }))) throw new Error('Personel sınırı aşıldı.');
      branch.staff += 1;
      message = `${branch.name} için bir usta işe alındı.`;
      break;
    case 'fire':
      if (!branch.staff) throw new Error('Bu şubede çalışan usta yok.');
      branch.staff -= 1;
      message = 'Bir usta işten çıkarıldı.';
      break;
    case 'upgrade': {
      const upgrade = GARAGE_LEVELS[branch.level];
      if (!upgrade) throw new Error('Garaj en yüksek seviyede.');
      pay(upgrade.cost, 'Garaj geliştirme');
      branch.level += 1;
      message = `Garaj kapasitesi ${upgrade.capacity} motosiklete çıktı.`;
      break;
    }
    case 'open-branch': {
      const office = createBranch(next.branches.length + 1);
      pay(BRANCH_COST, 'Şube açılışı', office);
      next.branches.push(office);
      message = `${office.name} açıldı.`;
      break;
    }
    case 'borrow':
      if (!validAmount(amount) || amount > decimal(LOAN_LIMIT - next.debt)) throw new Error('Borç tutarı kredi limitini aşıyor veya geçersiz.');
      next.debt = decimal(next.debt + amount);
      next.cash = decimal(next.cash + amount);
      record('loan', amount, 'Alınan borç', null);
      message = 'Borç nakit kasaya eklendi.';
      break;
    case 'repay':
      if (!validAmount(amount) || amount > next.debt || amount > next.cash) throw new Error('Geçerli bir ödeme tutarı girin.');
      next.debt = decimal(next.debt - amount);
      next.cash = decimal(next.cash - amount);
      record('repayment', amount, 'Borç ödemesi', null);
      message = 'Borç ödemesi yapıldı.';
      break;
    case 'advance': {
      const tomorrow = next.day + 1;
      let completed = 0;
      let returned = 0;
      // Today's rentals are earned before any branch settles its mandatory expenses.
      for (const office of next.branches) {
        for (const item of office.garage) {
          if (item.stage !== 'rented') continue;
          earn(item.rental.rate, `${item.name} kira geliri`, office);
          if (item.rental.endDay === tomorrow) {
            item.km += item.rental.days * 85;
            item.condition = Math.max(25, item.condition - item.rental.days);
            delete item.rental;
            item.stage = 'ready';
            returned += 1;
          }
        }
      }
      for (const office of next.branches) {
        pay(DAILY_OVERHEAD, 'Günlük işletme gideri', office, true);
        if (office.staff) pay(office.staff * DAILY_WAGE, 'Usta maaşları', office, true);
        let hours = repairCapacity(office);
        const queue = office.garage.filter(item => item.stage === 'repairing')
          .sort((a,b) => (a.repairOrder ?? 0) - (b.repairOrder ?? 0));
        for (const item of queue) {
          if (item.readyDay !== undefined) {
            // Legacy jobs retain their promised completion day.
            if (item.readyDay > tomorrow) continue;
          } else {
            const worked = Math.min(hours, item.remainingHours);
            hours -= worked;
            item.remainingHours -= worked;
            if (item.remainingHours > 0) continue;
          }
          item.stage = 'ready';
          delete item.readyDay;
          delete item.remainingHours;
          delete item.repairOrder;
          completed += 1;
        }
        for (const item of office.garage) {
          if (item.stage === 'listed') item.offers = customers(item, tomorrow);
        }
      }
      next.day = tomorrow;
      next.listings = market(tomorrow);
      message = `Gün kapandı · ${completed} tamir tamamlandı · ${returned} kiralık motosiklet döndü.`;
      break;
    }
    default:
      throw new Error('Geçersiz işlem.');
  }
  if (!validMoney(next.cash) || !validMoney(next.debt)) throw new Error('Nakit veya borç sınırı aşıldı.');
  return { state: next, message };
}

function validBike(bike) {
  return bike && typeof bike.id === 'string' && typeof bike.name === 'string'
    && Number.isSafeInteger(bike.year) && Number.isSafeInteger(bike.km) && bike.km >= 0
    && validAmount(bike.price) && validAmount(bike.value) && bike.value >= 50 && Array.isArray(bike.faults)
    && bike.faults.every(fault => Object.prototype.hasOwnProperty.call(PARTS, fault));
}

function validGarageBike(bike, day) {
  if (!validBike(bike) || !validMoney(bike.spent)
      || !Number.isInteger(bike.condition) || bike.condition < 25 || bike.condition > 100) return false;
  switch (bike.stage) {
    case 'unchecked': case 'inspected': case 'ready': return true;
    case 'repairing':
      return (Number.isSafeInteger(bike.readyDay) && bike.readyDay > day)
        || (Number.isSafeInteger(bike.remainingHours) && bike.remainingHours > 0
          && Number.isSafeInteger(bike.repairOrder) && bike.repairOrder > 0);
    case 'listed':
      return Array.isArray(bike.offers) && bike.offers.length === 3
        && bike.offers.every(offer => offer && typeof offer.name === 'string' && validAmount(offer.price));
    case 'rented':
      return RENTAL_DAYS.includes(bike.rental?.days) && Number.isSafeInteger(bike.rental.endDay)
        && bike.rental.endDay > day && bike.rental.endDay <= day + bike.rental.days
        && validAmount(bike.rental.rate);
    default: return false;
  }
}

function validSave(saved) {
  if (saved?.version !== 2 || !validMoney(saved.cash) || !validMoney(saved.debt)
      || !Number.isSafeInteger(saved.day) || saved.day < 1
      || !Array.isArray(saved.listings) || !saved.listings.every(validBike)
      || !Array.isArray(saved.sales) || !Array.isArray(saved.ledger)
      || !Array.isArray(saved.branches) || !saved.branches.length
      || (saved.repairOrder !== undefined && (!Number.isSafeInteger(saved.repairOrder) || saved.repairOrder < 0))) return false;
  const ids = [...saved.listings.map(item => item.id)];
  return saved.branches.every((branch,index) => {
    if (!branch || branch.id !== index + 1 || typeof branch.name !== 'string'
        || !Number.isInteger(branch.level) || !GARAGE_LEVELS[branch.level - 1]
        || !Number.isSafeInteger(branch.staff) || branch.staff < 0 || !validMoney(operatingCost(branch))
        || !Array.isArray(branch.garage)) return false;
    const slots = [];
    for (const bike of branch.garage) {
      if (!validGarageBike(bike,saved.day) || ids.includes(bike.id) || !Number.isInteger(bike.slot)
          || bike.slot < 0 || bike.slot >= branchCapacity(branch) || slots.includes(bike.slot)) return false;
      ids.push(bike.id);
      slots.push(bike.slot);
    }
    return true;
  }) && new Set(ids).size === ids.length
    && saved.sales.every(sale => sale && typeof sale.name === 'string' && Number.isSafeInteger(sale.day)
      && sale.day >= 1 && sale.day <= saved.day && validMoney(sale.price) && validMoney(sale.spent))
    && saved.ledger.every(entry => entry && Number.isSafeInteger(entry.day) && entry.day >= 1 && entry.day <= saved.day
      && (entry.branchId === null || saved.branches.some(branch => branch.id === entry.branchId))
      && ['income','expense','loan','repayment'].includes(entry.kind)
      && validMoney(entry.amount) && typeof entry.label === 'string');
}

export function loadGame(storage) {
  const raw = storage.getItem(STORAGE_KEY);
  const legacy = raw === null ? storage.getItem(LEGACY_STORAGE_KEY) : null;
  if (raw === null && legacy === null) return newGame();
  let state = JSON.parse(raw ?? legacy);
  if (raw === null && state?.version === 1 && Array.isArray(state.garage)) {
    const branch = createBranch(1);
    branch.garage = state.garage.map(bike => ({ ...bike, condition: 100 }));
    const { day, cash, listings, sales } = state;
    state = { ...newGame(), day, cash, listings, sales, branches: [branch] };
  }
  if (!validSave(state)) throw new Error('Kayıt biçimi geçersiz.');
  return state;
}

export function saveGame(storage, state) {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}
