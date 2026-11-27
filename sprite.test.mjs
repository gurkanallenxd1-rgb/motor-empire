import test from 'node:test';
import assert from 'node:assert/strict';
import { applyPaint, paintFor, spriteFor, spriteKey } from './sprite.mjs';

import { generationFor } from './generations.mjs';

const approved = {
  modelId:'yamaha-mt25', firstYear:2022,lastYear:2024,base:'mt25.webp',mask:'mt25-mask.webp',
  source:'https://example.test/source',author:'Test',license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',
};

test('selects only an unambiguous licensed model and year with its own mask',()=>{
  assert.equal(spriteFor({name:'Yamaha MT-25',year:2023},[approved]),approved);
  for(const bike of [{name:'Yamaha MT-07',year:2023},{name:'Yamaha MT-25',year:2021},{name:'Yamaha MT-25',year:'2023'}]){
    assert.equal(spriteFor(bike,[approved]),null);
  }
  const bike={name:'Yamaha MT-25',year:2023};
  assert.equal(spriteFor(bike,[approved,approved]),null);
  assert.equal(spriteFor(bike,[{...approved,licenseUrl:''}]),null);
  assert.equal(spriteFor(bike,[{...approved,mask:approved.base}]),null);
  assert.equal(spriteFor(bike,[{...approved,base:'../other.webp'}]),null);
});

test('paint preserves unmasked metal, tires and the base alpha channel',()=>{
  const original=[128,128,128,255, 40,45,50,255, 200,205,210,255, 30,30,30,0, 80,90,100,140];
  const pixels=new Uint8ClampedArray(original);
  const mask=new Uint8ClampedArray([0,0,0,255, 0,0,0,0, 0,0,0,0, 0,0,0,255, 0,0,0,128]);
  applyPaint(pixels,mask,'#ff0000');
  assert.deepEqual([...pixels.slice(0,4)],[255,1,1,255]);
  assert.deepEqual([...pixels.slice(4,16)],original.slice(4,16));
  assert.equal(pixels[19],140);
  assert.ok(pixels[16]>original[16]&&pixels[17]<original[17]);
});

test('separate paint channels colour only their own surfaces and retain unmasked pixels',()=>{
  const colors = new Uint8ClampedArray([128,128,128,255,128,128,128,255,44,59,72,255]);
  const mask = new Uint8ClampedArray([255,0,0,255,0,255,0,255,0,0,0,255]);
  applyPaint(colors,mask,'#ff0000',0);
  applyPaint(colors,mask,'#0000ff',1);
  assert.deepEqual([...colors],[255,1,1,255,1,1,255,255,44,59,72,255]);
});

test('factory variants and retained paint contribute to the same sprite identity across contexts',()=>{
  const early = {name:'Yamaha MT-09',year:2021,color:'#3564ba'};
  const newer = {...early,year:2024};
  assert.notDeepEqual(generationFor('yamaha-mt09',2021).rect,generationFor('yamaha-mt09',2024).rect);
  assert.notEqual(spriteKey(early),spriteKey(newer));
  assert.equal(generationFor('yamaha-mt09','2024'),null);
  assert.equal(generationFor('yamaha-mt09',2017),null);
  assert.deepEqual(paintFor({...early,color:'#bf5014',paintAccent:'#113377'}),{color:'#bf5014',accent:'#113377'});
  assert.notEqual(spriteKey({...early,paintAccent:'#113377'}),spriteKey(early));
  assert.equal(spriteKey({...early,stage:'repairing',spent:41900}),spriteKey(early));
});

test('each catalog model, production year and palette maps to an existing model-specific image',async()=>{
  const {existsSync} = await import('node:fs');
  const {catalog,paintOptions} = await import('./bikes.mjs');
  const {atlasFor,legacySprite} = await import('./model-atlas.mjs');
  const occupied = new Map();
  for (const model of catalog) for (let year=model.firstYear;year<=model.lastYear;year++) {
    const palette = paintOptions(model,year);
    assert.ok(palette.length && palette.every(paint=>/^#[a-f0-9]{6}$/i.test(paint?.hex)),model.id+' '+year);
    const art = generationFor(model.id,year) ?? atlasFor(model.id) ?? (legacySprite(model.id) && {
      base:`models/${model.id}.webp`,mask:`model-masks/${model.id}.webp`,
    });
    assert.ok(art,model.id+' '+year);
    for (const path of [art.base,art.mask]) assert.ok(existsSync(new URL('./assets/'+path,import.meta.url)),path);
    const key = JSON.stringify([art.base,art.rect]);
    assert.ok(!occupied.has(key) || occupied.get(key)===model.id,'Duplicate source assignment: '+model.id);
    occupied.set(key,model.id);
  }
  assert.notEqual(spriteKey({name:'Vespa Primavera 125',year:2023}),spriteKey({name:'Vespa Primavera 125',year:2024}));
});

test('adding the Easter egg cannot shift packed models into their neighbours’ cells',async()=>{
  const {atlasFor} = await import('./model-atlas.mjs');
  const firstAfterEasterEgg = atlasFor('ktm-rc125');
  assert.equal(firstAfterEasterEgg.base,'expanded/pack-08.webp');
  assert.deepEqual(firstAfterEasterEgg.rect,[0,0,320,248]);
  assert.deepEqual(atlasFor('harley-sportster-s').rect,[320,248,320,248]);
  assert.deepEqual(atlasFor('vespa-primavera125').rect,[640,248,320,248]);
  assert.equal(atlasFor('ktm-super-duke1390'),null);
});
