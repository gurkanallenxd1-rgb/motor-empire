# MOTOR EMPIRE v0.17

MOTOR EMPIRE, iPhone Safari ve masaüstü tarayıcılar için Türkçe bir motosiklet işletme oyunudur. HTML, CSS, JavaScript ES modülleri ve Canvas 2D kullanır. Oyun yerelde çalışırken hesap, sunucu API'si veya derleme gerektirmez.

## Yerelde çalıştırma

Git ve Python 3 ile proje kökünden bir HTTP sunucusu başlat.

```sh
git clone https://github.com/gurkanallenxd1-rgb/motor-empire.git
cd motor-empire
python3 -m http.server 8000
```

Tarayıcıda [localhost:8000](http://localhost:8000/) adresini aç. Aynı kaydı kullanmak için aynı URL ve portta çalış. Bir telefonda yerel test yapmak için bilgisayarın yerel ağ adresine bağlan. Tarayıcı depolama ve kilit izinlerini de kontrol et.

## Deneysel 3D garaj

Garaj ekranında **Garaj grafik ayarları → Deneysel 3D Garaj** yolunu kullan. Prototip 10 bölmeli şubelerde çalışır. Diğer şubeler ve WebGL 2 desteklemeyen cihazlar 2D garajı kullanır. Grafik ayarları oyun kaydından bağımsızdır. Mevcut motosiklet görselleri üç hedef varyant dahil stokta gösterilir. Lisanslı 3D motosiklet modelleri henüz pakette bulunmuyor.

Yerel Three.js ve Basis dosyaları statik olarak sunulur. Mimari ve varlık belgeleri [GRAPHICS_ARCHITECTURE.md](GRAPHICS_ARCHITECTURE.md) ve [ASSET_LICENSES.md](ASSET_LICENSES.md) dosyalarındadır.

## Oynama

1. **İlanlar** bölümünde motosiklet seç. Ekspertiz yaptırabilir, pazarlık edebilir ve satın alabilirsin.
2. **Garaj** bölümünde nakliyeyi, servis işlerini ve stoku takip et. Sürükleme ve iki parmakla yakınlaştırma desteklenir.
3. **İşletmeler** üzerinden şube ve personel yönet. Uygun kadro kurulduğunda müdür otomasyonunu açabilirsin.
4. **Finans** bölümünde nakit, masraflar ve satış sonuçlarını incele. Üst menü zili bildirimleri açar.
5. **İlanlar → Piyasa Analizi** yoluyla fiyat geçmişi, alım fırsatları, il karşılaştırması ve ekonomi haberlerine ulaş.

Oyun tarayıcıda `motor-empire.v9` anahtarını kullanarak kaydeder. Önceki sürüm anahtarları saklanır. Test amacıyla canlı sitenin yerel kayıtlarını silmek yerine ayrı bir tarayıcı profili veya yerel adres kullan.

## Test ve görsel denetim

Node.js 24 ve npm ile aşağıdaki komutlar kullanılabilir. Playwright yalnızca test için gerekir.

```sh
node --test --test-isolation=none
node tests/economy-simulation.mjs

test_deps="$(mktemp -d)"
npm install --prefix "$test_deps" playwright
"$test_deps/node_modules/.bin/playwright" install webkit
PLAYWRIGHT_MODULE="$test_deps/node_modules/playwright" node --test --test-isolation=none tests/live-prices.browser.mjs
```

Playwright WebKit, çalıştırıldığı işletim sisteminin tarayıcı bağımlılıklarını gerektirir. Yalnızca görsel denetim için `visual-audit.html?dev=1` adresini aç. Piyasa ekranı görsellerini yeniden üretmek için WebKit çalıştırmadan önce `MARKET_SCREENSHOTS` değişkenini var olan bir çıktı klasörüne ayarla.

## Yayınlama ve proje hafızası

GitHub Pages kullanırken depo ayarlarında **Pages → Deploy from a branch** üzerinden etkin yayın dalını ve `/ (root)` dizinini seç. Bağıl varlık yolları proje alt adresinde çalışır. Tarayıcı önbelleği için HTML ve modül adreslerindeki `?v=` sürümü birlikte güncellenir.

- [AGENTS.md](AGENTS.md) geliştirme kuralları ve modül haritası
- [PROJECT_STATE.md](PROJECT_STATE.md) güncel durum, kurallar, sınırlar ve testler
- [CHANGELOG.md](CHANGELOG.md) sürümler, doğrulamalar ve geçmiş PR'lar
- [ROADMAP.md](ROADMAP.md) sonraki sürümler
- Mobil WebKit görüntüleri · [Özet](docs/v0161-piyasa-ozet.webp) · [Fırsatlar](docs/v0161-piyasa-firsatlar.webp) · [Şehirler](docs/v0161-piyasa-sehirler.webp) · [Ekonomi](docs/v0161-piyasa-ekonomi.webp)

## v0.17 prototip ekran görüntüleri

- 390×844 mobil ekran emülasyonu, yazılımsal WebGL · [Garaj, varsayılan açı](docs/v017-garage-angle-1.webp) · [Garaj, çevrilmiş açı](docs/v017-garage-angle-2.webp)
- Mevcut 2D varlıklarla açılan ayrıntılar · [Yamaha MT-25](docs/v017-graphics-yamaha-mt25.webp) · [Kawasaki Z900](docs/v017-graphics-kawasaki-z900.webp) · [KTM 1390 Super Duke R](docs/v017-graphics-ktm-super-duke1390.webp)
