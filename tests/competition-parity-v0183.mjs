import assert from 'node:assert/strict';
import {branchCapacity,newGame,perform,synchronize} from '../game.mjs';
import {BRANCH_TIERS} from '../business.mjs';
import {DAY_MS} from '../clock.mjs';
import {createCompetition} from '../rivals.mjs';
import {financeReport} from '../finance.mjs';
import {assets} from '../game.mjs';

const wall=1800000000000;
const roles=['manager','inspector','master','sales'];
const capital=1_500_000;
const tier=2;
const state=newGame();
state.branches[0].tier=tier;
state.cash=capital;
state.competition=createCompetition(state.day);
const rival=state.competition.companies[5];
Object.assign(rival,{cash:capital,openingCash:capital,cashIn:0,cashOut:0,debt:0,province:34});
Object.assign(rival.branches[0],{tier,province:34,staff:roles.length,roles});
assert.equal(branchCapacity(state.branches[0]),BRANCH_TIERS[rival.branches[0].tier].capacity);
let player=synchronize(state,wall).state;
for(const role of roles)player=perform(player,'hire-worker',null,role).state;
player=perform(player,'set-automation',null,{
  buy:true,inspect:true,repair:true,list:true,negotiate:true,sell:true,maxPrice:350_000,
  minProfit:4000,budget:1_500_000,reserve:120_000,brand:'',minCc:0,maxCc:3000,
}).state;
const result=synchronize(player,wall+30*DAY_MS).state;
const competitor=result.competition.companies.find(company=>company.id===rival.id);
assert.ok(competitor.totalSold>0 && result.sales.length>0);
assert.equal(competitor.cash,competitor.openingCash+competitor.cashIn-competitor.cashOut);
const summary=financeReport(result,assets(result),30).periodTotals;
console.log(JSON.stringify({days:30,capital,tier,roles,province:34,
  player:{bought:result.ledger.filter(row=>row.category==='purchase').length,sold:result.sales.length,
    revenue:summary.revenue,profit:summary.profit,netWorth:assets(result).net,cash:result.cash},
  rival:{bought:competitor.totalBought,sold:competitor.totalSold,revenue:competitor.turnover,
    profit:competitor.profit,netWorth:competitor.bookValue,cash:competitor.cash}}));
