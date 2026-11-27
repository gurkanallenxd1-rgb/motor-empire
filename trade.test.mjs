import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame,newGame,perform,BUSINESS_STORAGE_KEY,PREVIOUS_STORAGE_KEY,saveGame,STORAGE_KEY } from './game.mjs';
import { arrive,createBuyer,isActive,negotiate,stableNumber,tradeSummary } from './trade.mjs';

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

test('automatic buyer round persists through reload and does not credit cash before sale',()=>{
  let state=action(fixture(),'list','owned',26000);
  assert.equal(state.branches[0].garage[0].meetings.length,0);
  while(!state.branches[0].garage[0].meetings.length && state.day<35) state=action(state,'advance');
  const next=state.branches[0].garage[0].meetings[0];
  assert.ok(next);
  const cash=state.cash;
  state=action(state,'negotiate','owned',next.id);
  assert.equal(state.sales.length,0);
  assert.equal(state.cash,cash);
  state=reload(state);
  const meeting=state.branches[0].garage[0].meetings[0];
  assert.equal(meeting.round,1);
  assert.equal(meeting.patience,next.patience-1);
  assert.ok(meeting.price>=next.price && meeting.price<=next.limit);
  state=action(state,'sell','owned',meeting.id);
  assert.equal(state.cash,cash+meeting.price);
  assert.equal(state.sales[0].price,meeting.price);
  assert.ok(state.trade.reputation>50);
  assert.equal(tradeSummary(state.trade).success,100);
  assert.throws(()=>action(state,'sell','owned',meeting.id),/geçerli değil/);
});

test('rounds cap at three, prices move in the correct direction, and refusal and departure are possible',()=>{
  const base={...stock,ask:40000};
  let refusals=0, departures=0, movements=0;
  for(let index=0;index<150;index+=1){
    const meeting=createBuyer(base,2,index,50,32550);
    for(let turn=0;turn<3&&isActive(meeting)&&meeting.patience>0;turn+=1) {
      const previous=meeting.price;
      const patience=meeting.patience;
      negotiate(meeting);
      assert.equal(meeting.patience,patience-1);
      assert.ok(meeting.price>=previous && meeting.price<=meeting.limit);
      if(meeting.status==='left')departures+=1;
      else if(meeting.price===previous)refusals+=1;
      else movements+=1;
    }
    assert.throws(()=>negotiate(meeting),/hakkı kalmadı/);
  }
  assert.ok(refusals&&departures&&movements);
});

test('seller discounts persist and settlement charges the displayed price once',()=>{
  const initial=fixture();
  // Pick a deterministic ID that yields a first-round discount.
  for(let i=0;i<50;i+=1){
    const id='demo'+i;
    if(stableNumber('seller:'+id+':1:automatic')%100 > 20) { initial.listings=[{...stock,id}];break; }
  }
  const id=initial.listings[0].id;
  const state=action(initial,'meet-seller',id);
  const original=state.listings[0].seller;
  assert.throws(()=>action(state,'negotiate',id,'wrong'),/teklif/);
  const next=reload(action(state,'negotiate',id,original.id));
  const seller=next.listings[0].seller;
  assert.ok(seller.price<stock.price && seller.price>=seller.limit);
  assert.equal(seller.patience,original.patience-1);
  assert.equal(next.cash,state.cash);
  const paid=action(next,'buy-negotiated',id,seller.id);
  assert.equal(paid.cash,state.cash-seller.price);
  assert.equal(paid.branches[0].garage[1].spent,seller.price);
  assert.throws(()=>action(paid,'buy-negotiated',id,seller.id),/geçerli değil/);
  assert.throws(()=>action(paid,'buy',id),/açık değil/);
  assert.equal(action(action(next,'reject',id,seller.id),'buy',id).cash,state.cash-stock.price);
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
  const memory=new Map([[BUSINESS_STORAGE_KEY,original]]);
  const storage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)};
  const migrated=loadGame(storage);
  assert.equal(migrated.version,9);
  assert.equal(migrated.cash,prior.cash);
  assert.equal(migrated.debt,prior.debt);
  assert.equal(migrated.branches[0].staff,2);
  assert.deepEqual(migrated.sales,prior.sales);
  assert.deepEqual(migrated.branches[0].garage[0].meetings.map(x=>x.price),[30100,31000,32000]);
  assert.equal(migrated.branches[0].garage[0].condition,stock.condition);
  saveGame(storage,migrated);
  assert.equal(memory.get(BUSINESS_STORAGE_KEY),original);
  assert.deepEqual(JSON.parse(memory.get(STORAGE_KEY)),migrated);
});

test('v0.6 migration retains agreed price, a spent round and prior storage while replacing a non-factory paint',()=>{
  const prior=fixture();
  prior.version=3;
  prior.listings=[{...stock,name:'KTM Duke 390',year:2023,color:'#437b4b',colorName:'Yeşil'}];
  const seller=action({...prior,version:4},'meet-seller','demo').listings[0].seller;
  prior.listings[0].seller={...seller,status:'agreed',round:1,patience:seller.patience-1,price:seller.limit};
  prior.cash=82732;
  prior.trade.reputation=74;
  const text=JSON.stringify(prior);
  const memory=new Map([[PREVIOUS_STORAGE_KEY,text]]);
  const storage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)};
  const migrated=loadGame(storage);
  assert.equal(migrated.cash,82732);
  assert.equal(migrated.trade.reputation,74);
  assert.deepEqual(migrated.listings[0].seller,prior.listings[0].seller);
  assert.notEqual(migrated.listings[0].colorName,'Yeşil');
  assert.throws(()=>action(migrated,'negotiate','demo',seller.id),/hakkı kalmadı/);
  saveGame(storage,migrated);
  assert.equal(memory.get(PREVIOUS_STORAGE_KEY),text);
});
