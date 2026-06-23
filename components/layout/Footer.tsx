import Link from "next/link";

const footerLinks = {
  bagis: [
    { href: "#", label: "Su Kuyusu Bağışları" },
    { href: "#", label: "Yetim Destek Sistemi" },
    { href: "#", label: "Kurban Organizasyonu" },
    { href: "#", label: "İslami Eğitim Yardımları" },
    { href: "#", label: "Mescid & Medrese İnşaatı" },
  ],
  hizli: [
    { href: "/hakkimizda", label: "Hakkımızda" },
    { href: "#", label: "Gönüllü Ol" },
    { href: "#", label: "Faaliyet Raporları" },
    { href: "#", label: "Banka Hesap Bilgileri" },
    { href: "#", label: "KVKK & Gizlilik" },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-on-background text-white pt-xl pb-md">
      <div className="max-w-container-max mx-auto px-margin-desktop">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-xl mb-xl">
          <div className="space-y-lg">
            <span className="text-headline-md font-bold text-secondary">Mizan Derneği</span>
            <p className="text-body-md opacity-60">
              Elbistan merkezli Mizan Derneği, dünyanın dört bir yanındaki mazlumlara
              denge ve umut olmak için yola çıkmıştır.
            </p>
            <div className="flex gap-md">
              <a className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center hover:bg-secondary transition-all" href="#">
                <span className="material-symbols-outlined">public</span>
              </a>
              <a className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center hover:bg-secondary transition-all" href="#">
                <span className="material-symbols-outlined">play_circle</span>
              </a>
            </div>
          </div>

          <div>
            <h5 className="text-headline-md mb-lg text-secondary">Bağış Kategorileri</h5>
            <ul className="space-y-sm text-label-md opacity-80">
              {footerLinks.bagis.map((link) => (
                <li key={link.label}>
                  <a className="hover:text-secondary transition-colors" href={link.href}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h5 className="text-headline-md mb-lg text-secondary">Hızlı Menü</h5>
            <ul className="space-y-sm text-label-md opacity-80">
              {footerLinks.hizli.map((link) => (
                <li key={link.label}>
                  <Link className="hover:text-secondary transition-colors" href={link.href}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h5 className="text-headline-md mb-lg text-secondary">İletişim</h5>
            <div className="space-y-md text-label-md opacity-80">
              <div className="flex items-start gap-md">
                <span className="material-symbols-outlined text-secondary">location_on</span>
                <p>
                  Yeşilyurt Mah. Güvenlik Cad. No:22
                  <br />
                  Elbistan, Kahramanmaraş
                </p>
              </div>
              <div className="flex items-center gap-md">
                <span className="material-symbols-outlined text-secondary">mail</span>
                <p>bilgi@mizandernegi.org.tr</p>
              </div>
              <div className="flex items-center gap-md">
                <span className="material-symbols-outlined text-secondary">phone_in_talk</span>
                <p>+90 344 XXX XX XX</p>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-lg border-t border-outline-variant/20 text-center">
          <p className="text-label-sm opacity-40">
            © 2024 Mizan Derneği. Tüm Hakları Saklıdır.
          </p>
        </div>
      </div>
    </footer>
  );
}
