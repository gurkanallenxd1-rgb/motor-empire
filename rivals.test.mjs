import assert from 'node:assert/strict';
import test from 'node:test';
import {advanceCompetition,competitiveChoice,createCompetition,rivalOffer,rivalValue} from './rivals.mjs';
import {assets,loadGame,newGame,perform,saveGame,synchronize,STORAGE_KEY} from './game.mjs';
import {createEconomy} from './economy.mjs';
import {financeReport} from './finance.mjs';
import {createBuyer} from './trade.mjs';
import {DAY_MS} from './clock.mjs';
import {createTimeStore} from './time-store.mjs';
import {rivalSimulation} from './tests/rival-simulation.mjs';

const WALL=1800000000000;
const start=()=>synchronize(newGame(),WALL).state;
function storageFor(state) {
  const values=new Map([[STORAGE_KEY,JSON.stringify(state)]]);
  return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
}

test('migration creates 50 fictional rivals and preserves every existing field',()=>{
  const old=start();
  delete old.competition;
  const storage=storageFor(old);
  const loaded=loadGame(storage);
  const result=synchronize(loaded,WALL).state;
  const {competition,...preserved}=result;
  assert.deepEqual(preserved,loaded);
  assert.equal(competition.companies.length,50);
  assert.equal(new Set(competition.companies.map(c=>c.name)).size,50);
  assert.equal(new Set(competition.companies.map(c=>c.strategy)).size,10);
  assert.ok(competition.companies.some(c=>c.stock.length>0));
  assert.equal(result.cash,75000);
  assert.equal(assets(result).net,75000);
});

test('rival advances once per day and reproduces from a serialized prior day',()=>{
  const economy=createEconomy(1);
  const a=createCompetition(1,economy),b=structuredClone(a);
  for(let day=2;day<31;day++){
    advanceCompetition(a,day,createEconomy(day));
    advanceCompetition(b,day,createEconomy(day));
  }
  assert.deepEqual(a,b);
  const snapshot=JSON.stringify(a);
  assert.equal(advanceCompetition(a,30,createEconomy(30)),false);
  assert.equal(JSON.stringify(a),snapshot);
  assert.ok(a.sold>0);
  assert.ok(a.companies.some(c=>c.events.some(row=>row[1]==='sale')));
});

test('two time stores consume the same 60 capped offline days once',async()=>{
  const storage=storageFor(start());
  let serial=Promise.resolve();
  const lock=task=>{
    const pending=serial.then(task);
    serial=pending.catch(()=>{});
    return pending;
  };
  const now=()=>WALL+120*DAY_MS;
  const a=createTimeStore(storage,lock,now),b=createTimeStore(storage,lock,now);
  const [one,two]=await Promise.all([a(),b()]);
  assert.equal(one.summary.days,60);
  assert.equal(two.state.day,61);
  assert.equal(two.state.competition.day,61);
  assert.equal(two.summary,null);
  assert.deepEqual(two.state.competition,one.state.competition);
  assert.equal(two.state.cash,75000-60*250);
});

test('takeover rejects low, stale, unaffordable or unconfirmed offers and transfers components just once',()=>{
  const state=start();
  const listed=state.competition.companies.find(c=>c.status==='listed');
  listed.debt=38500;
  state.cash=10000000;
  const quote=rivalOffer(listed);
  const terms={price:quote.threshold,stamp:state.competition.day,confirmed:true};
  assert.throws(()=>perform(state,'acquire-rival',listed.id,{...terms,price:1}),/reddetti/);
  assert.throws(()=>perform(state,'acquire-rival',listed.id,{...terms,stamp:0}),/değişti/);
  assert.throws(()=>perform(state,'acquire-rival',listed.id,{...terms,confirmed:false}),/Onaylı/);
  assert.throws(()=>perform({...state,cash:0},'acquire-rival',listed.id,terms),/yeterli/);
  const result=perform(state,'acquire-rival',listed.id,terms).state;
  assert.equal(result.cash,state.cash-quote.total+listed.cash);
  assert.equal(result.debt,state.debt+listed.debt);
  assert.equal(result.branches.length,1+listed.branches.length);
  assert.equal(result.branches.at(-1).workers.length,listed.branches[0].staff);
  assert.deepEqual(result.branches.slice(1).flatMap(b=>b.garage).map(b=>b.id),listed.stock.map(b=>b.id));
  assert.equal(result.competition.companies.length,49);
  assert.equal(result.inbox.items[0].type,'competition');
  assert.equal(financeReport(result,assets(result),30).periodTotals.profit,0);
  assert.throws(()=>perform(result,'acquire-rival',listed.id,terms),/Onaylı/);
  const storage=storageFor(state);saveGame(storage,result);
  assert.deepEqual(loadGame(storage),result);
});

test('insolvency sells assets and settles liabilities before recording bankruptcy',()=>{
  const world=createCompetition(1);
  const company=world.companies[0];
  company.cash=0;company.openingCash=0;company.debt=450000;company.stress=41;
  advanceCompetition(world,2,createEconomy(2));
  const retired=world.retired.find(row=>row.id===company.id);
  assert.ok(retired);
  assert.equal(retired.status,'bankrupt');
  assert.equal(retired.cash,retired.openingCash+retired.cashIn-retired.cashOut);
  assert.equal(retired.cash,0);
  assert.ok(retired.debt<450000 && retired.debt>0);
  assert.ok(world.news.some(row=>row.type==='bankrupt'));
  assert.equal(rivalValue(company),-retired.debt);
});

