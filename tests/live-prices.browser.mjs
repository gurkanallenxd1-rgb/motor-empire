import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { DAY_MS,HOUR_MS } from '../clock.mjs';
import { newGame,perform,purchaseAnalysis,synchronize } from '../game.mjs';
import { buyerComplaint } from '../risk.mjs';
import { chance } from '../characters.mjs';
import { roadValue } from '../damage.mjs';
import { createBuyer } from '../trade.mjs';
import { purchasePreview } from '../valuation.mjs';
import { catalog,paintOptions } from '../bikes.mjs';
import { worldBays } from '../graphics/config.mjs';
import { fitGarage,garageLayout,garageParking } from '../garage-layout.mjs';

const require = createRequire(import.meta.url);
const {webkit,chromium,devices} = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const T = 1800000000000;
const contentTypes = {html:'text/html',mjs:'text/javascript',css:'text/css',webp:'image/webp',js:'text/javascript',glb:'model/gltf-binary',wasm:'application/wasm'};
const fixture = {id:'holiday-prices',name:'Yamaha R25',year:2021,km:22000,price:48000,value:100000,
  province:41,condition:47,faults:['saseDegisim','lastik'],damageHistory:['saseDegisim'],color:'#3560ab',colorName:'Mavi',
  disclosure:{trust:.11,condition:85,hidden:['saseDegisim','lastik']}};
const number = new Intl.NumberFormat('tr-TR');
const pct = new Intl.NumberFormat('tr-TR',{style:'percent',maximumFractionDigits:2});
const money = amount=>number.format(amount)+' TL';
const signed = (amount,share)=>amount===0 ? money(0) : (amount>0?'+':'')+money(amount)+' · '+pct.format(share || 0);
const act = (state,...args)=>perform(state,...args).state;
const initial = ()=>synchronize({...newGame(),listings:[fixture]},T).state;
const inspected = ()=>{
  const requested = act(initial(),'pre-inspect',fixture.id,'full');
  return synchronize(requested,T+6*HOUR_MS).state;
};

