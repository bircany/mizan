import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/session";
import { transitionProofSubmission, type StaffActor, type SubmissionTransition } from "@/lib/field-workflow";
import { getPayloadClient } from "@/lib/payload";

const validTransitions = new Set<SubmissionTransition>([
  "submit",
  "mark_ready_for_review",
  "approve",
  "reject",
]);

function getRequestIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip");
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ submissionId: string }> },
) {
  const user = await getAdminSession();
  if (!user?.id || !user.role) {
    return NextResponse.json({ success: false, error: "Yetkisiz istek." }, { status: 403 });
  }

  try {
    const body = await request.json();
    if (!validTransitions.has(body.transition)) {
      return NextResponse.json({ success: false, error: "Gecersiz durum gecisi." }, { status: 400 });
    }
    const { submissionId } = await params;
    const result = await transitionProofSubmission(
      await getPayloadClient(),
      user as unknown as StaffActor,
      submissionId,
      body.transition,
      {
        externalApprovalCode:
          typeof body.externalApprovalCode === "string" ? body.externalApprovalCode : undefined,
        externalReferenceId:
          typeof body.externalReferenceId === "string" ? body.externalReferenceId : undefined,
        reviewNotes: typeof body.reviewNotes === "string" ? body.reviewNotes : undefined,
      },
      getRequestIp(request),
    );
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Durum gecisi basarisiz oldu." },
      { status: 400 },
    );
  }
}
