import assert from 'node:assert/strict';
import test from 'node:test';
import { DAY_MS,HOUR_MS } from './clock.mjs';
import { loadGame,newGame,perform,purchaseAnalysis,saveGame,synchronize } from './game.mjs';
import { negotiate,stableNumber } from './trade.mjs';
import { purchasePreview } from './valuation.mjs';

const T = 1800000000000;
const fixture = {id:'live-prices',name:'Yamaha R25',year:2021,km:22000,price:48000,value:100000,
  province:41,condition:47,faults:['saseDegisim','lastik'],damageHistory:['saseDegisim'],
  disclosure:{trust:.11,condition:85,hidden:['saseDegisim','lastik']}};
const act = (state,...args)=>perform(state,...args).state;
const time = (state,ms)=>synchronize(state,state.clock.wall+ms).state;
function prepare() {
  return synchronize({...newGame(),listings:[fixture]},T).state;
}
function reload(state) {
  const values = new Map();
  const storage = {getItem:key=>values.get(key) ?? null,setItem:(key,value)=>values.set(key,value)};
  saveGame(storage,state);
  return loadGame(storage);
}

test('the first undetected market figure is stored before work and survives an upgraded report and archive',()=>{
  let state = prepare();
  const initial = purchaseAnalysis(state.listings[0]);
  assert.deepEqual(initial.findings,[]);
  state = act(state,'pre-inspect',fixture.id,'basic');
  assert.equal(state.listings[0].inspectionBaseline,initial.beforeInspection);
  state = reload(time(state,2*HOUR_MS+DAY_MS));
  assert.deepEqual(purchaseAnalysis(state.listings.find(bike=>bike.id===fixture.id)).findings.map(item=>item.code),['lastik']);
  state = act(state,'pre-inspect',fixture.id,'full');
  state = reload(time(state,4*DAY_MS+6*HOUR_MS));
  assert.equal(state.inspectionArchive[0].listing.inspectionBaseline,initial.beforeInspection);
  state = act(state,'meet-seller',fixture.id);
  const item = state.listings.find(bike=>bike.id===fixture.id);
  const analysis = purchaseAnalysis(item,item.seller);
  assert.equal(analysis.beforeInspection,initial.beforeInspection);
  assert.ok(analysis.difference>0);
  assert.equal(analysis.differenceShare,analysis.difference/initial.beforeInspection);
  assert.equal(item.seller.price,item.seller.anchor);
});

test('seller concession, physical damage and conditional player discount remain distinct after reload',()=>{
  let state = act(time(act(prepare(),'pre-inspect',fixture.id,'full'),6*HOUR_MS),'meet-seller',fixture.id);
  const listing = state.listings[0];
  const baseline = purchaseAnalysis(listing,listing.seller);
  assert.equal(baseline.discount,0);
  assert.ok(baseline.damageLoss>0 && baseline.damageLoss<=baseline.totalLoss);
  assert.equal(purchaseAnalysis({...fixture,faults:[],damageHistory:[]}).damageLoss,0);
  assert.equal(purchasePreview(baseline,30000).discount,18000);
  state = reload(time(act(state,'negotiate',fixture.id,listing.seller.id),2*DAY_MS));
  const resumed = state.listings.find(bike=>bike.id===fixture.id);
  const current = purchaseAnalysis(resumed,resumed.seller);
  assert.equal(current.initialPrice,fixture.price);
  assert.equal(current.discount,fixture.price-resumed.seller.price);
  assert.equal(current.totalLoss,baseline.totalLoss);
  assert.equal(resumed.seller.round,1);
  assert.equal(purchasePreview(current,30000).discount,18000);
});

test('live drafts change cost and signed margins without a round; a submitted valid offer uses the existing round',()=>{
  let state = act(time(act(prepare(),'pre-inspect',fixture.id,'full'),6*HOUR_MS),'meet-seller',fixture.id);
  const meeting = state.listings[0].seller;
  const analysis = purchaseAnalysis(state.listings[0],meeting);
  const inexpensive = purchasePreview(analysis,30000);
  const overpriced = purchasePreview(analysis,90000);
  assert.ok(inexpensive.advantage>0 && overpriced.advantage<0);
  assert.ok(overpriced.profit<0 && overpriced.profitShare<0);
  assert.equal(overpriced.total-inexpensive.total,60000);
  assert.equal(inexpensive.profit-overpriced.profit,60000);
  assert.equal(meeting.round,0);
  for (const price of [NaN,0,-100,1.001,meeting.price+1]) {
    assert.throws(()=>act(state,'offer-purchase',fixture.id,{meetingId:meeting.id,price}),/Teklif pozitif/);
  }
  const counter = structuredClone(meeting);
  negotiate(counter);
  const price = counter.price;
  state = act(state,'offer-purchase',fixture.id,{meetingId:meeting.id,price});
  const submitted = state.listings[0].seller;
  assert.equal(submitted.round,1);
  assert.equal(submitted.playerOffer,price);
  assert.equal(submitted.anchor,fixture.price);
  const roll = stableNumber(`${meeting.id}:1:automatic`)%100;
  const accepted = roll>=meeting.profile.skill*3;
  assert.equal(submitted.status==='agreed',accepted);
  assert.equal(reload(state).listings[0].seller.playerOffer,price);
  assert.equal(state.branches[0].garage.length,0);
  if (accepted) assert.equal(act(state,'buy-negotiated',fixture.id,submitted.id).branches[0].garage.length,1);
});
