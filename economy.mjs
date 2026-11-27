import { catalog, modelOf, specsFor } from './bikes.mjs?v=0.16';
import { ISTANBUL, PROVINCES } from './provinces.mjs?v=0.16';

const clamp = (n,min,max)=>Math.max(min,Math.min(max,n));
const rounded = n=>Math.round(n*10000)/10000;
const models = catalog.filter(model=>!model.eventOnly);
export const ECONOMY_MODELS = models;
const numberByModel = new Map(models.map((model,index)=>[model.id,index]));
const seasons = ['İlkbahar','Yaz','Sonbahar','Kış'];
const cycles = [
  ['Büyüme',.030,.016,.030,.025],
  ['Denge',.045,.034,.044,.012],
  ['Durgunluk',.077,.082,.059,-.038],
  ['Kriz',.113,.143,.113,-.094],
  ['Toparlanma',.071,.088,.082,.009],
];
const sensitivity = {commuter:.39,scooter:.62,naked:.88,sport:1.13,adventure:1.02,touring:1.05,cruiser:.90};
// Population bands in thousands, rounded for gameplay. Purchasing power is a simulation weight.
const population = [
  2280,610,750,500,340,5860,2720,170,1160,1270,230,280,360,330,280,3220,570,200,530,1060,1820,420,600,240,
  750,920,2160,460,140,290,1540,450,1950,15700,4490,280,390,1460,380,240,2100,2320,570,750,1480,1120,890,1070,
  390,320,380,770,350,1100,1380,350,230,650,1170,610,820,900,2230,380,1130,420,590,440,85,260,280,650,570,
  200,95,210,310,250,155,560,410,
];
const higherPower = new Set([6,7,16,26,34,35,41,42,48,59,77]);
const lowerPower = new Set([2,4,12,13,21,24,25,30,36,47,49,56,62,63,65,69,72,73,75,76,79]);
export function provinceEconomy(id) {
  const people = population[(id ?? ISTANBUL)-1] ?? population[ISTANBUL-1];
  const income = higherPower.has(id) ? 1.105 : lowerPower.has(id) ? .91 : 1;
  return {people, purchasingPower:income, activity:clamp(.82+Math.log1p(people/380)*.15,.85,1.34)};
}

export function macroFor(day) {
  const t = day-1;
  const index = Math.floor(t/73)%cycles.length;
  const next = cycles[(index+1)%cycles.length];
  const [regime,...values] = cycles[index];
  const phase = (t%73)/73;
  const blend = phase*phase*(3-2*phase);
  const [inflation,exchange,newPrice,growth] = values.map((value,i)=>value+(next[i+1]-value)*blend);
  const seasonal = Math.sin(2*Math.PI*(t-34)/365);
  return {regime,season:seasons[Math.min(3,Math.floor((t%365)/91.25))],
    cycle:rounded(seasonal),inflation:rounded(inflation),exchange:rounded(1+exchange),
    newPrice:rounded(1+newPrice),growth:rounded(growth),
    parts:rounded(clamp(1+inflation*.56+exchange*.66,.94,1.22)),};
}

export function createEconomy(day) {
  const macro = macroFor(day);
  return {day,macro,supply:[],history:[],lastNews:day,newsMacro:macro,partsNews:macro.parts};
}

function feedback(state,day) {
  const recent = {};
  for (const sale of state.sales.slice(0,250)) {
    const age = day-sale.day;
    if (age<1 || age>35 || sale.returnedDay!==undefined) continue;
    const model = modelOf(sale);
    if (!model || model.eventOnly) continue;
    const score = (1-age/36)*(sale.daysListed===undefined ? .5 : clamp(1.45-sale.daysListed*.085,.4,1.3));
    recent[model.id] = rounded(clamp((recent[model.id] ?? 0)+score,0,4));
  }
  return recent;
}

export function nextEconomy(state,day) {
  const prior = state.economy ?? createEconomy(state.day);
  if (prior.day>=day) return prior;
  return {...prior,day,macro:macroFor(day),pricingSupply:prior.supply,pricingLocalSupply:prior.localSupply ?? {},feedback:feedback(state,day)};
}

