import { query } from "./db.js";
import { HttpError } from "./errors.js";
import { verifyAccessCode } from "./security/access-code.js";
import { sha256 } from "./security/hashes.js";
import { createMediaToken } from "./security/media-token.js";

async function consumeFailureLimit(key, config) {
  const result = await query(
    "select public.consume_api_rate_limit($1, $2, $3) as allowed",
    [key, config.accessWindowSeconds, config.accessAttempts],
  );
  return Boolean(result.rows[0]?.allowed);
}

function accessFailure() {
  return new HttpError(401, "invalid_video_access", "Bağlantı veya erişim kodu geçersiz.");
}

export async function verifyGroupAccess({ linkToken, accessCode, ip }, config) {
  if (!/^[A-Za-z0-9_-]{32,160}$/.test(String(linkToken || ""))) throw accessFailure();
  const linkHash = sha256(linkToken);
  const result = await query(
    `select
       g.id,
       g.code,
       g.access_code_hash,
       g.access_code_rotation_count,
       coalesce(g.expires_at, v.expires_at) as expires_at,
       v.id as video_id,
       v.version,
       coalesce(g.operation_type::text, c.operation_type::text) as operation_type
     from operation_groups g
     join operation_videos v on v.group_id = g.id and v.is_active = true and v.status = 'ready'
     join campaigns c on c.id = g.campaign_id
     where g.public_link_token_hash = $1
     limit 1`,
    [linkHash],
  );
  const group = result.rows[0];
  const failureKey = `video-access:${sha256(ip)}:${linkHash}`;
  if (!group || !group.access_code_hash || !(await verifyAccessCode(accessCode, group.access_code_hash))) {
    const allowed = await consumeFailureLimit(failureKey, config);
    if (!allowed) throw new HttpError(429, "video_access_blocked", "Çok fazla hatalı deneme yapıldı. 15 dakika sonra yeniden deneyin.");
    throw accessFailure();
  }
  if (!group.expires_at || new Date(group.expires_at).getTime() <= Date.now()) {
    throw new HttpError(410, "video_expired", "Bu videonun erişim süresi sona erdi.");
  }

  const common = {
    videoId: group.video_id,
    groupId: group.id,
    codeVersion: group.access_code_rotation_count,
  };
  const streamAuthorization = createMediaToken(
    { ...common, purpose: "stream" },
    config.mediaSecret,
    config.mediaTtlSeconds,
  );
  const downloadAuthorization = createMediaToken(
    { ...common, purpose: "download" },
    config.mediaSecret,
    config.mediaTtlSeconds,
  );
  return {
    groupCode: group.code,
    expiresAt: new Date(group.expires_at).toISOString(),
    serverNow: new Date().toISOString(),
    sensitiveContent: group.operation_type === "slaughter_video",
    streamUrl: `${config.publicBaseUrl}/v1/media/${group.video_id}?authorization=${encodeURIComponent(streamAuthorization)}&disposition=inline`,
    downloadUrl: `${config.publicBaseUrl}/v1/media/${group.video_id}?authorization=${encodeURIComponent(downloadAuthorization)}&disposition=attachment`,
  };
}

export async function getGroupLanding(linkToken) {
  if (!/^[A-Za-z0-9_-]{32,160}$/.test(String(linkToken || ""))) {
    throw new HttpError(404, "video_link_not_found", "Video bağlantısı bulunamadı.");
  }
  const result = await query(
    `select
       g.code,
       coalesce(
         g.expires_at,
         (
           select max(v.expires_at)
           from operation_videos v
           where v.group_id = g.id and v.is_active = true and v.status = 'ready'
         )
       ) as expires_at,
       c.operation_type,
       coalesce(
         (
           select cl.title
           from campaigns_locales cl
           where cl._parent_id = c.id
           order by (cl._locale = 'tr') desc, cl.id
           limit 1
         ),
         'Mizan video teslimatı'
       ) as campaign_name,
       exists (
         select 1
         from operation_videos v
         where v.group_id = g.id and v.is_active = true and v.status = 'ready'
       ) as has_active_video
     from operation_groups g
     join campaigns c on c.id = g.campaign_id
     where g.public_link_token_hash = $1
     limit 1`,
    [sha256(linkToken)],
  );
  const group = result.rows[0];
  if (!group) throw new HttpError(404, "video_link_not_found", "Video bağlantısı bulunamadı.");
  const serverNow = new Date();
  const expiresAt = group.expires_at ? new Date(group.expires_at) : null;
  return {
    groupCode: group.code,
    campaignName: group.campaign_name,
    expiresAt: expiresAt?.toISOString() || null,
    serverNow: serverNow.toISOString(),
    sensitiveContent: group.operation_type === "slaughter_video",
    available: Boolean(group.has_active_video && expiresAt && expiresAt.getTime() > serverNow.getTime()),
  };
}

export async function authorizeMedia(videoId, authorization, purpose, verifyToken) {
  const claims = verifyToken(authorization, { videoId, purpose });
  const review = purpose === "review";
  const result = await query(
    `select
       v.id,
       v.group_id,
       v.processed_storage_key,
       v.processed_sha256,
       v.size_bytes,
       g.code,
       coalesce(g.expires_at, v.expires_at) as expires_at,
       g.access_code_rotation_count
     from operation_videos v
     join operation_groups g on g.id = v.group_id
     where v.id::text = $1
       and v.group_id::text = $2
       and ($4::boolean = true or v.is_active = true)
       and (($4::boolean = true and v.status in ('review_pending', 'ready')) or ($4::boolean = false and v.status = 'ready'))
       and ($4::boolean = true or coalesce(g.expires_at, v.expires_at) > now())
       and g.access_code_rotation_count = $3
     limit 1`,
    [String(videoId), String(claims.groupId), Number(claims.codeVersion), review],
  );
  const media = result.rows[0];
  if (!media?.processed_storage_key) {
    throw new HttpError(404, "video_not_found", "Video bulunamadı veya erişim süresi doldu.");
  }
  return media;
}
