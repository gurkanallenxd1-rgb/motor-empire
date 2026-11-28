# v0.18.3 rekabet, otomasyon ve kayıt doğrulaması

Temel sürümler v0.18.1 main `0b3fe50` ve v0.18.2 main `287c698`. Kullanıcı v0.18.2’de fiziksel iPhone kontrolü yaptı. Oyuncunun 384. gün kaydı bu çalışma için mevcut değildi. Karşılaştırma aynı başlangıç koşullarıyla kurulan deterministik profilleri kullanır.

## Doğrulanan nedenler

- `rivals.mjs / tradeStock`: v0.18.2 bütün hazır stokları ildeki aynı müşteri havuzuna yükledi. Küçük illerde bu, satın alma için harcanan nakdin daha uzun süre stokta kalmasına yol açtı. Aynı il alımı en az bir gün, ardından ekspertiz ve servis ayrı günler bekliyordu. Satıştaki gecikme personel ve işletme gideri biriktiriyordu. v0.18.3 ulusal erişimi de hesaba katar, küçük havuzları korur ve yerel teslimle temiz stok hazırlığındaki yapay beklemeyi kaldırır. Onarım ve şehirler arası nakliye süre ve ücret gerektirir.
- `rivals.mjs / buy, settle, manage`: v0.18.2 daha dar tedarik marjı, sıraya alınan hazırlıklar ve sabit anapara eşiğini bir araya getirdi. Borçlu fakat çalışabilir işletmeler şube yatırımından bütünüyle dışlanıyordu. Yeni model yönetim kalitesini alış maliyetinde ve likidite rezervini anaparada kullanıyor. Yatırımlar 14 günlük değerlendirmeye ve borç/özsermaye oranına bağlı.
- `rivals.mjs / combineRivals`: 37 günlük teklif penceresi, ilk işlemden önce 90 günlük bekleme ve sonraki işlemlerde 90 günlük bekleme vardı. 12 şube sınırı bazı ekonomik olarak uygun işlemleri engelliyordu. Haftalık değerlendirme ve alıcı başına 30 günlük işlem aralığı uygulanıyor. Bedel, kasa, borç ve birleşik rezerv koşulları sağlanmalı. Haberde taraflar, toplam bedel ve oyun günü görünür. Satın Almalar ekranı rakip devralmalarını filtreler.
- `game.mjs / automate`: v0.18.1 ve v0.18.2 için ilan sıralama, tarama sıklığı, şube başına bütçe, nakit rezervi ve kâr süzgecinde kod farkı bulunmadı. İki sürümde de günlük tarama, otomatik satıştan sonra yapılıyordu. Gün içindeki manuel satış ise taramayı tetiklemiyordu. Şimdi ilgili şube, kalan günlük bütçe ve mevcut kurallarla yeniden tarıyor. Belirli bir günlük adet garanti edilmiyor.
- `app.mjs / renderGarage` ve `art.mjs / update`: park metni 2D çizicinin yan etkisiydi. 3D açıkken çizici çağrılmadığından metin önceki değerde kalabiliyordu. Ortak özet kapasiteyi, fiziksel stoku, nakliyeyi, rezervi, boş yeri ve fiziksel stokun servis/satışa hazır alt kümelerini aynı şube stoğundan okuyor. Motorlar aynı park listesini tüketiyor.

### İncelenen işletme sınırları

| Alan | v0.18.3 davranışı |
| --- | --- |
| Alım ve satış | Şube başına fiziksel kapasite, kadronun hazırlık ve satış iş yükü, gerçek stok ve nakit. Firma değerini sınırlayan yapay tavan yok. |
| Stok devri | Talep, stok yaşı, fiyat ve önceki günün satışa hazır stoku. Küçük illerde ulusal müşteri erişimi dikkate alınır. |
| Tedarik | Stratejiye göre bağımsız rakip havuzu, değerlendirme kalitesi, parça ve nakliye maliyeti. Oyuncu alım ilanları rakiplerce tüketilmez. |
| Hazırlık | Ekspertiz, onarım ve nakliye ayrı kayıtlı maliyetler. Hazırlık kuyruğu şube kadrosuna bağlı. |
| Kadro ve yatırım | İş yüküne göre personel, nakit rezervi ve stok doluluğu. Yükseltme farkı ortak şube fiyat tablosundan gelir. Zarar ve borç stresi kapanmayı tetikleyebilir. |
| Oyuncu müdürü | Mevcut kâr eşiği, azami fiyat, nakit rezervi, açık oyuncu görüşmeleri, nakliye rezervi ve personel kuyruğu korunur. Şubeler aynı kasayı paylaşır, günlük bütçeleri ayrıdır. |

