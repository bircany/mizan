import Link from "next/link";

const footerLinks = {
  hizli: [
    { href: "/hakkimizda", label: "Hakkımızda" },
    { href: "#", label: "Medreselerimiz" },
    { href: "#", label: "Faaliyetlerimiz" },
    { href: "#", label: "Talebe Ol" },
    { href: "/bagis", label: "Bağış ve Destek" },
    { href: "/iletisim", label: "İletişim" },
  ],
  yasal: [
    { href: "#", label: "KVKK Aydınlatma Metni" },
    { href: "#", label: "Gizlilik Politikası" },
    { href: "#", label: "Çerez Politikası" },
    { href: "#", label: "Kullanım Koşulları" },
    { href: "#", label: "Bağış ve Destek Şartları" },
  ],
};

const socialLinks = [
  {
    href: "#",
    label: "Instagram",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 448 512" fill="currentColor">
        <path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z" />
      </svg>
    ),
  },
  {
    href: "#",
    label: "Facebook",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 512 512" fill="currentColor">
        <path d="M504 256C504 119 393 8 256 8S8 119 8 256c0 123.78 90.69 226.38 209.25 245V327.69h-63V256h63v-54.64c0-62.15 37-96.48 93.67-96.48 27.14 0 55.52 4.84 55.52 4.84v61h-31.28c-30.8 0-40.41 19.12-40.41 38.73V256h68.78l-11 71.69h-57.78V501C413.31 482.38 504 379.78 504 256z" />
      </svg>
    ),
  },
  {
    href: "#",
    label: "YouTube",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 576 512" fill="currentColor">
        <path d="M549.655 124.083c-6.281-23.65-24.787-42.276-48.284-48.597C458.781 64 288 64 288 64S117.22 64 74.629 75.486c-23.497 6.322-42.003 24.947-48.284 48.597-11.412 42.867-11.412 132.305-11.412 132.305s0 89.438 11.412 132.305c6.281 23.65 24.787 41.5 48.284 47.821C117.22 448 288 448 288 448s170.78 0 213.371-11.486c23.497-6.321 42.003-24.171 48.284-47.821 11.412-42.867 11.412-132.305 11.412-132.305s0-89.438-11.412-132.305zm-317.51 213.508V175.185l142.739 81.205-142.739 81.201z" />
      </svg>
    ),
  },
  {
    href: "#",
    label: "Twitter",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 512 512" fill="currentColor">
        <path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z" />
      </svg>
    ),
  },
];

export default function Footer() {
  return (
    <footer className="relative bg-[#1a2416] text-white pt-24 pb-5 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative z-10 max-w-container-max mx-auto px-margin-desktop">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-14 mb-16">
          <div className="lg:pr-12">
            <span className="text-headline-md font-bold text-gold">Mizan Derneği</span>
            <p className="text-base text-white/55 leading-relaxed mt-5 mb-8">
              Elbistan merkezli Mizan Derneği, dünyanın dört bir yanındaki mazlumlara
              denge ve umut olmak için yola çıkmıştır.
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-gold hover:border-gold/30 transition-all duration-200"
                  aria-label={social.label}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-base font-semibold text-white mb-5">
              Hızlı Erişim
            </h4>
            <div className="w-12 h-[2px] bg-gold/40 rounded-full mb-5" />
            <ul className="space-y-3 text-base text-white/55">
              {footerLinks.hizli.map((link) => (
                <li key={link.label}>
                  <Link
                    className="hover:text-gold transition-colors duration-200"
                    href={link.href}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-base font-semibold text-white mb-5">
              Yasal Politikalar
            </h4>
            <div className="w-12 h-[2px] bg-gold/40 rounded-full mb-5" />
            <ul className="space-y-3 text-base text-white/55">
              {footerLinks.yasal.map((link) => (
                <li key={link.label}>
                  <Link
                    className="hover:text-gold transition-colors duration-200"
                    href={link.href}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-base font-semibold text-white mb-5">
              İletişim
            </h4>
            <div className="w-12 h-[2px] bg-gold/40 rounded-full mb-5" />
            <div className="space-y-5 text-base text-white/55">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-gold/60 mt-0.5 text-[20px]">
                  location_on
                </span>
                <p>
                  Yeşilyurt Mah. Güvenlik Cad. No:22
                  <br />
                  Elbistan, Kahramanmaraş
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-gold/60 text-[20px]">
                  mail
                </span>
                <a
                  href="mailto:bilgi@mizandernegi.org.tr"
                  className="hover:text-gold transition-colors duration-200"
                >
                  bilgi@mizandernegi.org.tr
                </a>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-gold/60 text-[20px]">
                  phone_in_talk
                </span>
                <a
                  href="tel:+90344XXX"
                  className="hover:text-gold transition-colors duration-200"
                >
                  +90 344 XXX XX XX
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-white/8 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-[13px] text-white/35">
            © 2024 Mizan Derneği. Tüm Hakları Saklıdır.
          </p>
          <p className="text-[13px] text-white/25">
            Mizan İnsani Yardım Derneği
          </p>
        </div>
      </div>
    </footer>
  );
}
