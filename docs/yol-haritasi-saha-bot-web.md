# Mizan Derneği - 7 Günlük Teslim Planı

Bu plan, sistemi sade tutarak önce siteyi düzeltmek, sonra teknik altyapıyı kurmak ve en sonunda saha operasyonu ile otomasyonu bağlamak için hazırlanmıştır.

## Ana Prensip

- Önce siteyi düzelt.
- Sonra teknik altyapıyı kur.
- En son Telegram bot ve n8n entegrasyonlarını bağla.
- Kritik kararlar web/backend içinde kalsın.
- Bot ve otomasyonlar sadece yardımcı rol oynasın.

## Nihai Hedef

1. Site sorunsuz çalışsın.
2. Bağış akışı düzgün işlesin.
3. Saha görevlisi Telegram botla kolayca kanıt yükleyebilsin.
4. Onay süreci web panelde yönetilsin.
5. Doğrulanan kanıt bağışçıya güvenli şekilde ulaştırılsın.

## 7 Günlük Plan

### Gün 1 - Site Düzeltme

Amaç: Canlıya çıkacak web yüzeyini kararlı hale getirmek.

- Kırık import ve route hatalarını düzelt.
- Ana sayfa, bağış sayfası ve ödeme sonucu sayfalarını kontrol et.
- Local ve prod `NEXT_PUBLIC_BASE_URL` ayrımını netleştir.
- Callback ve webhook endpointlerini çalışır hale getir.
- Build hatası bırakma.

Çıktı:

- Çalışan site
- Hatasız build
- Doğru yönlenen ödeme akışı

### Gün 2 - Çekirdek Veri Modeli

Amaç: Sistemin omurgasını belirlemek.

- `donations`
- `field_tasks`
- `proof_submissions`
- `proof_assets`
- `donor_reports`
- `telegram_users`
- `field_sessions`

Bu modellerin ilişki ve durumlarını netleştir.

Çıktı:

- Nihai tablo listesi
- İlişki haritası
- Durum geçişleri

### Gün 3 - Saha Görev Akışı

Amaç: Bağıştan sahaya iş düşmesini sağlamak.

- Bağış onaylanınca görev oluştur.
- Görev operasyon/ saha çalışanına atansın.
- Görevde kampanya, hibe/hisse sayısı, tarih ve bölge bilgisi olsun.
- Tek kullanımlık kod ile görev açma mantığını tanımla.

Çıktı:

- Görev oluşturma akışı
- Tek kullanımlık kod modeli
- Telegram görev eşleşmesi

### Gün 4 - Kanıt Yükleme ve Onay

Amaç: Video, foto ve belge akışını güvenli hale getirmek.

- `proof_submissions` durumlarını sadeleştir.
- `proof_assets` yükleme kurallarını netleştir.
- Upload sonrası private storage kullan.
- Approver panelinde onay/reddet ekranını sadeleştir.
- Reddedilen içerik için düzeltme notu zorunlu olsun.

Çıktı:

- Kanıt yükleme sistemi
- Onay/reddet paneli
- Private storage akışı

### Gün 5 - Telegram Bot MVP

Amaç: Saha görevlisinin işini kolaylaştırmak.

- `/start <kod>` ile göreve bağlanma.
- Görev bilgisi gösterme.
- Video, fotoğraf, belge gönderme.
- Yükleme tamamlandı mesajı.
- Hata olursa tekrar deneyen akış.

Çıktı:

- Bot komutları
- Görevli giriş akışı
- Medya yükleme akışı

### Gün 6 - n8n Yardımcı Otomasyonları

Amaç: Bildirim ve takip işlerini hafifletmek.

- Görev atanınca bildirim gönder.
- Yükleme gecikince hatırlatma yolla.
- Onaylanan kanıt sonrası bağışçıya link gönder.
- Başarısız yüklemelerde retry tetikle.

Çıktı:

- Bildirim akışları
- Hatırlatma akışları
- Retry otomasyonları

### Gün 7 - Uçtan Uca Test ve Teslim

Amaç: Sistemi bütün halinde doğrulamak.

- Bağış oluştur.
- Görev oluştuğunu kontrol et.
- Telegram botla kanıt yükle.
- Web panelde onayla.
- Bağışçıya güvenli link üret.
- Eksik kalan noktaları not et.

Çıktı:

- Uçtan uca çalışan akış
- Teslim listesi
- Son düzeltme listesi

## Faz Sırası

1. Siteyi düzelt.
2. Teknik altyapıyı kur.
3. Telegram botu bağla.
4. n8n otomasyonlarını ekle.
5. Uçtan uca test et.

## Bu Planda Yapılmayacaklar

- İlk aşamada ayrı mobil uygulama yapmak.
- Kritik kararları n8n’e bırakmak.
- Aynı veriyi birden çok yerde yönetmek.
- Gereksiz karmaşık ekranlar eklemek.
- Botu ana sistemin yerine koymak.

## Başarı Kriterleri

- Site build alıyor.
- Ödeme callback ve webhook çalışıyor.
- Saha görevi bağışla ilişkileniyor.
- Telegram bot tek kullanımlık kodla görev açıyor.
- Kanıt yükleme ve onay paneli çalışıyor.
- Bağışçı doğrulanmış içeriğe güvenli linkle ulaşıyor.

## Masaüstünde Takip İçin Kullanım

- Bu dosyayı masaüstüne kopyala.
- Her günün başına tarih yaz.
- Tamamlanan maddeleri işaretle.
- Engeli olan işleri kırmızı not düş.
- Gün sonunda sadece bir sonraki güne kalan maddeleri bırak.
