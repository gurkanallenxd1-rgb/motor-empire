# v0.18.1 rekabet, itibar ve mobil arayüz

Temel sürüm v0.18, main `db8bce8` ve PR #35. Oyun kaydı `motor-empire.v9` ile devam eder. Garaj motorları, katalog ve 10 motosikletlik 3D uyarısı yerinde kalır.

## Değişiklikler ve hata nedenleri

- Eski yıldız formülü 90 puanla başlıyor, her pazarlıkta dört puan düşüyor ve piyasa değeri yerine pazarlık başlangıç fiyatına bakıyordu. Kondisyon, belge ve personel puana girmiyordu. Yıldız yuvarlamasında 90 altındaki iyi deneyimlerin çoğu 4 oluyordu. Yeni eşikler 35/55/75/90. Değerlendirme görsel, mekanik ve yapısal kondisyonu, güncel piyasa değerini, dürüstlüğü, gerçek raporu, personeli, müşteri beklentisini ve pazarlığı kullanır. Şikâyet ve çözüm sonrası puan olaya göre güncellenir. Yeni puan eski yorumları toplu olarak değiştirmez.
- 12 bağlamda 84 yorum. Sistem yalnızca gerçekleşen aşamaları seçer. Aynı gün teslim ifadesi oyundaki doğrudan teslimi anlatır. Harici nakliye hizmeti vaadi içermez. Yorumlar yıldız, dönem ve şubeye göre süzülür. Eski yorumlarda şube bilgisi satış kaydından bulunabiliyorsa kullanılır.
- Canlı satış tepsisi modele, yıla, şubeye, fiyata ve net kâra yer verir. Alttaki menünün üzerinde kalır. Küçük ekranda ekran yüksekliğine göre daralır, fazlası kaydırılır. Kartlar kronolojik dizilir. Tümünü kapatma geçmişi temizlemez. Satış raporu bildirim merkezinden ve canlı karttan açılır. Tepside aynı anda en fazla 25 canlı kart tutulur. Kayıtlı bildirim merkezinin mevcut 200 kayıt sınırı sürer.
- Rakip ekranında v0.18 filtreden geçen kartları sayıyordu ve bu sayı pazarın tarihsel toplamından ayrılmıyordu. Kullanıcının kaydına erişilmediği için gözlenen 52’nin kesin nedeni doğrulanamadı. Yeni sayaç aktifleri, kurulmuş toplamı ve devralınanları ayrı gösterir. Kayıtlı devralma rakibi aktif listeden çıkarır. Aynı gün yeni rakip girişi, aktif sayıyı yeniden değiştirebilir.
- Yeni devralma başlangıç değerini, kabul edilen bedeli, masrafı, ödeme ve aktarılan kalemleri kaydeder. Önceki v0.18 devralmalarının saklanan özet ve defter hareketleri korunur. Daha önce silinmiş ayrıntılı rakip zaman serisi geriye dönük üretilemez. Şirket yatırımı kendi finans kategorisindedir ve işletme gideri toplamına eklenmez.

## Mobil önce / sonra

Aynı başlangıç kaydı ve Playwright WebKit emülasyonu kullanıldı. Satış görüntüsünde aynı günde dokuz farklı şubeden gerçekleşen işlemler var. Diğer görüntüler aynı yorumları ve rakibi açıyor.

- [Kompakt satış tepsisi, 320 × 568](v0181/sales.webp)
- [Galeri özeti ve İtibar Merkezi, 390 × 844](v0181/gallery.webp)
- [Rakip şirket ayrıntısı, 390 × 844](v0181/rival.webp)

## Tekrar çalıştırma

```sh
node --test --test-isolation=none
node tests/competition-profiles.mjs
node tests/rival-simulation.mjs
PLAYWRIGHT_MODULE=/yol/playwright node --test tests/live-prices.browser.mjs
```

Tarayıcı suite'i 320 × 568, 390 × 844 ve 844 × 390 emülasyonlarını içerir. Devralınan şube testinde aynı şube gerçek günlük pazardan otomatik alım yaptı. Yerel hasarlı ikinci motosiklet otomatik ekspertiz, tamir, ilan, pazarlık ve satıştan geçti. Yeniden yüklemeden sonra tek tamir tahsilatı yazıldı. Bu testte tüm aşamalar aynı motosiklette birleşmedi.

## Fiziksel iPhone doğrulaması

