# MOTOR EMPIRE proje durumu

## Sürüm ve çalışan sistemler

Bu dalın sürümü **v0.17.0.1 deneysel 3D garaj düzeltmesi**. Temel sürüm [v0.17, PR #33](https://github.com/gurkanallenxd1-rgb/motor-empire/pull/33), main `44e4d16`. Varsayılan 2D korunur. Oyuncu 10 bölmeli şubede WebGL 2 prototipini seçebilir.

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
- Mevcut doğrulama **130 Node.js ve 36 mobil Playwright WebKit testi geçti.** Chromium SwiftShader grafik alt kümesi 7/7. Önceki 127 Node.js, 35 WebKit ve 6 Chromium senaryosu korunur. Düzeltme fiziksel iPhone üzerinde yeniden denenmedi.
- Sıradaki görev üç prototip modelin ticari kullanım, düzenleme ve açık dağıtım izni, gerçek 3D inceleme, garaj varlık ayrıntıları ve fiziksel iPhone performans ölçümü. KTX2, iki tarayıcıda özgün bir test varlığıyla doğrulandı. Daha geniş 3D dönüşüm kullanıcı onayı gerektirir. Sonraki sürümler [ROADMAP.md](ROADMAP.md) dosyasında.

## Son görev ve devam noktası

- **Son görev** v0.17.0.1’de kamera kesiti, yumuşak orbit, zoom sınırları, Safari dokunma yalıtımı, özgün ekipman geometrisi ve PBR profil bilgisi.
- **Kullanıcı bildirimi** fiziksel iPhone’da 3D garaj, kamera ve yakınlaştırma çalıştı. Kamera duvar arkasına geçiyor, duvar veya zemin görüşü kaplıyor ve uzun basmada metin menüsü açılabiliyordu. Ekipmanlar köşeli, aydınlatma/malzemeler ve Ultra yetersiz bulunmuştu. Motosikletler mevcut 2D kartlardı.
- **Uygulanan çözümler** dinamik duvar kesiti ve fiziksel göz/hedef limitleri, sahneye özgü iOS CSS, jest ayrımı, ayrıntılı servis/galeri/masa ve yüzey kanalları, profil özeti. Lisanslı model bulunana kadar özgün 2D stok kullanılır.
- **Açık işler** düzeltmenin fiziksel iPhone tekrarı, pil/ısıl durum ve cihaz FPS’i, lisanslı 3D motosikletler, gerçek 3D inceleme, gerçek optik cam kırılması ve çekilmiş HDRI.
- **Sıradaki görev** 10 bölmeli garajın fiziksel iPhone testi ve üç hedef model için kalite/lisans doğrulaması. Diğer seviyelere ve tüm kataloğa genişleme kullanıcı onayı gerektirir.
- **Değişiklik sınırları** 98 katalog/2D dosyası, 2D varsayılanı, oyun kaydı, ekonomi, finans, personel, otomasyon, ekspertiz, nakliye, tamir, bildirimler ve Yusuf Belge kuralları.
- **Performans** yerel SwiftShader Orta profilde 3D başlangıcı 3,655 → 1,833 sn, normal kare 44 → 72 çizim çağrısı ve aygıt sorgusu medyanı 80,42 → 92,45 ms. Yeni geometri maliyeti fiziksel cihazda ölçülmeli.
- **Kanıtlar** [Karşılaştırma, test ve ölçümler](docs/v01701-comparison.md) · [PR #33 temel denetimi](docs/v017-audit.md)
