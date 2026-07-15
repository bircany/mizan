import { redirect } from "next/navigation";

import type { UserRole } from "@/lib/auth/roles";
import { canManageFinance, canReviewFieldWork, hasRole } from "@/lib/auth/roles";
import { getAdminSession } from "@/lib/auth/session";
import { getPayloadClient } from "@/lib/payload";

export type AdminUser = {
  id: string | number;
  email: string;
  role: UserRole;
  name?: string;
};

export async function requireAdminUser(allowedRoles?: readonly UserRole[]): Promise<AdminUser> {
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
  const canReview = canReviewFieldWork(user.role);
  const isFieldOperator = user.role === "field_operator";

  const [donations, sessions, refunds, fieldTasks, reports, paymentEvents] = await Promise.all([
    hasFinanceAccess ? payload.find({ collection: "donations", limit: 5, sort: "-createdAt" }) : undefined,
    hasFinanceAccess ? payload.find({ collection: "payment-sessions", limit: 5, sort: "-createdAt" }) : undefined,
    hasFinanceAccess ? payload.find({ collection: "refund-requests", limit: 5, sort: "-createdAt" }) : undefined,
    canReview || isFieldOperator
      ? payload.find({
          collection: "field-tasks",
          limit: 5,
          sort: "-updatedAt",
          where: isFieldOperator
            ? { assignedTo: { equals: user.id } }
            : undefined,
        })
      : undefined,
    canReview ? payload.find({ collection: "donor-reports", limit: 5, sort: "-updatedAt" }) : undefined,
    hasFinanceAccess ? payload.find({ collection: "payment-events", limit: 10, sort: "-createdAt" }) : undefined,
  ]);

  const donationDocs = donations?.docs ?? [];
  const sessionDocs = sessions?.docs ?? [];
  const refundDocs = refunds?.docs ?? [];
  const fieldTaskDocs = fieldTasks?.docs ?? [];
  const reportDocs = reports?.docs ?? [];
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
      fieldQueue: fieldTaskDocs.filter((item) => item.status !== "approved").length,
      reportsToApprove: reportDocs.filter((item) => item.status === "draft").length,
    },
    donations: donationDocs,
    sessions: sessionDocs,
    refunds: refundDocs,
    fieldTasks: fieldTaskDocs,
    reports: reportDocs,
    paymentEvents: paymentEventDocs,
  };
}