1. Bir günde birkaç şubeden satış oluştur. Canlı kartları kaydır, bir raporu aç, diğerlerini kapat ve bildirim geçmişinden geri aç.
2. Ana sayfadan İtibar Merkezi’ne geç. Eski yorumların ve yeni satışın yıldız, tarih, şube filtrelerini kontrol et. Aynı gün teslim edilen temiz ve belgeli bir motosiklet ile pahalı veya kusurlu bir satışı karşılaştır.
3. Rakip profili ve açık bir devralma teklifini dar ekranda kaydır. Kapatma düğmesini ve arka planın sabit kaldığını doğrula.
4. Devralmadan önce ve sonra aktif, kurulmuş ve devralınmış sayılarını, Finans'taki şirket yatırımı ve kasa hareketlerini karşılaştır. Yeniden yükle.
5. Devralınan şubede tam yetkili kadroyla otomatik döngüyü dene. Ardından eski 2D ve 10 bölmeli 3D garajı aç.

Bu sürüm fiziksel iPhone’da denenmedi. Çevrim içi rekabet ve yeni 3D geliştirme bu sürümün kapsamına alınmadı.

## Sonuçlar ve ekonomi

143 Node.js, 41 mobil Playwright WebKit ve 7 Chromium grafik testi geçti. v0.18’den 184 senaryo korunuyor. Aynı satış puanlama işlevi manuel satış ve satış danışmanında çalışır. 150 müşteri profili örneğinde temiz/belgeli grubun en az üçte ikisi 5 yıldız aldı. Sıradan grubun 5 yıldız oranı daha düşüktü ve gizli ciddi hasar grubunda 5 yıldız görülmedi. Dokuz bildirim testi, kronolojik dizilimi, alt menüyle çakışmamasını, kaydırmayı ve kapatmanın geçmişi koruduğunu doğruladı.

`tests/competition-profiles.mjs` deterministik oyun zamanını ve gerçek defteri kullanır. Başlangıç oyuncusu 75.000 TL ile üç günde bir işlem dener ve temiz, aynı ildeki motosikletleri seçer. Orta işletme 1 milyon TL ve bir şube, gelişmiş işletme 6,5 milyon TL ve dört şubeyle otomasyon işletir. Pazar payı son 30 günlük teslim edilen satış adedidir.

| Profil / gün | Net değer | Başlangıca göre | Kasa | Oyuncu satışı | Oyuncu payı | Rakip satışı | Ortalama rakip değeri |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Başlangıç / 30 | 74.700 TL | −%0,40 | 74.700 TL | 1 | %0,29 | 338 | 2.040.327 TL |
| Başlangıç / 90 | 73.509 TL | −%1,99 | 73.509 TL | 2 | %0,22 | 1.244 | 2.304.142 TL |
| Başlangıç / 365 | 26.595 TL | −%64,54 | 26.595 TL | 5 | %0 | 5.943 | 3.538.808 TL |
| Orta / 30 | 1.268.095 TL | +%26,81 | 1.175.877 TL | 9 | %2,59 | 338 | 2.040.548 TL |
| Orta / 90 | 2.310.607 TL | +%131,06 | 2.015.805 TL | 30 | %2,36 | 1.242 | 2.309.689 TL |
| Orta / 365 | 5.867.669 TL | +%486,77 | 5.550.673 TL | 124 | %1,65 | 5.959 | 3.547.716 TL |
| Gelişmiş / 30 | 8.817.246 TL | +%35,65 | 4.845.776 TL | 74 | %17,87 | 340 | 2.041.521 TL |
| Gelişmiş / 90 | 15.714.337 TL | +%141,76 | 11.214.867 TL | 262 | %17,83 | 1.248 | 2.321.096 TL |
| Gelişmiş / 365 | 37.640.399 TL | +%479,08 | 33.740.317 TL | 1.051 | %12,18 | 5.972 | 3.584.284 TL |

Üç profilde 30/90/365 gün sonunda sırasıyla 51/52/55 aktif şirket, 1/2/7 yeni şirket ve 0/0/2 iflas oluştu. Dokuz kontrol noktasında oyuncu borcu ve defter farkı 0 TL. Her rakibin kasası açılış + tahsilat − gider ile; net varlık hesabı nakit + stok + şubeler − borç ile eşleşti. Rakiplerin yeni firma sayısı ve finansmanı oyuncu gelişimine göre eşitlenmiyor. Başlangıç koruması müşteri kaybını önledi. Seyrek ticaret eden test oyuncusu mevcut giderler nedeniyle küçüldü.

Ayrı 1.000 günlük rakip testi 63 aktif şirket, 19 yeni giriş, 6 iflas ve 20.348 satış üretti. Son 30 günde en yüksek pay %2,99. Ortalama rakip değeri 9.763.891 TL. Rekabet bölümü 800.714 bayt. Gelişmiş profilde 365. gün tam kayıt v0.18’de 4.211.434, bu sürümde 4.219.217 bayt oldu. Aynı senaryoda Node günlük ortalama ilerletme 23,57 → 19,93 ms. Bunlar tek masaüstü koşusu ve farklı satış/yorum gerçekleşmeleridir. Fiziksel telefon belleği, kota ve kare hızı ölçülmedi.
