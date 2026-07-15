import type { Payload } from "payload";

import { hasRole, type UserRole } from "@/lib/auth/roles";
import { logAuditEvent } from "@/lib/audit";

export type StaffActor = {
  id: string | number;
  email?: string | null;
  role: UserRole;
};

type RelationValue = number | string | { id: number | string } | null | undefined;

export type SubmissionTransition = "submit" | "mark_ready_for_review" | "approve" | "reject";

export function relationId(value: RelationValue) {
  return typeof value === "object" && value ? value.id : value;
}

function sameId(left: number | string | null | undefined, right: number | string) {
  return String(left) === String(right);
}

export async function getAssignedFieldTask(
  payload: Payload,
  actor: StaffActor,
  taskId: number | string,
) {
  const task = await payload.findByID({
    collection: "field-tasks",
    id: taskId,
    depth: 0,
    overrideAccess: true,
  });

  if (
    actor.role === "field_operator" &&
    !sameId(relationId(task.assignedTo), actor.id)
  ) {
    throw new Error("Bu saha gorevi size atanmamis.");
  }

  return task;
}

export async function startFieldTask(
  payload: Payload,
  actor: StaffActor,
  taskId: number | string,
  ipAddress?: string | null,
) {
  if (!hasRole(actor.role, ["super_admin", "field_operator"])) {
    throw new Error("Bu gorevi baslatma yetkiniz yok.");
  }

  const task = await getAssignedFieldTask(payload, actor, taskId);
  if (task.status !== "todo" && task.status !== "needs_revision") {
    throw new Error("Bu saha gorevi baslatilamaz durumdadir.");
  }

  const updatedTask = await payload.update({
    collection: "field-tasks",
    id: task.id,
    data: { status: "in_progress" },
    overrideAccess: true,
  });

  await logAuditEvent(payload, {
    action: "field_task.started",
    actorEmail: actor.email,
    targetCollection: "field-tasks",
    targetId: task.id,
    details: { previousStatus: task.status, nextStatus: updatedTask.status },
    ipAddress,
  });

  return updatedTask;
}

export async function createFieldSubmission(
  payload: Payload,
  actor: StaffActor,
  input: {
    fieldTaskId: number | string;
    title: string;
    summary?: string;
    donationId?: number | string;
    campaignId?: number | string;
  },
  ipAddress?: string | null,
) {
  if (!hasRole(actor.role, ["super_admin", "field_operator"])) {
    throw new Error("Kanit gonderimi olusturma yetkiniz yok.");
  }

  const task = await getAssignedFieldTask(payload, actor, input.fieldTaskId);
  if (task.status !== "in_progress" && task.status !== "needs_revision") {
    throw new Error("Kanit gonderimi icin saha gorevi baslatilmis olmalidir.");
  }

  const taskCampaignId = relationId(task.campaign);
  if (!taskCampaignId) throw new Error("Saha gorevinin kampanyasi bulunamadi.");
  if (input.campaignId && !sameId(input.campaignId, taskCampaignId)) {
    throw new Error("Kanit gonderimi gorevin kampanyasiyla eslesmelidir.");
  }

  if (input.donationId) {
    const donation = await payload.findByID({
      collection: "donations",
      id: input.donationId,
      depth: 0,
      overrideAccess: true,
    });
    if (!sameId(relationId(donation.campaign), taskCampaignId)) {
      throw new Error("Bagis, saha gorevinin kampanyasiyla eslesmiyor.");
    }
  }

  const submission = await payload.create({
    collection: "proof-submissions",
    data: {
      title: input.title,
      fieldTask: task.id,
      summary: input.summary,
      donation: input.donationId,
      campaign: taskCampaignId,
      status: "draft",
    },
    overrideAccess: true,
  });

  await logAuditEvent(payload, {
    action: "proof_submission.created",
    actorEmail: actor.email,
    targetCollection: "proof-submissions",
    targetId: submission.id,
    details: { fieldTaskId: task.id },
    ipAddress,
  });

  return submission;
}

