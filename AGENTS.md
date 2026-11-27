# MOTOR EMPIRE geliştirme kılavuzu

## Göreve başlarken

Her görevden önce bu dosyayı, [ROADMAP.md](ROADMAP.md) ve [PROJECT_STATE.md](PROJECT_STATE.md) dosyalarını oku. İlgili sürümü [CHANGELOG.md](CHANGELOG.md) ve Git geçmişinden doğrula. Kurulum için [README.md](README.md) dosyasını kullan. Her sürümde değişen durumu, doğrulanan testleri ve bilinen eksikleri ilgili proje hafızası dosyalarına yaz.

## Mimari ve dosyalar

Oyun statik HTML, CSS, standart JavaScript ES modülleri ve varsayılan Canvas 2D garaj kullanır. İsteğe bağlı WebGL 2 prototipi yerel Three.js ile çalışır. Oyun çalışırken sunucu API'si, derleme adımı veya npm bağımlılığı gerekmez.

| Dosya veya dizin | Sorumluluk |
| --- | --- |
| `index.html`, `style.css`, `app.mjs` | Oyun kabuğu, sayfa geçişleri, eylem bağlantıları ve Türkçe arayüz |
| `game.mjs`, `clock.mjs`, `time-store.mjs` | İşlem kuralları, doğrulama, sürüm geçişi, Web Locks veya IndexedDB kilidi ve localStorage |
| `economy.mjs`, `provinces.mjs`, `valuation.mjs` | Deterministik piyasa, 81 il, nakliye ve fiyat tahminleri |
| `trade.mjs`, `characters.mjs`, `damage.mjs`, `risk.mjs` | Pazarlık, müşteri profilleri, hasar, ekspertiz ve sigorta |
| `business.mjs`, `automation.mjs`, `finance.mjs` | Şube, personel, otomasyon ve defter kuralları |
| `market-view.mjs`, `finance-view.mjs`, `notification-view.mjs`, `notifications.mjs` | Ekran gösterimleri ve kayıtlı bildirimler |
| `art.mjs`, `garage-layout.mjs`, `garage-scene.mjs`, `sprite.mjs`, `bikes.mjs`, `catalog-data.mjs` | İzometrik sahne, kamera, yerleşim, katalog ve model görselleri |
| `assets/`, `docs/`, `visual-audit.html` | Yerel WebP varlıkları, görsel belgeler ve geliştirici görsel denetimi |
| `*.test.mjs`, `tests/` | Node.js kuralları, Playwright WebKit ve 30/90/365 günlük simülasyon |

## Geliştirme ve uyumluluk

- Kural hesaplarını modüllerde tut. Ekran, mevcut tahminleri ve kayıtları okur. Filtre, grafik ve sekme etkileşimleri oyun işlemi yaratmaz.
- Yeni metinler Türkçe, parasal tutarlar `tr-TR` biçiminde olmalı. Kullanıcı verisini DOM'a `textContent` ile yaz. Proje alt adresleri için bağıl modül ve varlık yollarını kullan.
- Test için repo kökünde `node --test --test-isolation=none`, mobil WebKit için `node --test --test-isolation=none tests/live-prices.browser.mjs` çalıştır. Playwright kurulumu ve `PLAYWRIGHT_MODULE` örneği README'dedir. Ekonomi kontrolü `node tests/economy-simulation.mjs`.
- Safari'de 320×568, 390×844 ve 844×390 boyutlarını, dokunmayı, yatay taşmayı ve modal geçişlerini kontrol et. Canvas çizimini gerektiğinde yenile, WebP varlıklarını yerel tut ve iOS güvenli alanlarını koru. Playwright emülasyonunu fiziksel iPhone testi olarak raporlama.
- GitHub Pages statik dosyaları dalın kökünden sunar. Yayın dalını depo ayarlarından doğrula. Sürümde HTML ve ES modül yollarındaki `?v=` sözleşmesini birlikte güncelle.
- Güncel anahtar `motor-empire.v9`. Önceki kayıt anahtarları ve yükseltme yolları korunur. Taşıma işlemini yeniden yükleme ve çevrimdışı ilerlemeyle test et. Günlük piyasa, ödeme ve bildirim işlemleri kilit içinde güncellenir. Belgeleme sırasında kayıt şemasına dokunma.

## Değişiklik sınırları

Bir görev açıkça bu kuralları hedeflemiyorsa şube kapasitesini ve maliyetini, para ve mevcut stok edinim maliyetlerini, teklifleri, pazarlık turunu, nakliye rezervasyonunu, deterministik piyasa formüllerini, müdür limitlerini, bildirim kimliklerini ve Yusuf Belge'nin sabit fiyatını koru. Oyun verisine yapay geçmiş ekleme. Kayıtlardaki zaman akışı, anlık ve çevrimdışı ilerlemede aynı işlemi yalnızca bir kez uygular.

## Grafik koruma kuralları

- Mevcut motosiklet ID'leri, marka, model, kasa yılı, renkler ve 2D görseller korunur. İlan, piyasa analizi, bildirim ve satış görselleri aynı kaynaklardan gelir.
- 3D dosyaları `assets/3d/` altında ve eşleştirmeleri `graphics/registry.mjs` içinde bağımsız tutulur. Eksik veya hatalı 3D modelin yerine aynı motosikletin özgün 2D görseli kullanılır.
- 2D varsayılan açıktır. Kaynak veya WebGL hatasında 2D garaj çalışmaya devam eder. Grafik ayarları oyun kaydından ayrıdır.
- Katalog ve görsel dosyalarını temel envanterle otomatik karşılaştır. Varlık lisanslarını [ASSET_LICENSES.md](ASSET_LICENSES.md) dosyasına belgele. Mimari için [GRAPHICS_ARCHITECTURE.md](GRAPHICS_ARCHITECTURE.md) dosyasını oku.
- [v0.17 gereksinim denetimi](docs/v017-audit.md) doğrulanan özellikleri ve açık işleri listeler. Performans karşılaştırmalarında tarayıcı, donanım, profil ve ölçüm yöntemini kaydet. Fiziksel iPhone sonucu diye emülasyon ölçümü kullanma.
- Kamera ve dokunma değişikliklerini gerçek WebKit emülasyonu ile hem dikey hem yatay dene. Kamera kesit ve etkileşim kurallarını [grafik mimarisinde](GRAPHICS_ARCHITECTURE.md#kamera-ve-dokunma) sürümle.
- İlk prototip 10 bölme ve üç hedef motosikletle sınırlı. Katalog veya garaj seviyelerini genişletmeden önce kullanıcı onayı al. PR'ı otomatik birleştirme.

## Git ve teslim

Güncel `main` üzerinden ayrı bir `feature/` veya `fix/` dalı aç. Odaklı commit oluştur, testi ve sınırlarını PR'da raporla ve ilgili proje belgelerini aynı PR'a ekle. `main` dalına doğrudan yazmak yerine PR kullan. Şifre, erişim belirteci, API anahtarı, kişisel hesap bilgisi veya tarayıcı kaydı commit etme. Proje içi kaynak ve geçmiş için GitHub deposunu kullan.

Açık PR üzerinde devam edilmesi istenirse aynı dalı kullan. Çalışmayı geri dönülebilir commit’lere ayır ve doğrulanmamış bulguları proje durumunda açık iş olarak kaydet.
