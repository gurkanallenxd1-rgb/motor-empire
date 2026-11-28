import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';

const root=process.env.MOTOR_SIM_ROOT
  ? pathToFileURL(resolve(process.env.MOTOR_SIM_ROOT)+ '/')
  : new URL('../',import.meta.url);
const {assets,generateMarket,newGame,perform,purchaseForecast,synchronize}=await import(new URL('game.mjs',root));
const {financeReport,entryDetails}=await import(new URL('finance.mjs',root));
const {DAY_MS}=await import(new URL('clock.mjs',root));
const {isYusufListing}=await import(new URL('easter-eggs.mjs',root));
const {rivalValue,createCompetition}=await import(new URL('rivals.mjs',root));
const {createEconomy,marketRandom,observeMarket}=await import(new URL('economy.mjs',root));
const {encodeSave}=await import('../save-codec.mjs');
const phase=Number(process.env.MOTOR_SIM_SEED??1);
const seed=()=>{
  const economy=createEconomy(phase);
  const listings=generateMarket(phase,marketRandom(phase),true,economy);
  const observed=observeMarket(economy,listings);
  return {...newGame(),day:phase,economy:observed,listings,competition:createCompetition(phase,observed)};
};

const wall=1800000000000;
const config={buy:true,inspect:true,repair:true,list:true,sell:true,negotiate:true,maxPrice:125000,
  minProfit:4000,budget:250000,reserve:55000,brand:'',minCc:0,maxCc:3000};
const action=(state,name,id,value,branch=1)=>perform(state,name,id,value,branch).state;
function manual(state) {
  const bike=state.branches[0].garage[0];
  if(bike?.stage==='listed') {
    const offer=bike.meetings.find(row=>row.status==='open' && row.price>=bike.spent);
    return offer?action(state,'sell',bike.id,offer.id):state;
  }
  if(bike?.stage==='ready')return action(state,'list',bike.id);
  if(bike?.stage==='unchecked')return action(state,'inspect',bike.id);
  if(bike)return state;
  const target=state.listings.filter(item=>!isYusufListing(item) && item.province===34
      && !item.faults.length && item.price<state.cash-7000 && !item.seller)
    .map(item=>({item,profit:purchaseForecast(item,item.price,34,state.economy).profit}))
    .sort((a,b)=>b.profit-a.profit).find(row=>row.profit>7000);
  return target?action(state,'buy',target.item.id):state;
}

