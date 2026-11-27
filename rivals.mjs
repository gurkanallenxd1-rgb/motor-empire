import { BRANCH_TIERS,STAFF_ROLES } from './business.mjs?v=0.16.1';
import { ECONOMY_MODELS,economyQuote } from './economy.mjs?v=0.16.1';
import { paintOptions } from './bikes.mjs?v=0.16.1';
import { PROVINCES,shippingQuote } from './provinces.mjs?v=0.16.1';
import { stableNumber } from './characters.mjs?v=0.16.1';

export const STRATEGIES=Object.freeze({
  volume:'Düşük fiyat / yüksek hacim',premium:'Premium satış',scooter:'Scooter ve düşük hacim',
  sport:'Spor motosiklet',repair:'Hasarlı stok onarımı',rental:'Kiralama',safe:'Düşük risk',
  growth:'Agresif büyüme',margin:'Yüksek marj',regional:'Bölgesel odak',
});
export const SIZES=['Küçük','Orta','Büyük','Premium','Ulusal'];
export const RIVAL_ROLES=['sales','technician','inspector','manager','master'];
const strategies=Object.keys(STRATEGIES);
const prefixes=['Kıvıltaş','Akçayel','Doruyel','Kuzova','Gezyurt','Aydoruk','Sarpiz','Turnakay','Morçınar','Ulukor'];
const suffixes=['Viraj','Kavşak','Rota','Yamaç','Hat','Seri','İvme','Sürüş','Pist','Ufuk'];
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
function random(...keys) {
  let seed=stableNumber(keys.join(':'));
  seed=Math.imul(seed^(seed>>>16),0x7feb352d);
  seed=Math.imul(seed^(seed>>>15),0x846ca68b);
  return ((seed^(seed>>>16))>>>0)/4294967296;
}
const models=new Map(ECONOMY_MODELS.map(model=>[model.id,model]));
const segments={
  volume:'commuter',premium:'premium',scooter:'scooter',sport:'sport',repair:'naked',rental:'scooter',
  safe:'commuter',growth:'adventure',margin:'touring',regional:'naked',
};
const matches=(segment,model)=>segment==='premium' ? model.cc>=650 : segment===model.category;
const pool=new Map(Object.values(segments).map(segment=>[segment,ECONOMY_MODELS.filter(model=>matches(segment,model))]));
const money=amount=>Math.round(amount);
const bounded=(array,row,max)=>{array.push(row);if(array.length>max)array.splice(0,array.length-max);};

export function rivalValue(company) {
  return company.cash-company.debt+company.stock.reduce((sum,bike)=>sum+bike.value,0)
    +company.branches.reduce((sum,branch)=>sum+BRANCH_TIERS[branch.tier].cost,0);
}

function companyFor(number,day) {
  const strategy=strategies[(number-1)%strategies.length];
  const tier=number%25===0?4:number%11===0?3:number%6===0?2:number%3===0?1:0;
  const province=PROVINCES[((number-1)*23)%81].id;
  const capital=[370000,650000,1050000,1800000,2800000][tier];
  const leveraged=number%19===0;
  const cash=leveraged?Math.round(capital*.32):capital;
  const debt=leveraged?money(BRANCH_TIERS[tier].cost*.84):0;
  return {id:number,name:`${prefixes[(number-1)%10]} ${suffixes[Math.floor((number-1)/10)%10]}${number>100?' '+number:''} Moto`,
    founded:day,province,strategy,segment:segments[strategy],risk:strategy==='growth'?85:strategy==='safe'?15:30+number%40,
    growth:22+number%68,cash,debt,openingCash:cash,cashIn:0,cashOut:0,
    branches:[{id:1,province,tier,staff:Math.min(4,tier+1)}],stock:[],reputation:43+number%22,
    satisfaction:55+number%24,history:[],regional:[],events:[],status:number%17===0?'listed':'active',stress:0,
    nextBranch:2,nextBike:1,totalSold:0,turnover:0,profit:0,marketShare:0,bookValue:cash+BRANCH_TIERS[tier].cost-debt,
  };
}

