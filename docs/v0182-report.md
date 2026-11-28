# v0.18.2 rekabet ve şirket kimliği doğrulaması

Karşılaştırma tabanı v0.18.1 main `0b3fe50`. Her iki sürümde aynı başlangıç sermayesi, oynama sıklığı, şube açılışı ve otomasyon ayarları kullanıldı. Pasif ve manuel oyun 75.000 TL ile başladı. Tek şubeli otomasyon 1 milyon TL ile başladı. Çok şubeli senaryo 6,5 milyon TL ile İstanbul, Çanakkale, Ankara ve İzmir’de çalıştı. Alt sermayeli ve ulusal rakipler, her senaryoda aynı dünyada yer aldı. Makroekonomi büyüme, denge, durgunluk, kriz ve toparlanma dönemlerini kapsadı.

## Ayrı rakip motoru

| Gün | Aktif | Yeni | İflas | Rakipler arası devralma | Ortalama şirket değeri | Ortalama birikimli net kâr | Satış | En büyük pay |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 30 | 51 | 1 | 0 | 0 | 2.041.099 TL | 11.295 TL | 359 | %5,85 |
| 90 | 52 | 2 | 0 | 0 | 2.054.581 TL | 51.724 TL | 1.430 | %9,62 |
| 365 | 42 | 15 | 22 | 1 | 2.526.857 TL | 8.304 TL | 5.071 | %8,36 |
| 1.000 | 47 | 60 | 42 | 21 | 7.013.148 TL | 3.520.709 TL | 18.104 | %13,03 |

Önceki motor 1.000 günde 63 aktif şirket, 19 yeni şirket, 6 iflas ve 20.348 satış üretti. Ortalama şirket değeri 9,76 milyon TL ve en büyük son 30 günlük satış payı %2,99’du. Yeni motorda ortanca pay %1,10. Fiyat / güncel değer aralığı 0,740–1,082. Toplam satış ve kiralama cirosu 3,69 milyar TL. Oyuncusuz koşuda rekabet kaydı 1.120.780 UTF-8 bayt, masaüstü Node.js motor çalışması ortalama 1,34 ms ve p95 1,81 ms. Süre tüm oyun ve arayüz döngüsünü kapsamaz.

Her gün kasa hareketleri ve bilanço eşleşti. İşlenen satış ID’leri tekrarlanmadı. Stok ve rezervasyonlar şube kapasitesini aşmadı. Satış fiyatında il talebi, o ildeki hazır stok, satın alma gücü ve ürün fiyatı kullanılır. Ayar öncesi prototipte en büyük rakip 1.000 günde 424 milyon TL’ye çıktı. Yerel müşteri havuzu eklendikten sonra pasif koşuda 45,77 milyon TL oldu. Test edilen koşu tekel göstermedi. Pazar payı yoğunlaşması ve iflas sıklığı fiziksel oyuncu verileriyle izlenmeli.

## Oyuncu profillerinde 1.000. gün

Tutarlar TL. Her hücre v0.18.1 → v0.18.2 sırasındadır. Pazar payı son 30 günlük satış adedi üzerinden hesaplandı.

| Profil | Oyuncu net varlığı | Oyuncu satışı | Oyuncu payı | En güçlü rakibin net varlığı | Rakip satışı |
| --- | ---: | ---: | ---: | ---: | ---: |
| Pasif | −175.000 → −175.000 | 0 → 0 | %0 → %0 | 32.395.255 → 45.770.306 | 20.348 → 18.104 |
| Manuel | −132.155 → −132.155 | 5 → 5 | %0 → %0 | 32.385.896 → 56.146.139 | 20.343 → 18.088 |
| Tek şube otomasyon | 15.058.802 → 14.884.560 | 345 → 343 | %1,02 → %1,18 | 32.410.378 → 52.702.838 | 20.384 → 18.096 |
| Dört şube otomasyon | 85.792.328 → 84.004.923 | 2.729 → 2.722 | %7,37 → %8,63 | 32.408.021 → 41.926.169 | 20.619 → 17.947 |

30, 90, 365 ve 1.000 günün tamamında oyuncu nakit farkı 0 TL. Aktif rakiplerde de kasa ve varlık farkı 0 TL. Devralan rakibin ödediği toplam bedel, devraldığı kasa ve borç ayrı kaydedildi. Yeni oyuncu korumasının kapsamı değişmedi. Pasif ve seyrek manuel oyun her iki sürümde giderler ve sınırlı alım fırsatları nedeniyle aynı net serveti verir. Otomasyonun seçici alımlardan kaynaklanan yüksek birikimli getirisi bu kapsamda yeniden fiyatlandırılmadı.

Her kontrol noktasının oyuncu ve en değerli on rakibi, alım/satım, kasa, borç, ciro, net kâr, kâr marjı, şube ve personel sayısı, pay ve işlem süreleri ham raporlarda yer alır. v0.18.1 rakiplerin toplam alımını saklamadığından eski sütun `null` içerir. [v0.18.1 veri seti](v0182/v0181-profiles.json) · [v0.18.2 veri seti](v0182/v0182-profiles.json)

## Otomatik testler

148 Node.js, 42 Playwright WebKit ve 7 Chromium grafik senaryosu geçti. 98 katalog ve 2D dosyası bütünlük denetiminde korundu. WebKit boyutları 320×568, 390×844 ve 844×390. Mobil testler şirket logosu, yeniden yüklemede migrasyon, eski haber etiketi, 365 günlük grafik kontrolü ve oyuncu devralma onayını kapsadı.

## Sınırlar

- Rakipler v0.16 fiyat referansını ve ortak gider tarifelerini kullanıyor. Ayrı tedarik havuzu, günlük iş planı ve borç koşulları oyuncunun saatlik kuyruğu, perakende ilanları ve kredi seçeneklerinden farklı. Rakip firmaların personeli rol bazında takip ediliyor.
- 1.000 günlük dört şubeli stres koşusunda tam oyun JSON’u v0.18.1’de 9.449.804, v0.18.2’de 9.692.140 UTF-8 bayta ulaştı. Bu koşu bellekte işletildi. Fiziksel Safari localStorage kotası ve bu boyutta kaydetme doğrulanmadı. Uzun dönem oyuncu finans arşivinin depolamaya etkisi açık.
- Oyun içi şirket adlarının üretimi normalize edilmiş benzerlik testinden geçiyor. Marka sicili veya yasal ticari isim uygunluğu araştırılmadı.
- Fiziksel iPhone testi yok. WebKit cihaz boyutu, emüle dokunma ve yatay taşma değerlendirildi.

## Görüntüler ve yeniden üretim

v0.18.1 [önceki mobil profil](v0181/rival.webp). v0.18.2 [Özet](v0182/summary.webp) · [Rakipler](v0182/rivals.webp) · [Profil ve karşılaştırma](v0182/profile.webp) · [Sıralama](v0182/ranks.webp) · [320 piksel devralma](v0182/acquisition.webp).

```sh
node --test --test-isolation=none
node tests/rival-simulation.mjs
node tests/competition-v0182.mjs
MOTOR_SIM_ROOT=/yol/v0181 node tests/competition-v0182.mjs
PLAYWRIGHT_MODULE=/yol/playwright node --test tests/live-prices.browser.mjs
```
