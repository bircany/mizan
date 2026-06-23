"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import { useCart } from "@/lib/cart-context";
import { useCurrency } from "@/lib/currency-context";

const navLinks = [
  { href: "/hakkimizda", label: "Hakkımızda" },
  { href: "/bagis", label: "Kampanyalar" },
  { href: "/haberler", label: "Haberler" },
  { href: "/kurban", label: "Kurban" },
  { href: "/iletisim", label: "İletişim" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<"lang" | "currency" | null>(null);
  const { locale, setLocale, t } = useLanguage();
  const { items } = useCart();
  const { currency, setCurrency } = useCurrency();
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isActive = (href: string) => pathname === href;

  return (
    <>
      {/* HEADER TOP BAR - Matches Reference Screenshot */}
      <div className="relative z-[60] bg-[#f5f6f7] text-[#4f5e5a] border-b border-outline-variant/20 py-2.5 text-[13px] font-medium" ref={dropdownRef}>
        <div className="max-w-container-max mx-auto px-margin-desktop flex justify-between items-center">
          {/* Left Side */}
          <div className="flex items-center gap-md shrink-0">
            <a className="flex items-center gap-xs hover:text-primary transition-colors" href="tel:+902126312121">
              <span className="material-symbols-outlined text-[16px] text-primary/80">phone_iphone</span>
              <span>+90 212 631 21 21</span>
            </a>
            <span className="text-outline-variant/40">|</span>
            <button className="flex items-center gap-xs hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[16px] text-primary/80">check_circle</span>
              <span>Follow</span>
            </button>
          </div>

          {/* Right Side - Custom Interactive Dropdowns */}
          <div className="flex items-center gap-lg shrink-0">
            {/* Language Selection */}
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === "lang" ? null : "lang")}
                className="flex items-center gap-xs hover:text-primary transition-all font-semibold uppercase tracking-wider py-1 px-2.5 rounded-lg hover:bg-white/70"
              >
                <span className="material-symbols-outlined text-[18px] text-primary/80">language</span>
                <span>{locale === "tr" ? "TR" : locale === "en" ? "EN" : "AR"}</span>
                <span 
                  className="material-symbols-outlined text-[14px] transition-transform duration-200" 
                  style={{ transform: openDropdown === "lang" ? "rotate(180deg)" : "none" }}
                >
                  keyboard_arrow_down
                </span>
              </button>
              {openDropdown === "lang" && (
                <div className="absolute right-0 mt-2 w-32 bg-white rounded-xl shadow-lg border border-outline-variant/20 py-1.5 z-[70] animate-fade-in-up">
                  {(["tr", "en", "ar"] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => {
                        setLocale(lang);
                        setOpenDropdown(null);
                      }}
                      className={cn(
                        "w-full text-left px-4 py-2 text-label-sm flex items-center justify-between hover:bg-primary/5 hover:text-primary transition-colors",
                        locale === lang ? "text-primary font-bold bg-primary/5" : "text-on-surface-variant"
                      )}
                    >
                      <span>{lang.toUpperCase()}</span>
                      {locale === lang && <span className="material-symbols-outlined text-[16px]">check</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <span className="text-outline-variant/40">|</span>

            {/* Currency Selection */}
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === "currency" ? null : "currency")}
                className="flex items-center gap-xs hover:text-primary transition-all font-semibold uppercase tracking-wider py-1 px-2.5 rounded-lg hover:bg-white/70"
              >
                <span className="material-symbols-outlined text-[18px] text-primary/80">payments</span>
                <span>{currency}</span>
                <span 
                  className="material-symbols-outlined text-[14px] transition-transform duration-200" 
                  style={{ transform: openDropdown === "currency" ? "rotate(180deg)" : "none" }}
                >
                  keyboard_arrow_down
                </span>
              </button>
              {openDropdown === "currency" && (
                <div className="absolute right-0 mt-2 w-36 bg-white rounded-xl shadow-lg border border-outline-variant/20 py-1.5 z-[70] animate-fade-in-up">
                  {(["TRY", "USD", "EUR"] as const).map((curr) => (
                    <button
                      key={curr}
                      onClick={() => {
                        setCurrency(curr);
                        setOpenDropdown(null);
                      }}
                      className={cn(
                        "w-full text-left px-4 py-2 text-label-sm flex items-center justify-between hover:bg-primary/5 hover:text-primary transition-colors",
                        currency === curr ? "text-primary font-bold bg-primary/5" : "text-on-surface-variant"
                      )}
                    >
                      <span>{curr === "TRY" ? "TRY (₺)" : curr === "USD" ? "USD ($)" : "EUR (€)"}</span>
                      {currency === curr && <span className="material-symbols-outlined text-[16px]">check</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <header
        className={cn(
          "sticky top-0 z-50 bg-surface shadow-sm transition-all duration-300",
          scrolled && "py-2"
        )}
      >
        <nav className="max-w-container-max mx-auto px-margin-desktop py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-[#009000] flex items-center justify-center text-white text-lg font-bold shadow-sm">
              M
            </div>
            <span className="text-headline-xl font-bold text-[#009000]">Mizan Derneği</span>
          </Link>

          <div className="hidden md:flex items-center gap-lg text-label-md text-on-surface-variant">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "hover:text-primary transition-colors",
                  isActive(link.href) && "text-primary font-bold border-b-2 border-primary pb-1"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-md">
            <button className="p-2 text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined">search</span>
            </button>
            <Link href="/bagis" className="p-2 text-on-surface-variant hover:text-primary transition-colors relative">
              <span className="material-symbols-outlined">shopping_basket</span>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-secondary text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                  {cartCount}
                </span>
              )}
            </Link>
            <Link
              href="/bagis"
              className="bg-secondary text-white px-md py-2.5 rounded-lg text-label-md hover:bg-opacity-90 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">volunteer_activism</span>
              Bağış Yap
            </Link>
          </div>
        </nav>
      </header>
    </>
  );
}