## Kayıt ve geri dönüş

`save-codec.mjs` 1,5 milyon karakter üstünde gzip + Base64 biçimini kullanır. Küçük JSON yazımı kota nedeniyle reddedilirse daha küçük gzip kopyasıyla bir kez yeniden denenir. Sıkıştırma kâr, borç veya satış kaydı üzerinde dönüşüm yapmaz. Gzip’in daha küçük olmadığı durumda JSON yazılır. Eski düz JSON ve önceki sürüm anahtarları okunur. Büyük kayıt aynı anahtara, mevcut sekme kilidi altında tek atomik yazımla kaydedilir. Yazım başarısız olursa sağlam anahtar yerinde kalır. Kesik gzip ya da bozuk JSON, yeni kayıtla üzerine yazılmadan görünür hata üretir. Kayıt hatasında kullanıcı mevcut ham dosyayı indirebilir.

IndexedDB’de ayrı tarihçe ve işlemler depolamak ilave kota ve bağımsız yazma olanağı sağlayabilir. Bu sürüm tek atomik anahtarı ve eski veriye erişimi korumak için mevcut depolamayı sürdürür. İçe aktarma arayüzü ve fiziksel iPhone kota/perf testi açık. Codec, büyük kayıtlarda eski sürümlerin açamayacağı bir zarf yazar. Sürüm düşürmeden önce ham kayıt doğrulaması gerekir.

## Karşılaştırma kapsamı

`tests/competition-v0183.mjs` 7/30/90/365/384/1.000 gün ölçer. 1 ve 193, oyun pazarı ve makro koşulların başlangıç günü üzerinden iki farklı deterministik dizidir. Altı şubeli yüksek sermaye profili İstanbul ve Çanakkale dahil çalışır. Tam raporda oyuncu ve en değerli on rakip için nakit, borç, alım, satış, ciro, kâr ve varlık büyüklüğü; oyuncu için ayrıca aylık nakit akışı, satışta geçen gün ve personel başına satış saklanır. Eski rakip verisinde ölçülmemiş alım adedi boş kalır.

`tests/competition-parity-v0183.mjs` İstanbul’da eşit 1,5 milyon TL, 10 bölme, aynı dört rol ve sıfır başlangıç stoğuyla 30 gün çalıştı. Oyuncu 45 alım ve 35 satış, rakip 37 alım ve 27 satış yaptı. Oyuncunun cirosu 13,64 milyon TL ve kârı 4,98 milyon TL oldu. Rakipte bunlar 3,83 milyon TL ve 186 bin TL. Medyan gibi ek fiyat istatistikleri bu karşılaştırmada üretilmedi. Oyuncu perakende pazarı ile daha pahalı modelleri seçebilir. Karşılaştırılan rakip kiralama ve scooter eğilimliydi. İşlem potansiyeli yaklaştı, ürün karması ve kâr farkı sürüyor.

Çalıştırma örneği

```sh
node tests/competition-v0183.mjs
MOTOR_SIM_ROOT=/yol/v0182 node tests/competition-v0183.mjs
MOTOR_SIM_SEED=193 MOTOR_SIM_PROFILE='384. gün çok şubeli' node tests/competition-v0183.mjs
node tests/competition-parity-v0183.mjs
node tests/rival-simulation.mjs
```

## 384 günlük kontrol noktası

Günlük alım, satış ve ciro son 30 günün ortalamasıdır. Altı şubeli kurgu, 2 milyon TL/gün gözleminin üzerinde işlem yapabilen bir stres senaryosudur. İlk dizide oyun günü 385, ikinci dizide 577’dir.

| Tohum | Sürüm | Oyuncu alım/satış / gün | Oyuncu cirosu / gün | Oyuncu net kârı / 30 gün | Rakip toplam satışı | Devralma / iflas | En değerli rakip |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | v0.18.1 | 17,80 / 17,80 | 4.122.314 TL | 37.406.153 TL | 6.383 | 0 / 2 | 19.097.960 TL |
| 1 | v0.18.2 | 17,83 / 17,83 | 4.097.316 TL | 36.590.330 TL | 5.538 | 0 / 22 | 17.155.340 TL |
| 1 | v0.18.3 | 17,57 / 17,57 | 4.086.721 TL | 36.315.109 TL | 11.913 | 25 / 0 | 50.625.521 TL |
| 193 | v0.18.1 | 18,83 / 18,83 | 4.339.403 TL | 31.216.647 TL | 5.764 | 0 / 3 | 20.861.840 TL |
| 193 | v0.18.2 | 18,83 / 18,83 | 4.367.000 TL | 31.876.813 TL | 4.832 | 0 / 26 | 14.962.936 TL |
| 193 | v0.18.3 | 18,87 / 18,87 | 4.382.811 TL | 31.813.760 TL | 9.627 | 25 / 2 | 36.200.619 TL |

