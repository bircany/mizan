import { createHash } from "crypto";

import { getSupabaseServiceClient } from "@/lib/supabase-server";

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
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.rpc("consume_api_rate_limit", {
    p_key: `${scope}:${keyHash}`,
    p_window_seconds: windowSeconds,
    p_max_requests: maxRequests,
  });

  if (error) {
    throw new RateLimitError("İstek koruma altyapısı şu anda kullanılamıyor.", 503);
  }

  if (!data) {
    throw new RateLimitError(
      "Çok fazla istek gönderildi. Lütfen biraz sonra tekrar deneyin.",
      429,
    );
  }
}
