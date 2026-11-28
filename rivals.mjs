import {rankMarket,staffQuality} from './automation.mjs?v=0.18.4';
import {INTAKE_FEE,managedAsking,managedOffer,nextManagedVisit,purchaseForecast,shouldNegotiate} from './commerce.mjs?v=0.18.4';
import {generateMarket} from './market-generation.mjs?v=0.18.4';
import {completeRepair,repairQuote,roadValue} from './damage.mjs?v=0.16.1';
import {answerBuyer,arrive,buyerQuestion,isActive,negotiate,tradeSaleOutcome} from './trade.mjs?v=0.18.4';
import { rivalIdentity } from './rival-identity.mjs?v=0.18.4';
import { BRANCH_TIERS,STAFF_ROLES,workshopRate } from './business.mjs?v=0.16.1';
import { ECONOMY_MODELS,economyQuote,provinceEconomy,markToMarket,marketRandom } from './economy.mjs?v=0.16.1';
import { paintOptions } from './bikes.mjs?v=0.16.1';
import { PROVINCES,shippingQuote } from './provinces.mjs?v=0.16.1';
import { characterFor,recordCustomerPurchase,stableNumber } from './characters.mjs?v=0.18.4';

export const STRATEGIES=Object.freeze({
  volume:'Düşük fiyat / yüksek hacim',premium:'Premium satış',scooter:'Scooter ve düşük hacim',
  sport:'Spor motosiklet',repair:'Hasarlı stok onarımı',rental:'Kiralama',safe:'Düşük risk',
  growth:'Agresif büyüme',margin:'Yüksek marj',regional:'Bölgesel odak',
});
export const SIZES=['Küçük','Orta','Büyük','Premium','Ulusal'];
export const RIVAL_ROLES=['sales','technician','inspector','manager','master'];
const strategies=Object.keys(STRATEGIES);
export const rivalRoles=branch=>branch.roles??RIVAL_ROLES.slice(0,branch.staff);
const wage=branch=>rivalRoles(branch).reduce((sum,role)=>sum+STAFF_ROLES[role].wage,0);
const reserve=company=>12000+company.branches.reduce((sum,branch)=>sum+(wage(branch)+250)*(14+Math.round((100-company.risk)/5)),0);
const branchStock=(company,branch)=>company.stock.filter(bike=>bike.branch===branch.id);
export const rivalManagement=company=>company.management??(45+Math.round(random(company.id,'management')*50));
const labor=(branch,role)=>rivalRoles(branch).filter(item=>item===role).length;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
function random(...keys) {
  let seed=stableNumber(keys.join(':'));
  seed=Math.imul(seed^(seed>>>16),0x7feb352d);
  seed=Math.imul(seed^(seed>>>15),0x846ca68b);
  return ((seed^(seed>>>16))>>>0)/4294967296;
}
const models=new Map(ECONOMY_MODELS.map(model=>[model.id,model]));
const byName=new Map(ECONOMY_MODELS.map(model=>[model.name,model]));
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
  return {id:number,...rivalIdentity(number,strategy),management:45+Math.round(random(number,'management')*50),
    founded:day,province,strategy,segment:segments[strategy],risk:strategy==='growth'?85:strategy==='safe'?15:30+number%40,
    growth:22+number%68,cash,debt,openingCash:cash,cashIn:0,cashOut:0,
    branches:[{id:1,province,tier,staff:Math.min(5,tier+1),roles:RIVAL_ROLES.slice(0,tier+1)}],stock:[],reputation:43+number%22,
    satisfaction:55+number%24,history:[],regional:[],events:[],status:number%17===0?'listed':'active',stress:0,
    nextBranch:2,nextBike:1,totalSold:0,totalBought:0,saleProfit:0,turnover:0,profit:0,marketShare:0,bookValue:cash+BRANCH_TIERS[tier].cost-debt,
  };
}

export function createCompetition(day,market) {
  const companies=Array.from({length:50},(_,i)=>companyFor(i+1,day));
  const sourcing=market && wholesaleMarket(day,market);
  if(sourcing)for(const company of companies) {
    company.daily={day,revenue:0,profit:0,sold:0};
    replenish(company,day,market,sourcing,1);
    company.bookValue=rivalValue(company);
  }
  return {day,nextCompany:51,companies,identityVersion:1,
    news:[],retired:[],founded:50,bankrupt:0,acquired:0,sold:0,turnover:0,priceIndex:[],customerNotes:[]};
}