const round=value=>Math.round(value*100)/100;
const margin=(profit,revenue)=>revenue?round(profit/revenue*100):null;
const sum=(rows,key)=>rows.reduce((total,row)=>total+(row[key]??0),0);
for(const {profile,cash,locations,step} of [
  {profile:'Pasif',cash:75000,locations:[],step:15},
  {profile:'Manuel',cash:75000,locations:[],step:3},
  {profile:'Otomasyon',cash:1000000,locations:[34],step:15},
  {profile:'384. gün çok şubeli',cash:40_000_000,locations:[34,17,6,35,16,7],step:15},
].filter(row=>!process.env.MOTOR_SIM_PROFILE || row.profile===process.env.MOTOR_SIM_PROFILE)) {
  let state=synchronize({...seed(),cash},wall).state;
  const advanced=locations.length>1;
  if(advanced)for(let index=0;index<3;index++)state=action(state,'upgrade-office');
  for(const province of locations.slice(1))state=action(state,'open-office',undefined,{province,tier:3});
  if(locations.length)for(const branch of state.branches){
    for(const role of ['manager','inspector','master','sales'])state=action(state,'hire-worker',undefined,role,branch.id);
    state=action(state,'set-automation',undefined,advanced?{...config,maxPrice:300_000,budget:1_200_000,reserve:750_000}:config,branch.id);
  }
  const initialWorth=assets(state).net;
  let elapsed=0;
  let tickMs=0;
  const regimes=new Set();
  for(const limit of [7,30,90,365,384,1000]){
    while(elapsed<limit){
      elapsed+=Math.min(step,limit-elapsed);
      const start=performance.now();
      state=synchronize(state,wall+elapsed*DAY_MS).state;
      tickMs+=performance.now()-start;
      regimes.add(state.economy.macro.regime);
      if(profile==='Manuel')state=manual(state);
      assert.equal(state.competition.day,state.day);
      for(const company of state.competition.companies){
        assert.equal(company.cash,company.openingCash+company.cashIn-company.cashOut);
        assert.equal(company.bookValue,rivalValue(company));
      }
    }
    const world=state.competition;
    const worth=assets(state);
    const report=financeReport(state,worth,30);
    const finance=report.totals;
    const sales30=state.sales.filter(row=>row.day>state.day-30 && !row.returnedDay);
    const purchases=state.ledger.filter(row=>entryDetails(row).category==='purchase');
    const trailing=report.periodTotals;
    const recent=report.series.filter(row=>row.day>state.day-30);
    const staff=state.branches.reduce((total,branch)=>total+(branch.workers?.length??0)+(branch.staff??0),0);
    const startEncode=performance.now();
    const packed=encodeSave(state);
    const reconciled=state.cash-cash-finance.cashIn+finance.cashOut;
    assert.equal(Math.abs(round(reconciled)),0);
    const players={
      value:Math.round(worth.net),cash:state.cash,debt:state.debt,
      bought:purchases.length,boughtPerDay:round(purchases.filter(row=>row.day>state.day-30).length/Math.min(30,limit)),
      soldPerDay:round(sales30.length/Math.min(30,limit)),turnover30:trailing.revenue,
      dailyTurnover:round(trailing.revenue/Math.min(30,limit)),peakDailyTurnover:Math.max(0,...recent.map(row=>row.revenue??0)),
      net30:trailing.profit,cashIn30:trailing.cashIn,cashOut30:trailing.cashOut,
      stockDays:sales30.length?round(sales30.reduce((total,row)=>total+(row.daysListed??0),0)/sales30.length):null,
      salesPerStaff:staff?round(sales30.length/staff):null,
      investment:worth.equipment,
      sold:state.sales.length,revenue:finance.revenue,
      profit:finance.profit,margin:margin(finance.profit,finance.revenue),
      branches:state.branches.length,staff:state.branches.reduce((n,branch)=>n+(branch.workers?.length??0)+(branch.staff??0),0),
      share:round(world.playerShare*100),growth:round((worth.net/initialWorth-1)*100),
    };
    const top=[...world.companies].sort((a,b)=>b.bookValue-a.bookValue).slice(0,10).map(company=>({
      name:company.name,id:company.id,value:company.bookValue,cash:company.cash,debt:company.debt,
      bought:company.totalBought??null,sold:company.totalSold,revenue:company.turnover,
      profit:company.profit,margin:margin(company.profit,company.turnover),
      branches:company.branches.length,staff:sum(company.branches,'staff'),share:round(company.marketShare*100),
      period:company.history.slice(-30).reduce((totals,row)=>({
        revenue:totals.revenue+row[1],profit:totals.profit+row[2],sold:totals.sold+row[3],
        bought:row[8]===undefined?null:(totals.bought??0)+row[8],
      }),{revenue:0,profit:0,sold:0,bought:0}),
    }));
    console.log(JSON.stringify({profile,seed:phase,days:limit,regimes:[...regimes],player:players,top,
      active:world.companies.length,foundings:world.founded-50,bankruptcies:world.bankrupt,
      takeovers:world.rivalTakeovers?.length??0,rivalSales:world.sold,turnover:world.turnover,
      rivalReconciliation:0,playerReconciliation:0,avgDayMs:round(tickMs/elapsed),
      worldBytes:Buffer.byteLength(JSON.stringify(world)),saveBytes:Buffer.byteLength(JSON.stringify(state)),packedBytes:Buffer.byteLength(packed),encodeMs:round(performance.now()-startEncode)}));
  }
}
