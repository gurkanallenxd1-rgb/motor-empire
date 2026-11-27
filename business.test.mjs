import { marketRandom,nextEconomy } from './economy.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { BRANCH_TIERS,STAFF_ROLES,TRAINING_COST,TRAINING_TIME } from './business.mjs';
import { DAY_MS,HOUR_MS } from './clock.mjs';
import { assets,branchCapacity,generateMarket,loadGame,newGame,perform,purchaseForecast,repairQuote,saveGame,synchronize } from './game.mjs';
import { PROVINCES,shippingQuote } from './provinces.mjs';
import { createBuyer } from './trade.mjs';

const start = 1800000000000;
const act = (state,...args)=>perform(state,...args).state;
const advance = (state,ms)=>synchronize(state,state.clock.wall+ms).state;
const listing = (id,faults=[])=>({id,name:'Yamaha R25',year:2021,km:22000,price:48000,value:100000,
  province:34,condition:faults.length ? 65 : 100,faults,damageHistory:[],color:'#3560ab',colorName:'Mavi'});
const seed = ()=>({...newGame(),cash:5000000,listings:[listing('a',['lastik']),listing('b'),listing('c')]});
const office = (state,province)=>act(state,'open-office',undefined,{province,tier:0});
const hire = (state,role,branch=1)=>act(state,'hire-worker',undefined,role,branch);
function reload(state) {
  const data = new Map();
  const storage = {getItem:key=>data.get(key) ?? null,setItem:(key,value)=>data.set(key,value)};
  saveGame(storage,state);
  return loadGame(storage);
}

test('all 81 provinces accept branches and each upgrade credits the previous investment',()=>{
  let state = {...seed(),cash:100000000};
  for (const province of PROVINCES) state = office(state,province.id);
  assert.equal(state.branches.length,82);
  assert.equal(state.cash,100000000-81*250000);
  for (const tier of BRANCH_TIERS.slice(1)) {
    const assetsBefore = assets(state).net;
    state = act(state,'upgrade-office',undefined,undefined,2);
    assert.equal(branchCapacity(state.branches[1]),tier.capacity);
    assert.equal(state.cash,100000000-80*250000-tier.cost);
    assert.equal(assets(state).net,assetsBefore);
  }
  assert.equal(branchCapacity(state.branches[0]),2);
  assert.throws(()=>office(state,82));
});

test('role wages post once, training persists and staff transfer completes on the shipping clock',()=>{
  let state = synchronize(office(seed(),6),start).state;
  for (const role of Object.keys(STAFF_ROLES)) state = hire(state,role);
  const worker = state.branches[0].workers[0];
  state = act(state,'train-worker',worker.id);
  assert.equal(state.cash,seed().cash-250000-TRAINING_COST);
  state = reload(state);
  state = advance(state,TRAINING_TIME);
  const wages = Object.values(STAFF_ROLES).map(role=>role.wage).sort();
  assert.deepEqual(state.ledger.filter(row=>row.category==='wages').map(row=>row.amount).sort(),wages);
  assert.equal(synchronize(state,state.clock.wall).state.cash,state.cash);
  assert.ok(state.branches[0].workers[0].skill>worker.skill);
  state = act(state,'transfer-worker',worker.id,2);
  const route = shippingQuote(34,6);
  assert.ok(state.branches[1].workers[0].travel);
  assert.equal(state.ledger.filter(row=>row.category==='staff_transfer').length,1);
  state = advance(reload(state),route.days*DAY_MS);
  assert.equal(state.branches[1].workers[0].travel,undefined);
  state = act(state,'fire-worker',worker.id,undefined,2);
  assert.equal(state.branches[1].workers.length,0);
});

test('branch shipping reserves a slot immediately and charges into bike basis once across save and delivery',()=>{
  let state = synchronize(office(seed(),6),start).state;
  for (const id of ['a','b','c']) {
    state = act(state,'buy',id);
    if (id!=='c') state = act(state,'transfer-bike',id,2);
  }
  const route = shippingQuote(34,6);
  const target = state.branches[1];
  assert.equal(new Set(target.garage.map(bike=>bike.slot)).size,2);
  assert.ok(target.garage.every(bike=>bike.stage==='shipping' && bike.spent===48000+route.fee));
  assert.throws(()=>act(state,'transfer-bike','c',2),/dolu/);
  const delivered = advance(reload(state),route.days*DAY_MS);
  assert.ok(delivered.branches[1].garage.every(bike=>bike.stage==='unchecked'));
  assert.equal(delivered.ledger.filter(row=>row.category==='shipping').length,2);
});

