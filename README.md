# MOTOR EMPIRE v0.12.5

iPhone Safari ve masaüstü tarayıcılar için Türkçe motosiklet işletme oyunu. HTML, CSS, JavaScript ve Canvas kullanır. Harici API, paket kurulumu veya derleme adımı gerektirmez.

## Oynama

1. 75.000 TL ile ikinci el pazarından motosiklet al. Garaj iki motosiklet alır.
2. 450 TL karşılığında ekspertiz yaptır. Arızalı parçalar, fiyatları ve işçilik saatleri garajda görünür.
3. Parça bedelini ödeyip tamiri başlat. Her şubenin tamir sırası günde sekiz saat işler. İşe alınan her usta bu şubeye sekiz saat daha ekler. Teslim gününe ulaşmak için **Günü ilerlet** düğmesini kullan.
4. Tamiri biten motosiklete ilan fiyatı belirle. Sonraki günlerde gelen müşterilerle görüş veya bir teklifi kabul ederek satışı tamamla. Satış geçmişi, alış, ekspertiz ve tamir giderleri düşüldükten sonraki kâr veya zararı gösterir.
5. Her yeni günde pazar ilanları yenilenir ve satış ilanlarının müşteri talebi hesaplanır. İlerleme tarayıcıdaki localStorage ile kaydedilir.

## Çalıştırma

Yerel önizleme için depo dizininde çalıştır.

```sh
python3 -m http.server 8000
```

Tarayıcıda http://localhost:8000/ adresini aç.

GitHub Pages üzerinden yayımlamak için **Settings → Pages → Deploy from a branch** altında yayımlamak istediğin dalı ve `/ (root)` dizinini seç. Uygulama dosyaları proje alt adreslerinde çalışacak şekilde bağıl yollar kullanır.

## Grafikler ve kayıtlar

Atölye ve motosikletlerin model görselleri yerel WebP varlıklarıyla Canvas üzerinde birleştirilir. Kamera tuvali ekran piksel oranına göre ölçeklenir. Hareket azaltma tercihi garaj animasyonlarını durdurur. v0.1–v0.11 kayıtları ilk açılışta v0.12 biçimine aktarılır. Yeni kayıt `motor-empire.v9` anahtarına yazılır. Eski anahtarlar korunur. Aktif tamirlerin teslim günü ve mevcut müşteri tekliflerinin tutarı aktarılır.

Garaj kamerası başlangıçta sahneye ortalanır. Kamera düğmeleri veya sahnede iki parmakla yakınlaştırabilirsin. Mobilde varsayılan yakın kadrajdan uzaklaştırarak garajın tüm kenarlarını görebilirsin. Yakınlaştırdıktan sonra sahne içinde sürükle. Motosiklete dokunarak yakın planı aç. Yerel WebP varlıklarının üretim planı [görsel varlık belgesinde](docs/v03-varlik-plani.md) bulunur.

## İşletme kuralları

- Gün kapanışında her şubeye 250 TL işletme gideri ve çalışan usta başına 750 TL maaş yazılır. Kiralar aynı günün geliri olarak giderlerden önce tahsil edilir.
- Hazır motosiklet 1, 3 veya 7 gün kiralanır. Sözleşme başındaki kondisyonla düzeltilmiş değerin günlük %0,6’sı sabitlenir. Dönüşte her gün için 85 km ve 1 kondisyon puanı işlenir. Kondisyonun alt sınırı %25’tir.
- Garaj seviyeleri 2, 4, 6 ve 10 araç alır. Ardışık yükseltmeler 50.000, 125.000 ve 250.000 TL’dir. Büyük garajda iki liftli atölye sahnesi bölme sayfalarına ayrılır.
- İstanbul’da her ek şube 250.000 TL’ye açılır. Şubeler aynı kasayı ve pazarı kullanır. Garaj, tamir sırası, ustalar ve giderler şube bazında tutulur.
- İsteğe bağlı faizsiz borç için toplam bakiye sınırı 250.000 TL’dir. Zorunlu giderin nakit açığı kadar otomatik borç yazılır ve bu borç bakiyesi sınırı aşabilir. İsteğe bağlı harcamalar yeterli nakit gerektirir.
- Günlük net, o gün kaydedilen nakit gelirlerinden giderleri çıkarır. Borç alma ve ödeme finansman hareketidir. Toplam varlık nakit, motosiklet stoku ve maliyet bedeliyle şube yatırımlarını içerir. Net varlık borcu düşer.

