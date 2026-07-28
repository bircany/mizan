import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/session";
import {
  runGroupOperation,
  type GroupOperation,
  type OperationActor,
  type OperationResult,
} from "@/lib/delivery/operation-actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function requestIp(request: Request) {
  return (
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null
  );
}

function json(
  body: Record<string, unknown>,
  status: number,
  retryAfterSeconds?: number,
) {
  const headers = new Headers({ "cache-control": "private, no-store" });
  if (retryAfterSeconds) headers.set("retry-after", String(retryAfterSeconds));
  return NextResponse.json(body, { status, headers });
}

function parsePositiveInteger(value: unknown) {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0
    ? value
    : null;
}

function parseReason(value: unknown) {
  if (typeof value !== "string") return null;
  const reason = value.trim();
  return reason && reason.length <= 2_000 ? reason : null;
}

function parseOperation(
  body: Record<string, unknown>,
): GroupOperation | null {
  switch (body.action) {
    case "schedule_slaughter": {
      const scheduledAt =
        typeof body.scheduledAt === "string" ? body.scheduledAt : "";
      const order = parsePositiveInteger(body.order);
      const place = typeof body.place === "string" ? body.place.trim() : "";
      const assignedOperatorId = parsePositiveInteger(body.assignedOperatorId);
      const note =
        body.note === undefined || body.note === null
          ? null
          : typeof body.note === "string"
            ? body.note
            : undefined;
      if (
        !Number.isFinite(Date.parse(scheduledAt)) ||
        !order ||
        !place ||
        place.length > 500 ||
        !assignedOperatorId ||
        note === undefined ||
        (note !== null && note.length > 4_000)
      ) {
        return null;
      }
      return {
        action: "schedule_slaughter",
        scheduledAt: new Date(scheduledAt).toISOString(),
        order,
        place,
        assignedOperatorId,
        note,
      };
    }
    case "mark_slaughtered": {
      const groupCode =
        typeof body.groupCode === "string" ? body.groupCode : "";
      if (!groupCode.trim() || groupCode.length > 160) return null;
      return { action: "mark_slaughtered", groupCode };
    }
    case "revert_slaughter": {
      const reason = parseReason(body.reason);
      return reason ? { action: "revert_slaughter", reason } : null;
    }
    case "capacity_override": {
      const newCapacity = parsePositiveInteger(body.newCapacity);
      const reason = parseReason(body.reason);
      if (
        !newCapacity ||
        !reason ||
        typeof body.associationCovers !== "boolean"
      ) {
        return null;
      }
      return {
        action: "capacity_override",
        newCapacity,
        reason,
        associationCovers: body.associationCovers,
      };
    }
    default:
      return null;
  }
}

function operationResponse(
  result: OperationResult<Record<string, unknown>>,
) {
  if (result.ok) return json({ ok: true, ...result.data }, result.status);
  return json(
    {
      ok: false,
      code: result.code,
      error: result.error,
      ...(result.details ? { details: result.details } : {}),
    },
    result.status,
    result.retryAfterSeconds,
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ groupId: string }> },
) {
  const user = await getAdminSession();
  if (!user) {
    return json(
      { ok: false, code: "AUTH_REQUIRED", error: "Oturum açmanız gerekli." },
      401,
    );
  }
  const role = String(user.role || "");
  if (!["admin", "field_operator"].includes(role)) {
    return json(
      {
        ok: false,
        code: "OPERATION_FORBIDDEN",
        error: "Operasyon işlemi için yetkiniz yok.",
      },
      403,
    );
  }

  try {
    const { groupId: rawGroupId } = await context.params;
    if (!/^[1-9]\d*$/.test(rawGroupId)) {
      return json(
        {
          ok: false,
          code: "INVALID_GROUP_ID",
          error: "Geçerli bir grup kimliği gerekli.",
        },
        400,
      );
    }
    const groupId = Number(rawGroupId);
    if (!Number.isSafeInteger(groupId)) {
      return json(
        {
          ok: false,
          code: "INVALID_GROUP_ID",
          error: "Geçerli bir grup kimliği gerekli.",
        },
        400,
      );
    }
    const rawBody = await request.json().catch(() => null);
    if (
      !rawBody ||
      typeof rawBody !== "object" ||
      Array.isArray(rawBody)
    ) {
      return json(
        {
          ok: false,
          code: "INVALID_JSON",
          error: "Geçerli bir JSON işlem gövdesi gerekli.",
        },
        400,
      );
    }
    const operation = parseOperation(rawBody as Record<string, unknown>);
    if (!operation) {
      return json(
        {
          ok: false,
          code: "INVALID_OPERATION",
          error: "İşlem adı veya zorunlu alanlar geçersiz.",
        },
        400,
      );
    }
    const actor: OperationActor = {
      id: String(user.id),
      email: typeof user.email === "string" ? user.email : null,
      role: role as OperationActor["role"],
    };
    return operationResponse(
      await runGroupOperation({
        groupId,
        operation,
        actor,
        ipAddress: requestIp(request),
      }),
    );
  } catch (error) {
    console.error("Delivery group operation failed.", error);
    return json(
      {
        ok: false,
        code: "OPERATION_FAILED",
        error: "Grup işlemi şu anda uygulanamıyor.",
      },
      500,
    );
  }
}
