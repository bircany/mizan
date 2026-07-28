import "server-only";

import { getPayloadClient } from "@/lib/payload";

type LooseRecord = Record<string, unknown> & { id?: number | string };
type FindResult = { docs?: unknown[] };
type LooseFind = (args: Record<string, unknown>) => Promise<FindResult>;

export type UnifiedCampaignRow = {
  id: string;
  title: string;
  model: "fixed" | "flexible";
  status: string;
  delivery: "video" | "standard";
  currency: string;
  targetOrStock: string;
};

export type UnifiedDonationRow = {
  id: string;
  donorName: string;
  campaign: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
  createdAt: string;
  note: string;
  email: string;
  phone: string;
  address: string;
};

export type UnifiedEftRow = {
  id: string;
  reference: string;
  donorName: string;
  amount: number;
  currency: string;
  status: string;
  expiresAt: string;
  proofAvailable: boolean;
};

export type UnifiedDeliveryRow = {
  id: string;
  groupId: string;
  messageId: string | null;
  messageBody: string;
  groupCode: string;
  campaign: string;
  recipient: string;
  status: string;
  videoStatus: string;
  updatedAt: string;
  recipients: UnifiedDeliveryRecipient[];
};

export type UnifiedDeliveryRecipient = {
  id: string;
  name: string;
  maskedPhone: string;
  unitIndex: number;
  status: string;
};

function record(value: unknown): LooseRecord {
  return value && typeof value === "object" ? value as LooseRecord : {};
}

function text(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object") {
    const localized = value as Record<string, unknown>;
    return text(localized.tr ?? localized.en ?? localized.title ?? localized.name, fallback);
  }
  return fallback;
}

function relationTitle(value: unknown, fallback: string): string {
  const related = record(value);
  return text(related.title ?? related.name ?? related.code, fallback);
}

function maskPhone(value: unknown): string {
  const phone = text(value).replace(/\s+/g, "");
  if (phone.length < 7) return phone ? "***" : "Telefon yok";
  return `${phone.slice(0, 3)} *** ** ${phone.slice(-2)}`;
}

async function findOptional(collection: string, options: Record<string, unknown> = {}): Promise<LooseRecord[]> {
  const payload = await getPayloadClient();
  try {
    const result = await (payload.find as unknown as LooseFind)({
      collection,
      depth: 1,
      limit: 100,
      pagination: false,
      sort: "-updatedAt",
      ...options,
    });
    return (result.docs ?? []).map(record);
  } catch {
    return [];
  }
}

export async function getUnifiedDonationPanelData() {
  const [campaignDocs, donationDocs, newEftDocs] = await Promise.all([
    findOptional("campaigns"),
    findOptional("donations"),
    findOptional("payment-sessions", {
      where: {
        and: [
          { paymentMethod: { equals: "bank_transfer" } },
          { providerStatus: { equals: "EFT_REVIEW_PENDING" } },
        ],
      },
    }),
  ]);

  const campaigns: UnifiedCampaignRow[] = campaignDocs.map((item) => {
    const fixed = text(item.pricingModel ?? item.donationType) === "fixed";
    const video = Boolean(item.isVideoDonation ?? item.videoEnabled ?? (item.deliveryType === "video" || item.videoDelivery === "video"));
    const target = Number(item.targetAmount ?? 0);
    const stock = Number(item.totalStock ?? item.stockLimit ?? 0);
    return {
      id: String(item.id ?? ""),
      title: text(item.title, "Başlıksız bağış"),
      model: fixed ? "fixed" : "flexible",
      status: text(item.status, item.isDonationOpen === false ? "closed" : "active"),
      delivery: video ? "video" : "standard",
      currency: text(item.currency, "TRY"),
      targetOrStock: fixed
        ? (stock > 0 ? `${stock} adet` : "Sınırsız")
        : (target > 0 ? `${target.toLocaleString("tr-TR")} ${text(item.currency, "TRY")}` : "Hedef yok"),
    };
  });

  const donations: UnifiedDonationRow[] = donationDocs.map((item) => {
    const intent = record(item.donationIntent);
    return {
    id: String(item.id ?? ""),
    donorName: text(item.donorName, "İsimsiz bağışçı"),
    campaign: relationTitle(item.campaign, "Bağış kampanyası"),
    amount: Number(item.netConfirmedAmount ?? item.grossAmount ?? item.amount ?? 0),
    currency: text(item.currency, "TRY"),
    receipt: text(item.receiptNumber, "Hazırlanıyor"),
    status: text(item.status, "pending"),
    createdAt: text(item.createdAt),
    note: text(item.donationNote),
    email: text(item.email ?? intent.email),
    phone: text(item.phone ?? intent.phone),
    address: [text(intent.address), text(intent.city), text(intent.countryCode)].filter(Boolean).join(", "),
  }; });

  const efts: UnifiedEftRow[] = newEftDocs.map((item) => ({
    id: String(item.id ?? ""),
    reference: text(item.reference ?? item.orderNumber ?? item.conversationId, "Referans yok"),
    donorName: text(record(item.donationIntent).donorName, "İsimsiz bağışçı"),
    amount: Number(record(item.donationIntent).amount ?? 0),
    currency: text(record(item.donationIntent).currency, "TRY"),
    status: text(item.providerStatus, "EFT_PROOF_PENDING"),
    expiresAt: text(item.reservationExpiresAt),
    proofAvailable: Boolean(item.eftProofPath),
  }));

  return { campaigns, donations, efts };
}

