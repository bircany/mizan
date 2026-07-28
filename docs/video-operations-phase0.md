# Video Operasyonu — Faz 0 Fark Raporu

Tarih: 28 Temmuz 2026

Bu rapor yalnızca read-only repo, canlı Supabase/PostgreSQL ve VDS incelemesine
dayanır. Faz 0 sırasında migration, container, network, volume, firewall veya
production uygulama değişikliği yapılmadı.

## Mevcut olanlar

- Canlı veritabanında `campaigns`, `donation_participants`,
  `operation_groups`, `operation_group_members`, `operation_videos`,
  `delivery_messages`, `donations`, `donation_intents`, `payment_sessions` ve
  `audit_logs` tabloları var.
- İncelenen bütün `public` tablolarında RLS etkin. Birleşik operasyon
  tablolarında `anon` ve `authenticated` grantleri kaldırılmış, yalnız
  `service_role` erişimi bırakılmış.
- PostgreSQL 17.0.6 kullanılıyor.
- Repo içinde grup rezervasyonu, temel video kaydı, tus istemcisi, FFmpeg
  taslağı, PostgreSQL `FOR UPDATE SKIP LOCKED` mesaj claim'i ve Evolution
  bağlantısı için başlangıç kodları var.
- VDS Ubuntu 24.04.4, Docker 29.6.2 ve Coolify
  `4.0.0-beta.459` çalıştırıyor.
- VDS kapasitesi: 2 vCPU, 7.8 GiB RAM, 57 GiB boş disk. Swap yok.
- Evolution API, PostgreSQL ve Redis container'ları aynı internal Docker
  network'ünde çalışıyor. API iç ağdan sağlıklı yanıt veriyor.
- `video.softartdevstudios.cloud` ve
  `upload.video.softartdevstudios.cloud` DNS kayıtları VDS'ye yönleniyor.

## Eksik olanlar

- Hedef kesim yaşam döngüsü, operasyon tipi, saha/işlenmiş-video kontrol
  listeleri ve zorunlu onay snapshot'ları.
- Ed25519, 10 dakikalık, tek kullanımlı ve kapsamlandırılmış upload grantleri.
- VDS üzerinde çalışan ayrı `video-api`, `tusd`, `video-worker`,
  `message-worker` ve retention/disk-monitor servisleri.
- 2 GB / 10 dakika / MP4-MOV-WebM kesin doğrulaması, checksum, logo, grup kodu,
  kapanış kartı, ses normalizasyonu ve tek FFmpeg concurrency garantisi.
- Grup seviyesinde kalıcı link, hash + şifreli erişim kodu, rotation, rate
  limit ve kısa süreli stream/download yetkisi.
- Test zorunluluğu, 5 saniyelik iptal, 5–9 saniye mesaj aralığı, 50 mesajda
  iki dakika mola, global outage pause ve `manual_sent`.
- CSV/PDF operasyon çıktıları ve export audit kayıtları.
- Günlük harici şifreli backup ve doğrulanmış restore prosedürü.

## Hatalı veya riskli olanlar

- `supabase/migrations/20260725124000_remove_legacy_donation_system.sql`
  koşulsuz veri silme ve `DROP ... CASCADE` işlemleri içeriyor. Production'da
  uygulanmayacak.
- Yerel migration sürümleri ile canlı migration geçmişi aynı değil:
  `qurbani_message_drafts`, `finalize_qurbani_message_drafts`,
  `unified_donation_operations`, `unified_eft_sessions` ve
  `unified_refunds` farklı sürüm numaralarıyla kayıtlı.
- Mevcut `deploy/qurbani` Compose dosyası silinmiş eski `/api/qurbani/*`
  route'larını ve `/data/qurbani` yollarını kullanıyor. Güncel kod
  `/api/delivery/*` ve `/data/delivery` bekliyor. Compose tek başına geçerli
  bir production deploy tanımı değil.
- Mevcut upload grantleri HMAC ve 30 dakika; post-finish sırasında süresi
  dolmuş token resume edilen upload'ı bozabilir.
- Video limiti 1 GB / 15 dakika ve WebM desteklenmiyor.
- İkinci video sürümü her zaman `version = 1` oluşturulduğu için benzersiz
  constraint ile çakışıyor.
- Mevcut worker tek süreçte video, mesaj ve retention çalıştırıyor; kaynak
  limiti yok.
- Evolution container'ı host portu açmıyor ancak Coolify/Traefik üzerinden
  `evolution.softartdevstudios.cloud` ile internete route edilmiş durumda.
  İç-network hedefiyle çelişiyor; mevcut kullanımı kesmemek için Faz 0'da
  kaldırılmadı.
- Video domainlerinde henüz router/service yok. Traefik default self-signed
  sertifikası ve HTTP 503 dönüyor.
- VDS'de 30 çalışan container var, container kaynak limitleri tanımlı değil,
  swap yok ve host yeniden başlatma bekliyor.
- `restic` kurulu değil ve backup timer/cron bulunmuyor.

## Additive migration planı

1. Mevcut tabloları genişleten nullable/default-safe kolonlar ve yalnız
   additive enum değerleri.
2. Kesim operasyonu, erişim kodu/linki, consent snapshot'ları, video teknik
   metadata/snapshot/retention ve mesaj retry/manual alanları.
3. Önce `NOT VALID` eklenen boyut, süre ve MIME constraintleri; veri
   doğrulandıktan sonra validation.
4. Queue claim, provider ID, expiry ve aktif-video sorguları için
   partial/composite indeksler.
5. Audit/consent immutability ve tutarlılık triggerları.
6. `anon`/`authenticated` erişimi açmadan, server-only least-privilege
   grantlerin korunması.

## VDS servis planı

- `video-api`: tus hook doğrulama, upload grant tüketimi, erişim kodu,
  stream/download yetkisi ve güvenli metadata işlemleri.
- `tusd`: 2 GB, 24 saat resume, açık CORS allowlist ve persistent upload
  volume.
- `video-worker`: tek replica/tek FFmpeg, FFprobe doğrulaması, watermark,
  kapanış kartı ve retry/quarantine.
- `message-worker`: PostgreSQL queue, Evolution internal network, outage
  pause, retry ve idempotency.
- `retention-worker`: disk eşikleri, süre dolumu ve fiziksel dosya temizliği.
- Günlük harici şifreli backup ve düzenli restore doğrulaması.

Production migration veya deploy; additive SQL'in local doğrulaması, backup
hazırlığı ve açık kullanıcı onayından sonra yapılacaktır.
