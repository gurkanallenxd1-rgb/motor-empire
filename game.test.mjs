import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LEGACY_STORAGE_KEY, STORAGE_KEY, assets, branchCapacity, dailyTotals, generateMarket, loadGame, realizedSales, repairQuote,
  newGame, perform, rentalRate, repairCapacity, saveGame,
} from './game.mjs';

import { catalog, filterListings, gradeLabel, listingGrade, modelOf, paintOptions } from './bikes.mjs';

function legacyMarket() {
  const listings = [
    { name:'Honda CB 125F', year:2018, km:28400, price:26900, value:34800, faults:['zincir','akü'] },
    { name:'Bajaj Pulsar NS 200', year:2017, km:36700, price:38500, value:50700, faults:['fren','lastik'] },
    { name:'Yamaha YBR 125', year:2016, km:31200, price:29500, value:39200, faults:['debriyaj','fren'] },
  ];
  return { ...newGame(), listings:listings.map((bike,i) => ({ ...bike, id:`1-${i}` })) };
}

function play(initial = legacyMarket()) {
  let state = initial;
  return {
    get state() { return state; },
    act(action, id, amount, branch) {
      state = perform(state, action, id, amount, branch).state;
    },
    bike(id, branch = 1) {
      return state.branches[branch - 1].garage.find(item => item.id === id);
    },
  };
}

function startRepair(game, id) {
  for (const action of ['buy','inspect','repair']) game.act(action,id);
}

test('purchase, inspection, queue, sale and daily cash flow', () => {
  const game = play();
  assert.equal(game.state.cash,75000);
  game.act('borrow',undefined,3000);
  startRepair(game,'1-0');
  startRepair(game,'1-1');
  assert.throws(() => game.act('buy','1-2'),/dolu/);
  assert.throws(() => game.act('sell','1-0',0),/teklif/);
  assert.throws(() => game.act('repair','1-0'),/ekspertiz/);
  game.act('advance');
  assert.equal(game.bike('1-0').stage,'ready');
  assert.equal(game.bike('1-1').remainingHours,1);
  assert.deepEqual(dailyTotals(game.state.ledger,1),{ income:0,expenses:77950,net:-77950 });
  game.act('advance');
  game.act('list','1-0');
  assert.throws(() => game.act('sell','1-0',-1),/teklif/);
  assert.throws(() => game.act('sell','1-0',0.5),/teklif/);
  assert.equal(game.bike('1-0').meetings.length,0);
  while (!game.bike('1-0').meetings.length && game.state.day < 30) game.act('advance');
  const meeting = game.bike('1-0').meetings[0];
  assert.ok(meeting);
  game.act('sell','1-0',meeting.id);
  assert.equal(game.bike('1-0'),undefined);
  assert.equal(game.state.sales.length,1);
  assert.equal(dailyTotals(game.state.ledger,game.state.day).income,game.state.sales[0].price);
});

test('hire and fire change repair hours and wages for the selected branch', () => {
  const game = play();
  assert.throws(() => game.act('fire'),/çalışan usta yok/);
  game.act('hire');
  assert.equal(repairCapacity(game.state.branches[0]),16);
  game.act('borrow',undefined,12000);
  startRepair(game,'1-0');
  startRepair(game,'1-1');
  game.act('advance');
  assert.ok(game.state.branches[0].garage.every(bike => bike.stage === 'ready'));
  assert.ok(game.state.ledger.some(entry => entry.label === 'Usta maaşları' && entry.amount === 750));
  game.act('fire');
  const cash = game.state.cash;
  game.act('advance');
  assert.equal(repairCapacity(game.state.branches[0]),8);
  assert.equal(game.state.cash,cash - 250);
});