Bu koşullarda v0.18.2’de 6’dan 3’e alım düşüşü yeniden üretilemedi. Yeni sürümde rakiplerin satış adedi iki dizide de yaklaşık iki katına çıktı. Yüksek sermayeyle başlayan oyuncu 384 gün sonunda 477–483 milyon TL net varlığa, en güçlü rakipler 36–51 milyon TL’ye ulaştı. Aradaki fark sürüyor. Bu koşuda rakipler daha küçük işletme sermayesiyle başladı. İlk dizide görülen sıfır iflas ekonomik güvence oluşturmaz. Diğer dizide ve kontrollü borç/tasfiye testinde iflas gerçekleşti.

İlk dizinin v0.18.3 tam JSON’u 16.552.228 bayt, saklanan gzip+Base64 2.836.761 bayt. İkinci dizide 16.570.009 → 2.788.973 bayt. İki örnekte yaklaşık %83 azalma sağlandı. WebKit’te 60.000 Türkçe geçmiş satırı içeren örnek gerçek localStorage’a yazıldı, gün ilerledi ve 8 motosiklet yeniden yüklemeden sonra göründü. Bu ölçüm fiziksel iPhone depolama kotasını temsil etmez.

## 1.000 günlük stres ve kota sınırı

1 ve 193 tohumlu altı şubeli senaryolar aşağıdadır. Üç sürümde de oyuncu ve rakip kasa mutabakat farkı 0 TL oldu. Ortalama süreler iki çekirdekli paylaşımlı ortamda eşzamanlı koşulardan ölçüldü.

| Tohum | Sürüm | Oyuncu alım / gün | Oyuncu cirosu / gün | Oyuncu net varlığı | En güçlü rakip | Rakip satışı | İflas / devralma |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | v0.18.1 | 15,47 | 3.174.109 TL | 1.195.794.276 TL | 33.267.624 TL | 20.986 | 4 / 0 |
| 1 | v0.18.2 | 14,77 | 3.210.298 TL | 1.198.603.352 TL | 60.729.831 TL | 19.728 | 39 / 27 |
| 1 | v0.18.3 | 15,03 | 3.208.591 TL | 1.189.392.508 TL | 318.718.243 TL | 75.369 | 0 / 52 |
| 193 | v0.18.1 | 19,43 | 5.274.889 TL | 1.173.513.412 TL | 31.552.488 TL | 19.390 | 10 / 0 |
| 193 | v0.18.2 | 19,23 | 5.192.778 TL | 1.169.288.969 TL | 40.655.216 TL | 15.251 | 58 / 14 |
| 193 | v0.18.3 | 19,53 | 5.286.519 TL | 1.179.445.299 TL | 246.036.140 TL | 64.794 | 2 / 59 |

v0.18.3 tam JSON’u ilk dizide 41.745.657 → 6.711.177 bayt, ikinci dizide 41.088.646 → 6.549.673 bayt oldu. Bu ileri stres örneği bazı tarayıcı kotalarını hâlâ aşabilir. Bu senaryo bellekte çalıştırıldı, Safari’ye 6,55–6,71 MB yazıldığı doğrulanmadı. Kota aşılırsa son sağlam kayıt korunur ve hata gösterilir. Bu büyüklükte ilerlemeyi sürdürmek için IndexedDB tabanlı dış kayıt katmanı ayrıca değerlendirilmeli.

## Otomatik doğrulama

154 Node.js ve 43 mobil WebKit senaryosu geçti. Chromium’da ilk grafik koşusunda diğer simülasyonlarla birlikte bir dokunma adımı zaman aşımına uğradı. Yalıtılmış tekrar geçti ve yedi grafik senaryosunun tamamı doğrulandı. 98 özgün katalog ve 2D dosyasının SHA-256 denetimi geçti.

WebKit, 60.000 geçmiş satırı içeren örneği 308.241 karakterle kaydetti ve yeniden açtı. Paylaşımlı test ortamında örnek okuma süresi 224 ms. Fiziksel iPhone testi yapılmadı. Gerçek cihazda büyük kayıt yazma gecikmesi, kota sınırı ve 2D/3D park sayacının uzun oyun içi oturumda takibi açık.

[Ölçüm verisi v0.18.1](v0183/v0181.json) · [v0.18.2](v0183/v0182.json) · [v0.18.3](v0183/v0183.json)
