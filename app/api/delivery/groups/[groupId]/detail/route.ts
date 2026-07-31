import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/session";
import { getPayloadClient } from "@/lib/payload";

export const dynamic = "force-dynamic";

type Loose = Record<string, any>;

function relationId(value: unknown) {
  return String(
    value && typeof value === "object" ? (value as Loose).id : value || "",
  );
}

function maskPhone(value: unknown) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length < 7) return digits ? "***" : "Telefon yok";
  return `+${digits.slice(0, 2)} *** *** ${digits.slice(-2)}`;
}

function iso(value: unknown) {
  return typeof value === "string" && Number.isFinite(Date.parse(value))
    ? new Date(value).toISOString()
    : null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ groupId: string }> },
) {
  const user = await getAdminSession();
  if (!user || !["admin", "field_operator"].includes(user.role)) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }
  const { groupId } = await context.params;
  if (!/^\d+$/.test(groupId))
    return NextResponse.json(
      { error: "Grup kimliği geçersiz." },
      { status: 400 },
    );
  try {
    const payload = await getPayloadClient();
    const [group, videoResult, messageResult, memberResult] = await Promise.all(
      [
        payload.findByID({
          collection: "operation-groups",
          id: groupId,
          depth: 1,
          overrideAccess: true,
        }),
        payload.find({
          collection: "operation-videos",
          where: { group: { equals: groupId } },
          sort: "-version",
          limit: 20,
          depth: 0,
          overrideAccess: true,
        }),
        payload.find({
          collection: "delivery-messages",
          where: { group: { equals: groupId } },
          sort: "-createdAt",
          limit: 1000,
          depth: 1,
          overrideAccess: true,
        }),
        payload.find({
          collection: "operation-group-members",
          where: { group: { equals: groupId } },
          sort: "unitIndex",
          limit: 1000,
          depth: 2,
          overrideAccess: true,
        }),
      ],
    );
    const campaign =
      typeof group.campaign === "object" && group.campaign
        ? (group.campaign as Loose)
        : {};
    const titleValue = campaign.title;
    const campaignName =
      typeof titleValue === "string"
        ? titleValue
        : String(
            titleValue?.tr ||
              titleValue?.en ||
              campaign.code ||
              "Video operasyonu",
          );
    const videos = videoResult.docs.map((item) => ({
      id: String(item.id),
      status: String(item.status || "waiting"),
      version: Number(item.version || 1),
      originalFilename: String(item.originalFilename || ""),
      mimeType: String(item.detectedMimeType || item.mimeType || ""),
      sizeBytes: Number(item.sizeBytes || 0),
      durationSeconds: Number(item.durationSeconds || 0),
      width: Number(item.width || 0),
      height: Number(item.height || 0),
      videoCodec: String(item.videoCodec || ""),
      audioCodec: String(item.audioCodec || ""),
      contentReviewStatus: String(item.contentReviewStatus || "pending"),
      reviewChecklist:
        item.reviewChecklist && typeof item.reviewChecklist === "object"
          ? item.reviewChecklist
          : {},
      processingStartedAt: iso(item.processingStartedAt),
      reviewedAt: iso(item.reviewedAt),
      readyAt: iso(item.readyAt),
      createdAt: iso(item.createdAt),
      updatedAt: iso(item.updatedAt),
      lastError: String(item.lastError || ""),
      lastErrorCode: String(item.lastErrorCode || ""),
      isActive: item.isActive === true,
    }));
    const messages = messageResult.docs.map((item) => ({
      id: String(item.id),
      status: String(item.status || "draft"),
      isTest: item.isTest === true,
      messageType: String(item.messageType || "normal"),
      recipientPhone:
        user.role === "admin"
          ? String(item.recipientPhone || "")
          : maskPhone(item.recipientPhone),
      body: String(item.bodySnapshot || item.body || ""),
      providerMessageId: String(item.providerMessageId || ""),
      providerStatus: String(item.providerStatus || ""),
      attemptCount: Number(item.attemptCount || 0),
      lastError: String(item.lastError || ""),
      lastErrorCode: String(item.lastErrorCode || ""),
      scheduledAt: iso(item.scheduledAt),
      sentAt: iso(item.sentAt),
      deliveredAt: iso(item.deliveredAt),
      readAt: iso(item.readAt),
      failedAt: iso(item.failedAt),
      createdAt: iso(item.createdAt),
      updatedAt: iso(item.updatedAt),
    }));
    const recipients = memberResult.docs
      .filter((item) => !["released", "refunded"].includes(String(item.status)))
      .map((item) => {
        const participant =
          typeof item.participant === "object" && item.participant
            ? (item.participant as Loose)
            : {};
        const intent =
          typeof item.donationIntent === "object" && item.donationIntent
            ? (item.donationIntent as Loose)
            : {};
        const phone =
          participant.effectivePhone || participant.phone || intent.phone;
        return {
          id: String(item.id),
          unitIndex: Number(item.unitIndex || 0),
          name: String(participant.name || intent.donorName || "İsimsiz alıcı"),
          phone: user.role === "admin" ? String(phone || "") : maskPhone(phone),
          status: String(item.status || "reserved"),
        };
      });
    const timeline = [
      ...videos.flatMap((video) => [
        video.createdAt
          ? {
              type: "video_uploaded",
              at: video.createdAt,
              label: "Video yüklendi",
            }
          : null,
        video.processingStartedAt
          ? {
              type: "video_processing",
              at: video.processingStartedAt,
              label: "Teknik işleme başladı",
            }
          : null,
        video.status === "review_pending" && video.updatedAt
          ? {
              type: "review_pending",
              at: video.updatedAt,
              label: "Teknik kontrol bekliyor",
            }
          : null,
        video.reviewedAt
          ? {
              type: `review_${video.contentReviewStatus}`,
              at: video.reviewedAt,
              label:
                video.contentReviewStatus === "approved"
                  ? "Video onaylandı"
                  : "Video reddedildi",
            }
          : null,
      ]),
      ...messages.flatMap((message) => [
        message.createdAt
          ? {
              type: message.isTest ? "test_created" : "draft_created",
              at: message.createdAt,
              label: message.isTest
                ? "Test mesajı oluşturuldu"
                : "Mesaj taslağı hazırlandı",
            }
          : null,
        message.scheduledAt
          ? {
              type: "message_queued",
              at: message.scheduledAt,
              label: "Mesaj kuyruğa alındı",
            }
          : null,
        message.sentAt
          ? {
              type: "message_sent",
              at: message.sentAt,
              label: "WhatsApp mesajı gönderildi",
            }
          : null,
        message.deliveredAt
          ? {
              type: "message_delivered",
              at: message.deliveredAt,
              label: "WhatsApp mesajı teslim edildi",
            }
          : null,
        message.readAt
          ? {
              type: "message_read",
              at: message.readAt,
              label: "WhatsApp mesajı okundu",
            }
          : null,
        message.failedAt
          ? {
              type: "message_failed",
              at: message.failedAt,
              label: "Mesaj gönderimi başarısız",
            }
          : null,
      ]),
    ]
      .filter(Boolean)
      .sort(
        (a, b) => Date.parse((a as Loose).at) - Date.parse((b as Loose).at),
      );
    return NextResponse.json(
      {
        group: {
          id: String(group.id),
          code: String(group.code || ""),
          campaign: campaignName,
          status: String(group.status || ""),
          dispatchState: String(group.dispatchState || "idle"),
          dispatchPauseReason: String(group.dispatchPauseReason || ""),
          testMessagePassedAt: iso(group.testMessagePassedAt),
        },
        videos,
        messages,
        recipients,
        timeline,
        role: user.role,
      },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Operasyon detayı yüklenemedi.",
      },
      { status: 500 },
    );
  }
}
