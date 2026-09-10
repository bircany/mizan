# Admin sadeleştirme — uygulama ve doğrulama takibi

## Kabul edilen iş kuralları

- Banka/WhatsApp üzerinden alınan ödeme admin tarafından elle kaydedilir.
- Sabit bağışlarda kampanya ve hisse/adet üzerinden beklenen tutar hesaplanır.
- Eksik ödeme kaydı kesinleştirilemez; tahsilat tutarı otomatik değiştirilmez.
- Fazla ödeme için fark ve açık onay gösterilir; fazla tutarın muhasebe karşılığı sessizce varsayılmaz.
- Ad-soyad, ödeme tarihi, telefon, sabit bağışta hisse/adet zorunlu; not isteğe bağlı.
- Dekont görünür ve önerilen, ancak zorunlu olmayan alandır.
- Telefon Türkiye varsayılanıyla tek biçime normalize edilir. Mevcut ad admin erişimiyle bulunur, düzenlenebilir. WhatsApp numarası telefondan gelir.
- Serbest tutarlı bağışlar da desteklenir.
- Toplam hisse kapasitesi grup büyüklüğünün katına tamamlanır ve kullanıcıya gösterilir.
- Son iki grubun dağılımı/fiyatları dikkatli düzenlenebilir. Başlangıç fiyatı mevcut fiyattır; gerçek eski tahsilatlar değiştirilemez.
- Admin ve saha görevlisi atanmış/atanmamış gruplara video yükleyebilir. Mevcut gönderim kuralları korunur.
- Video kart/tablo görünümü seçilebilir; tarih, kategori, kampanya, grup ve durum filtreleri vardır.
- Mevcut video format/süre/boyut sınırları korunur.

## Faz 1 — kampanya oluşturma (tamamlandı)

- Üçüncü adımdaki İleri ve son adımdaki kayıt düğmeleri ayrı DOM elemanlarıdır.
- Form submit olayı kayıt yapmaz. Son adımda açık Taslak kaydet/Yayınla işlemi gerekir.
- Tüm adımlar doğrulanır; eksik önceki alanın adımı açılır.
- Çift tıklama istemci tarafında tek dispatch ile sınırlanır. Bu, genel veritabanı idempotency garantisi değildir.
- Sunucu açık kayıt amacı ve durum uyumunu kontrol eder; eksik status artık taslağa dönüşmez.
- Beklenmeyen veritabanı hatasının metni kullanıcıya aktarılmaz.
- Admin yetkisi mevcut sunucu kontrolünden geçer; kaydetme amacı yetkilendirme yerine kullanılmaz.

### Doğrulama

- `npx tsx scripts/check-campaign-save-intent.ts`: 14 giriş senaryosu.
- `npx tsx scripts/check-campaign-action-security.ts`: gerçek server action, izole auth/veritabanı sınırlarıyla 16 senaryo; yetkisiz rol, eksik/geçersiz veri, hata ayrıntısı sızıntısı, geçerli kayıt.
- `npm run test:roles`: mevcut rol matrisi. Gerçek oturum/middleware entegrasyon testi değildir.
- `npx tsx scripts/campaign-editor-fixture.tsx`: gerçek React editörünü yalnız loopback üzerinde sahte kayıt servisiyle çalıştırır.
- Bu fixture üzerinde `agent-browser eval --stdin < scripts/check-campaign-editor-browser.js`: 3→4 geçişi, örtük submit, gizli alan doğrulama, çift tıklama, taslak/yayın ve yeniden açma testleri geçti.
- TypeScript geçti; lint sıfır hata, mevcut 9 uyarı.
- Video testindeki macOS `/var` → `/private/var` gerçek yol farkı düzeltilerek symlink ile depolama dışına çıkma testi eklendi.
- Bu faz üretim veritabanına yazmadı, ödeme veya mesaj göndermedi.

## Faz 2 — manuel IBAN kaydı (yerel uygulama ve testler tamamlandı)

