import { decryptAccessCode } from "./security/access-code-crypto.js";
import { publicVideoUrl } from "./access-materials.js";

function singleLine(value, maxLength) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function validateSnapshot(message) {
  const snapshot = message.message_snapshot;
  const system = message.system_payload_snapshot;
  if (
    snapshot?.schemaVersion !== 1 ||
    system?.schemaVersion !== 1 ||
    String(system.groupId) !== String(message.group_id) ||
    String(system.videoId) !== String(message.video_id) ||
    String(system.messageType) !== String(message.message_type)
  ) {
    throw new Error("Message snapshot contract is invalid");
  }
  if (!Array.isArray(snapshot.recipientNames) || snapshot.recipientNames.length === 0) {
    throw new Error("Message recipientNames snapshot is missing");
  }
  return { snapshot, system };
}

export function renderDeliveryMessage(message, group, config) {
  const { snapshot } = validateSnapshot(message);
  const accessCode = decryptAccessCode(group.access_code_ciphertext, config.key);
  const recipientNames = [...new Set(snapshot.recipientNames.map((name) => singleLine(name, 100)).filter(Boolean))]
    .slice(0, 30);
  if (recipientNames.length === 0) throw new Error("Message recipient names are empty");
  const editableBody = String(message.body_snapshot || "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 2000);
  const campaignName = singleLine(snapshot.campaignName, 160);
  const normalizedBody = editableBody.toLocaleLowerCase("tr-TR");
  const hasGreeting = /(?:^|\n)\s*sayın\b/.test(normalizedBody);
  const hasCampaignLine = /(?:^|\n)\s*kampanya\s*:/.test(normalizedBody);
  const hasGroupCodeLine = /(?:^|\n)\s*grup kodu\s*:/.test(normalizedBody);
  const lines = [
    hasGreeting ? "" : `Sayın ${recipientNames.join(", ")},`,
    editableBody,
    campaignName && !hasCampaignLine ? `Kampanya: ${campaignName}` : "",
    hasGroupCodeLine ? "" : `Grup kodu: ${singleLine(group.code, 40)}`,
    `Video bağlantısı: ${publicVideoUrl(group.id, config)}`,
    `Erişim kodu: *${accessCode}*`,
    `Kodu kopyala`,
  ].filter(Boolean);
  return lines.join("\n\n");
}
