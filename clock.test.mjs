import test from 'node:test';
import assert from 'node:assert/strict';
import { DAY_MS,HOUR_MS,OFFLINE_LIMIT,gameTime,projectedOffset } from './clock.mjs';
import { FINANCE_STORAGE_KEY,STORAGE_KEY,loadGame,newGame,perform,repairQuote,synchronize } from './game.mjs';
import { createBuyer } from './trade.mjs';
import { createTimeStore } from './time-store.mjs';
import { shippingQuote } from './provinces.mjs';

const START = 1_800_000_000_000;
const stock = {id:'stock',name:'Yamaha R25',year:2021,km:22000,price:22000,value:90000,
  condition:80,faults:['fren'],color:'#3564ba',colorName:'Mavi'};
const action = (state,...args)=>perform(state,...args).state;
const at = (state,millis)=>synchronize(state,START+millis);
const begin = (state = newGame())=>at(state,0).state;
const bike = state=>state.branches[0].garage[0];

function memory(initial = []) {
  const data = new Map(initial);
  return {getItem:key=>data.get(key) ?? null,setItem:(key,value)=>data.set(key,value)};
}

function serialLock() {
  let tail = Promise.resolve();
  return callback=>{
    const result = tail.then(callback);
    tail = result.catch(()=>{});
    return result;
  };
}

test('one hour is 2500 ms and day 2 only begins at 60 real seconds',()=>{
  const start = begin();
  assert.equal(projectedOffset(start.clock,START+2500),HOUR_MS);
  const before = at(start,59999);
  assert.equal(before.state.day,1);
  assert.equal(before.state.ledger.length,0);
  assert.equal(before.state.clock.offset,59999);
  const after = at(before.state,60000);
  assert.equal(after.state.day,2);
  assert.equal(after.state.clock.offset,0);
  assert.equal(after.summary.expenses,250);
  assert.equal(after.state.listings.length,510);
  assert.equal(after.state.financeSnapshots.length,1);
  assert.equal(at(after.state,60000).summary,null);
  assert.throws(()=>action(after.state,'advance'),/tamamlanmadı/);
});

test('pause and reload preserve the clock, resumes without catch-up and rejects rollback time',async()=>{
  let now = START;
  const storage = memory();
  const lock = serialLock();
  const first = createTimeStore(storage,lock,()=>now);
  await first();
  now += 3500;
  const paused = await first('toggle-clock');
  assert.equal(paused.state.clock.offset,3500);
  now += DAY_MS*70;
  const reopened = createTimeStore(storage,lock,()=>now);
  assert.equal((await reopened()).state.day,1);
  assert.equal((await reopened()).summary,null);
  await reopened('toggle-clock');
  now -= 5000;
  assert.equal((await reopened()).state.clock.offset,3500);
  now += 5000+56500;
  assert.equal((await reopened()).state.day,2);
});

test('catch-up is capped at 60 days, closes finance once and never sells without approval',()=>{
  const seed = newGame();
  const listed = {...stock,id:'sale',stage:'listed',ask:78000,nextVisit:1,meetings:[],slot:0,spent:32000};
  const rental = {...stock,id:'rental',stage:'rented',slot:1,spent:32000,rental:{day:1,endDay:4,days:3,rate:300}};
  seed.branches[0].garage = [listed,rental];
  seed.branches[0].staff = 1;
  const start = begin(seed);
  const after = at(start,OFFLINE_LIMIT+8*DAY_MS);
  assert.equal(after.state.day,61);
  assert.equal(after.state.clock.offset,0);
  assert.equal(after.summary.days,60);
  assert.equal(after.summary.capped,true);
  assert.equal(after.summary.returned,1);
  assert.equal(after.summary.income,900);
  assert.equal(after.summary.expenses,60*1000);
  assert.equal(after.state.financeSnapshots.length,60);
  assert.equal(after.state.ledger.filter(row=>row.category==='overhead').length,60);
  assert.equal(after.state.ledger.filter(row=>row.category==='wages').length,60);
  assert.equal(after.state.ledger.filter(row=>row.category==='rental').length,3);
  assert.equal(after.state.sales.length,0);
  assert.ok(after.summary.visits>0);
  assert.equal(at(after.state,OFFLINE_LIMIT+8*DAY_MS).summary,null);
});

test('repair starts at its actual game hour, updates value and deducts cost once',()=>{
  let state = begin({...newGame(),listings:[stock]});
  state = action(action(state,'buy',stock.id),'inspect',stock.id);
  state = at(state,2499).state;
  state = action(state,'repair',stock.id);
  const cost = repairQuote(bike(state)).cost;
  const needed = repairQuote(bike(state)).hours*HOUR_MS;
  const before = at(state,2499+needed-1);
  assert.equal(bike(before.state).stage,'repairing');
  assert.equal(bike(before.state).remainingHours,1);
  const after = at(before.state,2499+needed);
  assert.equal(after.summary.completed,1);
  assert.equal(bike(after.state).stage,'ready');
  assert.ok(bike(after.state).condition>stock.condition);
  assert.ok(bike(after.state).lastRepair.afterValue>bike(after.state).lastRepair.beforeValue);
  assert.equal(bike(after.state).spent,stock.price+450+cost);
  assert.equal(after.state.ledger.filter(row=>row.category==='repair').length,1);
});

