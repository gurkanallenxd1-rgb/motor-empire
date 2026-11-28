import {catalog,paintOptions} from './bikes.mjs?v=0.16.1';
import {askingPrice,cleanValue,historicalIssues,PARTS,repairForecast} from './damage.mjs?v=0.16.1';
import {economyQuote,markToMarket} from './economy.mjs?v=0.16.1';
import {seedRisk} from './risk.mjs?v=0.16.1';
import {ISTANBUL,PROVINCES,marketPressure} from './provinces.mjs?v=0.16.1';

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

