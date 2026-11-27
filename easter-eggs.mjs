import { stableNumber } from './characters.mjs?v=0.15.3';
import { ISTANBUL } from './provinces.mjs?v=0.15.3';

export const YUSUF_ID = 'yusuf-belge';
export const YUSUF_PRICE = 1_350_000;
export const YUSUF_MODEL = 'KTM 1390 Super Duke R';
export const YUSUF_GREETING = 'Asgari ücretle motor aldım, şimdi satıyorum. Beş kuruş pazarlık yapmam.';
export const YUSUF_REPLIES = Object.freeze([
  'Kardeşim asgari ücretle aldım ben bunu.',
  'Beş kuruş düşmem.',
  'Fiyat son, işine gelirse.',
  'Turkcell’de boşuna mı çalışıyorum?',
  '1390’a biniyoruz, pazarlık yapmıyoruz.',
  'Bir TL bile düşmem.',
]);

export const isYusufListing = listing=>listing?.easterEgg === YUSUF_ID;

export function yusufListing(day) {
  // One encounter day per 120-day block. Each block picks its own day, consistently across reloads.
  const block = Math.floor(day/120);
  if (day%120 !== 65+stableNumber(`yusuf-market:${block}`)%45) return null;
  return {id:`${YUSUF_ID}:${day}`,easterEgg:YUSUF_ID,province:ISTANBUL,name:YUSUF_MODEL,
    year:2024,color:'#e86920',paintAccent:'#292b2e',colorName:'Turuncu-siyah',condition:100,
    km:1390,price:YUSUF_PRICE,value:YUSUF_PRICE,faults:[],damageHistory:[],urgency:'patient'};
}

export function yusufMeeting(listing,day) {
  return {id:`seller:${listing.id}`,kind:'purchase',day,price:YUSUF_PRICE,anchor:YUSUF_PRICE,
    limit:YUSUF_PRICE,fixedSeller:YUSUF_ID,round:0,patience:3,status:'open',speech:YUSUF_GREETING,
    profile:{id:YUSUF_ID,name:'Yusuf Belge',job:'Turkcell çalışanı',income:'Asgari ücret',
      fictional:true,flexibility:0,stubbornness:100,skill:5,patience:3,portrait:{type:'emoji'}}};
}

export function yusufReply(meeting) {
  return YUSUF_REPLIES[stableNumber(`${meeting.id}:${meeting.round}:yusuf`)%YUSUF_REPLIES.length];
}
