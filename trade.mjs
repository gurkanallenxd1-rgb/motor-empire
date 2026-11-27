import { isYusufListing, yusufMeeting, yusufReply, YUSUF_ID, YUSUF_PRICE } from './easter-eggs.mjs?v=0.16';
import { ANSWERS, QUESTIONS, characterFor, chance, clamp, hasDocuments, isRisky, recallCustomer,
  setReputation, stableNumber } from './characters.mjs?v=0.16';
export { stableNumber } from './characters.mjs?v=0.16';
import { modelOf } from './bikes.mjs?v=0.16';

export const MAX_ROUNDS = 3;
export const createTrade = () => ({ reputation:50, history:[] });
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

const feminineNames = new Set(['Ece','Selin','İpek','Aylin','Elif']);
const masculineNames = new Set(['Mert','Kerem','Bora','Emir','Can']);

export function avatarForName(name) {
  const first = name?.trim().split(/\s+/,1)[0];
  if (feminineNames.has(first)) return '👩';
  if (masculineNames.has(first)) return '👨';
  return '🧑';
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

export function createBuyer(bike,day,index,reputation,value,legacy,trade) {
  const id = `buyer:${bike.id}:${day}:${index}`;
  const seed = stableNumber(id);
  const memory = bike.tradeStrategy ? recallCustomer(trade,bike,day,index) : null;
  const enhanced = bike.tradeStrategy && !legacy;
  const profile = enhanced ? characterFor(memory?.id ?? `buyer-${stableNumber(id)%2400}`) : profileFor(id);
  if (legacy) profile.name = legacy.name;
  const category = modelOf(bike)?.category;
  const model = modelOf(bike);
  const fit = (profile.category === category ? .07 : -.035)
    +(profile.model===model?.id && profile.id ? .06 : profile.brand===model?.brand && profile.id ? .025 : 0);
  const condition = (bike.condition - 90) * .0018;
  const mileage = Math.min(.11,bike.km / 650000);
  const rememberedProof = memory?.lastAnswers?.some(answer=>answer.choice==='disclose' || answer.choice==='document');
  const requestChance = enhanced ? clamp(.34-(rememberedProof ? .07 : 0)+(profile.experience<3 ? .11 : 0)+(profile.skepticism-profile.trust)*.002+(60-reputation)*.003,.16,.82) : 0;
  const topics = Object.keys(QUESTIONS);
  const request = enhanced ? (chance(id,'ask') < requestChance ? topics[seed%topics.length] : null) : bike.disclosureMode && seed%3!==0 ? (seed%2 ? 'history' : 'inspection') : null;
  const trust = bike.disclosureMode==='disclose' && bike.damageHistory?.length ? .018 : request && bike.disclosureMode==='conceal' ? -.025 : 0;
  const riskyPremium = enhanced && isRisky(bike.tradeStrategy)
    ? (1-(profile.knowledge+profile.mechanical)/200)*(bike.cosmeticPresentation ? .20 : .11) : 0;
  const calculatedBudget = roundPrice(value * (bike.marketTerms?.budget ?? 1) * ((enhanced ? .89+profile.wealth*.0025 : profile.premium) + fit + condition - mileage + trust + riskyPremium + (reputation - 50) * .0018));
  const budget = enhanced ? Math.min(roundPrice(profile.budget*(bike.marketTerms?.budget ?? 1)),calculatedBudget) : calculatedBudget;
  const price = legacy?.price ?? Math.min(bike.ask,roundPrice(budget * (.76 + (seed % 14) / 100)));
  return { id, kind:'sale', profile, day, price, anchor:bike.ask, limit:Math.max(price,budget), round:0, patience:profile.patience,
    status:'open', ...(request ? {request} : {}),
    ...(enhanced ? {budgetCap:roundPrice(profile.budget*(bike.marketTerms?.budget ?? 1)),dialogue:{answers:[],suspicion:0,
      ...(memory ? {memoryTrust:Math.round((memory.satisfaction-50)*.2)+(rememberedProof ? 5 : 0)} : {})},
      returning:Boolean(memory)} : {}),
    speech:memory ? `Geçen alışverişimde ${memory.lastModel} almıştım. ${rememberedProof
      ? 'O zaman aracın durumunu açıkça anlatmıştınız. ' : ''}${request ? QUESTIONS[request] : 'Yine uğramak istedim.'}`
      : enhanced && request ? QUESTIONS[request] : request==='history' ? 'Hasar geçmişini görebilir miyim?'
      : request==='inspection' ? 'Ekspertiz ve servis bilgilerini paylaşır mısınız?' : buyerSpeech(bike,profile,category,seed) };
}

export function createSeller(bike,day,marketValue) {
  if (isYusufListing(bike)) return yusufMeeting(bike,day);
  const id = 'seller:' + bike.id;
  const profile = bike.characterSeed ? characterFor(`seller-${stableNumber(bike.characterSeed)%1800}`) : profileFor(id);
  const seed = stableNumber(id);
  const speech = profile.id && profile.knowledge>=70
    ? ['Ben de emsallerine baktım. Fiyatı ona göre konuşalım.','Rapor ve piyasa değerini karşılaştırabiliriz.']
    : ['İlandaki fiyatı gördünüz. Siz ne teklif ediyorsunuz?','Motoru görmek isteyenler var, ama teklifinizi dinleyebilirim.','Ciddi bir teklif verirseniz fiyatta biraz esneyebilirim.'];
  const floor = roundPrice(bike.price * (.78 + (seed % 15) / 100));
  const informed = profile.id && profile.knowledge>=65 && Number.isFinite(marketValue)
    ? roundPrice(marketValue*(bike.urgency==='urgent' ? .73 : .85)) : floor;
  return { id, kind:'purchase', profile, day, price:bike.price, anchor:bike.price,
    limit:Math.min(bike.price,Math.max(floor,informed)), round:0, patience:profile.patience,
    ...((bike.urgency || profile.urgency) ? {urgency:bike.urgency ?? profile.urgency} : {}),
    status:'open', speech:speech[seed % speech.length] };
}

export const isActive = meeting => meeting && ['open','agreed'].includes(meeting.status);

export function arrive(bike,day,reputation,value,trade) {
  if (day < bike.nextVisit) return 0;
  const classDemand = (modelOf(bike)?.demand ?? .08) - .07;
  const demand = clamp(.76 + classDemand + (reputation - 50) * .006 + (bike.condition - 85) * .008
    - Math.max(0,bike.ask / value - 1) * .72 - Math.min(.24,bike.km / 250000),.10,1);
  const adjusted = clamp(demand*(bike.marketTerms?.demand ?? 1),.05,1);
  if (bike.marketTerms) bike.nextVisit = day+Math.max(1,Math.round(bike.marketTerms.days/3));
  const visits = (stableNumber(`${bike.id}:${day}:demand`) % 100) / 100 < adjusted ? 1 + Math.floor(reputation / 35) : 0;
  const count = Math.min(visits,5 - bike.meetings.filter(isActive).length);
  for (let i=0;i<count;i+=1) {
    const meeting = createBuyer(bike,day,i,reputation,value,undefined,trade);
    bike.meetings.push(meeting);
    if (meeting.profile.id && trade) {
      const customers = trade.customers ??= {};
      const id = meeting.profile.id;
      const member = customers[id] ??= {id,purchases:0,visits:0};
      member.visits++;
      if (meeting.returning) member.returningVisits = (member.returningVisits ?? 0)+1;
    }
  }
  return count;
}

function reactToEvidence(meeting,detect) {
  const {dialogue,profile} = meeting;
  if (detect) dialogue.discovered = true;
  if (dialogue.suspicion>=85 || (detect && profile.risk<25)) {
    meeting.status = 'left';
    meeting.speech = 'Anlattıklarınızla aracın durumu uyuşmuyor. Görüşmeyi bitiriyorum.';
    return;
  }
  meeting.price = Math.min(meeting.price,roundPrice(meeting.price*.92));
  meeting.limit = Math.min(meeting.limit,roundPrice(meeting.limit*.93));
  meeting.price = Math.min(meeting.price,meeting.limit);
  meeting.speech = detect ? 'Hasarı fark ettim. Bu koşullarda teklifimi düşürüyorum.' : 'Cevaplarınız beni düşündürdü. Teklifimi değiştirdim.';
}

export function observeBuyer(meeting,bike) {
  const {dialogue,profile} = meeting;
  if (meeting.status!=='open' || !dialogue || dialogue.disclosed || dialogue.discovered || !isRisky(bike.tradeStrategy)) return;
  if (!bike.faults.length && !bike.damageHistory?.length) return;
  const perception = (profile.knowledge+profile.mechanical+profile.experience*2)/600;
  const presentation = bike.cosmeticPresentation ? .75 : 1;
  if (chance(meeting.id,`observe:${meeting.round}`)<perception*presentation) reactToEvidence(meeting,true);
}

export function buyerQuestion(meeting) {
  if (!meeting.dialogue || !Object.prototype.hasOwnProperty.call(QUESTIONS,meeting.request) || !isActive(meeting)) return null;
  const topics = Object.keys(QUESTIONS);
  const position = topics.indexOf(meeting.request);
  const answered = new Set(meeting.dialogue.answers.map(answer=>answer.topic));
  return [...topics.slice(position),...topics.slice(0,position)].find(topic=>!answered.has(topic)) ?? null;
}

const reply = {
  history:['Geçmişini açıkça söylemeniz önemli.','Hasar kaydını bu açıklamayla daha iyi değerlendirebilirim.'],
  maintenance:['Yapılan bakımı bilmek işime yaradı.','Parçalarla ilgili söylediklerinizi not ettim.'],
  inspection:['Bu bilgiler ekspertiz riskini azaltıyor.','Servis geçmişi benim için önemliydi.'],
  price:['Fiyatın dayanağını anladım.','Emsallerle karşılaştırırken bunu dikkate alırım.'],
  document:['Belgeler söylediklerinizi destekliyor.','Yazılı kayıtlar daha rahat karar vermemi sağlıyor.'],
  missing:['Belgeyi görmeden bunu doğrulayamam.','Bahsettiğiniz kaydı göremedim.'],
  deny:['Söylediğiniz durumla hasar geçmişi uyuşmuyor.','Bu hasarı yok sayamam.'],
  clean:['Bu alanda belirgin bir sorun görmüyorum.','Bu konuyu ayrıca kontrol edeceğim.'],
  defer:['Bu soru cevapsızken temkinli olacağım.','Karar vermeden önce bu noktayı netleştirmek isterim.'],
  conflict:['Önceki yanıtınızla bu açıklama çelişiyor.','Az önceki açıklamanızı yeniden düşünmem gerekiyor.'],
  detect:['Hasarın izlerini fark ettim.','Araçtaki izler anlatılan tabloya uymuyor.'],
};

export function answerBuyer(meeting,bike,topic,choice) {
  if (topic!==buyerQuestion(meeting) || !topic || !Object.prototype.hasOwnProperty.call(ANSWERS,choice)) {
    throw new Error('Bu soru cevaplandı veya artık açık değil.');
  }
  const {dialogue,profile} = meeting;
  const evidence = Boolean(bike.faults.length || bike.damageHistory?.length || bike.damageRecords?.length);
  const documented = choice==='document' && hasDocuments(bike);
  const open = choice==='disclose' || documented;
  const conflict = evidence && open && dialogue.answers.some(answer=>answer.choice==='deny');
  const negative = conflict || choice==='defer' || (choice==='document' && !documented) || (choice==='deny' && evidence);
  const mechanical = profile.mechanical ?? 50;
  const skeptical = profile.skepticism ?? 50;
  const memory = dialogue.memoryTrust ?? (meeting.returning ? 12 : 0);
  const severity = Math.min(20,(bike.faults.length+(bike.damageHistory?.length ?? 0))*3);
  const reaction = conflict ? 'conflict' : documented ? 'document' : open ? topic
    : choice==='defer' ? 'defer' : choice==='document' ? 'missing' : evidence ? 'deny' : 'clean';

  dialogue.trust ??= clamp((profile.trust ?? 50)+memory,0,100);
  dialogue.patience ??= 70+Math.min(30,(profile.patience ?? 3)*5);
  const trustDelta = documented ? 16 : open ? 11 : 0;
  const penalty = conflict ? 28 : evidence && choice==='deny' ? 12+severity : negative ? 12 : 0;
  dialogue.trust = clamp(dialogue.trust+(negative ? -penalty : trustDelta),0,100);
  dialogue.suspicion = clamp(dialogue.suspicion+(negative ? penalty : open ? -10 : 0),0,100);
  dialogue.patience = clamp(dialogue.patience+(negative ? -penalty : open ? 5 : 0),0,100);
  dialogue.answers.push({topic,choice});
  if (open) dialogue.disclosed = true;

  const detect = !open && !dialogue.discovered && evidence && isRisky(bike.tradeStrategy)
    && chance(meeting.id,`detect:${topic}`) < (mechanical+skeptical+severity)/340;
  if (detect) dialogue.discovered = true;
  const roll = chance(meeting.id,`answer:${topic}:${choice}`);
  const lines = reply[detect ? 'detect' : reaction];
  const selected = Math.floor(roll*lines.length);
  const speech = lines[meeting.speech?.startsWith(lines[selected]) ? (selected+1)%lines.length : selected];
  if ((negative || detect) && (dialogue.patience===0 || dialogue.suspicion>=85 || (detect && profile.risk<25))) {
    meeting.status = 'left';
    meeting.speech = speech+' Bu yüzden görüşmeden çekiliyorum.';
  } else if (detect || (negative && roll<(dialogue.suspicion+skeptical*.35)/125)) {
    const reduction = .025+penalty/850+(detect ? .035 : 0);
    const floor = roundPrice(meeting.price*(1-reduction));
    meeting.price = Math.min(meeting.price,floor);
    meeting.limit = Math.max(meeting.price,Math.min(meeting.limit,roundPrice(meeting.limit*(1-reduction))));
    meeting.speech = speech+' Bu koşullarda teklifimi düşürüyorum.';
  } else if (open && !negative && roll<clamp((dialogue.trust-skeptical*.30+mechanical*.12+memory)/100,.08,.94)) {
    const cap = Math.min(meeting.anchor,meeting.limit,meeting.budgetCap ?? profile.budget ?? Infinity);
    const increased = roundPrice(meeting.price*(1+(documented ? .055 : .035)+mechanical*.00015));
    const price = Math.max(meeting.price,Math.min(cap,increased));
    meeting.speech = speech+(price>meeting.price ? ' Teklifimi artırabilirim.' : '');
    meeting.price = price;
  } else meeting.speech = speech;
  meeting.request = buyerQuestion(meeting);
}

export function negotiate(meeting,offer) {
  if (meeting.status !== 'open' || meeting.round >= MAX_ROUNDS || meeting.patience <= 0) {
    throw new Error('Bu görüşmede pazarlık hakkı kalmadı.');
  }
  if (offer !== undefined) meeting.playerOffer = offer;
  meeting.round += 1;
  meeting.patience -= 1;
  if (meeting.kind==='purchase' && meeting.fixedSeller===YUSUF_ID) {
    meeting.price = YUSUF_PRICE;
    meeting.speech = yusufReply(meeting);
    return;
  }
  const buyer = meeting.kind === 'sale';
  const gap = Math.abs(meeting.limit - meeting.price);
  const roll = stableNumber(`${meeting.id}:${meeting.round}:automatic`) % 100;
  const urgencyResistance = buyer ? 0 : meeting.urgency==='urgent' ? -7 : meeting.urgency==='patient' ? 9 : 0;
  const intelligence = meeting.profile.id ? (meeting.profile.skepticism-meeting.profile.trust)*.12
    +(meeting.dialogue?.suspicion ?? 0)*.3 : 0;
  const resistance = Math.max(0,meeting.profile.skill * 3 + (meeting.round - 1)*8 + urgencyResistance + intelligence);
  if ((roll < resistance && meeting.patience === 0) || (meeting.round > 1 && roll < 5)) {
    meeting.status = 'left';
    meeting.speech = buyer ? 'Bütçeme uygun başka ilanlara bakacağım.' : 'Bu fiyata daha fazla bekleyemem. Görüşmeyi bitirelim.';
    return;
  }
  if (offer===meeting.price && roll>=resistance) {
    meeting.status = 'agreed';
    meeting.speech = 'Teklifinizi kabul ediyorum. Satın alımı onaylayabilirsiniz.';
    return;
  }
  if (!gap || roll < resistance) {
    meeting.speech = buyer ? 'Bu turda teklifimi artıramam. Önceki teklifim geçerli.' : 'Bu turda indirim yapamam. Önceki fiyatım geçerli.';
    return;
  }
  const fraction = .18 + (6 - meeting.profile.skill) * .065 + (roll % 17) / 100 + meeting.round * .035;
  const step = Math.min(gap,roundPrice(gap * fraction));
  if (offer !== undefined && offer>=Math.max(meeting.limit,meeting.price-step)) {
    meeting.price = offer;
    meeting.status = 'agreed';
    meeting.speech = 'Teklifinizi kabul ediyorum. Satın alımı onaylayabilirsiniz.';
    return;
  }
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
  if (sold) setReputation(state,(satisfaction>=80 ? 3 : 1)+(bike.tradeStrategy && !isRisky(bike.tradeStrategy) ? 1 : 0),'Motosiklet satışı');
  if (outcome==='left' && meeting.kind==='sale') setReputation(state,-1,'Müşteri görüşmeden ayrıldı');
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
