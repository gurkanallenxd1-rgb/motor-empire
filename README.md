# MOTOR EMPIRE v0.5

iPhone Safari ve masaüstü tarayıcılar için Türkçe motosiklet işletme oyunu. HTML, CSS, JavaScript ve Canvas kullanır. Harici API, paket kurulumu veya derleme adımı gerektirmez.

## Oynama

1. 75.000 TL ile ikinci el pazarından motosiklet al. Garaj iki motosiklet alır.
2. 450 TL karşılığında ekspertiz yaptır. Arızalı parçalar, fiyatları ve işçilik saatleri garajda görünür.
3. Parça bedelini ödeyip tamiri başlat. Her şubenin tamir sırası günde sekiz saat işler. İşe alınan her usta bu şubeye sekiz saat daha ekler. Teslim gününe ulaşmak için **Günü ilerlet** düğmesini kullan.
4. Tamiri biten motosikleti satışa çıkar ve üç müşteri teklifinden birini kabul et. Satış geçmişi, alış, ekspertiz ve tamir giderleri düşüldükten sonraki kâr veya zararı gösterir.
5. Her yeni günde pazar ilanları ve açık müşteri teklifleri yenilenir. İlerleme tarayıcıdaki localStorage ile kaydedilir.

## Çalıştırma

Yerel önizleme için depo dizininde çalıştır.

```sh
python3 -m http.server 8000
```

Tarayıcıda http://localhost:8000/ adresini aç.

GitHub Pages üzerinden yayımlamak için **Settings → Pages → Deploy from a branch** altında yayımlamak istediğin dalı ve `/ (root)` dizinini seç. Uygulama dosyaları proje alt adreslerinde çalışacak şekilde bağıl yollar kullanır.

## Grafikler ve kayıtlar

Atölye ve dört motosiklet sınıfı yerel WebP varlıklarıyla Canvas üzerinde birleştirilir. Kamera tuvali ekran piksel oranına göre ölçeklenir. Hareket azaltma tercihi garaj animasyonlarını durdurur. v0.1–v0.3 kayıtları ilk açılışta v0.4 biçimine aktarılır. Eski kayıt özgün yerel depolama anahtarında kalır. Aktif tamirlerin teslim günü ve satış geçmişi korunur. Yeni finans geçmişi geçişten itibaren tutulur.

Garaj kamerası başlangıçta sahneye ortalanır. Kamera düğmeleri veya sahnede iki parmakla yakınlaştırabilirsin. Mobilde varsayılan yakın kadrajdan uzaklaştırarak garajın tüm kenarlarını görebilirsin. Yakınlaştırdıktan sonra sahne içinde sürükle. Motosiklete dokunarak yakın planı aç. Yerel WebP varlıklarının üretim planı [görsel varlık belgesinde](docs/v03-varlik-plani.md) bulunur.

## İşletme kuralları

- Gün kapanışında her şubeye 250 TL işletme gideri ve çalışan usta başına 750 TL maaş yazılır. Kiralar aynı günün geliri olarak giderlerden önce tahsil edilir.
- Hazır motosiklet 1, 3 veya 7 gün kiralanır. Sözleşme başındaki kondisyonla düzeltilmiş değerin günlük %0,6’sı sabitlenir. Dönüşte her gün için 85 km ve 1 kondisyon puanı işlenir. Kondisyonun alt sınırı %25’tir.
- Garaj seviyeleri 2, 4, 6 ve 10 araç alır. Ardışık yükseltmeler 50.000, 125.000 ve 250.000 TL’dir. Büyük garajda iki liftli atölye sahnesi bölme sayfalarına ayrılır.
- İstanbul’da her ek şube 250.000 TL’ye açılır. Şubeler aynı kasayı ve pazarı kullanır. Garaj, tamir sırası, ustalar ve giderler şube bazında tutulur.
- İsteğe bağlı faizsiz borç için toplam bakiye sınırı 250.000 TL’dir. Zorunlu giderin nakit açığı kadar otomatik borç yazılır ve bu borç bakiyesi sınırı aşabilir. İsteğe bağlı harcamalar yeterli nakit gerektirir.
- Günlük net, o gün kaydedilen nakit gelirlerinden giderleri çıkarır. Borç alma ve ödeme finansman hareketidir. Toplam varlık nakit, motosiklet stoku ve maliyet bedeliyle şube yatırımlarını içerir. Net varlık borcu düşer.

Oyun kurallarını test etmek için `node --test game.test.mjs` çalıştır.

GitHub Pages dağıtımında HTML’deki CSS ve giriş modülü adresleri ile tarayıcı modüllerinin tüm içe aktarma adresleri aynı `?v=` sürümünü kullanır. Yeni sürüm yayımlarken bu adresleri birlikte güncelle.

## Model görselleri ve ilanlar

- Katalog 22 model içerir. Teknik rakamlar temsilî model nesillerine aittir. Alış ve satış tutarları oyun dengesi için belirlenir.
- Her yeni gün 12 farklı modelden ilan oluşur. Yıl, kilometre, renk, kondisyon ve arızalar üretilir. Boya rengi ilan bilgisinde gösterilir. WebP çizimleri sabit gövde rengindedir.
- Eski kayıt biçimi korunur. Kayıtlı motosikletlerin teknik bilgileri model adından okunur. Devam eden günün mevcut ilanları gün kapanışına kadar korunur.
- `assets/models/` içindeki 480 × 400 şeffaf WebP dosyaları bu oyun için OpenAI ImageGen ile oluşturulan model temsilleridir. Üretici fotoğrafı veya resmî teknik referans kullanılmadı. Yıl ve donanım ayrıntıları çizimlerde değişiklik gösterebilir. Eksik dosyada “Model görseli yok” gösterilir.
