import type { UserRole } from "@/lib/auth/roles";
import { hasRole } from "@/lib/auth/roles";

const ALL_PANEL_ROLES = ["super_admin", "finance", "approver", "field_operator"] as const;

export const PANEL_ROUTE_ACCESS = {
  dashboard: ALL_PANEL_ROLES,
  contentCampaigns: ["super_admin"],
  contentCategories: ["super_admin"],
  contentNews: ["super_admin"],
  contentPages: ["super_admin"],
  contentMedia: ["super_admin"],
  donations: ["super_admin", "finance"],
  payments: ["super_admin", "finance"],
  refunds: ["super_admin", "finance"],
  fulfillments: ["super_admin", "finance"],
  reports: ["super_admin", "approver"],
  fieldTasks: ["super_admin", "approver", "field_operator"],
  fieldSubmissions: ["super_admin", "approver", "field_operator"],
  qurbani: ["super_admin", "field_operator"],
  users: ["super_admin"],
  auditLogs: ["super_admin"],
  systemPayments: ["super_admin"],
} as const satisfies Record<string, readonly UserRole[]>;

export type PanelRouteKey = keyof typeof PANEL_ROUTE_ACCESS;

export type PanelNavigationItem = {
  href: string;
  icon: PanelNavigationIcon;
  isAvailable: boolean;
  label: string;
  roles: readonly UserRole[];
  route: PanelRouteKey;
};

export type PanelNavigationGroup = {
  id: "workspace" | "content" | "finance" | "field" | "governance";
  items: readonly PanelNavigationItem[];
  label: string;
};

export type PanelNavigationIcon =
  | "dashboard"
  | "campaigns"
  | "categories"
  | "news"
  | "pages"
  | "media"
  | "donations"
  | "payments"
  | "refunds"
  | "fulfillments"
  | "reports"
  | "fieldTasks"
  | "fieldSubmissions"
  | "qurbani"
  | "users"
  | "auditLogs"
  | "systemPayments";

export type PanelQuickAccessItem = {
  href: string;
  icon: PanelNavigationIcon;
  key: string;
  label: string;
  roles: readonly UserRole[];
};

/**
 * Paneldeki görünürlük, sayfa erişimi ve gelecekteki modül sırası tek kaynaktan yönetilir.
 * Henüz taşınmamış modüller isAvailable false kalır; menüde kırık bağlantı oluşmaz.
 */
export const PANEL_NAVIGATION_GROUPS: readonly PanelNavigationGroup[] = [
  {
    id: "workspace",
    label: "Çalışma alanı",
    items: [
      {
        href: "/panel",
        icon: "dashboard",
        isAvailable: true,
        label: "Genel bakış",
        roles: PANEL_ROUTE_ACCESS.dashboard,
        route: "dashboard",
      },
    ],
  },
  {
    id: "content",
    label: "İçerik yönetimi",
    items: [
      { href: "/panel/icerik/bagis-alanlari", icon: "campaigns", isAvailable: true, label: "Bağış alanları", roles: PANEL_ROUTE_ACCESS.contentCampaigns, route: "contentCampaigns" },
      { href: "/panel/icerik/kategoriler", icon: "categories", isAvailable: true, label: "Kategoriler", roles: PANEL_ROUTE_ACCESS.contentCategories, route: "contentCategories" },
      { href: "/panel/icerik/haberler", icon: "news", isAvailable: true, label: "Haberler", roles: PANEL_ROUTE_ACCESS.contentNews, route: "contentNews" },
      { href: "/panel/icerik/sayfalar", icon: "pages", isAvailable: true, label: "Sayfalar", roles: PANEL_ROUTE_ACCESS.contentPages, route: "contentPages" },
      { href: "/panel/icerik/medya", icon: "media", isAvailable: true, label: "Medya", roles: PANEL_ROUTE_ACCESS.contentMedia, route: "contentMedia" },
    ],
  },
  {
    id: "finance",
    label: "Bağış ve finans",
    items: [
      { href: "/panel/bagislar", icon: "donations", isAvailable: true, label: "Bağışlar", roles: PANEL_ROUTE_ACCESS.donations, route: "donations" },
      { href: "/panel/odemeler", icon: "payments", isAvailable: true, label: "Ödeme izleme", roles: PANEL_ROUTE_ACCESS.payments, route: "payments" },
      { href: "/panel/iadeler", icon: "refunds", isAvailable: true, label: "İade ve iptal", roles: PANEL_ROUTE_ACCESS.refunds, route: "refunds" },
      { href: "/panel/teslimatlar", icon: "fulfillments", isAvailable: true, label: "Makbuz ve teslim", roles: PANEL_ROUTE_ACCESS.fulfillments, route: "fulfillments" },
      { href: "/panel/raporlar", icon: "reports", isAvailable: true, label: "Raporlar ve onay", roles: PANEL_ROUTE_ACCESS.reports, route: "reports" },
    ],
  },
  {
    id: "field",
    label: "Operasyon",
    items: [
      { href: "/panel/kurban", icon: "qurbani", isAvailable: true, label: "Kurban operasyonu", roles: PANEL_ROUTE_ACCESS.qurbani, route: "qurbani" },
      { href: "/panel/saha", icon: "fieldTasks", isAvailable: true, label: "Saha görevleri", roles: PANEL_ROUTE_ACCESS.fieldTasks, route: "fieldTasks" },
      { href: "/panel/saha/teslimler", icon: "fieldSubmissions", isAvailable: true, label: "Teslimler", roles: PANEL_ROUTE_ACCESS.fieldSubmissions, route: "fieldSubmissions" },
    ],
  },
  {
    id: "governance",
    label: "Sistem yönetimi",
    items: [
      { href: "/panel/kullanicilar", icon: "users", isAvailable: true, label: "Kullanıcılar ve roller", roles: PANEL_ROUTE_ACCESS.users, route: "users" },
      { href: "/panel/denetim", icon: "auditLogs", isAvailable: true, label: "Denetim kayıtları", roles: PANEL_ROUTE_ACCESS.auditLogs, route: "auditLogs" },
      { href: "/panel/sistem/odemeler", icon: "systemPayments", isAvailable: true, label: "Teknik ödeme kayıtları", roles: PANEL_ROUTE_ACCESS.systemPayments, route: "systemPayments" },
    ],
  },
];

