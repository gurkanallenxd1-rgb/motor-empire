import test from 'node:test';
import assert from 'node:assert/strict';
import { characterFor, chance, complaintCost, recallCustomer, reputationTier } from './characters.mjs';
import { conditionBreakdown, repairQuote, roadValue } from './damage.mjs';
import { financeReport, saleNet } from './finance.mjs';
import { DAY_MS,HOUR_MS } from './clock.mjs';
import { assets,loadGame,newGame,perform,realizedSales,saveGame,synchronize } from './game.mjs';
import { buyerComplaint, serviceQuote } from './risk.mjs';
import { createBuyer,createSeller,negotiate,observeBuyer } from './trade.mjs';

const START=1_800_000_000_000;
const fixture={id:'workshop',name:'Yamaha R25',year:2021,km:22000,condition:71,price:25000,value:90000,
  spent:27000,slot:0,stage:'inspected',faults:['grenaj','saseIslem','sanziman'],damageHistory:['saseIslem','grenaj','sanziman'],
  garageInspection:{package:'full',title:'Garaj ekspertizi',result:[],completedDay:1}};
const act=(state,...args)=>perform(state,...args).state;
const tick=(state,ms)=>synchronize(state,state.clock.wall+ms);
const start=(bike=fixture)=>{
  const state={...newGame(),cash:180000,listings:[]};
  state.branches[0].garage=[structuredClone(bike)];
  return synchronize(state,START).state;
};
function reload(state) {
  const items = new Map();
  const storage = {getItem:key=>items.get(key) ?? null,setItem:(key,value)=>items.set(key,value)};
  saveGame(storage,state);
  return loadGame(storage);
}
const bikeOf=state=>state.branches[0].garage[0];

test('persistent character pool varies job-independent traits and keeps informed seller market floor',()=>{
  const profiles=Array.from({length:240},(_,i)=>characterFor('profile-'+i));
  assert.equal(new Set(profiles.map(item=>item.type)).size,8);
  for (const group of new Set(profiles.map(item=>item.type))) {
    assert.ok(new Set(profiles.filter(item=>item.type===group).map(item=>item.mechanical)).size>2);
  }
  assert.deepEqual(characterFor(profiles[10].id),profiles[10]);
  let sellerSeed;
  for (let i=0;i<200;i++) {
    const seed='sale-'+i;
    if (createSeller({...fixture,characterSeed:seed,price:60000},1,60000).profile.knowledge>=65) {sellerSeed=seed;break;}
  }
  assert.ok(sellerSeed);
  const item={...fixture,characterSeed:sellerSeed,price:60000};
  const informed=createSeller({...item,urgency:'patient'},1,70000);
  const urgent=createSeller({...item,urgency:'urgent'},20,70000);
  assert.equal(informed.profile.id,urgent.profile.id);
  assert.ok(informed.limit>urgent.limit);
  negotiate(informed,1000);
  assert.equal(informed.round,1);
  assert.notEqual(informed.status,'agreed');
});

test('five strategies preserve condition and records, while proof and appearance have different effects',()=>{
  const original=start();
  const before=roadValue(fixture);
  const method=(state,strategy)=>act(state,'list-strategy',fixture.id,{strategy,price:40000});
  const damaged=method(original,'damaged');
  assert.equal(bikeOf(damaged).stage,'listed');
  assert.deepEqual(bikeOf(damaged).damageHistory,fixture.damageHistory);
  assert.equal(bikeOf(act(damaged,'unlist',fixture.id)).stage,'inspected');
  const documented=method(original,'documented');
  assert.ok(roadValue(bikeOf(documented))>before);
  const concealed=method(original,'conceal');
  assert.equal(bikeOf(concealed).disclosureMode,'conceal');
  let cosmetic=method(original,'cosmetic');
  assert.ok(conditionBreakdown(bikeOf(cosmetic)).visual>conditionBreakdown(fixture).visual);
  assert.equal(conditionBreakdown(bikeOf(cosmetic)).mechanical,conditionBreakdown(fixture).mechanical);
  assert.deepEqual(bikeOf(cosmetic).faults,fixture.faults);
  assert.equal(roadValue(bikeOf(cosmetic)),before);
  cosmetic=method(act(cosmetic,'unlist',fixture.id),'cosmetic');
  assert.equal(cosmetic.ledger.filter(row=>row.category==='cosmetic').length,1);
  const repaired=method(start({...fixture,stage:'ready',faults:[]}), 'repaired');
  assert.deepEqual(bikeOf(repaired).damageHistory,fixture.damageHistory);
  assert.throws(()=>method(start({...fixture,garageInspection:null}),'documented'),/uygun değil/);
});

test('buyers remember answers, can detect damage, and learn contradictory statements',()=>{
  let state=act(start(),'list-strategy',fixture.id,{strategy:'conceal',price:50000});
  const bike=bikeOf(state);
  const meeting=createBuyer(bike,1,0,50,roadValue(bike));
  meeting.request='history';
  Object.assign(meeting.profile,{risk:100,knowledge:0,mechanical:0,skepticism:0});
  bike.meetings=[meeting];
  state=act(state,'answer-buyer',fixture.id,{meetingId:meeting.id,choice:'deny'});
  state=reload(state);
  const stored=bikeOf(state).meetings[0];
  const previous=stored.dialogue.suspicion;
  assert.deepEqual(stored.dialogue.answers,[{topic:'history',choice:'deny'}]);
  state=act(state,'answer-buyer',fixture.id,{meetingId:meeting.id,choice:'disclose'});
  assert.ok(bikeOf(state).meetings[0].dialogue.suspicion>previous);
  const expert=createBuyer(bike,1,0,50,roadValue(bike));
  Object.assign(expert.profile,{knowledge:100,mechanical:100,experience:30,risk:50});
  for (let i=0;i<200;i++) {
    expert.id='expert-'+i;
    if (chance(expert.id,'observe:1')<.3) break;
  }
  expert.round=1;
  const price=expert.price;
  observeBuyer(expert,bike);
  assert.ok(expert.dialogue.discovered);
  assert.ok(expert.price<price);
});

