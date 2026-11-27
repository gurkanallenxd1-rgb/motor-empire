import assert from 'node:assert/strict';
import test from 'node:test';
import { bikeBounds, fitGarage, garageLayout, garageParking } from './garage-layout.mjs';
import { newGame,nextBranchTier,perform } from './game.mjs';

test('all five levels grow physically with one unique unobstructed bay per motorcycle',()=>{
  const levels = [[2,80],[5,180],[10,350],[20,700],[40,1400]];
  let previousArea = 0;
  for (const [capacity,area] of levels) {
    const plan = garageLayout(capacity);
    assert.equal(plan.area,area);
    assert.equal(plan.bays.length,capacity);
    if (capacity>5) assert.ok(plan.width*plan.height>previousArea);
    previousArea = plan.width*plan.height;
    for (const width of [320,390,844]) {
      const height = Math.min(width/1.5,258);
      const fit = fitGarage(plan,width,height);
      assert.ok(plan.width*fit<=width && plan.height*fit<=height);
    }
    const boxes = plan.bays.map(bay=>bikeBounds(plan,bay));
    for (let i=0;i<boxes.length;i++) {
      const a = boxes[i];
      assert.ok(a.left>=0 && a.top>=0 && a.right<=plan.width && a.bottom<=plan.height);
      for (const b of boxes.slice(i+1)) assert.ok(a.right<=b.left || a.left>=b.right || a.bottom<=b.top || a.top>=b.bottom);
    }
  }
  assert.equal(garageLayout(4).bays.length,4);
  assert.equal(garageLayout(6).bays.length,6);
});

test('service and showroom parking are presentation only and keep shipping, rentals and rides off the floor',()=>{
  const stock = [
    {id:'show',slot:0,stage:'listed'}, {id:'service',slot:8,stage:'internalRepair'},
    {id:'arriving',slot:2,stage:'shipping'}, {id:'renting',slot:3,stage:'rented'},
    {id:'riding',slot:4,stage:'riding'}, {id:'stock',slot:1,stage:'ready'},
  ];
  const parked = garageParking(garageLayout(10),stock);
  assert.equal(parked.length,3);
  assert.equal(parked.find(item=>item.bike.id==='show').bay.zone,'gallery');
  assert.equal(parked.find(item=>item.bike.id==='service').bay.zone,'service');
  assert.ok(parked.every(item=>![2,3,4].includes(item.bay.index)));
  assert.deepEqual(stock.map(item=>item.slot),[0,8,2,3,4,1]);
});

test('40 service jobs and 40 stocked sale motorcycles use distinct bays with expandable zone markings',()=>{
  for (const [stage,zone] of [['repairing','service'],['listed','gallery']]) {
    const stock = Array.from({length:40},(_,slot)=>({id:String(slot),slot,stage}));
    const parked = garageParking(garageLayout(40),stock);
    assert.ok(parked.every(item=>item.zone===zone));
    assert.equal(new Set(parked.map(item=>item.bay.index)).size,40);
  }
});

test('upgrade preview rejects stale capacity or price and existing upgrade still uses its exact investment',()=>{
  const state = {...newGame(),cash:2000000};
  const plan = nextBranchTier(state.branches[0]);
  assert.equal(plan.capacity,5);
  assert.throws(()=>perform(state,'upgrade-office',undefined,{capacity:10,increase:plan.increase}),/önizleme/);
  assert.throws(()=>perform(state,'upgrade-office',undefined,{capacity:5,increase:0}),/önizleme/);
  const outcome = perform(state,'upgrade-office',undefined,{capacity:plan.capacity,increase:plan.increase});
  assert.equal(outcome.state.cash,state.cash-plan.increase);
});
