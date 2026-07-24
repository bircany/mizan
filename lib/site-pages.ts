export type ManagedSitePageDefinition = {
  slug: string;
  title: string;
  content: string;
};

export const MANAGED_SITE_PAGES: readonly ManagedSitePageDefinition[] = [
  {
    slug: "iletisim",
    title: "İletişim",
    content: `Adres
Şehit Mehmet Efendi Bulvarı No:42
Elbistan / Kahramanmaraş

Telefon ve WhatsApp
0552 402 67 38

E-posta
info@mizandernegi.org
bagis@mizandernegi.org

Çalışma saatleri
Hafta içi: 09:00 - 18:00
Cumartesi: 09:00 - 13:00
Pazar: Kapalı`,
  },
  {
    slug: "hakkimizda",
    title: "Hakkımızda",
    content: `Mizan Derneği; toplumsal dayanışma ve yardımlaşma ruhunu, adalet ve denge terazisinde insanlığa ulaştırmak için çalışır.

Misyonumuz; kriz bölgelerinden eğitime, acil yardımdan sürdürülebilir kalkınmaya kadar her alanda iyilik mizanını korumak ve adaleti tesis etmektir.

Mizan Derneği, yaraları sarmak ve toplumsal dayanışmayı güçlendirmek amacıyla kuruldu. Acil yardım çalışmalarının yanında su kuyuları, kurban organizasyonları ve eğitim destekleriyle iyilik ağını büyütmektedir.`,
  },
  {
    slug: "kvkk-aydinlatma-metni",
    title: "KVKK Aydınlatma Metni",
    content: `Veri sorumlusu Mizan Derneği'dir. Başvuru kanalı ve kayıtlı elektronik iletişim adresi kurumsal alan adı devreye alındığında bu sayfada güncellenir.

Alıcı ve hisse sahiplerinin ad-soyad, telefon, e-posta, adres, ülke, kimlik veya pasaport bilgileri; ödeme, dekont, dijital veya telefon vekâleti, kurban kodu, erişim ve mesaj teslim kayıtları işlenebilir.

Veriler; bağışın ve vekâletin kurulması veya ifası, ödeme ve muhasebe yükümlülükleri, kapasite planlaması, saha görevinin kanıtlanması, kişisel videonun güvenli sunulması ve taleplerin sonuçlandırılması amaçlarıyla işlenir.

Video bağlantıları tahmin edilemez ve iptal edilebilir yapıdadır. KVKK'nın 11. maddesi kapsamındaki talepler derneğin ilan ettiği başvuru kanalından iletilebilir.`,
  },
  {
    slug: "cerez-politikasi",
    title: "Çerez Politikası",
    content: `Bu politika, web sitesinin çalışması için kullanılan çerezler ve tercihlerinize ilişkin bilgileri açıklar.

Oturum, dil, sepet ve güvenlik işlevleri için zorunlu çerezler kullanılabilir. Bu çerezler olmadan ödeme ve temel site işlevleri çalışmayabilir.

Tarayıcı ayarlarınızdan çerezleri silebilir veya engelleyebilirsiniz. Çerezleri engellemek, sepet ve ödeme gibi temel işlevleri etkileyebilir.`,
  },
  {
    slug: "gizlilik-politikasi",
    title: "Gizlilik Politikası",
    content: `Mizan Derneği, bağışçılarının ve ziyaretçilerinin bilgilerini korumaya önem verir.

Kart numarası ve CVV bilgileri Mizan Derneği sunucularında tutulmaz. Kartla ödeme, iyzico'nun güvenli Checkout Form altyapısında gerçekleşir.

Verilere erişim; yetkilendirme, kayıt, şifreleme ve güvenlik kontrolleri ile sınırlandırılır. Yetkili hizmet sağlayıcılar yalnızca hizmetin sunulması için gerekli veriye erişir.

Veriler, bağış ilişkisinin yürütülmesi ve yasal saklama yükümlülükleri için gerekli süre boyunca saklanır; süre sonunda silinir, yok edilir veya anonim hâle getirilir.`,
  },
  {
    slug: "kullanim-kosullari",
    title: "Kullanım Koşulları",
    content: `Bu koşullar, Mizan Derneği web sitesinin kullanımına ilişkindir.

Siteyi kullanarak bu koşulları kabul etmiş olursunuz. Site içeriği bilgilendirme amaçlıdır; güncel bağış koşulları ödeme öncesinde ayrıca sunulur.

Siteyi hukuka aykırı, yanıltıcı, hizmeti aksatacak veya başka kişilerin haklarını ihlal edecek biçimde kullanamazsınız.

Sitedeki marka, metin, görsel ve diğer içerikler Mizan Derneği veya ilgili hak sahiplerine aittir. Yazılı izin olmadan ticari kullanım yapılamaz.`,
  },
  {
    slug: "bagis-ve-destek-sartlari",
    title: "Bağış ve Destek Şartları",
    content: `Bu şartlar, Mizan Derneği üzerinden yapılan bağışlar ile kurban hisse rezervasyonu ve vekâlet sürecine ilişkindir.

Kartlı bağış, iyzico tarafından başarıyla doğrulandıktan; EFT bağışı ise dekont ve banka hareketi yetkili yönetici tarafından onaylandıktan sonra kesinleşir. Tutarlar sunucuda güncel kurbanlık seçeneği fiyatına ve hisse sayısına göre hesaplanır.

Kartlı ödeme için kapasite 30 dakika, EFT için 24 saat geçici olarak ayrılır. Aynı siparişteki hisseler tek kurban havuzunda tutulur. Ödeme kesinleşmeden havuz dolmuş sayılmaz.

Kesim videosu yalnız kişiye özel, iptal edilebilir bağlantı ile paylaşılır. İade talepleri; mevzuat, sağlayıcı kuralları ve operasyon durumu birlikte değerlendirilerek sonuçlandırılır.`,
  },
] as const;

const bySlug = new Map(MANAGED_SITE_PAGES.map((page) => [page.slug, page]));

export function getManagedSitePage(slug: string) {
  return bySlug.get(slug);
}

export function isManagedSitePageSlug(slug: string) {
  return bySlug.has(slug);
}

export function managedSitePagePath(slug: string) {
  return isManagedSitePageSlug(slug) ? `/${slug}` : `/sayfa/${slug}`;
}
