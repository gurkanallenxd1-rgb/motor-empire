# 3D varlık kaynakları ve lisanslar

| Depodaki varlık | Kaynak ve lisans |
| --- | --- |
| `graphics/vendor/three.*.js`, `graphics/vendor/addons.mjs` | [Three.js r180](https://github.com/mrdoob/three.js/tree/r180), MIT. Lisans `graphics/vendor/THREE-LICENSE.txt`. Eklenti paketinde OrbitControls, GLTFLoader, KTX2Loader ve RoomEnvironment bulunur. |
| `graphics/vendor/basis/` | Three.js r180 ile dağıtılan [Basis Universal transcoder](https://github.com/BinomialLLC/basis_universal), Apache-2.0. Lisans ve kaynak notu aynı klasörde. |
| `assets/3d/models/showroom-plinth.glb` | Bu değişiklikte üretilen sergileme platformu. Kaynak `tools/build-display-plinth.py`. Üçüncü taraf model veya doku içermez. |
| Garaj geometrisi, ortam ve yüzey desenleri | `graphics/garage.mjs` içinde üretilir. Harici HDRI veya doku içermez. |

Önceki 2D katalog varlıkları özgün dosyalarından okunur. Önceki varlık envanteri grafik bütünlüğü testinde kayıtlıdır.

## Motosiklet adayları · 27 Kasım 2026

Fiyatlar görülen ilan fiyatlarıdır. Vergi, indirim, paket ve para birimi değişebilir. Bu araştırmada satın alma yapılmadı. Yayımlanan GLB tarayıcıdan ayrı bir dosya olarak alınabildiğinden, hem açık Git deposu hem web dağıtımı için modelin yeniden dağıtım hakkı gerekir.

| Hedef ve aday | Görülen fiyat | Ticari kullanım, düzenleme ve dağıtım | Teknik sonuç |
| --- | --- | --- | --- |
| Yamaha MT-25 · Printiby 2021 MT03/MT25 STL | 13,19–13,22 ABD doları | Öğe için açık depo ve web dağıtım izni doğrulanmadı. Ticari oyun ve dijital türev yetkisi belirsiz. | İlan 2021 olarak listeleniyor. 2024 siyah, PBR ve ayrı parçalar doğrulanmadı. [Cults](https://cults3d.com/en/tags/mt25) |
| Yamaha MT-25 · ücretsiz indeks adayları | Ücretsiz olarak indekslenen parçalar var | Listelenen parçaların lisansı varlık bazında değişiyor. Tam 2024 mesh için izin doğrulanmadı. | İndeks parça, STL ve farklı nesil kayıtları içeriyor. Yamaha'nın 2025 sürümü ayrı güncelleme olduğundan güncel üretici fotoğrafları 2024 kasanın kanıtı sayılmadı. [STLFinder](https://www.stlfinder.com/3dmodels/yamaha-mt25/) · [Yamaha](https://www.yamaha-motor.co.id/archives/news/product/2025/01/hadir-dengan-berbagai-upgrade-new-yamaha-mt-25-semakin-tonjolkan-aura-the-master-of-torque-yang-agresif/) |
| Kawasaki Z900 2025 · Rey Studio taban mesh | 3DExport listesinde 27 ABD doları | Basic/Extended ticari son ürün kullanımı koşulludur. Uygun kapsama alınmış kullanım ham dosyanın açık dağıtım iznini vermez. Satıcı veya marka sahibinden ayrı izin doğrulanmadı. | Yıl eşleşiyor. İlanı alınmadan kaporta boyası, PBR ve motor parçası ayrıntısı doğrulanamıyor. [3DExport](https://3dexport.com/3d-model-base-model-kawasaki-z900-2025-561335) · [Kawasaki ölçüleri](https://www.kawasaki.co.uk/en/Motorcycles/Supernaked/Z900_2025.html) |
| Kawasaki Z900 · Pinshape ve Meshy | Ücretsiz adaylar | Pinshape CC BY-NC-SA ticari kullanımı kapsamıyor. Meshy adayının CC0 beyanı aktaran kişinin hak sahibi olduğunu veya marka haklarını kanıtlamıyor. | 2025 kasa, yeşil/siyah boya ve PBR doğrulanmadı. [Pinshape](https://pinshape.com/items/125557-3d-printed-kawasaki-z900) · [Meshy](https://www.meshy.ai/posts/moto-kawazaki-z900-con-textura-01a20450-ab7b-75cb-83f1-d2e2a0126afa) |
| KTM 1390 Super Duke 2024 · Rey Studio taban mesh | 3DExport listesinde 27 ABD doları. CGTrader kategori verisinde 49 ABD doları liste fiyatı. | 3DExport koşullu kullanım ve yeniden dağıtım sınırı yukarıdaki gibi. CGTrader Royalty Free, varlığın üçüncü tarafça ayrı alınamamasını şart koşar. Ticari son ürün ve düzenleme kapsamı açık dosya dağıtımına izin vermez. | Taban model. Turuncu/siyah R varyantı ve PBR bitişi doğrulanmadı. [3DExport](https://3dexport.com/3d-model-base-model-ktm-1390-super-duke-2024-562075) · [CGTrader](https://www.cgtrader.com/3d-models/vehicle/motorcycle/base-model-ktm-1390-super-duke-2024) · [KTM ölçüleri](https://www.ktm.com/en-ie/models/naked-bike/2024-ktm-1390-superduker/technical-specifications.html?variation=F9903X2) |
| KTM 1390 Super Duke R 2024 · ücretsiz tam mesh | Doğrulanmış ilan bulunamadı | Hak, ücret veya ticari kullanım konusunda çıkarım yapılmadı. | Açık aday bulunana kadar özgün 2D varlık. |
| Üç varyant · siparişle özgün model veya üreticiden lisanslı erişim | Teklif gerekli | Yazılı sözleşmede ticari kullanım, düzenleme, GitHub ve tarayıcıda ham GLB/doku dağıtımı ve varsa logo/marka/kasa hakları ayrı doğrulanmalı. | Teslim kapsamı teknik olarak [mimari belgede](GRAPHICS_ARCHITECTURE.md). Henüz sipariş veya iletişim yok. |

Alternatif satıcı listeleri [Z900 TurboSquid](https://www.turbosquid.com/3d-models/base-model-kawasaki-z900-2025-model-2438653), [KTM TurboSquid](https://www.turbosquid.com/3d-models/3d-base-model-ktm-1390-super-duke-2024-model-2438660) ve [Z900 Cubebrush](https://cubebrush.co/rpalomino/products/lzwjda/base-model-kawasaki-z900-2025) üzerinden incelendi. Fiyat yeniden doğrulanamadı. Kamuya açık, indirilebilir GLB için bu standart lisanslar yeterli kabul edilmedi. [3DExport şartları](https://3dexport.com/basic-license-and-extended-license) · [CGTrader Royalty Free](https://help.cgtrader.com/hc/en-us/articles/360015124437-Royalty-Free-License) · [TurboSquid lisansı](https://blog.turbosquid.com/turbosquid-3d-model-license/) · [Cubebrush lisansı](https://support.cubebrush.co/hc/en-us/articles/115000401708-Licenses-FAQ)

## Test varlığı

`tests/fixtures/checker-basis.glb` bu depoda üretilen özgün iki renkli desen ve basit düzlem içerir. Üçüncü taraf model, görsel veya marka içermez. 32 × 32 UASTC doku ve altı mip seviyesi Basis Universal encoder 1.16.3 ile `tools/build-ktx2-fixture.py` kullanılarak üretildi. [Basis Universal kaynak ve lisansı](https://github.com/BinomialLLC/basis_universal)