export function createCompetition(day,market) {
  const companies=Array.from({length:50},(_,i)=>companyFor(i+1,day));
  if(market)for(const company of companies) {
    company.daily={day,revenue:0,profit:0,sold:0};
    buy(company,company.branches[0],day,market);
    company.bookValue=rivalValue(company);
  }
  return {day,nextCompany:51,companies,
    news:[],retired:[],founded:50,bankrupt:0,acquired:0,sold:0,turnover:0,priceIndex:[],customerNotes:[]};
}

function post(company,kind,amount,bike) {
  if (!amount) return;
  const incoming=['sale','rent','loan','liquidation'].includes(kind);
  if (incoming) {company.cash+=amount;company.cashIn+=amount;}
  else {company.cash-=amount;company.cashOut+=amount;}
  if (company.cash<0) throw new Error('Rakip kasa dengesi bozuldu.');
  if (kind==='sale' || kind==='rent') {company.daily.revenue+=amount;company.turnover+=amount;}
  if (kind==='sale') {company.daily.sold++;company.totalSold++;company.daily.profit+=amount-bike.cost;}
  if (kind==='rent') company.daily.profit+=amount;
  if (['wages','overhead','interest'].includes(kind)) company.daily.profit-=amount;
  if (kind==='liquidation') company.daily.profit+=amount-(bike?.cost??amount);
  if (!['wages','overhead'].includes(kind)) {
    bounded(company.events,[company.daily.day,kind,bike?.model??null,amount],12);
  }
}

function event(world,company,type,text) {
  bounded(world.news,{day:world.day,id:company.id,type,text},45);
}

function buy(company,branch,day,market) {
  const source=pool.get(company.segment);
  let candidates=source;
  if(random(company.id,day,'assortment')<.19)candidates=ECONOMY_MODELS;
  const model=candidates[Math.floor(random(company.id,day,'model')*candidates.length)];
  const year=Math.max(model.firstYear,model.lastYear-Math.floor(random(company.id,day,'year')*6));
  const purchaseCity=company.strategy==='regional' || random(company.id,day,'route')<.70 ? branch.province
    : PROVINCES[Math.floor(random(company.id,day,'province')*81)].id;
  const terms=economyQuote(market,model,year,purchaseCity);
  const quote=shippingQuote(purchaseCity,branch.province);
  const condition=company.strategy==='repair'?59+Math.floor(random(company.id,day,'state')*28)
    : 76+Math.floor(random(company.id,day,'state')*24);
  const km=1500+(model.lastYear-year)*3700+Math.floor(random(company.id,day,'km')*12000);
  const reference=money(model.value*terms.value*(1-(model.lastYear-year)*.033)*Math.max(.8,1-km/200000));
  const wholesale=company.strategy==='repair'?.71:company.strategy==='volume'?.73:.78;
  const cost=money(reference*(wholesale+random(company.id,day,'price')*.20)*(.68+condition*.0032));
  const repair=condition<88 ? money(reference*(88-condition)*.0025*terms.parts):0;
  const inspection=450;
  const reserve=12000+company.branches.length*5000;
  if (company.cash-cost-quote.fee-repair-inspection<reserve || company.stock.length>=35) return;
  const bike={id:`rival-${company.id}-${company.nextBike++}`,model:model.id,year,km,condition,
    branch:branch.id,origin:purchaseCity,cost:cost+quote.fee,reference:money(reference/terms.value),value:money(reference*(.64+condition*.0036)),
    repair,inspection,bought:day,state:'transit',due:day+Math.max(1,quote.days),ask:0,rented:0};
  post(company,'purchase',cost,bike);
  post(company,'shipping',quote.fee,bike);
  company.stock.push(bike);
}

