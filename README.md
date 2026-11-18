# MOTOR EMPIRE v0.3

iPhone Safari ve masaüstü tarayıcılar için Türkçe motosiklet işletme oyunu. HTML, CSS, JavaScript ve Canvas kullanır. Harici API, paket kurulumu veya derleme adımı gerektirmez.

## Oynama

1. 75.000 TL ile ikinci el pazarından motosiklet al. Garaj iki motosiklet alır.
2. 450 TL karşılığında ekspertiz yaptır. Arızalı parçalar, fiyatları ve işçilik saatleri garajda görünür.
3. Parça bedelini ödeyip tamiri başlat. Her tamir için bir oyun gününe en fazla sekiz saat işçilik sığar. Teslim gününe ulaşmak için **Günü ilerlet** düğmesini kullan.
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

Atölye ve dört motosiklet sınıfı yerel WebP varlıklarıyla Canvas üzerinde birleştirilir. Kamera tuvali ekran piksel oranına göre ölçeklenir. Hareket azaltma tercihi garaj animasyonlarını durdurur. v0.1 ve v0.2 kayıtları aynı anahtar ve biçimle açılır.

Garaj kamerası başlangıçta sahneye ortalanır. Kamera düğmeleri veya sahnede iki parmakla yakınlaştırabilirsin. Mobilde varsayılan yakın kadrajdan uzaklaştırarak garajın tüm kenarlarını görebilirsin. Yakınlaştırdıktan sonra sahne içinde sürükle. Motosiklete dokunarak yakın planı aç. Yerel WebP varlıklarının üretim planı [görsel varlık belgesinde](docs/v03-varlik-plani.md) bulunur.