- Admin formu, yetkili telefonla bağışçı arama, numara normalizasyonu.
- Sunucuda güncel fiyat/adet karşılaştırması, eksik ödeme reddi, mükerrer işlem koruması.
- Tahsilat + hisse/katılımcı + grup + muhasebe bağlantılarının tutarlı işlemle kaydı; audit.
- Özel erişimli isteğe bağlı dekont ve site IBAN/WhatsApp yönlendirmesi.

### Uygulanan davranış

- Bağış yönetimine `+ Bağış kaydı` formu eklendi. Telefonla arama sadece admin server action üzerinden, dakika başına sınırla yapılır; yalnız ad ve normalize telefon döner. Kullanıcı adı değiştirebilir. Hissedar alanları boşsa ödeme yapanın adı/WhatsApp numarası kullanılır.
- Alınan tutar güncel kampanya fiyatıyla kuruş cinsinden karşılaştırılır. Eksik ödeme reddedilir. Fazla ödeme açık onayla aynı kampanyaya ek bağış olarak kaydedilir; hisse/adet artmaz. Beklenen, alınan ve fark tutarları özel ödeme metadata/audit kaydında ayrıdır.
- Kampanya satır kilidi, istek bazlı transaction advisory lock ve benzersiz ödeme kimliğiyle; niyet, hissedarlar, rezervasyon, bağış, kesinleştirme, muhasebe ve audit aynı transaction içinde yazılır. İstek tekrarı aynı sonucu döndürür; aynı anahtarla farklı veri reddedilir.
- Serbest tutarlı bağış desteklenir. E-posta toplanmaz: eski NOT NULL alan boş metin olarak bırakılır; sahte adres üretilmez. Vergi makbuzu/e-posta talebi oluşturulmaz. Gerçek tahsilat tarihi ayrı confirmed_at alanında tutulur.
- WhatsApp iletişim ve gerekiyorsa vekâlet onayı admin tarafından doğrulanır. İsim okuma gibi alınmamış başka onaylar otomatik kabul edilmez. Mevcut video/mesaj gönderim kontrolleri korunur.
- Dekont bağımsız işlem olarak eklenir; ödeme kaydı yükleme hatasından etkilenmez. Kayıt detayından daha sonra eklenebilir. JPG/PNG gerçek içerik kontrolü, 40 MP sınırı ve yeniden kodlama; PDF imza/sonlandırıcı kontrolü; tümünde uzantı/MIME ve 10 MB kontrolü vardır. Bu kontroller PDF antivirüs taraması değildir.
- Özel `eft-proofs` bucket yoksa veya public ise yükleme/indirme reddedilir. İndirme bağlantısı admin kontrolünden sonra, attachment olarak, 60 saniye geçerli ve no-store başlıklarıyla üretilir. Önceki dekontlar özel depolamada korunur. Depolama yüklemesinden sonra veritabanı hatası olursa dosya özel bucket içinde bağlantısız kalabilir; otomatik süreli temizlik Faz 5 kapsamındadır. Belirsiz commit durumunda geçerli dosyayı yanlışlıkla silmemek için kör silme yapılmaz.
- Kart ödeme seçimi kaldırıldı, varsayılan EFT/Havale oldu; yeni checkout API çağrıları sunucuda da engellenir. Eski ödemelerin callback/iade yolları değiştirilmedi.
- İşlem başına en fazla 500 hisse/adet kabul edilir; sunucu tarafında da uygulanır.

### Doğrulama ve sınırları