for (const days of [1,3,7]) {
  test(`${days} day rental pays daily and changes condition and mileage on return`, () => {
    const game = play();
    startRepair(game,'1-0');
    assert.throws(() => game.act('rent','1-0',days),/Geçerli süre/);
    game.act('advance');
    const { km } = game.bike('1-0');
    const rate = rentalRate(game.bike('1-0'));
    assert.equal(rate,208.8);
    for (const invalid of [-1,0,2,NaN,'3']) assert.throws(() => game.act('rent','1-0',invalid),/Geçerli süre/);
    game.act('list','1-0');
    assert.throws(() => game.act('rent','1-0',days),/Geçerli süre/);
    game.act('unlist','1-0');
    game.act('rent','1-0',days);
    assert.throws(() => game.act('list','1-0'),/ilan/);
    assert.throws(() => game.act('sell','1-0',0),/teklif/);
    assert.throws(() => game.act('rent','1-0',days),/Geçerli süre/);
    for (let elapsed = 1; elapsed <= days; elapsed += 1) {
      game.act('advance');
      assert.deepEqual(dailyTotals(game.state.ledger,elapsed + 1),{ income:rate,expenses:250,net:-41.2 });
      assert.equal(game.bike('1-0').stage,elapsed === days ? 'ready' : 'rented');
    }
    assert.equal(game.bike('1-0').km,km + days * 85);
    assert.equal(game.bike('1-0').condition,100 - days);
    assert.ok(rentalRate(game.bike('1-0')) < rate);
    game.act('advance');
    assert.equal(game.state.ledger.filter(entry => entry.label.endsWith('kira geliri')).length,days);
  });
}

test('capacity upgrades, highest slot and independent Istanbul branch', () => {
  const game = play({ ...legacyMarket(),cash:2200000 });
  assert.throws(() => game.act('hire',undefined,undefined,99),/Şube bulunamadı/);
  for (const capacity of [4,6,10]) {
    game.act('upgrade');
    assert.equal(branchCapacity(game.state.branches[0]),capacity);
  }
  assert.throws(() => game.act('upgrade'),/en yüksek/);
  game.act('open-branch');
  assert.equal(game.state.cash,1525000);
  assert.equal(branchCapacity(game.state.branches[1]),2);
  assert.equal(assets(game.state).equipment,675000);
  assert.equal(assets(game.state).total,2200000);
  for (let purchase = 0; purchase < 10; purchase += 1) {
    if (game.state.cash < 52000) game.act('borrow',undefined,50000);
    if (!game.state.listings.length) game.act('advance');
    game.act('buy',game.state.listings[0].id);
  }
  assert.equal(game.state.branches[0].garage.at(-1).slot,9);
  assert.throws(() => game.act('buy',game.state.listings[0].id),/dolu/);
  game.act('borrow',undefined,50000);
  const id = game.state.listings[0].id;
  game.act('buy',id,undefined,2);
  assert.equal(game.bike(id,2).slot,0);
  assert.throws(() => game.act('inspect',id),/Ekspertiz/);
  game.act('hire',undefined,undefined,2);
  const cash = game.state.cash;
  game.act('advance');
  assert.equal(game.state.cash,cash - 1250);
  assert.equal(game.state.branches[0].staff,0);
  assert.equal(game.state.branches[1].staff,1);
});

test('mandatory shortfall creates debt, financing is separate, invalid inputs leave state intact', () => {
  const game = play({ ...newGame(),cash:100,debt:250000 });
  assert.throws(() => game.act('buy',game.state.listings[0].id),/yeterli nakit/);
  assert.throws(() => game.act('upgrade'),/yeterli nakit/);
  assert.throws(() => game.act('open-branch'),/yeterli nakit/);
  game.act('advance');
  assert.equal(game.state.cash,0);
  assert.equal(game.state.debt,250150);
  assert.deepEqual(dailyTotals(game.state.ledger,1),{ income:0,expenses:250,net:-250 });
  assert.equal(assets(game.state).net,-250150);
  const before = structuredClone(game.state);
  for (const invalid of [-1,0,NaN,Infinity,0.001,'250',250001]) {
    assert.throws(() => game.act('borrow',undefined,invalid),/geçersiz/);
    assert.throws(() => game.act('repay',undefined,invalid),/Geçerli/);
  }
  assert.deepEqual(game.state,before);
  const financed = play();
  financed.act('borrow',undefined,250000);
  assert.throws(() => financed.act('borrow',undefined,0.01),/limiti/);
  financed.act('repay',undefined,120.25);
  assert.equal(financed.state.debt,249879.75);
  assert.equal(assets(financed.state).net,75000);
  assert.deepEqual(dailyTotals(financed.state.ledger,1),{ income:0,expenses:0,net:0 });
});

