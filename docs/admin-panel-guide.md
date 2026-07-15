# Mizan Derneği — Admin Panel Kullanım Kılavuzu

## 1. Genel Bakış

Mizan İnsani Yardım Derneği'nin yönetim paneli, **Payload CMS v3** üzerine inşa edilmiştir ve **Next.js 16 App Router** ile entegre çalışır. Panel; içerik yönetimi, bağış takibi, ödeme izleme, saha operasyonları ve finansal süreçlerin tek bir arayüzden yönetilmesini sağlar.

**Erişim adresi:** `/yonetim` (varsayılan)
**Giriş sayfası:** `/giris`
**Hesap yönetimi:** `/hesabim`

Panel koyu tema ile çalışır ve `#01b301` yeşil ile `#dfdfdf` gri tonlarında özel bir renk paletine sahiptir.

---

## 2. Roller ve Yetki Yapısı

Panelde 4 temel rol tanımlıdır. Her rol, sistemin farklı bir katmanına erişir.

### 2.1 super_admin

Sistem yöneticisi. Tüm yetkilere sahip tek rol.

- Kullanıcı oluşturur, pasif eder, siler
- Rol atar, içerik ve sayfa yönetir
- Tüm bağış, ödeme, saha ve onay süreçlerini görüntüler
- Acil durumlarda override yetkisine sahiptir
- **Kısıtlama:** Finansal kayıtları doğrudan elle "ödendi" yapamaz

### 2.2 finance

Finans departmanı. Para ile ilgili tüm süreçleri yönetir.

- Tüm ödeme akışını, hata kayıtlarını, fraud bekleyen işlemleri görüntüler
- `cancel` ve `refund` işlemini panelden başlatabilir
- Kampanya havuz toplamlarını izler (manuel tutar düzenleyemez)
- Mutabakat ve raporlama ekranlarına erişir

### 2.3 field_operator

Saha görevlisi. Sahada çalışan personel için mobil arayüz.

- Sadece kendisine atanmış saha görevlerini görür
- Fotoğraf, video, belge yükler
- Dış servisten dönen `externalApprovalCode` veya `externalReferenceId` bilgisini girer
- **Kısıtlama:** Finansal verileri detaylı görmez

### 2.4 approver

Kalite kontrol ve onay yetkilisi.

- Saha yüklemelerini kalite, tamlık ve süreç uygunluğu açısından inceler
- Eksik veya reddedilen teslimleri sahaya geri yollar
- Dış servis onay/ref kodu gelmeyen veya uyuşmayan durumlarda müdahale eder
- **Kısıtlama:** Sınırlı bağışçı/kampanya bağlamını görür; kart/ödeme hassas detaylarını göremez

---

## 3. Admin Panel Ekranları

### 3.1 Dashboard (Ana Panel)

Rol bazlı metrikler ve kuyruklar görüntülenir.

- Toplam bağış tutarı (sadece `paid` durumdaki)
- Bugünkü/haftalık bağış sayıları
- Pending review bekleyen işlemler
- Saha görev kuyruğu
- Son aktiviteler (audit log özeti)

### 3.2 Bağışlar (`donations`)

Üç katmanlı bağış takibi:

| Katman | Açıklama | Durum Alanları |
|--------|----------|----------------|
| `donation_intents` | Bağışçının formu doldurup ödeme başlattığı kayıt | Oluşturuldu |
| `payment_sessions` | iyzico ile ödeme oturum detayları | initialized, pending, success, failed |
| `donations` | Ödeme güvenle doğrulanınca oluşan gerçek bağış kaydı | paid, pending_review, failed, cancelled, partially_refunded, refunded |

**Filtreleme:** Kampanya, tarih aralığı, durum, para birimi, bağışçı adı ile filtreleme yapılabilir.

**Önemli alanlar:**
- `grossAmount` — Ham ödeme tutarı
- `netConfirmedAmount` — Net onaylı tutar (iade/iptal düşülmüş)
- `receiptNumber` — Resmi makbuz numarası
- `paymentId` — iyzico ödeme referansı

### 3.3 Ödeme İzleme (`payment_events`)

Ödeme sistemine giren çıkan tüm olayların ham logu.

- **Callback kayıtları:** iyzico'dan dönen token sonuçları
- **Webhook kayıtları:** X-IYZ-SIGNATURE-V3 imzası doğrulanmış olaylar
- **Fraud durumu:** `fraudStatus=0` olan işlemler ayrı kuyrukta
- **Reconcile:** Reporting API ile yapılan yeniden doğrulamalar
- **Failed payment:** Başarısız ödeme denemeleri

