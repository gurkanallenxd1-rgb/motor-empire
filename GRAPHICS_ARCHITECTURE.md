# v0.17 deneysel grafik mimarisi

`graphics/controller.mjs` yalnızca oyuncu seçtiğinde ve 10 bölmeli şubede Three.js motorunu yükler. `renderer.mjs` WebGL2, OrbitControls, ışıklar, raycast ve gerektiğinde çizilen animasyon döngüsünü yönetir. `garage.mjs` metre ölçeğinde salon, atölye, ofis ve teslim alanını kurar. `assets.mjs` GLTFLoader, KTX2Loader, en çok iki Basis işçisi ve referans sayılı GPU varlık önbelleğini yönetir. Motor stok planını salt okunur kullanır. Seçim mevcut stok ayrıntısını açar. Ekonomi ve kayıt işlemleri motor dışındadır.

## Model ekleme

1. Yıl ve fabrika boyasını üretici referansıyla doğrula. Ticari kullanım ve web üzerinden yeniden dağıtım izinlerini [ASSET_LICENSES.md](ASSET_LICENSES.md) dosyasına kaydet.
2. Kendine yeterli glTF 2.0 GLB dosyasını `assets/3d/models/` altına ekle. Harici referans gerekirse yalnızca proje içindeki dosyalara bağla. Özgün 2D kaynaklara dokunma. Yeni dokular için `assets/3d/textures/` kullanılabilir.
3. Metre, Y-yukarı ve zeminde merkezli pivot kullan. Kaporta, kauçuk, cam ve metal için ayrı metallic-roughness PBR malzemeleri hazırla. Renk dokuları sRGB, roughness/metallic/normal dokuları veri kanalı olmalı. KTX2 için uygun renk uzayı ve mipmap üret.
4. `graphics/registry.mjs` dosyasına mevcut katalog ID'si, kesin yıl, boya kodu ve gerekiyorsa ikinci boya ile bağımsız eşleştirme ekle. Lisanslı mesh testini ve düşüş yolunu çalıştır.

## Kalite ve performans

| Profil | Piksel oranı üst sınırı | Üretilen zemin dokusu | Gölge haritası |
| --- | ---: | ---: | ---: |
| Düşük | 0,85 | 128² | Kapalı |
| Orta | 1,25 | 256² | 512² |
| Yüksek | 1,65 | 512² | 1.024² |
| Ultra | 2 | 1.024² | 2.048² |

30/60 FPS üst sınırı, çözünürlük, gölge, yansıma ve kenar yumuşatma ayrıca seçilebilir. Otomatik mod cihaz ipuçları ile başlar, kamerada sürdürülen yavaşlama görürse kaliteyi düşürür. Yansımalar yerel RoomEnvironment sahnesinden türetilen PMREM kullanır. Gerçek sahne HDRI'sı eklenmedi. Zemin dokusu, ortam hedefi, GLB uzaklık seviyeleri, tekrarlanan opak ekipmanın GPU instancing ile gruplanması ve tarayıcı frustum testi GPU işini sınırlar. Arka planda veya görünüm dışındayken çizim durur. Ekrandan çıkıldığında GPU kaynakları serbest bırakılır. Yeni varlıklar için mobil hedef tek motosiklet LOD0 başına en fazla 45.000 üçgen ve en çok 2.048² boyutlu sıkıştırılmış doku setidir. Bunlar cihazda ölçülmüş limitler değildir.

## Geri dönüş ve sınırlar

Oyun anahtarı `motor-empire.v9`. Grafik seçimi bağımsız `motor-empire.graphics.v1` anahtarındadır. WebGL 2 yoksa veya motor başlatılamazsa izometrik 2D garaj görünür. Bağlam kesintisinde aynı 2D ekran gösterilir, geri yüklemede temiz bir canvas ile motor yeniden başlatılır. Onaylı GLB eşleşmesi yoksa veya yüklenemezse mevcut motosiklet WebP görseli sahnede veya ayrıntıda kullanılır. Nakliye ve kiralamadaki stok fiziksel sahneye eklenmez. Katalog bütünlüğü v0.16.1 dosya karmalarıyla denetlenir.

Bu prototipte doğrulanmış motosiklet mesh'i, fiziksel görsel hasar, harici HDRI ve gerçek cihaz performans ölçümü eksik. GLB yükleyici özgün sergi platformuyla test edilir. KTX2 çözücü mevcut, motosiklet dokusu olarak doğrulanmış KTX2 örneği yok. Tüm katalog ve garajlara genişleme öncesi kullanıcı onayı gereklidir.

## v0.17 ölçüm kaydı

390×844 mobil ekran emülasyonunda, Chromium SwiftShader yazılımsal WebGL ile Orta profil ve 30 FPS sınırında, kamera hareketi sırasında örnek alınan çizimde 7.558 üçgen, 12 GPU doku nesnesi ve 14 geometri nesnesi raporlandı. Ayrı koşularda anlık kare hızı örnekleri 5–12 FPS aralığındaydı. Bu ölçüm fiziksel iPhone performansını temsil etmez. GLB platformu 6.940 bayt. GPU bellek baytları ve ilk kullanımdaki yükleme gecikmesi ölçülmedi. Mevcut üç 2D motosikletin 3D poligon sayısı yoktur.
