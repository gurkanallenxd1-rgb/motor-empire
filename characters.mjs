import { catalog, modelOf } from './bikes.mjs?v=0.15.4';

export const clamp = (value,min,max)=>Math.max(min,Math.min(max,value));

export function stableNumber(key) {
  let result = 2166136261;
  for (let i=0;i<key.length;i+=1) result = Math.imul(result ^ key.charCodeAt(i),16777619);
  return result >>> 0;
}

export const chance = (id,salt)=>(stableNumber(`${salt}|${id}`)%10000)/10000;
const names = ['Deniz','Ece','Mert','Selin','Kerem','İpek','Bora','Derya','Emir','Aylin','Can','Elif'];
const surnames = ['Kaya','Demir','Aksoy','Şahin','Kurt','Aydın','Arslan','Yıldız','Koç','Çelik','Öztürk','Tan'];
const types = [
  ['Acemi sürücü','Mağaza çalışanı'],['Deneyimli sürücü','Teknisyen'],['Kurye','Moto kurye'],
  ['Motosiklet ustası','Servis ustası'],['Galerici','Motosiklet galericisi'],['Koleksiyoncu','Mimar'],
  ['Öğrenci','Üniversite öğrencisi'],['Günlük kullanıcı','Muhasebe uzmanı'],
];
const pick = (items,id,key)=>items[Math.floor(chance(id,key)*items.length)];

export function characterFor(id) {
  const [type,job] = pick(types,id,'occupation');
  const preferred = pick(catalog,id,'model');
  const score = key=>Math.round(chance(id,key)*100);
  const wealth = score('wealth');
  const age = type==='Öğrenci' ? 19+Math.floor(chance(id,'age')*10) : 21+Math.floor(chance(id,'age')*47);
  const experience = type==='Acemi sürücü' ? Math.min(2,age-18) : Math.round(chance(id,'experience')*(age-18));
  return {id,type,job,age,name:`${pick(names,id,'first')} ${pick(surnames,id,'last')}`,portrait:{type:'emoji'},
    knowledge:score('motorcycles'),mechanical:score('mechanics'),trust:score('trust'),skepticism:score('skepticism'),
    wealth,budget:Math.round(35000+(wealth/100)**2*1850000),risk:score('risk'),experience,skill:1+Math.floor(chance(id,'skill')*5),
    patience:2+Math.floor(chance(id,'patience')*3),urgency:pick(['normal','urgent','patient'],id,'urgency'),
    brand:preferred.brand,model:preferred.id,category:preferred.category};
}

export const QUESTIONS = Object.freeze({
  history:'Kaza veya şasi hasarı geçmişi var mı?', maintenance:'Bakımlar nasıl, hangi parçalar işlem gördü?',
  inspection:'Ekspertiz veya servis belgesini görebilir miyim?', price:'Bu fiyatı neye göre belirlediniz?',
});
export const ANSWERS = Object.freeze({
  disclose:'Durumu açıkça anlat', document:'Belgeyi göster', deny:'Bir sorun olmadığını söyle', defer:'Yanıtı ertele',
});
export const STRATEGIES = Object.freeze({
  damaged:'Hasarlı haliyle açıkça sat', repaired:'Onarılmış aracı geçmişiyle sat',
  documented:'Belgeli satış', conceal:'Hasarı açıklamadan sat', cosmetic:'Görsel bakım yapıp riskli sat',
});
export const RESOLUTIONS = Object.freeze({
  repair:'Ücretsiz onarım', compensation:'Kısmi tazminat', refund:'Motosikleti geri al', dismiss:'Şikâyeti reddet',
});
export const isRisky = strategy=>strategy==='conceal' || strategy==='cosmetic';
export const hasDocuments = bike=>Boolean(bike.garageInspection || bike.lastRepair ||
  bike.inspections?.some(report=>report.package==='full' && report.result));
export const reputationTier = score=>score>=90 ? 'Prestijli galeri' : score>=70 ? 'Güvenilir galeri'
  : score>=40 ? 'Ortalama galeri' : score>=20 ? 'Şüpheli galeri' : 'Güvenilmez galeri';

export function setReputation(state,delta,reason) {
  const trade = state.trade;
  const history = trade.reputationHistory ??= [{day:state.day,score:trade.reputation,reason:'Başlangıç'}];
  trade.reputation = clamp(trade.reputation+delta,0,100);
  if (history.at(-1).score!==trade.reputation) history.push({day:state.day,score:trade.reputation,reason});
}

export function rememberSale(state,sale,meeting) {
  const profile = meeting.profile;
  if (!profile.id) return;
  const customers = state.trade.customers ??= {};
  const member = customers[profile.id] ?? {id:profile.id,purchases:0,visits:0};
  member.purchases++;
  member.lastModel = sale.name;
  member.lastAnswers = meeting.dialogue?.answers ?? [];
  member.lastDay = sale.day;
  member.satisfaction = state.trade.history[0].satisfaction;
  customers[profile.id] = member;
  const notes = isRisky(sale.strategy) ? 'Satış tamamlandı. Araç hakkında daha fazla bilgi faydalı olurdu.'
    : sale.strategy==='documented' ? 'Raporları ve servis kayıtlarını inceleyerek aldım.'
    : 'Satıcı aracın durumunu anlaşılır biçimde paylaştı.';
  (state.trade.reviews ??= []).unshift({saleId:sale.id,customerId:profile.id,person:profile.name,
    day:sale.day,stars:clamp(Math.round(member.satisfaction/20),1,5),text:notes});
}

export function complaintCost(sale,choice,repairQuote) {
  if (choice==='refund') return sale.price;
  if (choice==='repair') return Math.max(650,repairQuote(sale.openComplaint.item).cost,Math.round(sale.price*.045));
  if (choice==='compensation') return Math.max(500,Math.round(sale.price*.085));
  return 0;
}

export function reviewComplaint(state,sale,choice,day = state.day) {
  const review = state.trade.reviews?.find(item=>item.saleId===sale.id);
  if (!review) return;
  const feedback = {
    open:[2,'Satıştan sonra açıklanmayan hasar ortaya çıktı.'],
    repair:[4,'Hasar sonradan ortaya çıktı. Galeri ücretsiz onarım sağladı.'],
    compensation:[3,'Galeri hasar için kısmi tazminat ödedi.'],
    refund:[3,'Hasar nedeniyle aracı iade ettim. Galeri ücreti geri ödedi.'],
    dismiss:[1,'Bildirdiğim hasar için çözüm sunulmadı.'],
  };
  [review.stars,review.text] = feedback[choice];
  review.day = day;
  const customer = state.trade.customers?.[review.customerId];
  if (customer) customer.satisfaction = review.stars*20;
  state.trade.reviews.sort((a,b)=>b.day-a.day);
}

export function recallCustomer(trade,bike,day,index) {
  const key = `${bike.id}:${day}:${index}`;
  if (!trade || chance(key,'returning') >= .08+trade.reputation*.004) return null;
  const peers = Object.values(trade.customers ?? {}).filter(item=>item.purchases && item.satisfaction>=60
    && item.lastDay<day && !bike.meetings.some(meeting=>meeting.profile.id===item.id));
  const model = modelOf(bike);
  const interests = peers.filter(item=>{
    const profile = characterFor(item.id);
    return profile.brand===model?.brand || profile.category===model?.category || item.lastModel===bike.name;
  });
  return pick(interests.length ? interests : peers,key,'returning-person') ?? null;
}