function quoteFor(company,bike,market,province,day,peers) {
  const model=models.get(bike.model);
  const terms=economyQuote(market,model,bike.year,province);
  bike.value=money(bike.reference*terms.value*(.65+bike.condition*.0035)*Math.max(.82,1-bike.rented*.006));
  const age=day-bike.bought;
  const margin=company.strategy==='volume'?.065:company.strategy==='margin'?.19:.12;
  const target=bike.cost*(1+margin);
  const pressure=(company.reputation-50)*.0015+(terms.demand-1)*.16
    +clamp((peers.get(bike.model)??1)-1,-.18,.18)*.13-Math.min(.19,age*.0035);
  const ask=company.stress>=5 ? bike.value*.76
    : clamp(bike.value*(.95+pressure)*.78+target*.22,bike.value*.74,bike.value*1.13);
  bike.ask=money(ask);
  return terms;
}

function localTotals(company,province) {
  return (company.localDay[province]??=[company.daily.day,Number(province),0,0,0]);
}

function tradeStock(world,company,market,peers) {
  const day=world.day;
  company.stock=company.stock.filter(bike=>{
    const branch=company.branches.find(item=>item.id===bike.branch);
    if (bike.state==='transit' && day>=bike.due) {
      if (company.cash<bike.inspection) return true;
      post(company,'inspection',bike.inspection,bike);
      bike.cost+=bike.inspection;bike.state='inspected';bike.due=day+1;
    } else if (bike.state==='inspected' && day>=bike.due) {
      if (company.cash<bike.repair) return true;
      post(company,'repair',bike.repair,bike);
      bike.cost+=bike.repair;
      if (bike.repair) bike.condition=Math.min(100,bike.condition+Math.round((100-bike.condition)*.75));
      bike.state='ready';bike.due=day+1;
    }
    if (bike.state!=='ready' || day<bike.due) return true;
    const terms=quoteFor(company,bike,market,branch.province,day,peers);
    if (company.strategy==='rental' && bike.rented<6 && company.stress<5
      && random(bike.id,day,'rent')<.55) {
      const rent=money(bike.value*.006);
      post(company,'rent',rent,bike);
      const local=localTotals(company,branch.province);local[2]+=rent;local[3]+=rent;
      bike.rented++;
      bike.km+=85;bike.condition=Math.max(60,bike.condition-1);
      return true;
    }
    const probability=clamp((1.1+(company.stress>=5?.8:0))/terms.days
      *clamp(1+(bike.value/bike.ask-1)*2,.45,1.65),.04,.46);
    if (random(bike.id,day,'retail')>=probability) return true;
    post(company,'sale',bike.ask,bike);
    const local=localTotals(company,branch.province);
    local[2]+=bike.ask;local[3]+=bike.ask-bike.cost;local[4]++;
    world.sold++;world.turnover+=bike.ask;
    company.satisfaction=clamp(company.satisfaction+(bike.condition>=83?1:-1),25,96);
    company.reputation=clamp(company.reputation+(company.totalSold%6===0?1:0),20,93);
    return false;
  });
}

