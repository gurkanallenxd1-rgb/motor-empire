import test from 'node:test';
import assert from 'node:assert/strict';
import { DAY_MS,HOUR_MS } from './clock.mjs';
import { assets,CLOCK_STORAGE_KEY,loadGame,newGame,perform,realizedSales,synchronize } from './game.mjs';
import { repairQuote,roadValue } from './damage.mjs';
import { financeReport } from './finance.mjs';
import { accidentAt,activePolicy,buyerComplaint,examine,legacyDamageRecords,PACKAGES,policyQuote,
  seedRisk,serviceQuote,visibleListing } from './risk.mjs';
import { createBuyer } from './trade.mjs';

const START = 1_800_000_000_000;
const stock = {id:'audit',name:'Yamaha R25',year:2021,km:22000,price:28000,value:99000,
  condition:92,faults:[],color:'#3564ba',colorName:'Mavi'};
const owned = (overrides = {})=>({...stock,stage:'ready',slot:0,spent:30000,...overrides});
const market = (overrides = {})=>({...newGame(),cash:180000,listings:[],...overrides});
const start = state=>synchronize(state,START).state;
const advance = (state,ms)=>synchronize(state,state.clock.wall+ms);
const run = (state,...action)=>perform(state,...action).state;
const bike = state=>state.branches[0].garage[0];
const report = state=>financeReport(state,assets(state),0);
function garageReady(item) {
  const state = market();
  state.branches[0].garage = [item];
  return start(state);
}
function fixtureCollision(policies = []) {
  for (let id=0;id<2000;id++) {
    const item = owned({id:'crash'+id,policies});
    const event = accidentAt(item,1,DAY_MS-1,'rental');
    if (event?.codes.includes('grenaj') && !event.codes.includes('masa')) return item;
  }
  throw new Error('no collision fixture');
}

test('packages complete in game hours and only reveal checks in scope; agreed purchase capitalizes all fees',()=>{
  const listing = {...stock,condition:49,faults:['saseIslem','motor','lastik'],damageHistory:['saseIslem','motor'],
    disclosure:{trust:.11,condition:100,hidden:['saseIslem','motor','lastik']}};
  let state = start(market({listings:[listing]}));
  assert.equal(visibleListing(state.listings[0]).condition,100);
  assert.deepEqual(visibleListing(state.listings[0]).faults,[]);
  state = run(state,'pre-inspect',listing.id,'basic');
  assert.throws(()=>run(state,'buy',listing.id),/hazır değil/);
  assert.throws(()=>run(state,'pre-inspect',listing.id,'full'),/bekleniyor/);
  state = advance(state,2*HOUR_MS-1).state;
  assert.equal(state.listings[0].inspections[0].result,undefined);
  state = advance(state,1).state;
  assert.deepEqual(visibleListing(state.listings[0]).faults,['lastik']);
  assert.equal(examine(listing,'detailed').find(area=>area.area==='frame').checked,false);
  assert.equal(examine(listing,'full').length,8);
  state = run(state,'pre-inspect',listing.id,'full');
  state = advance(state,6*HOUR_MS).state;
  assert.deepEqual(visibleListing(state.listings[0]).faults,listing.faults);
  assert.equal(visibleListing(state.listings[0]).condition,49);
  state = run(state,'meet-seller',listing.id);
  const {id,price} = state.listings[0].seller;
  state = run(state,'buy-negotiated',listing.id,id);
  assert.equal(bike(state).spent,price+PACKAGES.basic.cost+PACKAGES.full.cost);
  assert.equal(bike(state).stage,'inspected');
  assert.equal(bike(state).condition,49);
  assert.deepEqual(bike(state).faults,listing.faults);
  assert.equal(report(state).totals.profit,0);
  assert.ok(state.ledger.filter(row=>row.category==='inspection').every(row=>row.allocation==='stock'));
  assert.throws(()=>run(state,'inspect',listing.id),/yapılamıyor/);
});

test('abandoned inspection is an operating cost once; archived evidence survives a market refresh',()=>{
  const listing = {...stock,faults:['lastik'],disclosure:{trust:.1,hidden:['lastik'],condition:96}};
  let state = start(market({listings:[listing]}));
  state = run(state,'pre-inspect',listing.id,'basic');
  assert.equal(report(state).totals.profit,0);
  state = advance(state,2*DAY_MS).state;
  assert.ok(!state.listings.some(item=>item.id===listing.id));
  assert.equal(state.inspectionArchive[0].reports[0].result.find(row=>row.area==='tires').codes[0],'lastik');
  const inspection = state.ledger.find(row=>row.category==='inspection');
  assert.equal(inspection.allocation,'operating');
  assert.equal(inspection.recognizedDay,2);
  assert.equal(report(state).totals.profit,-1100);
  assert.equal(advance(state,DAY_MS).state.ledger.filter(row=>row.category==='inspection').length,1);
});