- `npm run test:manual`: para/tarih/telefon/adet, değişmiş fiyat/para birimi, eksik/fazla ödeme, dekont dosyaları; gerçek server action kodunda izole auth/DB sınırlarıyla yetkisiz roller, veri minimizasyonu, iç hata gizleme ve hız sınırı.
- `npm run test:manual:db`: yalnız `127.0.0.1:55439/mizan_phase2_test` veritabanına bağlanır. Gerçek PostgreSQL üzerinde eşzamanlı istek/idempotency, yetersiz stok yarışı, transaction rollback, katılımcı/grup/defter tutarlılığı ve serbest tutarlı bağış geçti. Gerçek proje migration fonksiyonları kullanıldı. Üretim bağlantısı veya uygulama env dosyası okunmadı.
- İzole DB hazırlığı: `00_payload_baseline.sql`, `06_payment_ledger.sql`, `20260725115148_unified_donation_operations.sql`, `20260725121000_unified_eft_sessions.sql`, `20260713121335_add_donation_fulfillments.sql`, `20260728123605_video_operations_hardening.sql`. Testte Supabase storage.buckets yalnız tablo stub'ıdır. Son confirmation migration'ın cron/reconciliation bölümü çalıştırılmaz; test gerekli fonksiyonu kurar.
- `npx tsx scripts/manual-donation-fixture.tsx` ardından `agent-browser eval --stdin < scripts/check-manual-donation-browser.js`: gerçek React formu, sahte server action sınırlarıyla masaüstü ve 390 px genişlikte geçti. Üretim tasarımının/oturumunun uçtan uca doğrulaması yerine geçmez.
- Typecheck, lint, rol ve telefon testleri geçti. Lintte önceden bulunan 9 uyarı kaldı.
- Canlı veritabanı/depolama konfigürasyonu ve gerçek oturumla entegrasyon bu fazda denenmedi. Ödeme veya WhatsApp mesajı gönderilmedi; üretim migration/dağıtımı yapılmadı. Canlı güvenlik hakkında koşulsuz garanti verilmez.

## Faz 3 — kapasite ve son iki grup (yerel uygulama ve testler tamamlandı)

- Grup katına tamamlama önerisi ve açık onay.
- Son iki grup için önizleme; hisselerin korunması, kapasite ve fiyat/fark hesapları.
- Eşzamanlı ödeme/düzenleme kilitleri, video/kesim/gönderim durum korumaları, geçmiş.
- Değişen hisse fiyatı ile gerçek tahsilat ayrı tutulur; fark raporlanır.

### Uygulanan davranış ve güvenlik sınırları

- Sabit/videolu kampanyada stok grup katına tamamlanır: 100/6 → 102, 100/7 → 105. Kayıttan önce açık onay gerekir; iptal edilirse yazılmaz. Sunucu, onaylanan hedefi yeniden hesaplar. Stok verilmezse mevcut sınırsız alım davranışı korunur. Grup büyüklüğü en fazla 500, verilen stok en fazla 1.000.000'dur.
- Kampanya kartındaki **Son iki grubu düzenle** ekranı, mevcut son iki grubu yıl/sıra ile seçer. Gruplar ödeme geldikçe oluşmaya devam eder; boş bir kampanya için peşinen yüzlerce grup oluşturulmaz.
- Düzenleme, **alım kapalı ve bekleyen ödemeler sonuçlanmışken** yapılır. Son grup düzenlemesi sonrası kampanya yeniden alıma açılamaz; yeni alım yeni kampanyada açılır. Bu güvenlik sınırı, planlama fiyatlarının yeni ödeme fiyatı sanılmasını ve düzenlenen gruplara sonradan hisse eklenmesini engeller.
- 6+1 → 4+3 gibi dağılımda toplam hisse, üye kimliği, katılımcı, bağış ilişkisi korunur. Mevcut sıra korunarak sınırdaki üyeler taşınır; kişiler silinmez veya yeniden oluşturulmaz. Önceki gruplar değişmez. Her grubun üst sınırı kampanyanın normal grup büyüklüğüdür; paylaşımlı kesim kampanyasında tek hisselik son grup kesinleştirilemez (minimum 2); normal kapasitesi 1 olan operasyonlar bundan ayrıdır.
- Fiyat başlangıçta kampanyanın mevcut birim fiyatıdır; sonraki düzenlemelerde son kaydedilen grup fiyatı gelir. Bu, **grup planlama bedelidir**. Tahsilat/makbuz/defter ve eski birim fiyat snapshot'ları güncellenmez. Tahsilatın hisseye düşen kısmı kuruş cinsinden deterministik bölünür; çok hisseli tek ödeme korunur. Fark sadece gösterilir ve geçmişe yazılır; ek tahsilat veya iade otomatik yapılmaz.
- Kesim planı/kesim/geri alma, video veya mesaj geçmişi, aktif gönderim ve eski tek-grup kapasite istisnası varsa düzenleme reddedilir. Kısmi iade veya tutarsız sayaç da reddedilir. Video bekleyen fakat video kaydı henüz olmayan grup düzenlenebilir.
- Sunucu admin rolünü ve hız sınırını ayrı ayrı denetler. Tarayıcıya telefon/dekont/erişim kodu gönderilmez. React incelemesinde açık onay, onayın fiyat/sayı değişince iptali ve çift tıklama kilidi korundu.
- Kampanya → son iki grup → üye kilitleri aynı transaction içindedir. Önizleme özeti hash ile kontrol edilir; eski/eşzamanlı ikinci kayıt reddedilir. Başarısızlık bütün grup değişikliklerini geri alır. Başarıdan sonra önbellek yenileme hatası kayıt başarısızmış gibi raporlanmaz.
- Veritabanı trigger'ı işlem geçmişi olan kampanyanın grup/tutar modeli ve para birimini değiştirmeyi, stok altına inmeyi, yeni stokta grup katı kuralını atlamayı ve düzenlenmiş kampanyayı yeniden açmayı engeller. Eski katına uymayan stoklarda ilgisiz güncellemeler engellenmez.
- Düzenleme nedeni ve önce/sonra durumu özel, RLS korumalı `operation_group_revisions` tablosunda ve audit kaydında tutulur. Geçmiş UPDATE/DELETE ile değiştirilemez. Kayıt sonucu belirsiz ağ hatasında yeni önizleme alınır; kör tekrar önerilmez.

