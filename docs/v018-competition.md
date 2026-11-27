# v0.18 rekabet doğrulaması

## Akış ve kurallar

Oyun başında 50 özgün kurgusal şirket 10 stratejiye dağılır. Şubeler mevcut beş kapasite kademesini ve 81 il altyapısını kullanır. Rakiplerin alımları v0.16 fiyat endekslerine bağlı ayrı toptan tedarik akışında stok ve kasa hareketi yaratır. Oyuncu pazarı, açık ilanlar ve Yusuf Belge bu akıştan etkilenmez. Hazırlık sırası nakliye, ekspertiz ve gerektiğinde ücretli tamirdir. Satış stoğu tüketir. Kira günlük ve seri başına en fazla altı gündür. Motosiklet kilometresi ve kondisyonu kira sonrası değişir.

Rakip fiyatı model, kasa, kilometre, kondisyon, bölge, talep, stokta kalma süresi, alış ve hazırlık maliyeti, hedef marj ve önceki günün rakip fiyat gözlemlerine dayanır. İstenen perakende fiyatı model değerinin yaklaşık %74–113 aralığıyla sınırlıdır. Kredi, anapara, faiz, ücret, şube gideri, yükseltme ve tasfiye ayrı hareketlerdir. Şirket değerinde nakit, stok, şube yatırımı ve borç kullanılır. İflasta varlıklar tahsilata dönüşür, tahsilat borca öncelik verir ve kalan bakiye arşivlenir.

Yeni müşteri ziyaretlerinin en fazla bir bölümünde gerçek rakip stoku karşılaştırılır. Dönüş müşterileri ile tek şubeli ve altıdan az satış kaydı olan başlangıç işletmesi korunur. Açık pazarlıklar yerinde kalır. Rekabet Merkezi fiyat, kondisyon, konum veya güven/hizmet etkisine dayanan son tercihleri açıklar.

Devralmanın açık ve güncel bir tekliften sonra ayrıca onaylanması gerekir. Brüt bedel ve işlem gideri kasadan ödenir. Alınan kasa, devralınan borç, stok, çalışan ve şube aynı kayıt işleminde aktarılır. Şirket aktif listeden çıkar. Şirket tutarı ve açılış kasası nakit akışına girer, işletme kârına girmez. Yeni rakipler en erken 14 günde bir oluşur. Duyurular en fazla dört günde bir bildirim merkezine gider. Onaylanan devralma ayrıca bildirim üretir.

## Simülasyon

`node tests/rival-simulation.mjs` sabit girdilerle 30, 90, 365 ve 1.000 gün çalıştırır. Piyasa v0.16 günlük 81 il arzı ve makro endeksleriyle yenilenir. Günlük süre yalnız rakip motorunu kapsar. Node 24 masaüstü yürütme ortamıdır. Boyut, sıkıştırılmamış rekabet verisi ve UTF-8 baytıdır. Ortalama net kâr dönem boyunca biriken tutarın son gündeki aktif şirketlere göre ortalamasıdır. Pazar payı son 30 gün teslim edilen satış adedine göre ölçülür.

| Gün | Aktif / yeni / iflas | Aktif il | Ortalama değer | Ortalama birikimli net kâr | Satış adedi | Satış + kira cirosu |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 30 | 51 / 1 / 0 | 51 | 2.040.327 TL | 33.270 TL | 338 | 55.014.006 TL |
| 90 | 52 / 2 / 0 | 52 | 2.304.123 TL | 284.703 TL | 1.245 | 229.733.354 TL |
| 365 | 55 / 7 / 2 | 61 | 3.538.479 TL | 1.390.813 TL | 5.943 | 1.408.524.780 TL |
| 1.000 | 63 / 19 / 6 | 77 | 9.763.891 TL | 7.584.045 TL | 20.348 | 5.832.967.163 TL |

| Gün | En yüksek / ortanca pazar payı | İlan / güncel değer aralığı | Kayıt baytı | Günlük ortalama / p95 |
| ---: | --- | --- | ---: | --- |
| 30 | %5,33 / %1,78 | 0,833–0,992 | 153.258 | 0,64 / 1,06 ms |
| 90 | %6,52 / %1,52 | 0,760–1,025 | 233.218 | 0,66 / 1,02 ms |
| 365 | %3,78 / %1,32 | 0,751–1,047 | 627.272 | 0,61 / 0,88 ms |
| 1.000 | %2,99 / %1,90 | 0,751–1,094 | 800.714 | 0,64 / 0,84 ms |

Her gün kasa açılış + tahsilat − ödeme ile eşleşti. Bakiyeler negatife düşmedi, borç ve varlık hesabı tutarlı kaldı, aynı motosiklet iki kez satılmadı ve şube kapasitesi aşılmadı. Bu deterministik senaryoda en büyük pay %6,52'yi geçmedi. Bu ölçüm il bazında tek rakibin bulunduğu küçük pazarları veya tüm olası oyuncu stratejilerini kapsamaz.

Başlangıç oyuncusu rakip oluşunca 75.000 TL ve mevcut varlıklarını korur. Boşta kalan şube, mevcut 250 TL günlük giderle, 30 gün sonunda 67.500 TL ve 90 gün sonunda 52.500 TL tuttu. Bir yıllık işlem yapılmayan senaryoda mevcut işletme gideri 16.250 TL borca yol açtı. Ayrıca `node tests/economy-simulation.mjs` kurulu otomasyonla 365 günde 122 satış, 4.500 TL en düşük satış marjı ve 0 TL defter farkı kaydetti. Bu ikinci senaryo 750.000 TL ile kurulan işletmeyi ölçer.

## Testler ve ekranlar

- 138 Node.js testi, 39 mobil Playwright WebKit testi ve 7 Chromium grafik testi geçti. Önceki 173 senaryo korunur.
- Fiziksel iPhone testi v0.18 için yapılmadı. WebKit emülasyonu 390 × 844, 320 × 568 ve 844 × 390 kullanır.
- Gerçek zaman deposu akışında iki istemci 60 günlük sınırı birlikte aşamadı ve aynı devralmayı iki kez uygulayamadı. Kasa, fiyat sınırı, kapasite, koşullu iflas, oyun kaydı migrasyonu ve 98 katalog/2D dosyası otomatik denetlendi.
- [Özet](v018/summary.webp) · [Rakipler](v018/rivals.webp) · [Şehir sıralaması](v018/ranks.webp) · [Satın almalar](v018/acquisitions.webp)

## Açık işler

Rakiplerin toptan tedariki ve tasfiye alıcıları oyun içi karşı taraflardır. Oyuncunun ilan pazarında canlı açık artırma, rakipler arası satın alma ve tasfiye ihalesi yoktur. Şirket kredi ve yeniden yapılandırma simülasyonu basit faiz ve nakit akışına dayanır. Rakip çalışanlar rol sayılarıyla temsil edilir ve devralmada oyuncunun gerçek personel kayıtlarına dönüşür. Gerçek 3D motosikletler, tüm garajların 3D dönüşümü ve görsel hasar ertelendi.
