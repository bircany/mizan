"use client";

import Link from "next/link";
import NextImage from "next/image";
import { useState } from "react";
import {
  BarChart3,
  ClipboardCheck,
  FileText,
  FileCheck2,
  Folder,
  HandCoins,
  Image,
  LayoutDashboard,
  Menu,
  Newspaper,
  ReceiptText,
  ScrollText,
  Tag,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { UserRole } from "@/lib/auth/roles";
import { hasRole } from "@/lib/auth/roles";
import { PANEL_NAVIGATION_GROUPS, type PanelNavigationIcon, type PanelRouteKey } from "@/lib/auth/panel-access";
import { cn } from "@/lib/utils";

const icons: Record<PanelNavigationIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  campaigns: Folder,
  categories: Tag,
  news: Newspaper,
  pages: FileText,
  media: Image,
  donations: HandCoins,
  payments: WalletCards,
  refunds: ReceiptText,
  fulfillments: ReceiptText,
  reports: BarChart3,
  fieldTasks: FileCheck2,
  fieldSubmissions: ClipboardCheck,
  users: Users,
  auditLogs: ScrollText,
  systemPayments: WalletCards,
};

const mobileRoutePriority: readonly PanelRouteKey[] = [
  "dashboard",
  "donations",
  "payments",
  "fulfillments",
  "fieldTasks",
  "reports",
  "fieldSubmissions",
  "users",
];

type PanelNavigationProps = {
  currentPath: string;
  name: string;
  role: UserRole;
};

export function PanelNavigation({ currentPath, name, role }: PanelNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const groups = PANEL_NAVIGATION_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => item.isAvailable && hasRole(role, item.roles as readonly UserRole[]),
    ),
  })).filter((group) => group.items.length > 0);
  const items = groups.flatMap((group) => group.items);
  const mobileItems = mobileRoutePriority
    .map((route) => items.find((item) => item.route === route))
    .filter((item): item is (typeof items)[number] => Boolean(item))
    .slice(0, 5);

  const navigation = (variant: "desktop" | "mobile") => (
    <nav
      aria-label="Panel navigasyonu"
      className={cn("flex", variant === "desktop" ? "flex-col gap-1" : "flex-col gap-2")}
    >
      {groups.map((group) => (
        <div className="space-y-1" key={group.id}>
          {groups.length > 1 ? <p className="admin-nav-group-label">{group.label}</p> : null}
          {group.items.map((item) => {
            const Icon = icons[item.icon];
            const active = currentPath === item.href || (item.href !== "/panel" && currentPath.startsWith(`${item.href}/`));

            return (
              <Link
                className={cn(
                  "admin-nav-link",
                  active && "admin-nav-link-active",
                  variant === "mobile" && "min-h-12 text-base",
                )}
                href={item.href}
                key={item.href}
                onClick={() => setIsOpen(false)}
              >
                <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.8} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  return (
    <>
      <aside className="hidden border-r border-[var(--admin-border)] bg-[var(--admin-surface-deep)] p-4 md:block">
        <div className="mb-5 flex items-center gap-3 border-b border-[var(--admin-border)] pb-5">
          <NextImage alt="Mizan Derneği" className="rounded-full bg-[#f7f3ea] p-0.5" height={36} src="/mizan-logo.png" width={36} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--admin-text)]">{name}</p>
            <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--admin-muted)]">
              {role.replace("_", " ")}
            </p>
          </div>
        </div>
        {navigation("desktop")}
      </aside>

      <div className="flex items-center justify-between border-b border-[var(--admin-border)] bg-[var(--admin-surface-deep)] px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <NextImage alt="Mizan Derneği" className="rounded-full bg-[#f7f3ea] p-0.5" height={32} src="/mizan-logo.png" width={32} />
          <span className="text-sm font-semibold text-[var(--admin-text)]">Operasyon Merkezi</span>
        </div>
        <button
          aria-controls="panel-mobile-navigation"
          aria-expanded={isOpen}
          aria-label="Panel menüsünü aç"
          className="admin-icon-button"
          onClick={() => setIsOpen(true)}
          type="button"
        >
          <Menu aria-hidden="true" className="size-5" />
        </button>
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-50 md:hidden" id="panel-mobile-navigation">
          <button
            aria-label="Panel menüsünü kapat"
            className="absolute inset-0 bg-black/70"
            onClick={() => setIsOpen(false)}
            type="button"
          />
          <aside className="relative h-full w-[min(20rem,86vw)] border-r border-[var(--admin-border)] bg-[var(--admin-surface-deep)] p-4 shadow-[16px_0_36px_rgba(0,0,0,0.45)]">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--admin-primary)]">Mizan</p>
                <p className="mt-1 text-base font-semibold text-[var(--admin-text)]">Operasyon Merkezi</p>
              </div>
              <button
                aria-label="Panel menüsünü kapat"
                className="admin-icon-button"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>
            {navigation("mobile")}
          </aside>
        </div>
      ) : null}

      <nav aria-label="Hızlı navigasyon" className="admin-bottom-nav md:hidden" style={{ gridTemplateColumns: `repeat(${Math.max(mobileItems.length, 1)}, minmax(0, 1fr))` }}>
        {mobileItems.map((item) => {
          const Icon = icons[item.icon];
          const active = currentPath === item.href || (item.href !== "/panel" && currentPath.startsWith(`${item.href}/`));

          return (
            <Link className={cn("admin-bottom-nav-link", active && "admin-bottom-nav-link-active")} href={item.href} key={item.href}>
              <Icon aria-hidden="true" className="size-[18px]" strokeWidth={1.8} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