let browser;
before(async()=>{browser=process.env.GRAPHICS_CHROMIUM ? await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']}) : await webkit.launch();});
after(async()=>{await browser?.close();});

async function open(t,width,height,seed) {
  const page = await browser.newPage({...devices['iPhone 13'],viewport:{width,height}});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',entry=>{if(entry.type()==='error') errors.push(entry.text());});
  t.after(async()=>{
    try {
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
      assert.deepEqual(errors,[]);
    } finally { await page.close(); }
  });
  await page.addInitScript(({seed,T})=>{
    window.testWall=Number(sessionStorage.getItem('testWall')) || T;
    Date.now=()=>window.testWall;
    if (!localStorage.getItem('motor-empire.v9')) localStorage.setItem('motor-empire.v9',JSON.stringify(seed));
  },{seed,T:seed.clock.wall});
  await page.route('https://motor.test/**',async route=>{
    const url = new URL(route.request().url());
    const file = url.pathname.slice(1)||'index.html';
    if(file==='favicon.ico')return route.fulfill({status:204});
    const body = await readFile(new URL('../'+file,import.meta.url));
    return route.fulfill({body,contentType:contentTypes[file.split('.').at(-1)]});
  });
  const tap = selector=>page.locator(selector).first().tap();
  const ready = ()=>page.waitForFunction(()=>document.querySelector('#save').textContent.includes('açık'));
  const state = ()=>page.evaluate(()=>JSON.parse(localStorage.getItem('motor-empire.v9')));
  const jump = ms=>page.evaluate(ms=>{window.testWall+=ms;sessionStorage.setItem('testWall',window.testWall);},ms);
  const text = (selector,value)=>page.waitForFunction(([selector,value])=>
    document.querySelector(selector)?.textContent===value,[selector,value]);
  const market = ()=>tap('.bottom-nav [data-page=market]');
  const row = ()=>tap('.listing-row');
  const negotiation = ()=>tap('#listing-detail-actions [data-action=meet-seller]');
  const editOffer = ()=>tap('#purchase-offer-editor > summary');
  await page.goto('https://motor.test/');
  await ready().catch(error=>{throw new Error(errors.join(' | ') || error.message);});
  return {page,tap,ready,state,jump,text,market,row,negotiation,editOffer};
}

test('320×568 WebKit shows stored before and after estimates and both units directly in negotiation',async t=>{
  const ui = await open(t,320,568,initial());
  await ui.market();
  await ui.row();
  await ui.tap('#listing-analysis > summary');
  assert.doesNotMatch(await ui.page.locator('#listing-analysis-content').innerText(),/Şase değişmiş/);
  await ui.tap('[data-action=pre-inspect][data-index=full]');
  await ui.page.waitForFunction(()=>JSON.parse(localStorage.getItem('motor-empire.v9')).listings[0].inspectionBaseline===85000);
  await ui.jump(6*HOUR_MS);
  await ui.page.waitForFunction(()=>document.querySelector('#listing-inspections').textContent.includes('Rapor hazır'));
  await ui.negotiation();
  await ui.page.locator('#live-inspection-difference').waitFor();
  const {listings} = await ui.state();
  const bike = listings.find(item=>item.id===fixture.id);
  const analysis = purchaseAnalysis(bike,bike.seller);
  await ui.text('#live-after-value',money(analysis.beforeValue));
  await ui.text('#live-inspection-difference',signed(-analysis.difference,-analysis.differenceShare));
  assert.equal(await ui.page.locator('#meeting-analysis').evaluate(el=>el.open),false);
  assert.equal(await ui.page.locator('#live-before-value').isVisible(),false);
  assert.equal(await ui.page.locator('#player-offer').isVisible(),false);
  await ui.text('#meeting-negotiate','Pazarlık yap');
  const before = (await ui.state()).listings.find(item=>item.id===fixture.id).seller;
  await ui.editOffer();
  await ui.text('#meeting-submit-offer','Teklifi gönder');
  assert.equal(await ui.page.locator('#purchase-offer-editor').evaluate(el=>el.open),true);
  assert.ok(await ui.page.locator('#player-offer').isVisible());
  assert.ok(await ui.page.locator('#player-offer-range').isVisible());
  assert.ok(await ui.page.locator('#offer-shortcuts').isVisible());
  assert.deepEqual((await ui.state()).listings.find(item=>item.id===fixture.id).seller,before);
  const order = await ui.page.evaluate(()=>['#meeting-bike','#live-seller-price','#meeting-inspection-summary','#meeting-speech','#player-offer','#live-sale-profit']
    .map(selector=>document.querySelector(selector).getBoundingClientRect().top));
  assert.deepEqual(order,[...order].sort((a,b)=>a-b));
  await ui.page.locator('#meeting-image').waitFor();
  assert.match(await ui.page.locator('#meeting-spec').innerText(),/2021.*km.*Kondisyon/);
  await ui.tap('#meeting-analysis > summary');
  await ui.text('#live-before-value',money(85000));
});

test('390×844 WebKit separates seller and conditional discounts, persists anchor across refresh and save',async t=>{
  const seed = act(inspected(),'meet-seller',fixture.id);
  delete seed.listings[0].inspectionBaseline; // v0.12.2 stored reports without the baseline.
  const active = seed.listings[0].seller;
  active.profile.name = 'Selin Demir';
  active.profile.avatar = '👨';
  const ui = await open(t,390,844,seed);
  await ui.market();
  await ui.row();
  await ui.negotiation();
  await ui.text('#meeting-avatar','👩');
  await ui.page.waitForFunction(()=>JSON.parse(localStorage.getItem('motor-empire.v9')).listings[0].inspectionBaseline===85000);
  await ui.tap('#meeting-analysis > summary');
  await ui.editOffer();
  const input = ui.page.locator('#player-offer');
  await input.fill('30000');
  await ui.text('#live-start-price','48.000 TL');
  await ui.text('#live-seller-price','48.000 TL');
  await ui.text('#live-seller-discount',signed(0,0));
  const analysis = purchaseAnalysis(seed.listings[0],active);
  await ui.text('#live-damage-loss',signed(-analysis.damageLoss,-analysis.damageLossShare));
  await ui.text('#live-potential-discount',signed(18000,18000/48000));
  await ui.tap('#meeting-submit-offer');
  await ui.page.waitForFunction(()=>JSON.parse(localStorage.getItem('motor-empire.v9')).listings.find(x=>x.id==='holiday-prices').seller.round===1);
  const submitted = (await ui.state()).listings.find(item=>item.id===fixture.id).seller;
  assert.equal(submitted.id,active.id);
  assert.equal(submitted.playerOffer,30000);
  await ui.jump(2*DAY_MS);
  await ui.page.waitForFunction(()=>JSON.parse(localStorage.getItem('motor-empire.v9')).day===3);
  await ui.page.reload();await ui.ready();await ui.market();
  await ui.tap('#inspection-follow > summary');
  await ui.tap('#inspection-follow [data-action=meet-seller]');
  await ui.tap('#meeting-analysis > summary');
  await ui.text('#live-start-price','48.000 TL');
  await ui.text('#live-seller-price',money(submitted.price));
  await ui.text('#live-seller-discount',signed(48000-submitted.price,(48000-submitted.price)/48000));
  assert.equal((await ui.state()).listings.find(item=>item.id===fixture.id).seller.round,1);
});

test('844×390 WebKit number, slider and discount shortcuts stay synchronized without a saved offer',async t=>{
  const seed = act(inspected(),'meet-seller',fixture.id);
  const ui = await open(t,844,390,seed);
  await ui.market();await ui.row();await ui.negotiation();
  const bike = seed.listings[0];
  const analysis = purchaseAnalysis(bike,bike.seller);
  await ui.editOffer();
  const numberInput = ui.page.locator('#player-offer');
  const range = ui.page.locator('#player-offer-range');
  const check = async amount=>{
    const preview = purchasePreview(analysis,amount);
    await ui.text('#live-potential-discount',signed(preview.discount,preview.discountShare));
    await ui.text('#live-advantage',signed(preview.advantage,preview.advantageShare));
    await ui.text('#live-total-cost',money(preview.total));
    await ui.text('#live-sale-profit',signed(preview.profit,preview.profitShare));
  };
  await numberInput.fill('90000');
  assert.equal(Number(await range.inputValue()),90000);
  await check(90000);
  const bounds = await range.boundingBox();
  await range.tap({position:{x:bounds.width*.24,y:bounds.height/2}});
  const sliderAmount = Number(await range.inputValue());
  assert.notEqual(sliderAmount,90000);
  assert.equal(Number(await numberInput.inputValue()),sliderAmount);
  await check(sliderAmount);
  await numberInput.fill('90000');
  assert.ok(await ui.page.locator('#meeting-submit-offer').isDisabled());
  assert.ok(await ui.page.locator('#meeting-negotiate').isEnabled());
  assert.match(await ui.page.locator('#live-sale-profit').getAttribute('class'),/negative/);
  for (const discount of [5000,10000,20000]) {
    await ui.tap(`#offer-shortcuts [data-discount="${discount}"]`);
    const amount = analysis.offer-discount;
    assert.equal(Number(await numberInput.inputValue()),amount);
    assert.equal(Number(await range.inputValue()),amount);
    await ui.text('#live-extra-discount',signed(discount,discount/analysis.offer));
    await check(amount);
  }
  await numberInput.fill('');
  await ui.text('#live-total-cost','—');
  assert.equal((await ui.state()).listings[0].seller.round,0);
  assert.equal((await ui.state()).listings[0].seller.playerOffer,undefined);
});

test('zero valuation deltas render as 0 TL and shortcuts cannot produce a nonpositive offer',async t=>{
  const listing = {...fixture,price:10000,condition:100,faults:[],damageHistory:[],
    disclosure:{trust:.8,condition:100,hidden:[]}};
  let seed = synchronize({...newGame(),listings:[listing]},T).state;
  seed = act(synchronize(act(seed,'pre-inspect',fixture.id,'full'),T+6*HOUR_MS).state,'meet-seller',fixture.id);
  const ui = await open(t,320,568,seed);
  await ui.market(); await ui.row();
  await ui.page.locator('#listing-image').waitFor();
  assert.equal(await ui.page.locator('#listing-analysis').evaluate(el=>el.open),false);
  assert.match(await ui.page.locator('#listing-inspection-summary').innerText(),/Ekspertizle bulunan ek kayıp\s+0 TL/);
  await ui.negotiation();
  assert.equal(await ui.page.locator('#live-inspection-difference').innerText(),'0 TL');
  assert.equal(await ui.page.locator('#live-damage-loss').innerText(),'0 TL');
  await ui.editOffer();
  assert.ok(await ui.page.locator('[data-discount="10000"]').isDisabled());
  assert.ok(await ui.page.locator('[data-discount="20000"]').isDisabled());
  await ui.tap('[data-discount="5000"]');
  assert.equal(await ui.page.locator('#player-offer').inputValue(),'5000');
  assert.equal((await ui.state()).listings[0].seller.round,0);
});

test('mobile customer sales retain the offer and sale controls without showing the purchase editor',async t=>{
  const seed = initial();
  seed.listings = [];
  const bike = {...fixture,stage:'listed',slot:0,spent:30000,ask:65000,nextVisit:1,faults:[]};
  bike.meetings = [createBuyer(bike,1,0,50,65000)];
  seed.branches[0].garage = [bike];
  const ui = await open(t,390,844,seed);
  await ui.tap('.bottom-nav [data-page=garage]');
  await ui.tap('[data-action=open-buyer]');
  await ui.text('#meeting-price-label','Müşteri teklifi');
  await ui.text('#meeting-negotiate','Pazarlık yap');
  assert.equal(await ui.page.locator('#live-purchase-prices').isVisible(),false);
  assert.ok(await ui.page.locator('#meeting-metrics').isVisible());
  await ui.tap('#meeting-confirm');
  await ui.page.waitForFunction(()=>JSON.parse(localStorage.getItem('motor-empire.v9')).sales.length===1);
  const state = await ui.state();
  assert.equal(state.sales[0].price,bike.meetings[0].price);
  assert.equal(state.branches[0].garage.length,0);
});

test('zero rounds lock all offer controls and show seller-price costs and profit',async t=>{
  const seed = act(inspected(),'meet-seller',fixture.id);
  const seller = seed.listings[0].seller;
  seller.round = 2;
  seller.patience = 2;
  seller.price = 45000;
  const ui = await open(t,320,568,seed);
  await ui.market(); await ui.row(); await ui.negotiation();
  await ui.editOffer();
  await ui.tap('[data-discount="20000"]');
  await ui.text('#live-extra-discount',signed(20000,20000/45000));
  await ui.tap('#meeting-submit-offer');
  await ui.page.waitForFunction(()=>document.querySelector('#meeting-round').textContent.includes('Kalan hak 0'));
  const saved = (await ui.state()).listings[0];
  assert.equal(saved.seller.round,3);
  assert.equal(saved.seller.playerOffer,25000);
  assert.notEqual(saved.seller.price,saved.seller.playerOffer);
  const stats = purchaseAnalysis(saved,saved.seller);
  const real = purchasePreview(stats,saved.seller.price);
  await ui.text('#live-total-cost',money(real.total));
  await ui.text('#live-sale-profit',signed(real.profit,real.profitShare));
  await ui.text('#live-extra-discount','0 TL');
  await ui.text('#live-seller-discount',signed(48000-saved.seller.price,(48000-saved.seller.price)/48000));
  const actual = String(saved.seller.price);
  assert.equal(await ui.page.locator('#player-offer').inputValue(),actual);
  assert.equal(await ui.page.locator('#player-offer-range').inputValue(),actual);
  for (const selector of ['#player-offer','#player-offer-range','#meeting-negotiate','#meeting-submit-offer',
    '[data-discount="5000"]','[data-discount="10000"]','[data-discount="20000"]']) {
    assert.ok(await ui.page.locator(selector).isDisabled(),selector);
  }
  assert.equal(await ui.page.locator('#purchase-offer-editor').isVisible(),false);
  assert.equal(await ui.page.locator('#meeting-negotiate').isVisible(),false);
  assert.ok(await ui.page.locator('#meeting-reject').isEnabled());
  assert.ok(await ui.page.locator('#meeting-confirm').isEnabled());
  assert.equal(await ui.page.locator('#live-total-cost').evaluate(el=>getComputedStyle(el).textAlign),'right');
  assert.equal(await ui.page.locator('#live-sale-profit').evaluate(el=>getComputedStyle(el).textAlign),'right');
});

for (const [id,urgency,discounted] of [['auto-0','urgent',true],['auto-2','patient',false]]) {
  test(`automatic purchase consumes one round and ${discounted ? 'updates the offer' : 'can refuse a discount'}`,async t=>{
    const listing = {...fixture,id,urgency};
    const start = synchronize({...newGame(),listings:[listing]},T).state;
    const inspectedState = synchronize(act(start,'pre-inspect',id,'full'),T+6*HOUR_MS).state;
    const seed = act(inspectedState,'meet-seller',id);
    const seller = seed.listings[0].seller;
    seller.profile.skill = 5;
    seller.patience = 3;
    const ui = await open(t,390,844,seed);
    await ui.market(); await ui.row(); await ui.negotiation();
    await ui.text('#meeting-negotiate','Pazarlık yap');
    assert.equal(await ui.page.locator('#player-offer').isVisible(),false);
    assert.equal(await ui.page.locator('#meeting-submit-offer').isVisible(),false);
    const mainButtons = await ui.page.locator('#meeting-actions button:visible').allTextContents();
    assert.deepEqual(mainButtons.slice(0,2),['Pazarlık yap','Reddet']);
    assert.match(mainButtons[2],/^Satın al/);
    await ui.tap('#meeting-negotiate');
    await ui.page.waitForFunction(()=>JSON.parse(localStorage.getItem('motor-empire.v9')).listings[0].seller.round===1);
    const current = (await ui.state()).listings[0];
    assert.equal(current.seller.patience,2);
    assert.equal(current.seller.playerOffer,undefined);
    assert.equal(current.seller.price<seller.price,discounted);
    assert.ok(current.seller.price>=seller.limit);
    if (!discounted) assert.match(current.seller.speech,/indirim yapamam/);
    const analysis = purchaseAnalysis(current,current.seller);
    await ui.text('#meeting-speech',current.seller.speech);
    await ui.text('#live-seller-price',money(current.seller.price));
    await ui.text('#live-seller-discount',signed(analysis.discount,analysis.discountShare));
    await ui.text('#live-total-cost',money(analysis.total));
    await ui.text('#live-sale-profit',signed(analysis.profit,analysis.profitShare));
    await ui.editOffer();
    assert.equal(Number(await ui.page.locator('#player-offer').inputValue()),current.seller.price);
  });
}

function strategyFixture(strategy) {
  const seed = initial();
  seed.listings = [];
  seed.branches[0].garage = [{...fixture,stage:'inspected',slot:0,spent:29000,
    garageInspection:{package:'full',title:'Garaj ekspertizi',result:[],completedDay:1}}];
  const selling = act(seed,'list-strategy',fixture.id,{strategy,price:60000});
  const bike = selling.branches[0].garage[0];
  let meeting;
  for (let index=0;index<250;index++) {
    meeting = createBuyer(bike,1,index,50,roadValue(bike));
    if (strategy!=='conceal' || buyerComplaint(bike,`${meeting.id}:settled`)) break;
  }
  meeting.request='history';
  bike.meetings=[meeting];
  return selling;
}

test('mobile documented trade saves a customer answer and shows reviews and reputation',async t=>{
  const ui = await open(t,390,844,strategyFixture('documented'));
  await ui.tap('.bottom-nav [data-page=garage]');
  await ui.tap('[data-action=open-buyer]');
  await ui.tap('#meeting-questions > summary');
  await ui.tap('#meeting-answer-actions button:text-is("Belgeyi göster")');
  await ui.page.waitForFunction(()=>document.querySelector('#meeting-answer-history').textContent.includes('Belgeyi göster'));
  await ui.tap('#meeting-confirm');
  await ui.page.waitForFunction(()=>JSON.parse(localStorage.getItem('motor-empire.v9')).trade.reviews?.length===1);
  await ui.tap('.bottom-nav [data-page=home]');
  await ui.tap('summary:text-is("Galeri profili")');
  assert.match(await ui.page.locator('#gallery-rating').innerText(),/1 yorum/);
  assert.match(await ui.page.locator('#gallery-reviews').innerText(),/servis kayıtlarını/);
  await ui.tap('.bottom-nav [data-page=finance]');
  await ui.tap('summary:text-is("Satış stratejileri ve şikâyetler")');
  assert.match(await ui.page.locator('#finance-after-sales').innerText(),/Dürüst satış kârı/);
});

test('offline concealed sale shows choices after reload and books partial compensation once',async t=>{
  const seed = strategyFixture('conceal');
  const buyer = seed.branches[0].garage[0].meetings[0];
  const sold = act(seed,'sell',fixture.id,buyer.id);
  const ui = await open(t,320,568,sold);
  await ui.jump(sold.sales[0].complaint.due);
  await ui.page.waitForFunction(()=>JSON.parse(localStorage.getItem('motor-empire.v9')).sales[0].openComplaint);
  await ui.page.reload(); await ui.ready();
  await ui.tap('#complaint-shortcut');
  await ui.tap('summary:text-is("Çözüm seç")');
  assert.equal(await ui.page.locator('[data-action=resolve-complaint]').count(),4);
  await ui.tap('[data-action=resolve-complaint][data-index=compensation]');
  await ui.page.waitForFunction(()=>JSON.parse(localStorage.getItem('motor-empire.v9')).sales[0].complaintResult);
  const state = await ui.state();
  assert.equal(state.ledger.filter(row=>row.category==='compensation').length,1);
  assert.equal(state.sales[0].complaintResult.outcome,'compensation');
  assert.match(await ui.page.locator('#complaint-list').innerText(),/Tazminat/);
});

test('customer answer updates previous offer, live profit and saved price on mobile',async t=>{
  const seed = strategyFixture('documented');
  const bike = seed.branches[0].garage[0];
  const meeting = bike.meetings[0];
  meeting.price=30000;
  meeting.limit=45000;
  Object.assign(meeting.profile,{trust:100,mechanical:90,skepticism:0,budget:60000});
  while (chance(meeting.id,'answer:history:document')>=.8) meeting.id+='x';
  const ui = await open(t,320,568,seed);
  await ui.tap('.bottom-nav [data-page=garage]');
  await ui.tap('[data-action=open-buyer]');
  await ui.tap('#meeting-questions > summary');
  await ui.tap('#meeting-answer-actions button:text-is("Belgeyi göster")');
  await ui.page.waitForFunction(()=>document.querySelector('#buyer-price-change').textContent.includes('Önceki teklif'));
  const change = await ui.page.locator('#buyer-price-change').innerText();
  const buyer = (await ui.state()).branches[0].garage[0].meetings[0];
  assert.ok(buyer.price>meeting.price);
  assert.match(change,/30\.000 TL/);
  assert.ok(change.includes(money(buyer.price)) && change.includes('%'));
  assert.ok((await ui.page.locator('#meeting-metrics').innerText()).includes(money(buyer.price-bike.spent)));
  assert.equal(buyer.round,0);
  await ui.page.reload(); await ui.ready();
  await ui.tap('.bottom-nav [data-page=garage]'); await ui.tap('[data-action=open-buyer]');
  await ui.page.locator("#buyer-price-change").waitFor({state:"visible"});
  assert.equal(await ui.page.locator('#buyer-price-change').innerText(),change);
});

test('320×568 WebKit opens a branch, hires a manager and saves optional trading limits',async t=>{
  const ui = await open(t,320,568,{...initial(),cash:1000000});
  const {page} = ui;
  await ui.tap('.bottom-nav [data-page=business]');
  assert.equal(await page.locator('#business-title').innerText(),'Şubelerim');
  await ui.tap('#business-page > details > summary');
  assert.equal(await page.locator('#office-province option').count(),81);
  await page.selectOption('#office-province','6');
  await page.selectOption('#office-tier','1');
  await ui.tap('#open-office-form button');
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('motor-empire.v9')).branches.length===2);
  await page.waitForFunction(()=>document.querySelector('#branch option[value="2"]'));
  await page.selectOption('#branch','2');
  await ui.tap('#business-page [data-page=staff]');
  assert.match(await page.locator('#staff-branch').innerText(),/Ankara/);
  await page.selectOption('#staff-role','manager');
  await ui.tap('#hire-worker-form button');
  await page.waitForFunction(()=>document.querySelector('#staff-list').textContent.includes('Müdür'));
  await ui.tap('#staff-page [data-page=business]');
  await ui.tap('.business-card:nth-child(2) .risk-panel summary');
  const settings = page.locator('form[data-office-action=set-automation][data-branch="2"]');
  await settings.locator('[name=maxPrice]').fill('60000');
  await settings.locator('[name=budget]').fill('70000');
  await settings.locator('[name=buy]').check();
  await settings.locator('button').tap();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('motor-empire.v9')).branches[1].automation?.buy);
  const branch = (await ui.state()).branches[1];
  assert.equal(branch.tier,1);
  assert.equal(branch.automation.budget,70000);
});