function settle(world,company) {
  const overhead=company.branches.length*250;
  const wages=company.branches.reduce((sum,branch)=>sum+RIVAL_ROLES.slice(0,branch.staff)
    .reduce((total,role)=>total+STAFF_ROLES[role].wage,0),0);
  for(const branch of company.branches) {
    const local=localTotals(company,branch.province);
    local[3]-=250+RIVAL_ROLES.slice(0,branch.staff).reduce((total,role)=>total+STAFF_ROLES[role].wage,0);
  }
  const interest=money(company.debt*(company.restructured?.00018:.00045));
  const required=overhead+wages+interest;
  const creditLimit=money(company.branches.reduce((sum,b)=>sum+BRANCH_TIERS[b.tier].cost,0)*(.29+company.risk*.002));
  const draw=clamp(required-company.cash,0,Math.max(0,creditLimit-company.debt));
  if(draw){post(company,'loan',draw);company.debt+=draw;}
  const cost=Math.min(company.cash,overhead);post(company,'overhead',cost);
  const paid=Math.min(company.cash,wages);post(company,'wages',paid);
  const paidInterest=Math.min(company.cash,interest);post(company,'interest',paidInterest);
  const arrears=required-cost-paid-paidInterest;
  company.debt+=arrears;company.daily.profit-=arrears;
  const payment=Math.min(company.debt,Math.max(0,Math.floor((company.cash-55000)*.10)));
  if(payment){post(company,'principal',payment);company.debt-=payment;}
  company.stress=company.cash<required*8 ? company.stress+1:Math.max(0,company.stress-2);
  if(company.stress===5) for(const branch of company.branches) branch.staff=Math.max(0,branch.staff-1);
  if(company.stress>=9 && !company.restructured && company.debt>0) {
    company.restructured=true;
    event(world,company,'debt',`${company.name} borçlarını yeniden yapılandırdı.`);
  }
  if(company.stress>=12 && company.branches.length>1) {
    const closed=company.branches.slice(1).find(branch=>!company.stock.some(bike=>bike.branch===branch.id));
    if (closed) {
      company.branches=company.branches.filter(branch=>branch!==closed);
      const base=BRANCH_TIERS[closed.tier].cost;
      post(company,'liquidation',money(base*.63),{cost:base});
      event(world,company,'closure',`${company.name} bir şubesini kapattı.`);
    }
  }
  if(company.stress>=14 && company.status==='active') {
    company.status='listed';
    event(world,company,'listing',`${company.name} devralma tekliflerine açıldı.`);
  }
  if(company.stress>=30 && company.debt>0 && company.cash<required*2
     && company.debt>Math.max(24000,company.stock.reduce((sum,bike)=>sum+bike.value*.64,0))) {
    for (const bike of company.stock) post(company,'liquidation',money(bike.value*.60),bike);
    for (const branch of company.branches) {
      const base=BRANCH_TIERS[branch.tier].cost;
      post(company,'liquidation',money(base*.58),{cost:base});
    }
    company.stock=[];company.branches=[];
    const settlement=Math.min(company.cash,company.debt);
    post(company,'principal',settlement);company.debt-=settlement;
    company.status='bankrupt';world.bankrupt++;
    event(world,company,'bankrupt',`${company.name} iflas etti. Varlıklar tasfiye edildi.`);
  }
}

function expand(world,company) {
  if(company.stress || company.status!=='active' || company.debt || world.day%30!==company.id%30) return;
  if(random(company.id,world.day,'expansion')>(company.growth+(company.strategy==='growth'?28:0))/155) return;
  const branch=company.branches[0];
  const cost=BRANCH_TIERS[branch.tier].cost;
  const upgrade=BRANCH_TIERS[branch.tier+1];
  if(upgrade && company.cash>upgrade.cost-cost+650000 && company.stock.length>=BRANCH_TIERS[branch.tier].capacity*.55) {
    post(company,'upgrade',upgrade.cost-cost);
    branch.tier++;
    event(world,company,'upgrade',`${company.name} merkez garajına yatırım yaptı.`);
  } else if(company.branches.length<4 && company.cash>1100000) {
    const province=PROVINCES[Math.floor(random(company.id,world.day,'expansion-city')*81)].id;
    if(company.branches.some(item=>item.province===province))return;
    post(company,'branch',BRANCH_TIERS[0].cost);
    company.branches.push({id:company.nextBranch++,province,tier:0,staff:1});
    event(world,company,'branch',`${company.name} ${PROVINCES[province-1].name} şubesini açtı.`);
  }
}

