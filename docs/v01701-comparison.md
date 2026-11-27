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

## Test kapsamı

- **130 Node.js, 36 mobil Playwright WebKit ve 7 Chromium SwiftShader grafik testi geçti.** PR #33 testleri korunuyor. Maksimum eğim senaryosu iki tarayıcıda ayrıca tekrar çalıştırıldı.
- Dikey ve yatay emülasyonda orbit, yakın/uzak zoom, maksimum eğim, kamera sıfırlama, görüş kesiti ve yanlış seçim engeli kontrol edildi. Chromium’da iki parmak yakınlaştırma denendi. Node testi dokunma iptali ve uzun basmayı ayırır.
- Canvas özelindeki iOS CSS hem kaynakta hem emülatörün hesaplanan stillerinde denetlendi. Emülatör işletim sisteminin gerçek menüsünü üretmediğinden fiziksel Safari doğrulaması açık.
- Profil testleri 128/256/512/1.024 karo çözünürlüğü, 0/512/1.024/2.048 gölge haritası, 64/128/128/256 ortam hedefi ve Yüksek/Ultra malzeme detayını ölçer.
- Önceki 2D/3D geçişi, bağlam kaybı, eski kayıt, stok/otomasyon ve KTX2 kaynak temizliği testleri çalıştırıldı. 98 eski katalog/2D dosyası SHA-256 ile eşleşir.

## Performans

Aynı yerel sunucu, Chromium SwiftShader/Vulkan, 390 × 844 mobil emülasyon, Orta profil, 390 × 260 CSS ve 487 × 325 framebuffer ile `tests/graphics-profile.cjs` çalıştırıldı. Boş 10 bölmeli sahne, her sürüm için ayrı soğuk tarayıcı ve 6–7 geçerli aygıt sorgusu kullanıldı.

| Ölçüm | v0.17 | v0.17.0.1 |
| --- | ---: | ---: |
| 3D seçiminden platform GLB hazır olana kadar | 3,655 sn | 1,833 sn |
| Normal karede çizim çağrısı | 44 | 72 |
| JS gönderim medyanı | 1,4 ms | 1,3 ms |
| Gölge, yansıma ve MSAA açık, aygıt sorgusu medyanı | 80,42 ms | 92,45 ms |
| Yansıma kapalı, aynı sorgu | 28,80 ms | 47,02 ms |

Yeni detay geometrisi normal kareyi yazılımsal WebGL'de daha pahalı hale getirdi. Aynı hotfix'in birleştirme öncesi kontrolünde 76 çağrı ölçüldü. Son sahnede tekrarlanan ekipman instancing, kalan küçük parçalar malzeme bazlı birleştirme ile çiziliyor. Orta profil daha küçük ortam hedefi kullanıyor. Kamera ve stok değişimi yokken sürekli çizim yapılmıyor. 30 ve 60 FPS ayarları üst sınırdır. Fiziksel cihaz FPS’i, pil ve ısıl davranış ölçülmedi. Yerel açılış tek denemeden ölçüldü. Sonuç ağ veya cihaz garantisi değildir.
