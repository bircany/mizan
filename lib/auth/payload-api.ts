import { NextResponse } from "next/server";

import { canAccessPayloadApi } from "@/lib/auth/panel-access";
import { getAdminSession } from "@/lib/auth/session";

const publicAuthActions = new Set([
  "login",
  "logout",
  "forgot-password",
  "reset-password",
  "refresh-token",
  "verify",
  "me",
]);

export function isPublicPayloadAuthRequest(request: Request) {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  return segments[0] === "api" && segments[1] === "users" && publicAuthActions.has(segments[2] || "");
}

/**
 * Media uploads live on the local Payload disk but their public URLs are
 * served by Payload's file route. Keep only the file response public; the
 * media collection API and every other Payload endpoint remain admin-only.
 */
export function isPublicPayloadMediaFileRequest(request: Request) {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  return (
    segments[0] === "api" &&
    segments[1] === "media" &&
    segments[2] === "file" &&
    Boolean(segments[3])
  );
}

export async function requirePayloadAdminApi(request: Request) {
  if (
    isPublicPayloadAuthRequest(request) ||
    isPublicPayloadMediaFileRequest(request)
  )
    return null;

  const user = await getAdminSession();
  if (!user?.role) {
    return NextResponse.json({ errors: [{ message: "Kimlik dogrulama gerekli." }] }, { status: 401 });
  }

  if (!canAccessPayloadApi(user.role)) {
    return NextResponse.json({ errors: [{ message: "Bu kaynak icin yetkiniz yok." }] }, { status: 403 });
  }

  return null;
}
