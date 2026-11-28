import assert from 'node:assert/strict';
import {generateMarket,assets,newGame,perform,synchronize} from '../game.mjs';
import {createEconomy,marketRandom,nextEconomy,observeMarket} from '../economy.mjs';
import {DAY_MS} from '../clock.mjs';
import {modelOf} from '../bikes.mjs';
import {advanceCompetition,createCompetition,rivalValue} from '../rivals.mjs';
import {rivalIdentity} from '../rival-identity.mjs';
import {STAFF_ROLES} from '../business.mjs';
import {financeReport} from '../finance.mjs';

const wall=1_800_000_000_000;
const roles=['manager','inspector','master','sales'];
const reserve=12000+(250+roles.reduce((sum,role)=>sum+STAFF_ROLES[role].wage,0))*22;
const config={buy:true,inspect:true,repair:true,list:true,negotiate:true,sell:true,maxPrice:100_000_000,
  minProfit:4000,budget:100_000_000,reserve,brand:'Vespa',minCc:0,maxCc:3000};
const action=(state,name,id,value,branch=1)=>perform(state,name,id,value,branch).state;
const start=day=>{
  let economy=createEconomy(day);
  const listings=generateMarket(day,marketRandom(day),true,economy);
  economy=observeMarket(economy,listings);
  return synchronize({...newGame(),day,marketDay:day,economy,listings,competition:createCompetition(day)},wall).state;
};
const configure=(state,branch,settings)=>{
  for(const role of roles)state=action(state,'hire-worker',null,role,branch);
  for(const worker of state.branches.find(item=>item.id===branch).workers) {
    Object.assign(worker,{skill:70,speed:70,motivation:70,quality:70,experience:4});
  }
  return action(state,'set-automation',null,settings,branch);
};
const sum=(rows,index)=>rows.reduce((total,row)=>total+(row[index]??0),0);
const gameStats=(state,opening)=>{
  const worth=assets(state);
  const {totals}=financeReport(state,worth);
  assert.ok(Math.abs(state.cash-opening-totals.cashIn+totals.cashOut)<.01);
  return {worth:worth.net,bought:state.ledger.filter(row=>row.category==='purchase').length,sold:state.sales.length,
    cash:state.cash,debt:state.debt,turnover:totals.revenue,profit:totals.profit,stock:state.branches.reduce((n,b)=>n+b.garage.length,0)};
};
const companyStats=company=>{
  assert.equal(company.cash,company.openingCash+company.cashIn-company.cashOut);
  assert.equal(company.bookValue,rivalValue(company));
  return {worth:company.bookValue,bought:company.totalBought,sold:company.totalSold,cash:company.cash,
    debt:company.debt,turnover:company.turnover,profit:company.profit,stock:company.stock.length};
};

for(const seed of process.env.MOTOR_MATCH_ONLY_REAL?[]:[1,193]){
  let player=start(seed);
  const opening=1_500_000;
  player.cash=opening;
  player.branches[0].tier=2;
  player.competition.companies=[];
  player.competition.day=Number.MAX_SAFE_INTEGER; // Isolate the identical offers from rival customer stealing.
  player=configure(player,1,config);
  const world=createCompetition(seed);
  const rival=world.companies[0];
  world.companies=[rival];
  Object.assign(rival,{cash:opening,openingCash:opening,province:34,management:70,risk:60,segment:'scooter',
    reputation:player.trade.reputation,status:'listed',strategy:'scooter'});
  Object.assign(rival.branches[0],{province:34,tier:2,roles,staff:4});
  let offered=0;
  for(let elapsed=1;elapsed<=1000;elapsed++){
    const day=seed+elapsed;
    const market=nextEconomy(player,day);
    const listings=generateMarket(day,marketRandom(day),true,market).filter(item=>modelOf(item)?.brand===config.brand);
    assert.ok(listings.every(item=>modelOf(item).category==='scooter'));
    offered+=listings.length;
    const rivalMarket={listings,taken:new Set(),forecasts:new Map()};
    advanceCompetition(world,day,market,[],null,rivalMarket);
    world.companies=world.companies.filter(company=>company.id===rival.id);
    player=synchronize(player,wall+DAY_MS*elapsed).state;
    if([7,14,30,90,365,1000].includes(elapsed)){
      console.log(JSON.stringify({profile:'Eşit ilan',seed,days:elapsed,offered,player:gameStats(player,opening),
        rival:companyStats(rival),rivalRecent:[sum(rival.history.slice(-30),8),sum(rival.history.slice(-30),3)]}));
    }
  }
}

let player=start(385);
const opening=69_411_569;
player.cash=opening;
player.branches[0].tier=2;
for(const city of [17,6])player=action(player,'open-office',null,{province:city,tier:2});
player.cash=opening-assets({...player,cash:0}).net;
const funding=player.cash+player.ledger.reduce((total,row)=>total+row.amount,0);
for(const branch of player.branches)player=configure(player,branch.id,{...config,brand:'',budget:650_000,maxPrice:320_000});
const openingRivals=new Map([
  ['Yelpaze Motor Atölyesi',14_018_374],['Novarun İki Teker',12_861_016],['Asterro Motor Atölyesi',6_066_105],
]);
const template=player.competition.companies.find(row=>row.strategy==='repair');
const asterro={...structuredClone(template),id:55,...rivalIdentity(55,template.strategy),founded:120};
player.competition.companies.push(asterro);
player.competition.nextCompany=56;
player.competition.founded++;
for(const company of player.competition.companies){
  if(!openingRivals.has(company.name))continue;
  company.cash+=openingRivals.get(company.name)-rivalValue(company);
  company.openingCash=company.cash;
  company.bookValue=rivalValue(company);
}
for(const [name,value] of openingRivals) {
  const company=player.competition.companies.find(row=>row.name===name);
  assert.equal(company?.bookValue,value);
}
const team=player.competition.companies.filter(row=>openingRivals.has(row.name)).map(row=>row.id);
player=synchronize(player,wall+14*DAY_MS).state;
console.log(JSON.stringify({profile:'385–399 kullanıcı değerleriyle kurgu',playerStart:opening,
  player:gameStats(player,funding),rivals:player.competition.companies.filter(row=>team.includes(row.id))
    .map(row=>({name:row.name,start:openingRivals.get(row.name),...companyStats(row)}))}));
