import { pathToFileURL } from 'node:url';
import { DAY_MS } from '../clock.mjs';
import { branchCapacity, newGame, perform, purchaseForecast, synchronize } from '../game.mjs';
import { macroFor } from '../economy.mjs';
import { isYusufListing } from '../easter-eggs.mjs';

const wall = 1800000000000;
const begin = cash=>synchronize({...newGame(),cash},wall).state;
const action = (state,type,amount)=>perform(state,type,undefined,amount).state;
const round = value=>Math.round(value*100)/100;

export function simulateEconomy() {
  const capital = 750000;
  let idle = begin(75000);
  let trading = begin(capital);
  for (const role of ['manager','sales','inspector','master']) trading = action(trading,'hire-worker',role);
  trading = action(trading,'set-automation',{buy:true,sell:true,inspect:true,repair:true,list:true,negotiate:true,
    maxPrice:115000,budget:160000,minProfit:4500,reserve:45000,minCc:0,maxCc:3000,brand:''});
  const report = [];
  let elapsed = 0;
  let priceIndex = [Infinity,-Infinity];
  let largestMove = 0;
  let last;
  const news = new Set();
  const partsRange = [Infinity,-Infinity];
  for (const limit of [30,90,365]) {
    while (elapsed<limit) {
      const step = Math.min(30,limit-elapsed);
      elapsed += step;
      idle = synchronize(idle,wall+elapsed*DAY_MS).state;
      trading = synchronize(trading,wall+elapsed*DAY_MS).state;
      for (const item of trading.inbox?.items ?? []) if (item.type==='economy') news.add(item.id);
      for (const row of trading.economy.history) {
        if (last && row.day<=last.day) continue;
        priceIndex = [Math.min(priceIndex[0],...row.index),Math.max(priceIndex[1],...row.index)];
        if (last) for (const [i,price] of row.index.entries())
          largestMove = Math.max(largestMove,Math.abs(price/last.index[i]-1));
        const parts = macroFor(row.day).parts;
        partsRange[0] = Math.min(partsRange[0],parts);
        partsRange[1] = Math.max(partsRange[1],parts);
        last = row;
      }
    }
    const estimates = trading.listings.filter(item=>!isYusufListing(item)).map(item=>purchaseForecast(item,item.price,34,trading.economy));
    const cashFlow = trading.ledger.reduce((sum,row)=>sum+(row.kind==='income'||row.kind==='loan' ? row.amount : -row.amount),0);
    const buyDays = new Map();
    for (const row of trading.ledger.filter(item=>item.category==='purchase')) {
      buyDays.set(row.day,(buyDays.get(row.day) ?? 0)+row.amount);
    }
    report.push({
      days:limit,priceIndex,largestDailyMove:round(largestMove*100),partsIndex:trading.economy.macro.parts,partsRange:[...partsRange],
      opportunities:estimates.filter(item=>item.profit>0).length,belowBreakEven:estimates.filter(item=>item.profit<0).length,
      idleCash:idle.cash,idleDebt:idle.debt,idleIncome:idle.ledger.filter(row=>row.kind==='income').length,
      cash:trading.cash,debt:trading.debt,sales:trading.sales.length,purchases:trading.ledger.filter(row=>row.category==='purchase').length,
      lowestSaleMargin:Math.min(...trading.sales.map(sale=>sale.price-sale.spent)),
      saleMargin:round(trading.sales.reduce((sum,sale)=>sum+sale.price-sale.spent,0)),
      salesRevenue:round(trading.sales.reduce((sum,sale)=>sum+sale.price,0)),
      highestDailyPurchases:Math.max(0,...buyDays.values()),stock:trading.branches[0].garage.length,
      capacity:branchCapacity(trading.branches[0]),reconciliation:round(trading.cash-capital-cashFlow),
      news:news.size,
    });
  }
  return report;
}

if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) console.log(JSON.stringify(simulateEconomy(),null,2));
