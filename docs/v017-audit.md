# v0.17 gereksinim denetimi · PR #33

Bu tablo ilk v0.17 isteğini, v0.16.1 tabanını ve PR #33 kaynaklarını karşılaştırır. **Tamam** uygulanan ve ilgili kanıtı olan, **Kısmi** altyapısı veya görsel prototipi olan, **Açık** teslim edilmemiş işi gösterir.

| İlk istek | Durum | Kanıt ve kalan iş |
| --- | --- | --- |
| 1 · Beş proje belgesini ve v0.16.1 kaynaklarını incele | Tamam | Taban PR #32, ilk grafik commit'i `21a4646`. 3D renderer dışındaki oyun kuralları değişmedi. |
| 1 · Önceki 151 testi, mevcut 160 testi ve mekanikleri koru | Tamam | Önceki testler korunur. Aşağıdaki test tablosu yeni çalıştırmaları listeler. |
| 2 · Modüler Three.js ve WebGL render | Tamam | `graphics/controller.mjs`, `renderer.mjs`, `assets.mjs`, `garage.mjs`, `config.mjs`, bağımsız eşleştirme ve yerel r180. Ekonomi grafik modüllerini içe aktarmaz. |
| 2 · GLB/glTF | Tamam | Self-contained GLB platformu ve ayrı KHR_texture_basisu fixture'ı tarayıcıda yüklenir. glTF Loader standardı destekler. Harici URI içeren bir proje varlığı ayrıca denenmedi. |
| 2 · PBR, metal, cam, yansımalar, HDR ışık, gölgeler, kenar yumuşatma | Kısmi | Metal/roughness PBR, yarı saydam cam, yerel yüksek dinamik aralıklı RoomEnvironment/PMREM, PCF gölgeler ve isteğe bağlı context MSAA çalışır. Cam refraction, düzlemsel yansıma ve çekilmiş HDRI yok. |
| 2 · LOD, KTX2, model/doku önbelleği ve temizleme | Kısmi | UASTC + altı mip seviyesi iki tarayıcıda render edildi. Son referansta doku ve geometri sayaçları sıfırlanıyor. LOD0 ve mesafede özgün 2D kart yolu hazır. Onaylı motosiklet mesh'iyle geçiş, orta mesh LOD ve gerçek cihaz GPU baytları açık. |
| 2 · WebGL context kaybı | Tamam | WebGL 2 kapalı başlatma, `WEBGL_lose_context` ile 2D'ye geçiş ve yeni canvas ile toparlanma senaryoları var. |
| 3 · MT-25 2024 siyah, Z900 2025 yeşil/siyah, KTM 1390 2024 turuncu/siyah | Açık | Üç kesin varyant için birlikte doğrulanmış görsel doğruluk ve lisans yok. Bağımsız kayıt boş. Özgün 2D geri dönüşü garajda ve ayrıntıda etiketli. |
| 3 · Motor bloğu, şasi, radyatör, egzoz, iki süspansiyon, disk/kaliper, jant/lastik, zincir/dişli, depo, far/stop, gidon/ayna, sele, gerçek oran ve PBR malzemeler | Açık | Üç motosikletin 3D dosyası bulunmadığından hiçbir parça 3D teslim olarak sayılmıyor. |
| 3 · Ücretsiz/ücretli kaynak, fiyat, ticari kullanım, değişiklik ve yeniden dağıtım doğrulaması | Kısmi | Araştırma ve adayların açık kaynak sınırları kaydedildi. Marka hakları ile birlikte güvenli alım/dağıtım sağlayan aday veya özel yazılı izin bulunmadı. [Adaylar](../ASSET_LICENSES.md) |
| 4 · 10 bölmeli garaj, cam cephe, zemin, platform, LED, masa, bekleme, duvar ve bilgi panoları | Kısmi | 10 bölmeli 3D kabuk, cam, yerel yüzey, platformlar, ışıklı şeritler, masa, basit koltuk ve bölge levhaları mevcut. Motosiklet başına okunabilir bilgi kartı, profesyonel mobilya modeli, gerçek cam optiği ve özel yüzey malzemeleri açık. |
| 4 · Hidrolik lift, dolap, kompresör, lastik makinesi, yedek parça, tezgâh, yağ ve endüstriyel ışık | Kısmi | Makaslı lift, dolap, kompresör, lastik makinesi silueti, tezgâh, raf ve ışık prosedürel geometri olarak var. Ayrı yağ/bakım ekipmanı ve ayrıntılı üretim varlıkları açık. |
| 4 · Müdür, depo, resepsiyon, giriş/çıkış ve teslim | Kısmi | Müdür masası, cam bölme, depo rafı, resepsiyon, kepenk ve teslim işaretleri var. Kapalı ve ayrıntılı odalar, ayrı giriş/çıkış ve geri yönlerde iç mekânı koruyan kesit kamera tasarımı açık. |
| 4 · Fiziksel ölçek | Kısmi | Zeminin dış izleri 16 × 13,6 m, duvar yüksekliği 3,1 m, lift üstü 2,26 × 0,76 m ve çoğu showroom aks aralığı 2,5 m. 350 m² 2D şube etiketi, 217,6 m² temsilî 3D ayak iziyle birebir eşleşmiyor. 2,35 m sprite genişliği ekran düzleminde, gerçek motosiklet boyunu doğrulamaz. Tam model ölçeği ve dolaşım kontrolü açık. |
| 5 · 360°, dokunmatik hareket, iki parmak, varsayılan açı, sınırlar, odak, yumuşak geçiş, sıfırlama ve seçim | Kısmi | OrbitControls fare ve iki parmak kontrolü, polar/mesafe/pan sınırı, yumuşak kamera ve konum sıfırlama uygular. Emüle edilen dokunma, sürükleme ve Chromium iki parmak testleri mevcut. Fiziksel Safari hareket testi ve açılarda occlusion değerlendirmesi açık. |
| 6 · Ayrı 3D inceleme, döndürme ve yakınlaştırma | Kısmi | Ayrı canvas ve OrbitControls yolu mevcut. Üç motosikletin ayrıntısı 2D geri dönüşünde test edildi. Gerçek 3D inceleme ve farklı açılarda motosiklet görüntüsü onaylı model bekliyor. |
| 6 · Model/yıl, km, üç kondisyon ve alış/satış | Tamam | Mevcut ayrıntı; model, yıl, km, mekanik/görsel/yapısal yüzdeler, alış ve varsa isteme fiyatı. Satış ilanı yoksa piyasa değeri etiketlenir. 3D görsel hasar uygulanmaz. |
| 7 · Düşük, Orta, Yüksek, Ultra ve ek ayarlar | Kısmi | Dört profil çözünürlük, yüzey dokusu, shadow map, yansıma şiddeti ve LOD eşiğini farklı uygular. Otomatik, 30/60 sınırı, çözünürlük, gölge, yansıma, MSAA, gösterge ve ayrı kayıt mevcut. Ultra ayrı doku seti, daha gelişmiş ışık modeli ve lisanslı yüksek mesh LOD bekliyor. |
| 7 · Otomatik performans düşüşü | Kısmi | Hareket sırasında yavaş kareler sayılır ve otomatik profil düşük kaliteye geçebilir. Gerçek cihazda eşikler ve kesintisiz ağır sahne davranışı henüz ölçülmedi. |
| 8 · iPhone ve FPS hedefleri | Kısmi | Mobil WebKit ve SwiftShader emülasyonu var. Fiziksel Safari/GPU 30/60 FPS hedefleri ve ısıl/pil ölçümü açık. |
| 8 · Frustum, instancing, uzak LOD, ihtiyaçta yükleme, arka plan durdurma ve 2D düşüş | Kısmi | Three.js frustum, tekrar eden ekipman, cephe ve platform instancing, talep üzerine yükleme, görünürlük/viewport duraklatma ve bağlam geri dönüşü mevcut. Onaylı mesh'lerle yük ve arka plan pil testi açık. |
| 9 · Stok alım/satım, servis, nakliye, kapasite | Tamam | Mevcut salt okunur park planı doğrudan kullanılır. Tarayıcı testi otomatik satışı ve nakliyedeki motorun sahne dışında kalmasını doğrular. 2D testleri eski kapasite, yükseltme ve sahneleri korur. |
| 9 · Kayıt, otomasyon, personel, ekonomi, finans, bildirim ve Yusuf | Tamam | Bağımsız grafik anahtarı ve eski kayıt testleri, oyun modülleri v0.16.1 ile aynı. |
| 10 · 2D varsayılan ve isteğe bağlı prototip, tek şube tipi, kayıtla iki mod | Tamam | 2D varsayılan, 3D yalnızca 10 bölme, ayarlar ve kayıt ayrı. 3D olmayan model için gerçek 2D varlık. |
| 11 · Beş proje belgesi, grafik mimarisi ve lisans envanteri | Tamam | PR #33'te güncellendi. Bu dosya açık işleri, [mimari](../GRAPHICS_ARCHITECTURE.md) teknik kararları içerir. |
| 12 · Başlatma, model, kalite, kamera, seçim, geçiş, kapasite, satış, eski kayıt, context ve mobil tarayıcı testleri | Kısmi | Bunların prototip kapsamı test edildi. Lisanslı motosiklet yükleme, gerçek 3D yakın plan ve fiziksel Safari açık. |
| 12 · Farklı sahne açısı, üç 3D yakın plan, FPS, poligon, doku, gecikme ve bellek | Kısmi | İki gerçek sahne açısı ve üç açıkça 2D ayrıntı mevcut. Çizim ve kaynak sayacı, doku boyutları ve yerel yükleme gecikmesi ölçüldü. Fiziksel FPS, GPU baytları ve üç motosikletin mesh ölçümleri açık. |
| 12 · v0.17, ayrı dal, aynı PR ve onaysız genişletmeme | Tamam | `feature/motor-empire-v0-17`, [taslak PR #33](https://github.com/gurkanallenxd1-rgb/motor-empire/pull/33). |
| Ek güvenlik · 98 dosya, ID/kasa/renk, ayrı varlıklar, kullanıcıya doğru 2D ve diğer ekranlar | Tamam | SHA-256 manifesti eksik/fazla dosyaları ve içerikleri kontrol eder. İlan, piyasa, bildirim ve satış görselleri değiştirilmedi. |


## Test ve ekran görüntüleri

| Test | Sonuç |
| --- | --- |
| Node.js | 127 başarılı. v0.16.1 ve PR #33 testleri korunuyor. |
| Playwright mobil WebKit | 35 başarılı. |
| Chromium SwiftShader grafik alt kümesi | 6 başarılı. |
| UASTC, iki yükleyici referansı ve kaynak temizliği | Her iki tarayıcıda 32×32, altı mip, iki farklı framebuffer rengi, doku 1→0, geometri 1→0, doku tek dispose, kapanan bekleyen yükte AbortError. |
| Dört kalite profili | Her iki tarayıcıda çözünürlükler farklı. Zemin 128/256/512/1.024, gölge 0/512/1.024/2.048, yansıma şiddeti 0,22/0,50/0,78/1. |

- Gerçek zamanlı 3D garaj · [Varsayılan yön](v017-garage-angle-1.webp) · [Döndürülmüş yön](v017-garage-angle-2.webp)
- Özgün 2D ayrıntılar · [Yamaha MT-25 2024](v017-graphics-yamaha-mt25.webp) · [Kawasaki Z900 2025](v017-graphics-kawasaki-z900.webp) · [KTM 1390 Super Duke R 2024](v017-graphics-ktm-super-duke1390.webp)
