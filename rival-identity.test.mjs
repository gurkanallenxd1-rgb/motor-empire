import assert from 'node:assert/strict';
import test from 'node:test';
import {migrateRivalIdentities,nameKey,rivalIdentity} from './rival-identity.mjs';
import {advanceCompetition,createCompetition,rivalRoles,rivalValue,STRATEGIES} from './rivals.mjs';
import {createEconomy} from './economy.mjs';
import {newGame,synchronize} from './game.mjs';
import {BRANCH_TIERS,STAFF_ROLES} from './business.mjs';

test('1,000 deterministic names are distinct after Turkish normalization and the first roster has distinct brands and logos',()=>{
  const strategies=Object.keys(STRATEGIES);
  const roster=Array.from({length:1000},(_,i)=>rivalIdentity(i+1,strategies[i%strategies.length]));
  const names=new Set(roster.map(row=>nameKey(row.name)));
  assert.equal(names.size,1000);
  const signatures=new Set();
  for(const name of names) for(let position=0;position<name.length;position++){
    const fragment=name.slice(0,position)+name.slice(position+1);
    const substitution=position+' '+fragment;
    assert.ok(!names.has(fragment) && !signatures.has(substitution),name);
    signatures.add(substitution);
  }
  assert.equal(new Set(roster.slice(0,64).map(row=>nameKey(row.name.split(' ')[0]))).size,64);
  assert.equal(new Set(roster.slice(0,64).map(row=>JSON.stringify(row.identity))).size,64);
  assert.equal(nameKey('İĞNE MÖTÖR'),nameKey('igne motor'));
  assert.equal(nameKey('IŞIK-Moto'),nameKey('ışık moto'));
});

test('identity migration preserves company IDs, stock, historical names and player state',()=>{
  const state=newGame();
  const old=state.competition;
  delete old.identityVersion;
  const existing=old.companies[0];
  existing.name='Eski Galeri';
  delete existing.identity;
  old.retired=[{id:56,name:'Devredilen Galeri',status:'acquired'}];
  old.takeovers=[{id:56,name:'Devredilen Galeri',history:[[2,3,4,5,6]]}];
  old.news=[{id:existing.id,text:'Eski Galeri bir şube açtı.'}];
  const saved=structuredClone(state);
  const migrated=synchronize(state,1800000000000).state;
  const company=migrated.competition.companies[0];
  assert.equal(company.id,existing.id);
  assert.notEqual(company.name,existing.name);
  assert.equal(company.formerName,existing.name);
  assert.deepEqual(company.stock,existing.stock);
  assert.deepEqual(migrated.competition.takeovers,old.takeovers);
  assert.deepEqual(migrated.competition.retired,old.retired);
  assert.deepEqual(migrated.competition.news,old.news);
  const renewed=JSON.parse(JSON.stringify(migrated));
  assert.equal(migrateRivalIdentities(renewed.competition),renewed.competition);
  assert.deepEqual(state,saved);
  assert.deepEqual(migrated.branches,saved.branches);
  assert.equal(migrated.cash,saved.cash);
});

test('multiple same-day deals draw down unique stock and produce matching revenue and wages',()=>{
  const market=createEconomy(1);
  const world=createCompetition(1,market);
  const buyers=world.companies.filter(c=>c.branches[0].tier>=2);
  assert.ok(buyers.length>1);
  let multiBuy,multiSale,staffChange;
  const sold=new Set();
  const initialStaff=new Map(world.companies.map(c=>[c.id,c.branches[0].staff]));
  for(let day=2;day<=100;day++) {
    advanceCompetition(world,day,createEconomy(day));
    for(const company of world.companies) {
      multiBuy ||= company.daily?.bought>1;
      multiSale ||= company.daily?.sold>1;
      staffChange ||= company.branches[0].staff>initialStaff.get(company.id);
      for(const id of company.daily?.soldIds??[]){
        assert.ok(!sold.has(id));
        sold.add(id);
      }
      for(const branch of company.branches) {
        assert.ok(rivalRoles(branch).every(role=>STAFF_ROLES[role]));
        assert.ok(company.stock.filter(item=>item.branch===branch.id).length<=BRANCH_TIERS[branch.tier].capacity);
      }
      assert.equal(company.cash,company.openingCash+company.cashIn-company.cashOut);
    }
  }
  assert.ok(multiBuy && multiSale && staffChange);
});

test('rival takeovers charge one fee-inclusive payment and transfer actual stock, roles, branch and debt',()=>{
  const world=createCompetition(1);
  world.day=36;
  const buyer=world.companies[36];
  const seller=world.companies[16];
  buyer.risk=95;buyer.cash=25_000_000;buyer.openingCash=buyer.cash;
  seller.debt=100_000;
  seller.branches[0].roles=['inspector','apprentice'];
  seller.branches[0].staff=2;
  seller.stock=[{id:'transfer-target',model:'yamaha-mt25',year:2024,km:1000,condition:95,
    branch:1,origin:seller.province,cost:150_000,reference:165_000,value:165_000,
    repair:0,inspection:750,bought:36,state:'transit',due:40,ask:0,rented:0}];
  world.companies=[buyer,seller];
  for(const company of world.companies)company.bookValue=rivalValue(company);
  world.day=110; // id 37 closes its purchase window on day 111.
  seller.stock[0].due=120;
  buyer.lastAcquisition=0;
  advanceCompetition(world,111,createEconomy(111));
  const deal=world.rivalTakeovers?.[0];
  assert.equal(deal?.id,seller.id);
  assert.equal(deal.buyerId,buyer.id);
  assert.ok(!world.companies.includes(seller));
  assert.equal(world.acquired,0);
  assert.equal(buyer.stock.filter(item=>item.id==='transfer-target').length,1);
  const target=buyer.stock.find(item=>item.id==='transfer-target');
  assert.deepEqual(rivalRoles(buyer.branches.find(branch=>branch.id===target.branch)),['inspector','apprentice']);
  assert.equal(buyer.debt,seller.debt);
  assert.equal(buyer.cash,buyer.openingCash+buyer.cashIn-buyer.cashOut);
  assert.equal(buyer.events.filter(row=>row[1]==='acquisition'&&row[3]===deal.total).length,1);
  assert.equal(buyer.events.filter(row=>row[1]==='inheritedCash'&&row[3]===deal.receivedCash).length,1);
  assert.equal(advanceCompetition(world,111,createEconomy(111)),false);
  assert.equal(world.rivalTakeovers.length,1);
});

test('staff expenses use all six player wage rates and an empty distressed secondary branch can close',()=>{
  const world=createCompetition(1);
  const company=world.companies[0];
  world.companies=[company];
  company.cash=5000;
  company.openingCash=5000;
  company.debt=220000;
  company.stress=12;
  company.branches[0].roles=Object.keys(STAFF_ROLES);
  company.branches[0].staff=6;
  company.branches.push({id:2,province:17,tier:0,roles:[],staff:0});
  company.nextBranch=3;
  advanceCompetition(world,2,createEconomy(2));
  const region=company.regional.find(row=>row[1]===company.province);
  assert.equal(region[3],-250-Object.values(STAFF_ROLES).reduce((sum,role)=>sum+role.wage,0));
  assert.equal(company.branches.length,1);
  assert.ok(world.news.some(item=>item.type==='closure'));
  assert.equal(company.cash,company.openingCash+company.cashIn-company.cashOut);
});
