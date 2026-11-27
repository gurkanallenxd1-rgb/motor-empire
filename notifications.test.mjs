import assert from 'node:assert/strict';
import test from 'node:test';
import { DAY_MS,HOUR_MS } from './clock.mjs';
import { newGame,loadGame,perform,saveGame,synchronize } from './game.mjs';
import { createBuyer } from './trade.mjs';
import { MAX_NOTICES,inbox,notify,noticeTime,saleSnapshot } from './notifications.mjs';

const wall = 1800000000000;
const bike = {id:'notice-bike',name:'Yamaha R25',year:2021,km:22000,price:48000,value:110000,province:41,
  condition:78,faults:['lastik'],damageHistory:[],color:'#3560ab',colorName:'Mavi'};
const start = ()=>synchronize({...newGame(),cash:190000,listings:[bike]},wall).state;
const act = (state,...args)=>perform(state,...args).state;
const tick = (state,ms)=>synchronize(state,state.clock.wall+ms).state;
function reload(state) {
  const data = new Map();
  const storage = {getItem:key=>data.get(key) ?? null,setItem:(key,value)=>data.set(key,value)};
  saveGame(storage,state);
  return loadGame(storage);
}

test('manual sale keeps a timestamp, original sale cost basis, negative ROI and one persistent notification',()=>{
  let state = act(start(),'buy',bike.id);
  const fee = state.branches[0].garage[0].shipping.fee;
  state = tick(state,state.branches[0].garage[0].shipping.days*DAY_MS);
  state = act(state,'inspect',bike.id);
  state = act(state,'repair',bike.id);
  state = tick(state,4*HOUR_MS);
  state = act(state,'list',bike.id);
  const stock = state.branches[0].garage[0];
  stock.meetings = [createBuyer(stock,state.day,0,50,95000,{name:'Deniz Kaya',price:40000})];
  state = act(state,'sell',bike.id,stock.meetings[0].id);
  const sale = inbox(state).items.find(item=>item.type==='sale');
  assert.equal(sale.sale.worker,'Oyuncu · Manuel satış');
  assert.equal(sale.branch,'İstanbul Merkez');
  assert.equal(sale.sale.bike.year,2021);
  assert.deepEqual(sale.sale.costs,{purchase:48000,shipping:fee,inspection:450,repair:5800});
  assert.equal(sale.sale.profit,40000-sale.sale.total);
  assert.equal(sale.sale.roi,sale.sale.profit/sale.sale.total);
  assert.match(noticeTime(sale.time),/04:00/);
  const saved = reload(state);
  assert.equal(inbox(tick(saved,DAY_MS)).items.filter(item=>item.type==='sale').length,1);
  assert.throws(()=>act(saved,'sell',bike.id,stock.meetings[0].id));
  assert.deepEqual(new Set(inbox(state).items.map(item=>item.type)),new Set(['purchase','delivery','inspection','repair','sale']));
});

test('offline automatic sale uses advisor name, respects minimum margin and does not replay',()=>{
  let state = start();
  state.listings = [{...bike,province:34,faults:[],condition:100}];
  state = act(act(act(state,'buy',bike.id),'inspect',bike.id),'list',bike.id);
  state = act(act(state,'hire-worker',undefined,'manager'),'hire-worker',undefined,'sales');
  state = act(state,'set-automation',undefined,{buy:false,sell:true,maxPrice:0,minProfit:10000,budget:0,brand:'',minCc:0,maxCc:3000});
  const stock = state.branches[0].garage[0];
  stock.nextVisit = state.day+20;
  stock.meetings = [createBuyer(stock,state.day,0,50,100000,{name:'Deniz Kaya',price:50000})];
  state = tick(state,DAY_MS);
  assert.ok(!inbox(state).items.some(item=>item.type==='sale'));
  state.branches[0].garage[0].meetings[0].price = 70000;
  state = tick(reload(state),2*DAY_MS);
  const items = inbox(reload(state)).items.filter(item=>item.type==='sale');
  assert.equal(items.length,1);
  assert.equal(items[0].sale.worker,state.branches[0].workers.find(item=>item.role==='sales').name);
  assert.equal(items[0].sale.profit,21550);
  assert.equal(noticeTime(items[0].time),'Gün 3 · 00:00');
});

test('scheduled inspection, training and complaints generate one notification per completion',()=>{
  let state = act(act(start(),'pre-inspect',bike.id,'full'),'hire-worker',undefined,'master');
  state = act(state,'train-worker',state.branches[0].workers[0].id);
  state.sales.push({id:'legacy-sale',name:bike.name,day:1,price:52000,spent:48000,branchId:1,
    complaint:{item:bike,due:DAY_MS,requiresDecision:true}});
  state = tick(reload(state),DAY_MS);
  assert.equal(state.sales[0].openComplaint.openedDay,state.day);
  const types = ['inspection','training','complaint'];
  assert.deepEqual(inbox(state).items.map(item=>item.type).sort(),types.sort());
  assert.equal(inbox(tick(reload(state),DAY_MS)).items.length,3);
});

test('category mute, filtered read and clear survive reload without sequence reuse',()=>{
  let state = start();
  assert.equal(inbox(state).sequence,0);
  notify(state,'purchase',0,{title:'Alış'});
  notify(state,'sale',0,{title:'Satış'});
  state = act(state,'notices-read-all','purchase');
  state = act(state,'notice-type','repair',false);
  state = act(state,'notice-sound',undefined,true);
  state = act(state,'notices-clear','sale');
  state = reload(state);
  assert.equal(inbox(state).items[0].read,true);
  assert.equal(inbox(state).sound,true);
  assert.equal(inbox(state).muted.repair,true);
  notify(state,'repair',0,{title:'Onarım'});
  assert.equal(inbox(state).sequence,2);
  notify(state,'delivery',0,{title:'Nakliye'});
  assert.equal(inbox(state).items[0].id,3);
  for (let i=0;i<MAX_NOTICES;i++) notify(state,'purchase',0,{title:'Yeni alış'});
  assert.equal(inbox(state).items.length,MAX_NOTICES);
});

test('older inventory retains true total and break-even ROI with no invented cost breakdown',()=>{
  const sale = saleSnapshot({...bike,spent:49000},49000);
  assert.deepEqual([sale.total,sale.profit,sale.roi,sale.costs],[49000,0,0,null]);
});

test('unchanged automation warning fires once across days and reload',()=>{
  let state = act(start(),'hire-worker',undefined,'manager');
  const manager = state.branches[0].workers[0];
  state = act(state,'set-automation',undefined,{buy:false,sell:true,maxPrice:0,minProfit:0,budget:0,brand:'',minCc:0,maxCc:3000});
  state = act(state,'fire-worker',manager.id);
  state = tick(state,DAY_MS);
  state = tick(reload(state),2*DAY_MS);
  const warnings = inbox(state).items.filter(item=>item.type==='automation');
  assert.equal(warnings.length,1);
  assert.equal(warnings[0].title,'Görevde müdür yok');
});
