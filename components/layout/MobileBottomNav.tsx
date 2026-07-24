"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useCart } from "@/lib/cart-context";
import { useLanguage } from "@/lib/language-context";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { items } = useCart();
  const { t } = useLanguage();

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const navItems = [
    { href: "/", label: t("common.home"), icon: "home" },
    { href: "/bagis", label: t("common.donate"), icon: "favorite" },
    { href: "/bagis", label: t("common.cart"), icon: "shopping_bag", isCart: true },
    { href: "/panel/giris", label: t("navigation.login"), icon: "person" },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-surface/95 border-t border-outline-variant/20 px-4 py-2.5 z-50 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur-md pb-safe-bottom">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center text-center py-0.5 flex-1 relative transition-all duration-300",
                active ? "text-primary scale-105" : "text-on-surface-variant hover:text-primary"
              )}
            >
              <div className="relative flex items-center justify-center">
                <span 
                  className="material-symbols-outlined text-[24px] transition-transform duration-300 hover:scale-110"
                  style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {item.icon}
                </span>
                {item.isCart && cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-secondary text-white text-[10px] w-4.5 h-4.5 flex items-center justify-center rounded-full font-bold shadow-sm animate-pulse">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-[10px] mt-1 font-medium tracking-wide uppercase transition-colors duration-300",
                active ? "text-primary font-bold" : "text-on-surface-variant/80"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
