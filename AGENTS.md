# MOTOR EMPIRE geliştirme kılavuzu

## Göreve başlarken

Her görevden önce bu dosyayı, [ROADMAP.md](ROADMAP.md) ve [PROJECT_STATE.md](PROJECT_STATE.md) dosyalarını oku. İlgili sürümü [CHANGELOG.md](CHANGELOG.md) ve Git geçmişinden doğrula. Kurulum için [README.md](README.md) dosyasını kullan. Her sürümde değişen durumu, doğrulanan testleri ve bilinen eksikleri ilgili proje hafızası dosyalarına yaz.

## Mimari ve dosyalar

Oyun statik HTML, CSS, standart JavaScript ES modülleri ve Canvas 2D kullanır. Oyun çalışırken sunucu API'si, derleme adımı veya npm bağımlılığı gerekmez.

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

## Git ve teslim

Güncel `main` üzerinden ayrı bir `feature/` veya `fix/` dalı aç. Odaklı commit oluştur, testi ve sınırlarını PR'da raporla ve ilgili proje belgelerini aynı PR'a ekle. `main` dalına doğrudan yazmak yerine PR kullan. Şifre, erişim belirteci, API anahtarı, kişisel hesap bilgisi veya tarayıcı kaydı commit etme. Proje içi kaynak ve geçmiş için GitHub deposunu kullan.
