import Link from "next/link";
import Image from "next/image";
import { Bell, ChevronRight } from "lucide-react";

import { PanelNavigation } from "@/components/admin/panel-navigation";
import { PanelSessionActions } from "@/components/admin/panel-session-actions";
import type { UserRole } from "@/lib/auth/roles";

export function ManagementShell({
  currentPath,
  role,
  name,
  children,
}: {
  currentPath: string;
  role: UserRole;
  name: string;
  children: React.ReactNode;
}) {
  return (
    <div className="admin-panel min-h-screen bg-[var(--admin-surface-deep)] text-[var(--admin-text)]">
      <div className="mx-auto min-h-screen max-w-[1680px] bg-[var(--admin-surface)] md:border-x md:border-[var(--admin-border)]">
        <header className="hidden h-[73px] items-center justify-between border-b border-[var(--admin-border)] bg-[var(--admin-surface-deep)] px-6 md:flex">
          <Link className="flex items-center gap-3" href="/panel">
            <Image alt="Mizan Derneği" className="rounded-full bg-[#f7f3ea] p-0.5" height={36} priority src="/mizan-logo.png" width={36} />
            <span>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--admin-primary)]">Mizan Derneği</span>
              <span className="mt-0.5 block text-sm font-semibold text-[var(--admin-text)]">Bağış Operasyon Merkezi</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="hidden text-right lg:block">
              <p className="text-sm font-medium text-[var(--admin-text)]">{name}</p>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--admin-muted)]">{role.replace("_", " ")}</p>
            </div>
            <button aria-label="Bildirimler" className="admin-icon-button" type="button">
              <Bell aria-hidden="true" className="size-[18px]" strokeWidth={1.8} />
            </button>
            <PanelSessionActions />
          </div>
        </header>
        <div className="grid min-h-[calc(100vh-73px)] md:grid-cols-[248px_minmax(0,1fr)]">
          <PanelNavigation currentPath={currentPath} name={name} role={role} />
          <main className="min-w-0 bg-[var(--admin-surface)] px-4 pb-24 pt-5 md:p-7 md:pb-8">
            <div className="mb-6 hidden items-center gap-2 text-xs text-[var(--admin-muted)] md:flex">
              <span>Panel</span>
              <ChevronRight aria-hidden="true" className="size-3" />
              <span className="text-[var(--admin-text)]">Operasyon yönetimi</span>
            </div>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