test('new merchants are protected and established buyers have explainable rival alternatives',()=>{
  const world=createCompetition(1);
  const company=world.companies[0];
  company.reputation=94;company.satisfaction=96;
  company.stock=[{model:'yamaha-mt25',condition:100,km:100,ask:30000,branch:1,state:'ready'}];
  const bike={name:'Yamaha MT-25',condition:70,km:30000,ask:140000};
  for(let i=0;i<100;i++){
    const meeting={id:'comparison-'+i,limit:150000,profile:{brand:'Yamaha'}};
    assert.equal(competitiveChoice(world,meeting,bike,company.province,49,{protected:true}),null);
  }
  assert.equal(world.customerNotes.length,0);
  const decisions=Array.from({length:100},(_,i)=>competitiveChoice(world,
    {id:'comparison-'+i,limit:150000,profile:{brand:'Yamaha'}},bike,company.province,49)).filter(Boolean);
  assert.ok(decisions.length>0 && decisions.length<45);
  assert.ok(decisions.every(row=>row.reason==='daha uygun toplam fiyat'));
  assert.ok(world.customerNotes.length<=18);
});

test('1000-day rival balance keeps prices, records, cash and market concentration within bounds',()=>{
  const result=rivalSimulation(1000,{insolvent:true});
  assert.ok(result.bankrupt>0 && result.entrants>0 && result.sales>1000);
  assert.ok(result.active>=40);
  assert.ok(result.maxAskRatio<1.14);
});

test('stale takeovers submitted by two tabs commit just one transfer',async()=>{
  const seed=start();
  seed.cash=5000000;
  const company=seed.competition.companies.find(c=>c.status==='listed');
  const quote=rivalOffer(company);
  const storage=storageFor(seed);
  let tail=Promise.resolve();
  const lock=task=>(tail=tail.then(task));
  const a=createTimeStore(storage,lock,()=>WALL);
  const b=createTimeStore(storage,lock,()=>WALL);
  const offer={price:quote.threshold,stamp:seed.day,confirmed:true};
  const [first,second]=await Promise.all([a('acquire-rival',company.id,offer),b('acquire-rival',company.id,offer)]);
  assert.equal(first.error,undefined);
  assert.match(second.error.message,/Onaylı/);
  assert.equal(second.state.cash,seed.cash-quote.total+company.cash);
  assert.equal(second.state.competition.acquired,1);
  assert.equal(second.state.branches.length,seed.branches.length+company.branches.length);
});

test('acquired branch buys, inspects, repairs, lists, negotiates and sells after reload',()=>{
  let state=start();
  state.cash=5000000;
  const company=state.competition.companies.find(c=>c.status==='listed');
  const quote=rivalOffer(company);
  state=perform(state,'acquire-rival',company.id,{price:quote.threshold,stamp:state.day,confirmed:true}).state;
  const branch=state.branches[1];
  assert.ok(state.competition.takeovers.some(row=>row.id===company.id&&row.total===quote.total));
  assert.equal(state.ledger.find(row=>row.label.endsWith(' şirket devralması')).category,'company_investment');
  for(const bike of branch.garage)bike.autoPaused=true;
  for(const role of ['manager','inspector','master','sales'])
    state=perform(state,'hire-worker',undefined,role,branch.id).state;
  state=perform(state,'upgrade-office',undefined,undefined,branch.id).state;
  const settings={buy:true,inspect:true,repair:true,list:true,negotiate:true,sell:true,
    maxPrice:150000,minProfit:0,budget:180000,reserve:20000,brand:'',minCc:0,maxCc:3000};
  const item={id:'branch-e2e',name:'Yamaha R25',year:2021,km:21000,price:30000,value:110000,
    province:branch.province,condition:82,faults:['lastik'],damageHistory:[],color:'#3560ab',colorName:'Mavi'};
  state.listings=[item];
  state=perform(state,'buy',item.id,undefined,branch.id).state;
  state=perform(state,'set-automation',undefined,settings,branch.id).state;
  state=synchronize(state,WALL+DAY_MS).state;
  assert.ok(state.branches[1].autoReport.history.some(row=>row.step==='buy'&&row.id!==item.id));
  const data=storageFor(state);
  state=loadGame(data);
  state=perform(state,'set-automation',undefined,{...settings,buy:false},branch.id).state;
  state=synchronize(state,WALL+DAY_MS+16*DAY_MS/24).state;
  const listed=state.branches[1].garage.find(bike=>bike.id===item.id);
  assert.equal(listed?.stage,'listed');
  listed.nextVisit=state.day+5;
  const meeting=createBuyer({...listed,tradeStrategy:undefined},state.day,0,50,110000,{name:'Deniz Kaya',price:listed.spent-50});
  listed.meetings=[{...meeting,limit:100000,patience:4,profile:{...meeting.profile,skill:0}}];
  state=synchronize(state,WALL+2*DAY_MS).state;
  assert.ok(state.sales.some(sale=>sale.branchId===branch.id&&sale.name===item.name));
  const steps=state.branches[1].autoReport.history.filter(row=>row.id===item.id).map(row=>row.step);
  for(const step of ['inspect','repair','list','negotiate','sell'])assert.ok(steps.includes(step),step);
  assert.equal(state.ledger.filter(row=>row.branchId===branch.id&&row.category==='repair'&&row.model===item.name).length,1);
  assert.equal(state.competition.companies.some(row=>row.id===company.id),false);
});