test('internal specialist uses a serial inspection queue and workshop repair pays parts once',()=>{
  let state = synchronize(seed(),start).state;
  state = hire(hire(state,'master'),'inspector');
  for (const id of ['a','b']) state = act(act(state,'buy',id),'internal-inspect',id);
  state = advance(reload(state),5*HOUR_MS);
  assert.equal(state.branches[0].garage[1].stage,'internalInspection');
  state = advance(state,10*HOUR_MS);
  const [bike,clean] = state.branches[0].garage;
  assert.equal(bike.stage,'inspected');
  assert.equal(clean.stage,'ready');
  const parts = repairQuote(bike).cost;
  state = act(state,'internal-repair','a');
  assert.equal(state.branches[0].garage[0].spent,48000+parts);
  assert.throws(()=>act(state,'internal-repair','a'));
  state = advance(reload(state),8*HOUR_MS);
  const repaired = state.branches[0].garage.find(item=>item.id==='a');
  assert.equal(repaired.stage,'ready');
  assert.ok(repaired.condition>bike.condition);
  assert.equal(repaired.lastRepair.cost,parts);
  assert.equal(state.ledger.filter(row=>row.category==='repair').length,1);
});

test('manager closes an eligible deal but keeps risky stock and respects cash and budget limits',()=>{
  let state = synchronize(seed(),start).state;
  const config = {buy:true,sell:true,maxPrice:250000,minProfit:5000,budget:1,brand:'',minCc:0,maxCc:3000};
  assert.throws(()=>act(state,'set-automation',undefined,config),/müdür/);
  state = hire(hire(state,'manager'),'sales');
  state = act(state,'set-automation',undefined,config);
  for (const id of ['b','c']) {
    state = act(state,'buy',id);
    state = act(state,'inspect',id);
    state = act(state,id==='c' ? 'list-quiet' : 'list',id);
    const bike = state.branches[0].garage.find(item=>item.id===id);
    bike.meetings.push(createBuyer(bike,state.day,0,50,100000,80000));
    bike.nextVisit = state.day+3;
  }
  const expected = state.branches[0].garage[0].meetings[0].price;
  state = advance(state,DAY_MS);
  assert.deepEqual(state.sales.map(sale=>sale.price),[expected]);
  assert.deepEqual(state.branches[0].garage.map(bike=>bike.id),['c']);
  assert.equal(state.debt,0);
  assert.equal(state.branches[0].lastAutomationDay,2);
  assert.equal(advance(state,1).sales.length,1);
});

test('manager can make a funded automatic purchase and never buys the fixed-price Easter egg',()=>{
  let state = synchronize(seed(),start).state;
  const economy = nextEconomy(state,2);
  const market = generateMarket(2,marketRandom(2),true,economy);
  const candidate = market.find(item=>!item.faults.length && !item.damageHistory.length && purchaseForecast(item,item.price,34,economy).profit>0);
  assert.ok(candidate);
  state = hire(state,'manager');
  state = act(state,'set-automation',undefined,{
    buy:true,sell:false,maxPrice:candidate.price,minProfit:0,budget:purchaseForecast(candidate,candidate.price,34,economy).total,
    brand:'',minCc:0,maxCc:3000,
  });
  state = advance(state,DAY_MS);
  const garage = state.branches[0].garage;
  assert.ok(garage.length>0);
  assert.ok(garage.every(item=>item.price<=candidate.price && item.name!=='KTM 1390 Super Duke R'));
  assert.ok(garage.reduce((total,item)=>total+purchaseForecast(item,item.price,34,economy).total,0)<=purchaseForecast(candidate,candidate.price,34,economy).total);
  assert.equal(state.debt,0);
  assert.equal(reload(state).cash,state.cash);
});
