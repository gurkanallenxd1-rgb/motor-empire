import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { DAY_MS,HOUR_MS } from '../clock.mjs';
import { newGame,perform,purchaseAnalysis,synchronize } from '../game.mjs';
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
const signed = (amount,share)=>(amount>0?'+':'')+money(amount)+' · '+pct.format(share || 0);
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
  await page.goto('https://motor.test/');
  await ready();
  return {page,tap,ready,state,jump,text,market,row,negotiation};
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
  await ui.text('#live-before-value',money(85000));
  await ui.text('#live-after-value',money(analysis.beforeValue));
  await ui.text('#live-inspection-difference',signed(-analysis.difference,-analysis.differenceShare));
  assert.equal(await ui.page.locator('#meeting-analysis').evaluate(el=>el.open),false);
});

test('390×844 WebKit separates seller and conditional discounts, persists anchor across refresh and save',async t=>{
  const seed = act(inspected(),'meet-seller',fixture.id);
  delete seed.listings[0].inspectionBaseline; // v0.12.2 stored reports without the baseline.
  const active = seed.listings[0].seller;
  const ui = await open(t,390,844,seed);
  await ui.market();
  await ui.row();
  await ui.negotiation();
  await ui.page.waitForFunction(()=>JSON.parse(localStorage.getItem('motor-empire.v9')).listings[0].inspectionBaseline===85000);
  const input = ui.page.locator('#player-offer');
  await input.fill('30000');
  await ui.text('#live-start-price','48.000 TL');
  await ui.text('#live-seller-price','48.000 TL');
  await ui.text('#live-seller-discount',signed(0,0));
  const analysis = purchaseAnalysis(seed.listings[0],active);
  await ui.text('#live-damage-loss',signed(-analysis.damageLoss,-analysis.damageLossShare));
  await ui.text('#live-potential-discount',signed(18000,18000/48000));
  await ui.tap('#meeting-negotiate');
  await ui.page.waitForFunction(()=>JSON.parse(localStorage.getItem('motor-empire.v9')).listings.find(x=>x.id==='holiday-prices').seller.round===1);
  const submitted = (await ui.state()).listings.find(item=>item.id===fixture.id).seller;
  assert.equal(submitted.id,active.id);
  assert.equal(submitted.playerOffer,30000);
  await ui.jump(2*DAY_MS);
  await ui.page.waitForFunction(()=>JSON.parse(localStorage.getItem('motor-empire.v9')).day===3);
  await ui.page.reload();await ui.ready();await ui.market();
  await ui.tap('#inspection-follow > summary');
  await ui.tap('#inspection-follow [data-action=meet-seller]');
  await ui.text('#live-start-price','48.000 TL');
  await ui.text('#live-seller-price',money(submitted.price));
  await ui.text('#live-seller-discount',signed(48000-submitted.price,(48000-submitted.price)/48000));
  assert.equal((await ui.state()).listings.find(item=>item.id===fixture.id).seller.round,1);
});

test('844×390 WebKit number entry and touched slider immediately refresh DOM without a saved offer',async t=>{
  const seed = act(inspected(),'meet-seller',fixture.id);
  const ui = await open(t,844,390,seed);
  await ui.market();await ui.row();await ui.negotiation();
  const bike = seed.listings[0];
  const analysis = purchaseAnalysis(bike,bike.seller);
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
  await check(90000);
  assert.ok(await ui.page.locator('#meeting-negotiate').isDisabled());
  assert.match(await ui.page.locator('#live-sale-profit').getAttribute('class'),/negative/);
  const rect = await range.boundingBox();
  await range.tap({position:{x:rect.width*.27,y:rect.height/2}});
  const sliderAmount = Number(await range.inputValue());
  assert.notEqual(sliderAmount,90000);
  assert.equal(Number(await numberInput.inputValue()),sliderAmount);
  await check(sliderAmount);
  await numberInput.fill('');
  await ui.text('#live-total-cost','—');
  assert.equal((await ui.state()).listings[0].seller.round,0);
  assert.equal((await ui.state()).listings[0].seller.playerOffer,undefined);
});