test('v0.3 migration preserves legacy storage, delivery day, listings and sales', () => {
  const baseline = legacyMarket();
  const legacy = { version:1, day:1, cash:17000, listings:baseline.listings.slice(1),
    sales:[{name:'Önceki satış',day:1,price:31500,spent:27500}],
    garage:[{...baseline.listings[0],slot:0,stage:'repairing',spent:30850,readyDay:2}] };
  const original = JSON.stringify(legacy);
  const memory = new Map([[LEGACY_STORAGE_KEY,original]]);
  const storage = { getItem:key => memory.get(key) ?? null, setItem:(key,value) => memory.set(key,value) };
  const state = loadGame(storage);
  const game = play(state);
  game.act('advance');
  assert.equal(game.bike('1-0').stage,'ready');
  assert.equal(game.state.cash,16750);
  assert.deepEqual(game.state.sales,legacy.sales);
  saveGame(storage,game.state);
  assert.equal(memory.get(LEGACY_STORAGE_KEY),original);
  assert.deepEqual(loadGame(storage),game.state);
  memory.set(STORAGE_KEY,JSON.stringify({...game.state,cash:-1}));
  assert.throws(() => loadGame(storage),/geçersiz/);
});

test('daily market offers thirty distinct models with changing valid attributes', () => {
  assert.equal(catalog.length,101);
  assert.equal(new Set(catalog.map(model => model.id)).size,101);
  let seed=14;
  const random = () => ((seed = (Math.imul(seed,1664525) + 1013904223) >>> 0) / 2 ** 32);
  const all = new Set();
  const grades = new Set();
  assert.equal(new Set(catalog.map(model=>model.brand)).size,19);
  assert.ok(catalog.every(model=>model.maintenance>0&&model.faultRisk>0&&model.demand>0));
  for (let day=1;day<=180;day+=1) {
    const listings=generateMarket(day,random).filter(bike=>bike.province===34);
    assert.equal(listings.length,30);
    assert.equal(new Set(listings.map(bike=>bike.name)).size,30);
    assert.deepEqual(Object.fromEntries(['budget','mid','premium','rare'].map(segment=>[segment,
      listings.filter(bike=>modelOf(bike).segment===segment).length])),{budget:8,mid:14,premium:6,rare:2});
    assert.ok(listings.slice(0,4).every(bike=>bike.price < 75000));
    for (const bike of listings) {
      const model=modelOf(bike);
      all.add(bike.name);
      grades.add(listingGrade(bike));
      assert.ok(paintOptions(model,bike.year).some(paint=>paint.hex===bike.color));
      assert.ok(bike.year>=model.firstYear&&bike.year<=model.lastYear);
      assert.ok(bike.condition>=25&&bike.condition<=100&&bike.km>0&&bike.price>0&&bike.value>0);
      assert.ok(bike.colorName && bike.faults.length<=4 && new Set(bike.faults).size===bike.faults.length);
      if(model.category==='scooter') assert.ok(!bike.faults.includes('zincir'));
    }
  }
  assert.equal(all.size,catalog.filter(model=>!model.eventOnly).length);
  assert.equal(grades.size,Object.keys(gradeLabel).length);
});

test('filters combine four constraints and buying preserves generated condition', () => {
  const listings=legacyMarket().listings;
  const matches=filterListings(listings,{brand:'Honda',maxPrice:27000,maxKm:30000,maxCc:125});
  assert.deepEqual(matches.map(bike=>bike.id),['1-0']);
  assert.deepEqual(filterListings(listings,{brand:'Honda',maxPrice:26000,maxKm:null,maxCc:null}),[]);
  const listing={...listings[0],condition:92,colorName:'Kırmızı'};
  const game=play({...legacyMarket(),listings:[listing]});
  game.act('buy',listing.id);
  assert.equal(game.bike(listing.id).condition,92);
  assert.equal(game.bike(listing.id).colorName,'Kırmızı');
  game.act('advance');
  assert.equal(game.state.listings.length,510);
  assert.ok(game.state.listings.every(bike=>bike.id.startsWith('2-')));
});