Her olay `eventType`, `headers`, `payload`, `signatureVerified` ve `processedAt` alanlarıyla kaydedilir. Tüm provider olayları ham olarak saklanır; tekrar gelen olaylar idempotent işlenir.

### 3.4 İade/İptal (`refund_requests`)

Finance rolünün yönettiği kritik ekran.

| İşlem | Açıklama | Ne Zaman |
|-------|----------|----------|
| `cancel` | Aynı gün tam iptal | Aynı gün içinde |
| `refund_full` | Tam iade | Sonraki günler |
| `refund_partial` | Kısmi iade | İstenen tutar kadar |

Her aksiyonda zorunlu alanlar:
- **Sebep** — İade/iptal nedeni
- **Açıklama** — Detaylı not
- **Operator kullanıcı** — İşlemi yapan
- **Provider sonucu** — iyzico yanıt referansı

### 3.5 Saha Görevleri (`field_tasks`)

Kampanya havuzu için saha işleri yönetilir.

- **Atama:** Super admin veya approver tarafından açılır
- **Görev detayı:** Konum, son tarih, atanmış kişi
- **Durum takibi:** open → in_progress → submitted → reviewed

### 3.6 Kanıt Yüklemeleri (`proof_submissions` + `proof_assets`)

Saha görevlilerinin yüklediği deliller.

**Durum akışı:**
```
draft → submitted → external_pending → review_pending → approved/rejected
```

- `draft`: Taslak halinde
- `submitted`: Sahaya yüklenmiş, henüz doğrulanmamış
- `external_pending`: Dış servisten onay bekleniyor
- `review_pending`: Approver incelemesinde
- `approved`: Onaylanmış
- `rejected`: Reddedilmiş (düzeltme notu ile)

**Yüklenen dosya türleri:**
- Fotoğraf (JPEG, PNG, WebP)
- Video (MP4, QuickTime)
- PDF belgeler

Dosya depolama: `proof-assets` Supabase bucket'ında, signed URL ile erişilir.

### 3.7 Onay Kuyruğu

Approver rolü için merkezi inceleme ekranı.

- `review_pending` durumundaki tüm submissions
- Görev ile dosya uyumu kontrolü
- Belge/video kalite değerlendirmesi
- Dış onay/ref kodu doğrulaması
- Donor-facing görünürlük işaretleri

### 3.8 Bağışçı Raporları (`donor_reports`)

Onaylı kanıtlardan bağışçıya giden özet raporlar.

- `summaryForDonor` — Bağışçıya özel özet
- `status` — draft, approved, sent
- `approvedBy` — Onaylayan kişi
- `sentAt` — Gönderim tarihi

### 3.9 Kullanıcılar ve Roller (`users`)

Sadece `super_admin` erişebilir.

- Kullanıcı oluşturma/düzenleme/pasifleştirme
- Rol atama (super_admin, finance, field_operator, approver)
- Son giriş tarihi takibi
- Aktif/pasif durum yönetimi

### 3.10 Sayfalar ve İçerik (`pages`, `news`, `campaigns`, `categories`)

CMS içerik yönetimi. Başlangıçta sadece `super_admin` tarafından yönetilir.

- **Sayfalar:** Hakkımızda, İletişim gibi sabit sayfalar
- **Haberler:** Haber oluşturma, düzenleme, çoklu dil desteği (TR/EN/AR)
- **Kampanyalar:** Bağış kampanyaları, hedef tutar, toplanan tutar takibi
- **Kategoriler:** Kampanya ve haber kategorileri

---

## 4. Veritabanı Yapısı

Payload CMS, PostgreSQL (Supabase) üzerinde çalışır. İlk çalıştırmada tabloları otomatik oluşturur.

### Koleksiyonlar (16 adet)

| Koleksiyon | Amaç |
|------------|------|
| `users` | Kullanıcılar ve roller |
| `campaigns` | Bağış kampanyaları |
| `categories` | Kampanya/haber kategorileri |
| `news` | Haberler |
| `pages` | Statik sayfalar |
| `media` | Yüklenen dosyalar |
| `donation_intents` | Bağış başlatma kayıtları |
| `payment_sessions` | iyzico ödeme oturumları |
| `payment_events` | Ödeme olay logları |
| `donations` | Onaylı bağış kayıtları |
| `refund_requests` | İade/iptal talepleri |
| `field_tasks` | Saha görevleri |
| `proof_submissions` | Kanıt yükleme talepleri |
| `proof_assets` | Yüklenen kanıt dosyaları |
| `donor_reports` | Bağışçı raporları |
| `audit_logs` | Sistem denetim kayıtları |

### Dosya Depolama (Supabase Storage)