export async function transitionProofSubmission(
  payload: Payload,
  actor: StaffActor,
  submissionId: number | string,
  transition: SubmissionTransition,
  input: {
    externalApprovalCode?: string;
    externalReferenceId?: string;
    reviewNotes?: string;
  },
  ipAddress?: string | null,
) {
  const submission = await payload.findByID({
    collection: "proof-submissions",
    id: submissionId,
    depth: 1,
    overrideAccess: true,
  });
  const taskId = relationId(submission.fieldTask);
  if (!taskId) throw new Error("Kanit gonderiminin saha gorevi bulunamadi.");

  const task = await getAssignedFieldTask(payload, actor, taskId);
  const isReviewer = hasRole(actor.role, ["super_admin", "approver"]);
  const isOwnerOperator = actor.role === "field_operator";

  let nextStatus: "external_pending" | "review_pending" | "approved" | "rejected";
  let nextTaskStatus: "submitted" | "approved" | "needs_revision" | undefined;
  const data: Record<string, unknown> = {};

  if (transition === "submit") {
    if (!isOwnerOperator && actor.role !== "super_admin") {
      throw new Error("Kanit gonderme yetkiniz yok.");
    }
    if (submission.status !== "draft" && submission.status !== "rejected") {
      throw new Error("Bu kanit gonderimi tekrar gonderilemez durumdadir.");
    }
    nextStatus = "external_pending";
    nextTaskStatus = "submitted";
    data.externalApprovalCode = input.externalApprovalCode?.trim() || undefined;
    data.externalReferenceId = input.externalReferenceId?.trim() || undefined;
  } else if (transition === "mark_ready_for_review") {
    if (!isOwnerOperator && actor.role !== "super_admin") {
      throw new Error("Incelemeye gonderme yetkiniz yok.");
    }
    if (submission.status !== "external_pending") {
      throw new Error("Bu kanit gonderimi dis onay beklemiyor.");
    }
    const approvalCode = input.externalApprovalCode?.trim() || submission.externalApprovalCode;
    const referenceId = input.externalReferenceId?.trim() || submission.externalReferenceId;
    if (!approvalCode && !referenceId) {
      throw new Error("Incelemeye gondermek icin dis onay kodu veya referansi zorunludur.");
    }
    nextStatus = "review_pending";
    data.externalApprovalCode = approvalCode;
    data.externalReferenceId = referenceId;
  } else if (transition === "approve") {
    if (!isReviewer || submission.status !== "review_pending") {
      throw new Error("Bu kanit gonderimi onaylanamaz durumdadir.");
    }
    nextStatus = "approved";
    data.reviewNotes = input.reviewNotes?.trim() || undefined;
  } else {
    if (!isReviewer || (submission.status !== "external_pending" && submission.status !== "review_pending")) {
      throw new Error("Bu kanit gonderimi iade edilemez durumdadir.");
    }
    if (!input.reviewNotes?.trim()) {
      throw new Error("Duzeltme notu zorunludur.");
    }
    nextStatus = "rejected";
    nextTaskStatus = "needs_revision";
    data.reviewNotes = input.reviewNotes.trim();
  }

  const updatedSubmission = await payload.update({
    collection: "proof-submissions",
    id: submission.id,
    data: { ...data, status: nextStatus },
    overrideAccess: true,
  });

  if (transition === "approve") {
    const remaining = await payload.find({
      collection: "proof-submissions",
      where: {
        and: [
          { fieldTask: { equals: task.id } },
          { status: { not_equals: "approved" } },
        ],
      },
      limit: 1,
      overrideAccess: true,
    });
    nextTaskStatus = remaining.totalDocs === 0 ? "approved" : "submitted";
  }

  if (nextTaskStatus && task.status !== nextTaskStatus) {
    await payload.update({
      collection: "field-tasks",
      id: task.id,
      data: { status: nextTaskStatus },
      overrideAccess: true,
    });
  }

  await logAuditEvent(payload, {
    action: `proof_submission.${transition}`,
    actorEmail: actor.email,
    targetCollection: "proof-submissions",
    targetId: submission.id,
    details: {
      fieldTaskId: task.id,
      previousStatus: submission.status,
      nextStatus,
      nextTaskStatus,
    },
    ipAddress,
  });

  return updatedSubmission;
}
