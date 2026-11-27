import assert from 'node:assert/strict';
import test from 'node:test';
import { DAY_MS,HOUR_MS } from './clock.mjs';
import { loadGame,newGame,perform,purchaseAnalysis,purchaseForecast,saveGame,synchronize } from './game.mjs';
import { examine,PACKAGES } from './risk.mjs';
import { createSeller,negotiate,stableNumber } from './trade.mjs';

const T = 1800000000000;
const stock = {id:'report-bike',name:'Yamaha R25',year:2021,km:22000,price:42000,value:100000,
  condition:44,faults:['saseIslem','saseDegisim','lastik'],damageHistory:['saseIslem','saseDegisim'],province:41,
  disclosure:{trust:.12,condition:97,hidden:['saseIslem','saseDegisim','lastik']}};
const inspected = (bike,packageId)=>({...bike,inspections:[{package:packageId,cost:PACKAGES[packageId].cost,
  result:examine(bike,packageId)}]});

test('unknown damage cannot affect the pre-report and out-of-scope estimates',()=>{
  const moreHidden = {...stock,condition:25,faults:[...stock.faults,'motor'],
    damageHistory:[...stock.damageHistory,'motor'],
    disclosure:{...stock.disclosure,hidden:[...stock.disclosure.hidden,'motor']}};
  assert.deepEqual(purchaseAnalysis(stock),purchaseAnalysis(moreHidden));
  const basic = purchaseAnalysis(inspected(stock,'basic'));
  assert.deepEqual(basic,purchaseAnalysis(inspected(moreHidden,'basic')));
  assert.deepEqual(basic.findings.map(row=>row.code),['lastik']);
  assert.equal(basic.permanentLoss,0);
  assert.ok(basic.beforeValue<basic.beforeInspection);
  assert.ok(basic.cost>0);
  const pending = purchaseAnalysis({...stock,inspections:[{package:'full',cost:2400}]});
  assert.equal(pending.completed,false);
  assert.deepEqual(pending.findings,[]);
  assert.equal(pending.beforeValue,pending.beforeInspection);
});

test('overlapping structural findings reconcile to the total without charging repair twice',()=>{
  const bike = inspected(stock,'full');
  const result = purchaseAnalysis(bike);
  assert.equal(result.clean,100000);
  assert.equal(result.beforeInspection,97000);
  assert.equal(result.difference,result.beforeInspection-result.beforeValue);
  assert.equal(result.findings.length,3);
  assert.ok(result.findings.every(item=>item.loss>=0 && item.share===item.loss/result.clean));
  assert.equal(result.findings.reduce((sum,item)=>sum+item.loss,0)+result.otherLoss,result.totalLoss);
  assert.equal(result.totalLoss,result.clean-result.beforeValue);
  // Two frame codes share one permanent structural discount, the higher 28%.
  assert.equal(result.permanentLoss,28000);
  assert.equal(result.afterValue,72000);
  assert.equal(result.total,bike.price+result.feesPaid+result.delivery.fee+result.cost);
  assert.equal(result.intakeFee,0);
  assert.equal(result.profit,result.afterValue-result.total);
  assert.equal(result.profitShare,result.profit/result.total);
  assert.equal(purchaseForecast(bike).beforeValue,result.beforeValue);
});

test('declared and verified faults are not counted twice and separately disclosed wear remains',()=>{
  const bike = {...stock,condition:84,faults:['fren'],damageHistory:[],disclosure:{trust:.8,condition:84,hidden:[]}};
  const report = purchaseAnalysis(inspected(bike,'basic'));
  assert.equal(report.difference,0);
  assert.equal(report.findings.length,1);
  assert.ok(report.otherLoss>0);
  assert.equal(report.findings[0].loss+report.otherLoss,report.totalLoss);
  assert.equal(report.permanentLoss,0);
  assert.equal(report.intakeFee,450);
});

test('offer advantage uses known market value and profit uses the entire invested cost',()=>{
  const bike = inspected(stock,'full');
  const base = purchaseAnalysis(bike);
  const expensive = purchaseAnalysis(bike,{anchor:52000,price:base.beforeValue+1200});
  const cheap = purchaseAnalysis(bike,{anchor:52000,price:base.beforeValue-1200});
  assert.equal(expensive.advantage,-1200);
  assert.equal(cheap.advantage,1200);
  assert.equal(cheap.discount,52000-cheap.offer);
  assert.equal(cheap.discountShare,cheap.discount/52000);
  assert.equal(cheap.advantageShare,1200/base.beforeValue);
  assert.equal(cheap.total,cheap.offer+cheap.delivery.fee+2400+cheap.cost);
  assert.equal(cheap.profit-expensive.profit,2400);
  assert.equal(cheap.beforeValue,expensive.beforeValue);
});

test('report and offer figures agree after archiving, day change and reload with a spent round',()=>{
  let state = synchronize({...newGame(),listings:[stock]},T).state;
  state = perform(state,'pre-inspect',stock.id,'full').state;
  state = synchronize(state,T+6*HOUR_MS+4*DAY_MS).state;
  assert.equal(state.inspectionArchive[0].id,stock.id);
  state = perform(state,'meet-seller',stock.id).state;
  let listing = state.listings.find(item=>item.id===stock.id);
  const initial = purchaseAnalysis(listing,listing.seller);
  assert.equal(initial.offer,stock.price);
  state = perform(state,'negotiate',stock.id,listing.seller.id).state;
  listing = state.listings.find(item=>item.id===stock.id);
  const next = purchaseAnalysis(listing,listing.seller);
  assert.equal(listing.seller.round,1);
  assert.equal(next.beforeInspection,initial.beforeInspection);
  assert.equal(next.beforeValue,initial.beforeValue);
  const data = new Map();
  const storage = {getItem:key=>data.get(key) ?? null,setItem:(key,value)=>data.set(key,value)};
  saveGame(storage,state);
  state = synchronize(loadGame(storage),state.clock.wall+DAY_MS).state;
  listing = state.listings.find(item=>item.id===stock.id);
  assert.equal(listing.seller.round,1);
  assert.deepEqual(purchaseAnalysis(listing,listing.seller),next);
});

test('seller urgency and character can reject a discount without spending additional rounds automatically',()=>{
  let reluctant, eager;
  for (let i=0;i<300;i++) {
    const bike = {...stock,id:`urgency-${i}`};
    const patient = createSeller({...bike,urgency:'patient'},1);
    const urgent = createSeller({...bike,urgency:'urgent'},1);
    const skill = patient.profile.skill;
    const chance = stableNumber(`${patient.id}:1:automatic`)%100;
    if (chance>=Math.max(0,skill*3-7) && chance<skill*3+9) {
      reluctant = patient;
      eager = urgent;
      break;
    }
  }
  assert.ok(reluctant && eager);
  assert.equal(reluctant.round,0);
  negotiate(reluctant);
  negotiate(eager);
  assert.equal(reluctant.price,stock.price);
  assert.ok(eager.price<reluctant.price);
  assert.equal(reluctant.round,1);
  assert.equal(eager.round,1);
});
