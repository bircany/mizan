import config from "@payload-config";
import { GRAPHQL_POST } from "@payloadcms/next/routes";

import { requirePayloadAdminApi } from "@/lib/auth/payload-api";

const post = GRAPHQL_POST(config);

export async function POST(...args: Parameters<typeof post>) {
  const denied = await requirePayloadAdminApi(args[0]);
  return denied || post(...args);
}
