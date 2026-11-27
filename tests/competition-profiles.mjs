import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
import {assets,newGame,perform,purchaseForecast,synchronize} from '../game.mjs';
import {DAY_MS} from '../clock.mjs';
import {isYusufListing} from '../easter-eggs.mjs';
import {rivalValue} from '../rivals.mjs';

const WALL=1800000000000;
const action=(s,name,id,value,branch=1)=>perform(s,name,id,value,branch).state;
const profiles=[['Başlangıç',75000,1],['Orta',1000000,1],['Gelişmiş',6500000,4]];
const number=value=>Math.round(value*100)/100;
const config={buy:true,inspect:true,repair:true,list:true,sell:true,negotiate:true,maxPrice:125000,
  minProfit:4000,budget:250000,reserve:55000,brand:'',minCc:0,maxCc:3000};

function starterTrade(state) {
  const bike=state.branches[0].garage[0];
  if(bike?.stage==='listed') {
    const offer=bike.meetings.find(m=>m.status==='open'&&m.price>=bike.spent);
    return offer?action(state,'sell',bike.id,offer.id):state;
  }
  if(bike?.stage==='ready')return action(state,'list',bike.id);
  if(bike?.stage==='unchecked')return action(state,'inspect',bike.id);
  if(bike)return state;
  const target=state.listings.filter(item=>!isYusufListing(item)&&item.province===34&&!item.faults.length
      &&item.price<state.cash-7000 && !item.seller)
    .map(item=>({item,profit:purchaseForecast(item,item.price,34,state.economy).profit}))
    .sort((a,b)=>b.profit-a.profit).find(row=>row.profit>7000);
  return target?action(state,'buy',target.item.id):state;
}

export function profileSimulation() {
  const report=[];
  for(const [name,cash,branches] of profiles){
    let state=synchronize({...newGame(),cash},WALL).state;
    if(name!=='Başlangıç'){
      for(const province of [6,35,16].slice(0,branches-1))state=action(state,'open-office',undefined,{province,tier:1});
      for(const branch of state.branches){
        for(const role of ['manager','inspector','master','sales'])state=action(state,'hire-worker',undefined,role,branch.id);
        state=action(state,'set-automation',undefined,config,branch.id);
      }
    }
    let elapsed=0;
    let tickTime=0;
    let largestShare=0;
    const initialWorth=assets(state).net;
    for(const limit of [30,90,365]){
      while(elapsed<limit){
        const step=Math.min(name==='Başlangıç'?3:30,limit-elapsed);
        elapsed+=step;
        const start=performance.now();
        state=synchronize(state,WALL+elapsed*DAY_MS).state;
        tickTime+=performance.now()-start;
        if(name==='Başlangıç')state=starterTrade(state);
        assert.equal(state.competition.day,state.day);
        for(const c of state.competition.companies){
          assert.equal(c.cash,c.openingCash+c.cashIn-c.cashOut);
          assert.equal(c.bookValue,rivalValue(c));
          if(state.day>=31)largestShare=Math.max(largestShare,c.marketShare);
        }
      }
      const worth=assets(state).net;
      const flows=state.ledger.reduce((total,row)=>total+row.amount*(['income','loan'].includes(row.kind)?1:-1),0);
      assert.equal(number(state.cash-cash-flows),0);
      assert.ok(largestShare<.20);
      const list=state.competition.companies;
      const sales=state.sales.filter(row=>!row.returnedDay&&row.day>=state.day-29).length;
      const rivalSales=list.reduce((total,c)=>total+c.history.slice(-30).reduce((n,row)=>n+row[3],0),0);
      report.push({name,days:limit,net:Math.round(worth),growth:number((worth/initialWorth-1)*100),
        cash:state.cash,debt:state.debt,playerSales:state.sales.length,share:number(100*sales/Math.max(1,sales+rivalSales)),
        rivals:list.length,newCompanies:state.competition.founded-50,bankrupt:state.competition.bankrupt,
        rivalSales:state.competition.sold,rivalWorth:Math.round(list.reduce((sum,c)=>sum+c.bookValue,0)/list.length),
        topRivalShare:number(100*Math.max(...list.map(c=>c.marketShare))),cashDifference:0,
        bytes:Buffer.byteLength(JSON.stringify(state)),avgTickMs:number(tickTime/elapsed)});
    }
  }
  return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  for(const row of profileSimulation())console.log(JSON.stringify(row));
}