### Doğrulama ve yayın önkoşulu

- `npm run test:groups`: yuvarlama, toplam koruma, fiyat ve server action yetki/hata gizleme/hız sınırı testleri geçti.
- `npm run test:groups:db`: yalnız Faz 2'nin izole loopback PostgreSQL veritabanı. 6+1 → 4+3, üye ve önceki grup koruması, gerçek tahsilat/ledger değişmezliği, fiyat tekrar düzenleme, rollback, eski önizleme ve eşzamanlı kayıt, bekleyen ödeme/iade/video/gönderim engeli, kesim planlamasıyla yarış, yeniden açma engeli ve anon erişim testi geçti.
- Kampanya server-action testi yuvarlama onayıyla 19 senaryoya çıktı. Faz 1 tarayıcı testi yuvarlama onay/iptal kontrolüyle yeniden geçti. Faz 2 manuel ödeme testleri ve gerçek PostgreSQL testleri de yeniden geçti; küçük stoklu test kampanyası grup katı kuralına uyarlandı.
- Gerçek `TailGroupEditor` bileşeninin izole fixture'ında masaüstü ve 390×844 mobil: önizleme, taşınacak üyeler, onay sıfırlama, gönderilen 4+3 değerleri ve çift tıklama geçti. Tarayıcı hata listesi boş. Fixture, sahte server action ve sade test CSS'i kullanır; canlı oturum/üretim tasarımı için uçtan uca test değildir.
- Typecheck başarılı; lint sıfır hata ve önceden bulunan 9 uyarı.
- **Yayın öncesi zorunlu:** `supabase/migrations/20260910100000_tail_group_revision.sql`, mevcut migration'ların üzerine önce doğrulama ortamında, sonra yedekli canlı geçişte uygulanmalıdır. Kod yeni `tail_unit_price` kolonu ve revizyon tablosunu bekler. Migration yalnız izole test veritabanında uygulandı; canlı/proje veritabanı değiştirilmedi. Canlı session/storage/ödeme/video servisleriyle entegrasyon ayrıca doğrulanmalıdır.

## Faz 4 — video ekranı (yerel uygulama ve testler tamamlandı)

- Mevcut operasyon/gönderim akışına dokunmadan kart/tablo tercihi ve filtreler.
- Teknik ayrıntıların detay paneline alınması, alıcı/grup önizlemesi.
- Saha yükleme erişimi ve admin gönderim sınırlarının gerçek endpoint testleri.

### Uygulama

