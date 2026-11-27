# v0.17.0.1 deneysel grafik mimarisi

`graphics/controller.mjs` yalnızca oyuncu seçtiğinde ve 10 bölmeli şubede Three.js motorunu yükler. `renderer.mjs` WebGL2, OrbitControls, ışıklar, raycast ve gerektiğinde çizilen animasyon döngüsünü yönetir. `garage.mjs` metre ölçeğinde salon, atölye, ofis ve teslim alanını kurar. `assets.mjs` GLTFLoader, KTX2Loader, en çok iki Basis işçisi ve referans sayılı GPU varlık önbelleğini yönetir. Motor stok planını salt okunur kullanır. Seçim mevcut stok ayrıntısını açar. Ekonomi ve kayıt işlemleri motor dışındadır.

## Kamera ve dokunma

`camera.mjs` 10 bölmeli sahne için 10,5–40 m orbit mesafesi, en az 4,5 m göz yüksekliği ve 0,25–1,12 radyan polar açı tanımlar. Hedef X ±6 m, Z ±4,7 m ve Y 0,2–1,2 m aralığında tutulur. Oda önündeki dört yüz bağımsız kesit gruplarıdır. Opak yüzler kamera tarafında kesilir, dış cam yüksek görünümde korunur. Kamera konumu katı duvar fiziğiyle çarpışmaz. Kesit, iç mekânı arkadan görmeyi sağlar.

OrbitControls tek parmak döndürme ve iki parmak dolly/pan kullanır. Kaydırma ve yakınlaştırma hedefi imlece bağlı değildir. 8 px üstü hareket, 420 ms üstü basma, iki parmak veya iptal seçim sayılmaz. Yalnızca WebGL canvas üzerinde `user-select`, `touch-action` ve WebKit callout kapalıdır. Sağ tuş, sürükleme ve seçim olayları sahne üzerinde bastırılır. Hareket azaltma tercihinde kamera geçişleri doğrudan uygulanır.

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

30/60 FPS üst sınırı, çözünürlük, gölge, yansıma ve kenar yumuşatma ayrıca seçilebilir. Otomatik mod cihaz ipuçları ile başlar, kamerada sürdürülen yavaşlama görürse kaliteyi düşürür. Yansımalar yerel RoomEnvironment sahnesinden türetilen PMREM kullanır. Düşük/Orta/Yüksek/Ultra PMREM küp çözünürlüğü 64/128/128/256. Yüksek ve Ultra karoda normal/pürüzlülük ve çelikte fırçalı metal kanalı kullanır. Ultra ek olarak en büyük hedef ve gölge haritasını kullanır. Düşük profil gölgesizdir. Mevcut 2D stok için gölge düşük maliyetli ortak radyal dokudur. Fresnel yansıma ortam kaynağını kullanır. Cam ışık kırılması ve çekilmiş HDRI yoktur. Zemin dokusu, ortam hedefi, GLB uzaklık seviyeleri, tekrarlanan opak ekipmanın GPU instancing ile gruplanması, kalan küçük opak parçaların malzemeye göre birleştirilmesi ve tarayıcı frustum testi GPU işini sınırlar. Arka planda veya görünüm dışındayken çizim durur. Ekrandan çıkıldığında GPU kaynakları serbest bırakılır. Yeni varlıklar için mobil hedef tek motosiklet LOD0 başına en fazla 45.000 üçgen ve en çok 2.048² boyutlu sıkıştırılmış doku setidir. Bunlar cihazda ölçülmüş limitler değildir.

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

| Aynı Orta profil, yerel soğuk tarayıcı | PR #33 ilk commit'i | Denetim sonrası |
| --- | ---: | ---: |
| 3D seçeneğinden platform GLB hazır olana kadar | 5.130 ms | 3.517 ms |
| Normal karede WebGL çizim çağrısı | 92 | 44 |
| Çizim çağrılarının JS duvar süresi, 7 kare medyanı | 2,0 ms | 1,0 ms |
| Yansımalar ve MSAA açık, SwiftShader aygıt sorgusu medyanı | 94,8 ms | 85,3 ms |
| Yansıma kapalı, gölge ve MSAA açık, aynı sorgu | 27,6 ms | 37,9 ms |
| MSAA kapalı, yansıma ve gölge açık, aynı sorgu | 51,0 ms | 53,2 ms |

Birer yerel açılış ve 6–7 geçerli aygıt örneği kullanıldı. Başka iki eş koşul çalıştırmasında GLB hazır olma sonucu 3,48–3,82 saniye arasındaydı. Statik sunucu yerel ağa bağlıydı. Bu değerler CDN, mobil ağ veya gerçek oyuncu ölçümü değildir. Ağ, geç shader derlemesi, GPU kuyruğu ve tanılama ek yükü ayrıca süreyi etkileyebilir. Bu nedenle tek soğuk açılıştan kesin yüzde kazanım çıkarılmaz.

Önceki 5 FPS örneği yaklaşık 200 ms kare aralığına karşılık gelir. Profillemede JavaScript gönderim süresi aygıt sorgusundan çok düşük kaldı. Yansıma kapalı kontrolü ve ayrı MSAA kontrolü yazılım rasterizasyonu, PBR ortam örneklemesi ve piksel/örnek maliyetini işaret ediyor. Bu ölçüm gölge güncellemesi olmayan durağan kareyi örnekler. Fiziksel GPU yoğunluğu, shader başına darboğaz, hareket sırasında sürekli FPS ve iPhone pil/ısıl davranışı ölçülmedi. Cephe ve platform instancing varsayılan kaliteyi veya geometrileri düşürmeden 48 çağrıyı kaldırdı. Yansımalar veya MSAA zorunlu olarak kapatılmadı. Eski göstergenin dışladığı 250 ms üzeri kareler artık ölçüme dahil.

Hotfix karşılaştırması ve aynı pozları kullanan yakalama komutu için [v0.17.0.1 karşılaştırmasına](docs/v01701-comparison.md) bak.
