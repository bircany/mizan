# Faz 5 — yerel kabul testi

Son güncelleme: 10 Eylül 2026. Canlıya dağıtım yapılmadı; gerçek ödeme/WhatsApp gönderimi yapılmadı.

## Başlatma

Proje klasöründe:

```sh
npm run local:migrate
npm run local:seed
npm run local:dev
```

Panel: http://127.0.0.1:3000/panel/giris

| Hesap | E-posta | Şifre |
| --- | --- | --- |
| Yönetici | admin@mizan.local | Mizan-Yerel-Test-2026! |
| Saha | saha@mizan.local | Mizan-Yerel-Test-2026! |

Bu hesaplar yalnız yerel deneme içindir, canlıya taşınmamalıdır. Gerçek bağışçı bilgisi kullanmayın. Sunucu yeniden başladığında oturum anahtarı yenilenir; tekrar giriş yapın. Aynı anda başka bir 3000 portlu sunucu çalıştırmayın; test adresinin terminaldeki adresle eşleştiğini kontrol edin.

Yerel PostgreSQL: `127.0.0.1:55440/mizan_acceptance_local`; veri klasörü `.local/mizan-postgres`. Başka projelerin 5432 portundaki veritabanına dokunulmaz. Migration aracı uygulamanın `.env` bağlantılarını okumaz; hedefi sabittir. 45 SQL dosyası hash kaydıyla uygulandı; tekrar çalıştırmak mevcut verileri silmez. PostgreSQL 17+ (`initdb`, `pg_ctl`, `psql`) ve Node/npm gereklidir.

`storage.buckets` burada yalnız metadata tablosudur, çalışan Supabase Storage değildir. İki cron migration'ının SQL fonksiyonları kurulmuştur, zamanlayıcıları kurulmamıştır. Bunlar uygulandıkları yerel biçimiyle değerlendirilmelidir; canlı migration geçmişi yerine kullanılamaz.

## Test sırası

| # | Yapılacak işlem | Beklenen sonuç |
| --- | --- | --- |
| 1 | Yöneticiyle giriş yapın; Bağış Yönetimi → Yeni bağış kampanyası. | Form açılır. |
| 2 | Başlık `TEST Kurban`, kategori Kurban, TRY; sabit fiyat 2.000 TL, hisse, toplam 100. | Fiyat/adet alanları doğrulanır. |
| 3 | Videolu → Standart video, grup büyüklüğü 6; İleri. | **3. adımda kaydetmez**, 4. adımda son kontrol açılır. |
| 4 | Yayınla; 102 hisse önerisini önce iptal edin, sonra onaylayın. | İptalde kayıt oluşmaz; onayda aktif kampanya ve 102 kapasite oluşur. |
| 5 | Ayrı kampanyayı Taslak kaydet ile kaydedin. | Yalnız açık taslak işlemi taslak oluşturur. |
| 6 | `+ Bağış kaydı`: aktif kampanya, 3 hisse, alınan 5.500 TL. | Beklenen 6.000 TL; **500 TL eksik, kayıt yapılamaz**. |
| 7 | Ad soyad, `05551234567`, tarih; ödeme 6.000 TL, video iletişim onayı. Dekont ve not boş kalsın; kaydet. | Tek ödeme, üç hisse, toplam 6.000 TL. Dekontsuz kayıt mümkündür. |
| 8 | Yeni kayıtta aynı telefonu girip alandan çıkın. | Önceki isim otomatik gelir; değiştirilebilir. TR varsayılan; telefon `+905551234567` biçiminde saklanır. |
| 9 | WhatsApp farklı seçeneğini açıp farklı numara yazın; kapatın. | Ayrı numara isteğe bağlıdır; varsayılan telefonla aynıdır. |
| 10 | 3 hisse için 6.500 TL girin. | Fazla ödeme farkı ve açık onay gerekir; 5.500 TL hiçbir şekilde kesinleştirilemez. |
| 11 | Kaydet düğmesine hızlıca iki kez basın. | Tek bağış oluşur. Başarılı ekranda tekrar ödeme yaratılmaz. |
| 12 | Ayrı bir serbest tutarlı/videosuz kampanya açıp manuel bağış ekleyin. | Hisse fiyatına ihtiyaç olmadan tutarlı bağış kaydı oluşturulur. |
| 13 | Video Teslimat → kampanya/kategori/başlık/grup/tarih filtrelerini deneyin. | Sonuçlar birlikte filtrelenir; Temizle sıfırlar. Tarih, grubun son hareketine göre ve Türkiye saatindedir. |
| 14 | Tablo/Kartlar seçip Uygula; sekme değiştirin. | Görünüm ve filtreler URL'de korunur. Hissedar listesi açılır. |
| 15 | Saha hesabıyla giriş yapın. | Video ekranına girer; mesaj yönetimi/gönderim düğmeleri yoktur, telefonlar maskelidir. Bağış yönetimine yetkisi yoktur. |
| 16 | Medya alanına gerçek JPG/PNG/WebP ve uzantısı değiştirilmiş metin dosyası yükleyin. | Gerçek görsel normalize edilir; sahte/bozuk/10 MB üstü dosya reddedilir. |

Bu makinede tarayıcı testiyle oluşturulmuş `Yerel Test Kurban` (102 hisse), `Yerel Test Bağışçı` (3 hisse, 6.000 TL) ve bir video bekleyen grup bulunur. İsterseniz bunları inceleyin, yeni senaryolar için ayrı `TEST ...` kampanyaları açın. Eski ana sayfa içerikleri ve `Ahmet'e Destek` ayar kartı bu testten bağımsızdır.

