# v0.3 mobil doğrulama

Testler Chromium üzerinde iPhone 13 dokunmatik profili ve 3× piksel oranıyla çalıştırıldı. Gerçek iPhone Safari testi yapılmadı.

| Görünüm genişliği | v0.2 garaj alanı | v0.3 garaj alanı | v0.3 tuval tamponu |
| --- | --- | --- | --- |
| 320 CSS px | ≈ %49,5 | ≈ %86,9 | 870 × 580 px |
| 390 CSS px | ≈ %49,7 | ≈ %86,9 | 1080 × 720 px |

Garaj alanı, arka plan görselindeki atölye dış sınırının altı köşeli bir maskeyle yaklaşık olarak izlenmesi ve görüntü alanına kırpılmış maskenin piksel sayısının görünür tuval piksel sayısına bölünmesiyle ölçüldü. Dış gölgeler, motosikletler ve kontroller ölçüme eklenmedi. Mobil varsayılan kadraj, iş alanını büyütmek için sahnenin en dış köşelerini kırpar. Uzaklaştırma düğmesi kenarları geri getirir.

- 320 ve 390 pikselde yatay taşma görülmedi.
- İki parmakla yakınlaştırma, sürükleme, kamera düğmeleri, ortalama ve motosiklet yakın planı çalıştı.
- v0.2 oyunu tarafından oluşturulan aktif tamir kaydı, v0.3’te aynı `localStorage` anahtarından eksiksiz okundu. v0.1 örnek kaydı aynı kayıt okuyucusunda doğrulandı.
- Satın alma, ekspertiz, tamir, satış teklifi kabulü ve yeniden yükleme iki genişlikte geçti.

Karşılaştırmalarda solda v0.2, sağda v0.3 yer alır. İki sürümde de aynı kayıt açılmıştır.

- [390 piksel karşılaştırma](v03-karsilastirma-390.webp)
- [320 piksel karşılaştırma](v03-karsilastirma-320.webp)
- [Motosiklet yakın planı](v03-yakin-plan.webp)
