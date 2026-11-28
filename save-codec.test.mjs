import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeSave,encodeSave} from './save-codec.mjs';
import {loadGame,newGame,STORAGE_KEY,synchronize} from './game.mjs';
import {createTimeStore} from './time-store.mjs';
import {garageLayout,garageParking,garageStock} from './garage-layout.mjs';

const wall=1800000000000;
test('a large Unicode save round-trips all structured records with lossless compression',()=>{
  const state=synchronize(newGame(),wall).state;
  state.archivedAudit=Array.from({length:40_000},(_,id)=>({id,name:'Çanakkale şubesi',amount:12345,detail:'Ödenen ekspertiz ve tamir'}));
  const encoded=encodeSave(state);
  assert.ok(encoded.startsWith('motor:gzip:1:'));
  assert.ok(encoded.length<JSON.stringify(state).length/3);
  assert.deepEqual(decodeSave(encoded),state);
  assert.deepEqual(loadGame({getItem:key=>key===STORAGE_KEY?encoded:null}),state);
});

test('quota failure during a locked action preserves the last save and allows reloading it',async()=>{
  const state=synchronize(newGame(),wall).state;
  let raw=JSON.stringify(state);
  const storage={getItem:()=>raw,setItem(){throw new DOMException('Quota','QuotaExceededError');}};
  const transact=createTimeStore(storage,task=>task(),()=>wall);
  await assert.rejects(async()=>transact('borrow',null,1000),/kotası doldu/);
  assert.equal(raw,JSON.stringify(state));
  assert.deepEqual(loadGame(storage),state);
  assert.equal((await transact('refresh')).state.cash,state.cash);
});

test('a truncated compressed save is reported and left untouched',async()=>{
  const full=encodeSave({history:'Motosiklet'.repeat(180_000)});
  const partial=full.slice(0,-50);
  let writes=0;
  const storage={getItem:()=>partial,setItem(){writes++;}};
  await assert.rejects(async()=>createTimeStore(storage,task=>task(),()=>wall)(),/Kayıt okunamadı/);
  assert.equal(writes,0);
});

test('2D and 3D receive all eight physically parked bikes with separate reservations and service subset',()=>{
  const stages=['ready','listed','internalRepair','unchecked','repairing','internalInspection','ready','listed','shipping','rented'];
  const inventory=stages.map((stage,slot)=>({id:String(slot),stage,slot}));
  const stats=garageStock(inventory,10);
  assert.deepEqual(stats,{capacity:10,physical:8,shipping:1,reserved:2,free:0,service:4,ready:4});
  assert.equal(garageParking(garageLayout(10),inventory).length,stats.physical);
  inventory[8].stage='unchecked';
  assert.equal(garageStock(inventory,10).physical,9);
  assert.equal(garageParking(garageLayout(10),inventory).length,9);
});
