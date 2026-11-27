import test from 'node:test';
import assert from 'node:assert/strict';
import { filterListings,modelOf } from './bikes.mjs';
import { DAMAGE_STORAGE_KEY,STORAGE_KEY,INSPECTION_FEE,assets,estimatedListingProfit,generateMarket,
  loadGame,newGame,perform,purchaseForecast,realizedSales,saveGame } from './game.mjs';
import { ISTANBUL,PROVINCES,marketPressure,provinceName,shippingQuote } from './provinces.mjs';

function randomFrom(seed) {
  return () => ((seed = (Math.imul(seed,1664525)+1013904223) >>> 0) / 2**32);
}
const stock = {id:'stock',name:'Yamaha R25',year:2021,km:24000,price:28000,value:99000,
  condition:98,faults:[],color:'#3564ba',colorName:'Mavi'};
const action = (state,...args) => perform(state,...args).state;

test('510 distinct daily listings cover all 81 provinces with varied stock for the same model', () => {
  const first = generateMarket(1,randomFrom(913));
  const next = generateMarket(2,randomFrom(913));
  assert.equal(PROVINCES.length,81);
  assert.equal(new Set(PROVINCES.map(item=>item.name)).size,81);
  assert.equal(first.length,510);
  assert.equal(new Set(first.map(item=>item.id)).size,510);
  const ids = new Set(first.map(bike=>bike.id));
  assert.ok(next.every(item=>!ids.has(item.id)));
  for (const {id} of PROVINCES) assert.equal(filterListings(first,{province:id}).length,id===ISTANBUL ? 30 : 6);
  const shared = first.filter(item=>item.name===first[0].name);
  assert.equal(shared.length,81);
  for (const key of ['year','color','km','condition','price']) assert.ok(new Set(shared.map(item=>item[key])).size>1,key);
  assert.ok(JSON.stringify(first).length<300_000);
});

test('estimated routes yield 0, 1, 2 and 3 days with distance-based costs', () => {
  assert.deepEqual(shippingQuote(ISTANBUL),{km:0,fee:0,days:0});
  const routes = [41,6,65].map(id=>shippingQuote(id));
  assert.deepEqual(routes.map(route=>route.days),[1,2,3]);
  assert.ok(routes.every((route,index)=>!index || route.km>routes[index-1].km && route.fee>routes[index-1].fee));
  assert.deepEqual(shippingQuote(6,65),shippingQuote(65,6));
  assert.throws(()=>shippingQuote(82),/geçersiz/);
  for (const {id} of PROVINCES) {
    for (const demand of [.05,.18]) for (const supply of [.05,.8]) {
      for (let day=1;day<20;day++) assert.ok(Math.abs(marketPressure(day,id,demand,supply))<=.05);
    }
  }
  assert.ok(marketPressure(1,34,.18,.1)>marketPressure(1,34,.05,.8));
  assert.notEqual(marketPressure(1,34,.1,.25),marketPressure(2,34,.1,.25));
});

test('province combines with existing filters and all new sort orders keep market inventory intact', () => {
  const listings = generateMarket(3,randomFrom(729));
  const snapshot = JSON.stringify(listings);
  const compare = (a,b) => a.localeCompare(b,'tr');
  const modelName = bike => bike.name.slice(modelOf(bike).brand.length+1);
  const sorters = {
    'city-asc':(a,b)=>compare(provinceName(a.province),provinceName(b.province)),
    'brand-asc':(a,b)=>compare(modelOf(a).brand,modelOf(b).brand),
    'model-asc':(a,b)=>compare(modelName(a),modelName(b)),
    'price-asc':(a,b)=>a.price-b.price,
    'condition-desc':(a,b)=>b.condition-a.condition,
    'profit-desc':(a,b)=>estimatedListingProfit(b)-estimatedListingProfit(a),
  };
  for (const [sort,comparator] of Object.entries(sorters)) {
    const sorted = filterListings(listings,{sort},estimatedListingProfit);
    assert.ok(sorted.every((bike,index)=>index===0 || comparator(sorted[index-1],bike)<=0),sort);
  }
  const [selected] = filterListings(listings,{province:65});
  const filtered = filterListings(listings,{province:65,brand:modelOf(selected).brand,modelId:modelOf(selected).id});
  assert.deepEqual(filtered,[selected]);
  assert.equal(JSON.stringify(listings),snapshot);
});

