# MOTOR EMPIRE proje durumu

## Sürüm ve çalışan sistemler

Bu dalın sürümü **v0.18.4 Eşit Ekonomik Rekabet**. Temel sürüm [v0.18.3, PR #38](https://github.com/gurkanallenxd1-rgb/motor-empire/pull/38), main `2516f94`. Varsayılan 2D korunur. Oyuncu 10 bölmeli şubede WebGL 2 prototipini seçebilir.

| Sistem | Mevcut davranış |
| --- | --- |
| Garaj | 2, 5, 10, 20 ve 40 bölmeli tek izometrik sahne, dokunmatik kamera, şube yükseltmesi ve nakliye rezervasyonu |
| Ticaret | 81 il pazarı, en fazla üç pazarlık turu, ekspertiz, hasar ve tamir, kiralama, sigorta, müşteri itibar ve şikâyetleri |
| İşletme | Ortak kasa, şube bazında gider, personel, görev kuyruğu, eğitim ve transfer |
| Finans ve bildirim | İşlem defteri, satış kâr ve zararı, nakit ve borç, finans grafikleri, filtrelenebilir son 200 bildirim |
| Rekabet | Türkiye’de 50 kurgusal rakip, günlük işlem simülasyonu, müşteri seçimi, bölgesel sıralama, şirket devralma ve tasfiye |
| Kayıt | `motor-empire.v9` ve önceki anahtarların taşıma yolları, tarayıcı kökenine özel depolama, büyük kayıtlarda kayıpsız gzip, eşzamanlı sekme kilidi |

## Ekonomi ve otomasyon

Yeni oyuncu 75.000 TL nakitle başlar. Bir oyun saati 2,5 saniye, bir gün 60 saniyedir. Çevrimdışı ilerleme 60 oyun günüyle sınırlıdır. Oyun saati gün değişimini, satış ve servis kuyruklarını yönlendirir.

Piyasa günlük deterministik yenilenir. Model, yıl, hacim, il, arz, talep, mevsim ve ekonomik dönem tahminleri etkiler. Ortalama ilan noktaları gerçek oyun ilan örnekleridir ve en fazla 90 gün saklanır. Oyuncunun satış süresi kayıtlı satışlar üzerinden hesaplanır. Yeni değerler, ödenmiş maliyetleri ve açık teklif tutarlarını korur.

Otomasyon varsayılan olarak kapalıdır ve şube bazında etkinleştirilir. Gerekli personel, kapasite, günlük alım bütçesi, nakit rezervi ve asgari satış kârı kontrol edilir. Müdür, beklenen satış süresi ve risk dahil mevcut tahminleri kullanır. Otomatik alım isteğe bağlı kredi çekmez ve riskli açıklamasız satış yapmaz.

## Yusuf Belge

Yusuf Belge kurgusal bir satıcıdır. İstanbul'da 120 oyun günlük her blokta bir gün karşımıza çıkar. Açık bir Yusuf ilanı varken ikinci örnek oluşturulmaz. KTM 1390 Super Duke R **2024 modeldir**. Fiyat **1.350.000 TL**. Ekspertiz raporu, manuel teklif ve otomatik pazarlık fiyatı değiştirmez. Müdür otomatik alımda bu ilanı atlar.

## Teknik kararlar, limitler ve sıradaki iş

- Statik, hesapsız kullanım ve GitHub Pages yayını korunur. Kayıtlar tarayıcıya özeldir. Hesaplar ve bulut kayıt v0.20 için planlanıyor.
- Model çizimleri yerel WebP ve boya maskeleri kullanır. Bütün model ve kasa varyantları üretici düzeyinde doğrulanmış değildir. Görsel denetim sayfası temsilî varlıkları işaretler. Fiziksel iPhone kare hızı ölçümü bu sürümde yapılmadı.
- Fiyat grafiği Türkiye genelinde tüm model yıllarını kapsar. Şehir karşılaştırması seçilen yılın temiz motosiklet referansıdır ve işlem garantisi içermez.
- v0.18’in 184 senaryosu korundu. v0.18.1 doğrulaması 143 Node.js, 41 mobil WebKit ve 7 Chromium grafik testi. Sonuçlar [düzeltme raporunda](docs/v0181-hotfix.md). Kullanıcı fiziksel iPhone’da v0.17.0.1 kamera ve iOS metin seçimi düzeltmesini doğruladı. Kullanıcı v0.18’de fiziksel iPhone’da Kıvıltaş Seri Moto devralmasını ve Çanakkale şubesi, stok, çalışan, kasa ve otomatik alım aktarımını doğruladı. Aktif sayaçta görülen belirsizlik v0.18.1’de ayrı toplamlarla giderildi.
- Grafik geliştirmeleri ertelendi. Lisanslı 3D motosikletler, tüm garaj seviyelerinin 3D dönüşümü ve görsel hasar açık.

## Son görev ve devam noktası

- **Son görev** v0.18.4’te ortak ticaret çekirdeği, rakip operasyon özeti ve iki tohumla 1.000 günlük eşit ilan karşılaştırması.
- **Ticaret ve zaman** yeni galeri bir şube ve altıdan az satış kaydı varken müşteri kaybına karşı korunur. Açık pazarlıklar etkilenmez. Rakip çalışması mevcut kayıt kilidini ve 60 günlük çevrimdışı sınırı kullanır.
- **Kayıt ve ekonomi** `motor-empire.v9` anahtarında ek `competition` alanı. Eski kayıt ilk eşitlemede rakipleri oluşturur. İlk oluşum oyuncu kasasını, stoklarını, şubelerini, otomasyon veya borç bilgilerini değiştirmez. Rakip tarihçesi 365 gün, yerel performans 30 gün, şirket başına işlem 12, haber 45 ve arşiv 80 ile sınırlı.
- **Değişiklik sınırları** 98 katalog ve 2D dosyası, garaj motorları, Yusuf'un kuralları ve v0.16 fiyat formülleri.
- **Açık işler ve sıradaki görev** v0.18.4 fiziksel iPhone doğrulaması, uzun kayıt kotası ve rakip kârlılık farkının izlenmesi, ardından personel ve müşteri geliştirmeleri. Rakip emanetleri, şirketler arası satış pazarı ve tasfiye ihaleleri ayrı mekanikler olarak ele alınabilir. Lisanslı 3D motosiklet, bütün 3D garaj seviyeleri ve görsel hasar ertelendi.
- **Kanıtlar** [v0.18.1 testleri ve karşılaştırmaları](docs/v0181-hotfix.md) · [Önceki garaj karşılaştırması](docs/v01701-comparison.md)

- **Teknik not** [Rakip ekonomisi ve kimlik migrasyonu](docs/rival-economy.md) · [v0.18.2 ölçümleri, testler ve açık noktalar](docs/v0182-report.md).

- **v0.18.2 doğrulaması** 148 Node.js, 42 mobil WebKit ve 7 Chromium grafik testi geçti. 30/90/365/1.000 günlük dört profil, v0.18.1 ile birlikte karşılaştırıldı. 1.000 gün dört şube koşusunda tam kayıt 9,69 MB olduğundan fiziksel Safari kayıt kotası ayrıca doğrulanmalı.

- **Fiziksel cihaz bildirimi** Kullanıcı v0.18.2’de şirket kimliğini, grafikleri, İstanbul ve Çanakkale otomasyonunu, kayıt kalıcılığını ve performansı doğruladı. 384. gün civarında rakip büyümesi, otomatik alım sıklığı ve park sayacıyla ilgili sorun bildirdi. v0.18.3 için kayıt ve cihaz ölçümleri [denge raporunda](docs/v0183-report.md).

- **v0.18.3 doğrulaması** 154 Node.js, 43 WebKit ve 7 Chromium grafik senaryosu. Üç sürüm için toplam 90 ölçüm noktasında kasa mutabakatı sağlandı. 384 günlük altı şube kayıtları yaklaşık %83 küçüldü. 1.000 günlük iki uç kayıt sıkıştırılmış halde 6,55–6,71 MB, fiziksel cihaz kotası açık.

- **v0.18.4** Yeni rakip alımları oyuncuyla aynı ilan, değerleme ve sıralamayı; satışlar aynı alıcı, pazarlık ve memnuniyet kurallarını kullanır. Kullanıcı v0.18.3 fiziksel iPhone’da sayaç ve alım düzeltmelerini doğruladı. [Test verileri ve açık farklar](docs/v0184-report.md)
