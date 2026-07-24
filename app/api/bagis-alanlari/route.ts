import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getPublicLocale, isAppLocale } from "@/lib/i18n";
import { getOpenDonationAreas } from "@/lib/public/donation-areas";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestedLocale = request.nextUrl.searchParams.get("locale");
  const locale = isAppLocale(requestedLocale) ? requestedLocale : await getPublicLocale();
  const areas = await getOpenDonationAreas(locale);
  return NextResponse.json({ areas, locale });
}
