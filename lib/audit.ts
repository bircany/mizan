import type { Payload } from "payload";

export async function logAuditEvent(
  payload: Payload,
  input: {
    action: string;
    actorEmail?: string | null;
    targetCollection?: string;
    targetId?: string | number;
    details?: Record<string, unknown>;
    ipAddress?: string | null;
  },
) {
  await payload.create({
    collection: "audit-logs",
    data: {
      action: input.action,
      actorEmail: input.actorEmail || undefined,
      targetCollection: input.targetCollection,
      targetId: input.targetId ? String(input.targetId) : undefined,
      details: input.details,
      ipAddress: input.ipAddress || undefined,
    },
  });
}
