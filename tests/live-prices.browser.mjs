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

const require = createRequire(import.meta.url);
const {webkit,devices} = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const T = 1800000000000;
const contentTypes = {html:'text/html',mjs:'text/javascript',css:'text/css',webp:'image/webp'};
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
before(async()=>{browser=await webkit.launch();});
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
  await ready();
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
    const {loadSprite} = await import('/sprite.mjs?v=0.15.1');
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
