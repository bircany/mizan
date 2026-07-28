import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/session";
import { reviewEftDonation } from "@/lib/donations/eft";
import { getPayloadClient } from "@/lib/payload";

function requestIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getAdminSession();
  if (!user || user.role !== "admin") {
    return NextResponse.json(
      { success: false, error: "Bu işlem yalnızca admin tarafından yapılabilir." },
      { status: 403 },
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (body.decision !== "approve" && body.decision !== "reject") {
      throw new Error("EFT kararı geçersiz.");
    }
    const result = await reviewEftDonation(await getPayloadClient(), {
      sessionId: (await context.params).id,
      decision: body.decision,
      description:
        typeof body.description === "string" ? body.description.trim() : "",
      actorId: user.id,
      actorEmail: String(user.email),
      ip: requestIp(request),
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "EFT kararı uygulanamadı.",
      },
      { status: 400 },
    );
  }
}
