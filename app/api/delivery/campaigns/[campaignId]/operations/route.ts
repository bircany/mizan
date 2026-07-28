import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/session";
import {
  runCampaignOperation,
  type CampaignOperation,
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

function json(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "private, no-store" },
  });
}

function parseReason(value: unknown) {
  if (typeof value !== "string") return null;
  const reason = value.trim();
  return reason && reason.length <= 2_000 ? reason : null;
}

function parseOperation(
  body: Record<string, unknown>,
): CampaignOperation | null {
  const reason = parseReason(body.reason);
  if (!reason) return null;
  switch (body.action) {
    case "pause":
      return { action: "pause", reason };
    case "resume":
      return { action: "resume", reason };
    case "close":
      if (
        body.acknowledge !== undefined &&
        typeof body.acknowledge !== "boolean"
      ) {
        return null;
      }
      return {
        action: "close",
        reason,
        acknowledge: body.acknowledge === true,
      };
    case "prepare_standard_video":
      return { action: "prepare_standard_video", reason };
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
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ campaignId: string }> },
) {
  const user = await getAdminSession();
  if (!user) {
    return json(
      { ok: false, code: "AUTH_REQUIRED", error: "Oturum açmanız gerekli." },
      401,
    );
  }
  if (String(user.role || "") !== "admin") {
    return json(
      {
        ok: false,
        code: "ADMIN_REQUIRED",
        error: "Kampanya operasyonları yalnızca yönetici tarafından uygulanabilir.",
      },
      403,
    );
  }

  try {
    const { campaignId: rawCampaignId } = await context.params;
    if (!/^[1-9]\d*$/.test(rawCampaignId)) {
      return json(
        {
          ok: false,
          code: "INVALID_CAMPAIGN_ID",
          error: "Geçerli bir kampanya kimliği gerekli.",
        },
        400,
      );
    }
    const campaignId = Number(rawCampaignId);
    if (!Number.isSafeInteger(campaignId)) {
      return json(
        {
          ok: false,
          code: "INVALID_CAMPAIGN_ID",
          error: "Geçerli bir kampanya kimliği gerekli.",
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
          error: "İşlem adı veya zorunlu gerekçe geçersiz.",
        },
        400,
      );
    }
    const actor: OperationActor = {
      id: String(user.id),
      email: typeof user.email === "string" ? user.email : null,
      role: "admin",
    };
    return operationResponse(
      await runCampaignOperation({
        campaignId,
        operation,
        actor,
        ipAddress: requestIp(request),
      }),
    );
  } catch (error) {
    console.error("Delivery campaign operation failed.", error);
    return json(
      {
        ok: false,
        code: "OPERATION_FAILED",
        error: "Kampanya işlemi şu anda uygulanamıyor.",
      },
      500,
    );
  }
}
