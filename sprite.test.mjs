import test from 'node:test';
import assert from 'node:assert/strict';
import { applyPaint, spriteFor } from './sprite.mjs';

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
