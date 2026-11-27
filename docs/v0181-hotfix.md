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