test('320px WebKit configures staff stages and shows queue, deadline and completed automation',async t=>{
  const bike = {...fixture,id:'auto-webkit',province:34,disclosure:undefined,
    faults:['lastik'],damageHistory:[],condition:80};
  let state = act({...initial(),cash:190000,listings:[bike]},'buy',bike.id);
  for (const role of ['manager','inspector','master','sales']) state = act(state,'hire-worker',undefined,role);
  const ui = await open(t,320,568,state);
  const {page} = ui;
  await ui.tap('.bottom-nav [data-page=business]');
  await ui.tap('#business .business-card > details:first-of-type summary');
  const settings = page.locator('form[data-office-action=set-automation]');
  await settings.locator('[name=reserve]').fill('25000');
  for (const stage of ['inspect','repair','list','negotiate','sell']) await settings.locator(`[name=${stage}]`).check();
  await settings.locator('button').tap();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('motor-empire.v9')).branches[0].automation?.inspect);
  await ui.tap('.automation-report > summary');
  await ui.jump(DAY_MS);
  await page.waitForFunction(()=>document.querySelector('.automation-report')?.textContent.includes('Ekspertiz sırası'));
  assert.equal(await page.locator('.automation-report').evaluate(item=>item.open),true);
  assert.match(await page.locator('[data-next-office]').innerText(),/sa\./);
  await ui.jump(16*HOUR_MS);
  await page.waitForFunction(()=>document.querySelector('.automation-report')?.textContent.includes('İlan açma'));
  assert.match(await page.locator('.automation-report').innerText(),/Yamaha R25/);
  assert.equal((await ui.state()).branches[0].garage[0].stage,'listed');
  await ui.tap('.bottom-nav [data-page=garage]');
  await ui.tap('[data-action=pause-bike-automation]');
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('motor-empire.v9')).branches[0].garage[0].autoPaused);
  assert.match(await page.locator('[data-action=pause-bike-automation]').innerText(),/Otomasyona bırak/);
});