function saleScenario(strategy,reputation=50) {
  const state=act(start(),'list-strategy',fixture.id,{strategy,price:50000});
  state.trade.reputation = reputation;
  const bike=bikeOf(state);
  let meeting;
  for(let i=0;i<300;i++) {
    meeting=createBuyer(bike,1,i,50,roadValue(bike));
    if (strategy!=='conceal' || buyerComplaint(bike,`${meeting.id}:settled`)) break;
  }
  bike.meetings=[meeting];
  return {state:act(state,'sell',fixture.id,meeting.id),meeting};
}

test('honest documented sale builds reviews and reputation and the same customer can return',()=>{
  const {state,meeting}=saleScenario('documented',12);
  assert.equal(state.trade.reviews.length,1);
  assert.ok(state.trade.reviews[0].stars>=4);
  assert.ok(state.trade.reputation>12);
  assert.equal(state.sales[0].complaint,undefined);
  assert.deepEqual(state.sales[0].damageRecords.map(item=>item.codes[0]),['saseIslem','grenaj','sanziman']);
  let returning;
  const nextBike={...fixture,id:'another-stock',meetings:[],tradeStrategy:'documented'};
  for(let day=2;day<100;day++) {
    returning=recallCustomer(state.trade,nextBike,day,0);
    if (returning) {
      assert.equal(createBuyer(nextBike,day,0,50,roadValue(nextBike),undefined,state.trade).profile.id,meeting.profile.id);
      break;
    }
  }
  assert.equal(returning.id,meeting.profile.id);
  assert.equal(reputationTier(90),'Prestijli galeri');
  assert.equal(reputationTier(19),'Güvenilmez galeri');
  assert.equal(financeReport(state,assets(state),7).series[0].reputation,state.trade.reputation);
});

for(const [choice,penalty] of [['repair',2],['compensation',5],['refund',3],['dismiss',12]]) {
  test(`offline complaint waits for ${choice} then applies one cost and reputation outcome`,()=>{
    const {state}=saleScenario('conceal');
    const {id,complaint}=state.sales[0];
    assert.ok(complaint.requiresDecision);
    const before=reload(tick(state,complaint.due-1).state);
    assert.ok(before.sales[0].complaint);
    const opened=reload(tick(before,1).state);
    assert.ok(opened.sales[0].openComplaint);
    assert.equal(opened.sales[0].complaintResult,undefined);
    assert.equal(opened.trade.reputation,state.trade.reputation);
    const original=opened.sales[0];
    const cost=complaintCost(original,choice,repairQuote);
    if (choice==='refund') opened.branches[0].garage=[{...fixture,id:'occupied-a'},{...fixture,id:'occupied-b',slot:1}];
    const closed=reload(act(opened,'resolve-complaint',id,choice));
    assert.equal(closed.sales[0].complaintResult.outcome,choice);
    assert.equal(closed.sales[0].complaintResult.amount,cost);
    assert.equal(closed.cash,opened.cash-cost);
    assert.equal(closed.trade.reputation,opened.trade.reputation-penalty);
    assert.throws(()=>act(closed,'resolve-complaint',id,choice),/açık bir şikâyet/);
    assert.equal(saleNet(closed.sales[0]),realizedSales(closed.sales).profit);
    const finances=financeReport(closed,assets(closed),0).afterSales;
    assert.equal(finances.riskyProfit,saleNet(closed.sales[0]));
    assert.equal(finances.complaintOutflow,cost);
    assert.equal(finances.complaintLoss,choice==='refund' ? original.price-original.spent : cost);
    if (choice==='refund') {
      assert.equal(closed.waitingReturns.length,1);
      assert.deepEqual(closed.waitingReturns[0].bike.faults,fixture.faults);
      assert.equal(closed.branches[0].garage.length,2);
    }
    assert.equal(tick(closed,2*DAY_MS).state.ledger.filter(row=>row.saleId===id).length,cost ? 1 : 0);
  });
}

test('elapsed repair still completes and subsequent casco does not cover previous damage',()=>{
  const installed=act(start(),'policy',fixture.id,'casco');
  assert.equal(serviceQuote(bikeOf(installed),'insured').eligible,false);
  assert.throws(()=>act(installed,'repair',fixture.id,'insured'),/kasko/);
  const simple={...fixture,condition:88,faults:['fren']};
  let state=act(start(simple),'repair',fixture.id,'private');
  assert.equal(bikeOf(tick(state,3*HOUR_MS-1).state).stage,'repairing');
  state=tick(state,3*HOUR_MS).state;
  assert.equal(bikeOf(state).stage,'ready');
  assert.equal(state.ledger.filter(row=>row.category==='repair').length,1);
});