| Bucket | İçerik | Erişim |
|--------|--------|--------|
| `receipts` | PDF makbuzlar | Signed URL, 10MB limit |
| `proof-assets` | Belge, fotoğraf, video | Signed URL, 500MB limit |

---

## 5. Bağış ve Ödeme Süreci Akışı

```
1. Bağışçı → Public site bağış formu → donation_intent oluşturur
2. Payment-service → iyzico Checkout Form Initialize → conversationId + token kaydedilir
3. Bağışçı → iyzico 3D Secure ödeme sayfasına yönlendirilir
4. iyzico → callbackUrl'e token gönderir
5. Payment-service → CF Retrieve çağrısı → sonuç + imza doğrulanır
6. status=success VE fraudStatus=1 → donation kaydı oluşur, makbuz üretilir
7. fraudStatus=0 → bağış pending_review kalır, saha süreci başlamaz
8. Webhook geldikçe → imza doğrulanır, event log'a yazılır
9. Uyuşmazlık → finance panelinden Reporting API ile yeniden doğrulama
10. Kampanya toplamları → sadece paid ve net tutar üzerinden hesaplanır
```

**Güvenlik kuralları:**
- Başarılı kararı frontend'den asla verilmez
- `donations` tablosuna doğrudan insert yapılmaz
- Admin bağışı "manuel paid" yapamaz
- Callback sonucu tek başına yeterli kabul edilmez
- Tüm finansal aksiyonlar audit log'a zorunlu yazılır

---

## 6. Saha ve Onay Süreci

1. Finance onaylı ve gerçekten tahsil edilmiş bağışlar havuza düşer
2. Super admin veya approver saha işi açar ve field_operator atar
3. Saha görevlisi mobil panelden:
   - Görev detayını görüntüler
   - Dosyaları yükler
   - Dış servisten dönen onay/ref kodunu ekler
4. Submission durumu: `external_pending` → `review_pending`
5. Approver kontrol eder:
   - Görev ile dosya uyumu
   - Belge/video kalitesi
   - Dış onay/ref kodu varlığı
   - Donor-facing görünürlük işaretleri
6. Uygunsa `approved`, eksikse `rejected` + düzeltme notu

---

## 7. Teknik Yapı

```
mizandernegi/
├── app/
│   ├── (payload)/          # Payload CMS route grubu
│   │   ├── layout.tsx      # Root layout (custom.scss import)
│   │   ├── custom.scss     # Koyu tema CSS (Mizan yeşil paleti)
│   │   ├── yonetim/        # Admin panel route
│   │   │   ├── importMap.js
│   │   │   └── [[...segments]]/
│   │   ├── admin/          # Eski admin route
│   │   ├── api/            # API route handlerlar
│   │   └── cekirdek-panel/ # Çekirdek panel
│   ├── bagis/              # Bağış sayfaları
│   ├── odeme/              # Ödeme sayfası
│   ├── haberler/           # Haberler
│   └── ...                 # Diğer sayfalar
├── payload/
│   └── collections/        # 16 Payload collection
├── components/             # React bileşenleri
├── lib/                    # Yardımcı modüller
├── public/                 # Statik dosyalar
├── supabase/               # SQL migration dosyaları
├── payload.config.ts       # Payload yapılandırması
├── next.config.mjs         # Next.js yapılandırması
└── custom.scss             # Admin panel tema stilleri
```

---

## 8. Erişim ve İlk Kurulum

1. Veritabanı bağlantısı kurulduktan sonra `npm run dev` çalıştırılır
2. İlk çalıştırmada Payload, collection tablolarını otomatik oluşturur
3. `/yonetim` adresine gidilir
4. İlk admin kullanıcısı otomatik olarak oluşturulur
5. Rol ataması yapılarak diğer kullanıcılar eklenir

---

## 9. Kabul Kriterleri ve Test Kriterleri

- Ödeme başarılı gösterilip provider'da başarısız olan bağış `paid` düşmemeli
- Aynı webhook iki kez gelince çift kayıt oluşmamalı
- `fraudStatus=0` olan ödeme saha sürecini başlatmamalı
- Finance dışında hiçbir rol refund/cancel yapamamalı
- Saha görevlisi sadece kendi görevlerini görebilmeli
- Approver finansal hassas alanlara erişememeli
- Dış onay/ref kodu olmadan submission otomatik `approved` olmamalı
- Kampanya toplamları ledger'dan hesaplanmalı (manuel edit yok)
- Tam refund sonrası net havuz tutarı düşmeli
- Signed URL süresi dolunca medya tekrar doğrulama olmadan açılmamalı
