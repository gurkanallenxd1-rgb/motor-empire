import { advanceCompetition,competitiveChoice,createCompetition,inheritedStock,removeAcquired,regionalRivalValue,rivalOffer,RIVAL_ROLES } from './rivals.mjs?v=0.18.1';
import { createEconomy, economyQuote, markToMarket, marketNews, marketRandom, nextEconomy, observeMarket } from './economy.mjs?v=0.16.1';
import { appendBikeCost, notificationAction, notify, saleSnapshot } from './notifications.mjs?v=0.18';
import { AUTO_STEPS, bestStaff, rankMarket, staffQuality, stepEnabled } from './automation.mjs?v=0.16.1';
import { BRANCH_TIERS, STAFF_ROLES, TRAINING_COST, TRAINING_TIME, availableStaff, branchProvince, createOffice,
  firstWorkshopJob, hasManager, jobWork, makeEmployee, upgradeOption, validAutomation, workers, workshopRate } from './business.mjs?v=0.16.1';
import { modelOf } from './bikes.mjs?v=0.16.1';
import { isYusufListing, yusufListing, YUSUF_MODEL, YUSUF_PRICE } from './easter-eggs.mjs?v=0.16.1';
import { RESOLUTIONS, STRATEGIES, complaintCost, hasDocuments, isRisky, rememberSale, reviewComplaint,
  setReputation } from './characters.mjs?v=0.18.1';
import { inspectionBaseline, purchaseCosts, purchaseValuation } from './valuation.mjs?v=0.16.1';
import { METHODS, PACKAGES, accidentAt, activePolicy, buyerComplaint, examine, legacyDamageRecords,
  policyEnd, policyQuote, seedRisk, serviceQuote, verifiedFindings, visibleListing } from './risk.mjs?v=0.16.1';
import { DAY_MS, HOUR_MS, OFFLINE_LIMIT, deliveryTime, elapsedWall, gameTime, startClock } from './clock.mjs?v=0.16.1';
import { FINANCE_CATEGORIES, entryDetails } from './finance.mjs?v=0.18.1';
import { ISTANBUL, PROVINCES, marketPressure, provinceName, provinceOf, shippingQuote } from './provinces.mjs?v=0.16.1';
import { catalog, normalizePaint, paintOptions } from './bikes.mjs?v=0.16.1';
import { MAX_ROUNDS, answerBuyer, arrive, buyerQuestion, observeBuyer, createBuyer, createSeller, createTrade, finishTrade, isActive, negotiate } from './trade.mjs?v=0.18.1';

import { PARTS, SELLER_URGENCY, askingPrice, cleanValue, completeRepair, historicalIssues,
  knownPart, repairForecast, repairQuote, roadValue } from './damage.mjs?v=0.16.1';
export { PARTS, repairPartCost, repairQuote, roadValue } from './damage.mjs?v=0.16.1';

export const INSPECTION_FEE = 450;
export const LEGACY_STORAGE_KEY = 'motor-empire.v1';
export const BUSINESS_STORAGE_KEY = 'motor-empire.v2';
export const PREVIOUS_STORAGE_KEY = 'motor-empire.v3';
export const MARKET_STORAGE_KEY = 'motor-empire.v4';
export const DAMAGE_STORAGE_KEY = 'motor-empire.v5';
export const TURKEY_STORAGE_KEY = 'motor-empire.v6';
export const FINANCE_STORAGE_KEY = 'motor-empire.v7';
export const CLOCK_STORAGE_KEY = 'motor-empire.v8';
export const STORAGE_KEY = 'motor-empire.v9';
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