- Tablo (eski varsayılan) ve kart görünümü seçilebilir. Kampanya, kategori, grup kodu/başlığı, kampanya/hissedar metni, Türkiye saatine göre son hareket başlangıç/bitiş tarihi birlikte filtrelenir. Görünüm ve filtreler URL'de, sekme/sayfa geçişlerinde korunur; kullanıcı profiline veya localStorage'a yazılmaz.
- Tümü sekmesi ve birbirini dışlayan aşama sınıflandırması eklendi. Özellikle countdown, review_pending ve processing_failed gibi durumlar kaybolmaz. Sayfa başına 24 grup gösterilir. Hissedar listesi isteğe bağlı açılır, telefonlar maskelidir; dosya/codec ayrıntıları detay penceresinde kapalı gelir. Durumların eksik Türkçe etiketleri tamamlandı.
- Ayrı 100 grup/video/mesaj ve 1000 üye kesintisi kaldırıldı: Payload sonuçları 200'lük sayfalarla, gereken alanlar seçilerek okunur. Hatalı veri okuması boş listeymiş gibi gizlenmez. Filtreleme sunucuda yapılır; tarayıcıya yalnız görüntülenen grupların etkileşim props'ları taşınır. Çok büyük veri hacminde sunucu tarafı sorgu filtreleme/aggregate optimizasyonu ayrıca yük testi gerektirir; bu aşama DB seviyesinde sayfalı filtre sorgusu değildir.
- Admin ve saha görevlisi atanmış, atanmamış veya başka görevliye atanmış gruba **video yükleyebilir**. Grup kodu doğrulaması, üç yanlış deneme kilidi, operasyon aşaması, iki aktif upload sınırı, token süresi, video sürümü ve audit korunur. Genel `requireDeliveryGroupAccess` ve kesim operasyon endpoint yetkileri genişletilmedi. Mevcut yükleme sırasında kesim durumunu otomatik işaretleme davranışı değiştirilmedi.
- Saha ekranında yönetim/gönderim düğmeleri gösterilmez. Detay yanıtında saha rolüne mesaj gövdesi (video bağlantısı/erişim kodu içerebilir) ve sağlayıcı mesaj kimliği verilmez. Telefon maskesi korunur. Detay endpoint'inin beklenmeyen hata metni gizlenir. Bu, sistemdeki bütün endpoint'lerin gizlilik denetimi değildir; kalanlar Faz 5 kapsamındadır.
- Upload oturumu endpoint'inde aynı Origin kontrolü eklendi; eksik veya farklı Origin reddedilir. İstemci/sunucu ortak dosya adı–uzantı–MIME eşleşmesi kullanır. MP4/MOV/WebM, 2 GB ve 10 dakika sınırları değiştirilmedi. MIME boş/genel binary ise izinli uzantıdan türetilir; çelişen MIME veya .exe gibi uzantı reddedilir. Gerçek dosya içeriğini inceleyen mevcut tus/video worker kontrolleri korunur. Sunucu loguna tam upload hatası/token/SQL basılmaz.
- Test mesajı, inceleme ve gönderim iş akışı yeniden yazılmadı; mevcut test ortamı/politikası korunur. Gerçek mesaj gönderilmedi.

### Doğrulama ve sınırlar

- `npm run test:video-panel`: birleşik filtreler, Türkçe arama, Türkiye günü sınırı, bozuk tarih/sayfa parametreleri, görünüm/filtre URL koruması, MIME/uzantı kontrolü geçti. Payload sınırı izole edilerek 201 grup/1001 hissedarın tam okunması ve maskelenmesi doğrulandı.
- Aynı komut gerçek upload route handler + gerçek rezervasyon fonksiyonunu sahte DB/token/auth sınırlarıyla yürütür: iki rolün üç atama durumu, yetkisiz rol, Origin, boyut/MIME, yanlış/kilitli grup kodu ve gönderim aşaması testleri geçti. Gerçek gönderim route handler'ında queue/resume/cancel saha rolüne 403 döndü. Detay handler'ında saha yanıtının özel mesaj/telefon içermediği doğrulandı. Bu testler gerçek cookie/middleware, DB transaction veya VDS uçtan uca entegrasyonu değildir.
- `npm test --prefix services/video-platform`: mevcut 25 test geçti (upload token, path/symlink kaçışı, media token, container kontrolü, mesaj politikası vb.).
- `scripts/video-panel-fixture.tsx` gerçek liste bileşenini sahte işlem düğmeleri ve sade test CSS'iyle çalıştırır. Tarayıcıda kategoriyle 15 kart, görünüm/filtrenin sekme linklerinde korunması, 24+6 sayfalama, tarih boş sonucu ve 390 px mobil hissedar listesi kontrol edildi. Gerçek yükleme veya mesaj düğmesine basılmadı; canlı tasarım/oturum doğrulaması değildir.
- Typecheck başarılı, lint sıfır hata ve mevcut 9 uyarı. Canlı veritabanı veya servis ayarı değiştirilmedi; Faz 3 migration yayın önkoşulu devam ediyor. Yeni Origin kontrolü canlı reverse-proxy/alan adı üzerinden ayrıca denenmelidir.

