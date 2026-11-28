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
| Yelpaze Motor Atölyesi | 14.018.374 TL | 14.968.910 TL | 950.536 TL |
| Novarun İki Teker | 12.861.016 TL | 13.512.737 TL | 651.721 TL |
| Asterro Motor Atölyesi | 6.066.105 TL | 6.356.733 TL | 290.628 TL |

Bu kurguda oyuncunun mutlak değer artışı en güçlü rakibin 5,06 katı. Kullanıcının gözlemlediği 14,67 katlık oran farklı bir oturuma ait. Bir oturumun sonucu diğerine doğrudan taşınamaz.

## Koruma ve sınırlar

Oyuncu yönetimindeki marka, fiyat, bütçe, nakit, minimum kâr, kişisel görüşme ve fiziksel garaj kuralları aynı girişlerden çalışır. Var olan rakip stok eski fatura ve fiyat yoluyla kapanır. Yeni rakip alımları ortak çekirdekten geçer. Varlıklar, şirket kimliği, kayıt anahtarı ve gzip sıkıştırma biçimi aynı kalır. Mevcut oyuncu tarafında saatlik işler, rakiplerde günlük kapanışta personel puanına göre toplanır. Rakip geçmişi son teklif ve en çok 32 eski müşteriyle sınırlıdır. Fiziksel iPhone üzerinde v0.18.4 testi yapılmadı.


## Eşit ilanda sonuçlar

| Tohum | Gün | Oyuncu / rakip satış | Oyuncu / rakip net kâr |
| ---: | ---: | ---: | ---: |
| 1 | 7 | 0 / 0 | -26.600 / -26.600 TL |
| 1 | 14 | 12 / 11 | 237.351 / 203.561 TL |
| 1 | 30 | 30 / 27 | 718.197 / 567.461 TL |
| 1 | 90 | 110 / 105 | 2.679.597 / 2.313.354 TL |
| 1 | 365 | 370 / 363 | 8.318.972 / 7.214.734 TL |
| 1 | 1000 | 1071 / 1054 | 23.922.573 / 20.659.536 TL |
| 193 | 7 | 0 / 0 | -26.600 / -26.600 TL |
| 193 | 14 | 9 / 8 | 79.080 / 103.895 TL |
| 193 | 30 | 18 / 18 | 201.750 / 266.885 TL |
| 193 | 90 | 60 / 59 | 1.158.144 / 1.096.598 TL |
| 193 | 365 | 358 / 352 | 8.017.036 / 7.134.693 TL |
| 193 | 1000 | 1029 / 1017 | 23.187.614 / 20.170.326 TL |


1.000 günde rakipler oyuncunun satış adedinin %98,4–98,8’ine, net kârının %86,4–87,0’ına ulaştı. Kalan net kâr farkı 3,02–3,26 milyon TL. Satış farkı 12–17 adet. Ortalama satış bedeli her iki dizide de rakipte daha düşük. Aynı aday havuzu ve asgari kâr eşiği kullanıldı. Farklı motosiklet ve alıcı kimlikleri, günlük rakip iş kuyruğu ve saatlik oyuncu iş kuyruğu, sınırlı rakip teklif geçmişi ve teklif anındaki itibar farklı satış zamanları ve fiyatları üretebilir. Deney bunların ayrı ayrı nedensel payını ölçmüyor. [Ham ölçümler](v0184-data.json)

## Tam pazar ve regresyon

İlk uzun koşuda son 30 günlük lider payı %25,0–25,3 ile mevcut %20 test eşiğini aştı. Günlük ilan taramasına önce hangi şirketin eriştiği artık dönüşümlü. Devralma değerlendirmesi tarafların ölçülen birleşik payı %15'e ulaştığında yeni işlemi eliyor. Eşik günlük alım veya organik satış hacmini sınırlamıyor.

İflas stresli 1.000 günlük tam pazar tekrarında lider payı %9,78, ortanca pay %0,12. 63 aktif şirket, 146.504 satış, 11 rakip devralması ve 2 iflas ölçüldü. Kasa, bilanço, fiyat, stok kimlikleri, kapasite ve sıkıştırılmış kayıt boyutu kontrolleri geçti. Ham rekabet kaydı yaklaşık 3,81 MB. Node.js simülasyonu oyun günü başına ortalama 95,78 ms sürdü. Bu ölçüm fiziksel Safari performansını temsil etmez.

156 Node.js testi geçti. Önceki oturumun 43 WebKit ve 7 Chromium grafik testi ile 390 piksel operasyon özeti kontrolü de geçti. Görsel varlıklara dokunulmadı. [PR #39](https://github.com/gurkanallenxd1-rgb/motor-empire/pull/39)