export const PANEL_NAV_ITEMS = PANEL_NAVIGATION_GROUPS.flatMap((group) =>
  group.items.filter((item) => item.isAvailable),
);

/** Safe, curated destinations used by the shared dashboard shortcuts. */
export const PANEL_QUICK_ACCESS_ITEMS: readonly PanelQuickAccessItem[] = [
  { key: "campaigns", label: "Bağış alanları", href: "/panel/icerik/bagis-alanlari", icon: "campaigns", roles: PANEL_ROUTE_ACCESS.contentCampaigns },
  { key: "news", label: "Haberler", href: "/panel/icerik/haberler", icon: "news", roles: PANEL_ROUTE_ACCESS.contentNews },
  { key: "media", label: "Medya", href: "/panel/icerik/medya", icon: "media", roles: PANEL_ROUTE_ACCESS.contentMedia },
  { key: "payments", label: "Ödeme izleme", href: "/panel/odemeler", icon: "payments", roles: PANEL_ROUTE_ACCESS.payments },
  { key: "fulfillments", label: "Makbuz ve teslim", href: "/panel/teslimatlar", icon: "fulfillments", roles: PANEL_ROUTE_ACCESS.fulfillments },
  { key: "reports", label: "Raporlar", href: "/panel/raporlar", icon: "reports", roles: PANEL_ROUTE_ACCESS.reports },
  { key: "quick-stock", label: "Hızlı kurbanlık ekle", href: "/panel/kurban?section=sales&action=quick-stock", icon: "qurbani", roles: PANEL_ROUTE_ACCESS.qurbani },
] as const;

export const DEFAULT_PANEL_QUICK_ACCESS_KEYS = [
  "campaigns",
  "news",
  "media",
  "payments",
  "fulfillments",
  "reports",
] as const;

export function getPanelQuickAccessItem(key: string) {
  return PANEL_QUICK_ACCESS_ITEMS.find((item) => item.key === key);
}

export function canAccessPanelRoute(role: string | null | undefined, route: keyof typeof PANEL_ROUTE_ACCESS) {
  return hasRole(role, PANEL_ROUTE_ACCESS[route]);
}

export function canAccessPayloadApi(role: string | null | undefined) {
  return hasRole(role, ["super_admin"]);
}

export function getSafePanelReturnTo(value: string | null | undefined) {
  if (!value || !value.startsWith("/panel") || value.startsWith("//")) {
    return "/panel";
  }

  return value;
}
