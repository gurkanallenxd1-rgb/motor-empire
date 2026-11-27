import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir,readFile } from 'node:fs/promises';
import test from 'node:test';
import { DEFAULT_GRAPHICS,GRAPHICS_KEY,QUALITY,graphicsOptions,initialQuality,prototypeAllowed,
  qualityProfile,readGraphics,worldBays,writeGraphics } from './graphics/config.mjs';
import { MOTORCYCLE_3D,motorcycleAsset } from './graphics/registry.mjs';
import { loadGame,newGame,STORAGE_KEY } from './game.mjs';
import { catalog } from './bikes.mjs';

test('3D is opt-in, respects only ten bays and saves its settings separately',()=>{
  const seed=newGame();
  const game=JSON.stringify(seed);
  const storage=new Map([[STORAGE_KEY,game]]);
  const port={getItem:name=>storage.get(name) ?? null,setItem:(name,value)=>storage.set(name,value)};
  assert.deepEqual(readGraphics(port),DEFAULT_GRAPHICS);
  writeGraphics(port,{mode:'3d',quality:'ultra',fps:30,meter:true});
  const settings = readGraphics(port);
  assert.equal(settings.quality,'ultra');
  assert.equal(settings.fps,30);
  assert.equal(settings.meter,true);
  assert.ok(storage.has(GRAPHICS_KEY));
  assert.equal(storage.get(STORAGE_KEY),game);
  assert.deepEqual(loadGame(port),seed);
  assert.deepEqual([2,5,10,20,40].map(capacity=>prototypeAllowed(settings,capacity)),[false,false,true,false,false]);
  assert.equal(worldBays.length,10);
  assert.equal(new Set(worldBays.map(value=>value.join(','))).size,10);
  assert.deepEqual(readGraphics({getItem(){throw Error('Quota');}}),DEFAULT_GRAPHICS);
});

test('automatic and explicit profiles have bounded backing size, shadows and LOD',()=>{
  assert.equal(initialQuality({memory:2,cores:8}),'low');
  assert.equal(initialQuality({cores:8}),'medium');
  const normalized=graphicsOptions({quality:'high',shadows:'off',reflections:'low',resolution:'high',fps:120});
  assert.equal(normalized.fps,60);
  assert.deepEqual(qualityProfile(normalized),{...QUALITY.high,name:'high',shadow:0,reflection:.25,dpr:2});
  assert.equal(qualityProfile(graphicsOptions(),'low').lod,5);
});

test('target model mappings verify catalog IDs and never substitute an unlicensed model',()=>{
  assert.equal(MOTORCYCLE_3D.length,3);
  for (const row of MOTORCYCLE_3D) {
    const item=catalog.find(item=>item.id===row.id);
    assert.ok(item.firstYear<=row.year && item.lastYear>=row.year);
    assert.equal(motorcycleAsset(row.id,row.year,row.colors[0],row.accent),null);
  }
  assert.equal(motorcycleAsset('unrelated',2024,'#292b2e'),null);
});

test('original 2D catalogue and every previously tracked graphic asset match the v0.16.1 SHA-256 baseline',async()=>{
  const manifest=JSON.parse(await readFile(new URL('./docs/graphics-catalog-baseline.json',import.meta.url),'utf8'));
  async function entries(prefix) {
    const files=await readdir(new URL('./'+prefix,import.meta.url),{withFileTypes:true});
    const nested=await Promise.all(files.filter(file=>file.name!=='3d').map(file=>
      file.isDirectory() ? entries(prefix+'/'+file.name) : [prefix+'/'+file.name]));
    return nested.flat();
  }
  assert.deepEqual((await entries('assets')).sort(),Object.keys(manifest.sha256).filter(name=>name.startsWith('assets/')).sort());
  for (const [name,digest] of Object.entries(manifest.sha256)) {
    const file=await readFile(new URL('./'+name,import.meta.url));
    assert.equal(createHash('sha256').update(file).digest('hex'),digest,name);
  }
});

test('authored plinth is a self-contained metallic glTF 2.0 binary',async()=>{
  const bytes=await readFile(new URL('./assets/3d/models/showroom-plinth.glb',import.meta.url));
  assert.equal(bytes.toString('ascii',0,4),'glTF');
  assert.equal(bytes.readUInt32LE(4),2);
  assert.equal(bytes.readUInt32LE(8),bytes.length);
  const manifest=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));
  assert.equal(manifest.meshes.length,3);
  assert.ok(manifest.materials.some(x=>x.pbrMetallicRoughness.metallicFactor>.5));
  assert.equal(manifest.buffers[0].uri,undefined);
});
