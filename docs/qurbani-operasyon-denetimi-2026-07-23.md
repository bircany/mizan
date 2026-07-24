# Kurban Operasyon Denetimi — 23 Temmuz 2026

## Sonuç

Kurban panelindeki 21 yönetici işlemi sunucu tarafında `super_admin` yetkisiyle
korunuyor. Saha görevlisi yalnız kendi görev paketi için video yükleyebiliyor;
finans ve müşteri yönetimi işlemlerine erişemiyor. Public ödeme, fiyatı ve stok
revizyonunu sunucuda tekrar hesaplıyor; tarayıcıdan gönderilen tutarı kullanmıyor.

Canlı veriyi değiştirmemek için gerçek satış, EFT onayı, stok azaltma veya mesaj
gönderimi yapılmadı. Bu nedenle aşağıdaki mutasyonlu akışlar staging/test
sezonunda ayrıca uçtan uca denenmeden production onayı verilmemelidir.

## Doğrulananlar

- `test:qurbani`, rol matrisi, TypeScript, lint ve production build başarılı.
- Uzak PostgreSQL bağlantısı başarılı; kurban tabloları, gerekli RPC fonksiyonları,
  idempotency indeksleri ve RLS kontrol edildi.
- `anon` ve `authenticated` rolleri private `qurbani_*` fonksiyonlarını
  çalıştıramıyor; `service_role` çalıştırabiliyor.
- Kimliksiz denemelerde checkout doğrulama hatası `400`, admin video/belge/saha
  işlemleri `403`, geçersiz video bağlantısı `404` döndü.
- Aktif stok, aktif blokaj, bekleyen iş, başarısız video ve başarısız mesaj sayısı
  denetim anında `0` idi.

## Bu denetimde düzeltilenler

1. tusd `post-finish` bildirimi tekrarlandığında video işinin ikinci kez
   oluşturulmasını engelleyen idempotent davranış eklendi.
2. İşlenmiş video dosyası silinmiş/eksikse iki video endpointi `500` yerine
   `404` ve private/no-store yanıtı veriyor.
3. Production worker'a Evolution API URL, anahtar ve instance değişkenleri
   eklendi; WhatsApp kuyruğu artık bu container içinde yapılandırılabilir.

## Production öncesi açık maddeler

1. **Uçtan uca test sezonu gerekir.** Aşağıdaki işlemler gerçek veriyi etkilediği
   için denetimde çağrılmadı: toplu stok, stok azaltma, iyzico sandbox callback,
   EFT onayı, saha paketi, tusd yükleme/FFmpeg, WhatsApp kuyruğu.
2. **Eski public sipariş endpointi** (`/api/qurbani/orders` ve EFT dekont yükleme)
   hâlâ Supabase Storage kullanıyor. Yeni public ekran bunu çağırmıyor; ancak
   tamamen yerel/VPS depolama hedefi için bu eski yolu kaldırmak veya yerel private
   depoya taşımak gerekir.
3. **Dosya temizliği zamanlanmalı.** Worker rezervasyon ve geçici PII temizliği
   yapıyor; video saklama süresi temizliği için `npm run qurbani:cleanup` henüz
   Docker cron/systemd timer ile planlanmış değil.
4. **tusd hook secret'i etkin kullanılmıyor.** Upload grant HMAC ile doğrulanıyor;
   buna rağmen `QURBANI_TUSD_HOOK_SECRET` compose içinde tek başına hook endpointini
   korumaz. VPS kurulumunda bu değişken ya reverse-proxy/header doğrulamasıyla
   etkinleştirilmeli ya da yanıltıcı yapılandırma kaldırılmalı.
5. **VPS ağ/topoloji kontrolü gerekir.** Host üzerinde çalışan Nginx,
   `qurbani-tusd` Docker DNS adını çözemez. Nginx container'ı aynı Docker ağına
   alınmalı veya yalnız localhost'a yayınlanan bir tusd portu proxy'lenmelidir.
6. Worker image'ında `ffmpeg` ve `ffprobe` bulunduğu, volume yedeği ve geri
   yükleme denemesi henüz bu bilgisayarda doğrulanamadı.

## Production kabul sırası

1. Ayrı test sezonu/ülke/stok ile iyzico sandbox ödeme ve callback.
2. Saha paketi, QR, PDF/Excel ve `field_operator` hesabıyla video yükleme.
3. FFmpeg çıktı, erişim token iptali ve eksik dosya `404` kontrolü.
4. Bağlı test WhatsApp numarasıyla tek mesaj, teslim webhook'u ve çift gönderim
   koruması.
5. VPS'te Nginx ağ bağlantısı, kalıcı volume, günlük şifreli yedek ve geri yükleme.
