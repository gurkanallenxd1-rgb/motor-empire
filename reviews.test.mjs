import assert from 'node:assert/strict';
import test from 'node:test';
import {evaluateSale,saleReview,starsFor,REVIEW_TEMPLATES,complaintReview} from './reviews.mjs';
import {gallerySummary} from './gallery-view.mjs';

const clean={condition:100,km:1200,value:100000,faults:[],damageHistory:[]};
const buyer={price:100000,round:0,patience:3,profile:{knowledge:55,skepticism:50}};
const score=(bike,meeting,options)=>evaluateSale(bike,meeting,{honest:true,...options});
test('clean and fairly priced documented sales reach five without making it automatic',()=>{
  const documented={...clean,garageInspection:{result:[{area:'Motor',codes:[]}]}};
  assert.equal(starsFor(score(documented,buyer)),5);
  assert.ok(score(documented,buyer)>score(clean,buyer));
  assert.ok(starsFor(score(clean,{...buyer,price:113000,round:2,patience:1}))<5);
  assert.ok(score(clean,buyer,{worker:{skill:95,quality:95}})>score(clean,buyer,{worker:{skill:40,quality:40}}));
  const strict={...buyer,profile:{knowledge:100,skepticism:100}};
  assert.ok(score(clean,strict)<score(clean,buyer));
  const damaged={...clean,condition:64,faults:['saseIslem','zincir'],damageHistory:['saseIslem']};
  assert.ok(score(damaged,buyer,{honest:false})<score(damaged,buyer));
  assert.deepEqual([0,35,55,75,90].map(starsFor),[1,2,3,4,5]);
});
test('84 unique templates only enter contexts supported by sale data',()=>{
  const all=Object.values(REVIEW_TEMPLATES).flat();
  assert.equal(new Set(all).size,84);
  const base={price:100000,day:1,inspections:[]};
  const samples=new Set(Array.from({length:2000},(_,i)=>saleReview(clean,buyer,base,96,undefined,i*1459)));
  assert.ok(samples.size>=12);
  for(const group of ['proof','prompt','staff','hidden','support','returning','bargaining'])
    assert.ok(REVIEW_TEMPLATES[group].every(text=>!samples.has(text)),group);
  assert.equal(complaintReview('repair',5)[0],4);
  assert.match(complaintReview('refund',2)[1],/iade/i);
  assert.ok(REVIEW_TEMPLATES.hidden.includes(complaintReview('open',5)[1]));
});
test('gallery statistics distinguish old reviews, recent ratings, repeat buyers and resolutions',()=>{
  const result=gallerySummary({day:50,trade:{reviews:[{stars:5,day:50},{stars:4,day:1},{stars:2,day:49}],
    customers:{first:{purchases:3},second:{purchases:1}}},sales:[
    {openComplaint:{}},{complaintResult:{outcome:'refund'}},{complaintResult:{outcome:'dismiss'}},
  ]});
  assert.deepEqual(result.counts,[0,1,0,1,1]);
  assert.equal(result.recent,3.5);
  assert.equal(result.repeat,1);
  assert.equal(result.complaints,3);
  assert.equal(result.resolved,1);
});
