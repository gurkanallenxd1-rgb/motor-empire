import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PARTS, DAMAGE_DISCOUNTS, cleanValue, damageGrade, historicalIssues, askingPrice,
  permanentDiscount, repairForecast, listingForecast, roadValue,
} from './damage.mjs';
import {
  INSPECTION_FEE, MARKET_STORAGE_KEY, STORAGE_KEY, loadGame, newGame, perform, realizedSales,
} from './game.mjs';

const stock = {id:'work',name:'Yamaha R25',year:2021,km:20000,condition:90,price:30000,
  value:96000,cleanBase:100000,serviceFactor:1,urgency:'normal',faults:[],damageHistory:[]};
const action = (state,type,id=stock.id,amount) => perform(state,type,id,amount).state;

function fixture(bike) {
  const state = newGame();
  state.cash = 500000;
  state.listings = [bike];
  return state;
}

const cases = [
  ['clean',[],95], ['neglected',['yag','fren','zincir'],84], ['light',['grenaj','manet'],86],
  ['moderate',['masa','sinyal'],71], ['heavy',['saseDegisim','akü'],59], ['totaled',['pert','ayna'],42],
];

for (const [grade,faults,condition] of cases) {
  test(`${grade} — condition, history, forecast, cost and sale use the same result`,()=>{
    const bike = {...stock,faults,condition};
    const forecast = listingForecast(bike,INSPECTION_FEE);
    assert.equal(cleanValue(bike),96000);
    assert.equal(damageGrade(bike),grade);
    assert.equal(forecast.total,bike.price+INSPECTION_FEE+forecast.cost);
    assert.equal(forecast.profit,forecast.afterValue-forecast.total);
    if (grade !== 'clean') {
      const discount = 1 - forecast.beforeValue / cleanValue(bike);
      const [low,high] = DAMAGE_DISCOUNTS[grade];
      assert.ok(discount>=low && discount<=high + .0001);
    }

    let state = action(action(fixture(bike),'buy'),'inspect');
    let owned = state.branches[0].garage[0];
    assert.equal(state.cash,500000-bike.price-INSPECTION_FEE);
    if (!faults.length) {
      assert.equal(owned.stage,'ready');
      assert.throws(()=>action(state,'repair'),/ekspertiz/);
    } else {
      state = action(state,'repair');
      assert.equal(state.cash,500000-forecast.total);
      assert.throws(()=>action(state,'repair'),/ekspertiz/);
      assert.equal(state.branches[0].garage[0].condition,condition);
      const saved = JSON.stringify(state);
      state = loadGame({getItem:key=>key === STORAGE_KEY ? saved : null});
      const days = Math.ceil(forecast.hours/8);
      for(let i=0;i<days;i+=1) state = action(state,'advance',undefined);
      owned = state.branches[0].garage[0];
      assert.equal(owned.stage,'ready');
      assert.deepEqual(owned.faults,[]);
      assert.equal(owned.condition,forecast.afterCondition);
      assert.ok(owned.condition>condition);
      assert.equal(roadValue(owned),forecast.afterValue);
      assert.equal(owned.lastRepair.beforeValue,forecast.beforeValue);
      assert.equal(owned.lastRepair.afterValue,forecast.afterValue);
      assert.deepEqual(owned.damageHistory,historicalIssues(bike));
      assert.equal(state.cash,500000-forecast.total-days*250);
      assert.equal(state.ledger.filter(row=>row.label.endsWith('tamir parçaları')).length,1);
    }
    assert.equal(owned.spent,forecast.total);
    state = action(state,'list');
    // Supply a known offer and test settlement without depending on customer arrival draws.
    const listed = state.branches[0].garage[0];
    listed.meetings.push({id:'test-offer',kind:'sale',status:'agreed',price:forecast.afterValue,
      anchor:forecast.afterValue,round:0,patience:3,profile:{name:'Test Alıcı'}});
    const cash = state.cash;
    state = action(state,'sell',stock.id,'test-offer');
    assert.equal(state.cash,cash+forecast.afterValue);
    assert.throws(()=>action(state,'sell',stock.id,'test-offer'),/geçerli değil/);
    assert.equal(realizedSales(state.sales,state.day).profit,forecast.profit);
  });
}

test('damage bands, wear and permanent discounts never charge the same loss twice',()=>{
  const bike = {...stock,condition:55,faults:['saseIslem','saseDegisim','agir','agir'],
    damageHistory:['saseIslem','saseDegisim','agir']};
  assert.equal(permanentDiscount(bike),permanentDiscount({...bike,faults:['agir'],damageHistory:['agir']}));
  assert.equal(Number(permanentDiscount(bike).toFixed(2)),.32);
  const report = repairForecast({...stock,condition:60,faults:['pert','pert'],damageHistory:['pert','pert']});
  assert.equal(report.cost,PARTS.pert.cost);
  assert.equal(report.afterCondition,100);
  assert.equal(report.afterValue,48000);
  assert.ok(report.beforeValue>24000);
});

test('pricing uses odometer, clean reference, damage and seller urgency and can give losses',()=>{
  const bike = {...stock,condition:56,faults:['pert'],price:60000};
  assert.ok(cleanValue({...bike,km:60000})<cleanValue(bike));
  assert.ok(cleanValue({...bike,cleanBase:82000})<cleanValue(bike));
  assert.ok(askingPrice({...bike,urgency:'urgent'},()=>.5)<askingPrice({...bike,urgency:'patient'},()=>.5));
  assert.ok(listingForecast(bike,INSPECTION_FEE).profit<0);
  assert.ok(listingForecast({...bike,price:15000},INSPECTION_FEE).profit>0);
});

test('v4 migration keeps paid jobs, existing deals and v4 bytes without reapplying completed repairs',()=>{
  const state = fixture({...stock,id:'listing',faults:['akü']});
  state.version=4;
  const seller={id:'seller:listing',kind:'purchase',status:'open',day:1,round:2,patience:1,price:24000,
    limit:18000,anchor:30000,speech:'Son teklif.',profile:{name:'Test Satıcı',skill:2}};
  state.listings[0].seller=seller;
  state.branches[0].garage=[
    {...stock,id:'done',stage:'ready',slot:0,spent:34000,condition:80,faults:['zincir']},
    {...stock,id:'paid',stage:'repairing',slot:1,spent:33750,condition:74,faults:['fren'],remainingHours:2,repairOrder:1},
  ];
  const old=JSON.stringify(state);
  const memory=new Map([[MARKET_STORAGE_KEY,old]]);
  const storage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)};
  const migrated=loadGame(storage);
  assert.deepEqual(migrated.listings[0].seller,seller);
  assert.deepEqual(migrated.branches[0].garage[0].faults,[]);
  assert.equal(migrated.branches[0].garage[0].condition,80);
  const complete=action(migrated,'advance');
  assert.equal(complete.branches[0].garage[1].spent,33750);
  assert.equal(complete.branches[0].garage[1].condition,78);
  assert.equal(complete.cash,500000-250);
  assert.equal(memory.get(MARKET_STORAGE_KEY),old);
});
