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

Bu prototipte doğrulanmış motosiklet mesh'i, fiziksel görsel hasar, harici HDRI ve gerçek cihaz performans ölçümü eksik. GLB yükleyici özgün sergi platformuyla test edilir. UASTC KTX2 yolu özgün test GLB’si ile doğrulandı. Üretim motosikleti dokusu henüz yok. Tüm katalog ve garajlara genişleme öncesi kullanıcı onayı gereklidir.

## Performans doğrulaması

`tests/graphics-profile.cjs`, ayrı bir Chromium profili açar ve 390×844 iPhone emülasyonunda yazılımsal Vulkan SwiftShader kullanır. İlk açılış metrikleri 3D seçeneğini değiştirmekten platform GLB'sinin bağlanmasına kadar ölçülür. Ardından boş 10 bölmeli sahne 390×260 CSS pikselde, 487×325 fiziki pikselde ve Orta profilde örneklenir. Çizim çağrıları web bağlamından, CPU tarafı duvar süresi ilk clear ile aynı karedeki ölçüm callback'i arasından alınır. Bu süre JavaScript ile yazılım sürücüsünün senkronize işini kesin olarak ayırmaz. Timer sorguları desteklenirse aygıt tarafı örnekleri de alınır. SwiftShader sonuçları CPU üzerinde çalışan bir WebGL sürücüsüne aittir.

```sh
python3 -m http.server 8397
# İkinci terminal
node tests/graphics-profile.cjs
```

Gerekirse `PLAYWRIGHT_MODULE`, `CHROMIUM_PATH` ve `GRAPHICS_URL` ayarla. Karşılaştırılacak iki commit için aynı tarayıcı ve host kullan. Platform GLB 6.940 bayt. UASTC test GLB'si 1.492 bayt. Gömülü doku 529 bayt ve 32×32 boyutta. Bu doku üretim sahnesinin parçası değildir. Three.js bellek sayaçları kaynak adedini verir. GPU VRAM baytlarını veya süreç RSS sızıntısını ispatlamaz.
