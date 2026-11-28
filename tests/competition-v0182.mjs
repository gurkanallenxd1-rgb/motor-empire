import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';

const root=process.env.MOTOR_SIM_ROOT
  ? pathToFileURL(resolve(process.env.MOTOR_SIM_ROOT)+ '/')
  : new URL('../',import.meta.url);
const {assets,newGame,perform,purchaseForecast,synchronize}=await import(new URL('game.mjs',root));
const {financeReport,entryDetails}=await import(new URL('finance.mjs',root));
const {DAY_MS}=await import(new URL('clock.mjs',root));
const {isYusufListing}=await import(new URL('easter-eggs.mjs',root));
const {rivalValue}=await import(new URL('rivals.mjs',root));

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
  {profile:'Çok şubeli',cash:6500000,locations:[34,17,6,35],step:15},
]) {
  let state=synchronize({...newGame(),cash},wall).state;
  for(const province of locations.slice(1))state=action(state,'open-office',undefined,{province,tier:1});
  if(locations.length)for(const branch of state.branches){
    for(const role of ['manager','inspector','master','sales'])state=action(state,'hire-worker',undefined,role,branch.id);
    state=action(state,'set-automation',undefined,config,branch.id);
  }
  const initialWorth=assets(state).net;
  let elapsed=0;
  let tickMs=0;
  const regimes=new Set();
  for(const limit of [30,90,365,1000]){
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
    const finance=financeReport(state,worth).totals;
    const reconciled=state.cash-cash-finance.cashIn+finance.cashOut;
    assert.equal(Math.abs(round(reconciled)),0);
    const players={
      value:Math.round(worth.net),cash:state.cash,debt:state.debt,
      bought:state.ledger.filter(row=>entryDetails(row).category==='purchase').length,
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
    }));
    console.log(JSON.stringify({profile,days:limit,regimes:[...regimes],player:players,top,
      active:world.companies.length,foundings:world.founded-50,bankruptcies:world.bankrupt,
      takeovers:world.rivalTakeovers?.length??0,rivalSales:world.sold,turnover:world.turnover,
      rivalReconciliation:0,playerReconciliation:0,avgDayMs:round(tickMs/elapsed),
      worldBytes:Buffer.byteLength(JSON.stringify(world)),saveBytes:Buffer.byteLength(JSON.stringify(state))}));
  }
}
