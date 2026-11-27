import { conditionBreakdown,roadValue } from './damage.mjs?v=0.16.1';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export const REVIEW_TEMPLATES=Object.freeze({
  clean:[
    'Motosikletin genel temizliği beklentimi karşıladı.','Motorun kondisyonundan memnun kaldım.','İncelediğim örnek kondisyon açısından beni tatmin etti.',
    'Temiz bir motosiklet bulduğum için memnunum.','Motosikletin mevcut durumu içime sindi.','Kondisyon bu alışverişin en iyi tarafıydı.','Alırken aradığım temizlik seviyesini buldum.',
  ],
  value:[
    'Ödediğim tutar bu kondisyon için makuldü.','Piyasa fiyatlarına göre dengeli bir alış oldu.','Bütçem açısından iyi bir seçim yaptım.',
    'Fiyat ve kondisyon dengesi hoşuma gitti.','Bu fiyatı makul buldum.','Benzer motosikletlere göre ödediğim tutar yerindeydi.','Ödediğim paranın karşılığını aldığımı düşünüyorum.',
  ],
  staff:[
    'Satış danışmanının yaklaşımını beğendim.','Danışmanla anlaşmak kolaydı.','Satış personeliyle görüşme rahat geçti.',
    'Danışmanın tavrı bu alışverişi kolaylaştırdı.','Satış danışmanı ilgisiyle iyi bir izlenim bıraktı.','Danışmanın tutumundan memnun kaldım.','Personelle iletişim alışverişin güçlü yanıydı.',
  ],
  proof:[
    'Ekspertiz raporunu görmek kararımı kolaylaştırdı.','Ekspertiz kaydı motosikleti değerlendirmeme yardımcı oldu.','Elimde rapor olması güven verdi.',
    'Belgelenmiş ekspertiz önemli bir artıydı.','Ekspertiz raporu kararımda etkili oldu.','Motosikleti bir raporla değerlendirebildim.','Ekspertizin kayıtlı olması benim için değerliydi.',
  ],
  prompt:[
    'Motosikleti satışın yapıldığı gün teslim aldım.','Satış ve teslim aynı gün tamamlandı.','Motosikleti teslim almak için başka bir gün beklemedim.',
    'Satış tamamlanınca aracı teslim aldım.','Teslim alma işlemini aynı gün yaptım.','İşlemin ardından motosikleti teslim alabildim.','Motosiklet satış günü teslim edildi.',
  ],
  bargaining:[
    'Pazarlık sonunda anlaşabileceğimiz bir fiyat bulduk.','Fiyatı konuşup bir orta yol bulabildik.','Pazarlığın sonucu içime sindi.',
    'Teklifler üzerinde konuştuktan sonra alışverişi tamamladım.','Fiyat görüşmesinde uzlaşabildik.','Pazarlığa açık olmalarını beğendim.','Görüşme sonunda verdiğim karardan memnunum.',
  ],
  costly:[
    'Fiyatı benzer seçeneklere göre yüksek buldum.','Motosikleti aldım ama ödediğim fiyat konusunda tereddütlüyüm.','Daha makul bir fiyat beklerdim.',
    'Ödediğim bedel piyasa değerinin üzerindeydi.','Bu tutara karar vermek kolay olmadı.','Fiyat, deneyimin zayıf tarafıydı.','Benzer kondisyon için daha düşük bir fiyat bekliyordum.',
  ],
  mechanical:[
    'Mekanik kondisyon benim için daha iyi olabilirdi.','Motosikletteki mekanik eksikler alışverişi gölgeledi.','Mekanik durum beklentimin altında kaldı.',
    'Mekanik aksamı daha iyi durumda bekliyordum.','Bu alışta mekanik kondisyon konusunda taviz verdim.','Mekanik açıdan daha temiz bir örnek tercih ederdim.','Aracın mekanik durumu beni tam tatmin etmedi.',
  ],
  hidden:[
    'Satıştan sonra açıklanmayan hasarı fark ettim.','Bu kusuru satın almadan önce bilmek isterdim.','Hasarın daha önce açıklanmamış olması güvenimi azalttı.',
    'Sonradan çıkan hasar alışverişe bakışımı değiştirdi.','Önemli bir kusurun satış öncesi konuşulmasını beklerdim.','Hasar bilgisini sonradan öğrenmek beni rahatsız etti.','Kusur ortaya çıkınca alışverişten memnun kalmadım.',
  ],
  support:[
    'Galerinin ücretsiz onarımı, yaşadığım sorunun çözümüne yardımcı oldu.','Hasar ortaya çıkınca galeri onarımı üstlendi.','Ücretsiz onarım yapılması olumlu bir adımdı.',
    'Galeri hasar için kısmi tazminat ödedi.','Hasar nedeniyle kısmi bir ödeme aldım.','İade işleminin ardından ödediğim bedeli geri aldım.','Motosikleti iade ettim ve ücret geri ödendi.',
  ],
  returning:[
    'Bu galeriden yeniden motosiklet aldım.','Önceki alışverişimden sonra tekrar geldim.','İkinci kez yine bu galeriyi tercih ettim.',
    'Daha önce de buradan almıştım.','Yeni motosiklet için tekrar bu galeriyi seçtim.','Önceki ziyaretimden sonra burada yeniden alışveriş yaptım.','Daha önce alışveriş yaptığım galeriye geri döndüm.',
  ],
  mixed:[
    'Alışveriş tamamlandı, genel deneyim beklentilerimin bir kısmını karşıladı.','Kararımı verdim ama deneyimin iyileştirilebilecek tarafları vardı.','Bazı yönlerinden memnun kaldım.',
    'Alışveriş genel olarak kabul edilebilirdi.','Deneyim benim için ortalamaydı.','Olumlu yanları vardı, aklımda bazı çekinceler kaldı.','Alışverişi tamamladım, genel izlenimim karışık.',
  ],
});
export const starsFor=score=>score>=90?5:score>=75?4:score>=55?3:score>=35?2:1;

