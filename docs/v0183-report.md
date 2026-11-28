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

`save-codec.mjs` 1,5 milyon karakter üstünde gzip + Base64 biçimini kullanır. Sıkıştırma kâr, borç veya satış kaydı üzerinde dönüşüm yapmaz. Gzip’in daha küçük olmadığı durumda JSON yazılır. Eski düz JSON ve önceki sürüm anahtarları okunur. Büyük kayıt aynı anahtara, mevcut sekme kilidi altında tek atomik yazımla kaydedilir. Yazım başarısız olursa sağlam anahtar yerinde kalır. Kesik gzip ya da bozuk JSON, yeni kayıtla üzerine yazılmadan görünür hata üretir. Kayıt hatasında kullanıcı mevcut ham dosyayı indirebilir.

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