export function advanceCompetition(world,day,market,playerSales=[]) {
  if(day<=world.day)return false;
  world.day=day;
  const sums=new Map();
  for(const c of world.companies)for(const bike of c.stock)if(bike.ask>0 && bike.value>0){
    const pair=sums.get(bike.model)??[0,0];pair[0]+=bike.ask/bike.value;pair[1]++;
    sums.set(bike.model,pair);
  }
  const peers=new Map([...sums].map(([id,[sum,count]])=>[id,sum/count]));
  for(const company of world.companies){
    company.daily={day,revenue:0,profit:0,sold:0};
    company.localDay={};
    tradeStock(world,company,market,peers);
    settle(world,company);
    if(company.status!=='bankrupt') {
      expand(world,company);
      if(company.stress<8) {
        const branch=company.branches[(day+company.id)%company.branches.length];
        const capacity=BRANCH_TIERS[branch.tier].capacity;
        const stock=company.stock.reduce((n,bike)=>n+Number(bike.branch===branch.id),0);
        const probability=company.strategy==='volume'?.86:company.strategy==='safe'?.54:.73;
        if(stock<Math.min(16,capacity) && random(company.id,day,'buy')<probability)buy(company,branch,day,market);
      }
    }
    company.bookValue=rivalValue(company);
    company.profit+=company.daily.profit;
    const geography=company.regional??=[];
    const cutoff=day-29;
    company.regional=geography.filter(row=>row[0]>=cutoff).concat(Object.values(company.localDay));
    delete company.localDay;
    bounded(company.history,[day,company.daily.revenue,company.daily.profit,company.daily.sold,company.bookValue],365);
  }
  for(const company of world.companies.filter(c=>c.status==='bankrupt')){
    bounded(world.retired,{id:company.id,name:company.name,day,status:'bankrupt',cash:company.cash,debt:company.debt,
      openingCash:company.openingCash,cashIn:company.cashIn,cashOut:company.cashOut,
      sales:company.totalSold,profit:company.profit,recentSales:company.history.slice(-30).reduce((n,row)=>n+row[3],0),turnover:company.turnover},80);
  }
  world.companies=world.companies.filter(c=>c.status!=='bankrupt');
  if(day%14===0 && world.companies.length<Math.min(64,51+Math.floor(day/80))){
    const c=companyFor(world.nextCompany++,day);
    world.companies.push(c);world.founded++;
    event(world,c,'entry',`${c.name} Türkiye motosiklet pazarına girdi.`);
  }
  const count=c=>c.history.slice(-30).reduce((sum,row)=>sum+row[3],0);
  const retired=world.retired.reduce((sum,row)=>sum+(row.day>=day-29?(row.recentSales??0):0),0);
  const player=playerSales.filter(row=>row.day>=day-29 && !row.returnedDay).length;
  const total=world.companies.reduce((sum,c)=>sum+count(c),player+retired);
  for(const c of world.companies)c.marketShare=total ? count(c)/total:0;
  world.playerShare=total ? player/total:0;
  if(day%7===0){
    const entries=[...peers.values()];
    if(entries.length){
      const index=entries.reduce((a,b)=>a+b,0)/entries.length;
      const previous=world.priceIndex.at(-1)?.[1];
      bounded(world.priceIndex,[day,index],52);
      if(previous!==undefined && previous-index>=.035)event(world,{id:null},'pressure','Rakip ilanlarında fiyat rekabeti arttı.');
    }
  }
  return true;
}

export function rivalOffer(company,amount) {
  const assets=company.branches.reduce((total,b)=>total+BRANCH_TIERS[b.tier].cost,0);
  const stock=company.stock.reduce((total,b)=>total+b.value,0);
  const net=company.cash+assets+stock-company.debt;
  const profit=company.history.slice(-30).reduce((sum,row)=>sum+row[2],0);
  const goodwill=Math.max(0,profit)*(1+company.growth/110)+(company.reputation-45)*2300;
  const threshold=Math.max(10000,money(net*(company.stress>=14?.80:1.04)+goodwill+
    (company.strategy==='growth' && company.stress<14?Math.max(0,net*.075):0)));
  const price=amount??threshold;
  const fees=money(price*.025);
  return {assets,stock,net,profit,threshold,price,fees,total:price+fees,eligible:company.status==='listed',
    accepted:company.status==='listed'&&price>=threshold,
    roi:price+fees-company.cash+company.debt>0?profit/(price+fees-company.cash+company.debt):null};
}

