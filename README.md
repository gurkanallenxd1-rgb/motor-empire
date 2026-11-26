# MOTOR EMPIRE v0.6

iPhone Safari ve masaüstü tarayıcılar için Türkçe motosiklet işletme oyunu. HTML, CSS, JavaScript ve Canvas kullanır. Harici API, paket kurulumu veya derleme adımı gerektirmez.

## Oynama

1. 75.000 TL ile ikinci el pazarından motosiklet al. Garaj iki motosiklet alır.
2. 450 TL karşılığında ekspertiz yaptır. Arızalı parçalar, fiyatları ve işçilik saatleri garajda görünür.
3. Parça bedelini ödeyip tamiri başlat. Her şubenin tamir sırası günde sekiz saat işler. İşe alınan her usta bu şubeye sekiz saat daha ekler. Teslim gününe ulaşmak için **Günü ilerlet** düğmesini kullan.
4. Tamiri biten motosiklete ilan fiyatı belirle. Sonraki günlerde gelen müşterilerle görüş veya bir teklifi kabul ederek satışı tamamla. Satış geçmişi, alış, ekspertiz ve tamir giderleri düşüldükten sonraki kâr veya zararı gösterir.
5. Her yeni günde pazar ilanları yenilenir ve satış ilanlarının müşteri talebi hesaplanır. İlerleme tarayıcıdaki localStorage ile kaydedilir.

## Çalıştırma

Yerel önizleme için depo dizininde çalıştır.

```sh
python3 -m http.server 8000
```

Tarayıcıda http://localhost:8000/ adresini aç.

GitHub Pages üzerinden yayımlamak için **Settings → Pages → Deploy from a branch** altında yayımlamak istediğin dalı ve `/ (root)` dizinini seç. Uygulama dosyaları proje alt adreslerinde çalışacak şekilde bağıl yollar kullanır.

## Grafikler ve kayıtlar

Atölye ve motosikletlerin model görselleri yerel WebP varlıklarıyla Canvas üzerinde birleştirilir. Kamera tuvali ekran piksel oranına göre ölçeklenir. Hareket azaltma tercihi garaj animasyonlarını durdurur. v0.1–v0.5.1 kayıtları ilk açılışta v0.6 biçimine aktarılır. Yeni kayıt `motor-empire.v3` anahtarına yazılır. Eski anahtarlar korunur. Aktif tamirlerin teslim günü ve mevcut müşteri tekliflerinin tutarı aktarılır.

Garaj kamerası başlangıçta sahneye ortalanır. Kamera düğmeleri veya sahnede iki parmakla yakınlaştırabilirsin. Mobilde varsayılan yakın kadrajdan uzaklaştırarak garajın tüm kenarlarını görebilirsin. Yakınlaştırdıktan sonra sahne içinde sürükle. Motosiklete dokunarak yakın planı aç. Yerel WebP varlıklarının üretim planı [görsel varlık belgesinde](docs/v03-varlik-plani.md) bulunur.

## İşletme kuralları

- Gün kapanışında her şubeye 250 TL işletme gideri ve çalışan usta başına 750 TL maaş yazılır. Kiralar aynı günün geliri olarak giderlerden önce tahsil edilir.
- Hazır motosiklet 1, 3 veya 7 gün kiralanır. Sözleşme başındaki kondisyonla düzeltilmiş değerin günlük %0,6’sı sabitlenir. Dönüşte her gün için 85 km ve 1 kondisyon puanı işlenir. Kondisyonun alt sınırı %25’tir.
- Garaj seviyeleri 2, 4, 6 ve 10 araç alır. Ardışık yükseltmeler 50.000, 125.000 ve 250.000 TL’dir. Büyük garajda iki liftli atölye sahnesi bölme sayfalarına ayrılır.
- İstanbul’da her ek şube 250.000 TL’ye açılır. Şubeler aynı kasayı ve pazarı kullanır. Garaj, tamir sırası, ustalar ve giderler şube bazında tutulur.
- İsteğe bağlı faizsiz borç için toplam bakiye sınırı 250.000 TL’dir. Zorunlu giderin nakit açığı kadar otomatik borç yazılır ve bu borç bakiyesi sınırı aşabilir. İsteğe bağlı harcamalar yeterli nakit gerektirir.
- Günlük net, o gün kaydedilen nakit gelirlerinden giderleri çıkarır. Borç alma ve ödeme finansman hareketidir. Toplam varlık nakit, motosiklet stoku ve maliyet bedeliyle şube yatırımlarını içerir. Net varlık borcu düşer.

