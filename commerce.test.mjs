import assert from 'node:assert/strict';
import test from 'node:test';
import {managedAsking,purchaseForecast,managedOffer,shouldNegotiate} from './commerce.mjs';
import {advanceCompetition,createCompetition,rivalValue,wholesaleMarket} from './rivals.mjs';
import {createEconomy} from './economy.mjs';

test('common asking, negotiation and forecast use the same price floor and sale horizon',()=>{
  const bike={id:'plan',name:'Vespa Primavera 125',year:2023,km:18000,condition:90,
    value:130000,price:90000,spent:90000,stockDay:1,listedDay:1,faults:[],province:34,
    marketTerms:{value:1,days:9,demand:1,realization:.95,risk:.15}};
  const quote=purchaseForecast(bike,bike.price,34);
  assert.equal(quote.saleDays,9);
  assert.equal(quote.delivery.fee,0);
  assert.ok(quote.profit>0);
  assert.ok(managedAsking(bike,4000,20,true)>=94000);
  const old={status:'open',price:85000,patience:1,round:3,staffHandled:true};
  const next={status:'open',price:83000,patience:2,round:0};
  assert.equal(managedOffer([old,next],94000),next);
  assert.equal(shouldNegotiate(next,94000,.7),true);
});

test('rival sources distinct actual ads and keeps a reconciled operational summary',()=>{
  const world=createCompetition(1);
  const market=createEconomy(2);
  const source=wholesaleMarket(2,market);
  advanceCompetition(world,2,market,[],null,source);
  const bikes=world.companies.flatMap(company=>company.stock);
  assert.ok(bikes.length>25);
  assert.equal(bikes.length,source.taken.size);
  for(const company of world.companies) {
    assert.equal(company.cash,company.openingCash+company.cashIn-company.cashOut);
    assert.equal(company.bookValue,rivalValue(company));
    assert.equal(company.operations.occupied,company.stock.length);
    assert.ok(company.operations.capacity>=company.operations.occupied);
    assert.equal(company.history.at(-1)[10],company.daily.purchaseSpend??0);
  }
});