function post(company,kind,amount,bike) {
  if (!amount) return;
  const incoming=['sale','rent','loan','liquidation','inheritedCash'].includes(kind);
  if (incoming) {company.cash+=amount;company.cashIn+=amount;}
  else {company.cash-=amount;company.cashOut+=amount;}
  if (company.cash<0) throw new Error('Rakip kasa dengesi bozuldu.');
  if (kind==='sale' || kind==='rent') {company.daily.revenue+=amount;company.turnover+=amount;}
  if (kind==='purchase') {
    company.totalBought=(company.totalBought??0)+1;
    company.daily.bought=(company.daily.bought??0)+1;
    company.daily.purchaseSpend=(company.daily.purchaseSpend??0)+amount;
  }
  if (kind==='sale') {
    const profit=amount-bike.cost;
    (company.daily.soldIds??=[]).push(bike.id);
    company.daily.saleIncome=(company.daily.saleIncome??0)+amount;
    company.daily.saleProfit=(company.daily.saleProfit??0)+profit;
    company.daily.sold++;company.totalSold++;company.daily.profit+=profit;
    company.saleProfit=(company.saleProfit??0)+profit;
    company.measuredSales=(company.measuredSales??0)+1;
  }
  if (kind==='rent') company.daily.profit+=amount;
  if (['wages','overhead','interest'].includes(kind)) company.daily.profit-=amount;
  if (kind==='liquidation') company.daily.profit+=amount-(bike?.cost??amount);
  if (!['wages','overhead'].includes(kind)) {
    bounded(company.events,[company.daily.day,kind,bike?.model??null,amount,bike?.id??null],12);
  }
}

function event(world,company,type,text) {
  bounded(world.news,{day:world.day,id:company.id,identity:company.identity,type,text},45);
}

export function wholesaleMarket(day,market) {
  const listings=generateMarket(day,marketRandom(day^0x52495641),true,market);
  return {listings,taken:new Set(),forecasts:new Map()};
}

function workforce(company,branch) {
  const rating=rivalManagement(company);
  const workers=rivalRoles(branch).map(role=>({role,skill:rating,quality:rating,speed:rating,motivation:rating,experience:4}));
  return {workers,staff:0};
}