function shuffle(items, random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function marketIssues(model,random) {
  const roll = random();
  const risk = model.faultRisk;
  const maintenance = model.category === 'scooter' ? ['yag','fren','lastik','akü']
    : ['yag','fren','lastik','akü','zincir','debriyaj'];
  const choose = list => list[Math.floor(random() * list.length)];
  const minor = ['grenaj','manet','ayna','sinyal','ayaklik'];
  if (roll < .025) return ['pert',choose(['saseDegisim','motor','agir']),choose(minor)];
  if (roll < .065 + risk*.09) return [choose(['saseIslem','saseDegisim','motor','agir']),choose(maintenance)];
  if (roll < .14 + risk*.15) return [choose(['depo','jant','masa','radyator','sanziman']),choose(minor)];
  if (roll < .25 + risk*.22) return [choose(minor),choose(maintenance)];
  if (roll < .47 + risk*.24) return shuffle(maintenance,random).slice(0,1+Math.floor(random()*3));
  return [];
}

function generateProvince(day, province, selected, random, economy) {
  const integer = (min,max) => min + Math.floor(random() * (max - min + 1));
  const stock = new Map();
  for (const model of selected) stock.set(model.category,(stock.get(model.category) ?? 0)+1);
  return selected.map((model,slot) => {
    const year = integer(model.firstYear,model.lastYear);
    const age = 2026 - year;
    const km = integer(1500 + age * 850,5000 + age * 3700);
    const faults = marketIssues(model,random);
    const condition = Math.max(25,integer(88,100)-faults.reduce((sum,code)=>sum+PARTS[code].gain,0));
    const choices = paintOptions(model,year);
    const color = choices[integer(0,choices.length - 1)];
    const serviceFactor = Math.max(1,Math.min(2,model.maintenance / 2600));
    const cleanBase = Math.round(model.value * (1 + (year-model.lastYear)*.009));
    const urgencyRoll = random();
    const urgency = model.segment === 'budget' || urgencyRoll < .19 ? 'urgent' : urgencyRoll < .82 ? 'normal' : 'patient';
    const bike = { id:`${day}-${province}-${slot}`,province,name:model.name,year,km,condition,cleanBase,serviceFactor,urgency,
      color:color.hex,colorName:color.name,...(color.accent ? {paintAccent:color.accent} : {}),faults };
    bike.damageHistory = historicalIssues(bike);
    seedRisk(bike);
    markToMarket(bike,economy);
    bike.value = cleanValue(bike);
    const baseline = askingPrice(bike,random);
    if (economy) {
      const repair = faults.length ? repairForecast(bike) : null;
      const recoverable = repair ? Math.max(0,repair.afterValue-repair.beforeValue-repair.cost) : 0;
      // Asking prices preserve a negotiable discount, with part of viable restoration value
      // priced in at the outset so the same workshop margin cannot be harvested without limit.
      const premium = urgency==='urgent' ? .057 : urgency==='normal' ? .028 : .009;
      bike.price = Math.max(3000,Math.round((baseline*(1+premium)+recoverable*.66)/50)*50);
    } else {
      const pressure = marketPressure(day,province,model.demand,stock.get(model.category)/selected.length);
      bike.price = Math.max(Math.ceil(baseline*.95),Math.min(Math.floor(baseline*1.05),Math.round(baseline*(1+pressure))));
    }
    return bike;
  });
}

function bySegment(ordered, quotas) {
  return quotas.flatMap(([segment,count])=>ordered.filter(model=>model.segment === segment).slice(0,count));
}

export function generateMarket(day, random = Math.random, includeIstanbul = true, economy) {
  const models = catalog.filter(model=>!model.eventOnly);
  const weights = economy && new Map(models.map(model=>{
    const quote = economyQuote(economy,model,model.lastYear,ISTANBUL);
    // Supply stays within segment quotas, while stocks that clear slowly are offered more often.
    return [model.id,Math.max(.78,Math.min(1.28,1+(quote.days-8)*.032-(quote.demand-1)*.25))];
  }));
  const rotate = ()=>weights ? models.map(model=>({model,key:random()**(1/weights.get(model.id))}))
    .sort((a,b)=>b.key-a.key).map(row=>row.model) : shuffle(models,random);
  const ordered = rotate();
  const local = bySegment(ordered,[['budget',8],['mid',14],['premium',6],['rare',2]]);
  const sharedModel = local[0];
  const market = includeIstanbul ? generateProvince(day,ISTANBUL,local,random,economy) : [];
  for (const {id} of PROVINCES) {
    if (id === ISTANBUL) continue;
    const pool = rotate().filter(model=>model !== sharedModel);
    const selected = [sharedModel,...bySegment(pool,[['budget',2],['mid',2],[id % 5 === 0 ? 'rare' : 'premium',1]])];
    market.push(...generateProvince(day,id,selected,random,economy));
  }
  return market;
}

function replenishMarket(state,day) {
  if (state.marketDay===day) return;
  state.marketDay = day;
  const previous = state.economy;
  const economy = nextEconomy(state,day);
  const listings = generateMarket(day,marketRandom(day),true,economy);
  if (!state.listings.some(isYusufListing)) {
    const special = yusufListing(day);
    if (special) {
      const slot = listings.findLastIndex(item=>item.province===special.province);
      listings[slot] = special;
    }
  }
  state.economy = observeMarket(economy,listings);
  const story = marketNews(previous,state.economy);
  if (story) {
    notify(state,'economy',gameTime(day),story);
    const box = state.economy;
    box.lastNews = day;
    box.newsMacro = box.macro;
    box.partsNews = box.macro.parts;
    if (story.model) box.lastModelNews = story.model;
  }
  state.listings.push(...listings);
}

function createBranch(id) {
  return { id, name: id === 1 ? 'İstanbul Merkez' : `İstanbul Şubesi ${id}`, level: 1, staff: 0, garage: [] };
}

export function newGame() {
  let economy=createEconomy(1);
  const listings=generateMarket(1,marketRandom(1),true,economy);
  economy=observeMarket(economy,listings);
  return {version:9,day:1,cash:75000,debt:0,listings,economy,competition:createCompetition(1,economy),
    branches:[createBranch(1)],sales:[],ledger:[],financeSnapshots:[],trade:createTrade()};
}

export const branchCapacity = branch => branch.tier===undefined ? GARAGE_LEVELS[branch.level-1].capacity : BRANCH_TIERS[branch.tier].capacity;
export const branchInvestment = branch => branch.tier===undefined
  ? (branch.id===1 ? 0 : BRANCH_COST)+GARAGE_LEVELS.slice(0,branch.level).reduce((total,level)=>total+level.cost,0)
  : BRANCH_TIERS[branch.tier].cost;
export const nextBranchTier = branch=>upgradeOption(branch,branchCapacity(branch),branchInvestment(branch));
export const repairCapacity = branch => 8 * (1 + branch.staff);
export const operatingCost = branch => DAILY_OVERHEAD + branch.staff*DAILY_WAGE
  +workers(branch).reduce((sum,worker)=>sum+STAFF_ROLES[worker.role].wage,0);

export function purchaseForecast(bike, price = bike.price, destination = ISTANBUL, economy) {
  return purchaseCosts(bike,price,INSPECTION_FEE,shippingQuote(bike.province,destination),
    economy ? markToMarket({...bike},economy,destination) : bike);
}

export function purchaseAnalysis(bike, meeting, destination = ISTANBUL, economy) {
  return purchaseValuation(bike,meeting,INSPECTION_FEE,shippingQuote(bike.province,destination),
    economy ? markToMarket({...bike},economy,destination) : bike);
}

export function estimatedListingProfit(bike,destination = ISTANBUL,economy) {
  return purchaseForecast(bike,bike.price,destination,economy).profit;
}

export function rentalRate(bike) {
  return decimal(roadValue(bike) * .006);
}

export function assets(state) {
  let equipment = 0;
  let inventory = 0;
  for (const branch of state.branches) {
    equipment += branchInvestment(branch);
    for (const bike of branch.garage) {
      inventory += roadValue(bike);
    }
  }
  for (const {bike} of state.waitingReturns ?? []) inventory += roadValue(bike);
  const total = state.cash + equipment + inventory;
  return { equipment, inventory, total, net: total - state.debt };
}

export function regionalPlayerValue(state,province) {
  const branches=state.branches.filter(branch=>branchProvince(branch)===province);
  const cashShare=branches.length/state.branches.length;
  return assets({...state,branches,cash:state.cash*cashShare,debt:state.debt*cashShare,
    waitingReturns:(state.waitingReturns??[]).filter(row=>branches.some(b=>b.id===row.branchId))}).net;
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
  const refunds = sales.filter(sale=>sale.returnedDay !== undefined && (day === undefined || sale.returnedDay===day));
  const revenue = decimal(results.reduce((sum,sale)=>sum+sale.price,0)-refunds.reduce((sum,sale)=>sum+sale.price,0));
  const cost = decimal(results.reduce((sum,sale)=>sum+sale.spent,0)-refunds.reduce((sum,sale)=>sum+sale.spent,0));
  const afterSaleCost = sales.filter(sale=>day===undefined || (sale.complaintResult?.day ?? sale.complaintDay)===day)
    .reduce((sum,sale)=>sum+(sale.afterSaleCost ?? sale.compensation ?? 0),0);
  return { revenue,cost,profit:decimal(revenue-cost-afterSaleCost) };
}

const decimal = value => Math.round(value * 100) / 100;
const validMoney = value => Number.isFinite(value) && value >= 0 && Number.isSafeInteger(Math.round(value * 100));
const validAmount = value => validMoney(value) && value > 0 && decimal(value) === value;

export function perform(state, action, id, amount, branchId = 1) {
  return applyAction(JSON.parse(JSON.stringify(state)),action,id,amount,branchId);
}

function applyAction(next, action, id, amount, branchId, worker) {
  const branch = next.branches.find(item => item.id === branchId);
  if (!branch) throw new Error('Şube bulunamadı.');
  const bike = branch.garage.find(item => item.id === id);

  function record(kind, value, label, at = branch, details = {}) {
    const entry = { day: next.day, branchId: at?.id ?? null, kind, amount: value, label,...details };
    next.ledger.unshift({...entry,...entryDetails(entry)});
  }

  function pay(cost, label, at = branch, mandatory = false, details) {
    if (next.cash < cost) {
      if (!mandatory) throw new Error('Kasanızda yeterli nakit yok. Finans bölümünden borç alabilirsiniz.');
      const shortfall = decimal(cost - next.cash);
      next.debt = decimal(next.debt + shortfall);
      next.cash = decimal(next.cash + shortfall);
      record('loan', shortfall, 'Zorunlu gider için borç', at);
    }
    next.cash = decimal(next.cash - cost);
    record('expense', cost, label, at, details);
  }

  function earn(value, label, at = branch, details) {
    next.cash = decimal(next.cash + value);
    record('income', value, label, at, details);
  }

  const now = gameTime(next.day,next.clock?.offset);
  let listing = next.listings.find(item => item.id === id);
  function purchase(price) {
    if (!listing) throw new Error('Bu ilan artık açık değil.');
    if (isYusufListing(listing)) price = YUSUF_PRICE;
    if (branch.garage.length >= branchCapacity(branch)) throw new Error('Bu şubenin garajı dolu.');
    const slot = Array.from({length:branchCapacity(branch)},(_,index)=>index)
      .find(index=>!branch.garage.some(item=>item.slot === index));
    if (listing.inspections?.some(report=>!report.result)) throw new Error('Ekspertiz raporu henüz hazır değil.');
    const delivery = shippingQuote(listing.province,branchProvince(branch));
    const spent = decimal(price + delivery.fee);
    if (next.cash < spent) throw new Error('Alım ve nakliye için yeterli nakit yok.');
    pay(price,`${listing.name} alımı`);
    if (delivery.fee) pay(delivery.fee,`${listing.name} nakliyesi · ${provinceName(listing.province)}`);
    if (isActive(listing.seller)) {
      listing.seller.price = price;
      finishTrade(next,listing.seller,listing,'bought');
    }
    const { seller, easterEgg, ...vehicle } = listing;
    markToMarket(vehicle,next.economy,branchProvince(branch));
    const reportIds = new Set(listing.inspections?.map(report=>report.id));
    for (const entry of next.ledger) {
      if (reportIds.has(entry.inspectionId)) entry.allocation = 'stock';
    }
    const inspected = listing.inspections?.some(report=>report.package==='full');
    const acquiredStage = inspected ? (listing.faults.length ? 'inspected' : 'ready') : 'unchecked';
    const inspectionCost = listing.inspections?.reduce((sum,report)=>sum+report.cost,0) ?? 0;
    branch.garage.push({...vehicle,stockDay:next.day,noticeCosts:{purchase:price,shipping:delivery.fee,inspection:inspectionCost,repair:0},slot,stage:delivery.days ? 'shipping' : acquiredStage,spent:decimal(spent+inspectionCost),
      ...(delivery.days ? {shipping:{...delivery,arrivalDay:next.day+delivery.days,acquiredStage,destination:branchProvince(branch),
        ...(next.clock ? {arrivalMs:gameTime(next.day+delivery.days,next.clock.offset)} : {})}} : {}),
      condition:listing.condition ?? 100});
    next.listings = next.listings.filter(item=>item.id !== id);
    notify(next,'purchase',now,{title:listing.name,branch:branch.name,amount:price});
    return delivery.days ? `${listing.name} yolda · ${branch.name} · Teslimat: Gün ${next.day+delivery.days}.`
      : `${listing.name} · ${branch.name} garajına alındı.`;
  }

  function vehiclePay(item, category, cost, title, office = branch, mandatory = false, details = {}) {
    if (cost) pay(cost,`${item.name} · ${title}`,office,mandatory,{category,model:item.name,...details});
  }

  function vehicleEarn(item, category, value, title, office = branch) {
    if (value) earn(value,`${item.name} · ${title}`,office,{category,model:item.name});
  }

  function beginRepair(item, hours) {
    item.remainingHours = hours;
    item.repairOrder = (next.repairOrder ?? 0)+1;
    next.repairOrder = item.repairOrder;
    item.stage = 'repairing';
  }

  function recordAccident(item, office, at, activity) {
    const incident = accidentAt(item,next.day,at,activity);
    if (!incident) return false;
    item.damageRecords = [...legacyDamageRecords(item),incident];
    item.openIncident = incident.id;
    item.faults = [...new Set([...item.faults,...incident.codes])];
    item.damageHistory = historicalIssues(item);
    item.condition = Math.max(25,item.condition-incident.codes.reduce((sum,code)=>sum+PARTS[code].gain,0));
    item.stage = 'inspected';
    delete item.rental;
    vehicleEarn(item,'traffic_payout',incident.trafficPayout,'Trafik sigortası ödemesi',office);
    vehiclePay(item,'accident',Math.round(incident.amount*.035)+incident.thirdParty,
      'Kaza kurtarma ve üçüncü kişi zararı',office,true);
    return true;
  }

  function placeReturn(item,office) {
    const slot = Array.from({length:branchCapacity(office)},(_,index)=>index)
      .find(index=>!office.garage.some(bike=>bike.slot===index));
    if (slot === undefined) return false;
    office.garage.push({...item,slot,stage:item.faults.length ? 'inspected' : 'ready'});
    return true;
  }

  function settleComplaints(at) {
    let count = 0;
    for (const sale of next.sales) {
      const pending = sale.complaint;
      if (!pending || complaintTime(pending)>at) continue;
      delete sale.complaint;
      if (sale.complaintResult || sale.returnedDay !== undefined || sale.compensation !== undefined) continue;
      const complaintBranch = next.branches.find(office=>office.id===sale.branchId);
      notify(next,'complaint',complaintTime(pending),{title:sale.name,branch:complaintBranch?.name});
      if (pending.requiresDecision) {
        sale.openComplaint = {...pending,openedDay:next.day};
        sale.complaintDay = next.day;
        reviewComplaint(next,sale,'open');
        count++;
        continue;
      }
      const {item,refund} = pending;
      const office = next.branches.find(branch=>branch.id===sale.branchId);
      const reputation = next.trade.reputation;
      setReputation(next,-(refund ? 12 : 6),'Eski şikâyet sonucu');
      sale.complaintDay = next.day;
      const result = {day:next.day,outcome:refund ? 'refund' : 'compensation',
        reputationLoss:reputation-next.trade.reputation,seen:false};
      const outcome = next.trade.history.find(row=>row.saleId===sale.id);
      if (outcome) outcome.satisfaction = Math.min(outcome.satisfaction,refund ? 30 : 50);
      if (refund) {
        vehiclePay(item,'refund',sale.price,'Satış iadesi',office,true,{saleId:sale.id});
        sale.returnedDay = next.day;
        result.amount = sale.price;
        result.destination = placeReturn(item,office) ? 'garage' : 'waiting';
        if (result.destination==='waiting') (next.waitingReturns ??= []).push({bike:item,branchId:office.id,saleId:sale.id});
      } else {
        const compensation = Math.max(500,Math.round(sale.price*.085));
        vehiclePay(item,'compensation',compensation,'Müşteri tazminatı',office,true,{saleId:sale.id});
        sale.compensation = compensation;
        result.amount = compensation;
      }
      sale.complaintResult = result;
      count++;
    }
    return count;
  }

  function resolveComplaint(sale,choice) {
    const {item} = sale.openComplaint;
    const office = next.branches.find(branch=>branch.id===sale.branchId);
    const result = {day:next.day,outcome:choice,amount:0,seen:false};
    const reputation = next.trade.reputation;
    if (choice==='refund') {
      vehiclePay(item,'refund',sale.price,'Satış iadesi',office,true,{saleId:sale.id});
      sale.returnedDay = next.day;
      result.amount = sale.price;
      result.destination = placeReturn(item,office) ? 'garage' : 'waiting';
      if (result.destination==='waiting') (next.waitingReturns ??= []).push({bike:item,branchId:office.id,saleId:sale.id});
    } else if (choice==='repair' || choice==='compensation') {
      const amount = complaintCost(sale,choice,repairQuote);
      const category = choice==='repair' ? 'complaint_repair' : 'compensation';
      vehiclePay(item,category,amount,RESOLUTIONS[choice],office,true,{saleId:sale.id});
      if (choice==='compensation') sale.compensation = amount;
      sale.afterSaleCost = amount;
      result.amount = amount;
    }
    delete sale.openComplaint;
    const effect = {repair:-2,compensation:-5,refund:-3,dismiss:-12};
    setReputation(next,effect[choice],'Müşteri şikâyeti');
    result.reputationLoss = reputation-next.trade.reputation;
    sale.complaintResult = result;
    const outcome = next.trade.history.find(row=>row.saleId===sale.id);
    if (outcome) outcome.satisfaction = Math.min(outcome.satisfaction,{repair:78,compensation:60,refund:60,dismiss:20}[choice]);
    reviewComplaint(next,sale,choice);
  }

  function considerEvidence(item) {
    if (item.seller?.status!=='open' || isYusufListing(item)) return;
    const verified = verifiedFindings(item).filter(code=>item.disclosure?.hidden.includes(code));
    if (!verified.length) return;
    const discount = Math.min(.11,verified.reduce((sum,code)=>sum+PARTS[code].gain*.003,0));
    const marketFloor = item.seller.profile.id && item.seller.profile.knowledge>=65
      ? Math.round(roadValue(visibleListing(item))*(item.urgency==='urgent' ? .72 : .84)) : 0;
    item.seller.limit = Math.min(item.seller.limit,Math.max(50,marketFloor,Math.round(item.price*(.84-discount))));
    item.seller.speech = 'Ekspertiz raporundaki bulguları fiyat görüşmesinde değerlendirelim.';
  }

  function restoreInspection() {
    const archived = next.inspectionArchive?.find(item=>item.id===id && item.listing);
    if (!archived || listing || (isYusufListing(archived.listing) && next.listings.some(isYusufListing))) return false;
    listing = {...archived.listing,inspectionResumedDay:next.day,inspections:archived.reports};
    markToMarket(listing,next.economy);
    next.listings.unshift(listing);
    next.inspectionArchive = next.inspectionArchive.filter(item=>item!==archived);
    return true;
  }

  function nextBuyerDay(item) {
    const wait = item.marketTerms ? Math.max(2,Math.round(item.marketTerms.days*.44)) : 1;
    return next.day+wait+Number(item.ask>roadValue(item)*1.22);
  }

  function activeMeeting(meetingId) {
    const meeting = listing?.seller && listing.seller.id === meetingId ? listing.seller
      : bike?.stage === 'listed' ? bike.meetings.find(item=>item.id === meetingId) : null;
    if (!isActive(meeting)) throw new Error('Bu teklif artık geçerli değil.');
    return meeting;
  }

  let message;
  switch (action) {
    case 'notice-read': case 'notices-read-all': case 'notices-clear': case 'notice-type': case 'notice-sound':
      if (['notices-read-all','notices-clear'].includes(action) && id!==undefined && typeof id!=='string') throw new Error('Geçersiz bildirim filtresi.');
      notificationAction(next,action,id,amount);
      break;
    case 'pre-inspect': {
      const plan = Object.prototype.hasOwnProperty.call(PACKAGES,amount) ? PACKAGES[amount] : null;
      if (!listing || !plan) throw new Error('İlan veya ekspertiz paketi geçersiz.');
      const reports = listing.inspections ??= [];
      if (reports.some(report=>!report.result || PACKAGES[report.package].cost>=plan.cost)) {
        throw new Error('Mevcut ekspertiz bekleniyor veya bu kapsam zaten incelendi.');
      }
      listing.inspectionBaseline ??= inspectionBaseline(listing);
      const report = {id:`${listing.id}:${amount}`,package:amount,cost:plan.cost,branchId:branch.id,due:now+plan.hours*HOUR_MS};
      vehiclePay(listing,'inspection',plan.cost,`${plan.label} ekspertiz`,branch,false,
        {inspectionId:report.id,allocation:'pending'});
      reports.push(report);
      message = `${plan.label} ekspertiz başladı · ${plan.hours} oyun saati.`;
      break;
    }
    case 'resume-inspection': {
      if (!restoreInspection()) throw new Error('Bu ekspertiz artık görüşmeye açılamıyor.');
      message = 'Ekspertiz raporuna ait ilan yeniden açıldı.';
      break;
    }
    case 'close-inspection':
      if (!listing?.inspections?.length || listing.inspections.some(report=>!report.result)) {
        throw new Error('Kapatılabilir bir ekspertiz yok.');
      }
      for (const report of listing.inspections) {
        if (!report.closed) report.closed = true;
        for (const entry of next.ledger) if (entry.inspectionId===report.id && entry.allocation==='pending') {
          entry.allocation = 'operating';
          entry.recognizedDay = next.day;
        }
      }
      message = 'Ekspertiz gider kaydedildi. Sonuçlar ilan açık kaldığı sürece görülebilir.';
      break;
    case 'policy': {
      const quote = Object.prototype.hasOwnProperty.call({traffic:1,casco:1},amount) && bike && policyQuote(bike,amount);
      if (!quote || !['ready','inspected','unchecked'].includes(bike.stage) || activePolicy(bike,amount,now)) {
        throw new Error('Bu poliçe şu anda düzenlenemiyor.');
      }
      const policy = {...quote,id:`${bike.id}:${amount}:${now}`,type:amount,start:now,end:policyEnd(now,quote.days)};
      vehiclePay(bike,'insurance_premium',policy.premium,amount==='traffic' ? 'Trafik primi' : 'Kasko primi');
      (bike.policies ??= []).push(policy);
      message = 'Poliçe başladı.';
      break;
    }
    case 'ride':
      if (bike?.stage !== 'ready' || !activePolicy(bike,'traffic',now) ||
          activePolicy(bike,'traffic',now).end<now+HOUR_MS) throw new Error('Sürüş boyunca geçerli trafik sigortası gerekiyor.');
      bike.stage = 'riding';
      bike.ride = {end:now+HOUR_MS,sequence:(bike.rideSequence ?? 0)+1};
      bike.rideSequence = bike.ride.sequence;
      message = 'Test sürüşü başladı · 1 oyun saati.';
      break;
    case 'resolve-complaint': {
      const sale = next.sales.find(item=>item.id===id);
      if (!sale?.openComplaint || !Object.prototype.hasOwnProperty.call(RESOLUTIONS,amount)) {
        throw new Error('Çözülebilecek açık bir şikâyet bulunamadı.');
      }
      if (sale.branchId!==branch.id) throw new Error('Şikâyetin ait olduğu şubeyi seçin.');
      resolveComplaint(sale,amount);
      message = 'Şikâyet kararı işlendi.';
      break;
    }
    case 'acknowledge-complaint': {
      const result = next.sales.find(sale=>sale.id===id)?.complaintResult;
      if (!result) throw new Error('Şikâyet kaydı bulunamadı.');
      result.seen = true;
      message = 'Şikâyet bildirimi okundu.';
      break;
    }
    case 'take-return': {
      const returned = next.waitingReturns?.find(item=>item.bike.id===id && item.branchId===branch.id);
      if (!returned || !placeReturn(returned.bike,branch)) throw new Error('İade için boş garaj bölmesi gerekiyor.');
      next.waitingReturns = next.waitingReturns.filter(item=>item!==returned);
      const result = next.sales.find(sale=>sale.id===returned.saleId)?.complaintResult;
      if (result) result.destination = 'garage';
      message = 'İade edilen motosiklet garaja alındı.';
      break;
    }
    case 'settle-events': {
      const summary = {inspected:0,approved:0,accidents:0,rides:0,complaints:settleComplaints(now)};
      for (const item of next.listings) {
        for (const report of item.inspections ?? []) {
          if (report.result || report.due>now) continue;
          item.inspectionBaseline ??= inspectionBaseline(item);
          report.result = examine(item,report.package);
          report.completedDay = next.day;
          considerEvidence(item);
          const office = next.branches.find(branch=>branch.id===report.branchId
            || branch.id===next.ledger.find(row=>row.inspectionId===report.id)?.branchId);
          notify(next,'inspection',report.due,{title:item.name,branch:office?.name});
          summary.inspected++;
        }
      }
      for (const office of next.branches) for (const item of office.garage) {
        if (item.stage==='claiming' && item.claim.due<=now) {
          vehicleEarn(item,'insurance_payout',item.claim.payout,'Kasko hasar ödemesi',office);
          item.spent = decimal(item.spent-item.claim.payout);
          appendBikeCost(item,'repair',-item.claim.payout);
          item.repairPayout = item.claim.payout;
          beginRepair(item,item.claim.hours);
          delete item.claim;
          summary.approved++;
        }
        if (item.stage==='riding' && item.ride.end<=now) {
          const {sequence,end} = item.ride;
          item.km += 12;
          item.stage = 'ready';
          delete item.ride;
          summary.accidents += Number(recordAccident(item,office,end,`ride:${sequence}`));
          summary.rides++;
        }
      }
      return {state:next,...summary};
    }
    case 'buy':
      message = purchase(listing?.price);
      break;
    case 'meet-seller':
      if (!listing && !restoreInspection()) throw new Error('Bu ilan artık açık değil.');
      if (listing.inspections?.some(report=>!report.result)) throw new Error('Ekspertiz raporu henüz hazır değil.');
      if (listing.seller && !isActive(listing.seller)) throw new Error('Satıcı bu görüşmeyi kapattı.');
      if (listing.inspections?.length) listing.inspectionBaseline ??= inspectionBaseline(listing);
      if (!listing.seller) {
        listing.seller = createSeller(listing,next.day,roadValue(visibleListing(listing)));
        considerEvidence(listing);
      }
      message = listing.seller.speech;
      break;
    case 'hold-buyer': {
      const meeting = activeMeeting(amount);
      if (meeting.kind !== 'sale') throw new Error('Geçersiz müşteri görüşmesi.');
      meeting.held = true;
      break;
    }
    case 'answer-buyer': {
      const meeting = activeMeeting(amount?.meetingId);
      if (meeting.kind!=='sale') throw new Error('Bu görüşmede müşteri sorusu yok.');
      const from = meeting.price;
      answerBuyer(meeting,bike,amount.topic,amount.choice);
      if (meeting.price!==from) meeting.priceChange = {from,to:meeting.price};
      if (meeting.status==='left') finishTrade(next,meeting,bike,'left');
      message = meeting.speech;
      break;
    }
    case 'offer-purchase':
    case 'negotiate': {
      const submitted = action==='offer-purchase';
      const meeting = activeMeeting(submitted ? amount?.meetingId : amount);
      const offer = submitted ? amount.price : undefined;
      if (submitted && (meeting.kind!=='purchase' || !validAmount(offer) || offer>meeting.price)) {
        throw new Error('Teklif pozitif olmalı ve satıcının güncel fiyatını aşmamalı.');
      }
      if (meeting.kind==='purchase' && listing.inspections?.some(report=>!report.result)) {
        throw new Error('Ekspertiz raporu henüz hazır değil.');
      }
      if (meeting.kind==='purchase' && listing.urgency) meeting.urgency ??= listing.urgency;
      const from = meeting.price;
      negotiate(meeting,offer);
      if (meeting.kind==='sale') {
        observeBuyer(meeting,bike);
        if (meeting.price!==from) meeting.priceChange = {from,to:meeting.price};
      }
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
      appendBikeCost(bike,'inspection',INSPECTION_FEE);
      notify(next,'inspection',now,{title:bike.name,branch:branch.name});
      bike.garageInspection = {package:'full',title:'Garaj ekspertizi',result:examine(bike,'full'),completedDay:next.day};
      bike.stage = bike.faults.length ? 'inspected' : 'ready';
      message = bike.faults.length ? 'Ekspertiz tamamlandı. Parça ve işçilik dökümü hazır.' : 'Ekspertiz tamamlandı. Motosiklet satışa hazır.';
      break;
    case 'repair': {
      if (bike?.stage !== 'inspected') throw new Error('Önce ekspertiz yaptırın.');
      const method = amount ?? 'private';
      const quote = Object.prototype.hasOwnProperty.call(METHODS,method) && serviceQuote(bike,method);
      if (!quote || (method==='insured' && !quote.eligible)) throw new Error('Bu hasar için kasko onarımı kullanılamıyor.');
      if (!quote.hours) {
        bike.stage = 'ready';
        message = 'Motosiklet satışa hazır.';
        break;
      }
      if (method==='private') pay(quote.cost,`${bike.name} tamir parçaları`);
      else vehiclePay(bike,'service',quote.cost,METHODS[method].label);
      bike.spent += quote.cost;
      appendBikeCost(bike,'repair',quote.cost);
      bike.repairCost = quote.cost;
      bike.repairMethod = method;
      if (method==='insured') {
        const incident = bike.damageRecords.find(row=>row.id===bike.openIncident);
        incident.claimed = true;
        bike.claim = {due:now+quote.approval,payout:quote.payout,hours:quote.hours,incident:incident.id};
        bike.stage = 'claiming';
        message = 'Kasko onayı bekleniyor. Onaydan sonra ödeme işlenecek ve onarım başlayacak.';
      } else {
        beginRepair(bike,quote.hours);
        message = 'Tamir iş sırasına alındı.';
      }
      break;
    }
    case 'list-strategy': {
      const strategy = amount?.strategy;
      if (!bike || !Object.prototype.hasOwnProperty.call(STRATEGIES,strategy) || !validAmount(amount.price)) {
        throw new Error('Geçerli bir satış yöntemi ve fiyat seçin.');
      }
      const damaged = Boolean(bike.faults.length || bike.damageHistory?.length);
      const ready = bike.stage==='ready';
      const inspected = bike.stage==='inspected';
      const allowed = strategy==='damaged' ? inspected
        : strategy==='repaired' ? ready
        : strategy==='documented' ? (ready || inspected) && hasDocuments(bike)
        : (ready || inspected) && damaged;
      if (!allowed) throw new Error('Bu motosiklet seçilen satış yöntemine uygun değil.');
      if (strategy==='cosmetic' && !bike.cosmeticPresentation) {
        const cost = Math.max(450,Math.round(roadValue(bike)*.012));
        vehiclePay(bike,'cosmetic',cost,'Görsel bakım');
        bike.spent += cost;
        bike.cosmeticPresentation = true;
      }
      bike.tradeStrategy = strategy;
      bike.disclosureMode = isRisky(strategy) ? 'conceal' : 'disclose';
      bike.documented = strategy==='documented';
      bike.listedFrom = bike.stage;
      bike.stage = 'listed';
      bike.ask = amount.price;
      bike.listedDay = next.day;
      bike.managedAsking = Boolean(worker);
      bike.nextVisit = nextBuyerDay(bike);
      bike.meetings = [];
      message = 'Motosiklet seçilen yöntemle ilana çıktı.';
      break;
    }
    case 'list-quiet':
    case 'list':
      if (bike?.stage !== 'ready') throw new Error('Yalnızca satışa hazır motosikletler ilana çıkabilir.');
      if (amount !== undefined && !validAmount(amount)) throw new Error('Geçerli bir ilan fiyatı girin.');
      bike.disclosureMode = action==='list-quiet' ? 'conceal' : 'disclose';
      bike.stage = 'listed';
      bike.ask = amount ?? roadValue(bike);
      bike.listedDay = next.day;
      bike.managedAsking = Boolean(worker);
      bike.nextVisit = nextBuyerDay(bike);
      bike.meetings = [];
      message = 'İlan açıldı. Müşteriler sonraki günlerde gelebilir.';
      break;
    case 'unlist':
      if (bike?.stage !== 'listed') throw new Error('Bu motosiklet satışta değil.');
      for (const meeting of bike.meetings.filter(isActive)) finishTrade(next,meeting,bike,'expired');
      bike.stage = bike.listedFrom ?? 'ready';
      delete bike.listedFrom;
      delete bike.meetings;
      delete bike.ask;
      delete bike.listedDay;
      delete bike.managedAsking;
      delete bike.nextVisit;
      message = 'Satış ilanı kaldırıldı.';
      break;
    case 'sell': {
      const meeting = activeMeeting(amount);
      if (meeting.kind !== 'sale' || bike?.stage !== 'listed') throw new Error('Bu teklif artık geçerli değil.');
      branch.garage = branch.garage.filter(item=>item.id !== id);
      earn(meeting.price,`${bike.name} satışı`);
      const saleId = `${meeting.id}:settled`;
      const complaint = meeting.dialogue?.disclosed ? null : buyerComplaint(bike,saleId);
      const sale = {id:saleId,name:bike.name,day:next.day,handedOverDay:next.day,price:meeting.price,spent:bike.spent,branchId:branch.id,
        ...(bike.listedDay===undefined ? {} : {daysListed:next.day-bike.listedDay}),
        damageRecords:legacyDamageRecords(bike),disclosureMode:bike.disclosureMode ?? 'disclose',
        ...(bike.tradeStrategy ? {strategy:meeting.dialogue?.disclosed && isRisky(bike.tradeStrategy) ? 'damaged' : bike.tradeStrategy,
          customerId:meeting.profile.id,returning:meeting.returning ?? false} : {}),
        inspections:[...(bike.inspections ?? []),...(bike.garageInspection ? [bike.garageInspection] : [])]};
      if (complaint) {
        const {meetings,ask,nextVisit,...item} = bike;
        sale.complaint = {item,day:next.day+complaint.delay,
          due:now+complaint.delay*DAY_MS,refund:complaint.returnBike,requiresDecision:Boolean(bike.tradeStrategy)};
      }
      next.sales.unshift(sale);
      notify(next,'sale',now,{title:bike.name,branch:branch.name,sale:saleSnapshot(bike,meeting.price,worker)});
      finishTrade(next,meeting,bike,'sold',worker);
      next.trade.history[0].saleId = saleId;
      rememberSale(next,sale,meeting,bike,worker);
      for (const other of bike.meetings.filter(isActive)) finishTrade(next,other,bike,'expired');
      message = `${bike.name}, ${meeting.profile.name} adlı müşteriye satıldı.`;
      break;
    }
    case 'rent':
      if (bike?.stage !== 'ready' || !RENTAL_DAYS.includes(amount)) throw new Error('Geçerli süreyle satışa hazır bir motosiklet seçin.');
      const endDay = next.day+amount;
      if (next.clock && !(activePolicy(bike,'traffic',now)?.end>=gameTime(endDay))) {
        throw new Error('Kiralama boyunca geçerli trafik sigortası gerekiyor.');
      }
      bike.stage = 'rented';
      bike.rental = { endDay, days: amount, rate: rentalRate(bike),...(next.clock ? {roadRisk:true} : {}) };
      message = `${bike.name} ${amount} günlüğüne kiralandı.`;
      break;
    case 'open-office': {
      if (!provinceOf(amount?.province) || !Number.isInteger(amount.tier) || !BRANCH_TIERS[amount.tier]) {
        throw new Error('İl ve şube seviyesi seçin.');
      }
      const office = createOffice(next.branches.length+1,amount.province,amount.tier);
      pay(BRANCH_TIERS[amount.tier].cost,'Şube açılışı',office);
      next.branches.push(office);
      message = `${office.name} açıldı.`;
      break;
    }
    case 'upgrade-office': {
      const plan = nextBranchTier(branch);
      if (!plan) throw new Error('Şube en yüksek seviyede.');
      if (amount && typeof amount==='object' && (amount.capacity!==plan.capacity || amount.increase!==plan.increase)) {
        throw new Error('Garaj yükseltmesi değişti. Güncel önizlemeyi kontrol edin.');
      }
      pay(plan.increase,'Garaj geliştirme');
      branch.tier = plan.tier;
      message = `Şube ${plan.name} seviyesine yükseldi.`;
      break;
    }
    case 'hire-worker': {
      if (!Object.prototype.hasOwnProperty.call(STAFF_ROLES,amount) || workers(branch).length>=80) {
        throw new Error('Geçerli bir görev seçin veya personel sınırını kontrol edin.');
      }
      next.employeeSequence = (next.employeeSequence ?? 0)+1;
      (branch.workers ??= []).push(makeEmployee(`P${next.employeeSequence}`,amount));
      message = 'Personel işe alındı.';
      break;
    }
    case 'fire-worker':
    case 'train-worker':
    case 'transfer-worker': {
      const worker = workers(branch).find(item=>item.id===id);
      if (!worker || worker.travel || worker.training) throw new Error('Personel şu anda uygun değil.');
      if (action==='fire-worker') branch.workers = branch.workers.filter(item=>item!==worker);
      else if (action==='train-worker') {
        if (worker.skill===100 && worker.quality===100 && worker.speed===100) throw new Error('Personel eğitim sınırına ulaştı.');
        pay(TRAINING_COST,`${worker.name} eğitimi`,branch,false,{category:'training'});
        worker.training = now+TRAINING_TIME;
      } else {
        const office = next.branches.find(item=>item.id===amount && item.id!==branch.id);
        if (!office || workers(office).length>=80) throw new Error('Personel kabul edebilen bir hedef şube seçin.');
        const route = shippingQuote(branchProvince(branch),branchProvince(office));
        if (route.fee) pay(route.fee,`${worker.name} şube transferi`,branch,false,{category:'staff_transfer'});
        if (route.days) worker.travel = now+route.days*DAY_MS;
        branch.workers = branch.workers.filter(item=>item!==worker);
        (office.workers ??= []).push(worker);
      }
      message = action==='fire-worker' ? 'Personel işten çıkarıldı.' : action==='train-worker' ? 'Eğitim başladı.' : 'Personel transferi kaydedildi.';
      break;
    }
    case 'transfer-bike': {
      const office = next.branches.find(item=>item.id===amount && item.id!==branch.id);
      if (!office || !bike || !['unchecked','inspected','ready'].includes(bike.stage)) throw new Error('Bu motosiklet transfer edilemiyor.');
      const slot = Array.from({length:branchCapacity(office)},(_,i)=>i).find(i=>!office.garage.some(item=>item.slot===i));
      if (slot===undefined) throw new Error('Hedef şubenin garajı dolu.');
      const origin = branchProvince(branch);
      const destination = branchProvince(office);
      const route = shippingQuote(origin,destination);
      if (route.fee) vehiclePay(bike,'shipping',route.fee,'Şubeler arası nakliye',office);
      bike.spent = decimal(bike.spent+route.fee);
      appendBikeCost(bike,'shipping',route.fee);
      if (!route.days) notify(next,'delivery',now,{title:bike.name,branch:office.name});
      bike.slot = slot;
      if (route.days) {
        bike.shipping = {...route,origin,destination,arrivalDay:next.day+route.days,arrivalMs:now+route.days*DAY_MS,acquiredStage:bike.stage};
        bike.stage = 'shipping';
      }
      branch.garage = branch.garage.filter(item=>item!==bike);
      markToMarket(bike,next.economy,destination);
      office.garage.push(bike);
      message = 'Transfer kaydedildi ve hedef bölme ayrıldı.';
      break;
    }
    case 'internal-inspect':
    case 'internal-repair': {
      const kind = action==='internal-inspect' ? 'internalInspection' : 'internalRepair';
      if (bike?.stage!==(kind==='internalInspection' ? 'unchecked' : 'inspected') || !workshopRate(branch,kind)) {
        throw new Error('Motosiklet ve uygun şirket içi personel gerekiyor.');
      }
      const quote = repairQuote(bike);
      if (kind==='internalRepair' && !quote.hours) throw new Error('Onarılacak parça yok.');
      const cost = kind==='internalRepair' ? quote.cost : 0;
      if (cost) vehiclePay(bike,'repair',cost,'Şirket içi tamir parçaları');
      bike.spent += cost;
      appendBikeCost(bike,'repair',cost);
      next.repairOrder = (next.repairOrder ?? 0)+1;
      bike.internalJob = {remaining:jobWork(kind==='internalInspection' ? 4 : quote.hours),order:next.repairOrder,cost};
      bike.stage = kind;
      message = 'Motosiklet iş sırasına alındı.';
      break;
    }
    case 'pause-bike-automation':
      if (!bike) throw new Error('Motosiklet bulunamadı.');
      bike.autoPaused = !bike.autoPaused;
      message = bike.autoPaused ? 'Motosiklet manuel yönetime alındı.' : 'Motosiklet otomasyona açıldı.';
      break;
    case 'set-automation':
      if (!validAutomation(amount) || Object.keys(AUTO_STEPS).some(step=>stepEnabled(amount,step)) && !hasManager(branch)) {
        throw new Error('Ayarları kontrol edin. Otomasyon için görevde bir müdür gerekiyor.');
      }
      branch.automation = {...amount};
      message = 'Müdürün işlem sınırları kaydedildi.';
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
    case 'acquire-rival': {
      const company=next.competition?.companies.find(item=>String(item.id)===String(id));
      if(!company || amount?.confirmed!==true || !validAmount(amount.price) || !Number.isSafeInteger(amount.price) || amount.price>1e9)
        throw new Error('Onaylı ve geçerli bir devralma teklifi gerekli.');
      const quote=rivalOffer(company,amount.price);
      if(amount.stamp!==next.competition.day)throw new Error('Değerleme değişti. Teklifi tekrar açın.');
      if(!quote.accepted)throw new Error('Şirket yönetimi teklifi reddetti.');
      if(next.cash<quote.total)throw new Error('Devralma bedeli için yeterli nakit yok.');
      const basis=Math.max(0,quote.total-company.cash+company.debt);
      const offices=company.branches.map((source,index)=>{
        const office=createOffice(next.branches.length+index+1,source.province,source.tier);
        office.workers=RIVAL_ROLES.slice(0,source.staff).map((role,index)=>
          makeEmployee(`r${company.id}-${source.id}-${index}`,role));
        office.garage=company.stock.filter(item=>item.branch===source.id).map((item,slot)=>
          inheritedStock(item,next.day,source.province,
            Math.round(basis*item.value/Math.max(1,quote.assets+quote.stock)),slot));
        return office;
      });
      next.cash=decimal(next.cash-quote.total+company.cash);
      next.debt=decimal(next.debt+company.debt);
      next.branches.push(...offices);
      record('expense',quote.total,`${company.name} şirket devralması`,null,{category:'company_investment'});
      if(company.cash)record('income',company.cash,'Devralınan kasa',null,{category:'takeover_cash'});
      removeAcquired(next.competition,company,quote,offices);
      notify(next,'competition',now,{title:'Şirket devralındı',body:`${company.name} · ${offices.length} şube`});
      message=`${company.name} devralındı.`;
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
      if (next.clock && next.clock.offset !== DAY_MS) throw new Error('Gün henüz tamamlanmadı.');
      const tomorrow = next.day + 1;
      let completed = 0;
      let returned = 0;
      let accidents = 0;
      const delivered = deliver(next,gameTime(tomorrow));
      let visits = 0;
      // Today's rentals are earned before any branch settles its mandatory expenses.
      for (const office of next.branches) {
        for (const item of office.garage) {
          if (item.stage !== 'rented') continue;
          earn(item.rental.rate, `${item.name} kira geliri`, office);
          const {rental} = item;
          if (rental.roadRisk && recordAccident(item,office,gameTime(tomorrow)-1,'rental')) {
            item.km += (rental.days-(rental.endDay-tomorrow))*85;
            accidents++;
            continue;
          }
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
        for (const worker of workers(office)) {
          pay(STAFF_ROLES[worker.role].wage,`${worker.name} · ${STAFF_ROLES[worker.role].name} maaşı`,office,true,{category:'wages'});
        }
        if (!next.clock) completed += workInternal(next,office,DAY_MS,next.day,gameTime(tomorrow)).completed;
        if (!next.clock) completed += workRepairs(next,office,tomorrow,repairCapacity(office)*HOUR_MS,gameTime(tomorrow));
        else {
          completed += workRepairs(next,office,tomorrow,0,gameTime(tomorrow));
          delete office.workMs;
        }

      }
      const complaints = next.clock ? 0 : settleComplaints(gameTime(tomorrow));
      next.financeSnapshots ??= [];
      next.financeSnapshots.push({day:next.day,cash:next.cash,netWorth:assets(next).net});
      next.day = tomorrow;
      if (next.clock) next.clock.offset = 0;
      next.listings = next.listings.filter(item=>{
        const reports = item.inspections ?? [];
        if (isActive(item.seller) || reports.some(report=>!report.closed &&
          (item.inspectionResumedDay===tomorrow-1 || !report.result || report.completedDay+1>=tomorrow))) return true;
        if (reports.length) {
          const resumable = reports.some(report=>!report.closed && report.result) && !item.seller;
          (next.inspectionArchive ??= []).unshift({name:item.name,id:item.id,day:tomorrow-1,
            reports,...(resumable ? {listing:{...item,inspections:undefined}} : {})});
          const ids = new Set(reports.map(report=>report.id));
          for (const entry of next.ledger) if (ids.has(entry.inspectionId) && entry.allocation==='pending') {
            entry.allocation = 'operating';
            entry.recognizedDay = tomorrow-1;
          }
        }
        return false;
      });
      // Generate and record the same observable market on every elapsed day, online or offline.
      replenishMarket(next,tomorrow);
      next.competition ??= createCompetition(tomorrow-1,next.economy);
      const rivalMarket=next.competition;
      const oldRank=rivalMarket.rank;
      const oldCityRank=rivalMarket.cityRank;
      advanceCompetition(rivalMarket,tomorrow,next.economy,next.sales);
      const worth=assets(next).net;
      rivalMarket.rank=1+rivalMarket.companies.filter(company=>company.bookValue>worth).length;
      const headquarters=branchProvince(next.branches[0]);
      const regionalWorth=regionalPlayerValue(next,headquarters);
      rivalMarket.cityRank=1+rivalMarket.companies.filter(company=>company.branches.some(office=>office.province===headquarters)
        && regionalRivalValue(company,headquarters)>regionalWorth).length;
      if(tomorrow%7===0 && (rivalMarket.rank<oldRank || rivalMarket.cityRank<oldCityRank)) {
        const text=rivalMarket.rank<oldRank?`Türkiye sıralamasında ${rivalMarket.rank}. sıraya yükseldiniz.`
          : `${provinceName(headquarters)} sıralamasında ${rivalMarket.cityRank}. sıraya yükseldiniz.`;
        rivalMarket.news.push({day:tomorrow,id:null,type:'rank',text});
        if(rivalMarket.news.length>45)rivalMarket.news.shift();
      }
      const latest=rivalMarket.news.at(-1);
      if(latest?.day===tomorrow && tomorrow-(rivalMarket.lastNotice??0)>=4) {
        notify(next,'competition',gameTime(tomorrow),{title:'Rekabet haberi',body:latest.text});
        rivalMarket.lastNotice=tomorrow;
      }

      for (const item of next.listings) if (!item.id.startsWith(`${tomorrow}-`)) markToMarket(item,next.economy);
      for (const office of next.branches) {
        for (const item of office.garage) markToMarket(item,next.economy,branchProvince(office));
        for (const item of office.garage) {
          if (item.stage !== 'listed') continue;
          for (const meeting of item.meetings.filter(isActive)) {
            if (!meeting.held && (!meeting.round || meeting.staffHandled) && meeting.status !== 'agreed' && tomorrow - meeting.day >= 3) finishTrade(next,meeting,item,'expired');
          }
          item.meetings = item.meetings.filter(isActive);
          const protectedShop=next.sales.length<6 && next.branches.length===1;
          visits += arrive(item,tomorrow,next.trade.reputation,roadValue(item),next.trade,meeting=>
            !competitiveChoice(rivalMarket,meeting,item,branchProvince(office),next.trade.reputation,
              {protected:protectedShop,stock:office.garage.length,service:office.staff+workers(office).length,
                satisfaction:next.trade.history.filter(row=>row.satisfaction!==null).slice(-10)
                  .reduce((total,row,_,all)=>total+row.satisfaction/all.length,0)||65}));
        }
      }
      automate(next);
      if (!validMoney(next.cash) || !validMoney(next.debt)) throw new Error('Nakit veya borç sınırı aşıldı.');
      return {state:next,completed,returned,delivered,visits,accidents,complaints,
        message:`Gün kapandı · ${completed} tamir tamamlandı · ${returned} kiralık motosiklet döndü · ${delivered} nakliye teslim edildi · ${visits} müşteri geldi.`};
    }
    default:
      throw new Error('Geçersiz işlem.');
  }
  if (!validMoney(next.cash) || !validMoney(next.debt)) throw new Error('Nakit veya borç sınırı aşıldı.');
  return { state: next, message };
}

function automate(state,{daily=true}={}) {
  for (const branch of state.branches) {
    const config = branch.automation;
    const manager = bestStaff(branch,'manager');
    if (!config || daily && branch.lastAutomationDay===state.day) continue;
    if (!Object.keys(AUTO_STEPS).some(step=>stepEnabled(config,step))) continue;
    const time = gameTime(state.day,state.clock?.offset);
    const report = branch.autoReport ??= {history:[],rejections:[],rejectionCounts:{}};
    if (!manager) {
      const warning = 'Görevde müdür yok';
      if (report.noticeWarning!==warning) notify(state,'automation',time,{title:warning,branch:branch.name});
      report.noticeWarning = warning;
      continue;
    }
    const statuses = new Set();
    let performed = false;
    const reserve = config.reserve ?? 0;
    const run = (step,action,bike,worker,arg)=>{
      applyAction(state,action,bike.id,arg,branch.id,worker);
      report.history.unshift({day:state.day,time,step,id:bike.id,name:bike.name,worker:worker.name});
      report.history.length = Math.min(report.history.length,40);
      performed = true;
    };
    const inspector = bestStaff(branch,'inspector');
    const master = bestStaff(branch,'master');
    const advisor = bestStaff(branch,'sales');
    for (const bike of [...branch.garage]) {
      if (bike.autoPaused) continue;
      if (bike.stage==='unchecked' && stepEnabled(config,'inspect')) {
        if (inspector) run('inspect','internal-inspect',bike,inspector);
        else statuses.add('Ekspertiz uzmanı bekleniyor');
      }
      if (bike.stage==='inspected' && bike.faults.length && stepEnabled(config,'repair')) {
        if (!master) statuses.add('Usta bekleniyor');
        else if (state.cash-repairQuote(bike).cost<reserve) statuses.add('Tamir için nakit rezervi korunuyor');
        else run('repair','internal-repair',bike,master);
      }
      if (bike.stage==='ready' && !bike.faults.length && stepEnabled(config,'list')) {
        if (!advisor) statuses.add('Satış danışmanı bekleniyor');
        else run('list','list-strategy',bike,advisor,{strategy:hasDocuments(bike) ? 'documented' : 'repaired',
          price:Math.max(1,Math.round(roadValue(bike)*(1-Math.min(.045,Math.max(0,state.day-(bike.stockDay ?? state.day))*.0015))),Math.ceil(bike.spent+config.minProfit))});
      }
      if (!daily || bike.stage!=='listed' || bike.faults.length || bike.disclosureMode!=='disclose' || isRisky(bike.tradeStrategy)) continue;
      if (!stepEnabled(config,'negotiate') && !stepEnabled(config,'sell')) continue;
      if (!advisor) { statuses.add('Satış danışmanı bekleniyor'); continue; }
      const age = state.day-(bike.listedDay ?? state.day);
      if (bike.managedAsking && stepEnabled(config,'list') && age>=5 && age%5===0 && !bike.meetings.some(meeting=>isActive(meeting) && meeting.held)) {
        const value = roadValue(bike);
        const markdown = Math.min(.10,age*.0035);
        bike.ask = Math.max(1,Math.ceil(bike.spent+config.minProfit),Math.round(value*(1-markdown)));
      }
      const target = bike.spent+config.minProfit;
      const active = bike.meetings.filter(meeting=>isActive(meeting) && !meeting.held && (!meeting.round || meeting.staffHandled));
      const stalled = offer=>offer.price<target && (offer.round>=MAX_ROUNDS || !offer.patience);
      active.sort((a,b)=>Number(stalled(a))-Number(stalled(b)) || b.price-a.price);
      const offer = active[0];
      if (!offer) { statuses.add('Uygun müşteri bekleniyor'); continue; }
      const question = buyerQuestion(offer);
      if (stepEnabled(config,'negotiate') && question) {
        offer.staffHandled = true;
        run('negotiate','answer-buyer',bike,advisor,{meetingId:offer.id,topic:question,
          choice:hasDocuments(bike) ? 'document' : 'disclose'});
      }
      if (stepEnabled(config,'negotiate') && offer.round<MAX_ROUNDS && offer.patience>0 && offer.status==='open'
          && (offer.price<target || staffQuality(advisor)>.68 && !offer.round)) {
        offer.staffHandled = true;
        run('negotiate','negotiate',bike,advisor,offer.id);
      }
      if (stepEnabled(config,'sell') && isActive(offer)) {
        if (bike.damageHistory?.length && question && !offer.dialogue?.disclosed) statuses.add('Hasar geçmişi açıklaması bekleniyor');
        else if (offer.price>=target) run('sell','sell',bike,advisor,offer.id);
        else statuses.add('Asgari satış kârına ulaşılmadı');
      }
    }
    if (daily) branch.lastAutomationDay = state.day;
    if (daily && stepEnabled(config,'buy')) {
      let budget = config.budget;
      const {candidates,rejected} = rankMarket(state.listings,config,item=>purchaseForecast(item,item.price,branchProvince(branch),state.economy),
        inspector && stepEnabled(config,'inspect'),manager);
      let bought = 0;
      const addRejection = (item,reason)=>rejected.push({id:item.id,name:item.name,reason});
      for (const {item,total} of candidates) {
        if (branch.garage.length>=branchCapacity(branch)) addRejection(item,'Garaj kapasitesi dolu');
        else if (total>budget) addRejection(item,'Günlük alım bütçesi');
        else if (total>state.cash-reserve) addRejection(item,'Nakit rezervi');
        else {
          run('buy','buy',item,manager);
          budget -= total;
          bought++;
          const bike = branch.garage.find(entry=>entry.id===item.id);
          if (bike.stage==='unchecked' && stepEnabled(config,'inspect') && inspector) run('inspect','internal-inspect',bike,inspector);
        }
      }
      const counts = {};
      for (const {reason} of rejected) counts[reason] = (counts[reason] ?? 0)+1;
      // Keep rejection totals for the entire market with readable examples per cause.
      const sampled = {};
      report.rejections = rejected.filter(({reason})=>(sampled[reason]=(sampled[reason] ?? 0)+1)<=3);
      report.rejectionCounts = counts;
      if (!bought) statuses.add(branch.garage.length>=branchCapacity(branch) ? 'Garaj kapasitesi dolu'
        : counts['Nakit rezervi'] ? 'Nakit rezervi korunuyor'
        : counts['Günlük alım bütçesi'] ? 'Günlük alım bütçesi yetersiz' : 'Kurallara uyan ilan bulunamadı');
    }
    report.status = [...statuses].join(' · ') || (performed ? 'Otomatik işlem tamamlandı' : 'Uygun iş bekleniyor');
    const warning = [...statuses].filter(status=>status!=='Uygun müşteri bekleniyor').join(' · ');
    if (warning && warning!==report.noticeWarning) notify(state,'automation',time,{title:warning,branch:branch.name});
    report.noticeWarning = warning;
  }
}

function workInternal(state,branch,elapsed,day,time) {
  const results = {completed:0,inspected:0};
  for (const kind of ['internalInspection','internalRepair']) {
    let work = Math.max(0,elapsed*workshopRate(branch,kind));
    while (work>0) {
      const item = firstWorkshopJob(branch,kind);
      if (!item) break;
      const spent = Math.min(work,item.internalJob.remaining);
      item.internalJob.remaining -= spent;
      work -= spent;
      if (item.internalJob.remaining>0) break;
      if (kind==='internalInspection') {
        item.garageInspection = {package:'full',title:'Şirket içi ekspertiz',result:examine(item,'full'),completedDay:day};
        item.stage = item.faults.length ? 'inspected' : 'ready';
        results.inspected++;
      } else {
        item.damageRecords = legacyDamageRecords(item);
        for (const record of item.damageRecords) {
          if (!record.method && record.codes.some(code=>item.faults.includes(code))) {
            const masters = availableStaff(branch).filter(person=>person.role==='master');
            record.method = 'private';
            record.source = 'private';
            record.repairedDay = day;
            record.lossFactor = 1-Math.max(...masters.map(person=>person.quality))*.002;
          }
        }
        completeRepair(item,day);
        item.lastRepair.cost = item.internalJob.cost;
        delete item.openIncident;
        item.stage = 'ready';
        results.completed++;
      }
      notify(state,kind==='internalInspection' ? 'inspection' : 'repair',time,{title:item.name,branch:branch.name});
      delete item.internalJob;
    }
  }
  return results;
}

function deliver(state, time) {
  let count = 0;
  for (const branch of state.branches) for (const bike of branch.garage) {
    if (bike.stage !== 'shipping' || deliveryTime(bike) > time) continue;
    notify(state,'delivery',deliveryTime(bike),{title:bike.name,branch:branch.name});
    bike.stage = bike.shipping.acquiredStage ?? 'unchecked';
    delete bike.shipping;
    count++;
  }
  return count;
}

function workRepairs(state,branch,day,availableMs,time) {
  let completed = 0;
  const queue = branch.garage.filter(bike=>bike.stage === 'repairing')
    .sort((a,b)=>(a.repairOrder ?? 0)-(b.repairOrder ?? 0));
  for (const bike of queue) {
    if (bike.readyDay !== undefined) {
      if (bike.readyDay > day) continue;
    } else {
      const needed = bike.remainingHours*HOUR_MS-(bike.repairProgress ?? 0);
      const worked = Math.min(availableMs,needed);
      availableMs -= worked;
      if (branch.workMs !== undefined) branch.workMs += worked;
      const remaining = needed-worked;
      if (remaining > 0) {
        bike.remainingHours = Math.ceil(remaining/HOUR_MS);
        bike.repairProgress = bike.remainingHours*HOUR_MS-remaining;
        continue;
      }
    }
    const beforeValue = roadValue(bike);
    bike.damageRecords = legacyDamageRecords(bike);
    const method = bike.repairMethod ?? 'private';
    for (const record of bike.damageRecords) {
      if (record.method || !record.codes.some(code=>bike.faults.includes(code))) continue;
      record.method = method;
      record.repairedDay = day;
      record.lossFactor = METHODS[method].loss;
      if (method==='insured' && record.claimed) record.source = 'insured';
      else if (['unknown','unrepaired'].includes(record.source)) record.source = method;
    }
    completeRepair(bike,day);
    bike.lastRepair.beforeValue = beforeValue;
    bike.lastRepair.cost = (bike.repairCost ?? bike.lastRepair.cost)-(bike.repairPayout ?? 0);
    delete bike.repairPayout;
    delete bike.openIncident;
    delete bike.repairMethod;
    bike.stage = 'ready';
    delete bike.repairCost;
    delete bike.repairProgress;
    delete bike.readyDay;
    delete bike.remainingHours;
    delete bike.repairOrder;
    notify(state,'repair',time,{title:bike.name,branch:branch.name});
    completed++;
  }
  return completed;
}

const complaintTime = pending=>pending.due ?? gameTime(pending.day);

// Called under the cross-tab save lock. Work is applied once to the latest persisted anchor.
export function nextRiskEvent(state) {
  let due = Infinity;
  for (const item of state.listings) for (const report of item.inspections ?? []) {
    if (!report.result) due = Math.min(due,report.due);
  }
  for (const branch of state.branches) {
    for (const worker of workers(branch)) due = Math.min(due,worker.travel ?? Infinity,worker.training ?? Infinity);
    const now = gameTime(state.day,state.clock?.offset);
    for (const kind of ['internalInspection','internalRepair']) {
      const rate = workshopRate(branch,kind);
      const job = firstWorkshopJob(branch,kind);
      if (job && rate) due = Math.min(due,now+Math.ceil(job.internalJob.remaining/rate));
    }
  }
  for (const branch of state.branches) for (const bike of branch.garage) {
    due = Math.min(due,bike.claim?.due ?? Infinity,bike.ride?.end ?? Infinity,
      bike.stage==='shipping' ? deliveryTime(bike) : Infinity);
  }
  for (const sale of state.sales) {
    if (sale.complaint) due = Math.min(due,complaintTime(sale.complaint));
  }
  return due;
}

export function synchronize(state, now) {
  if (!state.economy) {
    // A migrated save starts with the visible current market, never fabricated earlier days.
    const economy = observeMarket(createEconomy(state.day),state.listings);
    state = {...state,economy,listings:state.listings.map(item=>markToMarket({...item},economy)),
      branches:state.branches.map(branch=>({...branch,garage:branch.garage.map(item=>
        markToMarket({...item},economy,branchProvince(branch)))}))};
  }
  if (!state.competition) state={...state,competition:createCompetition(state.day,state.economy)};
  if (!state.clock) {
    return {state:{...state,clock:startClock(now)},summary:null};
  }
  const millis = elapsedWall(state.clock,now);
  const capped = !state.clock.paused && now-state.clock.wall > OFFLINE_LIMIT;
  if (!millis) return {state,summary:null};
  const next = JSON.parse(JSON.stringify(state));
  const clock = next.clock;
  clock.wall = Math.max(now,clock.wall);
  const summary = {days:0,completed:0,returned:0,delivered:0,visits:0,inspected:0,approved:0,accidents:0,complaints:0,rides:0,staffEvents:0,income:0,expenses:0,capped};
  let remaining = millis;
  const ledgerLength = next.ledger.length;
  while (remaining > 0) {
    const current = gameTime(next.day,clock.offset);
    const due = nextRiskEvent(next);
    const step = Math.min(remaining,DAY_MS-clock.offset,Math.max(0,due-current));
    remaining -= step;
    clock.offset += step;
    const newlyDelivered = deliver(next,gameTime(next.day,clock.offset));
    summary.delivered += newlyDelivered;
    let workChanged = newlyDelivered>0;
    for (const branch of next.branches) {
      const internal = workInternal(next,branch,step,next.day,current+step);
      summary.completed += internal.completed;
      summary.inspected += internal.inspected;
      workChanged ||= Boolean(internal.completed || internal.inspected);
      const workEnd = current+step;
      for (const worker of workers(branch)) {
        if (worker.travel!==undefined && worker.travel<=workEnd) {
          delete worker.travel;
          summary.staffEvents++;
          workChanged = true;
        }
        if (worker.training!==undefined && worker.training<=workEnd) {
          notify(next,'training',worker.training,{title:worker.name,branch:branch.name});
          delete worker.training;
          summary.staffEvents++;
          workChanged = true;
          worker.experience++;
          worker.skill = Math.min(100,worker.skill+6);
          worker.speed = Math.min(100,worker.speed+4);
          worker.quality = Math.min(100,worker.quality+5);
          worker.motivation = Math.min(100,worker.motivation+3);
        }
      }
      branch.workMs ??= 0;
      const capacity = Math.max(0,repairCapacity(branch)*HOUR_MS-branch.workMs);
      const externalDone = workRepairs(next,branch,next.day,Math.min(step*(1+branch.staff),capacity),current+step);
      summary.completed += externalDone;
      workChanged ||= externalDone>0;
    }
    if (workChanged && clock.offset<DAY_MS) automate(next,{daily:false});
    if (clock.offset === DAY_MS) {
      const result = applyAction(next,'advance',undefined,undefined,1);
      summary.days++;
      for (const key of ['completed','returned','delivered','visits','accidents','complaints']) summary[key] += result[key];
    }
    if (due<=current+step) {
      const events = applyAction(next,'settle-events',undefined,undefined,1);
      for (const key of ['inspected','approved','accidents','rides','complaints']) summary[key] += events[key];
    }
  }
  for (const row of next.ledger.slice(0,next.ledger.length-ledgerLength)) {
    if (row.kind === 'income') summary.income += row.amount;
    if (row.kind === 'expense') summary.expenses += row.amount;
  }
  summary.income = decimal(summary.income);
  summary.expenses = decimal(summary.expenses);
  if (!validMoney(next.cash) || !validMoney(next.debt)) throw new Error('Nakit veya borç sınırı aşıldı.');
  return {state:next,summary};
}

function validBike(bike) {
  return bike && typeof bike.id === 'string' && typeof bike.name === 'string'
    && Number.isSafeInteger(bike.year) && Number.isSafeInteger(bike.km) && bike.km >= 0
    && validAmount(bike.price) && validAmount(bike.value) && bike.value >= 50
    && (bike.condition === undefined || (Number.isInteger(bike.condition) && bike.condition >= 25 && bike.condition <= 100))
    && (bike.serviceFactor === undefined || (Number.isFinite(bike.serviceFactor) && bike.serviceFactor >= 1 && bike.serviceFactor <= 2))
    && (bike.cleanBase === undefined || validAmount(bike.cleanBase))
    && (bike.urgency === undefined || Object.prototype.hasOwnProperty.call(SELLER_URGENCY,bike.urgency))
    && (bike.province === undefined || Boolean(provinceOf(bike.province)))
    && (bike.inspectionBaseline === undefined || validAmount(bike.inspectionBaseline))
    && (bike.inspections === undefined || (Array.isArray(bike.inspections) && bike.inspections.length<=3
      && bike.inspections.every(report=>report && typeof report.id==='string'
        && Object.prototype.hasOwnProperty.call(PACKAGES,report.package) && report.cost===PACKAGES[report.package].cost
        && Number.isSafeInteger(report.due) && report.due>=0
        && (report.result===undefined || (Array.isArray(report.result) && Number.isSafeInteger(report.completedDay)
          && report.result.every(area=>area && Array.isArray(area.codes) && area.codes.every(knownPart)))))))
    && Array.isArray(bike.faults) && bike.faults.every(knownPart)
    && (bike.damageHistory === undefined || (Array.isArray(bike.damageHistory)
      && bike.damageHistory.every(code=>knownPart(code) && PARTS[code].kind !== 'maintenance')));
}

function validGarageBike(bike, day, offset) {
  if (!validBike(bike) || !validMoney(bike.spent)
      || !Number.isInteger(bike.condition) || bike.condition < 25 || bike.condition > 100) return false;
  switch (bike.stage) {
    case 'unchecked': case 'inspected': case 'ready': return true;
    case 'claiming': return Number.isSafeInteger(bike.claim?.due) && bike.claim.due>gameTime(day,offset)
      && validAmount(bike.claim.payout) && bike.claim.payout<=bike.spent && Number.isSafeInteger(bike.claim.hours)
      && bike.claim.hours>0;
    case 'riding': return Number.isSafeInteger(bike.ride?.end) && bike.ride.end>gameTime(day,offset);
    case 'internalInspection': case 'internalRepair':
      return Number.isSafeInteger(bike.internalJob?.remaining) && bike.internalJob.remaining>0
        && Number.isSafeInteger(bike.internalJob.order) && validMoney(bike.internalJob.cost);
    case 'shipping': {
      const quote = shippingQuote(bike.shipping?.origin ?? bike.province,bike.shipping?.destination ?? ISTANBUL);
      return quote.days > 0 && (bike.shipping?.arrivalMs === undefined ||
        (Number.isSafeInteger(bike.shipping.arrivalMs) && bike.shipping.arrivalMs >= gameTime(bike.shipping.arrivalDay)
          && bike.shipping.arrivalMs < gameTime(bike.shipping.arrivalDay+1))) && bike.shipping?.km === quote.km && bike.shipping.fee === quote.fee
        && bike.shipping.days === quote.days && bike.spent >= quote.fee
        && Number.isSafeInteger(bike.shipping.arrivalDay) && (bike.shipping.arrivalMs === undefined ? bike.shipping.arrivalDay>day : bike.shipping.arrivalMs>gameTime(day,offset))
        && bike.shipping.arrivalDay <= day+quote.days;
    }
    case 'repairing':
      return (bike.repairCost === undefined || (validAmount(bike.repairCost) && bike.repairCost <= bike.spent))
        && (bike.repairProgress === undefined || (Number.isSafeInteger(bike.repairProgress)
          && bike.repairProgress >= 0 && bike.repairProgress < HOUR_MS))
        && ((Number.isSafeInteger(bike.readyDay) && bike.readyDay > day)
          || (Number.isSafeInteger(bike.remainingHours) && bike.remainingHours > 0
            && Number.isSafeInteger(bike.repairOrder) && bike.repairOrder > 0));
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
  if (saved?.version !== 9 || !validMoney(saved.cash) || !validMoney(saved.debt)
      || !Number.isSafeInteger(saved.day) || saved.day < 1
      || (saved.clock !== undefined && (!saved.clock || !Number.isSafeInteger(saved.clock.wall) || saved.clock.wall < 0
        || !Number.isSafeInteger(saved.clock.offset) || saved.clock.offset < 0 || saved.clock.offset >= DAY_MS
        || typeof saved.clock.paused !== 'boolean'
        || (saved.clock.revision !== undefined && (!Number.isSafeInteger(saved.clock.revision) || saved.clock.revision < 0))))
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
      || !Array.isArray(saved.financeSnapshots) || !saved.financeSnapshots.every((row,index,all)=>row
        && Number.isSafeInteger(row.day) && row.day > (all[index-1]?.day ?? 0) && row.day < saved.day
        && validMoney(row.cash) && Number.isFinite(row.netWorth))
      || !Array.isArray(saved.branches) || !saved.branches.length
      || (saved.repairOrder !== undefined && (!Number.isSafeInteger(saved.repairOrder) || saved.repairOrder < 0))) return false;
  const ids = [...saved.listings.map(item => item.id)];
  return saved.branches.every((branch,index) => {
    if (!branch || branch.id !== index + 1 || typeof branch.name !== 'string'
        || !Number.isInteger(branch.level) || !GARAGE_LEVELS[branch.level - 1]
        || !Number.isSafeInteger(branch.staff) || branch.staff < 0 || !validMoney(operatingCost(branch))
        || (branch.workMs !== undefined && (!Number.isSafeInteger(branch.workMs) || branch.workMs < 0))
        || (branch.tier!==undefined && (!Number.isInteger(branch.tier) || !BRANCH_TIERS[branch.tier]))
        || (branch.province!==undefined && !provinceOf(branch.province))
        || (branch.automation!==undefined && !validAutomation(branch.automation))
        || (branch.workers!==undefined && (!Array.isArray(branch.workers) || !branch.workers.every(worker=>worker
          && typeof worker.id==='string' && Object.prototype.hasOwnProperty.call(STAFF_ROLES,worker.role)
          && ['experience','skill','motivation','speed','quality'].every(key=>Number.isInteger(worker[key]) && worker[key]>=0)
          && ['travel','training'].every(key=>worker[key]===undefined || Number.isSafeInteger(worker[key]) && worker[key]>=0))))
        || !Array.isArray(branch.garage)) return false;
    const slots = [];
    for (const bike of branch.garage) {
      if (!validGarageBike(bike,saved.day,saved.clock?.offset ?? 0) || ids.includes(bike.id) || !Number.isInteger(bike.slot)
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
      && validMoney(entry.amount) && typeof entry.label === 'string'
      && (entry.category === undefined || Object.prototype.hasOwnProperty.call(FINANCE_CATEGORIES,entry.category))
      && (entry.model == null || typeof entry.model === 'string'));
}

function validMeeting(meeting,kind) {
  return meeting && meeting.kind === kind && typeof meeting.id === 'string'
    && ['open','agreed','rejected','left'].includes(meeting.status)
    && Number.isSafeInteger(meeting.day) && meeting.day >= 1
    && Number.isInteger(meeting.round) && meeting.round >= 0 && meeting.round <= 3
    && Number.isInteger(meeting.patience) && meeting.patience >= 0
    && (meeting.playerOffer === undefined || (kind==='purchase' && validAmount(meeting.playerOffer)))
    && validAmount(meeting.price) && validAmount(meeting.limit) && validAmount(meeting.anchor)
    && typeof meeting.speech === 'string' && typeof meeting.profile?.name === 'string'
    && Number.isInteger(meeting.profile.skill) && meeting.profile.skill >= 1 && meeting.profile.skill <= 5;
}

export function loadGame(storage) {
  const raw = storage.getItem(STORAGE_KEY);
  const keys = [CLOCK_STORAGE_KEY,FINANCE_STORAGE_KEY,TURKEY_STORAGE_KEY,DAMAGE_STORAGE_KEY,MARKET_STORAGE_KEY,
    PREVIOUS_STORAGE_KEY,BUSINESS_STORAGE_KEY,LEGACY_STORAGE_KEY];
  let archived = null;
  let source;
  if (raw === null) for (const key of keys) {
    archived = storage.getItem(key);
    if (archived !== null) {
      source = key;
      break;
    }
  }
  if (raw === null && archived === null) return newGame();
  let state = JSON.parse(raw ?? archived);
  if (source === LEGACY_STORAGE_KEY && state?.version === 1 && Array.isArray(state.garage)) {
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
  if (raw === null && state?.version === 4 && Array.isArray(state.branches) && Array.isArray(state.listings)) {
    state.version = 5;
    for (const bike of [...state.listings,...state.branches.flatMap(branch=>branch.garage)]) {
      bike.damageHistory = historicalIssues(bike);
      // Completed jobs in older versions left their repaired faults in this array.
      if (['ready','listed','rented'].includes(bike.stage)) bike.faults = [];
    }
  }
  if (raw === null && state?.version === 5 && Array.isArray(state.listings) && Number.isSafeInteger(state.day)) {
    state.version = 6;
    for (const listing of state.listings) if (listing) listing.province ??= ISTANBUL;
    // Keep the old day's inventory, including its negotiated offers and purchased gaps.
    // Seed the added provinces so a retry of the migration reconstructs the same market.
    let seed = state.day >>> 0;
    const random = () => {
      seed = (Math.imul(seed,1664525)+1013904223) >>> 0;
      return seed/4294967296;
    };
    const occupied = new Set([...state.listings,...(state.branches ?? []).flatMap(branch=>branch.garage ?? [])]
      .map(bike=>bike?.id));
    state.listings.push(...generateMarket(state.day,random,false).filter(bike=>!occupied.has(bike.id)));
  }
  if (raw === null && state?.version === 6 && Array.isArray(state.ledger)) {
    state.version = 7;
    state.financeSnapshots = [];
    state.ledger = state.ledger.map(entry=>entry && ({...entry,...entryDetails(entry)}));
  }
  if (raw === null && state?.version === 7) state.version = 8;
  if (raw === null && state?.version === 8) state.version = 9;
  if (!validSave(state)) throw new Error('Kayıt biçimi geçersiz.');
  const motorcycles = [...state.listings,...state.branches.flatMap(branch=>branch.garage),
    ...(state.inspectionArchive ?? []).map(entry=>entry.listing),
    ...(state.waitingReturns ?? []).map(entry=>entry.bike),
    ...state.sales.flatMap(sale=>[sale.complaint?.item,sale.openComplaint?.item])];
  for (const bike of motorcycles) {
    if (bike?.name===YUSUF_MODEL && bike.year===2025) bike.year = 2024;
  }
  return state;
}

export function saveGame(storage, state) {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}
