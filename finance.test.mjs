import test from 'node:test';
import assert from 'node:assert/strict';
import { debtSummary,dailyCashMovement,filterTransactions,financeReport,pendingCosts } from './finance.mjs';
import { assets,INSPECTION_FEE,LEGACY_STORAGE_KEY,LOAN_LIMIT,STORAGE_KEY,TURKEY_STORAGE_KEY,
  loadGame,newGame,perform,saveGame } from './game.mjs';
import { repairForecast } from './damage.mjs';
import { shippingQuote } from './provinces.mjs';

const act = (state,...args)=>perform(state,...args).state;
const stock = {id:'stock',name:'Yamaha R25',year:2021,km:22000,price:21000,value:98000,condition:80,
  faults:['fren'],color:'#3564ba',colorName:'Mavi'};
const ledger = (day,kind,amount,label,branchId=1)=>({day,kind,amount,label,branchId});
const report = (state,period=0)=>financeReport(state,assets(state),period);
const memoryStore = (key,raw)=>{
  const items = new Map([[key,raw]]);
  return {getItem:key=>items.get(key) ?? null,setItem:(key,value)=>items.set(key,value)};
};

test('stock, capex and financing change cash while a sale recognizes all vehicle costs exactly once',()=>{
  const entries = [
    ledger(2,'income',50000,'Yamaha R25 satışı'),ledger(2,'income',201.35,'Honda PCX 125 kira geliri'),
    ledger(2,'expense',35.12,'Faiz gideri',null),ledger(2,'repayment',500,'Borç ödemesi',null),
    ledger(1,'expense',1100,'Yamaha R25 nakliyesi · Ankara'),
    ledger(1,'expense',1100,'Yamaha R25 tamir parçaları'),ledger(1,'expense',450,'Yamaha R25 ekspertizi'),
    ledger(1,'expense',21000,'Yamaha R25 alımı'),ledger(1,'expense',50000,'Garaj geliştirme'),
    ledger(1,'expense',250,'Günlük işletme gideri'),ledger(1,'expense',750,'Usta maaşları'),
    ledger(1,'loan',1000,'Alınan borç',null),
  ];
  const cash = 75000+dailyCashMovement(entries,1)+dailyCashMovement(entries,2);
  const state = {...newGame(),day:2,cash,debt:500,ledger:entries,
    sales:[{name:'Yamaha R25',day:2,price:50000,spent:23650}]};
  const result = report(state);
  assert.equal(result.entries.length,entries.length);
  assert.equal(result.series[0].profit,-1000);
  assert.equal(result.series[0].cash,1350);
  assert.equal(result.today.salesCount,1);
  assert.equal(result.today.salesRevenue,50000);
  assert.equal(result.today.salesCost,23650);
  assert.equal(result.today.revenue,50201.35);
  assert.equal(result.today.rentalDays,1);
  assert.equal(result.today.operatingCost,23685.12);
  assert.equal(result.today.profit,26516.23);
  assert.equal(result.totals.profit,25516.23);
  assert.equal(result.totals.cashIn,51201.35);
  assert.equal(result.totals.cashOut,75185.12);
  assert.equal(result.totals.interest,35.12);
  assert.deepEqual(debtSummary(state,result.totals,LOAN_LIMIT),
    {principal:500,interestRate:0,totalRepayment:1035.12,paid:500,interestPaid:35.12,
      available:249500,installments:null,nextDay:null});
});

test('expense history combines date, category and branch filters and decodes old model labels',()=>{
  const state = {...newGame(),day:8,ledger:[
    ledger(8,'expense',900,'Yamaha R25 nakliyesi · Kocaeli',2),
    ledger(7,'expense',1500,'Honda PCX 125 nakliyesi · İzmir',1),
    ledger(5,'expense',750,'Usta maaşları',1),
    ledger(5,'loan',1200,'Alınan borç',null),ledger(2,'expense',50000,'Garaj geliştirme',1),
  ]};
  const {entries,series,periodTotals} = report(state,7);
  const [transport] = filterTransactions(entries,{category:'shipping',branch:'1',from:2,to:7});
  assert.equal(transport.model,'Honda PCX 125');
  assert.equal(transport.change,-1500);
  assert.equal(filterTransactions(entries,{branch:'unassigned'})[0].category,'loan');
  assert.deepEqual(filterTransactions(entries,{from:7,to:4}),[]);
  assert.equal(series.length,7);
  assert.equal(series[0].day,2);
  assert.equal(series[1].profit,null);
  assert.equal(periodTotals.profit,-750);
  for (const [period,count] of [[7,7],[30,30],[90,90],[0,5]]) {
    assert.equal(report({...state,day:95},period).series.length,count);
  }
});

