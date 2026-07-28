import "server-only";

import { deliveryQuery } from "@/lib/delivery/db";

export async function claimDeliveryVideo(_workerId: string, leaseMinutes = 60) {
  const result = await deliveryQuery<{ id: number }>(
    `with candidate as (
       select id from operation_videos
       where status = 'uploaded'
          or (
            status = 'processing'
            and updated_at < now() - ($1::int * interval '1 minute')
          )
       order by created_at, id
       for update skip locked
       limit 1
     )
     update operation_videos v
     set status = 'processing',
         attempt_count = coalesce(v.attempt_count, 0) + 1,
         updated_at = now()
     from candidate
     where v.id = candidate.id
     returning v.id`,
    [leaseMinutes],
  );
  return result.rows[0]?.id ?? null;
}

export async function claimDeliveryMessage(workerId: string, leaseMinutes = 5) {
  const result = await deliveryQuery<{ id: number }>(
    `with candidate as (
       select m.id
       from delivery_messages m
       join operation_groups g on g.id = m.group_id
       where (
         (m.status = 'queued' and coalesce(m.scheduled_at, now()) <= now())
         or (
           m.status = 'sending'
           and m.locked_at < now() - ($2::int * interval '1 minute')
         )
       )
       and g.dispatch_state in ('countdown', 'queued', 'sending')
       order by coalesce(m.scheduled_at, m.created_at), m.id
       for update of m skip locked
       limit 1
     )
     update delivery_messages m
     set status = 'sending',
         locked_at = now(),
         locked_by = $1,
         updated_at = now()
     from candidate
     where m.id = candidate.id
     returning m.id`,
    [workerId, leaseMinutes],
  );
  return result.rows[0]?.id ?? null;
}

export async function redactExpiredDeliveryMessages() {
  const result = await deliveryQuery(
    `update delivery_messages
     set recipient_phone = null,
         body = null,
         redacted_at = now(),
         updated_at = now()
     where redacted_at is null
       and coalesce(sent_at, delivered_at, read_at, failed_at) < now() - interval '7 days'
       and status in ('sent', 'delivered', 'read', 'failed')`,
  );
  return result.rowCount ?? 0;
}
