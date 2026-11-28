# v0.18.4 eşit ekonomik rekabet

Temel sürüm v0.18.3, PR #38, main `2516f94`. Kullanıcı fiziksel iPhone’da v0.18.3 garaj sayacını ve alımı doğruladı. 385. ve 399. gün için kullanıcıdan alınan değerler gerçek oturuma aittir. Test oyunu aynı net varlıklarla kuruldu. Kullanıcının kaydı, stok bileşimi ve kadrosu elde bulunmadığından 14 günlük senaryo yeniden oynatma değildir.

## v0.18.3 kâr farkının ayrıştırılması

| İstanbul, 10 bölme, 30 gün | Oyuncu | Rakip |
| --- | ---: | ---: |
| Alım / satış | 45 / 35 | 37 / 27 |
| Motosiklet satış geliri | 13.640.783 TL | 3.746.391 TL |
| Ortalama satış fiyatı | 389.737 TL | 138.755 TL |
| Satılan motosikletlerin maliyeti | 8.547.688 TL | 3.527.361 TL |
| Satış kârı, işletme giderlerinden önce | 5.093.095 TL | 219.030 TL |
| Satış başına kâr, işletme giderlerinden önce | 145.517 TL | 8.112 TL |
| Kiralama geliri | 0 TL | 80.916 TL |
| Ölçülen işletme gideri | 110.200 TL | 114.000 TL |
| Raporlanan net kâr | 4.982.895 TL | 185.946 TL |

Sekiz ek satış tek başına farkı açıklamıyor. Oyuncu ortalama 2,81 kat daha yüksek satış bedelli motosikletler sattı. Eski karşılaştırmada rakip ağırlıklı olarak scooter ve kiralama stratejisi izliyordu. Büyük kâr farkı ürün karması ve birim satış marjında oluştu. Maaş/gider farkı 3.800 TL ve oyuncu finans penceresinin başlangıç günü dahil etmemesinden geliyor.

- `rivals.mjs / buy` rastgele ağırlıklı segment seçimi, farklı kondisyon dağılımı, ayrı toptan fiyat ve basitleştirilmiş ekspertiz/tamir tarifesi kullanıyordu. `automation.mjs / rankMarket` ise tamamlanmış motosiklet değeri ve satış zamanı üzerinden aktif ilanların beklenen kârını sıralıyordu.
- `rivals.mjs / quoteFor, tradeStock` stok maliyeti hedefi, talep tabanlı satış olasılığı ve ilan fiyatından doğrudan satışla çalışıyordu. Oyuncu, `trade.mjs / arrive, createBuyer, negotiate` üzerinden alıcı bütçesi, itibar ve pazarlığı kullanıyordu. 0.18.3 değişkenlerinden birine aynı katsayıyı vermek bu farkı gidermez.
- `market-generation.mjs` artık iki pazara da aynı model, marka, kasa yılı, hasar, kondisyon ve alış fiyatı üretimini sağlıyor. `commerce.mjs`, `automation.mjs` ve `valuation.mjs` aynı satış beklentisi, ROI, nakliye, alış ve satış kararlarını sağlıyor. Takımlar kendi pazarlarında aynı kurallara tabi. Rakip ilanı kendi pazarında bir kez alınır. Oyuncunun ilanlarına ve Yusuf'a dokunulmaz.
- `rivals.mjs / replenish, tradeStock` kârlı premium ve diğer segmentlere açık. Uzmanlık yalnızca sıralama avantajı. Personel kalitesi `business.mjs / workshopRate` üzerinden ekspertiz ve tamir süresine yansıyor. Alım ve satışta gerçek para ve stok kayıtları değişiyor. `trade.mjs / tradeSaleOutcome` ve `characters.mjs / recordCustomerPurchase` satış memnuniyeti, itibar ve müşteri hafızasının ortak davranışını koruyor.
- `rivals.mjs / manage` yükseltme ve yeni şubeyi gerçek yakın dönem kârı, kapasite ve eldeki nakit üzerinden değerlendiriyor. Yönetim kalitesi ve büyüme iştahı varlığını koruyor. Oyuncunun servetine bağlı sermaye aktarımı yok.
- `competition-view.mjs / showDetail` gerçek kapanışlardan 1/7/30 günlük adetleri, ortalama alış/satış ve gerçekleşen birim kârı gösteriyor. İşlem nedenleri ve son yatırım ayrı. Geçmişte tutulmamış alım değerleri geriye dönük oluşturulmuyor.

## Karşılaştırma yöntemi

`node tests/competition-v0184.mjs` iki deterministik diziye aynı Vespa scooter ilanlarını, 1,5 milyon TL, İstanbul, 10 bölme, dört aynı rol, 70 beceri ve dört deneyim düzeyi, aynı rezerv ve asgari kâr verir. 7, 14, 30, 90, 365 ve 1.000 gün ölçülür. Bu karşılaştırmada rakip yatırımı kapalı, pazar talebi aynı oyuncu örneğinden türetiliyor. Alıcı kimliği, teklife erişim, günlük rakip iş kuyruğu ile saatlik oyuncu kuyruğu ve saklanan müşteri hafızasının kapsamı farklı sonuçlara yol açabiliyor. Kasalar ve rakip net varlığı her rapor noktasında mutabık olmalı.

`MOTOR_MATCH_ONLY_REAL=1 node tests/competition-v0184.mjs` 385. gün değerleriyle açılan üç otomatik şubeli kurguyu ölçer. 14 gün sonunda şu değerler oluştu.

| Şirket | Başlangıç | 399. gün | Artış |
| --- | ---: | ---: | ---: |
| MOTOR EMPIRE | 69.411.569 TL | 74.217.060 TL | 4.805.491 TL |
| Yelpaze Motor Atölyesi | 14.018.374 TL | 14.970.900 TL | 952.526 TL |
| Novarun İki Teker | 12.861.016 TL | 13.027.535 TL | 166.519 TL |
| Asterro Motor Atölyesi | 6.066.105 TL | 6.385.444 TL | 319.339 TL |

Bu kurguda oyuncunun mutlak değer artışı en güçlü rakibin 5,04 katı. Kullanıcının gözlemlediği 14,67 katlık oran farklı bir oturuma ait. Bir oturumun sonucu diğerine doğrudan taşınamaz.

## Koruma ve sınırlar

Oyuncu yönetimindeki marka, fiyat, bütçe, nakit, minimum kâr, kişisel görüşme ve fiziksel garaj kuralları aynı girişlerden çalışır. Var olan rakip stok eski fatura ve fiyat yoluyla kapanır. Yeni rakip alımları ortak çekirdekten geçer. Varlıklar, şirket kimliği, kayıt anahtarı ve gzip sıkıştırma biçimi aynı kalır. Mevcut oyuncu tarafında saatlik işler, rakiplerde günlük kapanışta personel puanına göre toplanır. Rakip geçmişi son teklif ve en çok 32 eski müşteriyle sınırlıdır. Fiziksel iPhone üzerinde v0.18.4 testi yapılmadı.