Oyun kurallarını test etmek için `node --test game.test.mjs trade.test.mjs sprite.test.mjs` çalıştır.

GitHub Pages dağıtımında HTML’deki CSS ve giriş modülü adresleri ile tarayıcı modüllerinin tüm içe aktarma adresleri aynı `?v=` sürümünü kullanır. Yeni sürüm yayımlarken bu adresleri birlikte güncelle.

## Model görselleri ve ilanlar

- Katalog 22 model içerir. Teknik rakamlar temsilî model nesillerine aittir. Alış ve satış tutarları oyun dengesi için belirlenir.
- Her yeni gün 12 farklı modelden ilan oluşur. Yıl, kilometre, renk, kondisyon ve arızalar üretilir. Boya rengi ayrı alfa maskesinden kaportaya uygulanır. Maske dışındaki parçalar orijinal renklerini korur.
- Kayıtlı motosikletlerin teknik bilgileri model adından okunur. Devam eden günün mevcut ilanları gün kapanışına kadar korunur.
- `assets/models/` içindeki 480 × 400 şeffaf WebP dosyaları bu oyun için OpenAI ImageGen ile oluşturulan model temsilleridir. Üretici fotoğrafı veya resmî teknik referans kullanılmadı. Yıl ve donanım ayrıntıları çizimlerde değişiklik gösterebilir. Temsili oldukları oyun ekranlarında etiketlenir.

### Görsel denetim

[Model karşılaştırma sayfası](visual-audit.html) 22 mevcut çizimi ve yıl bazında onay durumunu gösterir. Doğrulanmış kasa dosyası yoksa oyun aynı modelin v0.5 çizimini ve `assets/model-masks/` maskesini kullanır. v0.6’da 22 modelin tamamı için bu temsili set bulunur. Kasa yılı ve üretici ayrıntıları doğrulanmış dosya kapsamı 0/22’dir.

Yeni görsel için `sprite-catalog.mjs` içinde model kimliği, doğrulanmış kasa yılı aralığı, yaratıcı, kaynak ve lisans bağlantılarını kaydet. Kullanım izni, türetme ve yeniden dağıtımı kapsamalı. `assets/verified/` içinde sağ ön üç çeyrek açıdan, ön teker sağda, aynı kadrajda en az 960 px genişliğinde şeffaf WebP oluştur. Aynı ölçülerde ayrı WebP maskesinin alfa kanalı yalnızca boyalı kaportayı kapsamalı. Siyah plastik, lastik, jant, egzoz, motor ve metal parçalar maskenin dışında kalmalı. Bir görseli onaylamadan önce far, depo, egzoz, jant, grenaj ve şasiyi tarihli kaynaklarla karşılaştır.

İncelenen örnek kaynaklar arasında [2016 Yamaha MT-25](https://commons.wikimedia.org/wiki/File:2016_Yamaha_MT-25.JPG), [2022 Yamaha MT-09](https://commons.wikimedia.org/wiki/File:2022_Yamaha_MT-09.jpg) ve [Honda CBR250R](https://commons.wikimedia.org/wiki/File:Honda_CBR250R.jpeg) yer alır. Bunlar araştırma referanslarıdır. Ortak kamera ve boya maskesi doğrulanmadığı için paketlenmemiştir.

## Görüşmeler

- Satıcıyla pazarlık, ilandaki doğrudan satın alma seçeneğinin yanında yer alır. Satıcı görüşmesi ilanla birlikte gün sonunda sona erer.
- Satış ilanına müşteriler sonraki günlerde gelebilir. Talep sınıf, istenen fiyat, kilometre, kondisyon ve işletme itibarına göre hesaplanır. Alıcı görüşmesi üç oyun günü sürer.
- En fazla üç karşı teklif verilir. Her tur sabrı düşürür. Anlaşma, kasayı değiştirmez. Sat veya Satın al düğmesi işlemi tamamlar.
- İtibar tamamlanan satışlar ve müşteri deneyimiyle değişir. Finans ekranındaki başarı oranı sonuçlanan alıcı görüşmelerini esas alır. Süresi dolan görüşmeler bu orana girmez.