test('seller disclosure is deterministic and market records treat total loss as serious structural damage',()=>{
  const damaged = {...stock,faults:['ayna','motor'],damageHistory:['ayna','motor']};
  assert.deepEqual(seedRisk(structuredClone(damaged)),seedRisk(structuredClone(damaged)));
  const listings = newGame().listings;
  assert.ok(listings.some(item=>item.disclosure.hidden.length));
  assert.ok(listings.some(item=>!item.disclosure.hidden.length));
  assert.ok(listings.filter(item=>item.faults.includes('pert')).every(item=>
    item.faults.some(code=>['motor','saseDegisim','agir'].includes(code))));
});

test('parked stock needs no policy; traffic insurance is required throughout rental and test ride',()=>{
  let state = garageReady(owned());
  assert.throws(()=>run(state,'rent',stock.id,3),/trafik sigortası/);
  assert.throws(()=>run(state,'ride',stock.id),/trafik sigortası/);
  const parked = advance(state,12*DAY_MS).state;
  assert.equal(bike(parked).damageRecords,undefined);
  assert.ok(!parked.ledger.some(entry=>entry.category==='insurance_premium'));
  state = run(state,'policy',stock.id,'casco');
  assert.throws(()=>run(state,'rent',stock.id,1),/trafik sigortası/);
  state = run(state,'policy',stock.id,'traffic');
  assert.throws(()=>run(state,'policy',stock.id,'traffic'),/düzenlenemiyor/);
  assert.equal(policyQuote(bike(state),'traffic').deductible,0);
  assert.ok(activePolicy(bike(state),'traffic',0));
  const nearExpiry = advance(state,29*DAY_MS).state;
  assert.throws(()=>run(nearExpiry,'rent',stock.id,3),/trafik sigortası/);
  state = run(state,'ride',stock.id);
  const ride = advance(state,HOUR_MS);
  assert.equal(ride.summary.rides,1);
  assert.equal(bike(ride.state).km,stock.km+12);
});

test('collision uses only policies active at the accident and an approved claim reimburses once',()=>{
  const item = fixtureCollision();
  let state = garageReady(item);
  state = run(run(state,'policy',item.id,'traffic'),'policy',item.id,'casco');
  state = run(state,'rent',item.id,3);
  const crashed = advance(state,DAY_MS);
  assert.equal(crashed.summary.accidents,1);
  state = crashed.state;
  assert.equal(bike(state).stage,'inspected');
  const incident = bike(state).damageRecords.at(-1);
  assert.ok(incident.casco);
  assert.ok(incident.trafficPayout>0);
  assert.equal(state.ledger.filter(row=>row.category==='traffic_payout').length,1);
  assert.equal(state.ledger.filter(row=>row.category==='service').length,0);
  assert.equal(state.ledger.filter(row=>row.category==='insurance_payout').length,0);
  const quote = serviceQuote(bike(state),'insured');
  assert.ok(quote.eligible && quote.payout<quote.cost);
  const spent = bike(state).spent;
  state = run(state,'repair',item.id,'insured');
  assert.equal(bike(state).stage,'claiming');
  assert.throws(()=>run(state,'repair',item.id,'insured'),/Önce ekspertiz/);
  state = advance(state,4*HOUR_MS-1).state;
  assert.equal(state.ledger.filter(row=>row.category==='insurance_payout').length,0);
  state = advance(state,1).state;
  assert.equal(bike(state).spent,spent+quote.cost-quote.payout);
  assert.equal(state.ledger.filter(row=>row.category==='insurance_payout').length,1);
  state = advance(state,quote.hours*HOUR_MS).state;
  assert.equal(bike(state).stage,'ready');
  assert.equal(bike(state).damageRecords.at(-1).source,'insured');
  assert.equal(bike(state).lastRepair.cost,quote.cost-quote.payout);
  assert.ok(bike(state).damageHistory.length);
  assert.ok(!serviceQuote(bike(state),'insured').eligible);
  assert.equal(advance(state,DAY_MS).state.ledger.filter(row=>row.category==='insurance_payout').length,1);
});

test('traffic insurance cannot cover own damage and a newly bought casco cannot cover an earlier incident',()=>{
  const item = fixtureCollision();
  let state = garageReady(item);
  state = run(state,'policy',item.id,'traffic');
  state = run(state,'rent',item.id,1);
  state = advance(state,DAY_MS).state;
  assert.ok(state.ledger.some(row=>row.category==='traffic_payout'));
  assert.ok(!serviceQuote(bike(state),'insured').eligible);
  state = run(state,'policy',item.id,'casco');
  assert.throws(()=>run(state,'repair',item.id,'insured'),/kasko onarımı kullanılamıyor/);
  assert.ok(!bike(state).damageRecords.at(-1).casco);
});

