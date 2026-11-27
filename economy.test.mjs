import assert from 'node:assert/strict';
import test from 'node:test';
import { catalog } from './bikes.mjs';
import { DAY_MS } from './clock.mjs';
import { economyQuote, macroFor, marketSeries, nextEconomy, provinceEconomy, regionalEstimates } from './economy.mjs';
import { STORAGE_KEY,newGame,loadGame,saveGame,perform,purchaseForecast,synchronize } from './game.mjs';
import { roadValue,repairQuote } from './damage.mjs';
import { simulateEconomy } from './tests/economy-simulation.mjs';
import { createBuyer } from './trade.mjs';

const T = 1800000000000;
const model = catalog.find(item=>item.id==='yamaha-r25');
const act = (state,...args)=>perform(state,...args).state;

test('seasons vary by category and regional and model-year quotes move smoothly within bounds',()=>{
  const day = n=>({day:n,macro:macroFor(n),supply:[]});
  const scooter = catalog.find(item=>item.id==='vespa-primavera125');
  const coefficient = (n,item,province=34,year=item.lastYear)=>economyQuote(day(n),item,year,province);
  for (const [date,season] of [[45,'İlkbahar'],[135,'Yaz'],[225,'Sonbahar'],[315,'Kış']])
    assert.equal(macroFor(date).season,season);
  const swing = item=>coefficient(135,item).demand-coefficient(315,item).demand;
  assert.ok(swing(model)>swing(scooter));
  assert.ok(coefficient(135,model).demand>coefficient(45,model).demand);
  assert.ok(coefficient(315,model).demand<coefficient(225,model).demand);
  assert.deepEqual(new Set([1,74,147,220,293].map(n=>macroFor(n).regime)),new Set(['Büyüme','Denge','Durgunluk','Kriz','Toparlanma']));
  assert.ok(macroFor(220).parts>macroFor(1).parts);
  assert.ok(coefficient(220,model).budget<coefficient(1,model).budget);
  assert.notEqual(coefficient(135,model,34,model.firstYear).value,coefficient(135,model).value);
  assert.equal(regionalEstimates(day(135),model,model.lastYear).length,81);
  assert.ok(provinceEconomy(34).people>provinceEconomy(69).people);
  assert.ok(coefficient(135,model,34).value>coefficient(135,model,69).value);
});

test('regional forecasts include freight and replacement parts, while past acquisition cost and offers stay frozen',()=>{
  let state = synchronize({...newGame(),cash:1_000_000},T).state;
  const item = state.listings.find(row=>row.province===34 && row.faults.length);
  const flat = purchaseForecast(item,item.price,34,state.economy);
  const freight = purchaseForecast(item,item.price,69,state.economy);
  assert.ok(freight.delivery.fee>0);
  assert.notEqual(flat.afterValue,freight.afterValue);
  assert.equal(freight.profit,freight.expectedPrice-freight.total);
  state = act(state,'buy',item.id);
  const bike = state.branches[0].garage[0];
  const before = roadValue(bike);
  const oldCost = repairQuote(bike).cost;
  state = synchronize(state,T+60*DAY_MS).state;
  const owned = state.branches[0].garage[0];
  assert.equal(owned.spent,bike.spent);
  assert.equal(owned.price,bike.price);
  assert.notEqual(roadValue(owned),before);
  assert.notEqual(repairQuote(owned).cost,oldCost);
  const source = {...owned,tradeStrategy:'documented',ask:roadValue(owned)*2};
  const cheap = createBuyer({...source,marketTerms:{budget:.8}},5,0,50,roadValue(owned),undefined,state.trade);
  const dear = createBuyer({...source,marketTerms:{budget:1.16}},5,0,50,roadValue(owned),undefined,state.trade);
  assert.ok(dear.limit>cheap.limit);
});

test('legacy migration starts history at the observed day and offline sequencing matches daily play',()=>{
  const live = newGame();
  delete live.economy;
  live.day = 64;
  const storage = new Map([[STORAGE_KEY,JSON.stringify(live)]]);
  const port = {getItem:key=>storage.get(key) ?? null,setItem:(key,value)=>storage.set(key,value)};
  const seed = synchronize(loadGame(port),T).state;
  assert.deepEqual(seed.economy.history.map(row=>row.day),[64]);
  const offline = synchronize(seed,T+25*DAY_MS).state;
  let daily = seed;
  for (let i=1;i<=25;i++) daily = synchronize(daily,T+i*DAY_MS).state;
  assert.deepEqual(offline.economy,daily.economy);
  const latest = offline.economy.history.at(-1);
  for (const sample of marketSeries(offline.economy,model.id,7)) assert.ok(sample.count>0 && sample.price>0);
  assert.equal(latest.day,89);
  assert.equal(new Set(offline.economy.history.map(row=>row.day)).size,26);
  assert.deepEqual(offline.inbox,daily.inbox);
  saveGame(port,offline);
  assert.deepEqual(synchronize(loadGame(port),T+25*DAY_MS).state.economy,offline.economy);
  const news = offline.inbox.items.filter(row=>row.type==='economy');
  for (let i=1;i<news.length;i++) assert.ok(news[i-1].time-news[i].time>=7*DAY_MS);
});

test('actual fast sales and current supply influence next-day pricing',()=>{
  const state = newGame();
  const demand = market=>economyQuote(market,model,model.lastYear,34).demand;
  const slow = nextEconomy({...state,sales:[{name:model.name,day:1,daysListed:24}]},2);
  const rapid = nextEconomy({...state,sales:[{name:model.name,day:1,daysListed:1}]},2);
  assert.ok(demand(rapid)>demand(slow));
  assert.ok(demand({...rapid,pricingSupply:[]})>demand({...rapid,
    pricingSupply:Array(rapid.supply.length).fill(20)}));
});

test('30, 90 and 365 game days reconcile real trade cash and keep prices and expenses bounded',()=>{
  const reports = simulateEconomy();
  assert.deepEqual(reports.map(row=>row.days),[30,90,365]);
  for (const result of reports) {
    assert.ok(result.priceIndex[0]>=810 && result.priceIndex[1]<=1280);
    assert.ok(result.largestDailyMove<5);
    assert.ok(result.opportunities>0 && result.belowBreakEven>0);
    assert.equal(result.idleIncome,0);
    assert.equal(result.idleCash-result.idleDebt,75000-result.days*250);
    assert.equal(result.reconciliation,0);
    assert.ok(result.highestDailyPurchases<=160000 && result.stock<=result.capacity);
    assert.ok(result.sales<=result.purchases && result.sales>0);
    assert.ok(result.lowestSaleMargin>=4500);
    assert.ok(result.partsIndex>=.94 && result.partsIndex<=1.22);
  }
});

test('manager can reject an implausibly low listing without reading its hidden damage',()=>{
  const state = newGame();
  const candidate = state.listings.find(item=>item.marketTerms && !item.faults.length);
  const cheap = {...candidate,price:2000};
  const hidden = {...cheap,faults:['pert'],damageHistory:['pert'],
    disclosure:{hidden:['pert'],condition:candidate.condition,trust:.3}};
  const estimate = item=>purchaseForecast(item,item.price,34,state.economy);
  assert.equal(estimate(cheap).lowAsk,true);
  assert.equal(estimate(hidden).lowAsk,true);
  assert.equal(estimate(hidden).risk,estimate(cheap).risk);
  assert.equal(estimate(hidden).afterValue,estimate(cheap).afterValue);
  assert.ok(state.listings.some(item=>item.price<75000));
});
