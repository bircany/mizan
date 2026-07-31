import { getPool, transaction } from "./db.js";

const ffmpegLockName = "mizan:video-ffmpeg:v1";

export async function claimVideo(workerId) {
  const client = await getPool().connect();
  try {
    const lock = await client.query(
      "select pg_try_advisory_lock(hashtext($1)) as acquired",
      [ffmpegLockName],
    );
    if (!lock.rows[0]?.acquired) {
      client.release();
      return null;
    }
    await client.query("begin");
    const candidate = await client.query(
      `select
         v.*,
         g.code as group_code,
         g.slaughter_script_snapshot as group_slaughter_script_snapshot
       from operation_videos v
       join operation_groups g on g.id = v.group_id
       where (
         v.status = 'uploaded'
         or (
           v.status = 'processing_failed'
           and v.retry_after <= now()
           and v.attempt_count < 2
         )
       )
       order by coalesce(v.retry_after, v.created_at), v.id
       for update of v skip locked
       limit 1`,
    );
    const video = candidate.rows[0];
    if (!video) {
      await client.query("commit");
      await client.query("select pg_advisory_unlock(hashtext($1))", [ffmpegLockName]);
      client.release();
      return null;
    }
    const updated = await client.query(
      `update operation_videos
       set status = 'processing',
           attempt_count = attempt_count + 1,
           processing_started_at = now(),
           retry_after = null,
           last_error = null,
           last_error_code = null,
           updated_at = now()
       where id = $1
       returning *`,
      [video.id],
    );
    await client.query("commit");
    return {
      client,
      video: {
        ...updated.rows[0],
        group_code: video.group_code,
        group_slaughter_script_snapshot: video.group_slaughter_script_snapshot,
      },
      workerId,
    };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    await client.query("select pg_advisory_unlock(hashtext($1))", [ffmpegLockName]).catch(() => {});
    client.release();
    throw error;
  }
}

export async function releaseVideoClaim(claim) {
  if (!claim?.client) return;
  await claim.client.query("select pg_advisory_unlock(hashtext($1))", [ffmpegLockName]).catch(() => {});
  claim.client.release();
}

export async function updateRawStorage(videoId, rawStorageKey) {
  await transaction((client) => client.query(
    `update operation_videos
     set raw_storage_key = $2, updated_at = now()
     where id = $1 and status = 'processing'`,
    [videoId, rawStorageKey],
  ));
}

export async function findDuplicateSource(videoId, groupId, checksum) {
  const result = await transaction((client) => client.query(
    `select id, version
     from operation_videos
     where group_id = $1
       and id <> $2
       and raw_sha256 = $3
       and status not in ('rejected', 'deleted')
     order by version desc, id desc
     limit 1`,
    [groupId, videoId, checksum],
  ));
  return result.rows[0] || null;
}

export async function markVideoProcessed(videoId, metadata) {
  await transaction(async (client) => {
    const result = await client.query(
      `update operation_videos
       set status = 'review_pending',
           detected_mime_type = $2,
           container_format = $3,
           video_codec = $4,
           audio_codec = $5,
           width = $6,
           height = $7,
           duration_seconds = $8,
           raw_sha256 = $9,
           processed_sha256 = $10,
           raw_storage_key = $11,
           processed_storage_key = $12,
           technical_metadata = $13::jsonb,
           processing_settings_snapshot = $14::jsonb,
           watermark_snapshot = $15::jsonb,
           closing_card_snapshot = $16::jsonb,
           slaughter_script_snapshot = coalesce(slaughter_script_snapshot, $17),
           ready_at = now(),
           raw_delete_after = now() + interval '3 days',
           processed_delete_after = now() + interval '3 months 7 days',
           expires_at = now() + interval '3 months',
           processing_failed_at = null,
           retry_after = null,
           quarantine_until = null,
           ffmpeg_log = $18,
           last_error = null,
           last_error_code = null,
           updated_at = now()
       where id = $1 and status = 'processing'
       returning id`,
      [
        videoId,
        metadata.probe.detectedMime,
        metadata.probe.containerFormat,
        metadata.probe.videoCodec,
        metadata.probe.audioCodec,
        metadata.outputProbe.width,
        metadata.outputProbe.height,
        metadata.probe.duration,
        metadata.rawSha256,
        metadata.processedSha256,
        metadata.rawStorageKey,
        metadata.processedStorageKey,
        JSON.stringify({
          source: metadata.probe.raw,
          output: metadata.outputProbe.raw,
          outputBytes: metadata.outputBytes,
        }),
        JSON.stringify(metadata.snapshots.processing),
        JSON.stringify(metadata.snapshots.watermark),
        JSON.stringify(metadata.snapshots.closingCard),
        metadata.slaughterScriptSnapshot || null,
        metadata.ffmpegLog.slice(-64 * 1024),
      ],
    );
    if (result.rowCount !== 1) throw new Error("Video state changed during processing");
  });
}

export async function markVideoFailed(video, failure) {
  const retry = Number(video.attempt_count) < 2 && !failure.forceQuarantine;
  await transaction((client) => client.query(
    `update operation_videos
     set status = $2::public.enum_operation_videos_status,
         processing_failed_at = now(),
         retry_after = case when $3 then now() + ($4::int * interval '1 second') else null end,
         quarantine_until = case when $3 then null else now() + interval '24 hours' end,
         raw_storage_key = coalesce($5, raw_storage_key),
         last_error = $6::text,
         last_error_code = $7::text,
         ffmpeg_log = $8::text,
         technical_metadata = coalesce(technical_metadata, '{}'::jsonb)
           || jsonb_build_object(
             'lastFailureAt', now(),
             'lastFailureCode', $7::text,
             'automaticRetryRemaining', $3
           ),
         updated_at = now()
     where id = $1`,
    [
      video.id,
      retry ? "processing_failed" : "quarantined",
      retry,
      failure.retryDelaySeconds,
      failure.quarantineStorageKey || null,
      failure.publicMessage.slice(0, 1000),
      failure.code.slice(0, 120),
      String(failure.adminLog || "").slice(-64 * 1024),
    ],
  ));
  return { retry };
}