test('condition, category, model year and descending prices compose with old filters',()=>{
  const fixtures=legacyMarket().listings.map((bike,index)=>({...bike,condition:[91,77,64][index],faults:[[],['fren'],['masa']][index]}));
  assert.deepEqual(filterListings(fixtures,{category:'commuter',minYear:2017,grade:'clean'}).map(bike=>bike.id),['1-0']);
  assert.deepEqual(filterListings(fixtures,{sort:'price-desc'}).map(bike=>bike.id),['1-1','1-2','1-0']);
  assert.deepEqual(fixtures.map(bike=>bike.id),['1-0','1-1','1-2']);
});

test('clean inspections pay once and sales profit excludes earlier expenses from current cash flow',()=>{
  const game=play({...legacyMarket(),listings:[{...legacyMarket().listings[0],faults:[]}]});
  game.act('buy','1-0');
  assert.throws(()=>game.act('buy','1-0'),/açık değil/);
  game.act('inspect','1-0');
  assert.equal(game.bike('1-0').stage,'ready');
  assert.equal(game.bike('1-0').spent,27350);
  assert.deepEqual(repairQuote({faults:['akü'],serviceFactor:1.5}),{cost:2775,hours:1});
  assert.throws(()=>game.act('inspect','1-0'),/Ekspertiz/);
  const sale={day:2,price:31500.35,spent:27350};
  assert.deepEqual(realizedSales([sale],2),{revenue:31500.35,cost:27350,profit:4150.35});
  assert.equal(realizedSales([sale],1).profit,0);
  assert.equal(dailyTotals(game.state.ledger,1).net,-27350);
  game.act('advance');
  assert.ok(!game.state.listings.some(item=>item.id==='1-0'));
});

test('market search, model, colour and inclusive ranges compose without altering saved listings',()=>{
  const stock=[
    {id:'a',name:'Yamaha MT-25',year:2022,colorName:'Mavi',price:110000,km:15000,condition:91},
    {id:'b',name:'Yamaha MT-25',year:2022,colorName:'Siyah',price:112000,km:14000,condition:95},
    {id:'c',name:'Yamaha R25',year:2021,colorName:'Mavi',price:107000,km:9000,condition:92},
    {id:'d',name:'Honda CB250R',year:2024,colorName:'Mavi',price:115000,km:5000,condition:99},
  ];
  const before=JSON.stringify(stock);
  const filters={search:'YAMAHA MT25',brand:'Yamaha',modelId:'yamaha-mt25',color:'Mavi',category:'naked',
    grade:'clean',minPrice:110000,maxPrice:110000,minKm:15000,maxKm:15000,minCc:249,maxCc:249,minYear:2022,maxYear:2022};
  assert.deepEqual(filterListings(stock,filters).map(bike=>bike.id),['a']);
  assert.deepEqual(filterListings(stock,{sort:'km-asc'}).map(bike=>bike.id),['d','c','b','a']);
  assert.deepEqual(filterListings(stock,{sort:'year-desc'}).map(bike=>bike.id),['d','a','b','c']);
  assert.deepEqual(filterListings(stock,{sort:'condition-desc'}).map(bike=>bike.id),['d','b','c','a']);
  assert.deepEqual(filterListings(stock,{sort:'profit-desc'},bike=>({a:200,b:-300,c:100,d:500})[bike.id]).map(bike=>bike.id),
    ['d','a','c','b']);
  assert.equal(JSON.stringify(stock),before);
});

test('purchased livery, exact model year and identity are preserved in the existing save format',()=>{
  const state = newGame();
  state.listings = [{id:'legacy-livery',name:'KTM Duke 390',year:2023,km:25000,condition:91,price:20000,
    value:54000,color:'#e86920',colorName:'Turuncu / Mavi-gri',paintAccent:'#526279',faults:['akü']}];
  const game=play(state);
  game.act('buy','legacy-livery');
  game.act('inspect','legacy-livery');
  const stored=game.bike('legacy-livery');
  for (const field of ['id','name','year','color','colorName','paintAccent']) assert.equal(stored[field],state.listings[0][field]);
  const copy=JSON.stringify(game.state);
  assert.deepEqual(loadGame({getItem:key=>key===STORAGE_KEY?copy:null}),game.state);
});
