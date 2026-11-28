# MOTOR EMPIRE sürüm geçmişi

## v0.18.2

- Rakiplerde günlük çoklu alım ve satış, kadro ve nakit temelli iş planı, şube yatırımı, stok transferi ve rakipler arası devralma.
- Kalıcı şirket kimliği, tek seferlik aktif şirket adı migrasyonu, CSS logoları ve dört dönemli, yedi göstergeli performans karşılaştırması.
- [Ekonomi sonuçları ve mobil ekran görüntüleri](docs/v0182-report.md)

## v0.18.1

- Kronolojik, kaydırılabilir kompakt satış tepsisi. Tümünü kapatma, mevcut bildirim geçmişini korur.
- Gerçek kondisyon, fiyat, ekspertiz, açıklama, personel, pazarlık ve müşteri profiliyle yeni satış puanı. 84 kanıta bağlı yorum ve satış sonrası güncellemeler.
- İtibar Merkezi, yıldız ve şube filtreleri. Rakip özet paneli, aktif/toplam ayrımı, kalıcı devralma kaydı ve ayrı şirket yatırımı kategorisi.
- [Önce/sonra görüntüleri, denge ve doğrulama](docs/v0181-hotfix.md)

## v0.18

- Türkiye genelinde 50 kurgusal şirket, 10 strateji, bölgesel sıralamalar, işlem tabanlı finans ve sürdürülemeyen borçta tasfiye.
- İşletmeler üzerinden Rekabet Merkezi, üç dönemli şirket değer grafiği, rekabet haberleri ve kullanıcı onaylı atomik şirket devralma.
- Eski kayıtların ilk eşitlemede korunması, yeni galeri müşteri koruması, kayıt boyutu sınırları ve değişmeyen 2D/3D varlıkları. [Test, ölçüm ve ekran görüntüleri](docs/v018-competition.md)

## v0.17.0.1

- 3D garajda göz yüksekliği ve yakınlaştırma sınırları, fiziksel hedef alanı ve görüşe göre duvar kesiti. Sürükleme, çoklu dokunma ve uzun basma seçimden ayrıldı.
- Cam/metal cephe, yuvarlatılmış servis ekipmanı, hidrolik kollar, kompresör hattı, ofis ve showroom ayrıntıları. Yüksek ve Ultra’da normal/pürüzlülük/metal dokuları. Etkin profil ayarları panelde gösteriliyor.
- **130 Node.js, 36 mobil Playwright WebKit ve 7 Chromium grafik testi geçti.** Kullanıcı fiziksel iPhone’da kamera ve metin seçimi düzeltmesini daha sonra doğruladı.
- Yumuşak temas gölgesi ve ölçek ayarı mevcut 2D motosikletleri kullanır. Ekonomi ve kayıt şeması korunur. [Görsel karşılaştırma ve ölçümler](docs/v01701-comparison.md)

## v0.17 · Deneysel

- Varsayılan 2D garaja ek olarak 10 bölmeli, isteğe bağlı Three.js garajı, kamera ve grafik ayarları eklendi. Grafik seçimi ayrı kaydedilir.
- GLB yükleyici sergileme platformuyla çalışır. Grafik altyapısında PBR, yerel ortam yansımaları, KTX2 desteği ve WebGL hatasında 2D geri dönüşü bulunur.
- Üç hedef motosiklet için uygun yeniden dağıtım hakkı ile görsel doğruluk birlikte doğrulanamadı. Stok ve ayrıntılar özgün 2D varlıkları kullanır. [Varlık araştırması](ASSET_LICENSES.md)

- PR #33 devamında KTX2 UASTC GLB iki tarayıcıda render edildi. Referans sayımı, GPU kaynak bırakımı ve bekleyen yük iptali test edildi. Dört profil, iki parmakla yakınlaştırma ve 2D geri dönüşü kontrol edildi.
- Platform ve cephe dikmeleri görsel geometri korunarak instancing ile gruplandı. Yazılımsal WebGL ölçümü ve lisans adayları belgelendi.
- **127 Node.js ve 35 mobil Playwright WebKit testi geçti.** Önceki 160 test dahil. Altı grafik senaryosu SwiftShader Chromium’da da geçti. Fiziksel iPhone ölçümü yapılmadı. [Gereksinim denetimi](docs/v017-audit.md)

## v0.16.1 · [PR #32](https://github.com/gurkanallenxd1-rgb/motor-empire/pull/32)

