import "server-only";

import { databaseQuery } from "@/lib/database";

const replayKeyPattern = /^[a-f0-9]{64}$/;

/**
 * Atomically records a valid webhook signature. A false return means the same
 * signed payload has already been accepted.
 */
export async function claimDeliveryWebhookReplayKey(replayKey: string) {
  if (!replayKeyPattern.test(replayKey)) {
    throw new Error("Webhook replay key is malformed.");
  }
  const result = await databaseQuery<{ accepted: boolean }>(
    `insert into public.api_rate_limits (
       rate_limit_key,
       window_started_at,
       request_count,
       updated_at
     )
     values ($1, now(), 1, now())
     on conflict (rate_limit_key) do nothing
     returning true as accepted`,
    [`delivery-webhook:${replayKey}`],
  );
  return result.rows[0]?.accepted === true;
}

export async function purgeExpiredDeliveryWebhookReplayKeys() {
  const result = await databaseQuery(
    `delete from public.api_rate_limits
     where rate_limit_key like 'delivery-webhook:%'
       and updated_at < now() - interval '24 hours'`,
  );
  return result.rowCount ?? 0;
}
