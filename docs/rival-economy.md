# Rakip ekonomisi ve şirket kimliği

## Günlük işlem sırası

`game.mjs` mevcut günlük kapanışta `advanceCompetition` çağırır. `time-store.mjs` tüm kayıt işlemini Web Locks veya IndexedDB üzerinden seri hale getirir. Rekabet dünyası işlenen günü saklar ve aynı günü yeniden işlemez. 60 günlük çevrimdışı sınır korunur.

Rakipler önce var olan stokla nakliye, ekspertiz, onarım, kiralama ve satış işlemlerini yürütür. Sahibin ve kadronun günlük iş yükü sınırlıdır. Her motosikletin tek kimliği, ayrılmış bölmesi, mevcut durumu ve teslim günü vardır. Satılan stok kasaya tahsilat yazıldıktan sonra listeden çıkar. Sonra gider, borç ve varsa tasfiye işlenir. Firma iş yüküne göre personel ve şube kararı alır. Yeni alım için boş bölme, hazırlık kuyruğu, işletme rezervi, karşılanabilir toplam maliyet ve beklenen satış değeri kontrol edilir. Bir günde birden fazla işlem oluşabilir.

Rakip ve oyuncu fiyatları aynı il, dönem, model ve kasa yılı piyasa referansını kullanır. Maaş, şube seviyesi fiyatı, kapasite, nakliye ve günlük gider aynı tablolardan gelir. Rakip tedariki ayrı modellenir ve oyuncunun mevcut ilanlarını tüketmez. Oyuncu kredi, pazarlık ve saatlik personel kuyruğu kurallarını korur. Rakip finansmanında teminat, günlük faiz, nakit rezervine bağlı anapara ve gerekirse yeniden yapılandırma kullanılır. Tedarik tarifesi, ekspertiz ve servis süreleri rakiplerde günlük ve toplulaştırılmıştır.

## Bilanço ve şirket devralmaları

Gün içinde her nakit hareketi `post` üzerinden kasa mutabakatına yazılır. Satış kârında gerçek stok maliyeti kullanılır. Kredi anaparası ve yatırım cirolara girmez. Özsermaye, kasa + piyasa stok değeri + şube yatırımları − borçtur. Girişteki kurgusal sermaye açılış bakiyesinde yer alır. Rakip sermayesi oyuncu servetine göre ayarlanmaz.

Rakipler yalnızca devralmaya açık rakip şirketlere teklif verebilir. Teklif, net varlık, kârlılık, borç, sektör uyumu, itibar ve büyüme verilerinden türetilir. Alıcının nakit rezervi, kaldıraç limiti ve son devralma tarihi kontrol edilir. Ödeme ve işlem maliyeti düşülür. Hedefin kasası, borcu, şubeleri, roller ve gerçek stok başka kopya oluşmadan alıcıya girer. Stok ID’leri korunur ve devralınan şubelerin ID’leri alıcının şirket alanına eşlenir. Hedefin tarihçesi `rivalTakeovers` arşivinde kalır. Oyuncu devralmaları kendi `takeovers` arşivinde kalır. Rakiplerin kararları oyuncunun şirketini kapsamaz.

## Marka kimliği ve kayıt

`rival-identity.mjs` kurgusal marka kökleri, sektör adları ve renklerden kimlik üretir. Türkçe büyük/küçük harf, aksan, boşluk, kısa çizgi gibi farklar karşılaştırmada normalize edilir. İlk ekipte marka kökleri eşsizdir. Sonraki nesiller marka köklerini değişik şirket tanımlarıyla birleştirir. Bu kontrol bir marka sicili araştırması değildir.

`competition.identityVersion` işareti olmayan kayıtta yalnızca aktif şirketlere yeni isim ve CSS logo atanır. Şirket ID’si, önceki adı, oyuncu verileri, finans arşivi, haber metinleri ve tarihsel devralma kayıtları korunur. Kimlik renkleri ve şekli kayda yazılır.

Günlük performans satırı en fazla 365 gün saklanır. Yerel geçmiş 30 gün, görünür işlem özeti 12 kayıt, haberler 45 olayla sınırlıdır. Grafik, söz konusu göstergeyi o tarihte gerçekten kaydeden satırları kullanır. Eski rakiplerde geçmiş kasa ve şube sayısı boş kalır. Önceki alım adedi bilinmiyorsa ekranda yalnızca yeni ölçüm gösterilir. Finans serilerinde oyuncu nakdi, ciro ve kâr mevcut defter ve kapanıştan gelir.
