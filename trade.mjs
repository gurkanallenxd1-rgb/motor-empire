import { modelOf } from './bikes.mjs?v=0.12';

export const MAX_ROUNDS = 3;
export const createTrade = () => ({ reputation:50, history:[] });
const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
const roundPrice = price => Math.max(50,Math.round(price / 50) * 50);

const roles = [
  { type:'Öğrenci', job:'Üniversite öğrencisi', category:'commuter', goal:'Kampüse gidip gelmek', personality:'Tutumlu', skill:4, patience:3, premium:.88 },
  { type:'Kurye', job:'Moto kurye', category:'scooter', goal:'Günlük teslimat yapmak', personality:'Pratik', skill:4, patience:2, premium:.94 },
  { type:'Motosiklet tutkunu', job:'Tasarımcı', category:'sport', goal:'Hafta sonu sürüşleri', personality:'Meraklı', skill:2, patience:4, premium:1.06 },
  { type:'Koleksiyoncu', job:'Mimar', category:'naked', goal:'Koleksiyonuna bir model eklemek', personality:'Seçici', skill:3, patience:4, premium:1.12 },
  { type:'Günlük kullanıcı', job:'Muhasebe uzmanı', category:'commuter', goal:'İşe gidip gelmek', personality:'Sakin', skill:2, patience:4, premium:.99 },
  { type:'Galerici', job:'Motosiklet galericisi', category:'naked', goal:'Yeniden satış', personality:'Hesapçı', skill:5, patience:3, premium:.92 },
  { type:'İşletme sahibi', job:'Kafe işletmecisi', category:'scooter', goal:'İşletme işleri ve ulaşım', personality:'Kararlı', skill:3, patience:3, premium:1.03 },
  { type:'Yeni ehliyet almış sürücü', job:'Mağaza çalışanı', category:'commuter', goal:'İlk motosikletini almak', personality:'Temkinli', skill:1, patience:4, premium:1.01 },
];
const firstNames = ['Deniz','Ece','Mert','Selin','Kerem','İpek','Bora','Derya','Emir','Aylin','Can','Elif'];
const lastNames = ['Kaya','Demir','Aksoy','Şahin','Kurt','Aydın','Arslan','Yıldız','Koç','Çelik','Öztürk','Tan'];
const avatars = ['🧑','👩','👨','👩🏻','👨🏽','🧑🏾','👩🏽','👨🏻'];

export function stableNumber(key) {
  let result = 2166136261;
  for (let i=0;i<key.length;i+=1) result = Math.imul(result ^ key.charCodeAt(i),16777619);
  return result >>> 0;
}

function profileFor(key) {
  const seed = stableNumber(key);
  const role = roles[(seed >>> 5) % roles.length];
  const age = role.type === 'Öğrenci' ? 19 + (seed % 8) : 21 + (seed % 46);
  return {
    ...role, age,
    name: `${firstNames[seed % firstNames.length]} ${lastNames[(seed >>> 9) % lastNames.length]}`,
    avatar: avatars[(seed >>> 16) % avatars.length],
  };
}

function buyerSpeech(bike, profile, category, seed) {
  let lines;
  if (bike.km > 40000) lines = ['Motor güzel ama kilometresi biraz yüksek.','Bu kilometrede bakımların düzenli yapılmış olması önemli.'];
  else if (bike.condition < 86) lines = ['Kondisyonu görünce teklifimi onun üzerinden değerlendirdim.','Biraz yıpranmış. Yine de ilgileniyorum.'];
  else if (profile.type === 'Kurye') lines = ['Kurye olarak kullanacağım, yakıt tüketimi nasıl?','Teslimatlarda her gün bineceğim. Bakım masrafları nasıl?'];
  else if (profile.category === category) lines = ['Bu model uzun zamandır aradığım motor.','Aradığım sınıfta bir motosiklet. Fiyatta anlaşabiliriz.'];
  else lines = ['Nakit alacağım, son fiyatınız nedir?','Rengi hoşuma gitti. Fiyat konusunda ne düşünürsünüz?','İlanı gördüm. Bugün bir teklif vermek istiyorum.'];
  return lines[seed % lines.length];
}

export function createBuyer(bike,day,index,reputation,value,legacy) {
  const id = `buyer:${bike.id}:${day}:${index}`;
  const seed = stableNumber(id);
  const profile = profileFor(id);
  if (legacy) profile.name = legacy.name;
  const category = modelOf(bike)?.category;
  const fit = profile.category === category ? .07 : -.035;
  const condition = (bike.condition - 90) * .0018;
  const mileage = Math.min(.11,bike.km / 650000);
  const request = bike.disclosureMode && seed%3!==0 ? (seed%2 ? 'history' : 'inspection') : null;
  const trust = bike.disclosureMode==='disclose' && bike.damageHistory?.length ? .018 : request && bike.disclosureMode==='conceal' ? -.025 : 0;
  const budget = roundPrice(value * (profile.premium + fit + condition - mileage + trust + (reputation - 50) * .0018));
  const price = legacy?.price ?? Math.min(bike.ask,roundPrice(budget * (.76 + (seed % 14) / 100)));
  return { id, kind:'sale', profile, day, price, anchor:bike.ask, limit:Math.max(price,budget), round:0, patience:profile.patience,
    status:'open', ...(request ? {request} : {}), speech:request==='history' ? 'Hasar geçmişini görebilir miyim?'
      : request==='inspection' ? 'Ekspertiz ve servis bilgilerini paylaşır mısınız?' : buyerSpeech(bike,profile,category,seed) };
}

