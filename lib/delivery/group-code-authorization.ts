import "server-only";

import { hasRole } from "@/lib/auth/roles";
import { databaseQuery } from "@/lib/database";

export class DeliveryGroupAccessError extends Error {
  constructor(
    message: string,
    readonly status: 403 | 404,
  ) {
    super(message);
    this.name = "DeliveryGroupAccessError";
  }
}

export async function requireDeliveryGroupAccess(
  groupIdInput: string | number,
  actor: { id?: string | number | null; role?: string | null },
) {
  const groupId = Number(groupIdInput);
  if (!actor.id || !Number.isInteger(groupId) || groupId <= 0) {
    throw new DeliveryGroupAccessError("Operasyon grubu bulunamadı.", 404);
  }
  const isAdmin = hasRole(actor.role, ["admin"]);
  const isFieldOperator = actor.role === "field_operator";
  if (!isAdmin && !isFieldOperator) {
    throw new DeliveryGroupAccessError("Bu işlem için yetkiniz yok.", 403);
  }
  const result = await databaseQuery<{
    id: number;
    assignedOperatorId: string | null;
  }>(
    `select id, assigned_operator_id::text as "assignedOperatorId"
     from public.operation_groups
     where id = $1`,
    [groupId],
  );
  const group = result.rows[0];
  if (!group) throw new DeliveryGroupAccessError("Operasyon grubu bulunamadı.", 404);
  if (isFieldOperator && group.assignedOperatorId !== String(actor.id)) {
    throw new DeliveryGroupAccessError(
      "Yalnızca size atanmış operasyon grubunda işlem yapabilirsiniz.",
      403,
    );
  }
  return {
    groupId: group.id,
    assignedOperatorId: group.assignedOperatorId,
    isAdmin,
  };
}