test('a matching archived sale appears once, and older unmatched sales retain their own cost',()=>{
  const old = {version:1,day:6,cash:90000,garage:[],listings:[],sales:[
    {name:'Yamaha R25',day:1,price:48000,spent:39000},
    {name:'Yamaha R25',day:1,price:48000,spent:42000},
  ]};
  const raw = JSON.stringify(old);
  const storage=memoryStore(LEGACY_STORAGE_KEY,raw);
  const migrated=loadGame(storage);
  const state={...migrated,ledger:[ledger(1,'income',48000,'Yamaha R25 satışı')]};
  const result=report(state,7);
  assert.equal(result.entries.length,2);
  assert.equal(result.entries.filter(row=>row.archived).length,1);
  assert.equal(result.totals.salesCount,2);
  assert.equal(result.totals.profit,15000);
  assert.equal(result.series[0].cash,null);
  assert.equal(result.series[0].netWorth,null);
  assert.equal(result.series[0].profit,15000);
  saveGame(storage,migrated);
  assert.equal(storage.getItem(LEGACY_STORAGE_KEY),raw);
});

test('live gameplay accrues freight and tamir only once, and keeps exact closing snapshots on reload',()=>{
  let state={...newGame(),listings:[{...stock,province:41}]};
  state=act(state,'borrow',undefined,5000);
  state=act(state,'buy',stock.id);
  const freight=shippingQuote(41).fee;
  assert.equal(pendingCosts(state,repairForecast,INSPECTION_FEE).shipping,freight);
  assert.equal(report(state).today.profit,0);
  state=act(state,'advance');
  const dayOneCash=75000+5000-stock.price-freight-250;
  assert.deepEqual(state.financeSnapshots,[{day:1,cash:dayOneCash,netWorth:assets(state).net}]);
  assert.equal(pendingCosts(state,repairForecast,INSPECTION_FEE).shipping,0);
  state=act(state,'inspect',stock.id);
  const estimate=repairForecast(state.branches[0].garage[0]);
  assert.equal(pendingCosts(state,repairForecast,INSPECTION_FEE).repairUnpaid,estimate.cost);
  state=act(state,'repair',stock.id);
  const pending=pendingCosts(state,repairForecast,INSPECTION_FEE);
  assert.equal(pending.repairPaid,estimate.cost);
  assert.equal(pending.repairUnpaid,0);
  assert.equal(pending.estimatedStockProfit,estimate.afterValue-stock.price-freight-INSPECTION_FEE-estimate.cost);
  state=act(state,'repay',undefined,700);
  const storage=memoryStore(STORAGE_KEY,JSON.stringify(state));
  assert.deepEqual(loadGame(storage),state);
  state=act(loadGame(storage),'advance');
  assert.equal(pendingCosts(state,repairForecast,INSPECTION_FEE).repairPaid,0);
  const totals=report(state);
  assert.equal(totals.series[0].cash,dayOneCash);
  assert.equal(totals.series[0].netWorth,state.financeSnapshots[0].netWorth);
  assert.equal(totals.totals.profit,-500);
  assert.equal(totals.totals.principalPaid,700);
  assert.equal(state.ledger.filter(entry=>entry.category==='shipping').length,1);
  assert.equal(state.ledger.filter(entry=>entry.category==='repair').length,1);
});

test('v0.9 migration preserves a truck in transit and active bargaining without inventing net wealth history',()=>{
  const original={...newGame(),listings:[{...stock,province:65},{...stock,id:'seller',province:6}]};
  let state=act(original,'buy',stock.id);
  state=act(state,'advance');
  state={...state,listings:[{...stock,id:'seller',province:6}]};
  state=act(state,'meet-seller','seller');
  const {financeSnapshots,...previous}=state;
  previous.version=6;
  previous.ledger=previous.ledger.map(({category,model,...row})=>row);
  const raw=JSON.stringify(previous);
  const storage=memoryStore(TURKEY_STORAGE_KEY,raw);
  const migrated=loadGame(storage);
  for (const key of ['cash','debt','branches','sales','listings','trade']) assert.deepEqual(migrated[key],previous[key]);
  assert.equal(migrated.ledger.find(row=>row.category==='shipping').model,stock.name);
  assert.equal(report(migrated,7).series[0].netWorth,null);
  assert.equal(report(migrated,7).series[0].cash,migrated.cash);
  saveGame(storage,migrated);
  assert.equal(storage.getItem(TURKEY_STORAGE_KEY),raw);
  assert.equal(loadGame(storage).version,8);
});