Oyun kurallarını test etmek için `node --test` çalıştır.

GitHub Pages dağıtımında HTML’deki CSS ve giriş modülü adresleri ile tarayıcı modüllerinin tüm içe aktarma adresleri aynı `?v=` sürümünü kullanır. Yeni sürüm yayımlarken bu adresleri birlikte güncelle.

## Model görselleri ve ilanlar

- Katalog 19 markadan 100 model içerir. Yıl aralıkları seçilmiş kasa nesillerini kapsar. Teknik değerler o neslin oyundaki temsilî donanımına aittir. Fiyatlar Türkiye’deki ikinci el örneklerine göre ölçeklenmiş oyun tahminleridir, canlı fiyat verisi veya bütün modeller için piyasa doğrulaması bulunmaz.
- Her yeni gün 30 farklı ilan oluşur. Bunların 8’i ekonomik, 14’ü orta, 6’sı premium, 2’si nadir segmenttedir. İlanlar 10’ar kartlık sayfalara bölünür. Yıl, kilometre, renk, kondisyon ve arızalar üretilir. Boya rengi ayrı alfa maskesinden kaportaya uygulanır. Maske dışındaki parçalar orijinal renklerini korur.
- Kayıtlı motosikletlerin teknik bilgileri model adından okunur. Devam eden günün mevcut ilanları gün kapanışına kadar korunur.
- `assets/models/` içindeki 480 × 400 şeffaf WebP dosyaları bu oyun için OpenAI ImageGen ile oluşturulan model temsilleridir. Üretici fotoğrafı veya resmî teknik referans kullanılmadı. Yıl ve donanım ayrıntıları çizimlerde değişiklik gösterebilir. Temsili oldukları oyun ekranlarında etiketlenir. Yeni 78 model için ImageGen ile üretilmiş 320 × 248 hücreli 13 şeffaf WebP atlası ve karşılık gelen 13 boya maskesi kullanılır. Bu dosyalar üretici fotoğrafı içermez.

### Görsel denetim

[Geliştirici karşılaştırma sayfası](visual-audit.html?dev=1) 22 mevcut çizimi ve yıl bazında onay durumunu gösterir. Doğrulanmış kasa dosyası yoksa oyun aynı modelin v0.5 WebP çizimini veya yeni WebP atlasındaki hücresini kullanır. Boya maskeleri ayrıdır. Model dosyası yüklenemezse yer tutucu gösterilir. Başka bir motosikletin görseli seçilmez. Kasa yılı ve üretici ayrıntıları doğrulanmış dosya kapsamı 0/100’dür. 100 modelin denetim sayfası kaydırıldıkça çizimleri yükler.

Yeni görsel için `sprite-catalog.mjs` içinde model kimliği, doğrulanmış kasa yılı aralığı, yaratıcı, kaynak ve lisans bağlantılarını kaydet. Kullanım izni, türetme ve yeniden dağıtımı kapsamalı. `assets/verified/` içinde sağ ön üç çeyrek açıdan, ön teker sağda, aynı kadrajda en az 960 px genişliğinde şeffaf WebP oluştur. Aynı ölçülerde ayrı WebP maskesinin alfa kanalı yalnızca boyalı kaportayı kapsamalı. Siyah plastik, lastik, jant, egzoz, motor ve metal parçalar maskenin dışında kalmalı. Bir görseli onaylamadan önce far, depo, egzoz, jant, grenaj ve şasiyi tarihli kaynaklarla karşılaştır.