test('390px WebKit renders both Primavera generations and changes only masked pixels',async t=>{
  const vespa = {...fixture,id:'vespa-webkit',name:'Vespa Primavera 125',year:2024,
    condition:94,disclosure:undefined,faults:[],damageHistory:[],color:'#c93838',colorName:'Kırmızı'};
  const ui = await open(t,390,844,{...initial(),listings:[vespa]});
  await ui.market();
  await ui.page.locator('.listing-row canvas').waitFor({state:'visible'});
  const colors = await ui.page.evaluate(async ()=>{
    const {loadSprite} = await import('/sprite.mjs?v=0.16.1');
    const name = 'Vespa Primavera 125';
    const red = await loadSprite({name,year:2024,color:'#c93838'});
    const white = await loadSprite({name,year:2024,color:'#eae6da'});
    const original = await loadSprite({name,year:2021,color:'#c93838'});
    const yusuf = await loadSprite({name:'KTM 1390 Super Duke R',year:2024,color:'#e86920',paintAccent:'#292b2e'});
    const pixels = ({image})=>image.getContext('2d').getImageData(0,0,image.width,image.height).data;
    const a = pixels(red), b = pixels(white), c = pixels(original);
    let changes=0, preserved=0, changedAlpha=0, newGeneration=0;
    for (let i=0;i<a.length;i+=4) {
      if (a[i+3]!==b[i+3]) changedAlpha++;
      if (a[i+3] && a[i]!==b[i]) changes++;
      else if (a[i+3] && a[i+1]===b[i+1] && a[i+2]===b[i+2]) preserved++;
      if (a[i+3]!==c[i+3]) newGeneration++;
    }
    return {changes,preserved,changedAlpha,newGeneration,yusufWidth:yusuf?.image.width,representative:red.representative};
  });
  assert.ok(colors.changes>1000 && colors.preserved>1000 && colors.newGeneration>1000);
  assert.equal(colors.changedAlpha,0);
  assert.equal(colors.yusufWidth,640);
  assert.equal(colors.representative,true);
});

function notificationSeed({auto=false,price=65000}={}) {
  const listing = {...fixture,province:34,disclosure:undefined,faults:[],damageHistory:[],condition:100};
  let state = act(act(act({...initial(),listings:[listing]},'buy',fixture.id),'inspect',fixture.id),'list',fixture.id);
  const bike = state.branches[0].garage[0];
  bike.nextVisit = 12;
  bike.meetings = [createBuyer(bike,1,0,50,100000,{name:'Deniz Kaya',price})];
  if (auto) {
    state = act(act(state,'hire-worker',undefined,'manager'),'hire-worker',undefined,'sales');
    state = act(state,'set-automation',undefined,{buy:false,sell:true,maxPrice:0,minProfit:1000,budget:0,brand:'',minCc:0,maxCc:3000});
  }
  return state;
}

test('320px WebKit live manual sale opens loss details, filters history and persists read and cleared states',async t=>{
  const ui = await open(t,320,568,notificationSeed({price:40000}));
  const {page} = ui;
  await ui.tap('.bottom-nav [data-page=garage]');
  await ui.tap('[data-action=open-buyer]');
  await ui.tap('#meeting-confirm');
  await page.locator('.sale-toast[data-tone=loss]').waitFor({state:'visible'});
  assert.equal(await page.locator('#notification-count').innerText(),'3');
  await ui.tap('.sale-toast');
  await page.locator('#notification-detail-content canvas').waitFor({state:'visible'});
  const detail = await page.locator('#notification-detail-content').innerText();
  assert.match(detail,/Yamaha R25/);
  assert.match(detail,/Oyuncu · Manuel satış/);
  assert.match(detail,/Model yılı 2021/);
  assert.match(detail,/Alış fiyatı\s+48\.000 TL/);
  assert.match(detail,/Gerçekleşen zarar\s+-8\.450 TL/);
  assert.match(detail,/Yatırım getirisi\s+-%17,44/);
  await ui.text('#notification-count','2');
  await ui.tap('#notification-back');
  await page.selectOption('#notification-filter','sale');
  assert.equal(await page.locator('.notification-row').count(),1);
  await ui.tap('#notification-clear');
  await ui.tap('#notification-clear');
  await page.waitForFunction(()=>!JSON.parse(localStorage.getItem('motor-empire.v9')).inbox.items.some(item=>item.type==='sale'));
  await page.reload(); await ui.ready();
  assert.equal(await page.locator('.sale-toast').count(),0);
  await ui.tap('#notification-bell');
  assert.equal(await page.locator('.notification-row').count(),2);
  await ui.tap('#notification-read-all');
  await page.locator('#notification-count').waitFor({state:'hidden'});
});

test('390px WebKit automatic sale appears on Finance and dismisses after eight seconds',async t=>{
  const ui = await open(t,390,844,notificationSeed({auto:true}));
  await ui.tap('.bottom-nav [data-page=finance]');
  await ui.jump(DAY_MS);
  const toast = ui.page.locator('.sale-toast[data-tone=gain]');
  await toast.waitFor({state:'visible'});
  assert.match(await toast.innerText(),/Yamaha R25 · 2021/);
  assert.equal(await ui.page.locator('#finance-page').isVisible(),true);
  await toast.waitFor({state:'detached',timeout:9200});
  await ui.tap('#notification-bell');
  await ui.page.selectOption('#notification-filter','sale');
  assert.equal(await ui.page.locator('.notification-row').count(),1);
});

test('844px WebKit offline sale is retained without a replay toast and type settings persist',async t=>{
  const seed = notificationSeed({auto:true});
  const ui = await open(t,844,390,seed);
  await ui.jump(DAY_MS);
  await ui.page.reload(); await ui.ready();
  await ui.page.locator('#offline-summary[open]').waitFor();
  await ui.tap('#offline-summary form button');
  assert.equal(await ui.page.locator('.sale-toast').count(),0);
  await ui.tap('#notification-bell');
  await ui.page.selectOption('#notification-filter','sale');
  assert.equal(await ui.page.locator('.notification-row').count(),1);
  await ui.tap('#notification-history details summary');
  await ui.page.getByLabel('Motosiklet satışı',{exact:true}).uncheck();
  await ui.page.waitForFunction(()=>JSON.parse(localStorage.getItem('motor-empire.v9')).inbox.muted.sale);
  await ui.page.reload(); await ui.ready();
  await ui.tap('#notification-bell');
  await ui.tap('#notification-history details summary');
  assert.equal(await ui.page.getByLabel('Motosiklet satışı',{exact:true}).isChecked(),false);
});

test('mobile WebKit can open an automatic sale notification over an active seller dialogue',async t=>{
  const seed = notificationSeed({auto:true});
  seed.listings = [{...fixture,id:'other-listing'}];
  const ui = await open(t,390,844,seed);
  await ui.market(); await ui.row(); await ui.negotiation();
  await ui.page.locator('#meeting[open]').waitFor();
  await ui.jump(DAY_MS);
  await ui.page.locator('#meeting .sale-toast').waitFor({state:'visible'});
  await ui.tap('.sale-toast');
  assert.equal(await ui.page.locator('#notification-detail').isVisible(),true);
  assert.equal(await ui.page.locator('#meeting').evaluate(item=>item.open),true);
});

function garageFixture(tier,count) {
  const state = initial();
  state.listings = [];
  state.branches[0].tier = tier;
  state.branches[0].garage = catalog.slice(0,count).map((model,slot)=>{
    const paint = paintOptions(model,model.lastYear)[0];
    return {id:`garage-test-${slot}`,name:model.name,slot,stage:'ready',condition:100,year:model.lastYear,km:2000,
      value:100000,price:60000,spent:60000,faults:[],color:paint.hex,paintAccent:paint.accent,colorName:paint.name};
  });
  return state;
}

