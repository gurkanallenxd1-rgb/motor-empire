import test from 'node:test';
import assert from 'node:assert/strict';
import { DAY_MS,HOUR_MS } from './clock.mjs';
import { assets,loadGame,newGame,perform,realizedSales,saveGame,synchronize } from './game.mjs';
import { financeReport } from './finance.mjs';
import { accidentAt,buyerComplaint,serviceQuote,verifiedFindings } from './risk.mjs';
import { createBuyer,createSeller } from './trade.mjs';
import { createTimeStore } from './time-store.mjs';

const T = 1_800_000_000_000;
const stock = {id:'report-bike',name:'Yamaha R25',year:2021,km:22000,price:28000,value:99000,
  condition:61,faults:['saseIslem','lastik'],damageHistory:['saseIslem'],color:'#3564ba',colorName:'Mavi',
  disclosure:{trust:.13,condition:98,hidden:['saseIslem','lastik']}};
const act = (state,...args)=>perform(state,...args).state;
const tick = (state,elapsed)=>synchronize(state,state.clock.wall+elapsed);
const start = (options = {})=>synchronize({...newGame(),cash:200000,listings:[],...options},T).state;

function memory() {
  const values = new Map();
  return {getItem:key=>values.get(key) ?? null,setItem:(key,value)=>values.set(key,value)};
}
function reload(state) {
  const storage = memory();
  saveGame(storage,state);
  return loadGame(storage);
}

test('paid report finishes exactly at midnight, resumes after market expiry and restores the original seller link',()=>{
  let state = tick(start({listings:[stock]}),DAY_MS-6*HOUR_MS).state;
  state = act(state,'pre-inspect',stock.id,'full');
  const pending = reload(tick(state,6*HOUR_MS-1).state);
  assert.equal(pending.listings[0].inspections[0].result,undefined);
  assert.throws(()=>act(pending,'meet-seller',stock.id),/hazır değil/);
  const midnight = tick(pending,1).state;
  const listing = midnight.listings.find(item=>item.id===stock.id);
  assert.equal(listing.inspections[0].completedDay,2);
  assert.deepEqual(verifiedFindings(listing),['saseIslem','lastik']);
  const archived = reload(tick(midnight,4*DAY_MS).state);
  assert.ok(!archived.listings.some(item=>item.id===stock.id));
  assert.equal(archived.inspectionArchive[0].id,stock.id);
  const resumed = act(archived,'meet-seller',stock.id);
  assert.equal(resumed.inspectionArchive.length,0);
  const reopened = resumed.listings.find(item=>item.id===stock.id);
  assert.deepEqual(reopened.inspections,listing.inspections);
  assert.equal(reopened.seller.id,createSeller(stock,6).id);
  assert.ok(reopened.seller.limit<createSeller(stock,6).limit);
  assert.match(reopened.seller.speech,/Ekspertiz/);
  assert.equal(resumed.ledger.filter(row=>row.category==='inspection').length,1);
  const purchased = act(resumed,'buy-negotiated',stock.id,reopened.seller.id);
  assert.equal(purchased.branches[0].garage[0].spent,stock.price+2400);
  assert.equal(purchased.ledger.find(row=>row.category==='inspection').allocation,'stock');
});

test('new expert evidence after a used round changes the bargaining floor, not the used rights',()=>{
  let state = start({listings:[stock]});
  state = act(state,'meet-seller',stock.id);
  const id = state.listings[0].seller.id;
  state = act(state,'negotiate',stock.id,id);
  const previous = state.listings[0].seller;
  assert.equal(previous.round,1);
  state = act(tick(state,DAY_MS-HOUR_MS).state,'pre-inspect',stock.id,'full');
  state = reload(tick(state,DAY_MS+5*HOUR_MS).state);
  const next = act(state,'meet-seller',stock.id).listings.find(item=>item.id===stock.id).seller;
  for (const key of ['id','round','patience','price']) assert.equal(next[key],previous[key]);
  assert.ok(next.limit<previous.limit);
  assert.match(next.speech,/Ekspertiz/);
});

function concealedSale(returning) {
  for(let i=0;i<500;i++) {
    const bike = {...stock,id:'case'+i,stage:'listed',faults:[],disclosureMode:'conceal',ask:68000,
      damageHistory:['motor'],slot:0,spent:31000,nextVisit:1};
    const meeting = createBuyer(bike,1,0,50,65000);
    const outcome = buyerComplaint(bike,`${meeting.id}:settled`);
    if (!outcome || outcome.returnBike!==returning) continue;
    bike.meetings = [meeting];
    let state = start();
    state.branches[0].garage=[bike];
    state = tick(state,12000).state;
    const sold = act(state,'sell',bike.id,meeting.id);
    return {sold,bike,outcome};
  }
  throw new Error('Fixture must select a deterministic complaint outcome');
}

