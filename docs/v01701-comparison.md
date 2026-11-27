# v0.17 ve v0.17.0.1 garaj karşılaştırması

Taban `44e4d16` (PR #33). Tüm eşli görüntülerde stok, kamera konumu, hedef, çözünürlük ve seçilen kalite eşleşiyor. Yamaha MT-25 2024 servis bölmesinde. Kawasaki Z900 2025 ve KTM 1390 Super Duke R 2024 showroom’da. Üçü aynı özgün 2D varlıklarını kullanıyor.

| Görünüm | Önce / sonra |
| --- | --- |
| Genel garaj | [Varsayılan kamera](v01701/general.webp) |
| Satış alanı | [Showroom ve platformlar](v01701/showroom.webp) |
| Servis alanı | [Lift ve takım ekipmanı](v01701/service.webp) |
| Ofis ve depo | [Aynı arka açı, kesit farkı](v01701/office.webp) |
| Yakın plan ekipman | [Tezgâh, kompresör ve lastik makinesi](v01701/equipment.webp) |
| Dört grafik seviyesi | [Düşük, Orta, Yüksek, Ultra](v01701/quality.webp) |
| Mobil dikey | [390 × 844](v01701/portrait.webp) |
| Mobil yatay | [844 × 390](v01701/landscape.webp) |

Arka açıda eski duvar ofis ve depo alanını kesiyor. Yeni görüntü kamera tarafındaki duvarı gizleyerek aynı pozdan odayı gösteriyor. Cam yüksek açıdan sahnede kalıyor. Karo desenleri, gövde kenarları, kompresör ve hidrolik liftler yakından kontrol edildi. İnsan boyu donatılar aynı metre tabanında çizildi. Motosikletin genişliği görsel kart ölçeğidir. Gerçek motosikletin 3D oranları ve fiziksel cam kırılması ileride doğrulanacak.

## Tekrar üretme

İki git revizyonunu ayrı yerel portlarda çalıştır. Yeni revizyonun kökünde şu komutu çalıştır. Yakalama aracı mevcut oyun stok ve kamera yolunu kullanır. Kesin pozlar testte Playwright ile verilir.

```sh
GRAPHICS_BASE_URL=http://127.0.0.1:8397 \
GRAPHICS_URL=http://127.0.0.1:8398 \
GRAPHICS_SCREENSHOTS=/tmp/motor-captures \
node tests/graphics-captures.cjs
```

Tarayıcı için `PLAYWRIGHT_MODULE` ve `CHROMIUM_PATH` ayarlanabilir. Karşılaştırmalar Chromium SwiftShader mobil emülasyonuyla alındı. Fiziksel iPhone’da yeni sürüm, yerleşik uzun basma menüsü, dokunma ve FPS yeniden denenmedi.