export function evaluateSale(bike,meeting,{worker,honest,roll=0}={}) {
  const condition=conditionBreakdown(bike);
  const fair=meeting.price/Math.max(1,roadValue(bike));
  const report=Boolean(bike.garageInspection?.result?.length || bike.inspections?.some(item=>item.result?.length));
  const p=meeting.profile;
  const hidden=!honest && Boolean(bike.faults?.length||bike.damageHistory?.length||bike.damageRecords?.length);
  const clarity=honest?6:hidden?-19:-3;
  const patience=clamp((meeting.patience??2)*1.1-(meeting.round??0)*1.4,-6,3);
  const expectations=clamp(((p.skepticism??50)+(p.knowledge??50)-100)*.055,-5,5);
  const service=worker?clamp(((worker.skill??50)+(worker.quality??50)-100)*.055,-4,6):0;
  return clamp(Math.round(79+(condition.visual-88)*.22+(condition.mechanical-88)*.32
    +(condition.structural-91)*.23+clamp((1-fair)*66,-25,9)+clarity+(report?5:0)+patience+service
    -expectations+(meeting.returning?2:0)+roll),0,100);
}

export function saleReview(bike,meeting,sale,score,worker,seed) {
  const categories=[];
  const condition=conditionBreakdown(bike);
  const fair=sale.price/Math.max(1,roadValue(bike));
  if(fair>1.12)categories.push('costly');
  if(condition.mechanical<77)categories.push('mechanical');
  if(sale.strategy==='documented' && sale.inspections.some(report=>report.result?.length))categories.push('proof');
  if(meeting.returning)categories.push('returning');
  if(worker && score>=75)categories.push('staff');
  if(fair<=1.02 && score>=75)categories.push('value');
  if(condition.visual>=94 && condition.mechanical>=90 && condition.structural>=90 && score>=75)categories.push('clean');
  if(meeting.round && score>=75)categories.push('bargaining');
  if(sale.handedOverDay===sale.day && score>=75)categories.push('prompt');
  if(!categories.length)categories.push('mixed');
  const group=categories[seed%categories.length];
  return REVIEW_TEMPLATES[group][(seed>>>9)%7];
}

export function complaintReview(choice,seed) {
  if(choice==='open')return [2,REVIEW_TEMPLATES.hidden[seed%7]];
  if(choice==='repair')return [4,REVIEW_TEMPLATES.support[seed%3]];
  if(choice==='compensation')return [3,REVIEW_TEMPLATES.support[3+seed%2]];
  if(choice==='refund')return [3,REVIEW_TEMPLATES.support[5+seed%2]];
  return [1,'Bildirdiğim hasar için çözüm sunulmadı.'];
}
