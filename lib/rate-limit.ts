import { createHash } from "crypto";

import { databaseQuery } from "@/lib/database";

type RateLimitInput = {
  scope: string;
  identity: string;
  maxRequests: number;
  windowSeconds: number;
};

export class RateLimitError extends Error {
  constructor(
    message: string,
    readonly status: 429 | 503,
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}

export async function enforceRateLimit({
  scope,
  identity,
  maxRequests,
  windowSeconds,
}: RateLimitInput) {
  const keyHash = createHash("sha256").update(`${scope}:${identity}`).digest("hex");
  let allowed: boolean;
  try {
    const result = await databaseQuery<{ allowed: boolean }>(
      "select public.consume_api_rate_limit($1,$2,$3) as allowed",
      [`${scope}:${keyHash}`, windowSeconds, maxRequests],
    );
    allowed = result.rows[0]?.allowed === true;
  } catch {
    throw new RateLimitError("İstek koruma altyapısı şu anda kullanılamıyor.", 503);
  }

  if (!allowed) {
    throw new RateLimitError(
      "Çok fazla istek gönderildi. Lütfen biraz sonra tekrar deneyin.",
      429,
    );
  }
}