test('authorized and private service preserve records and differ in price, time and resale value',()=>{
  const item = owned({condition:61,stage:'inspected',faults:['saseIslem'],damageHistory:['saseIslem']});
  const initial = garageReady(item);
  const expensive = serviceQuote(item,'authorized');
  const cheap = serviceQuote(item,'private');
  assert.ok(expensive.cost>cheap.cost);
  assert.ok(expensive.hours<cheap.hours);
  const repaired = [ 'private','authorized' ].map(method=>bike(advance(run(initial,'repair',item.id,method),3*DAY_MS).state));
  assert.equal(repaired[0].stage,'ready');
  assert.ok(roadValue(repaired[1])>roadValue(repaired[0]));
  assert.ok(roadValue(repaired[1])<item.value);
  assert.equal(legacyDamageRecords(repaired[1])[0].method,'authorized');
  assert.equal(repaired[1].damageHistory[0],'saseIslem');
});

test('concealment can refund without overbooking, reverses costs once, and preserves damage on return',()=>{
  let item, meeting;
  for(let i=0;i<300;i++) {
    item = owned({id:'hidden'+i,disclosureMode:'conceal',damageHistory:['motor'],ask:65000,nextVisit:1});
    meeting = createBuyer(item,1,0,50,65000);
    if (buyerComplaint(item,`${meeting.id}:settled`)?.returnBike) break;
  }
  item.stage='listed';
  item.meetings=[meeting];
  let state = garageReady(item);
  state = run(state,'sell',item.id,meeting.id);
  assert.ok(state.sales[0].complaint.refund);
  state.branches[0].garage.push(owned({id:'a'}),owned({id:'b',slot:1}));
  const refund = advance(state,2*DAY_MS);
  state = refund.state;
  assert.equal(refund.summary.complaints,1);
  assert.equal(state.waitingReturns.length,1);
  assert.equal(state.branches[0].garage.length,2);
  assert.equal(state.ledger.filter(row=>row.category==='refund').length,1);
  assert.deepEqual(realizedSales(state.sales),{cost:0,profit:0,revenue:0});
  assert.equal(report(state).totals.salesCost,0);
  assert.equal(report(state).totals.salesRevenue,0);
  assert.ok(state.trade.reputation<50);
  assert.deepEqual(state.sales[0].damageRecords[0].codes,['motor']);
  assert.throws(()=>run(state,'take-return',item.id),/boş garaj/);
  state.branches[0].garage.pop();
  state = run(state,'take-return',item.id);
  assert.equal(state.waitingReturns.length,0);
  assert.deepEqual(state.branches[0].garage[1].damageHistory,['motor']);
  assert.equal(advance(state,DAY_MS).state.ledger.filter(row=>row.category==='refund').length,1);
});

test('v0.11 timed saves migrate without rewriting the old key or dropping reserved shipping on its arrival day',()=>{
  const seed = start(market({listings:[{...stock,province:41}]}));
  let state = advance(seed,HOUR_MS).state;
  state = run(state,'buy',stock.id);
  state = advance(state,DAY_MS-2).state;
  assert.equal(state.day,2);
  assert.equal(bike(state).stage,'shipping');
  const raw = JSON.stringify({...state,version:8});
  const storage = {getItem:key=>key===CLOCK_STORAGE_KEY ? raw : null};
  const loaded = loadGame(storage);
  assert.equal(loaded.version,9);
  assert.deepEqual(loaded.clock,state.clock);
  assert.deepEqual(bike(loaded),bike(state));
  assert.equal(advance(loaded,2).state.branches[0].garage[0].stage,'unchecked');
});

test('honest disclosure raises satisfaction, while a concealed sale can lead to compensation without a return',()=>{
  let listing, meeting;
  for (let i=0;i<300;i++) {
    listing = owned({id:'compensation'+i,disclosureMode:'conceal',damageHistory:['motor'],ask:68000,nextVisit:1});
    meeting = createBuyer(listing,1,0,50,65000);
    const complaint = buyerComplaint(listing,`${meeting.id}:settled`);
    if (complaint && !complaint.returnBike) break;
  }
  const starting = mode=>garageReady({...listing,stage:'listed',disclosureMode:mode,meetings:[meeting]});
  const concealed = run(starting('conceal'),'sell',listing.id,meeting.id);
  const open = run(starting('disclose'),'sell',listing.id,meeting.id);
  assert.ok(open.trade.history[0].satisfaction>concealed.trade.history[0].satisfaction);
  assert.equal(open.sales[0].complaint,undefined);
  const later = advance(concealed,3*DAY_MS).state;
  const {price,spent,compensation} = later.sales[0];
  assert.ok(compensation>0);
  assert.equal(later.ledger.filter(row=>row.category==='compensation').length,1);
  assert.equal(later.ledger.filter(row=>row.category==='refund').length,0);
  assert.equal(report(later).totals.profit,price-spent-compensation-750);
});
