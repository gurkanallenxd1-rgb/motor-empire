import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame,newGame,perform,PREVIOUS_STORAGE_KEY,saveGame,STORAGE_KEY } from './game.mjs';
import { arrive,createBuyer,isActive,tradeSummary,updateCounter } from './trade.mjs';

const stock = {id:'demo',name:'Honda PCX 125',year:2023,km:19000,condition:93,price:20000,value:35000,faults:['akü']};
function fixture() {
  const initial=newGame();
  initial.listings=[stock];
  initial.branches[0].garage=[{...stock,id:'owned',slot:0,spent:24000,stage:'ready'}];
  return initial;
}
const action=(state,type,id,amount,branch)=>perform(state,type,id,amount,branch).state;
const reload=state=>{
  const memory=new Map();
  const storage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)};
  saveGame(storage,state);
  return loadGame(storage);
};

test('buyer arrivals respond to reputation, condition, price and mileage',()=>{
  const a={...stock,ask:32000,nextVisit:2,meetings:[]};
  assert.equal(arrive(a,1,100,32550),0);
  assert.equal(arrive(a,2,100,32550),3);
  const comparison=(changes,rep)=>{
    let count=0;
    for(let day=2;day<80;day+=1) count+=arrive({...a,...changes,meetings:[]},day,rep,32550);
    return count;
  };
  assert.ok(comparison({},90)>comparison({},20));
  assert.ok(comparison({},70)>comparison({km:100000,condition:62,ask:60000},70));
  assert.ok(createBuyer(a,2,0,95,32550).limit>createBuyer(a,2,0,10,32550).limit);
  const roles=new Set(Array.from({length:160},(_,index)=>createBuyer(a,7,index,50,32550).profile.type));
  assert.equal(roles.size,8);
});

test('accepted counter persists through reload without income until sale and cannot be reused',()=>{
  let state=action(fixture(),'list','owned',26000);
  assert.equal(state.branches[0].garage[0].meetings.length,0);
  while(!state.branches[0].garage[0].meetings.length && state.day<35) state=action(state,'advance');
  const next=state.branches[0].garage[0].meetings[0];
  assert.ok(next);
  const price=next.limit;
  const cash=state.cash;
  state=action(state,'counter','owned',{meetingId:next.id,price});
  assert.equal(state.cash,cash);
  assert.equal(state.sales.length,0);
  state=reload(state);
  const meeting=state.branches[0].garage[0].meetings[0];
  assert.equal(meeting.status,'agreed');
  assert.equal(meeting.round,1);
  assert.equal(meeting.price,price);
  assert.throws(()=>action(state,'counter','owned',{meetingId:meeting.id,price}),/verilemez/);
  state=action(state,'sell','owned',meeting.id);
  assert.equal(state.cash,cash+price);
  assert.equal(state.sales[0].price,price);
  assert.ok(state.trade.reputation>50);
  assert.equal(tradeSummary(state.trade).success,100);
  assert.ok(tradeSummary(state.trade).average>=30);
  assert.throws(()=>action(state,'sell','owned',meeting.id),/geçerli değil/);
});

test('patience falls, counter price can improve, rounds are capped, extreme offer ends negotiation',()=>{
  const base={...stock,ask:40000};
  const meeting=createBuyer(base,2,2,50,32550);
  meeting.profile.patience=5;
  meeting.patience=5;
  const original=meeting.price;
  for(let i=0;i<3;i+=1) updateCounter(meeting,meeting.limit+5);
  assert.equal(meeting.round,3);
  assert.equal(meeting.patience,2);
  assert.ok(meeting.price>original);
  assert.throws(()=>updateCounter(meeting,meeting.limit),/verilemez/);
  const hostile=createBuyer(base,2,2,50,32550);
  updateCounter(hostile,hostile.limit*2);
  assert.equal(hostile.status,'left');
  assert.equal(isActive(hostile),false);
});

test('seller counter updates price, direct purchase survives rejection and settlement charges once',()=>{
  let state=action(fixture(),'meet-seller','demo');
  const seller=state.listings[0].seller;
  assert.throws(()=>action(state,'counter','demo',{meetingId:seller.id,price:-1}),/Geçerli/);
  assert.throws(()=>action(state,'counter','demo',{meetingId:'wrong',price:15000}),/teklif/);
  assert.throws(()=>action(state,'counter','demo',{meetingId:seller.id,price:50000}),/daha düşük/);
  const counter=Math.floor(seller.limit*.95);
  const revised=action(state,'counter','demo',{meetingId:seller.id,price:counter});
  assert.ok(revised.listings[0].seller.price<stock.price);
  assert.equal(revised.listings[0].seller.status,'open');
  assert.equal(revised.listings[0].seller.patience,seller.patience-1);
  const price=seller.limit;
  const cash=state.cash;
  state=action(revised,'counter','demo',{meetingId:seller.id,price});
  assert.equal(state.cash,cash);
  state=reload(state);
  assert.equal(state.listings[0].seller.price,price);
  const paid=action(state,'buy-negotiated','demo',seller.id);
  assert.equal(paid.cash,cash-price);
  assert.equal(paid.branches[0].garage[1].spent,price);
  assert.equal(paid.trade.history[0].outcome,'bought');
  assert.throws(()=>action(paid,'buy-negotiated','demo',seller.id),/geçerli değil/);
  const rejected=action(state,'reject','demo',seller.id);
  assert.throws(()=>action(rejected,'meet-seller','demo'),/kapattı/);
  assert.equal(action(rejected,'buy','demo').cash,cash-stock.price);
});

test('migration retains previous byte string, cash, debt, inventory and legacy sale offers',()=>{
  const state=fixture();
  const {trade,...prior}=state;
  prior.version=2;
  prior.cash=90000;
  prior.debt=12000;
  prior.branches[0].staff=2;
  prior.branches[0].garage[0].stage='listed';
  prior.branches[0].garage[0].offers=[{name:'Deniz',price:30100},{name:'Ece',price:31000},{name:'Mert',price:32000}];
  prior.sales=[{name:'Test',day:1,price:35000,spent:33000}];
  const original=JSON.stringify(prior);
  const memory=new Map([[PREVIOUS_STORAGE_KEY,original]]);
  const storage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)};
  const migrated=loadGame(storage);
  assert.equal(migrated.version,3);
  assert.equal(migrated.cash,prior.cash);
  assert.equal(migrated.debt,prior.debt);
  assert.equal(migrated.branches[0].staff,2);
  assert.deepEqual(migrated.sales,prior.sales);
  assert.deepEqual(migrated.branches[0].garage[0].meetings.map(x=>x.price),[30100,31000,32000]);
  assert.equal(migrated.branches[0].garage[0].condition,stock.condition);
  saveGame(storage,migrated);
  assert.equal(memory.get(PREVIOUS_STORAGE_KEY),original);
  assert.deepEqual(JSON.parse(memory.get(STORAGE_KEY)),migrated);
});
