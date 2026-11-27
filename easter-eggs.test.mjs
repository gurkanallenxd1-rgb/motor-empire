import assert from 'node:assert/strict';
import test from 'node:test';
import { modelOf, paintOptions } from './bikes.mjs';
import { HOUR_MS } from './clock.mjs';
import { generateMarket, loadGame, newGame, perform, saveGame, synchronize } from './game.mjs';
import { isYusufListing, yusufListing, YUSUF_GREETING, YUSUF_MODEL, YUSUF_PRICE, YUSUF_REPLIES } from './easter-eggs.mjs';

const findDay = start=>Array.from({length:120},(_,index)=>start+index).find(day=>yusufListing(day));
const act = (state,...args)=>perform(state,...args).state;
function spawn(day,listings=[]) {
  return act({...newGame(),day:day-1,listings,cash:2_000_000},'advance');
}

test('Yusuf appears once per period in Istanbul without changing the daily quota or the normal catalog pool',()=>{
  const days = Array.from({length:480},(_,index)=>index+1).filter(day=>yusufListing(day));
  assert.equal(days.length,4);
  assert.equal(new Set(days.map(day=>Math.floor(day/120))).size,4);
  assert.ok(!generateMarket(1).some(item=>item.name===YUSUF_MODEL));
  const state = spawn(days[0]);
  assert.equal(state.listings.length,510);
  const [listing] = state.listings.filter(isYusufListing);
  assert.deepEqual([listing.name,listing.year,listing.km,listing.condition,listing.colorName,listing.price],
    [YUSUF_MODEL,2024,1390,100,'Turuncu-siyah',YUSUF_PRICE]);
  assert.equal(modelOf(listing).brand,'KTM');
  assert.equal(paintOptions(modelOf(listing),2024)[0].accent,listing.paintAccent);
  const held = act(state,'meet-seller',listing.id).listings.find(isYusufListing);
  assert.equal(spawn(days[1],[held]).listings.filter(isYusufListing).length,1);
  const blocked = {...spawn(days[1]),inspectionArchive:[{id:listing.id,listing,reports:[]}]};
  assert.throws(()=>act(blocked,'resume-inspection',listing.id),/açılamıyor/);
});

test('automatic offers, manual offers, inspection and reload cannot change the fictional seller price',()=>{
  let state = spawn(findDay(1));
  const listing = state.listings.find(isYusufListing);
  state = act(state,'meet-seller',listing.id);
  const first = state.listings.find(isYusufListing).seller;
  assert.equal(first.speech,YUSUF_GREETING);
  assert.deepEqual([first.profile.name,first.profile.job,first.profile.income,first.profile.fictional,
    first.profile.flexibility,first.profile.stubbornness],['Yusuf Belge','Turkcell çalışanı','Asgari ücret',true,0,100]);
  state = act(state,'negotiate',listing.id,first.id);
  state = act(state,'offer-purchase',listing.id,{meetingId:first.id,price:YUSUF_PRICE-1});
  state = act(state,'offer-purchase',listing.id,{meetingId:first.id,price:YUSUF_PRICE});
  const after = state.listings.find(isYusufListing).seller;
  assert.equal(after.round,3);
  assert.equal(after.status,'open');
  assert.ok(YUSUF_REPLIES.includes(after.speech));
  assert.deepEqual([after.price,after.anchor,after.limit],[YUSUF_PRICE,YUSUF_PRICE,YUSUF_PRICE]);
  state = synchronize(state,1_800_000_000_000).state;
  state = act(state,'pre-inspect',listing.id,'full');
  state = synchronize(state,state.clock.wall+6*HOUR_MS).state;
  const values = new Map();
  const storage = {getItem:key=>values.get(key) ?? null,setItem:(key,value)=>values.set(key,value)};
  saveGame(storage,state);
  state = loadGame(storage);
  assert.equal(state.listings.find(isYusufListing).price,YUSUF_PRICE);
  assert.deepEqual(state.listings.find(isYusufListing).seller,after);
  const bought=act(state,'buy-negotiated',listing.id,first.id);
  assert.equal(state.cash-bought.cash,YUSUF_PRICE);
  assert.equal(bought.branches[0].garage[0].spent,YUSUF_PRICE+2400);
  assert.ok(!bought.listings.some(isYusufListing));
});
