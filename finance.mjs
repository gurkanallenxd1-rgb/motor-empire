export const FINANCE_CATEGORIES = Object.freeze({
  purchase:'Motosiklet alımı', sale:'Motosiklet satışı', repair:'Tamir', shipping:'Nakliye',
  inspection:'Ekspertiz', rental:'Kiralama', wages:'Personel maaşı', overhead:'Şube gideri',
  investment:'Şube ve garaj yatırımı', loan:'Kredi kullanımı', principal:'Anapara ödemesi',
  interest:'Faiz gideri', income:'Diğer gelir', expense:'Diğer gider',
});

const vehicleLabels = [
  ['purchase',' alımı'],['sale',' satışı'],['repair',' tamir parçaları'],
  ['inspection',' ekspertizi'],['rental',' kira geliri'],
];
const round = value => Math.round(value*100)/100;
const cents = value => Math.round(value*100);

export function entryDetails(entry) {
  if (entry.category && Object.prototype.hasOwnProperty.call(FINANCE_CATEGORIES,entry.category)) {
    return {category:entry.category,model:entry.model ?? null};
  }
  const {kind,label} = entry;
  if (kind === 'loan') return {category:'loan',model:null};
  if (kind === 'repayment') return {category:'principal',model:null};
  if (kind === 'expense' && /faiz/iu.test(label)) return {category:'interest',model:null};
  const shipping = label.match(/^(.+) nakliyesi(?: · .+)?$/u);
  if (shipping) return {category:'shipping',model:shipping[1]};
  for (const [category,suffix] of vehicleLabels) {
    if (label.endsWith(suffix) && label.length > suffix.length) {
      return {category,model:label.slice(0,-suffix.length)};
    }
  }
  const category = label === 'Garaj geliştirme' || label === 'Şube açılışı' ? 'investment'
    : label === 'Usta maaşları' ? 'wages'
    : label === 'Günlük işletme gideri' ? 'overhead' : kind;
  return {category,model:null};
}

const cashSign = entry => entry.kind === 'income' || entry.kind === 'loan' ? 1 : -1;
export function dailyCashMovement(ledger,day) {
  return ledger.reduce((total,entry)=>total+(entry.day === day ? cashSign(entry)*cents(entry.amount) : 0),0)/100;
}
const stockExpenses = new Set(['purchase','repair','shipping','inspection']);
const saleKey = (day,model,price) => JSON.stringify([day,model,cents(price)]);

export function financeTransactions(state) {
  const matched = new Map();
  const entries = state.ledger.map(entry=>{
    const row = {...entry,...entryDetails(entry),change:cashSign(entry)*entry.amount};
    if (row.category === 'sale') {
      const key = saleKey(row.day,row.model,row.amount);
      matched.set(key,(matched.get(key) ?? 0)+1);
    }
    return row;
  });
  // The first save format recorded sales separately and had no cash ledger.
  for (const sale of state.sales) {
    const key = saleKey(sale.day,sale.name,sale.price);
    const count = matched.get(key) ?? 0;
    if (count) {
      matched.set(key,count-1);
      continue;
    }
    entries.push({day:sale.day,branchId:sale.branchId ?? null,kind:'income',category:'sale',
      label:`${sale.name} satışı`,model:sale.name,amount:sale.price,change:sale.price,archived:true});
  }
  return entries.sort((a,b)=>b.day-a.day);
}

export function filterTransactions(entries,{category='',branch='',from=null,to=null} = {}) {
  return entries.filter(row=>(!category || row.category === category)
    && (!branch || (branch === 'unassigned' ? row.branchId === null : String(row.branchId) === branch))
    && (from === null || row.day >= from) && (to === null || row.day <= to));
}

function blank(day) {
  return {day,revenue:0,operatingCost:0,salesRevenue:0,salesCost:0,salesCount:0,
    rentalRevenue:0,rentalDays:0,interest:0,cashIn:0,cashOut:0,principalPaid:0,profit:0};
}