for (const [tier,bays,area,width,height] of [[0,2,80,320,568],[1,5,180,390,844],[2,10,350,390,844],[3,20,700,390,844],[4,40,1400,390,844]]) {
  test(`mobile WebKit renders all ${bays} garage bays in one scene with tap selection`,async t=>{
    const seed = garageFixture(tier,bays);
    const ui = await open(t,width,height,seed);
    const {page} = ui;
    await ui.tap('.bottom-nav [data-page=garage]');
    const canvas = page.locator('#garage-art');
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>document.querySelector('#garage-art').width!==1536);
    assert.equal(await page.locator('#garage-page canvas#garage-art').count(),1);
    assert.equal(await page.locator('#bay-pages').count(),0);
    assert.match(await page.locator('.garage-overview').innerText(),new RegExp(`${number.format(area)} m² · ${bays}/${bays} parkta`.replaceAll('.','\\.')));
    const plan = garageLayout(bays);
    const parking = garageParking(plan,seed.branches[0].garage);
    const {bike,bay} = parking.at(-1);
    const bounds = await canvas.boundingBox();
    const scale = fitGarage(plan,bounds.width,bounds.height);
    const location = {
      x:bounds.width/2+(bay.x-plan.width/2)*scale,
      y:bounds.height/2+(bay.y-plan.height/2-plan.bikeWidth*.28)*scale,
    };
    if (process.env.GARAGE_SCREENSHOTS) {
      const centerScene = ()=>canvas.evaluate(node=>node.scrollIntoView({block:'center'}));
      await centerScene();
      await page.waitForTimeout(1300);
      await canvas.screenshot({path:`${process.env.GARAGE_SCREENSHOTS}/garage-${bays}.png`});
      const focus = [...parking].sort((a,b)=>Math.hypot(a.bay.x-plan.width/2,a.bay.y-plan.height/2)-
        Math.hypot(b.bay.x-plan.width/2,b.bay.y-plan.height/2))[0].bay;
      const anchor = {x:bounds.width/2+(focus.x-plan.width/2)*scale,y:bounds.height/2+(focus.y-plan.height/2-28)*scale};
      for (const magnification of [2,3,5]) {
        await canvas.evaluate((node,{x,y,magnification})=>{
          const box = node.getBoundingClientRect();
          const send = (type,id,delta)=>node.dispatchEvent(new PointerEvent(type,{
            pointerType:'touch',pointerId:id,clientX:box.left+x+delta,clientY:box.top+y,bubbles:true,
          }));
          send('pointerdown',1,-12);
          send('pointerdown',2,12);
          send('pointermove',1,-12*magnification);
          send('pointermove',2,12*magnification);
          send('pointerup',1,-12*magnification);
          send('pointerup',2,12*magnification);
        },{...anchor,magnification});
        await ui.text('.zoom-value',`%${magnification*100}`);
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        await canvas.screenshot({path:`${process.env.GARAGE_SCREENSHOTS}/garage-${bays}-${magnification*100}.png`});
        await ui.tap('#zoom-reset');
        await centerScene();
      }
    }
    await canvas.tap({position:location});
    await ui.text('#detail-name',bike.name);
    await ui.tap('#bike-detail form button');
    if (bays===40) {
      // Track paints of this canvas only, after the art and thumbnail requests have settled.
      await canvas.evaluate(node=>{
        const context = node.getContext('2d');
        const draw = context.drawImage.bind(context);
        node.scenePaints = 0;
        context.drawImage = (...args)=>{
          if (args.length===9) node.scenePaints++;
          return draw(...args);
        };
      });
      await page.waitForTimeout(550);
      const idle = await canvas.evaluate(node=>node.scenePaints);
      await page.waitForTimeout(280);
      assert.equal(await canvas.evaluate(node=>node.scenePaints),idle);
      await canvas.evaluate(canvas=>{
        const box = canvas.getBoundingClientRect();
        const send = (type,id,x,y)=>canvas.dispatchEvent(new PointerEvent(type,{
          pointerType:'touch',pointerId:id,clientX:box.left+x,clientY:box.top+y,bubbles:true,
        }));
        const {width:w,height:h} = box;
        send('pointerdown',1,w*.47,h*.48);
        send('pointerdown',2,w*.53,h*.52);
        send('pointermove',1,w*.15,h*.30);
        send('pointermove',2,w*.85,h*.70);
        send('pointerup',1,w*.15,h*.30);
        send('pointerup',2,w*.85,h*.70);
      });
      assert.ok(parseInt((await page.locator('.zoom-value').innerText()).slice(1),10)>200);
      const frame = ()=>canvas.evaluate(el=>el.toDataURL());
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const before = await frame();
      const rect = await canvas.boundingBox();
      await page.mouse.move(rect.x+rect.width*.5,rect.y+rect.height*.5);
      await page.mouse.down();
      await page.mouse.move(rect.x+rect.width*.72,rect.y+rect.height*.71,{steps:9});
      await page.mouse.up();
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      assert.notEqual(await frame(),before);
      assert.equal(await page.locator('#bike-detail').evaluate(node=>node.open),false);
      await ui.tap('#zoom-reset');
      await ui.text('.zoom-value','%100');
      await canvas.tap({position:location});
      await ui.text('#detail-name',bike.name);
    }
  });
}

test('mobile WebKit previews and confirms the existing upgrade price and immediately uses the larger garage',async t=>{
  const state = {...garageFixture(0,1),cash:2000000};
  const ui = await open(t,390,844,state);
  await ui.tap('.bottom-nav [data-page=business]');
  await ui.tap('[data-action=preview-upgrade]');
  const {page} = ui;
  assert.match(await page.locator('#garage-upgrade-spec').innerText(),/180 m² · 5 bölme/);
  assert.match(await page.locator('#garage-upgrade-confirm').innerText(),/500\.000 TL/);
  assert.equal((await ui.state()).cash,state.cash);
  await ui.tap('#garage-upgrade-confirm');
  await page.waitForFunction(()=>document.querySelector('.garage-overview').textContent.includes('1/5 parkta'));
  assert.equal((await ui.state()).cash,state.cash-500000);
  assert.equal((await ui.state()).branches[0].garage[0].id,state.branches[0].garage[0].id);
});

test('mobile WebKit leaves a shipping motorcycle in stock and off the scene',async t=>{
  const seed = garageFixture(2,0);
  seed.listings = [fixture];
  const state = act(seed,'buy',fixture.id);
  const ui = await open(t,390,844,state);
  await ui.tap('.bottom-nav [data-page=garage]');
  await ui.text('.garage-overview','Servis ve galeri · 350 m² · 0/10 parkta');
  assert.match(await ui.page.locator('#garage').innerText(),/Yolda/);
});

test('320px WebKit shows sparse real market history, period selection, regional prices and a touch chart after catch-up',async t=>{
  const seed = initial();
  delete seed.economy;
  const ui = await open(t,320,568,seed);
  const {page} = ui;
  await ui.market();
  await ui.tap('#market-analysis-open');
  await page.locator('#market-analysis-page').waitFor({state:'visible'});
  assert.match(await page.locator('#analysis-history-status').innerText(),/yeterli geçmiş veri/);
  assert.equal(await page.locator('#analysis-chart').isVisible(),false);
  assert.equal(await page.locator('#analysis-current-price').innerText(),'Güncel ilan yok');
  assert.match(await page.locator('#analysis-latest-price').innerText(),/48\.000 TL · Gün 1/);
  await page.selectOption('#analysis-period','30');
  await page.selectOption('#analysis-year','2021');
  assert.match(await page.locator('#analysis-current-price').innerText(),/48\.000 TL/);
  await ui.tap('#analysis-tab-cities');
  assert.equal(await page.locator('#analysis-regions > article').count(),81);
  await page.fill('#analysis-city-search','Bayburt');
  assert.match(await page.locator('#analysis-regions').innerText(),/Bayburt/);
  assert.equal(await page.locator('#analysis-regions > article').count(),1);
  await ui.tap('#analysis-tab-summary');
  await ui.jump(31*DAY_MS);
  await page.locator('#analysis-chart').waitFor({state:'visible'});
  assert.match(await page.locator('#analysis-history-status').innerText(),/30 günlük aralıkta/);
  assert.equal((await ui.state()).economy.history.length,32);
  await ui.tap('#analysis-chart');
  assert.match(await page.locator('#analysis-point-value').innerText(),/Gün .* TL .* ilan/);
  await page.selectOption('#analysis-period','90');
  assert.match(await page.locator('#analysis-history-status').innerText(),/90 günlük aralıkta/);
  await page.selectOption('#analysis-period','7');
  assert.match(await page.locator('#analysis-history-status').innerText(),/7 günlük aralıkta/);
});