test('negotiated purchase charges freight once, reserves a branch bay, survives reload and delivers on time', () => {
  const remote = {...stock,province:65};
  const initial = {...newGame(),cash:500000,listings:[remote,{...stock,id:'local',province:34},{...stock,id:'extra'}]};
  let state = action(initial,'open-branch');
  state = action(state,'meet-seller',remote.id,undefined,2);
  const meeting = state.listings[0].seller;
  state = action(state,'negotiate',remote.id,meeting.id,2);
  const price = state.listings[0].seller.price;
  const before = state.cash;
  const delivery = shippingQuote(65);
  const bought = action(state,'buy-negotiated',remote.id,meeting.id,2);
  assert.equal(bought.cash,before-price-delivery.fee);
  assert.equal(bought.branches[0].garage.length,0);
  assert.equal(assets(bought).inventory,purchaseForecast(remote).beforeValue);
  let bike = bought.branches[1].garage[0];
  assert.equal(bike.stage,'shipping');
  assert.equal(bike.spent,price+delivery.fee);
  assert.equal(bike.shipping.arrivalDay,1+delivery.days);
  assert.equal(bought.trade.history[0].price,price);
  assert.equal(bought.ledger[0].amount,delivery.fee);
  assert.equal(bought.ledger[0].branchId,2);
  for (const op of ['inspect','repair','rent','list','sell']) {
    assert.throws(()=>action(bought,op,remote.id,1,2),undefined,op);
  }
  assert.throws(()=>action(bought,'buy',remote.id,undefined,2),/açık değil/);
  state = action(bought,'buy','local',undefined,2);
  assert.throws(()=>action(state,'buy','extra',undefined,2),/dolu/);
  const memory = new Map();
  const storage = {getItem:key=>memory.get(key) ?? null,setItem:(key,value)=>memory.set(key,value)};
  saveGame(storage,state);
  assert.deepEqual(loadGame(storage),state);
  state = loadGame(storage);
  for (let i=1;i<delivery.days;i++) {
    state = action(state,'advance');
    assert.equal(state.branches[1].garage[0].stage,'shipping');
  }
  state = action(state,'advance');
  bike = state.branches[1].garage[0];
  assert.equal(bike.stage,'unchecked');
  assert.equal(bike.shipping,undefined);
  assert.equal(bike.province,65);
  assert.equal(bike.slot,0);
  assert.equal(state.ledger.filter(row=>row.label.includes('nakliyesi')).length,1);
  state = action(state,'inspect',remote.id,undefined,2);
  assert.equal(state.branches[1].garage[0].spent,price+delivery.fee+INSPECTION_FEE);
  assert.equal(purchaseForecast(remote,price).total,state.branches[1].garage[0].spent);
  state = action(state,'list',remote.id,90000,2);
  for (let i=0;i<25&&!state.branches[1].garage[0].meetings.length;i++) state=action(state,'advance');
  state = action(state,'sell',remote.id,state.branches[1].garage[0].meetings[0].id,2);
  assert.equal(realizedSales(state.sales).profit,state.sales[0].price-price-delivery.fee-INSPECTION_FEE);
});

test('freight is included in affordability and an Istanbul purchase arrives immediately', () => {
  const state = {...newGame(),cash:stock.price,listings:[{...stock,province:6},{...stock,id:'local',province:34}]};
  const snapshot = JSON.stringify(state);
  assert.throws(()=>action(state,'buy',stock.id),/nakliye/);
  assert.equal(JSON.stringify(state),snapshot);
  const local = action(state,'buy','local');
  assert.equal(local.cash,0);
  assert.equal(local.branches[0].garage[0].stage,'unchecked');
  assert.ok(!local.ledger.some(entry=>entry.label.includes('nakliyesi')));
});

test('v0.8 migration preserves storage, current seller, finances and inventory without relisting purchased bikes', () => {
  const initial = {...newGame(),listings:[stock,{...stock,id:'purchased'}]};
  const old = action(action(initial,'meet-seller',stock.id),'buy','purchased');
  old.version = 5;
  const raw = JSON.stringify(old);
  const memory = new Map([[DAMAGE_STORAGE_KEY,raw]]);
  const storage = {getItem:key=>memory.get(key) ?? null,setItem:(key,value)=>memory.set(key,value)};
  const migrated = loadGame(storage);
  assert.equal(migrated.version,9);
  assert.deepEqual(migrated.listings[0],{...old.listings[0],province:34});
  for (const key of ['cash','debt','branches','sales','ledger','trade']) assert.deepEqual(migrated[key],old[key],key);
  assert.ok(!migrated.listings.some(bike=>bike.id==='purchased'));
  assert.equal(new Set(migrated.listings.map(bike=>bike.province)).size,81);
  assert.deepEqual(loadGame(storage),migrated);
  saveGame(storage,migrated);
  assert.equal(memory.get(DAMAGE_STORAGE_KEY),raw);
  assert.ok(memory.has(STORAGE_KEY));
});
