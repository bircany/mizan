import { sha256 } from "./security/hashes.js";

export function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  const entries = Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
  return `{${entries.join(",")}}`;
}

export async function computeGroupMessageFingerprint(client, groupId) {
  const groupResult = await client.query(
    `select
       g.id,
       g.active_video_id,
       g.access_code_rotation_count,
       v.version,
       v.processed_sha256
     from operation_groups g
     join operation_videos v on v.id = g.active_video_id
     where g.id = $1
     for share of g, v`,
    [groupId],
  );
  const group = groupResult.rows[0];
  if (!group?.active_video_id || !group.processed_sha256) {
    throw new Error("Group has no active processed video");
  }
  const messages = await client.query(
    `select id, video_id, body_snapshot, message_snapshot, system_payload_snapshot
     from delivery_messages
     where group_id = $1
       and is_test = false
       and message_type in ('normal', 'correction', 'code_renewal')
       and status <> 'cancelled'
     order by id`,
    [groupId],
  );
  if (messages.rowCount === 0) throw new Error("Group has no delivery drafts");
  const canonical = {
    activeVideo: {
      id: String(group.active_video_id),
      version: Number(group.version),
      processedSha256: group.processed_sha256,
    },
    accessCodeRotationCount: Number(group.access_code_rotation_count),
    drafts: messages.rows.map((message) => ({
      id: String(message.id),
      videoId: String(message.video_id),
      bodySnapshot: message.body_snapshot,
      messageSnapshot: message.message_snapshot,
      systemPayloadSnapshot: message.system_payload_snapshot,
    })),
  };
  return {
    fingerprint: sha256(stableStringify(canonical)),
    activeVideoId: group.active_video_id,
    canonical,
  };
}