function buy(company,branch,day,estimate,market) {
  const {item}=estimate;
  const model=byName.get(item.name);
  const {id,disclosure,urgency,price,...vehicle}=item;
  markToMarket(vehicle,market,branch.province);
  const route=estimate.delivery;
  const repair=repairQuote(vehicle);
  const bike={id:`rival-${company.id}-${company.nextBike++}`,model:model.id,year:item.year,km:item.km,
    condition:item.condition,branch:branch.id,origin:item.province,cost:item.price+route.fee,
    reference:item.cleanBase,value:roadValue(vehicle),repair:repair.cost,repairHours:repair.hours,
    inspection:labor(branch,'inspector')?0:INTAKE_FEE,bought:day,state:'transit',due:day+route.days,ask:0,rented:0,vehicle};
  post(company,'purchase',item.price,bike);
  post(company,'shipping',route.fee,bike);
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

function tradeStock(world,company,market,peers,localSupply) {
  const day=world.day;
  const queues=new Map(company.branches.map(branch=>{
    const staff=workforce(company,branch);
    return [branch.id,{
      advisor:staff.workers.find(worker=>worker.role==='sales'),
      inspection:2+labor(branch,'inspector')*5,
      inspectionHours:workshopRate(staff,'internalInspection')*.24 || 8,
      workshopHours:workshopRate(staff,'internalRepair')*.24 || 8,
      repair:8+labor(branch,'apprentice')*3+labor(branch,'technician')*7+labor(branch,'master')*8,
      sales:2+labor(branch,'sales')*5+labor(branch,'manager')*2,
    }];
  }));
  const trade={reputation:company.reputation,customers:company.customers??{}};
  company.stock=company.stock.filter(bike=>{
    const branch=company.branches.find(item=>item.id===bike.branch);
    const queue=queues.get(branch.id);
    const wasReady=bike.state==='ready';
    if(bike.state==='transfer' && day>=bike.due){bike.state='ready';bike.due=day;}
    if (bike.state==='transit' && day>=bike.due) {
      if ((bike.vehicle?queue.inspectionHours<4:queue.inspection<1) || company.cash<bike.inspection) return true;
      if(bike.vehicle)queue.inspectionHours-=4;
      else queue.inspection--;
      post(company,'inspection',bike.inspection,bike);
      bike.cost+=bike.inspection;bike.state='inspected';bike.due=day;
    }
    if (bike.state==='inspected' && day>=bike.due) {
      const hours=bike.vehicle?(bike.repairHours??repairQuote(bike.vehicle).hours):bike.repair?Math.ceil((100-bike.condition)/8):0;
      if(bike.vehicle && hours && company.cash>=bike.repair){
        const work=Math.min(queue.workshopHours,bike.workRemaining??hours);
        bike.workRemaining=(bike.workRemaining??hours)-work;
        queue.workshopHours-=work;
        if(bike.workRemaining>0)return true;
        delete bike.workRemaining;
      } else if (queue.repair<hours || company.cash<bike.repair) return true;
      if(!bike.vehicle)queue.repair-=hours;
      post(company,'repair',bike.repair,bike);
      bike.cost+=bike.repair;
      if(bike.vehicle && bike.repair) {
        completeRepair(bike.vehicle,day);
        delete bike.vehicle.lastRepair;
        bike.condition=bike.vehicle.condition;
      } else if (bike.repair) bike.condition=Math.min(100,bike.condition+Math.round((100-bike.condition)*.75));
      bike.state='ready';bike.due=day+Number(Boolean(bike.repair));
    }
    if (bike.state!=='ready' || day<bike.due) return true;
    const terms=bike.vehicle ? undefined : quoteFor(company,bike,market,branch.province,day,peers);
    let salePrice;
    if(bike.vehicle) {
      const vehicle=bike.vehicle;
      vehicle.km=bike.km;vehicle.condition=bike.condition;
      markToMarket(vehicle,market,branch.province);
      bike.value=roadValue(vehicle);
      const minimum=company.stress>=5?-Math.round(bike.cost*.13):4000;
      const listing={...vehicle,id:bike.id,spent:bike.cost,stockDay:bike.bought,listedDay:bike.bought,
        disclosureMode:'disclose',tradeStrategy:'repaired',meetings:[]};
      listing.ask=managedAsking(listing,minimum,day,day-bike.bought>=5);
      bike.ask=listing.ask;
      listing.nextVisit=bike.nextVisit??nextManagedVisit(listing,day);
      bike.nextVisit=listing.nextVisit;
      const prior=day-(bike.offer?.day??0)<3 && isActive(bike.offer)
        ? {...bike.offer,profile:characterFor(`buyer-${stableNumber(bike.offer.id)%2400}`)} : null;
      if(prior)listing.meetings.push(prior);
      if(company.strategy==='rental' && bike.rented<6 && company.stress<5 && random(bike.id,day,'rent')<.25) {
        rentStock(company,bike,branch);
        return true;
      }
      if(queue.sales<=0)return true;
      delete bike.offer;
      arrive(listing,day,trade.reputation,bike.value,trade);
      bike.nextVisit=listing.nextVisit;
      const target=bike.cost+minimum;
      const offer=managedOffer(listing.meetings,target);
      if(!offer)return true;
      const question=buyerQuestion(offer);
      if(question)answerBuyer(offer,listing,question,'disclose');
      if(shouldNegotiate(offer,target,queue.advisor?staffQuality(queue.advisor):.5)){
        offer.staffHandled=true;
        negotiate(offer);
      }
      if(!isActive(offer) || offer.price<target){
        if(isActive(offer)) {
          const {profile,speech,...pending}=offer;
          bike.offer=pending;
        }
        company.daily.rejectedOffers=(company.daily.rejectedOffers??0)+1;
        return true;
      }
      salePrice=offer.price;
      const result=tradeSaleOutcome(listing,offer,queue.advisor);
      company.satisfaction=Math.round(company.satisfaction*.9+result.satisfaction*.1);
      trade.reputation=clamp(trade.reputation+result.reputation,0,100);
      company.reputation=trade.reputation;
      recordCustomerPurchase(trade,{name:listing.name,day},offer,result.satisfaction);
    } else {
    if (company.strategy==='rental' && bike.rented<6 && company.stress<5
      && random(bike.id,day,'rent')<.55) {
      rentStock(company,bike,branch);
      return true;
    }
    const population=provinceEconomy(branch.province);
    const purchasing=population.purchasingPower*terms.budget;
    const supply=(localSupply.get(branch.province)??0)+Number(!wasReady);
    // City stock competes locally, while listings are visible nationally with freight.
    // The national share keeps a small city's population from gating its entire turnover.
    const buyerPool=(7+Math.sqrt(population.people)*.46)*terms.demand*purchasing;
    const competition=buyerPool/(buyerPool+supply*.83);
    const probability=clamp((1.24+(company.stress>=5?.65:0))/terms.days
      *clamp(1+(bike.value/bike.ask-1)*2,.45,1.65)*competition,.008,.46);
    if (random(bike.id,day,'retail')>=probability) return true;
    salePrice=bike.ask;
    }
    if(queue.sales<=0)return true;
    queue.sales--;
    post(company,'sale',salePrice,bike);
    const local=localTotals(company,branch.province);
    local[2]+=salePrice;local[3]+=salePrice-bike.cost;local[4]++;
    world.sold++;world.turnover+=salePrice;
    if(!bike.vehicle){
      company.satisfaction=clamp(company.satisfaction+(bike.condition>=83?1:-1),25,96);
      company.reputation=clamp(company.reputation+(company.totalSold%6===0?1:0),20,93);
      trade.reputation=company.reputation;
    }
    return false;
  });
  if(company.daily.sold || Object.keys(trade.customers).length){
    const recent=Object.values(trade.customers).filter(member=>member.purchases)
      .sort((a,b)=>b.lastDay-a.lastDay).slice(0,32);
    company.customers=Object.fromEntries(recent.map(member=>[member.id,member]));
  }
}

function rentStock(company,bike,branch) {
  const rent=money(bike.value*.006);
  post(company,'rent',rent,bike);
  const local=localTotals(company,branch.province);local[2]+=rent;local[3]+=rent;
  bike.rented++;
  bike.km+=85;bike.condition=Math.max(60,bike.condition-1);
}

function settle(world,company) {
  const overhead=company.branches.length*250;
  const wages=company.branches.reduce((sum,branch)=>sum+wage(branch),0);
  for(const branch of company.branches) {
    const local=localTotals(company,branch.province);
    local[3]-=250+wage(branch);
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
  const payment=Math.min(company.debt,Math.max(0,Math.floor((company.cash-reserve(company)*2)*.10)));
  if(payment){post(company,'principal',payment);company.debt-=payment;}
  company.stress=company.cash<required*8 ? company.stress+1:Math.max(0,company.stress-2);
  if(company.stress && company.stress%5===0) for(const branch of company.branches) {
    branch.roles=rivalRoles(branch).slice(0,-1);
    branch.staff=branch.roles.length;
  }
  if(company.stress>=9 && !company.restructured && company.debt>0) {
    company.restructured=true;
    event(world,company,'debt',`${company.name} borçlarını yeniden yapılandırdı.`);
  }
  if(company.stress>=12 && company.branches.length>1) {
    const closed=company.branches.slice(1).find(branch=>!branchStock(company,branch).length);
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

function manage(world,company,market) {
  const day=world.day;
  const cashFloor=reserve(company);
  const localProfit=province=>company.regional.filter(row=>row[1]===province && row[0]>day-30).reduce((sum,row)=>sum+row[3],0);
  for(const branch of company.branches) {
    const stock=branchStock(company,branch);
    const capacity=BRANCH_TIERS[branch.tier].capacity;
    const unused=capacity-stock.length;
    if(day%14===(company.id+branch.id)%14) {
      const roles=rivalRoles(branch);
      if(company.stress>=3 && roles.length) branch.roles=roles.slice(0,-1);
      else if(!company.stress && stock.length>=capacity*.65 && company.cash>cashFloor*3) {
        const shortlist=stock.some(bike=>bike.state==='inspected' && bike.repair)
          ? ['technician','master','apprentice','inspector','sales','manager']
          : ['sales','inspector','manager','technician','apprentice','master'];
        const role=shortlist.find(key=>!roles.includes(key));
        if(role)branch.roles=[...roles,role];
      }
      branch.staff=rivalRoles(branch).length;
    }
    if(unused && !company.stress && company.branches.length>1 && day%7===(company.id+branch.id)%7) {
      transferStock(company,branch,market,day);
    }
  }
  company.expansionStatus='Yatırım değerlendirme günü bekleniyor';
  if(company.stress || company.status!=='active' || company.debt>rivalValue(company)*.2) {
    company.expansionStatus='Borç, likidite veya şirket durumu yatırım için uygun değil';
    return;
  }
  if(day%14!==company.id%14)return;
  const hurdle=.012+(100-company.growth)*.00025;
  const monthlyProfit=company.history.slice(-30).reduce((sum,row)=>sum+row[2],0);
  company.expansionStatus='Beklenen aylık getiri yatırım eşiğinin altında';
  for(const branch of company.branches) {
    const tier=BRANCH_TIERS[branch.tier];
    const upgrade=BRANCH_TIERS[branch.tier+1];
    const increase=upgrade?upgrade.cost-tier.cost:0;
    const gain=upgrade?Math.max(0,localProfit(branch.province))*(upgrade.capacity-tier.capacity)/tier.capacity*.6:0;
    if(upgrade && gain/increase>=hurdle && company.cash>=increase+cashFloor*2
      && branchStock(company,branch).length>=tier.capacity*.65) {
      post(company,'upgrade',increase);
      company.investment={day,type:'Garaj yükseltmesi',amount:increase,roi:gain/increase};
      company.expansionStatus='Mevcut şubenin kapasitesi artırıldı';
      branch.tier++;
      event(world,company,'upgrade',`${company.name} ${PROVINCES[branch.province-1].name} garajını yatırım yaparak büyüttü.`);
      return;
    }
  }
  const entry=BRANCH_TIERS[0].cost;
  const alternative=monthlyProfit/Math.max(1,company.branches.length)*.33;
  if(alternative/entry<hurdle)return;
  if(company.cash<entry+cashFloor*2) {
    company.expansionStatus='Şube yatırımı için nakit rezervi yetersiz';
    return;
  }
  const occupied=new Set(company.branches.map(branch=>branch.province));
  const model=pool.get(company.segment)[0];
  const destinations=PROVINCES.filter(province=>!occupied.has(province.id)).map(province=>({
    province,score:economyQuote(market,model,model.lastYear,province.id).demand+random(company.id,day,province.id,'expansion-city')*.35,
  }));
  const city=destinations.sort((a,b)=>b.score-a.score)[0]?.province;
  if(!city){company.expansionStatus='Yeni il bulunamadı';return;}
  post(company,'branch',entry);
  company.investment={day,type:'Şube açılışı',amount:entry,roi:alternative/entry};
  company.expansionStatus='Yeni şube açıldı';
  company.branches.push({id:company.nextBranch++,province:city.id,tier:0,staff:1,roles:['sales']});
  event(world,company,'branch',`${company.name} ${city.name} şubesini açtı.`);
}

function transferStock(company,target,market,day) {
  const bike=company.stock.find(item=>{
    if(item.state!=='ready' || day-item.bought<18 || item.branch===target.id || item.transferred===true)return false;
    const source=company.branches.find(branch=>branch.id===item.branch);
    const route=shippingQuote(source.province,target.province);
    const model=models.get(item.model);
    const from=economyQuote(market,model,item.year,source.province);
    const to=economyQuote(market,model,item.year,target.province);
    return route.days && to.demand-from.demand>.10 && (to.value-from.value)*item.reference>route.fee
      && company.cash-route.fee>=reserve(company);
  });
  if(!bike)return;
  const source=company.branches.find(branch=>branch.id===bike.branch);
  const route=shippingQuote(source.province,target.province);
  post(company,'transfer',route.fee,bike);
  bike.cost+=route.fee;
  bike.origin=source.province;bike.branch=target.id;bike.due=day+route.days;bike.ask=0;
  bike.state='transfer';bike.transferred=true;
  delete bike.offer;delete bike.nextVisit;
}

function replenish(company,day,market,sourcing,limit=Infinity) {
  company.daily.buyStatus='Rezerve uygun kârlı ilan bulunamadı';
  if(company.stress>=8){company.daily.buyStatus='Nakit sıkışıklığı';return;}
  for(const branch of company.branches) {
    if((company.daily.bought??0)>=limit)break;
    const capacity=BRANCH_TIERS[branch.tier].capacity;
    const stock=branchStock(company,branch);
    const pending=stock.filter(bike=>bike.state!=='ready').length;
    const pipeline=6+labor(branch,'inspector')*10+labor(branch,'manager')*7;
    const need=Math.min(capacity-stock.length,pipeline-pending,limit-(company.daily.bought??0));
    if(need<=0){company.daily.buyStatus=stock.length>=capacity?'Garaj dolu':'Hazırlık kuyruğu dolu';continue;}
    let commitments=company.stock.reduce((sum,bike)=>sum+(bike.state==='transit'?bike.inspection:0)+(bike.state!=='ready'?bike.repair:0),0);
    const available=()=>company.cash-reserve(company)-commitments;
    if(available()<4500){company.daily.buyStatus='Nakit rezervi korunuyor';continue;}
    const quotes=sourcing.forecasts.get(branch.province)??new Map();
    sourcing.forecasts.set(branch.province,quotes);
    const sampleSize=Math.min(64,18+need*3+labor(branch,'manager')*5);
    const offset=Math.floor(random(company.id,day,branch.id,'market')*sourcing.listings.length);
    const availableAds=[];
    for(let index=0;index<Math.min(sampleSize,sourcing.listings.length);index++){
      const item=sourcing.listings[(offset+index*97)%sourcing.listings.length];
      if(!sourcing.taken.has(item.id) && item.price<=available())availableAds.push(item);
    }
    const profile=workforce(company,branch).workers;
    const manager=profile.find(worker=>worker.role==='manager')??{skill:rivalManagement(company),quality:rivalManagement(company),experience:4};
    const {candidates}=rankMarket(availableAds,{repair:true,minProfit:4000,maxPrice:available(),minCc:0,maxCc:3000},
      item=>{
        if(!quotes.has(item.id))quotes.set(item.id,purchaseForecast(item,item.price,branch.province,market));
        return quotes.get(item.id);
      },profile.some(worker=>worker.role==='inspector'),manager,
      model=>matches(company.segment,model)?3:0);
    let left=need;
    for(const candidate of candidates) {
      if(!left)break;
      if(candidate.total>available()){company.daily.buyStatus='Nakit rezervi korunuyor';continue;}
      buy(company,branch,day,{...candidate,delivery:quotes.get(candidate.item.id).delivery},market);
      const bike=company.stock.at(-1);
      commitments+=bike.inspection+bike.repair;
      sourcing.taken.add(candidate.item.id);
      left--;
    }
  }
  if(company.daily.bought)company.daily.buyStatus='Alım yapıldı';
}
function combineRivals(world) {
  const sellers=world.companies.filter(company=>company.status==='listed' && company.branches.length);
  for (const buyer of world.companies) {
    if(buyer.status!=='active' || buyer.stress || world.day%7!==buyer.id%7
      || buyer.lastAcquisition!==undefined && world.day-buyer.lastAcquisition<30)continue;
    const targets=sellers.flatMap(seller=>{
      if(seller.status!=='listed' || seller.id===buyer.id)return [];
      const baseline=rivalOffer(seller);
      const synergy=seller.segment===buyer.segment ? baseline.stock*.08 : 0;
      const valuation=Math.max(0,baseline.net)+Math.max(0,baseline.profit)*3+synergy;
      const price=Math.min(baseline.threshold,Math.floor(valuation*(1+buyer.risk*.002+rivalManagement(buyer)*.002)));
      const quote=rivalOffer(seller,price);
      if(baseline.net<=0 || !quote.accepted || quote.total>buyer.cash-reserve(buyer)*2
        || buyer.cash-quote.total+seller.cash<reserve(buyer)+reserve(seller)
        || seller.debt+buyer.debt>Math.max(0,rivalValue(buyer)+baseline.net)*.45)return [];
      return [{seller,quote,score:baseline.net+Math.max(0,baseline.profit)*4-quote.total
        +(seller.segment===buyer.segment?baseline.stock*.12:0)}];
    }).sort((a,b)=>b.score-a.score || a.seller.id-b.seller.id);
    const target=targets[0];
    if(!target?.quote.accepted)continue;
    const {seller,quote}=target;
    const offices=seller.branches.map(branch=>({...branch,id:buyer.nextBranch++,roles:[...rivalRoles(branch)]}));
    const ids=new Map(seller.branches.map((branch,index)=>[branch.id,offices[index].id]));
    post(buyer,'acquisition',quote.total);
    post(buyer,'inheritedCash',seller.cash);
    buyer.debt+=seller.debt;
    buyer.branches.push(...offices);
    buyer.stock.push(...seller.stock.map(bike=>({...bike,branch:ids.get(bike.branch)})));
    buyer.investment={day:world.day,type:'Şirket devralması',amount:quote.total,roi:quote.roi};
    buyer.lastAcquisition=world.day;
    (buyer.acquisitions??=[]).push(seller.id);
    archiveAcquisition(world,seller,quote,offices,buyer);
    seller.status='acquired';
  }
  world.companies=world.companies.filter(company=>company.status!=='acquired');
}

export function advanceCompetition(world,day,market,playerSales=[],playerBranches=null,marketSupply) {
  if(day<=world.day)return false;
  world.day=day;
  const sums=new Map(),localSupply=new Map();
  for(const company of world.companies){
    const provinces=new Map(company.branches.map(branch=>[branch.id,branch.province]));
    for(const bike of company.stock){
      if(bike.state!=='ready')continue;
      const province=provinces.get(bike.branch);
      localSupply.set(province,(localSupply.get(province)??0)+1);
      if(!bike.ask || !bike.value)continue;
      const pair=sums.get(bike.model)??[0,0];pair[0]+=bike.ask/bike.value;pair[1]++;
      sums.set(bike.model,pair);
    }
  }
  const peers=new Map([...sums].map(([id,[sum,count]])=>[id,sum/count]));
  const sourcing=marketSupply??wholesaleMarket(day,market);
  for(const company of world.companies){
    company.daily={day,revenue:0,profit:0,sold:0};
    company.localDay={};
    tradeStock(world,company,market,peers,localSupply);
    settle(world,company);
    if(company.status!=='bankrupt') {
      manage(world,company,market);
      replenish(company,day,market,sourcing);
    }
  }
  combineRivals(world);
  for(const company of world.companies) {
    const capacity=company.branches.reduce((sum,branch)=>sum+BRANCH_TIERS[branch.tier].capacity,0);
    const committed=company.stock.reduce((sum,bike)=>sum+(bike.state==='transit'?bike.inspection:0)+(bike.state!=='ready'?bike.repair:0),0);
    company.operations={day,capacity,occupied:company.stock.length,investable:Math.max(0,company.cash-reserve(company)-committed),
      buy:company.daily.buyStatus??'Alım kaydı yok',
      sell:company.daily.sold?'Satış yapıldı':company.daily.rejectedOffers?'Teklifler asgari kârı karşılamadı'
        :company.stock.some(bike=>bike.state==='ready')?'Uygun müşteri bekleniyor':'Hazır stok yok'};
    company.bookValue=rivalValue(company);
    company.profit+=company.daily.profit;
    const geography=company.regional??=[];
    const cutoff=day-29;
    company.regional=geography.filter(row=>row[0]>=cutoff).concat(Object.values(company.localDay));
    delete company.localDay;
    bounded(company.history,[day,company.daily.revenue,company.daily.profit,company.daily.sold,company.bookValue,company.cash,0,company.branches.length,company.daily.bought??0,company.stock.length,company.daily.purchaseSpend??0,company.daily.saleIncome??0,company.daily.saleProfit??0],365);
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
  const retired=world.retired.reduce((sum,row)=>{
    if(row.day<day-29)return sum;
    return sum+(row.salesByDay ? row.salesByDay.filter(entry=>entry[0]>=day-29).reduce((n,entry)=>n+entry[1],0)
      : row.recentSales??0);
  },0);
  const player=playerSales.filter(row=>row.day>=day-29 && !row.returnedDay).length;
  const total=world.companies.reduce((sum,c)=>sum+count(c),player+retired);
  for(const c of world.companies){
    c.marketShare=total ? count(c)/total:0;
    const closing=c.history.at(-1);
    if(closing?.[0]===day)closing[6]=Number(c.marketShare.toFixed(5));
  }
  const leader=[...world.companies].sort((a,b)=>b.bookValue-a.bookValue || a.id-b.id)[0];
  if(leader && leader.id!==world.leader && day%7===0){
    if(world.leader!==undefined)event(world,leader,'leader',`${leader.name} şirket değeri sıralamasının lideri oldu.`);
    world.leader=leader.id;
  }
  world.playerShare=total ? player/total:0;
  if(playerBranches!==null)bounded(world.playerHistory??=[],[day,world.playerShare,playerBranches],365);
  if(day%7===0){
    const leader=world.companies.reduce((best,company)=>!best || company.bookValue>best.bookValue ? company:best,null);
    if(leader && leader.id!==world.leader){
      if(world.leader!==undefined)event(world,leader,'leader',`${leader.name} şirket değeri sıralamasının lideri oldu.`);
      world.leader=leader.id;
    }
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

export function regionalRivalValue(company,province) {
  const offices=company.branches.filter(branch=>branch.province===province);
  const localStock=company.stock.filter(bike=>offices.some(branch=>branch.id===bike.branch));
  return offices.reduce((sum,b)=>sum+BRANCH_TIERS[b.tier].cost,0)+localStock.reduce((sum,b)=>sum+b.value,0)
    +(company.cash-company.debt)*offices.length/company.branches.length;
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

function archiveAcquisition(world,company,quote,offices,buyer) {
  bounded(world.retired,{id:company.id,name:company.name,identity:company.identity,day:world.day,status:'acquired',sales:company.totalSold,
    salesByDay:company.history.filter(row=>row[0]>world.day-30 && row[3]).map(row=>[row[0],row[3]])
      .concat(buyer && company.daily.sold?[[world.day,company.daily.sold]]:[]),
    profit:company.profit+(buyer?company.daily.profit:0)},80);
  const history=company.history.slice();
  if(buyer && history.at(-1)?.[0]!==world.day) {
    bounded(history,[world.day,company.daily.revenue,company.daily.profit,company.daily.sold,
      rivalValue(company),company.cash,null,company.branches.length,company.daily.bought??0,company.stock.length,company.daily.purchaseSpend??0,company.daily.saleIncome??0,company.daily.saleProfit??0],365);
  }
  const record={id:company.id,name:company.name,identity:company.identity,day:world.day,opening:quote.threshold,
    accepted:quote.price,fees:quote.fees,total:quote.total,receivedCash:company.cash,debt:company.debt,
    offices:offices.map(office=>office.id),stock:company.stock.length,
    staff:company.branches.reduce((sum,branch)=>sum+branch.staff,0),history};
  if(buyer) {
    record.buyerId=buyer.id;
    record.buyerName=buyer.name;
    (world.rivalTakeovers??=[]).push(record);
    event(world,company,'acquired',`${buyer.name}, ${company.name} şirketini ${quote.total.toLocaleString('tr-TR')} TL toplam bedelle devraldı.`);
  } else {
    (world.takeovers??=[]).push(record);
    event(world,company,'acquired',`${company.name} oyuncu tarafından devralındı.`);
  }
}

export function removeAcquired(world,company,quote,offices) {
  archiveAcquisition(world,company,quote,offices);
  world.companies=world.companies.filter(c=>c.id!==company.id);world.acquired++;
}

export function inheritedStock(item,day,province,allocated,slot) {
  const model=models.get(item.model);
  const paint=paintOptions(model,item.year)[0];
  const route=shippingQuote(item.origin??province,province);
  const shipping=['transit','transfer'].includes(item.state) && route.days && item.due>day
    ? {...route,origin:item.origin,destination:province,arrivalDay:item.due,acquiredStage:item.state==='transfer'?'ready':'unchecked'}:undefined;
  if(item.vehicle)return {...item.vehicle,id:item.id,province,slot,km:item.km,condition:item.condition,
    price:Math.max(1,allocated),spent:Math.max(allocated,shipping?.fee??0),value:item.value,
    stage:shipping?'shipping':item.state==='ready'?'ready':item.state==='inspected'?'inspected':'unchecked',
    ...(shipping?{shipping}: {})};
  return {id:item.id,name:model.name,year:item.year,km:item.km,condition:item.condition,province,slot,
    price:Math.max(1,allocated),spent:Math.max(allocated,shipping?.fee??0),value:item.reference,
    stage:shipping?'shipping':item.state==='ready'?'ready':item.state==='inspected'?'inspected':'unchecked',
    ...(shipping?{shipping}:{}),faults:item.state==='ready' || !item.repair?[]:['lastik'],
    color:paint.hex,colorName:paint.name,
    ...(paint.accent?{paintAccent:paint.accent,paintAccentName:paint.accentName}: {})};
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
