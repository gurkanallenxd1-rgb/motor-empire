import assert from 'node:assert/strict';
import test from 'node:test';
import { rankMarket } from './automation.mjs';
import { DAY_MS,HOUR_MS } from './clock.mjs';
import { newGame,generateMarket,loadGame,perform,purchaseForecast,saveGame,synchronize } from './game.mjs';
import { createBuyer } from './trade.mjs';

const wall = 1800000000000;
const apply = (state,...args)=>perform(state,...args).state;
const tick = (state,ms)=>synchronize(state,state.clock.wall+ms).state;
const initial = ()=>synchronize({...newGame(),cash:200000,listings:[]},wall).state;
const getBike = state=>state.branches[0].garage[0];
const report = state=>state.branches[0].autoReport;
const config = {maxPrice:150000,minProfit:0,budget:150000,reserve:20000,brand:'',minCc:0,maxCc:3000,
  buy:false,inspect:false,repair:false,list:false,negotiate:false,sell:false};
const listing = (id,price,faults=[])=>({id,name:'Yamaha R25',year:2021,km:22000,price,value:110000,province:34,
  condition:faults.length ? 75 : 100,faults,damageHistory:[],color:'#3560ab',colorName:'Mavi'});
const hire = (state,...roles)=>roles.reduce((current,role)=>apply(current,'hire-worker',undefined,role),state);
const configure = (state,settings)=>apply(state,'set-automation',undefined,{...config,...settings});
function reload(state) {
  const data = new Map();
  const storage = {getItem:key=>data.get(key) ?? null,setItem:(key,value)=>data.set(key,value)};
  saveGame(storage,state);
  return loadGame(storage);
}

test('all suitable ads compete and best projected deal ranks first despite input order',()=>{
  const damaged = listing('repairable',52000,['lastik']);
  const safe = listing('best',48000);
  const expensive = listing('first',70000);
  const pinned = {...listing('pinned',30000),seller:{status:'open'}};
  const {candidates,rejected} = rankMarket([expensive,damaged,safe,pinned],{...config,repair:true},purchaseForecastAdapter);
  assert.equal(candidates[0].item.id,'best');
  assert.ok(candidates[0].roi>candidates.at(-1).roi);
  assert.deepEqual(rejected.map(row=>row.id),['pinned']);
});

function purchaseForecastAdapter(item) {
  return purchaseForecast(item);
}

test('manager buys the top candidate and accounts for reserve and forecasted costs',t=>{
  const random = ()=>{
    let value = 17;
    return ()=>((value = (Math.imul(1664525,value)+1013904223)>>>0)/2**32);
  };
  const settings = {...config,buy:true,repair:true};
  let state = hire(initial(),'manager');
  const manager = state.branches[0].workers[0];
  const {candidates} = rankMarket(generateMarket(2,random()),settings,purchaseForecastAdapter,null,manager);
  const top = candidates[0];
  assert.ok(top);
  settings.budget = top.total;
  settings.reserve = 20000;
  state = configure({...state,cash:settings.reserve+top.total+1500},settings);
  t.mock.method(Math,'random',random());
  state = tick(state,DAY_MS);
  assert.equal(getBike(state).id,top.item.id);
  assert.ok(state.cash>=settings.reserve);
  assert.ok(report(state).rejectionCounts['Günlük alım bütçesi']);
  assert.equal(reload(state).branches[0].autoReport.history[0].id,top.item.id);
});

test('staff can inspect, repair, list, bargain and sell between saves with each stage accounted for once',()=>{
  let state = initial();
  state.listings = [listing('work',48000,['lastik'])];
  state = apply(state,'buy','work');
  state = configure(hire(state,'manager','inspector','master','technician','apprentice','sales'),{
    inspect:true,repair:true,list:true,negotiate:true,sell:true,
  });
  state = tick(state,DAY_MS);
  assert.equal(getBike(state).stage,'internalInspection');
  state = tick(reload(state),16*HOUR_MS);
  const bike = getBike(state);
  assert.equal(bike.stage,'listed');
  assert.equal(bike.lastRepair.cost,5800);
  assert.deepEqual(report(state).history.map(row=>row.step),['list','repair','inspect']);
  bike.nextVisit = state.day+5;
  const meeting = createBuyer({...bike,tradeStrategy:undefined},state.day,0,50,bike.ask,{name:'Deniz Kaya',price:53000});
  bike.meetings = [{...meeting,limit:80000,patience:4,profile:{...meeting.profile,skill:0}}];
  state = tick(state,DAY_MS);
  assert.ok(report(state).history.some(item=>item.step==='negotiate'));
  assert.ok(report(state).history.some(item=>item.step==='sell'));
  assert.equal(state.sales.length,1);
  assert.ok(state.sales[0].price>=state.sales[0].spent);
  assert.equal(state.ledger.filter(row=>row.category==='repair').length,1);
  assert.equal(tick(state,1).sales.length,1);
});

test('missing personnel and manual opt-out stop the appropriate stage',()=>{
  let state = initial();
  state.listings = [listing('manual',48000)];
  state = apply(state,'buy','manual');
  state = configure(hire(state,'manager'),{inspect:true,list:true});
  state = tick(state,DAY_MS);
  assert.match(report(state).status,/Ekspertiz uzmanı/);
  state = apply(hire(state,'inspector'),'pause-bike-automation','manual');
  state = tick(reload(state),DAY_MS);
  assert.equal(getBike(state).stage,'unchecked');
  assert.equal(report(state).history.length,0);
  state = apply(state,'pause-bike-automation','manual');
  state = tick(state,DAY_MS);
  assert.equal(getBike(state).stage,'internalInspection');
  state = tick(state,10*HOUR_MS);
  assert.match(report(state).status,/Satış danışmanı/);
  assert.equal(getBike(state).stage,'ready');
});

test('cash reserve prevents scheduled repairs and active player meetings stay untouched',()=>{
  let state = initial();
  state.listings = [listing('pending',48000,['lastik']),listing('held',40000)];
  state = apply(apply(state,'buy','pending'),'inspect','pending');
  state = apply(apply(apply(state,'buy','held'),'inspect','held'),'list','held');
  const saleBike = state.branches[0].garage.find(bike=>bike.id==='held');
  const offer = createBuyer(saleBike,state.day,0,50,saleBike.ask,{name:'Deniz Kaya',price:85000});
  saleBike.meetings = [offer];
  saleBike.nextVisit = state.day+10;
  state = apply(state,'hold-buyer','held',offer.id);
  state = configure(hire(state,'manager','master','sales'),{reserve:107500,repair:true,negotiate:true,sell:true});
  state = tick(state,DAY_MS);
  assert.match(report(state).status,/nakit rezervi/);
  assert.equal(getBike(state).stage,'inspected');
  assert.equal(state.sales.length,0);
  assert.equal(state.branches[0].garage[1].meetings[0].round,0);
  assert.equal(state.ledger.filter(row=>row.category==='repair').length,0);
});
