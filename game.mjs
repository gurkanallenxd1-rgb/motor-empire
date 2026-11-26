import { catalog, modelOf, normalizePaint, paintOptions } from './bikes.mjs?v=0.7.1';
import { arrive, createBuyer, createSeller, createTrade, finishTrade, isActive, negotiate } from './trade.mjs?v=0.7.1';

export const INSPECTION_FEE = 450;
export const LEGACY_STORAGE_KEY = 'motor-empire.v1';
export const BUSINESS_STORAGE_KEY = 'motor-empire.v2';
export const PREVIOUS_STORAGE_KEY = 'motor-empire.v3';
export const STORAGE_KEY = 'motor-empire.v4';
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

function shuffle(items, random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function generateMarket(day, random = Math.random) {
  const integer = (min,max) => min + Math.floor(random() * (max - min + 1));
  const ordered = shuffle(catalog,random);
  const quotas = [['budget',8],['mid',14],['premium',6],['rare',2]];
  const selected = quotas.flatMap(([segment,count])=>ordered.filter(model=>model.segment === segment).slice(0,count));
  return selected.map((model,slot) => {
    const year = integer(model.firstYear,model.lastYear);
    const age = 2026 - year;
    const km = integer(1500 + age * 850,5000 + age * 3700);
    const roll = random();
    const condition = roll < model.faultRisk * .44 ? integer(48,67)
      : roll < model.faultRisk + .24 ? integer(68,85) : integer(86,100);
    const choices = paintOptions(model,year);
    const color = choices[integer(0,choices.length - 1)];
    const availableFaults = model.category === 'scooter' ? ['fren','lastik','akü'] : Object.keys(PARTS);
    const faultCount = condition < 68 ? integer(2,Math.min(4,availableFaults.length))
      : condition < 86 ? integer(1,2) : random() < model.faultRisk * .28 ? 1 : 0;
    const value = Math.round(model.value * (1 + (year - model.lastYear) * .009 - km / 500000) / 50) * 50;
    const serviceFactor = Math.max(1,Math.min(2,model.maintenance / 2600));
    const faults = shuffle(availableFaults,random).slice(0,faultCount);
    const serviceDiscount = repairQuote({faults,serviceFactor}).cost * (condition < 68 ? .55 : .35);
    const price = Math.max(3000,Math.round((model.price * (value / model.value) * condition / 100
      * integer(94,111) / 100 - serviceDiscount) / 50) * 50);
    return { id:`${day}-${slot}`,name:model.name,year,km,condition,price,value,serviceFactor,
      color:color.hex,colorName:color.name,...(color.accent ? {paintAccent:color.accent} : {}),faults };
  });
}

function createBranch(id) {
  return { id, name: id === 1 ? 'İstanbul Merkez' : `İstanbul Şubesi ${id}`, level: 1, staff: 0, garage: [] };
}

export function newGame() {
  return { version: 4, day: 1, cash: 75000, debt: 0, listings: generateMarket(1), branches: [createBranch(1)], sales: [], ledger: [], trade:createTrade() };
}

export const branchCapacity = branch => GARAGE_LEVELS[branch.level - 1].capacity;
export const repairCapacity = branch => 8 * (1 + branch.staff);
export const operatingCost = branch => DAILY_OVERHEAD + branch.staff * DAILY_WAGE;

export function repairPartCost(bike,fault) {
  return Math.round(PARTS[fault].cost * (bike.serviceFactor ?? 1));
}

export function repairQuote(bike) {
  return bike.faults.reduce((total, fault) => ({
    cost: total.cost + repairPartCost(bike,fault),
    hours: total.hours + PARTS[fault].hours,
  }), { cost: 0, hours: 0 });
}

export function roadValue(bike) {
  return Math.round(bike.value * (bike.condition ?? 100) / 100);
}

// Disclosed estimate. Purchased bikes still require an inspection for their actual faults.
export function estimatedListingProfit(bike) {
  const wear = Math.max(0,100-(bike.condition ?? 100));
  const reserve = Math.round((modelOf(bike)?.maintenance ?? 1500) * wear / 48);
  return roadValue(bike) - bike.price - INSPECTION_FEE - reserve;
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

export function realizedSales(sales,day) {
  const results = sales.filter(sale=>day === undefined || sale.day === day);
  const revenue = decimal(results.reduce((sum,sale)=>sum + sale.price,0));
  const cost = decimal(results.reduce((sum,sale)=>sum + sale.spent,0));
  return { revenue,cost,profit:decimal(revenue-cost) };
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

  const listing = next.listings.find(item => item.id === id);
  function purchase(price) {
    if (!listing) throw new Error('Bu ilan artık açık değil.');
    if (branch.garage.length >= branchCapacity(branch)) throw new Error('Bu şubenin garajı dolu.');
    const slot = Array.from({length:branchCapacity(branch)},(_,index)=>index)
      .find(index=>!branch.garage.some(item=>item.slot === index));
    pay(price,`${listing.name} alımı`);
    if (isActive(listing.seller)) {
      listing.seller.price = price;
      finishTrade(next,listing.seller,listing,'bought');
    }
    const { seller, ...vehicle } = listing;
    branch.garage.push({...vehicle,slot,stage:'unchecked',spent:price,condition:listing.condition ?? 100});
    next.listings = next.listings.filter(item=>item.id !== id);
    return `${listing.name} · ${branch.name} garajına alındı.`;
  }

  function activeMeeting(meetingId) {
    const meeting = listing?.seller && listing.seller.id === meetingId ? listing.seller
      : bike?.stage === 'listed' ? bike.meetings.find(item=>item.id === meetingId) : null;
    if (!isActive(meeting)) throw new Error('Bu teklif artık geçerli değil.');
    return meeting;
  }

  let message;
  switch (action) {
    case 'buy':
      message = purchase(listing?.price);
      break;
    case 'meet-seller':
      if (!listing) throw new Error('Bu ilan artık açık değil.');
      if (listing.seller && !isActive(listing.seller)) throw new Error('Satıcı bu görüşmeyi kapattı.');
      listing.seller ??= createSeller(listing,next.day);
      message = listing.seller.speech;
      break;
    case 'negotiate': {
      const meeting = activeMeeting(amount);
      negotiate(meeting);
      if (meeting.status === 'left') finishTrade(next,meeting,bike ?? listing,'left');
      message = meeting.speech;
      break;
    }
    case 'reject': {
      const meeting = activeMeeting(amount);
      finishTrade(next,meeting,bike ?? listing,'rejected');
      meeting.speech = 'Görüşme sona erdi.';
      message = 'Görüşme reddedildi.';
      break;
    }
    case 'buy-negotiated': {
      const meeting = activeMeeting(amount);
      if (meeting.kind !== 'purchase') throw new Error('Geçersiz alış görüşmesi.');
      message = purchase(meeting.price);
      break;
    }
    case 'inspect':
      if (bike?.stage !== 'unchecked') throw new Error('Ekspertiz şu anda yapılamıyor.');
      pay(INSPECTION_FEE, `${bike.name} ekspertizi`);
      bike.spent += INSPECTION_FEE;
      bike.stage = bike.faults.length ? 'inspected' : 'ready';
      message = bike.faults.length ? 'Ekspertiz tamamlandı. Parça ve işçilik dökümü hazır.' : 'Ekspertiz tamamlandı. Motosiklet satışa hazır.';
      break;
    case 'repair': {
      if (bike?.stage !== 'inspected') throw new Error('Önce ekspertiz yaptırın.');
      const quote = repairQuote(bike);
      if (!quote.hours) {
        bike.stage = 'ready';
        message = 'Motosiklet satışa hazır.';
        break;
      }
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
      if (amount !== undefined && !validAmount(amount)) throw new Error('Geçerli bir ilan fiyatı girin.');
      bike.stage = 'listed';
      bike.ask = amount ?? roadValue(bike);
      bike.nextVisit = next.day + 1 + (bike.ask > roadValue(bike) * 1.22 ? 1 : 0);
      bike.meetings = [];
      message = 'İlan açıldı. Müşteriler sonraki günlerde gelebilir.';
      break;
    case 'unlist':
      if (bike?.stage !== 'listed') throw new Error('Bu motosiklet satışta değil.');
      for (const meeting of bike.meetings.filter(isActive)) finishTrade(next,meeting,bike,'expired');
      bike.stage = 'ready';
      delete bike.meetings;
      delete bike.ask;
      delete bike.nextVisit;
      message = 'Satış ilanı kaldırıldı.';
      break;
    case 'sell': {
      const meeting = activeMeeting(amount);
      if (meeting.kind !== 'sale' || bike?.stage !== 'listed') throw new Error('Bu teklif artık geçerli değil.');
      branch.garage = branch.garage.filter(item=>item.id !== id);
      earn(meeting.price,`${bike.name} satışı`);
      next.sales.unshift({name:bike.name,day:next.day,price:meeting.price,spent:bike.spent});
      finishTrade(next,meeting,bike,'sold');
      for (const other of bike.meetings.filter(isActive)) finishTrade(next,other,bike,'expired');
      message = `${bike.name}, ${meeting.profile.name} adlı müşteriye satıldı.`;
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
      let visits = 0;
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
          if (item.stage !== 'listed') continue;
          for (const meeting of item.meetings.filter(isActive)) {
            if (tomorrow - meeting.day >= 3) finishTrade(next,meeting,item,'expired');
          }
          item.meetings = item.meetings.filter(isActive);
          visits += arrive(item,tomorrow,next.trade.reputation,roadValue(item));
        }
      }
      for (const item of next.listings) {
        if (isActive(item.seller)) finishTrade(next,item.seller,item,'expired');
      }
      next.day = tomorrow;
      next.listings = generateMarket(tomorrow);
      message = `Gün kapandı · ${completed} tamir tamamlandı · ${returned} kiralık motosiklet döndü · ${visits} müşteri geldi.`;
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
    && validAmount(bike.price) && validAmount(bike.value) && bike.value >= 50
    && (bike.condition === undefined || (Number.isInteger(bike.condition) && bike.condition >= 25 && bike.condition <= 100))
    && (bike.serviceFactor === undefined || (Number.isFinite(bike.serviceFactor) && bike.serviceFactor >= 1 && bike.serviceFactor <= 2))
    && Array.isArray(bike.faults)
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
      return validAmount(bike.ask) && Number.isSafeInteger(bike.nextVisit) && Array.isArray(bike.meetings)
        && bike.meetings.every(meeting => validMeeting(meeting,'sale'));
    case 'rented':
      return RENTAL_DAYS.includes(bike.rental?.days) && Number.isSafeInteger(bike.rental.endDay)
        && bike.rental.endDay > day && bike.rental.endDay <= day + bike.rental.days
        && validAmount(bike.rental.rate);
    default: return false;
  }
}

function validSave(saved) {
  if (saved?.version !== 4 || !validMoney(saved.cash) || !validMoney(saved.debt)
      || !Number.isSafeInteger(saved.day) || saved.day < 1
      || !Array.isArray(saved.listings) || !saved.listings.every(bike=>validBike(bike)
        && (bike.seller === undefined || validMeeting(bike.seller,'purchase')))
      || !saved.trade || !Number.isInteger(saved.trade.reputation) || saved.trade.reputation < 0 || saved.trade.reputation > 100
      || !Array.isArray(saved.trade.history) || !saved.trade.history.every(row=>row
        && ['sale','purchase'].includes(row.kind) && ['sold','bought','left','expired','rejected'].includes(row.outcome)
        && Number.isSafeInteger(row.day) && row.day >= 1 && row.day <= saved.day
        && typeof row.name === 'string' && typeof row.person === 'string' && validAmount(row.price)
        && Number.isInteger(row.rounds) && row.rounds >= 0 && row.rounds <= 3
        && (row.outcome === 'sold' ? Number.isInteger(row.satisfaction) && row.satisfaction >= 0 && row.satisfaction <= 100 : row.satisfaction === null))
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

function validMeeting(meeting,kind) {
  return meeting && meeting.kind === kind && typeof meeting.id === 'string'
    && ['open','agreed','rejected','left'].includes(meeting.status)
    && Number.isSafeInteger(meeting.day) && meeting.day >= 1
    && Number.isInteger(meeting.round) && meeting.round >= 0 && meeting.round <= 3
    && Number.isInteger(meeting.patience) && meeting.patience >= 0
    && validAmount(meeting.price) && validAmount(meeting.limit) && validAmount(meeting.anchor)
    && typeof meeting.speech === 'string' && typeof meeting.profile?.name === 'string'
    && Number.isInteger(meeting.profile.skill) && meeting.profile.skill >= 1 && meeting.profile.skill <= 5;
}

export function loadGame(storage) {
  const raw = storage.getItem(STORAGE_KEY);
  const previous = raw === null ? storage.getItem(PREVIOUS_STORAGE_KEY) : null;
  const business = raw === null && previous === null ? storage.getItem(BUSINESS_STORAGE_KEY) : null;
  const legacy = raw === null && previous === null && business === null ? storage.getItem(LEGACY_STORAGE_KEY) : null;
  if (raw === null && previous === null && business === null && legacy === null) return newGame();
  let state = JSON.parse(raw ?? previous ?? business ?? legacy);
  if (legacy !== null && state?.version === 1 && Array.isArray(state.garage)) {
    const branch = createBranch(1);
    branch.garage = state.garage.map(bike=>({...bike,condition:100}));
    const { day,cash,listings,sales } = state;
    state = {version:2,day,cash,listings,sales,debt:0,ledger:[],branches:[branch]};
  }
  if (raw === null && state?.version === 2 && Array.isArray(state.branches)) {
    state.version = 3;
    state.trade = createTrade();
    for (const branch of state.branches) {
      for (const bike of branch.garage) {
        if (bike.stage !== 'listed') continue;
        bike.ask = roadValue(bike);
        bike.nextVisit = state.day + 1;
        bike.meetings = (bike.offers ?? []).map((offer,index)=>createBuyer(bike,state.day,index,50,bike.ask,offer));
        delete bike.offers;
      }
    }
  }
  if (raw === null && state?.version === 3 && Array.isArray(state.branches) && Array.isArray(state.listings)) {
    state.version = 4;
    for (const bike of [...state.listings,...state.branches.flatMap(branch=>branch.garage)]) normalizePaint(bike);
  }
  if (!validSave(state)) throw new Error('Kayıt biçimi geçersiz.');
  return state;
}

export function saveGame(storage, state) {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}