test('daily staffing capacity is retained and queued repair continues the following day',()=>{
  const seed = newGame();
  seed.branches[0].garage = [{...stock,stage:'repairing',spent:24000,slot:0,remainingHours:10,repairOrder:1}];
  const start = begin(seed);
  const first = at(start,DAY_MS-1).state;
  assert.equal(bike(first).remainingHours,2);
  const next = at(first,DAY_MS+2*HOUR_MS);
  assert.equal(next.summary.completed,1);
  assert.equal(bike(next.state).stage,'ready');
});

test('freight preserves a reserved bay up to the original departure hour plus route duration',()=>{
  const local = {...stock,id:'local'};
  const extra = {...stock,id:'extra'};
  let state = begin({...newGame(),cash:200000,listings:[{...stock,province:65},local,extra]});
  state = at(state,7190).state;
  state = action(action(state,'buy',stock.id),'buy',local.id);
  assert.throws(()=>action(state,'buy',extra.id),/dolu/);
  const delivery = shippingQuote(65);
  const arrival = gameTime(1+delivery.days,7190);
  assert.equal(bike(state).shipping.arrivalMs,arrival);
  const before = at(state,arrival-1).state;
  assert.equal(bike(before).stage,'shipping');
  assert.throws(()=>action(before,'inspect',stock.id),/yapılamıyor/);
  const after = at(before,arrival);
  assert.equal(after.summary.delivered,1);
  assert.equal(bike(after.state).stage,'unchecked');
  assert.equal(bike(after.state).slot,0);
  assert.equal(bike(after.state).spent,stock.price+delivery.fee);
  assert.equal(after.state.ledger.filter(row=>row.category==='shipping').length,1);
  assert.ok(!after.state.listings.some(item=>item.id===stock.id));
});

test('open buyers and sellers survive refresh and retain their used bargaining turns',()=>{
  const initial = {...newGame(),cash:200000,listings:[{...stock,id:'vendor'}]};
  const listing = {...stock,stage:'listed',spent:24000,slot:0,ask:68000,nextVisit:1,meetings:[]};
  listing.meetings = [createBuyer(listing,1,0,50,80000)];
  initial.branches[0].garage = [listing];
  let state = begin(initial);
  const ids = listing.meetings.map(meeting=>meeting.id);
  state = action(state,'hold-buyer',stock.id,ids[0]);
  state = action(state,'meet-seller','vendor');
  const seller = state.listings[0].seller;
  state = action(state,'negotiate','vendor',seller.id);
  const previous = state.listings[0].seller;
  assert.equal(previous.round,1);
  const after = at(state,DAY_MS*8).state;
  assert.deepEqual(after.listings.find(item=>item.id==='vendor').seller,previous);
  assert.deepEqual(bike(after).meetings.find(item=>item.id===ids[0]),bike(state).meetings[0]);
  assert.equal(after.sales.length,0);
  assert.ok(!action(after,'buy-negotiated','vendor',seller.id).listings.some(item=>item.id==='vendor'));
});

test('two tabs and a reload commit one day and atomically reject a duplicate purchase',async()=>{
  const storage = memory([[STORAGE_KEY,JSON.stringify({...newGame(),listings:[stock]})]]);
  const lock = serialLock();
  let now = START;
  const makeTab = ()=>createTimeStore(storage,lock,()=>now);
  const first = makeTab(), second = makeTab();
  const purchases = await Promise.all([first('buy',stock.id),second('buy',stock.id)]);
  assert.deepEqual(purchases.map(result=>Boolean(result.error)),[false,true]);
  now += DAY_MS;
  const ticks = await Promise.all([first(),second(),makeTab()()]);
  assert.equal(ticks.filter(result=>result.summary?.days===1).length,1);
  const current = loadGame(storage);
  assert.equal(current.day,2);
  assert.equal(current.cash,75000-stock.price-250);
  assert.equal(current.financeSnapshots.length,1);
  assert.equal(current.ledger.filter(row=>row.category==='purchase').length,1);
  assert.equal(current.ledger.filter(row=>row.category==='overhead').length,1);
});

test('v0.10 migration starts from the current day and keeps the previous save byte-for-byte',async()=>{
  const seed = {...newGame(),version:7,day:9,cash:23000,debt:12000};
  const raw = JSON.stringify(seed);
  const storage = memory([[FINANCE_STORAGE_KEY,raw]]);
  const store = createTimeStore(storage,serialLock(),()=>START);
  const result = await store();
  assert.equal(result.state.day,9);
  assert.equal(result.state.cash,23000);
  assert.equal(result.state.debt,12000);
  assert.equal(result.state.clock.offset,0);
  assert.deepEqual(result.state.listings,seed.listings);
  assert.equal(result.summary,null);
  assert.equal(storage.getItem(FINANCE_STORAGE_KEY),raw);
});