export async function getUnifiedDeliveryPanelData(): Promise<UnifiedDeliveryRow[]> {
  const [groups, messages, videos, members] = await Promise.all([
    findOptional("operation-groups"),
    findOptional("delivery-messages"),
    findOptional("operation-videos"),
    findOptional("operation-group-members", { limit: 1000, sort: "unitIndex" }),
  ]);

  function buildRows(
    source: string,
    sourceGroups: LooseRecord[],
    sourceMessages: LooseRecord[],
    sourceVideos: LooseRecord[],
    sourceMembers: LooseRecord[],
  ) {
    const videoByGroup = new Map<string, LooseRecord>();
    for (const video of sourceVideos) {
      const group = record(video.operationGroup ?? video.group ?? video.pool);
      const groupId = String(group.id ?? video.operationGroup ?? video.group ?? video.pool ?? "");
      if (groupId) videoByGroup.set(groupId, video);
    }
    const recipientsByGroup = new Map<string, UnifiedDeliveryRecipient[]>();
    for (const member of sourceMembers) {
      const status = text(member.status, "reserved");
      if (status === "released" || status === "refunded") continue;

      const relation = record(member.group);
      const groupId = String(relation.id ?? member.group ?? "");
      if (!groupId) continue;

      const participant = record(member.participant);
      const intent = record(member.donationIntent);
      const recipients = recipientsByGroup.get(groupId) ?? [];
      recipients.push({
        id: String(member.id ?? `${groupId}-${member.unitIndex ?? recipients.length + 1}`),
        name: text(participant.name ?? intent.donorName, "İsimsiz alıcı"),
        maskedPhone: maskPhone(
          participant.effectivePhone ??
            participant.phone ??
            intent.phone,
        ),
        unitIndex: Number(member.unitIndex ?? recipients.length + 1),
        status,
      });
      recipientsByGroup.set(groupId, recipients);
    }
    const groupById = new Map(sourceGroups.map((group) => [String(group.id ?? ""), group]));
    const messageRows: UnifiedDeliveryRow[] = sourceMessages.map((message) => {
      const relation = record(message.operationGroup ?? message.group ?? message.pool);
      const groupId = String(relation.id ?? message.operationGroup ?? message.group ?? message.pool ?? "");
      const group = groupById.get(groupId) ?? relation;
      const video = videoByGroup.get(groupId) ?? {};
      return {
        id: `${source}-message-${String(message.id ?? "")}`,
        groupId,
        messageId: String(message.id ?? ""),
        messageBody: text(message.body),
        groupCode: text(group.code ?? group.operationCode, "Grup bekliyor"),
        campaign: relationTitle(group.campaign, "Video operasyonu"),
        recipient: maskPhone(message.recipientPhone ?? message.phone),
        status: text(message.status, "draft"),
        videoStatus: text(video.status, "waiting"),
        updatedAt: text(message.updatedAt ?? message.createdAt),
        recipients: recipientsByGroup.get(groupId) ?? [],
      };
    });
    const groupIdsWithMessages = new Set(sourceMessages.map((message) => {
      const relation = record(message.operationGroup ?? message.group ?? message.pool);
      return String(relation.id ?? message.operationGroup ?? message.group ?? message.pool ?? "");
    }));
    const waitingRows: UnifiedDeliveryRow[] = sourceGroups
    .filter((group) => !groupIdsWithMessages.has(String(group.id ?? "")))
    .map((group) => {
      const groupId = String(group.id ?? "");
      const video = videoByGroup.get(groupId) ?? {};
      const recipients = recipientsByGroup.get(groupId) ?? [];
      const confirmedCount = recipients.filter(
        (recipient) => recipient.status === "confirmed",
      ).length;
      const reservedCount = recipients.filter(
        (recipient) => recipient.status === "reserved",
      ).length;
      const recipientSummary = recipients.length
        ? `${recipients.length} alıcı${
            reservedCount
              ? ` (${confirmedCount} onaylı, ${reservedCount} ödeme bekliyor)`
              : ` (${confirmedCount} onaylı)`
          }`
        : "Aktif alıcı yok";
      return {
        id: `${source}-group-${groupId}`,
        groupId,
        messageId: null,
        messageBody: "",
        groupCode: text(group.code ?? group.operationCode, "Grup bekliyor"),
        campaign: relationTitle(group.campaign ?? group.product, "Video operasyonu"),
        recipient: recipientSummary,
        status: text(group.status, "draft"),
        videoStatus: text(video.status, "waiting"),
        updatedAt: text(group.updatedAt ?? group.createdAt),
        recipients,
      };
    });
    return [...messageRows, ...waitingRows];
  }

  return buildRows("unified", groups, messages, videos, members);
}
