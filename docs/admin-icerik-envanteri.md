# Yonetilebilir Icerik Envanteri

Bu dokuman, public sitedeki icerigin hangi bolumunun bugun panelden yonetilebildigini ve hangilerinin sonraki panel planina alinmasi gerektigini ayirir.

## Bugun Panelden Yonetilebilenler

| Alan | Panel yolu | Kaynak |
| --- | --- | --- |
| Bagis alanlari ve finansal havuzlar | `/panel/icerik/bagis-alanlari` | `campaigns`, `campaign-funding-pools` |
| Bagis alani kapak gorseli | Bagis alani sihirbazi | Supabase Storage `campaign-covers` |
| Kategoriler | `/panel/icerik/kategoriler` | `categories` |
| Haberler | `/panel/icerik/haberler` | `news` |
| Genel sayfa kayitlari | `/panel/icerik/sayfalar` | `pages` |
| Medya | `/panel/icerik/medya` | Payload media ve Supabase Storage |
| Bagis, dekont, odeme ve iade kayitlari | Finans/operasyon ekranlari | ilgili odeme tablolari |
| Saha gorevleri ve kanitlari | Operasyon ekranlari | `field-tasks`, kanit kayitlari |

Bagis alani icerigi TR, EN ve AR icin ayri locale kayitlariyla yonetilir. Bir dilde baslik veya kategori girilmemisse o dilde ilgili havuz public listede gosterilmez.

## Ana Sayfada Hala Statik Olanlar

Asagidaki alanlar artik `messages/tr.json`, `messages/en.json` ve `messages/ar.json` icinde uc dilde tutulur; bugun admin ekranindan degistirilemez:

- Hero basliklari ve aciklamalari
- Vakif tanitimi, degerler ve sayac metinleri
- Galeri sekme basliklari
- Hizli bagis kategori etiketleri
- Bagis sureci adimlari
- Ornek haber kartlari
- Gonullu hikayeleri
- Ahmet icin cocuk destek paketi metinleri
- Footer aciklamasi, link etiketleri, adres ve telif metni
- Video erisilebilirlik etiketleri

## Sonraki Admin Plani

Ana sayfanin bu bolumlerini yonetilebilir yapmak icin asagidaki koleksiyonlar onerilir:

1. `site-settings`
   - Kurum adi, slogan, telefon, e-posta, adres, sosyal medya baglantilari, footer telif metni.
   - Locale alanlari: kurum tanimi, slogan, adres gorunum metni.
2. `home-hero-slides`
   - Gorsel, sira, aktiflik, link ve her locale icin baslik/aciklama.
3. `home-feature-blocks`
   - Vakif tanitimi, ikon, sira ve her locale icin baslik/aciklama.
4. `impact-statistics`
   - Sayi, simge, sira ve her locale icin etiket/alt etiket.
5. `home-gallery-items`
   - Gorsel, sira, hedef URL ve her locale icin sekme adi.
6. `quick-donation-categories`
   - Simge, sira, aktiflik, hedef URL ve her locale icin kategori adi.
7. `home-process-steps`
   - Sira, simge ve her locale icin baslik/aciklama.
8. `testimonials`
   - Kisi adi, rol, puan, onay durumu ve her locale icin alinti/rol.
9. `orphan-support-packages`
   - Teknik kod, sabit fiyat/para birimi, gorsel, sira ve her locale icin paket adi ile tanitim metni.

## Haberler Icin Not

`news` koleksiyonu panelde mevcut; ancak ana sayfadaki uc kart su an tasarim ornegi olarak statik sozlukten geliyor. Bir sonraki adimda ana sayfanin haber bolumu `news` koleksiyonundan secili locale ile okunmali; statik ornek kartlar kaldirilmalidir.

## Icerik Kuralı

Kullaniciya gorunen her yeni koleksiyon alaninda `tr`, `en` ve `ar` locale destegi bulunmali. Public tarafta secili dilde icerik yoksa Turkce fallback yapilmamali; ilgili kart veya blok gizlenmelidir.
