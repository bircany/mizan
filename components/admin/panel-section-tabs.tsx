import Link from "next/link";

import { cn } from "@/lib/utils";

export type PanelSectionTab = {
  count?: number;
  id: string;
  label: string;
};

export function PanelSectionTabs({
  activeTab,
  basePath,
  tabs,
}: {
  activeTab: string;
  basePath: string;
  tabs: readonly PanelSectionTab[];
}) {
  return (
    <nav aria-label="Bölüm sekmeleri" className="overflow-x-auto border-b border-[var(--admin-border)]">
      <div className="flex min-w-max gap-1">
        {tabs.map((tab) => (
          <Link
            aria-current={activeTab === tab.id ? "page" : undefined}
            className={cn("admin-tab inline-flex items-center gap-2", activeTab === tab.id && "admin-tab-active")}
            href={`${basePath}?tab=${tab.id}`}
            key={tab.id}
            scroll={false}
          >
            {tab.label}
            {typeof tab.count === "number" ? (
              <span className="rounded-full bg-[var(--admin-surface-muted)] px-2 py-0.5 font-mono text-[10px] text-[var(--admin-muted)]">
                {tab.count}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </nav>
  );
}