export function removeAcquired(world,company) {
  bounded(world.retired,{id:company.id,name:company.name,day:world.day,status:'acquired',sales:company.totalSold,
    recentSales:company.history.slice(-30).reduce((total,row)=>total+row[3],0),profit:company.profit},80);
  world.companies=world.companies.filter(c=>c!==company);world.acquired++;
  event(world,company,'acquired',`${company.name} oyuncu tarafından devralındı.`);
}

export function inheritedStock(item,day,province,allocated,slot) {
  const model=models.get(item.model);
  const paint=paintOptions(model,item.year)[0];
  const route=shippingQuote(item.origin??province,province);
  const shipping=item.state==='transit' && route.days && item.due>day
    ? {...route,origin:item.origin,destination:province,arrivalDay:item.due,acquiredStage:'unchecked'}:undefined;
  return {id:item.id,name:model.name,year:item.year,km:item.km,condition:item.condition,province,slot,
    price:Math.max(1,allocated),spent:Math.max(allocated,shipping?.fee??0),value:item.reference,
    stage:shipping?'shipping':item.state==='ready'?'ready':item.state==='inspected'?'inspected':'unchecked',
    ...(shipping?{shipping}:{}),faults:item.state==='ready' || !item.repair?[]:['lastik'],
    color:paint?.hex,colorName:paint?.name,paintAccent:paint?.accent,paintAccentName:paint?.accentName};
}

export function competitiveChoice(world,meeting,bike,province,reputation,options={}) {
  if(options.protected || meeting.returning || !world || random(meeting.id,'alternatives')>.30)return null;
  const model=ECONOMY_MODELS.find(item=>item.name===bike.name);
  if(!model)return null;
  const compare=(price,condition,km,rep,happiness,diversity,service,freight,proof,match,budget)=>{
    const p=meeting.profile;
    return -(price+freight)/Math.max(1,budget)*(.42+(p.wealth??40)*.002)
      +condition*.006-km/760000+rep*.003+happiness*.002+Math.min(10,diversity)*.006+service*.019
      +proof*((p.skepticism??45)*.001)+match;
  };
  const own=compare(bike.ask,bike.condition,bike.km,reputation,options.satisfaction??65,options.stock??1,
    options.service??0,0,bike.inspected || bike.damageRecords?.length ? 1:0,.10,meeting.limit);
  let best;
  for(const company of world.companies){
    for(const item of company.stock){
      if(item.state!=='ready'||!item.ask)continue;
      const other=models.get(item.model),branch=company.branches.find(b=>b.id===item.branch);
      if(other.category!==model.category)continue;
      const freight=branch.province===province?0:shippingQuote(branch.province,province).fee;
      if(item.ask+freight>meeting.limit*1.13)continue;
      const match=(other.id===model.id?.10:.035)+(meeting.profile.brand===other.brand?.035:0);
      const score=compare(item.ask,item.condition,item.km,company.reputation,company.satisfaction,
        company.stock.length,branch.staff,freight,1,match,meeting.limit);
      if(!best || score>best.score)best={score,company,item,freight};
    }
  }
  if(!best)return null;
  const lost=best.score>own+.12;
  const reason=lost
    ? best.item.ask+best.freight<bike.ask*.94?'daha uygun toplam fiyat'
      : best.item.condition>bike.condition+4?'daha iyi kondisyon':'ekspertiz, itibar veya hizmet avantajı'
    : 'oyuncunun fiyat, konum ve güven dengesi';
  const note={day:world.day,company:best.company.name,model:bike.name,reason,lost};
  bounded(world.customerNotes,note,18);
  return lost?note:null;
}
