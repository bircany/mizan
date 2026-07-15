import { headers } from "next/headers";

import { getPayloadClient } from "@/lib/payload";

export async function getAdminSession() {
  const payload = await getPayloadClient();
  const headerStore = await headers();
  const authResult = await payload.auth({ headers: headerStore });

  const user = authResult.user as (typeof authResult.user & { isActive?: boolean }) | null;
  return user?.isActive === false ? null : user;
}