export function createSeller(bike,day) {
  const id = 'seller:' + bike.id;
  const profile = profileFor(id);
  const seed = stableNumber(id);
  const speech = ['İlandaki fiyatı gördünüz. Siz ne teklif ediyorsunuz?','Motoru görmek isteyenler var, ama teklifinizi dinleyebilirim.','Ciddi bir teklif verirseniz fiyatta biraz esneyebilirim.'];
  return { id, kind:'purchase', profile, day, price:bike.price, anchor:bike.price,
    limit:Math.min(bike.price,roundPrice(bike.price * (.78 + (seed % 15) / 100))), round:0, patience:profile.patience,
    status:'open', speech:speech[seed % speech.length] };
}

export const isActive = meeting => meeting && ['open','agreed'].includes(meeting.status);

export function arrive(bike,day,reputation,value) {
  if (day < bike.nextVisit) return 0;
  const classDemand = (modelOf(bike)?.demand ?? .08) - .07;
  const demand = clamp(.76 + classDemand + (reputation - 50) * .006 + (bike.condition - 85) * .008
    - Math.max(0,bike.ask / value - 1) * .72 - Math.min(.24,bike.km / 250000),.10,1);
  const visits = (stableNumber(`${bike.id}:${day}:demand`) % 100) / 100 < demand ? 1 + Math.floor(reputation / 35) : 0;
  const count = Math.min(visits,5 - bike.meetings.filter(isActive).length);
  for (let i=0;i<count;i+=1) bike.meetings.push(createBuyer(bike,day,i,reputation,value));
  return count;
}

export function negotiate(meeting) {
  if (meeting.status !== 'open' || meeting.round >= MAX_ROUNDS || meeting.patience <= 0) {
    throw new Error('Bu görüşmede pazarlık hakkı kalmadı.');
  }
  meeting.round += 1;
  meeting.patience -= 1;
  const buyer = meeting.kind === 'sale';
  const gap = Math.abs(meeting.limit - meeting.price);
  const roll = stableNumber(`${meeting.id}:${meeting.round}:automatic`) % 100;
  const resistance = meeting.profile.skill * 3 + (meeting.round - 1) * 8;
  if ((roll < resistance && meeting.patience === 0) || (meeting.round > 1 && roll < 5)) {
    meeting.status = 'left';
    meeting.speech = buyer ? 'Bütçeme uygun başka ilanlara bakacağım.' : 'Bu fiyata daha fazla bekleyemem. Görüşmeyi bitirelim.';
    return;
  }
  if (!gap || roll < resistance) {
    meeting.speech = buyer ? 'Bu turda teklifimi artıramam. Önceki teklifim geçerli.' : 'Bu turda indirim yapamam. Önceki fiyatım geçerli.';
    return;
  }
  const fraction = .18 + (6 - meeting.profile.skill) * .065 + (roll % 17) / 100 + meeting.round * .035;
  const step = Math.min(gap,roundPrice(gap * fraction));
  meeting.price = Math.round((meeting.price + (buyer ? step : -step)) * 100) / 100;
  meeting.speech = buyer
    ? ['Teklifimi biraz yükseltebilirim.','Bu fiyat benim için daha zor ama yapabilirim.','Yeni teklifimi değerlendirin.'][roll % 3]
    : ['Sizin için fiyatı biraz düşürdüm.','Bu indirimle anlaşabiliriz.','Bundan biraz daha aşağı inebilirim.'][roll % 3];
}

export function finishTrade(state,meeting,bike,outcome) {
  meeting.status = outcome;
  const sold = outcome === 'sold';
  const satisfaction = sold ? clamp(Math.round(90 - meeting.round * 4
    - Math.max(0,meeting.price / meeting.anchor - 1) * 44 + (meeting.patience - 1) * 2 + (bike.disclosureMode==='disclose' && bike.damageHistory?.length ? 5 : 0)),30,100) : null;
  if (sold) state.trade.reputation = clamp(state.trade.reputation + (satisfaction >= 80 ? 3 : 1),0,100);
  if (outcome === 'left' && meeting.kind === 'sale') state.trade.reputation = clamp(state.trade.reputation - 1,0,100);
  state.trade.history.unshift({
    day:state.day, kind:meeting.kind, name:bike.name, person:meeting.profile.name, outcome,
    rounds:meeting.round, price:meeting.price, satisfaction,
  });
}

export function tradeSummary(trade) {
  const buyers = trade.history.filter(row => row.kind === 'sale' && row.outcome !== 'expired');
  const sales = buyers.filter(row => row.outcome === 'sold');
  const average = sales.length ? Math.round(sales.reduce((total,row) => total + row.satisfaction,0) / sales.length) : null;
  return { success:buyers.length ? Math.round(sales.length * 100 / buyers.length) : null, average };
}