- Piyasa Analizi, dört sekmeli tam sayfa Piyasa Merkezi oldu. Özet güncel ilan ortalamasını son kayıtlı model gözleminden ayırıyor. Grafik oyun günü ve TL eksenlerine sahip.
- Fırsatlar maliyetleri, tahmini kapanış fiyatını, net kârı ve yatırım getirisini gösteriyor. Şehirler seçili yılın referans fiyatını ve nakliyeli tahmini karşılaştırıyor. Ekonomi, mevcut göstergeleri ve bildirim geçmişini okuyor.
- Kayıt şeması, ekonomi, otomasyon, garaj, personel ve bildirim üretimi korunuyor. Proje hafızası ve [dört mobil görünümün bağlantıları](README.md#yayınlama-ve-proje-hafızası) depoya eklendi.
- **122 Node.js ve 29 mobil Playwright WebKit testi geçti.** Fiziksel iPhone testi yapılmadı. Güncel görsel ve performans sınırları [PROJECT_STATE.md](PROJECT_STATE.md) dosyasında.

## Birleştirilmiş sürümler

Sayılar kaynak Pull Request'lerin kaydettiği doğrulamalardır. Sayı belirtilmeyen satırlarda kaynak PR'da test sayısı bulunmuyor. Teknik ayrıntıların eski anlatımı [v0.16 README arşivinde](https://github.com/gurkanallenxd1-rgb/motor-empire/blob/8438554212bc50eb487f3ce12f3cb23761c00135/README.md) ve ilgili commit'lerde duruyor.

| Sürüm | Özellik ve düzeltmeler | Kaydedilen doğrulama | Kaynak |
| --- | --- | --- | --- |
| v0.16 | Mevsim, makroekonomi, deterministik piyasa, fiyat geçmişi ve ekonomi haberleri | 122 Node, 27 WebKit, 30/90/365 günlük ekonomi simülasyonu | [#31](https://github.com/gurkanallenxd1-rgb/motor-empire/pull/31) |
| v0.15.4 | Gerçekçi garaj mimarisi, yeni lift ve ekipman katmanları | 116 Node, 25 WebKit, %100–500 görsel inceleme | [#30](https://github.com/gurkanallenxd1-rgb/motor-empire/pull/30) |
| v0.15.3 | Bölmeli sayfalama yerine tek sahne, kamera ve yükseltme önizlemesi | 115 Node, 25 WebKit | [#29](https://github.com/gurkanallenxd1-rgb/motor-empire/pull/29) |
| v0.15.2 | Kalıcı bildirim merkezi, satış kartları ve çevrimdışı geçmiş | 111 Node, 18 WebKit | [#28](https://github.com/gurkanallenxd1-rgb/motor-empire/pull/28) |
| v0.15.1 | Atlas kayması, kasa çizimleri ve personel destekli işlem aşamaları | 105 Node, 14 WebKit | [#27](https://github.com/gurkanallenxd1-rgb/motor-empire/pull/27) |
| v0.15 | 81 ilde şube, personel, eğitim, transfer, müdür otomasyonu ve Yusuf'un model yılı düzeltmesi | 98 Node, 12 WebKit | [#26](https://github.com/gurkanallenxd1-rgb/motor-empire/pull/26) |
| v0.14 | Kurgusal Yusuf Belge, nadir ilan ve 1.350.000 TL sabit fiyat | 92 Node | [#25](https://github.com/gurkanallenxd1-rgb/motor-empire/pull/25) |
| v0.13.1 | Kayda alınan müşteri cevapları ve canlı teklifler | 90 Node, 11 WebKit | [#24](https://github.com/gurkanallenxd1-rgb/motor-empire/pull/24) |
| v0.13 | Kalıcı karakterler, riskli açıklamalar, müşteri yorumları, şikâyet ve itibar | 86 Node, 10 WebKit | [#23](https://github.com/gurkanallenxd1-rgb/motor-empire/pull/23) |
| v0.12.7 | Tek tuşla otomatik alış pazarlığı | 77 Node, 8 WebKit | [#22](https://github.com/gurkanallenxd1-rgb/motor-empire/pull/22) |
| v0.12.6 | Teklif kontrolleri isteğe bağlı açılıyor | 77 Node, 6 WebKit | [#21](https://github.com/gurkanallenxd1-rgb/motor-empire/pull/21) |
| v0.12.5 | Senkron teklif kontrolleri, son fiyat önizlemesi ve portre eşleşmesi | 77 Node, 6 WebKit | [#20](https://github.com/gurkanallenxd1-rgb/motor-empire/pull/20) |
| v0.12.4 | Mobil görüşme özeti ve indirim kısayolları | 77 Node, 5 WebKit | [#19](https://github.com/gurkanallenxd1-rgb/motor-empire/pull/19) |
| v0.12.3 | Canlı teklif önizlemesi, ayrı indirimler ve kalıcı başlangıç tutarı | 77 otomatik, 3 WebKit DOM | [#18](https://github.com/gurkanallenxd1-rgb/motor-empire/pull/18) |
| v0.12.2 | Ekspertiz değer kaybı ve toplam alış teklifi analizi | 74 otomatik, WebKit mobil doğrulaması | [#17](https://github.com/gurkanallenxd1-rgb/motor-empire/pull/17) |
| v0.12.1 | Arşivden görüşme, kalıcı şikâyet ve gece yarısı rapor düzeltmesi | 68 otomatik, WebKit mobil doğrulaması | [#16](https://github.com/gurkanallenxd1-rgb/motor-empire/pull/16) |
| v0.12 | Saatli ön ekspertiz, sigorta ve hasar geçmişi | 63 otomatik, WebKit mobil doğrulaması | [#15](https://github.com/gurkanallenxd1-rgb/motor-empire/pull/15) |
| v0.11 | Oyun saati, kalıcı otomatik ilerleme ve çevrimdışı sınır | 53 otomatik | [#14](https://github.com/gurkanallenxd1-rgb/motor-empire/pull/14) |
| v0.10 | Finans merkezi, günlük kazanç ve geçmiş grafikler | 44 otomatik | [#13](https://github.com/gurkanallenxd1-rgb/motor-empire/pull/13) |
| v0.9 | Türkiye pazarı, uzaklık ve şehirler arası nakliye | 39 otomatik | [#12](https://github.com/gurkanallenxd1-rgb/motor-empire/pull/12) |
| v0.8 | Hasar kategorileri, tamir maliyetleri ve değerleme | 33 otomatik | [#11](https://github.com/gurkanallenxd1-rgb/motor-empire/pull/11) |
| v0.7.1 | İlan satırları, filtreler ve kasa yılına göre çizimler | — | [#10](https://github.com/gurkanallenxd1-rgb/motor-empire/pull/10) |
| v0.7 | 100 model, 30 ilan, otomatik alış ve satış pazarlığı | 20 Node, mobil WebKit ve masaüstü Chromium | [#9](https://github.com/gurkanallenxd1-rgb/motor-empire/pull/9) |
| v0.6 | Yeni görseller, müşteri görüşmesi ve pazarlık | 17 Node | [#8](https://github.com/gurkanallenxd1-rgb/motor-empire/pull/8) |
| v0.5.1 | Görsel denetim ve boya maskesi altyapısı | 12 Node | [#7](https://github.com/gurkanallenxd1-rgb/motor-empire/pull/7) |
| v0.5 | Modele özel görseller ve genişletilmiş filtreli ilan pazarı | 10 Node | [#6](https://github.com/gurkanallenxd1-rgb/motor-empire/pull/6) |
| v0.4.1 | Önbellek sürümleri ve mobil menü düzeltmesi | 8 motor testi, mobil Chromium | [#5](https://github.com/gurkanallenxd1-rgb/motor-empire/pull/5) |
| v0.4 | Şube ve işletme sistemleri | — | [#4](https://github.com/gurkanallenxd1-rgb/motor-empire/pull/4) |
| v0.3 | Premium garaj, Retina kamera ve yakınlaştırma | Mobil Chromium dokunmatik emülasyonu | [#3](https://github.com/gurkanallenxd1-rgb/motor-empire/pull/3) |
| v0.2 | Garaj grafikleri, giriş ve çıkış animasyonları | Chromium görsel kontrolleri ve çizim ölçümü | [#2](https://github.com/gurkanallenxd1-rgb/motor-empire/pull/2) |
| v0.1 | İlk oynanabilir alım, ekspertiz, tamir, satış ve kayıt döngüsü | Masaüstü Chromium ve mobil Chromium emülasyonu | [#1](https://github.com/gurkanallenxd1-rgb/motor-empire/pull/1) |

## Belgelenmiş sınırlar

Model çizimleri ve renk aileleri temsilîdir. Kaynak PR'lar tüm ülke, kasa ve donanımları kapsayan üretici doğrulaması bildirmiyor. [v0.15.4 garaj görüntüleri](docs/v0154-garaj-seviyeleri.webp) ve [yakınlaştırma denetimi](docs/v0154-yakinlastirma.webp) mobil WebKit çıktılarını içeriyor. Piyasa değerleri oyun simülasyonudur. Canlı satış verisi ve bulut kayıt, bu sürümün dışında kalır.