test('a deterministic refund settles at its stored game time after reload, respects capacity and stays unread',async()=>{
  const {sold,bike,outcome} = concealedSale(true);
  for (const slot of [0,1]) sold.branches[0].garage.push({...bike,id:'park'+slot,stage:'ready',slot});
  const before = reload(tick(sold,outcome.delay*DAY_MS-1).state);
  assert.equal(before.sales[0].complaintResult,undefined);
  assert.equal(before.ledger.filter(row=>row.category==='refund').length,0);
  const storage = memory();
  saveGame(storage,before);
  let tail = Promise.resolve();
  const lock = task=>{
    const result = tail.then(task);
    tail = result.catch(()=>{});
    return result;
  };
  const tab = ()=>createTimeStore(storage,lock,()=>before.clock.wall+1);
  const results = await Promise.all([tab()(),tab()()]);
  assert.equal(results.filter(item=>item.summary?.complaints===1).length,1);
  const state = loadGame(storage);
  assert.equal(state.sales[0].complaintResult.seen,false);
  assert.equal(state.sales[0].complaintResult.outcome,'refund');
  assert.equal(state.sales[0].complaintResult.destination,'waiting');
  assert.equal(state.sales[0].complaintResult.reputationLoss,12);
  assert.equal(state.ledger.filter(row=>row.category==='refund').length,1);
  assert.equal(state.branches[0].garage.length,2);
  assert.equal(state.waitingReturns.length,1);
  assert.deepEqual(realizedSales(state.sales),{cost:0,profit:0,revenue:0});
  assert.equal(financeReport(state,assets(state),0).totals.salesRevenue,0);
  assert.throws(()=>act(state,'take-return',bike.id),/boş garaj/);
  state.branches[0].garage.pop();
  const placed = act(state,'take-return',bike.id);
  assert.equal(placed.sales[0].complaintResult.destination,'garage');
  assert.deepEqual(placed.branches[0].garage[1].damageHistory,['motor']);
  const read = act(placed,'acknowledge-complaint',placed.sales[0].id);
  assert.equal(reload(read).sales[0].complaintResult.seen,true);
  assert.equal(tick(read,2*DAY_MS).state.ledger.filter(row=>row.category==='refund').length,1);
});

test('a v0.12 pending complaint with only a due day survives catch-up and compensates exactly once',()=>{
  const {sold,outcome} = concealedSale(false);
  delete sold.sales[0].complaint.due;
  const state = reload(sold);
  const result = tick(state,(outcome.delay+1)*DAY_MS);
  assert.equal(result.summary.complaints,1);
  assert.equal(result.state.sales[0].complaintResult.outcome,'compensation');
  assert.equal(result.state.sales[0].complaintResult.reputationLoss,6);
  assert.equal(result.state.waitingReturns,undefined);
  assert.equal(result.state.ledger.filter(row=>row.category==='refund').length,0);
  const once = result.state.ledger.find(row=>row.category==='compensation');
  assert.equal(once.saleId,result.state.sales[0].id);
  const finance = financeReport(result.state,assets(result.state),0);
  assert.equal(finance.totals.profit,result.state.sales[0].price-result.state.sales[0].spent-once.amount-result.summary.days*250);
  assert.equal(tick(reload(result.state),DAY_MS).state.ledger.filter(row=>row.category==='compensation').length,1);
});

test('private, authorized and insured service share the quoted time, quality and net financial cost',()=>{
  let candidate;
  for (let i=0;i<2000;i++) {
    const bike = {...stock,id:'service'+i,condition:100,damageHistory:[],faults:[],stage:'ready',spent:31000,slot:0};
    if (accidentAt(bike,1,DAY_MS-1,'rental')?.codes.length===2) {candidate=bike;break;}
  }
  assert.ok(candidate);
  const initial = start();
  initial.branches[0].garage=[candidate];
  const id = candidate.id;
  let covered = act(act(initial,'policy',id,'traffic'),'policy',id,'casco');
  covered = tick(act(covered,'rent',id,1),DAY_MS).state;
  const damaged = covered.branches[0].garage[0];
  const repaired = {};
  for (const method of ['private','authorized','insured']) {
    const quote = serviceQuote(damaged,method);
    const queued = act(covered,'repair',id,method);
    const workMs = quote.hours*HOUR_MS;
    const dueMs = quote.approval+workMs;
    const before = tick(queued,dueMs-1).state;
    assert.equal(before.branches[0].garage[0].stage,'repairing');
    const after = tick(reload(before),1).state;
    const bike = after.branches[0].garage[0];
    assert.equal(bike.stage,'ready');
    assert.equal(bike.lastRepair.cost,quote.cost-quote.payout);
    assert.equal(bike.spent,damaged.spent+quote.cost-quote.payout);
    assert.equal(after.ledger.filter(row=>row.category==='insurance_payout').length,method==='insured' ? 1 : 0);
    repaired[method] = bike.lastRepair.afterValue;
  }
  assert.ok(repaired.authorized>repaired.private);
  assert.equal(repaired.insured,repaired.authorized);
});