export function financeReport(state,worth,period) {
  const entries = financeTransactions(state);
  const rows = new Map();
  const onDay = day => {
    if (!rows.has(day)) rows.set(day,blank(day));
    return rows.get(day);
  };
  for (const row of entries) {
    const day = onDay(row.day);
    if (row.change >= 0) day.cashIn += cents(row.amount);
    else day.cashOut += cents(row.amount);
    if (row.category === 'rental') {
      day.rentalDays += 1;
      day.rentalRevenue += cents(row.amount);
    }
    if (row.kind === 'income' && row.category !== 'sale') day.revenue += cents(row.amount);
    if (row.kind === 'expense' && row.category !== 'investment' && !stockExpenses.has(row.category)) {
      day.operatingCost += cents(row.amount);
    }
    if (row.category === 'interest') day.interest += cents(row.amount);
    if (row.category === 'principal') day.principalPaid += cents(row.amount);
  }
  // Recognize each sale and its entire acquisition cost on the sale day.
  for (const sale of state.sales) {
    const day = onDay(sale.day);
    day.salesCount++;
    day.salesRevenue += cents(sale.price);
    day.salesCost += cents(sale.spent);
    day.revenue += cents(sale.price);
    day.operatingCost += cents(sale.spent);
  }

  const totals = blank(0);
  const periodTotals = blank(0);
  const start = period ? Math.max(1,state.day-period+1) : 1;
  for (const day of rows.values()) {
    day.profit = day.revenue-day.operatingCost;
    for (const key of Object.keys(totals)) {
      if (key === 'day') continue;
      totals[key] += day[key];
      if (day.day >= start) periodTotals[key] += day[key];
    }
  }
  const normalize = row => Object.fromEntries(Object.entries(row)
    .map(([key,value])=>[key,['day','rentalDays','salesCount'].includes(key) ? value : value/100]));

  const snapshots = new Map((state.financeSnapshots ?? []).map(snapshot=>[snapshot.day,snapshot]));
  const openingCash = cents(state.cash)-totals.cashIn+totals.cashOut;
  const canReconcileCash = openingCash === 7_500_000 && !entries.some(entry=>entry.archived);
  const points = new Map();
  for (const day of rows.keys()) if (day >= start) points.set(day,rows.get(day));
  for (const day of snapshots.keys()) if (day >= start) points.set(day,rows.get(day) ?? blank(day));
  if (period) for (let day=start;day<=state.day;day++) points.set(day,rows.get(day) ?? blank(day));
  points.set(state.day,rows.get(state.day) ?? blank(state.day));

  let cash = openingCash;
  for (const [day,row] of [...rows].sort((a,b)=>a[0]-b[0])) {
    if (day >= start) break;
    cash += row.cashIn-row.cashOut;
  }
  const series = [...points.values()].sort((a,b)=>a.day-b.day).map(row=>{
    cash += row.cashIn-row.cashOut;
    const snapshot = snapshots.get(row.day);
    const values = normalize(row);
    if (!canReconcileCash && !snapshot && row.day !== state.day && !rows.has(row.day)) {
      values.profit = values.revenue = values.operatingCost = values.salesCount = values.rentalDays = null;
    }
    return {...values,cash:row.day===state.day ? state.cash : snapshot?.cash ?? (canReconcileCash ? cash/100 : null),
      netWorth:row.day===state.day ? worth.net : snapshot?.netWorth ?? null};
  });
  return {entries,series,totals:normalize(totals),periodTotals:normalize(periodTotals),
    today:normalize(rows.get(state.day) ?? blank(state.day))};
}

export function pendingCosts(state,repairForecast,inspectionFee) {
  let shipping = 0, repairPaid = 0, repairUnpaid = 0, estimatedStockProfit = 0;
  for (const branch of state.branches) for (const bike of branch.garage) {
    const quote = repairForecast(bike);
    if (bike.stage === 'shipping') shipping += bike.shipping.fee;
    if (bike.stage === 'repairing') repairPaid += bike.repairCost ?? quote.cost;
    if (bike.stage === 'inspected') repairUnpaid += quote.cost;
    if (bike.stage !== 'rented') {
      const remaining = ['shipping','unchecked','inspected'].includes(bike.stage) ? quote.cost : 0;
      const inspection = ['shipping','unchecked'].includes(bike.stage) ? inspectionFee : 0;
      estimatedStockProfit += quote.afterValue-bike.spent-remaining-inspection;
    }
  }
  return {shipping:round(shipping),repairPaid:round(repairPaid),repairUnpaid:round(repairUnpaid),
    estimatedStockProfit:round(estimatedStockProfit)};
}

export function debtSummary(state,totals,limit) {
  return {principal:state.debt,interestRate:0,totalRepayment:round(state.debt+totals.principalPaid+totals.interest),
    paid:totals.principalPaid,interestPaid:totals.interest,available:Math.max(0,round(limit-state.debt)),
    installments:null,nextDay:null};
}