test('landscape WebKit retrieves offline market news once through the existing bell',async t=>{
  const seed = initial();
  delete seed.economy;
  seed.day = 68;
  const ui = await open(t,844,390,seed);
  await ui.jump(10*DAY_MS);
  await ui.page.reload();
  await ui.ready();
  await ui.page.locator('#offline-summary[open]').waitFor();
  await ui.tap('#offline-summary form button');
  await ui.tap('#notification-bell');
  await ui.page.selectOption('#notification-filter','economy');
  const news = ui.page.locator('.notification-row');
  assert.equal(await news.count(),1);
  await ui.tap('.notification-row');
  assert.match(await ui.page.locator('#notification-detail-content').innerText(),/Denge dönemi|Piyasa haberi/);
  await ui.page.reload();
  await ui.ready();
  const saved = await ui.state();
  assert.equal(saved.inbox.items.filter(row=>row.type==='economy').length,1);
});

test('390px WebKit four full-screen tabs show deals, ranked cities and persisted economics without writing to the save',async t=>{
  let seed = synchronize(synchronize(initial(),T+60*DAY_MS).state,T+78*DAY_MS).state;
  const ui = await open(t,390,844,seed);
  const {page} = ui;
  await ui.market();
  await ui.tap('#market-analysis-open');
  const saved = await ui.state();
  const screenshot = async id=>{
    if (!process.env.MARKET_SCREENSHOTS) return;
    const viewport = page.viewportSize();
    const height = {ozet:1130,ekonomi:1020}[id];
    if (height) await page.setViewportSize({...viewport,height});
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.waitForTimeout(220);
    await page.screenshot({path:`${process.env.MARKET_SCREENSHOTS}/${id}.png`});
    if (height) await page.setViewportSize(viewport);
  };
  await page.locator('#analysis-bike').waitFor({state:'visible'});
  await page.selectOption('#analysis-period','30');
  await screenshot('ozet');
  await ui.tap('#analysis-tab-opportunities');
  assert.match(await page.locator('#analysis-opportunities').innerText(),/Tahmini satış.*Nakliye.*Net kâr.*ROI/s);
  await screenshot('firsatlar');
  await ui.tap('.analysis-deal button');
  await page.locator('#listing-detail[open]').waitFor();
  await ui.tap('#listing-detail form button');
  assert.equal(await page.locator('#analysis-deals').isVisible(),true);
  await ui.tap('#analysis-tab-cities');
  const amounts = index=>page.locator(`.analysis-city dd:nth-of-type(${index})`).allTextContents()
    .then(values=>values.map(value=>Number(value.replace(/[^0-9-]/g,''))));
  const prices = await amounts(1);
  assert.deepEqual(prices,[...prices].sort((a,b)=>a-b));
  await page.selectOption('#analysis-city-sort','profit');
  const profits = await amounts(3);
  assert.deepEqual(profits,[...profits].sort((a,b)=>b-a));
  await screenshot('sehirler');
  await page.fill('#analysis-city-search','sanliurfa');
  assert.equal(await page.locator('.analysis-city h4').innerText(),'Şanlıurfa');
  await ui.tap('#analysis-tab-economy');
  assert.equal(await page.locator('#analysis-macro .analysis-reading').count(),7);
  assert.match(await page.locator('#analysis-news').innerText(),/Denge dönemi/);
  await screenshot('ekonomi');
  assert.deepEqual(await ui.state(),saved);
  await ui.tap('.market-center-back');
  assert.equal(await page.locator('#market-page').isVisible(),true);
});

test('landscape WebKit shows an empty opportunity list and allows keyboard tab navigation',async t=>{
  const ui = await open(t,844,390,{...initial(),listings:[]});
  await ui.market();
  await ui.tap('#market-analysis-open');
  await ui.page.locator('#analysis-tab-summary').press('ArrowRight');
  assert.equal(await ui.page.locator('#analysis-tab-opportunities').getAttribute('aria-selected'),'true');
  assert.match(await ui.page.locator('#analysis-opportunities').innerText(),/beklenen net kârı pozitif olan ilan yok/);
  await ui.page.locator('#analysis-tab-opportunities').press('End');
  assert.equal(await ui.page.locator('#analysis-economy').isVisible(),true);
});

test('graphics 3D settings are opt-in and a non-prototype garage retains 2D and its save',async t=>{
  const seed = garageFixture(1,1);
  const ui = await open(t,320,568,seed);
  await ui.tap('[data-page=garage]');
  assert.ok(await ui.page.locator('#garage-art').isVisible());
  assert.equal(await ui.page.locator('#garage-3d-host canvas').count(),0);
  await ui.tap('#graphics-settings summary');
  await ui.page.selectOption('#graphics-form [name=mode]','3d');
  assert.ok(await ui.page.locator('#garage-art').isVisible());
  assert.match(await ui.page.locator('#graphics-message').innerText(),/10/);
  assert.deepEqual((await ui.state()).branches,JSON.parse(JSON.stringify(seed.branches)));
  await ui.page.reload();
  await ui.ready();
  await ui.tap('[data-page=garage]');
  assert.equal(await ui.page.locator('#graphics-form [name=mode]').inputValue(),'3d');
});

test('graphics WebGL failure falls back to the original 2D garage',async t=>{
  const ui = await open(t,390,844,garageFixture(2,1));
  await ui.page.evaluate(()=>{
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(kind,...options){
      return kind==='webgl2' ? null : get.call(this,kind,...options);
    };
  });
  await ui.tap('[data-page=garage]');
  await ui.tap('#graphics-settings summary');
  await ui.page.selectOption('#graphics-form [name=mode]','3d');
  await ui.page.waitForFunction(()=>/WebGL/.test(document.querySelector('#graphics-message').textContent));
  assert.ok(await ui.page.locator('#garage-art').isVisible());
  assert.equal((await ui.state()).branches[0].garage.length,1);
});

test('graphics garage loads GLB, applies quality, moves camera and switches back to 2D',async t=>{
  const seed = garageFixture(2,0);
  const models = [['yamaha-mt25',2024,'#292b2e'],['kawasaki-z900',2025,'#639d34'],['ktm-super-duke1390',2024,'#e86920','#292b2e']];
  seed.branches[0].garage = models.map(([id,year,color,paintAccent],slot)=>({
    id:'graphics-'+id,name:catalog.find(model=>model.key===id || model.id===id).name,slot:[0,4,8][slot],
    stage:slot===0?'inspected':'ready',year,color,paintAccent,condition:100,km:1390,value:160000,price:120000,spent:120000,
    faults:slot===0?['lastik']:[],
  }));
  const ui = await open(t,390,844,seed);
  const {page} = ui;
  await page.emulateMedia({reducedMotion:'reduce'});
  await ui.tap('[data-page=garage]');
  await ui.tap('#graphics-settings summary');
  await page.selectOption('#graphics-form [name=fps]','30');
  await page.selectOption('#graphics-form [name=quality]','medium');
  await page.locator('#graphics-form [name=meter]').check();
  const webgl = await page.evaluate(()=>!!document.createElement('canvas').getContext('webgl2'));
  await page.selectOption('#graphics-form [name=mode]','3d');
  if (!webgl) {
    await page.waitForFunction(()=>/WebGL/.test(document.querySelector('#graphics-message').textContent));
    assert.ok(await page.locator('#garage-art').isVisible());
    t.diagnostic('Browser has no WebGL2. Verified fallback.');
    return;
  }
  const canvas = page.locator('#garage-3d-host canvas');
  await page.waitForFunction(()=>document.querySelector('#garage-3d-host canvas')?.dataset.glb==='ready');
  await canvas.evaluate(node=>node.scrollIntoView({block:'center'}));
  assert.equal(await canvas.getAttribute('data-quality'),'medium');
  assert.equal(await canvas.getAttribute('data-visible-bikes'),'3');
  assert.match(await page.locator('#graphics-stock-note').innerText(),/3 motosiklet özgün 2D/);
  assert.ok(await page.locator('#graphics-meter').isVisible());
  const name = process.env.GRAPHICS_SCREENSHOTS;
  if(name) await canvas.screenshot({path:name+'/garage-angle-1.png'});
  const before = await canvas.screenshot();
  const bounds = await canvas.boundingBox();
  await page.mouse.move(bounds.x+bounds.width*.55,bounds.y+bounds.height*.55);
  await page.mouse.down();
  await page.mouse.move(bounds.x+bounds.width*.79,bounds.y+bounds.height*.62,{steps:12});
  await page.mouse.up();
  await page.waitForTimeout(350);
  assert.notDeepEqual(await canvas.screenshot(),before);
  if(name) await canvas.screenshot({path:name+'/garage-angle-2.png'});
  if (process.env.GRAPHICS_CHROMIUM) {
    const session=await page.context().newCDPSession(page);
    const x=bounds.x+bounds.width/2, y=bounds.y+bounds.height/2;
    const gesture=(type,spacing=0)=>session.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'
      ? [] : [{x:x-spacing,y,id:1},{x:x+spacing,y,id:2}]});
    const unzoomed=await canvas.screenshot();
    await gesture('touchStart',18);
    for(const distance of [25,35,49,62]) await gesture('touchMove',distance);
    await gesture('touchEnd');
    await page.waitForTimeout(300);
    assert.notDeepEqual(await canvas.screenshot(),unzoomed);
    await session.detach();
  }
  t.diagnostic('Three render sample '+await canvas.getAttribute('data-measure'));
  for (const {bike,bay} of garageParking(garageLayout(10),seed.branches[0].garage)) {
    await ui.tap('#graphics-reset-camera');
    await canvas.evaluate(node=>node.scrollIntoView({block:'center'}));
    await page.waitForTimeout(520);
    const [x,z]=worldBays[bay.index];
    const point=await canvas.evaluate(async (node,{x,z,y})=>{
      const Three=await import('/graphics/vendor/three.module.min.js');
      const {width,height}=node.getBoundingClientRect();
      const camera=new Three.PerspectiveCamera(39,width/height,.07,110);
      camera.position.set(15,17.2,21);
      camera.lookAt(0,.2,0);
      camera.updateMatrixWorld();
      const p=new Three.Vector3(x,y,z).project(camera);
      return {x:(p.x+1)*width/2,y:(1-p.y)*height/2};
    },{x,z,y:(bay.index<3?.466:.109)+.58});
    await canvas.tap({position:point});
    const detail=page.locator('#bike-detail');
    await detail.waitFor({state:'visible',timeout:4000});
    assert.equal(await page.locator('#detail-name').innerText(),bike.name);
    assert.match(await page.locator('#graphics-detail-status').innerText(),/Özgün 2D/);
    if(name) {
      await page.locator('#detail-image').waitFor();
      await detail.screenshot({path:name+'/'+bike.id+'.png'});
    }
    await ui.tap('#bike-detail form button');
  }
  const canLose=await canvas.evaluate(node=>{
    const extension=node.getContext('webgl2').getExtension('WEBGL_lose_context');
    if (!extension) return false;
    window.restoreTestContext=()=>extension.restoreContext();
    extension.loseContext();
    return true;
  });
  if (canLose) {
    await page.locator('#garage-3d[data-renderer=lost]').waitFor({state:'attached'});
    assert.ok(await page.locator('#garage-art').isVisible());
    await page.evaluate(()=>window.restoreTestContext());
    await canvas.waitFor({state:'visible'});
  }
  await page.selectOption('#graphics-form [name=mode]','2d');
  assert.ok(await page.locator('#garage-art').isVisible());
  assert.equal(await canvas.count(),0);
  assert.equal((await ui.state()).branches[0].garage.length,3);
});

