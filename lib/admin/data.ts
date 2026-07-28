import { redirect } from "next/navigation";

import type { UserRole } from "@/lib/auth/roles";
import { canManageFinance, hasRole } from "@/lib/auth/roles";
import { getAdminSession } from "@/lib/auth/session";
import { getPayloadClient } from "@/lib/payload";
export { getQurbaniAdminSnapshot } from "@/lib/admin/qurbani-data";

export type AdminUser = {
  id: string | number;
  email: string;
  role: UserRole;
  name?: string;
};

export async function requireAdminUser(allowedRoles?: readonly string[]): Promise<AdminUser> {
  const user = await getAdminSession();
  if (!user?.email || !user?.role) {
    redirect("/panel/giris");
  }

  if (allowedRoles && !hasRole(user.role, allowedRoles)) {
    redirect("/panel");
  }

  return user as unknown as AdminUser;
}

export async function getManagementSnapshot(user: AdminUser) {
  const payload = await getPayloadClient();
  const hasFinanceAccess = canManageFinance(user.role);

  async function safeFind(collection: string, options: Record<string, unknown>, label: string) {
    try {
      return await payload.find({
        collection,
        pagination: false,
        ...options,
      });
    } catch (error) {
      console.warn(`${label} okunamadi, bos liste kullaniliyor.`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return undefined;
    }
  }

  const donations = hasFinanceAccess
    ? await safeFind("donations", { limit: 5, sort: "-createdAt" }, "donations ozeti")
    : undefined;
  const sessions = hasFinanceAccess
    ? await safeFind("payment-sessions", { limit: 5, sort: "-createdAt" }, "payment-sessions ozeti")
    : undefined;
  const refunds = hasFinanceAccess
    ? await safeFind("refund-requests", { limit: 5, sort: "-createdAt" }, "refund-requests ozeti")
    : undefined;
  const paymentEvents = hasFinanceAccess
    ? await safeFind("payment-events", { limit: 10, sort: "-createdAt" }, "payment-events ozeti")
    : undefined;

  const donationDocs = donations?.docs ?? [];
  const sessionDocs = sessions?.docs ?? [];
  const refundDocs = refunds?.docs ?? [];
  const paymentEventDocs = paymentEvents?.docs ?? [];

  const paidTotal = donationDocs
    .filter((item) => item.status === "paid" || item.status === "partially_refunded")
    .reduce((sum, item) => sum + (item.netConfirmedAmount || 0), 0);

  return {
    metrics: {
      paidTotal,
      donations: donations?.totalDocs ?? 0,
      pendingReview: donationDocs.filter((item) => item.status === "pending_review").length,
      refundQueue: refundDocs.filter((item) => item.status !== "completed").length,
      fieldQueue: 0,
      reportsToApprove: 0,
    },
    donations: donationDocs,
    sessions: sessionDocs,
    refunds: refundDocs,
    fieldTasks: [],
    reports: [],
    paymentEvents: paymentEventDocs,
  };
}