İncelenen örnek kaynaklar arasında [2016 Yamaha MT-25](https://commons.wikimedia.org/wiki/File:2016_Yamaha_MT-25.JPG), [2022 Yamaha MT-09](https://commons.wikimedia.org/wiki/File:2022_Yamaha_MT-09.jpg) ve [Honda CBR250R](https://commons.wikimedia.org/wiki/File:Honda_CBR250R.jpeg) yer alır. Bunlar araştırma referanslarıdır. Ortak kamera ve boya maskesi doğrulanmadığı için paketlenmemiştir.

## Görüşmeler

- Satıcıyla pazarlık, ilandaki doğrudan satın alma seçeneğinin yanında yer alır. Satıcı görüşmesi ilanla birlikte gün sonunda sona erer.
- Satış ilanına müşteriler sonraki günlerde gelebilir. Talep sınıf, istenen fiyat, kilometre, kondisyon ve işletme itibarına göre hesaplanır. Alıcı görüşmesi üç oyun günü sürer.
- Pazarlık yap düğmesi en fazla üç otomatik tur çalıştırır. Alıcı teklifini yükseltebilir, satıcı fiyatını düşürebilir. Karşı taraf sabrı veya fiyat sınırı nedeniyle son fiyatını koruyabilir ya da kalkabilir. Yapılan turlar ve son fiyat kayda yazılır. Sat veya Satın al düğmesi işlemi tamamlar.
- İtibar tamamlanan satışlar ve müşteri deneyimiyle değişir. Finans ekranındaki başarı oranı sonuçlanan alıcı görüşmelerini esas alır. Süresi dolan görüşmeler bu orana girmez.

### v0.7 teknik notlar

- Önceki kayıt nesnesi ayrı anahtarda kalır. Yeni kayda taşınırken desteklenmeyen eski boya renkleri o yılın mevcut paletindeki uygun renge geçirilir. Önceki pazarlık turu, fiyatı ve itibar korunur. Eski günün ilanları ilk gün kapanışında genişler.
- Satış geliri tahsil edilen fiyat, gerçekleşen satış kârı ise satış fiyatı eksi birikmiş alım, ekspertiz ve tamir maliyetidir. Günlük nakit farkı, o gün kasaya yazılan gelir ve giderlerin farkıdır. Kredi hareketleri ayrı tutulur.
- Temiz araç birçok ilanda arızasız olabilir. Ekspertiz varsa arızaları açığa çıkarır, yoksa ücret kaydıyla araç doğrudan satışa hazır olur. Yeni stokta servis katsayısı modele göre belirlenir ve aynı tutar ekspertiz, tamir ve maliyet kaydında kullanılır.
- Renk paletleri kasa yılına göre sınırlandırılmış temsili renk aileleridir. Tüm ülkeler ve donanımlar için birebir fabrika kodu doğrulanmamıştır. Örnek kaynaklar [KTM 2023 renkleri](https://press.ktm.com/news-ktm-updates-its-2023-street-range-with-fresh-new-colorways?id=168537&l=international&menueid=3050), [KTM Türkiye teknik sayfası](https://www.ktm.com/en-tr/models/naked-bike/2023-ktm-390-duke/technical-specifications.html), [Yamaha Tracer teknik broşürü](https://www.yamaha-motor.eu/content/dam/yme/pl/pl/broszury/Sport%20Touring%202023.pdf) ve [Türkiye ikinci el ilan örnekleri](https://www.sahibinden.com/motosiklet-honda/adana/manuel).


### v0.7.1 ilan görünümü

- Marka ve model araması açık, ayrıntılı filtre paneli varsayılan olarak kapalıdır. Marka filtresi model seçeneklerini sınırlar. Arama, sıralama ve tüm filtreler o gün kaydedilmiş ilanlar üzerinde çalışır.
- İlan satırı detay penceresini açar. Doğrudan satın alma ve mevcut satıcı pazarlığı burada başlar. Tahmini kâr, tamir sonrası tahmini değer eksi ilan tutarı, ekspertiz bedeli ve listelenen onarım tahminidir.
- Pazar bir sayfada en çok 10 ilan kurar. WebP yalnızca satır ekrana yaklaştığında yüklenir.
- Kayıt biçimi değişmedi. Satış ve alış işlemleri model adı, yıl, ana renk ve varsa ikinci kaporta rengini aynı kayıtta tutar.
- Uygulamada geliştirici denetim bağlantısını görmek için adresin sonuna `?dev=1` ekle.

### v0.7.1 kasa çizimleri

Sekiz modelde 21 kasa veya renk paketi varyantı eklendi. Yamaha MT-07, MT-09, MT-25 ve R25, Honda CB125F ve PCX 125, Kawasaki Z900 ve KTM Duke 390. `generations.mjs` her seçimin yıl aralığını ve üretici referansını listeler. 2023 Duke 390 için üreticinin turuncu/mavi-gri ve siyah/mat gri renk aileleri iki bağımsız kaporta maskesi kullanır. Motor, teker, egzoz ve sabit malzemeler bu maskelerin dışındadır. Önceden satın alınan veya mevcut ilana kaydedilmiş renk saklanır.

Yeni görseller 360 × 280 şeffaf WebP hücreleridir. Dört gövde atlası ve dört kayıpsız renk maskesi atlası içerir. Kırmızı kanal ana kaportayı, yeşil kanal ikinci kaportayı seçer. Çizimler bu oyun için ImageGen ile üretildi. Üretici fotoğrafı paketlenmedi. Referans bağlantısı, çizimin bütün parçalarının ve fiziksel ölçeğinin üretici tarafından doğrulandığı anlamına gelmez. Oyun, doğrulanmış bir eşleşme yüklenene kadar temsili etiketi gösterir. Diğer 92 modelin önceki modele özel çizimleri korunur.


## v0.8 Hasar, tamir ve ekonomi

- Bakım eksikleri, mekanik sorunlar ve kaza hasarı farklı gruplarda yer alır. `damage.mjs` her arıza için maliyet, işçilik, kondisyon artışı ve varsa kalıcı değer kaybını tanımlar.
- Tamir başlarken parça masrafı kasaya ve motosikletin maliyetine bir kez yazılır. İşçilik tamamlanınca kondisyon artar, aktif arızalar temizlenir, kalıcı geçmiş saklanır. Garaj, işlem öncesi ve sonrası kondisyonu ve değeri gösterir.
- Temiz değer, marka ve model için katalog değerinden, model yılından ve kilometreden hesaplanır. Mevcut değer için kondisyon kaybı, aktif hasar bandı ve kalıcı geçmiş kaybının en büyüğü alınır. Şase, ağır hasar ve pert gibi aynı yapısal gruptaki geçmiş kayıtları en ağır kayıp üzerinden değerlendirilir. Farklı gruplardaki bağımsız kayıplar kalan değer üzerinden birleşir.
- Aktif hasar indirimleri `DAMAGE_DISCOUNTS` içinde ayarlanır. Bakımsız %5–20, hafif hasarlı %10–25, orta hasarlı %20–40, ağır hasarlı %40–60 ve pert geçmişli %50–75. Satıcı aciliyeti mevcut piyasa değerinden bağımsız bir ilan fiyatı çarpanı uygular. Alıcı teklifi tahmini satış değerinden farklı olabilir.
- Eski ilan fiyatları, pazarlık durumu, nakit ve maliyetler korunur. Önceki sürümlerde hazır, ilandaki veya kiradaki motosikletlerde kalan eski arızalar tamamlanmış kabul edilir. Bunun için geçmişe dönük kondisyon artışı veya masraf işlenmez. Devam eden ücretli işler önceki süreleriyle biter.


## v0.9 Türkiye motosiklet pazarı

- İstanbul'da günde 30, diğer 80 ilde altışar ilan yenilenir. Pazar şehir filtresini ve Tüm Türkiye görünümünü paylaşır. Yenileme yalnızca oyun günü ilerlediğinde gerçekleşir.
- İlan fiyatı, hasarlı piyasa değeri ve satıcı aciliyeti üzerinden hesaplanır. Kategori talebi, yerel ilan stoğu ve günlük şehir döngüsü fiyatı en fazla yüzde 5 düşürebilir veya artırabilir.
- Mevcut şubeler İstanbul'da olduğu için İstanbul içi teslimat ücretsiz ve anındadır. Diğer iller için il merkezleri arasındaki kuş uçuşu mesafe 1,25 ile çarpılarak yaklaşık yol mesafesi bulunur. Nakliye 350 TL + km başına 2,40 TL olarak hesaplanır ve 350 ile 900 km eşiklerine göre 1–3 oyun günü sürer.
- Nakliye alım gününde ayrı gider olarak kaydedilir, araç maliyetine eklenir ve teslimata kadar satın alan şubenin bir garaj bölmesini ayırır. Tahmini net kâr ekspertiz, tamir ve nakliyeyi içerir.
- Eski günün ilanları ve açık satıcı görüşmeleri korunur. İstanbul dışı ilanlar ilk açılışta eklenir.

## v0.10 Finans merkezi

- Nakit akışı alış, yatırım ve finansman dahil gerçek kasa hareketlerini gösterir. Gerçekleşen net kâr satış hasılatı, satışların toplam araç maliyeti, kiralama gelirleri, işletme giderleri ve varsa faiz gideri üzerinden hesaplanır.
- Nakliye ve başlayan tamirler önceden ödenir. Bekleyen maliyet kartlarında ödenen tutar ile henüz başlamamış, ekspertizi tamamlanan tamirlerin tahmini ayrı gösterilir.
- Net servet kapanış bakiyeleri v0.10 ile kaydedilmeye başlar. Eski nakit bakiyeleri yalnızca işlem defteri açılış bakiyesiyle uzlaşıyorsa hesaplanır. Kayıt olmayan grafik noktaları boş kalır.
- Mevcut kredi faizsiz ve taksit planı olmadan işler. Toplam geri ödeme kartı geçmiş anapara ve faiz ödemeleri ile kalan anaparayı birlikte gösterir. Kalan anapara istenen tutarda ödenebilir.

## v0.11 Otomatik zaman

- Bir oyun saati 2,5 saniye, bir oyun günü 60 saniye sürer. Üstteki zaman çubuğu saati, kalan süreyi ve duraklatma durumunu gösterir. Gün kapanışı kira, ücretler, işletme giderleri, alıcı ziyaretleri ve ilan yenilemesini işler.
- Arka planda ve tarayıcı kapalıyken geçen süre gerçek zaman damgasıyla hesaplanır. Dönüşte en fazla 60 oyun günü işlenir. Duraklatılmış süre ilerlemez. Cihaz saati geri alınırsa zaman son kayıt damgasının aşılmasını bekler.
- Aynı kayda erişen sekmeler Web Locks veya IndexedDB yazma kilidi üzerinden ilerler. Her işlem en güncel kaydı okur ve finans kapanışı, zaman damgasıyla aynı kayda yazılır.
- Tamir işçiliği oyun saatiyle ilerler. Mevcut usta başına günlük 8 saatlik kapasite korunur. Yeni nakliyeler satın alındıkları saatten itibaren 1–3 oyun günü sürer ve ayrılmış bölmeyi korur. Önceki sürümden gelen işlerin söz verilen teslim günü korunur.
- Açılmış alıcı görüşmeleri, pazarlığa başlanmış teklifler ve açık satıcı görüşmeleri gün değişiminden etkilenmez. Satış oyuncunun onayıyla gerçekleşir.

## v0.12 Ekspertiz, hasar geçmişi ve sigorta

- Satın alma öncesi ekspertiz paketleri 600, 1.350 ve 2.400 TL tutar; 2, 4 ve 6 oyun saati sürer. Sonuçlar pazarlıkta kullanılabilir. Ödenen ücret satın alımda stok maliyetine taşınır, alımdan vazgeçildiğinde giderleşir. Tam paket tamamlanmışsa garajda tekrar ekspertiz ücreti alınmaz.
- İlan beyanı ve gerçek durum ayrı tutulur. Hasar kayıtlarında tarih, bilinen tutar, kaynak ve onarım yöntemi bulunur. Önceki sürümden gelen eksik bilgiler bilinmiyor olarak gösterilir.
- Trafik sigortası üçüncü kişi zararını kapsar. Trafiğe çıkmadan önce alınır ve park halindeki araçlar için prim kesilmez. Kasko ayrı bir poliçedir ve poliçe başladıktan sonraki çarpışmalarda muafiyet ve limit uygulanır. Kasko onarımında servis bedeli başta ödenir, dört oyun saati sonraki onayda kapsam bedeli iade edilir ve net masraf stok maliyetinde kalır.
- Özel servis ve yetkili servis farklı ücret, süre ve kalıcı değer etkilerine sahiptir. Yeni kaza yalnızca kiralamada veya onaylanan test sürüşünde ortaya çıkabilir.
- Açık hasar beyanı müşteri memnuniyetini etkiler. Hasarı gizleyen satışlarda şikâyet, tazminat veya iade oluşabilir. İade garaj doluyken teslim kuyruğuna alınır.

## v0.12.1 Düzeltmeleri

- Ücretli ekspertizlerin bağlı ilanı, günlük pazardan kalktıktan sonra arşivden tekrar açılabilir. Açık satıcı görüşmeleri kullanılmış pazarlık haklarıyla korunur. Tamamlanan ekspertizin doğruladığı bulgular görüşme ekranında görünür.
- Gizli hasar şikâyetleri satıştan sonra kaydedilen oyun saatinde işlenir. İade veya tazminat bildirimi, oyuncu okuyana kadar kalır. Garajda yer bulunmayan iadeler mevcut teslim kuyruğunu kullanır.
- v0.12 ile aynı kayıt anahtarı sürdürülür. Bu sürümden önce arşivlenmiş ve araç ayrıntısı saklanmamış raporlar okunabilir, ancak orijinal ilan yeniden açılamaz.

## v0.12.2 Ekspertiz fiyat analizi

- İlan ve pazarlık aynı değerlemeyi kullanır. Rapor öncesi fiyat, ilan beyanından hesaplanır. Sonraki değerlemeye yalnızca beyan edilen ve seçilen paketlerin doğruladığı bilgiler girer.
- Bulgu başına TL ve yüzde kaybı, hasarsız piyasa değerine göre verilir. Aynı değeri etkileyen bulguların marjinal katkıları paylaştırılır. Tamir gideri yalnızca toplam maliyete girer.
- Teklif avantajı güncel piyasa tahminine, satış kâr yüzdesi ise ekspertiz, nakliye ve tamir dahil toplam maliyete göre hesaplanır. Rapor, satıcının mevcut fiyatını değiştirmez.

## v0.12.3 Canlı fiyat analizi

- İlk ekspertiz öncesindeki piyasa tahmini ilanla birlikte kaydedilir. Eski raporlar için ilan beyanından yeniden oluşturulur. Fark, TL ve ekspertiz öncesi değere oran olarak görüşmede gösterilir.
- Satıcının verdiği indirim ile taslak teklif kabul edilirse oluşacak indirim ayrı hesaplanır. Değer kaybı bu indirimlere eklenmez.
- Fiyat alanı ve kaydırıcı, teklif göndermeden tahmini maliyeti, piyasa avantajını ve satış kârını günceller. Geçerli teklif gönderilirse mevcut pazarlık kuralları bir tur uygular. Kabul edilen teklif ayrı bir satın alma onayı gerektirir.

Mobil DOM regresyonlarını Playwright WebKit ile çalıştır:

```sh
npm install --no-save --package-lock=false playwright
npx playwright install webkit
node --test tests/live-prices.browser.mjs
```

## v0.12.4 Mobil pazarlık görünümü

İlan ve görüşme aynı motosiklet ve fiyat özetini kullanır. Sayıyla girilen teklifin yanında, satıcının güncel fiyatından 5.000, 10.000 veya 20.000 TL düşüren kısayollar bulunur. Kısayollar sadece taslağı değiştirir. Kâr, maliyet ve alım farkı anında görünür. Formüller ve kayıt anahtarı değişmedi.

## v0.12.5 Pazarlık kontrolleri

Kaydırıcı, sayı alanı ve üç indirim kısayolu aynı taslağı düzenler. Satıcının verdiği indirim ile talep edilen ek indirim ayrı gösterilir. Pazarlık hakkı bittiğinde önizleme, satın alma düğmesinin kullandığı satıcı fiyatına döner.