test('graphics inventory refreshes after manager sale and excludes transport',async t=>{
  const seed=notificationSeed({auto:true});
  seed.branches[0].tier=2;
  const listing={...fixture,id:'graphics-shipping',province:65};
  seed.cash=150000;
  seed.listings=[listing];
  const withTransport=act(seed,'buy',listing.id);
  assert.equal(withTransport.branches[0].garage.length,2);
  const ui=await open(t,390,844,withTransport);
  await ui.tap('[data-page=garage]');
  await ui.tap('#graphics-settings summary');
  await ui.page.selectOption('#graphics-form [name=mode]','3d');
  await ui.page.waitForFunction(()=>['ready','unavailable'].includes(document.querySelector('#garage-3d').dataset.renderer));
  const canvas=ui.page.locator('#garage-webgl');
  if(await canvas.count()) assert.equal(await canvas.getAttribute('data-visible-bikes'),'1');
  await ui.jump(DAY_MS);
  await ui.page.locator('.sale-toast').waitFor({state:'visible'});
  assert.equal((await ui.state()).sales.length,1);
  if(await canvas.count()) {
    await ui.page.waitForFunction(()=>document.querySelector('#garage-webgl')?.dataset.visibleBikes==='0');
  }
});

test('graphics UASTC GLB transcodes, uploads and releases shared texture and geometry once',async t=>{
  const {page}=await open(t,390,844,initial());
  const outcome=await page.evaluate(async ()=>{
    const three=await import('/graphics/vendor/three.module.min.js');
    const {createAssets}=await import('/graphics/assets.mjs');
    const canvas=document.createElement('canvas');
    if (!canvas.getContext('webgl2')) return null;
    const renderer=new three.WebGLRenderer({canvas});
    renderer.setSize(64,64,false);
    const pool=createAssets(renderer);
    const url='/tests/fixtures/checker-basis.glb';
    const a=pool.acquire(url), b=pool.acquire(url);
    const [first,second]=await Promise.all([a.model,b.model]);
    let mesh,clone;
    first.traverse(node=>{if(node.isMesh) mesh=node;});
    second.traverse(node=>{if(node.isMesh) clone=node;});
    const texture=mesh.material.map;
    const scene=new three.Scene();
    const camera=new three.PerspectiveCamera(45,1,.1,10);
    camera.position.z=3;
    scene.add(first,new three.AmbientLight(0xffffff,3));
    renderer.render(scene,camera);
    const gl=renderer.getContext();
    const texels=[[16,16],[26,16]].map(([x,y])=>{
      const pixel=new Uint8Array(4);gl.readPixels(x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
      return [...pixel];
    });
    const before={...renderer.info.memory};
    let disposed=0;
    texture.addEventListener('dispose',()=>disposed++);
    a.release();
    await Promise.resolve();
    const afterFirst=disposed;
    first.removeFromParent();
    b.release();
    await Promise.resolve();
    const result={shared:mesh.geometry===clone.geometry&&texture===clone.material.map,
      width:texture.image.width,height:texture.image.height,mips:texture.mipmaps.length,
      compressed:texture.isCompressedTexture,texels,before,after:{...renderer.info.memory},afterFirst,disposed};
    const pending=pool.acquire(url);
    pool.dispose();
    pool.dispose();
    result.canceled=await pending.model.then(()=>false,error=>error.name==='AbortError');
    renderer.dispose();
    renderer.forceContextLoss();
    return result;
  });
  if(!outcome) {t.skip('WebGL2 unavailable');return;}
  assert.deepEqual([outcome.width,outcome.height,outcome.mips],[32,32,6]);
  assert.equal(outcome.shared,true);
  assert.equal(outcome.compressed,true);
  assert.notDeepEqual(outcome.texels[0],outcome.texels[1]);
  assert.equal(outcome.afterFirst,0);
  assert.equal(outcome.disposed,1);
  assert.ok(outcome.after.textures<outcome.before.textures);
  assert.ok(outcome.after.geometries<outcome.before.geometries);
  assert.equal(outcome.canceled,true);
  t.diagnostic(JSON.stringify(outcome));
});

test('graphics four profiles apply distinct real render settings and explicit reflection and MSAA overrides',async t=>{
  const {page}=await open(t,390,844,initial());
  const result=await page.evaluate(async ()=>{
    const {createRenderer}=await import('/graphics/renderer.mjs');
    const {DEFAULT_GRAPHICS}=await import('/graphics/config.mjs');
    const canvas=document.createElement('canvas');
    canvas.style.cssText='position:fixed;inset:0;width:320px;height:210px';
    if(!canvas.getContext('webgl2',{antialias:false})) return null;
    document.body.append(canvas);
    const settings={...DEFAULT_GRAPHICS,aa:false};
    const scene=createRenderer(canvas,settings,{status(){}});
    const profiles=[];
    for (const quality of ['low','medium','high','ultra']) {
      scene.updateOptions({...settings,quality});
      profiles.push(scene.metrics());
    }
    scene.updateOptions({...settings,reflections:'off',shadows:'off'});
    const off=scene.metrics();
    scene.dispose();
    canvas.remove();
    return {profiles,off};
  });
  if(!result) {t.skip('WebGL2 unavailable');return;}
  assert.deepEqual(result.profiles.map(p=>p.surface),[128,256,512,1024]);
  assert.deepEqual(result.profiles.map(p=>p.shadow),[0,512,1024,2048]);
  assert.deepEqual(result.profiles.map(p=>p.reflection),[.22,.50,.78,1]);
  for(const pair of result.profiles.slice(1).entries()) assert.ok(pair[1].width>result.profiles[pair[0]].width);
  assert.equal(result.off.aa,false);
  assert.deepEqual(result.profiles.map(p=>p.environmentSize),[64,128,128,256]);
  assert.deepEqual(result.profiles.map(p=>p.detailedSurfaces),[false,false,true,true]);
  assert.equal(result.off.environment,false);
  assert.equal(result.off.environmentSize,0);
  assert.equal(result.off.shadow,0);
});

test('graphics canvas bounds orbit and dolly, reveals the interior and isolates touch callouts',async t=>{
  const {page}=await open(t,844,390,initial());
  await page.emulateMedia({reducedMotion:'reduce'});
  const state=await page.evaluate(async ()=>{
    const {createRenderer}=await import('/graphics/renderer.mjs');
    const {DEFAULT_GRAPHICS}=await import('/graphics/config.mjs');
    const canvas=document.createElement('canvas');
    canvas.className='orbit-test';
    const host=document.createElement('div');
    host.className='graphics-canvas';
    host.style.cssText='position:fixed;inset:4px auto auto 15px;width:425px;z-index:30';
    host.append(canvas);
    document.body.append(host);
    if(!canvas.getContext('webgl2',{antialias:false})) return null;
    const renderer=createRenderer(canvas,{...DEFAULT_GRAPHICS,quality:'low',shadows:'off',reflections:'off',aa:false},
      {status(){},select(){window.orbitSelected=true;}});
    window.orbitTest={renderer,canvas,host};
    return renderer.cameraState();
  });
  if(!state) {t.skip('WebGL2 unavailable');return;}
  const styles=await page.locator('.orbit-test').evaluate(canvas=>{
    const css=getComputedStyle(canvas);
    const prevented=canvas.dispatchEvent(new Event('contextmenu',{cancelable:true}));
    return [css.touchAction,css.getPropertyValue('user-select')||css.getPropertyValue('-webkit-user-select'),css.getPropertyValue('-webkit-touch-callout'),prevented,
      getComputedStyle(document.body).userSelect];
  });
  assert.deepEqual(styles.slice(0,2),['none','none']);
  if(styles[2]) assert.equal(styles[2],'none');
  assert.equal(styles[3],false);
  assert.notEqual(styles[4],'none');
  const result=await page.evaluate(async ()=>{
    const {renderer,canvas}=window.orbitTest;
    const wheel=deltaY=>canvas.dispatchEvent(new WheelEvent('wheel',{deltaY,cancelable:true}));
    for(let i=0;i<55;i++) wheel(-140);
    await new Promise(requestAnimationFrame);
    const closest=renderer.cameraState();
    for(let i=0;i<90;i++) wheel(140);
    await new Promise(requestAnimationFrame);
    const farthest=renderer.cameraState();
    renderer.reset();
    await new Promise(requestAnimationFrame);
    return {closest,farthest,reset:renderer.cameraState()};
  });
  assert.ok(Math.abs(result.closest.distance-10.5)<.15,JSON.stringify(result.closest));
  assert.ok(result.closest.eye[1]>=4.5);
  assert.ok(Math.abs(result.farthest.distance-40)<.15,JSON.stringify(result.farthest));
  assert.deepEqual(result.reset.target,state.target);
  const canvas=page.locator('.orbit-test');
  const rect=await canvas.boundingBox();
  await page.mouse.move(rect.x+100,rect.y+100);
  await page.mouse.down();
  await page.mouse.move(rect.x+190,rect.y+100,{steps:9});
  await page.mouse.up();
  await page.evaluate(()=>new Promise(requestAnimationFrame));
  const orbit=await page.evaluate(()=>({pose:window.orbitTest.renderer.cameraState(),selected:window.orbitSelected}));
  assert.notDeepEqual(orbit.pose.eye,state.eye);
  assert.ok(orbit.pose.hidden.length>0,JSON.stringify(orbit.pose));
  assert.ok(orbit.pose.eye[1]>=4.5);
  assert.equal(orbit.selected,undefined);
  await page.mouse.move(rect.x+130,rect.y+150);
  await page.mouse.down();
  await page.mouse.move(rect.x+130,rect.y+18,{steps:8});
  await page.mouse.up();
  const shallow=await page.evaluate(async ()=>{
    const {renderer,canvas}=window.orbitTest;
    for (let i=0;i<45;i++) canvas.dispatchEvent(new WheelEvent('wheel',{deltaY:-140,cancelable:true}));
    await new Promise(requestAnimationFrame);
    return renderer.cameraState();
  });
  assert.ok(shallow.eye[1]>=4.5,JSON.stringify(shallow));
  assert.ok(Math.abs(shallow.distance-10.5)<.15,JSON.stringify(shallow));
  assert.equal(await page.evaluate(()=>window.orbitSelected),undefined);
  await page.evaluate(()=>{window.orbitTest.renderer.dispose();window.orbitTest.host.remove();});
});

test('390px competition center filters companies, opens growth details and shows rankings',async t=>{
  const seed=synchronize(initial(),T+8*DAY_MS).state;
  const ui=await open(t,390,844,seed);
  await ui.tap('.bottom-nav [data-page=business]');
  await ui.tap('#competition-open');
  await ui.page.locator('#competition-summary .analysis-hero').waitFor();
  assert.match(await ui.page.locator('#competition-summary').innerText(),/Pazar payım|Yeni galeri koruması/);
  const captures=process.env.COMPETITION_SCREENSHOTS;
  if(captures)await ui.page.screenshot({path:captures+'/summary.png',fullPage:true});
  await ui.tap('#competition-tab-rivals');
  assert.equal(await ui.page.locator('#rival-city option').count(),82);
  if(captures)await ui.page.screenshot({path:captures+'/rivals.png'});
  await ui.page.fill('#rival-search','Kıvıltaş Viraj');
  assert.equal(await ui.page.locator('#rival-list .competition-row').count(),1);
  await ui.tap('#rival-list button');
  const detail=ui.page.locator('#rival-detail');
  assert.ok(await detail.isVisible());
  assert.match(await detail.innerText(),/Kasa · tahmin/);
  await ui.page.selectOption('#rival-period','7');
  assert.ok(await ui.page.locator('#rival-history svg').isVisible());
  await ui.tap('#rival-detail [aria-label="Şirket ayrıntısını kapat"]');
  await ui.tap('#competition-tab-ranks');
  assert.ok(await ui.page.locator('#rival-rank-list [data-player]').isVisible());
  await ui.page.selectOption('#rival-rank-city','34');
  await ui.page.selectOption('#rival-rank-metric','sold');
  assert.match(await ui.page.locator('#rival-rank-list').innerText(),/MOTOR EMPIRE/);
  if(captures)await ui.page.screenshot({path:captures+'/ranks.png'});
  await ui.tap('#competition-tab-news');
  assert.match(await ui.page.locator('#competition-news').innerText(),/rekabet haberi|Gün/);
});

test('320px acquisition requires review and confirmation and commits one deal',async t=>{
  const player=initial();player.cash=5000000;
  const ui=await open(t,320,568,player);
  await ui.tap('.bottom-nav [data-page=business]');
  await ui.tap('#competition-open');
  await ui.tap('#competition-tab-acquisitions');
  if(process.env.COMPETITION_SCREENSHOTS)await ui.page.screenshot({path:process.env.COMPETITION_SCREENSHOTS+'/acquisitions.png'});
  await ui.tap('#competition-acquisitions [data-rival-detail]');
  await ui.page.fill('#rival-price','1');
  await ui.tap('#rival-review-offer');
  await ui.page.waitForFunction(()=>document.querySelector('#rival-offer-status').textContent.includes('reddetti'));
  assert.equal((await ui.state()).cash,player.cash);
  await ui.tap('#rival-detail form button');
  await ui.tap('#competition-acquisitions [data-rival-detail]');
  await ui.tap('#rival-review-offer');
  assert.ok(await ui.page.locator('#rival-confirm-area').isVisible());
  assert.equal((await ui.state()).branches.length,1);
  await ui.tap('#rival-confirm');
  await ui.page.locator('#rival-detail').waitFor({state:'hidden'});
  const result=await ui.state();
  assert.equal(result.competition.acquired,1);
  assert.equal(result.branches.length,2);
  assert.equal(result.competition.companies.length,49);
  await ui.tap('#notification-bell');
  await ui.page.selectOption('#notification-filter','competition');
  assert.equal(await ui.page.locator('.notification-row').count(),1);
});

test('844px competition center keeps business navigation and keyboard tabs',async t=>{
  const ui=await open(t,844,390,initial());
  await ui.tap('.bottom-nav [data-page=business]');
  await ui.tap('#competition-open');
  assert.equal(await ui.page.locator('.bottom-nav [data-page=business]').getAttribute('aria-current'),'page');
  await ui.page.locator('#competition-tab-summary').focus();
  await ui.page.keyboard.press('ArrowRight');
  assert.equal(await ui.page.locator('#competition-tab-rivals').getAttribute('aria-selected'),'true');
  assert.ok(await ui.page.locator('#competition-rivals').isVisible());
  await ui.tap('#competition-page [data-page=business]');
  assert.ok(await ui.page.locator('#business-page').isVisible());
});