## Faz 5 — dosya ve bütünleşik güvenlik (yerel uygulama; yayın kapıları ayrı)

- Dosya imzası, uzantı, MIME, boyut, çözünürlük ve kaynak tüketimi kontrollerini bütün girişlerde karşılaştırma.
- Dekont/telefon/veri erişiminde IDOR, yetki aşımı, CSRF, rate limit, hassas log ve dosya sunum testleri.
- Eşzamanlı kayıt, eksik ödeme, fiyat değişimi ve tekrar gönderim senaryoları.
- Canlı servis konfigürasyonu ve dağıtım ayrıca doğrulanmalı. Yerel testler sistem genelinde sızıntı olmadığı garantisi değildir.

### Uygulananlar — 10 Eylül 2026

- Cookie ile çalışan video yönetim API'lerinde aynı-kaynak kontrolü; imzalı webhook'lar bu kontrolden ayrıldı. Host/Origin uyumu gerçek localhost tarayıcısıyla düzeltildi; forwarded-host güvenilmez.
- Mesaj hazırlama/test/gönderme/duraklatma/yeniden deneme/düzenleme yalnız admin. Saha yükleme ve maskeli detay erişimi korunur. Doğrudan Payload delivery-messages okuması saha rolüne kapatıldı; pasif hesaplar erişim yardımcılarında reddedilir. Hesap kilidi açma yalnız admin.
- Medya gerçek decode, MIME+uzantı, 10 MB/40 MP, tek kare ve yeniden kodlama ile doğrulanır; dosya adları rastgele, metadata temizlenir. Payload image-size ayrıştırıcısında JPG/PNG/WebP dışı türler kapatıldı.
- EFT dekont endpoint'i gerçek doğrulayıcıyı kullanır; multipart akışı 11 MB ile sınırlı, token ve rate limit denetlenir, bucket private olmalıdır. Rezervasyon kilidiyle iki DB güncellemesi tek transaction; belirsiz commit'te dosya silinmez. Hata yanıtları iç servis/SQL ayrıntılarını göstermez.
- Rate limit aynı PostgreSQL atomik fonksiyonuna doğrudan bağlanır; altyapı hatası fail-closed. Production PAYLOAD_SECRET eksik/zayıfsa açılış reddedilir.
- Next 16.3.4, Sharp 0.35.4 ve güvenlik bağımlılık güncellemeleri. Audit sıfır değildir: 13 uyarı (2 yüksek, 11 orta); önlemler ve yayın kapıları test kılavuzunda.
- Yerel ayrı cluster, 45 SQL migration hash geçmişi ve yalnız yerel iki test hesabı. İkinci migration çalıştırması idempotent. Supabase bucket metadata'sı gerçek storage hizmeti sayılmaz; cron fonksiyonları kurulu, zamanlayıcı yok.
- Gerçek tarayıcıda admin giriş → dört adımlı kampanya → 100/6 onay → 102 aktif kayıt; manuel 5500 reddi → 6000 tek ödeme/3 hisse; saha doğrudan mesaj API 403 ve maskeli detay 200 doğrulandı.
- Yeni `test:phase5`, önceki fazların testleri ve ayrı PostgreSQL eşzamanlılık testleri çalıştırıldı. Gerçek VDS/Storage/WhatsApp uçtan uca testi yapılmadı; canlıya dağıtım yok.

Kullanıcı testi ve kalan yayın koşulları: [Yerel test kılavuzu](yerel-test-kilavuzu.md).
