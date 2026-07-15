"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import { useCart } from "@/lib/cart-context";
import { useCurrency } from "@/lib/currency-context";

const navLinks = [
  { href: "/hakkimizda", label: "Hakkımızda" },
  { href: "/bagis", label: "Bağış Alanları" },
  { href: "/haberler", label: "Haberler" },
  { href: "/kurban", label: "Kurban" },
  { href: "/iletisim", label: "İletişim" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<"lang" | "currency" | null>(null);
  const { locale, setLocale } = useLanguage();
  const { items } = useCart();
  const { currency, setCurrency } = useCurrency();
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const isActive = (href: string) => pathname === href;

  return (
    <>
      {/* TOP BAR */}
      <div
        className={cn(
          "relative z-[60] py-2.5 text-[13px] font-medium transition-all duration-500",
          scrolled
            ? "bg-white/90 backdrop-blur-md border-b border-outline-variant/10 text-on-surface-variant/70"
            : "bg-[#F8F3EA] border-b border-outline-variant/40 text-on-surface-variant"
        )}
        ref={dropdownRef}
      >
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop flex justify-between items-center gap-2">
          {/* Left: Phone + Social */}
          <div className="flex items-center gap-3 sm:gap-5 shrink-0">
            <a
              className="flex items-center gap-1.5 hover:text-primary transition-colors"
              href="tel:+902126312121"
            >
              <span className="material-symbols-outlined text-[15px] text-primary/70">phone</span>
              <span className="hidden sm:inline tracking-wide">+90 212 631 21 21</span>
            </a>
            <span className="hidden sm:inline text-outline-variant/30">|</span>
            <button className="hidden sm:flex items-center gap-1.5 hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[15px] text-primary/70">share</span>
              <span className="tracking-wide">Takip Et</span>
            </button>
          </div>

          {/* Right: Lang + Currency */}
          <div className="flex items-center gap-1 sm:gap-4 shrink-0">
            {/* Language */}
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === "lang" ? null : "lang")}
                className="flex items-center gap-1 hover:text-primary transition-all py-1 px-2 rounded-md hover:bg-black/5"
              >
                <span className="material-symbols-outlined text-[16px] text-primary/70">language</span>
                <span className="font-semibold uppercase tracking-wider text-[12px]">
                  {locale === "tr" ? "TR" : locale === "en" ? "EN" : "AR"}
                </span>
                <span
                  className="material-symbols-outlined text-[13px] transition-transform duration-200"
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

            <span className="hidden sm:inline text-outline-variant/30">|</span>

            {/* Currency */}
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === "currency" ? null : "currency")}
                className="flex items-center gap-1 hover:text-primary transition-all py-1 px-2 rounded-md hover:bg-black/5"
              >
                <span className="material-symbols-outlined text-[16px] text-primary/70">payments</span>
                <span className="font-semibold uppercase tracking-wider text-[12px]">{currency}</span>
                <span
                  className="material-symbols-outlined text-[13px] transition-transform duration-200"
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

      {/* MAIN NAV */}
      <header
        className="sticky top-0 z-50 border-b border-outline-variant/20 bg-surface/95 shadow-[0_1px_8px_rgba(0,0,0,0.06)] backdrop-blur-md transition-all duration-500"
      >
        <nav className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop flex justify-between items-center h-16 lg:h-[72px]">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <Image
              src="/mizan-logo.png"
              alt="Mizan Derneği"
              width={44}
              height={44}
              priority
              className="h-11 w-11 rounded-full object-contain transition-transform duration-300 group-hover:scale-105"
            />
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative px-4 py-2 text-[14px] font-medium tracking-wide rounded-lg transition-all duration-300",
                  "text-on-surface-variant/80 hover:text-primary hover:bg-primary/5",
                  isActive(link.href) && cn(
                    "text-primary bg-primary/5"
                  )
                )}
              >
                {link.label}
                {isActive(link.href) && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-primary rounded-full" />
                )}
              </Link>
            ))}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Search */}
            <button
              className={cn(
                "p-2.5 rounded-full transition-all duration-200",
                "text-on-surface-variant/70 hover:text-primary hover:bg-primary/5"
              )}
              aria-label="Search"
            >
              <span className="material-symbols-outlined text-[20px]">search</span>
            </button>

            {/* Cart */}
            <Link
              href="/bagis"
              className={cn(
                "p-2.5 rounded-full transition-all duration-200 relative",
                "text-on-surface-variant/70 hover:text-primary hover:bg-primary/5"
              )}
              aria-label="Cart"
            >
              <span className="material-symbols-outlined text-[20px]">shopping_basket</span>
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-primary text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full shadow-sm px-1">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* CTA Button */}
            <Link
              href="/bagis"
              className="hidden sm:inline-flex items-center gap-2 bg-secondary text-white px-5 py-2.5 rounded-xl text-[14px] font-semibold shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            >
              <span className="material-symbols-outlined text-[18px]">volunteer_activism</span>
              Bağış Yap
            </Link>

            {/* Mobile Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={cn(
                "lg:hidden p-2.5 rounded-full transition-all duration-200",
                "text-on-surface-variant hover:bg-primary/5"
              )}
              aria-label="Toggle menu"
            >
              <span className="material-symbols-outlined text-[24px]">
                {mobileMenuOpen ? "close" : "menu"}
              </span>
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[90] lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Menu Panel */}
          <div className="absolute right-0 top-0 h-full w-80 max-w-[90vw] bg-white shadow-2xl animate-fade-left flex flex-col">
            {/* Mobile Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/15">
              <Link href="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2.5">
                <Image
                  src="/mizan-logo.png"
                  alt="Mizan Derneği"
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full object-contain"
                />
              </Link>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-full hover:bg-surface-container transition-colors"
                aria-label="Close menu"
              >
                <span className="material-symbols-outlined text-[24px] text-on-surface-variant">close</span>
              </button>
            </div>

            {/* Nav Links */}
            <nav className="flex-1 px-4 py-4 overflow-y-auto">
              <div className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-medium transition-all",
                      isActive(link.href)
                        ? "bg-primary/10 text-primary"
                        : "text-on-surface-variant hover:bg-surface-container hover:text-primary"
                    )}
                  >
                    <span className="material-symbols-outlined text-[20px] opacity-60">
                      {link.href === "/hakkimizda" ? "info" :
                       link.href === "/bagis" ? "volunteer_activism" :
                       link.href === "/haberler" ? "article" :
                       link.href === "/kurban" ? "pets" :
                       "mail"}
                    </span>
                    {link.label}
                    {isActive(link.href) && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </Link>
                ))}
              </div>
            </nav>

            {/* Mobile Footer */}
            <div className="px-6 pb-6 pt-4 border-t border-outline-variant/10">
              {/* Lang + Currency */}
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-6 mb-5">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary/70">language</span>
                  <div className="flex gap-1">
                    {(["tr", "en", "ar"] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setLocale(lang)}
                        className={cn(
                          "px-2.5 py-1 rounded-md text-[12px] font-semibold uppercase tracking-wider transition-all",
                          locale === lang
                            ? "bg-primary text-white"
                            : "text-on-surface-variant/70 hover:bg-surface-container"
                        )}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>
                <span className="text-outline-variant/30">|</span>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary/70">payments</span>
                  <div className="flex gap-1">
                    {(["TRY", "USD", "EUR"] as const).map((curr) => (
                      <button
                        key={curr}
                        onClick={() => setCurrency(curr)}
                        className={cn(
                          "px-2.5 py-1 rounded-md text-[12px] font-semibold transition-all",
                          currency === curr
                            ? "bg-primary text-white"
                            : "text-on-surface-variant/70 hover:bg-surface-container"
                        )}
                      >
                        {curr}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* CTA */}
              <Link
                href="/bagis"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full bg-secondary text-white px-5 py-3.5 rounded-xl text-[15px] font-semibold shadow-sm hover:shadow-md transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">volunteer_activism</span>
                Bağış Yap
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
