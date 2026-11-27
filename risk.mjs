import { DAY_MS, HOUR_MS } from './clock.mjs?v=0.12.5';
import { PARTS, roadValue, repairQuote, repairPartCost } from './damage.mjs?v=0.12.5';
import { stableNumber } from './trade.mjs?v=0.12.5';

export const SYSTEMS = Object.freeze({
  engine:'Motor', gearbox:'Şanzıman', frame:'Şasi', fork:'Ön maşa',
  electric:'Elektrik', brakes:'Frenler', tires:'Lastikler', body:'Kaporta',
});
const systems = {
  yag:'engine',motor:'engine',radyator:'engine',sanziman:'gearbox',debriyaj:'gearbox',zincir:'gearbox',
  saseIslem:'frame',saseDegisim:'frame',agir:'frame',pert:'frame',masa:'fork',akü:'electric',
  sinyal:'electric',fren:'brakes',lastik:'tires',jant:'tires',grenaj:'body',manet:'body',
  ayna:'body',ayaklik:'body',depo:'body',
};
export const PACKAGES = Object.freeze({
  basic:{label:'Temel',cost:600,hours:2,areas:['electric','brakes','tires','body']},
  detailed:{label:'Detaylı',cost:1350,hours:4,areas:['engine','gearbox','fork','electric','brakes','tires','body']},
  full:{label:'Kapsamlı',cost:2400,hours:6,areas:Object.keys(SYSTEMS)},
});

export const POLICY_TYPES = Object.freeze({
  traffic:{label:'Trafik sigortası',coverage:'Üçüncü kişiye verilen trafik zararı',days:30},
  casco:{label:'Kasko',coverage:'Poliçe dönemindeki kendi araç çarpışma hasarı',days:30},
});
export const METHODS = Object.freeze({
  private:{label:'Özel servis',price:1,time:1,loss:1},
  authorized:{label:'Yetkili servis',price:1.32,time:.80,loss:.80},
  insured:{label:'Kasko kapsamında yetkili servis',price:1.32,time:.80,loss:.80},
});

export const roll = (id,salt)=>(stableNumber(`${salt}|${id}`) % 10000)/10000;
const history = bike=>bike.damageHistory ?? [];
const severe = ['saseIslem','saseDegisim','agir','pert','motor'];

export function seedRisk(bike) {
  // The seller's price and urgency are already set. Reliability has its own seed.
  const trust = roll(bike.id,'seller-reliability');
  const hidden = trust < .23 ? bike.faults.filter((code,index)=>
    roll(bike.id,`withhold:${index}`) < (severe.includes(code) ? .82 : .55)) : [];
  const hiddenGain = hidden.reduce((total,code)=>total+PARTS[code].gain,0);
  bike.disclosure = {trust,hidden,condition:Math.min(100,bike.condition+hiddenGain)};
  if (roll(bike.id,'past-repair')<.085) {
    const options = ['grenaj','depo','masa','saseIslem','motor'].filter(code=>!bike.faults.includes(code));
    const repaired = options[Math.floor(roll(bike.id,'past-repair-type')*options.length)];
    bike.damageHistory = [...history(bike),repaired];
    if (trust < .23 && roll(bike.id,'withhold-repaired') < .6) hidden.push(repaired);
  }
  const codes = history(bike);
  if (codes.length) {
    const month = String(1+Math.floor(roll(bike.id,'accident-month')*12)).padStart(2,'0');
    bike.damageRecords = codes.map((code,index)=>{
      const repaired = !bike.faults.includes(code);
      const source = roll(bike.id,`damage-record:${index}`) < .35 ? 'insured' : 'private';
      return {id:`${bike.id}:prior:${index}`,date:`${bike.year}-${month}-01`,codes:[code],
        amount:repairPartCost(bike,code),estimated:true,source,
        ...(repaired ? {method:source==='insured' ? 'insured' : 'private'} : {})};
    });
  }
  return bike;
}

export function verifiedFindings(bike) {
  return [...new Set((bike.inspections ?? []).flatMap(report=>
    (report.result ?? []).filter(area=>area.checked).flatMap(area=>area.codes)))];
}