export function economyQuote(market,model,year,province) {
  if (!market || !model || model.eventOnly) return null;
  const {macro,day} = market;
  const {activity,purchasingPower} = provinceEconomy(province ?? ISTANBUL);
  const index = numberByModel.get(model.id);
  const supply = (market.pricingSupply ?? market.supply)[index] ?? 5;
  const local = province===undefined ? 0 : (market.pricingLocalSupply ?? market.localSupply)?.[index*81+province-1] ?? 0;
  const localCrowding = clamp(local/(province===ISTANBUL ? 3 : 2),0,1);
  const crowding = clamp((supply-5)/16,-.28,.32);
  const age = Math.max(0,model.lastYear-year);
  const displacement = specsFor({name:model.name,year})?.cc ?? model.cc;
  const brandPhase = [...model.brand].reduce((sum,letter)=>sum+letter.charCodeAt(0),0);
  const popularity = Math.sin(day*.038+brandPhase*.16+displacement*.032)*.042+(market.feedback?.[model.id] ?? 0)*.018;
  const season = macro.cycle*(sensitivity[model.category] ?? .8)*.34;
  const capacity = Math.min(1,displacement/1100);
  const localDemand = (activity-1)*.30+(purchasingPower-1)*(.35+capacity*.55);
  const demand = clamp(1+season+popularity+localDemand+macro.growth*1.9-crowding*.35-age*.011,.47,1.55);
  const region = clamp((purchasingPower-1)*.44+(activity-1)*.09+(province ? Math.sin(province*1.95+day*.031)*.012 : 0),-.065,.065);
  const national = 1+macro.inflation*.52+(macro.newPrice-1)*.42+(macro.exchange-1)*(.10+.12*capacity)
    +(demand-1)*.11-crowding*.067-localCrowding*.010-age*.0015-region*.18;
  const value = rounded(clamp(national+region,.81,1.28));
  const budget = rounded(clamp(1+macro.inflation*.33+macro.growth*1.8+(purchasingPower-1)*.45,.78,1.17));
  const days = Math.round(clamp((6+capacity*5.5)/demand+supply*.16,4,24));
  const risk = rounded(clamp(.22+(1-demand)*.35+crowding*.25+capacity*.18+age*.008-macro.growth,.05,.82));
  const realization = rounded(clamp(.887+(demand-1)*.11-risk*.046,.80,.96));
  return {value,parts:macro.parts,budget,demand:rounded(demand),days,risk,realization};
}

export function marketRandom(day) {
  let seed = Math.imul(day,2654435761);
  return ()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
}

export function markToMarket(bike,market,province=bike.province) {
  if (!Number.isFinite(bike.cleanBase) || (!bike.marketTerms && !/^\d+-\d+-\d+$/.test(bike.id))) return bike;
  const quote = economyQuote(market,modelOf(bike),bike.year,province);
  if (quote) bike.marketTerms = quote;
  return bike;
}

export function observeMarket(market,listings) {
  if (market.history.at(-1)?.day===market.day) return market;
  const counts = Array(models.length).fill(0);
  const sums = Array(models.length).fill(0);
  const localSupply = {};
  for (const bike of listings) {
    const index = numberByModel.get(modelOf(bike)?.id);
    if (index===undefined || !Number.isFinite(bike.price)) continue;
    counts[index]++;
    sums[index] += bike.price;
    const local = index*81+(bike.province ?? ISTANBUL)-1;
    localSupply[local] = (localSupply[local] ?? 0)+1;
  }
  const samples = counts.map((count,i)=>count ? Math.round(sums[i]/count) : null);
  const index = models.map(model=>Math.round(economyQuote(market,model,model.lastYear).value*1000));
  return {...market,localSupply,supply:counts.map((count,i)=>rounded(market.supply[i]===undefined ? 5+(count-5)*.27 : market.supply[i]*.74+count*.26)),
    history:[...market.history.slice(-89),{day:market.day,samples,counts,index}]};
}

export function marketSeries(market,id,period) {
  const index = numberByModel.get(id);
  return (market?.history ?? []).filter(row=>row.day>market.day-period)
    .map(row=>({day:row.day,price:row.samples[index],count:row.counts[index]})).filter(row=>row.count);
}

export function marketMovers(market,period=7) {
  const latest = market?.history.at(-1);
  const earliest = market?.history.find(row=>row.day>=market.day-period);
  if (!latest || latest.day===earliest?.day) return [];
  return models.map((model,i)=>({name:model.name,change:latest.index[i]/earliest.index[i]-1}))
    .sort((a,b)=>b.change-a.change);
}

export function marketNews(previous,market) {
  if (!previous || market.day-previous.lastNews<7) return null;
  const {macro} = market;
  const old = previous.newsMacro ?? previous.macro;
  if (macro.regime!==old.regime) return {title:`${macro.regime} dönemi · Ekonomi bülteni`,detail:'Müşteri bütçeleri, kur ve ikinci el fiyatları yeni ekonomik döneme uyum sağlıyor.'};
  if (macro.season!==old.season) return {title:`${macro.season} sezonu başladı`,detail:'Mevsim değişimi motosiklet kategorilerinin talebini farklı oranlarda etkiliyor.'};
  if (Math.abs(macro.parts-previous.partsNews)>=.043) {
    const up = macro.parts>previous.partsNews;
    return {title:`Yedek parça maliyetleri ${up?'yükseldi':'geriledi'}`,detail:'Yeni servis teklifleri güncel parça endeksini kullanıyor.'};
  }
  const model = marketMovers(market,14).find(row=>row.change>.045);
  if (model && model.name!==previous.lastModelNews && market.day-previous.lastNews>=18)
    return {title:`${model.name} piyasa değeri yükseldi`,detail:'Son iki haftanın model endeksi artış gösterdi.',model:model.name};
  return null;
}

export function regionalEstimates(market,model,year) {
  return PROVINCES.map(province=>{
    const terms = economyQuote(market,model,year,province.id);
    const base = model.value*(1+(year-model.lastYear)*.009);
    return {...province,...provinceEconomy(province.id),...terms,price:Math.round(base*(terms?.value ?? 1))};
  }).sort((a,b)=>a.price-b.price);
}
