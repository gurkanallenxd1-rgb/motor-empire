import {encodeSave} from '../save-codec.mjs';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {createEconomy,marketRandom,nextEconomy,observeMarket} from '../economy.mjs';
import {generateMarket} from '../game.mjs';
import {advanceCompetition,createCompetition,rivalValue} from '../rivals.mjs';
import {BRANCH_TIERS} from '../business.mjs';

export function rivalSimulation(days,{insolvent=false}={}) {
  let market=createEconomy(1);
  market=observeMarket(market,generateMarket(1,marketRandom(1),true,market));
  const world=createCompetition(1,market);
  if(insolvent){
    const company=world.companies.find(row=>row.stock.length===0)??world.companies[0];
    company.cash=0;
    company.openingCash=company.cashOut-company.cashIn;
    company.debt=750_000;
    company.stress=29;
  }
  const elapsed=[];
  const prices=[];
  const soldIds=new Set();
  for(let day=2;day<=days+1;day++){
    market=nextEconomy({economy:market,sales:[]},day);
    market=observeMarket(market,generateMarket(day,marketRandom(day),true,market));
    const start=performance.now();
    advanceCompetition(world,day,market);
    elapsed.push(performance.now()-start);
    const ids=new Set();
    for(const company of world.companies) {
      assert.equal(company.cash,company.openingCash+company.cashIn-company.cashOut);
      assert.ok(company.cash>=0 && company.debt>=0);
      assert.equal(company.bookValue,rivalValue(company));
      assert.ok(company.history.length<=365);
      assert.ok(new Set(company.branches.map(branch=>branch.id)).size===company.branches.length);
      for(const branch of company.branches) {
        assert.ok(company.stock.filter(bike=>bike.branch===branch.id).length<=BRANCH_TIERS[branch.tier].capacity);
      }
      for(const id of company.daily?.soldIds??[]) {
        assert.ok(id&&!soldIds.has(id));
        soldIds.add(id);
      }
      for(const bike of company.stock){
        assert.ok(!ids.has(bike.id)&&!soldIds.has(bike.id));ids.add(bike.id);
        if(bike.vehicle)assert.ok(bike.ask===0 || bike.ask<=Math.max(bike.cost+4000,bike.value+1));
        else assert.ok(bike.ask===0 || bike.ask/bike.value>=.735 && bike.ask/bike.value<=1.136);
        if(bike.ask)prices.push(bike.ask/bike.value);
      }
    }
    assert.ok(world.companies.length<=64);
    assert.ok(world.companies.reduce((sum,c)=>sum+c.marketShare,0)<=1.000001);
  }
  const list=world.companies;
  const average=key=>list.reduce((sum,c)=>sum+c[key],0)/Math.max(1,list.length);
  const shares=list.map(c=>c.marketShare).sort((a,b)=>b-a);
  assert.ok(shares[0]<.20,`En yüksek 30 günlük pay: ${shares[0]}`);
  assert.ok(Buffer.byteLength(encodeSave(world))<2400000);
  assert.ok(list.every(c=>Number.isSafeInteger(c.cash) && Number.isSafeInteger(c.bookValue)));
  return {days,active:list.length,entrants:world.founded-50,bankrupt:world.bankrupt,
    cities:new Set(list.flatMap(c=>c.branches.map(branch=>branch.province))).size,
    averageValue:Math.round(average('bookValue')),averageCumulativeNet:Math.round(average('profit')),takeovers:world.rivalTakeovers?.length??0,
    topShare:+shares[0].toFixed(4),medianShare:+shares[Math.floor(shares.length/2)].toFixed(4),
    stock:list.reduce((sum,c)=>sum+c.stock.length,0),sales:world.sold,turnover:world.turnover,
    minAskRatio:+prices.reduce((a,b)=>Math.min(a,b),2).toFixed(3),
    maxAskRatio:+prices.reduce((a,b)=>Math.max(a,b),0).toFixed(3),
    bytes:Buffer.byteLength(JSON.stringify(world)),averageMs:+(elapsed.reduce((a,b)=>a+b,0)/elapsed.length).toFixed(2),
    p95Ms:+elapsed.sort((a,b)=>a-b)[Math.floor(elapsed.length*.95)].toFixed(2)};
}
if(process.argv[1]?.endsWith('/rival-simulation.mjs'))for(const days of [30,90,365,1000])console.log(JSON.stringify(rivalSimulation(days)));
