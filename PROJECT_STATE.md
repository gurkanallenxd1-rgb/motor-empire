# MOTOR EMPIRE proje durumu

## Sürüm ve çalışan sistemler

Bu dalın sürümü **v0.16.1**. Temel sürüm v0.16, [PR #31](https://github.com/gurkanallenxd1-rgb/motor-empire/pull/31) ile birleştirildi. v0.16.1, İlanlar üzerinden erişilen Özet, Fırsatlar, Şehirler ve Ekonomi sekmelerini içerir.

| Sistem | Mevcut davranış |
| --- | --- |
| Garaj | 2, 5, 10, 20 ve 40 bölmeli tek izometrik sahne, dokunmatik kamera, şube yükseltmesi ve nakliye rezervasyonu |
| Ticaret | 81 il pazarı, en fazla üç pazarlık turu, ekspertiz, hasar ve tamir, kiralama, sigorta, müşteri itibar ve şikâyetleri |
| İşletme | Ortak kasa, şube bazında gider, personel, görev kuyruğu, eğitim ve transfer |
| Finans ve bildirim | İşlem defteri, satış kâr ve zararı, nakit ve borç, finans grafikleri, filtrelenebilir son 200 bildirim |
| Kayıt | `motor-empire.v9` ve önceki anahtarların taşıma yolları, tarayıcı kökenine özel depolama, eşzamanlı sekme kilidi |

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
- Mevcut doğrulama **122 Node.js + 29 mobil Playwright WebKit = 151 başarılı test**. v0.16'nın 149 testi korunur. 320×568, 390×844 ve 844×390 boyutları kullanıldı. Fiziksel iPhone testi yapılmadı.
- Sıradaki görev **v0.17 yeni grafik altyapısı ve gerçekçi motosikletler**. Önce görsel envanter, üretici referansı, lisans ve mobil render bütçesini doğrula. Sonraki sürümler [ROADMAP.md](ROADMAP.md) dosyasında.