## Son iki grubu düzenleme

1. Ayrı kampanya: birim 2.000 TL, stok 18, grup 6, videolu standart.
2. Toplam 13 hisseyi manuel ödemeyle kaydedin: gruplar 6 + 6 + 1 olur.
3. Kampanyayı düzenleyip alımı kapatın, kapatma nedenini girin. Bekleyen ödeme kalmamalıdır.
4. Son iki grubu düzenle: 6 + 1'i **4 + 3** yapın. Fiyatlar varsayılan 2.000 TL gelir; isterseniz değiştirin. Önizleme ve onayla kaydedin.
5. İlk grup 6 kalmalı; toplam 13 hisse, aynı bağış ve ödeme kayıtları korunmalıdır. Yeni fiyatlar planlama bedelidir; tahsilat/makbuz geçmişi değişmez, fark gösterilir.
6. Aynı önizlemeyi iki sekmede açıp farklı kaydedin: ikinci eski önizleme reddedilmelidir.

Güvenlik sınırı: video/kesim/gönderim geçmişi olan grup değiştirilemez. Son grup revizyonundan sonra kampanya yeniden alıma açılamaz; yeni alım yeni kampanyada açılır. Düzenleme otomatik iade/ek tahsilat oluşturmaz.

## Bu yerel ortamda beklenen kısıtlar

- **Gerçek dekont saklama/indirme:** Supabase Storage yok; uygun dosya yüklemesi depolama aşamasında tamamlanmaz. Bağış kaydı korunmalıdır. Bu, ödeme kaydının başarısız olduğu anlamına gelmez.
- **Gerçek video yükleme/işleme/izleme ve WhatsApp:** VDS/tusd/worker/WhatsApp bağlı değildir. Liste, filtre, yetki ve hata davranışları test edilir; gerçek gönderim yapılmaz. Tam zincir için ayrı test servisi ve yalnız izinli test alıcısı gerekir.
- **Cron:** Yerel otomatik rezervasyon temizliği/uzlaştırma zamanlayıcısı yoktur.
- **PDF:** Boyut/uzantı/içerik çerçevesi kontrol edilir, özel indirme olarak sunulur; antivirüs taraması değildir. PDF içindeki zararlı içeriğin bulunmadığı garantisi verilmez.
- **Yetim dekontlar:** Belirsiz DB sonucu veya değiştirilen dekont için dosya otomatik silinmez; yanlışlıkla bağlı belgeyi silmekten kaçınılır. Saklama süresi ve referans/audit kontrollü temizlik, gerçek depolama bağlandığında ayrıca doğrulanmalıdır.

## Teknik doğrulama

Son kontrol: üretim derlemesi başarılı (36 statik sayfa), TypeScript başarılı, lint 0 hata/önceden bulunan 9 uyarı. Faz 5, manuel bağış, gruplama, video, rol/telefon testleri geçti; video servisi 25/25 birim test geçti. Tarayıcıda yönetici kayıt akışı ve saha API sınırları doğrulandı. Yeniden açılan yerel giriş sayfası 200 döndü; yeni tarayıcı oturumunda hata görülmedi.

```sh
npm run test:phase5
npm run test:manual
npm run test:groups
npm run test:video-panel
npm run test:roles
npm run test:phone
npm run typecheck
npm run lint
npm test --prefix services/video-platform
```

`test:manual:db` ve `test:groups:db`, kabul veritabanından ayrı, sabit `127.0.0.1:55439/mizan_phase2_test` test kümesine bağlıdır; bu küme çalışmıyorsa hata verir. Normal kullanıcı testi için gerekmez. Gerçek PostgreSQL üzerinde idempotency, stok yarışı, rollback ve son grup eşzamanlılık testleri geliştirici tarafından çalıştırıldı.

Build kontrolü için geliştirme sunucusunu Ctrl+C ile durdurup `npm run local:build` kullanın; sonra `npm run local:dev` ile yeniden açın. Canlı anahtar gerektirmez ve dağıtım yapmaz.

## Canlıya geçmeden önce

- Açık bağımlılık uyarılarını yeniden tarayın. Güncelleme sonrası 13 uyarı (2 yüksek, 11 orta) kalmıştır; Next.js kritik uyarısı giderilmiştir. Kalan `image-size` riskli ayrıştırıcıları kapalı, Payload hesap kilidi açma erişimi admin-only; bu önlemler npm audit kaydını kaldırmaz. Eski transitif esbuild geliştirme sunucusu kullanılmıyor. Otomatik `audit fix --force` uygulanmadı.
- Canlı yedek/geri dönüş planı, migration sırası, güçlü PAYLOAD_SECRET, DB TLS sertifika doğrulaması, özel bucket ve kısa süreli dekont URL'si, proxy Origin/Host davranışı, VDS imzaları, worker kaynak sınırları ve cron'ları gerçek ortamda doğrulayın.
- Yalnız izinli test alıcısıyla video → işleme → inceleme → test mesajı → indirme/erişim süresi zincirini tamamlayın. Gerçek bağışçıya test göndermeyin.
- Kullanıcı testi ve kalan güvenlik kontrolleri kabul edilmeden canlıya geçilmemelidir.

Bir sorun bulursanız ekran adı, yaptığınız işlem, beklediğiniz/gerçek sonuç ve ekran görüntüsünü paylaşın; gerçek telefon, dekont veya şifreyi görüntüde gizleyin.