export function visibleListing(bike,{beforeInspection=false} = {}) {
  if (!bike.disclosure) return bike;
  const detected = beforeInspection ? [] : verifiedFindings(bike);
  const known = code=>!bike.disclosure.hidden.includes(code) || detected.includes(code);
  const evidence = !beforeInspection && bike.inspections?.some(report=>report.package==='full' && report.result);
  const condition = evidence ? bike.condition : Math.max(25,bike.disclosure.condition
    - detected.filter(code=>bike.disclosure.hidden.includes(code) && bike.faults.includes(code))
      .reduce((sum,code)=>sum+PARTS[code].gain,0));
  return {...bike,disclosure:undefined,condition,faults:bike.faults.filter(known),damageHistory:history(bike).filter(known),
    damageRecords:bike.damageRecords?.map(row=>({...row,codes:row.codes.filter(known)})).filter(row=>row.codes.length)};
}

export function examine(bike,packageId) {
  const codes = [...new Set([...bike.faults,...history(bike)])];
  return Object.keys(SYSTEMS).map(area=>({
    area,checked:PACKAGES[packageId].areas.includes(area),
    codes:PACKAGES[packageId].areas.includes(area) ? codes.filter(code=>systems[code]===area) : [],
  }));
}

export function legacyDamageRecords(bike) {
  if (bike.damageRecords) return bike.damageRecords;
  const codes = new Set([...history(bike),...bike.faults.filter(code=>PARTS[code].kind!=='maintenance')]);
  return [...codes].map(code=>({id:`${bike.id}:old:${code}`,codes:[code],amount:null,source:'unknown',
    ...(!bike.faults.includes(code) ? {method:'unknown'} : {})}));
}

export function policyQuote(bike,type) {
  const policy = POLICY_TYPES[type];
  if (!policy) return null;
  const value = roadValue(bike);
  const risk = Math.min(.8,history(bike).length*.075+bike.km/180000+(100-bike.condition)*.003);
  const premium = type==='traffic' ? Math.round((220 + value*.0025)*(1+risk))
    : Math.round((420+value*.008)*(1+risk));
  return {premium,days:policy.days,deductible:type==='casco' ? Math.max(500,Math.round(value*.025)) : 0,
    limit:type==='casco' ? value : 15000};
}

export const activePolicy = (bike,type,at)=>bike.policies?.find(policy=>
  policy.type===type && policy.start<=at && at<policy.end);

export function serviceQuote(bike,method) {
  const plan = METHODS[method];
  if (!plan) return null;
  const base = repairQuote(bike);
  const cost = Math.round(base.cost*plan.price);
  const incident = bike.damageRecords?.find(row=>row.id===bike.openIncident);
  const coveredCost = incident?.codes.filter(code=>bike.faults.includes(code))
    .reduce((sum,code)=>sum+repairPartCost(bike,code),0) ?? 0;
  const eligible = incident?.casco && !incident.claimed && coveredCost>0;
  const payout = method==='insured' && eligible
    ? Math.max(0,Math.min(incident.casco.limit,Math.round(coveredCost*plan.price)-incident.casco.deductible)) : 0;
  return {cost,hours:Math.ceil(base.hours*plan.time),payout,eligible:payout>0,approval:method==='insured' ? 4*HOUR_MS : 0};
}

export function accidentAt(bike,day,time,activity) {
  const key = `${bike.id}:${day}:${activity}`;
  const chance = activity==='rental' ? .028 : .012;
  if (roll(key,'road-collision') >= chance + (100-bike.condition)*.0003) return null;
  const severity = roll(key,'road-severity');
  const codes = severity < .035 ? ['pert','saseDegisim','motor']
    : severity < .19 ? ['masa','jant','grenaj'] : ['grenaj',roll(key,'road-side')<.5?'ayna':'manet'];
  const casco = activePolicy(bike,'casco',time);
  const traffic = activePolicy(bike,'traffic',time);
  const thirdParty = Math.round((severity<.19 ? 8000 : 1600)*(1+roll(key,'third-party')));
  return {id:`${key}:collision`,day,time,codes,amount:codes.reduce((sum,code)=>sum+repairPartCost(bike,code),0),
    source:'unrepaired',thirdParty,
    trafficPayout:traffic ? Math.min(traffic.limit,thirdParty) : 0,
    ...(casco ? {casco:{id:casco.id,limit:casco.limit,deductible:casco.deductible}} : {})};
}

export function buyerComplaint(bike,saleId) {
  if (bike.disclosureMode!=='conceal' || !history(bike).length) return null;
  const serious = history(bike).some(code=>severe.includes(code));
  const draw = roll(saleId,'customer-complaint');
  return draw < (serious ? .75 : .30) ? {returnBike:draw < (serious ? .42 : .08),delay:1+Math.floor(draw*3)} : null;
}

export const policyEnd = (start,days)=>start+days*DAY_MS;
