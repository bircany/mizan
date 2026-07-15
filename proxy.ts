import { NextResponse, type NextRequest } from "next/server";

const PANEL_LOGIN_PATH = "/panel/giris";
const PAYLOAD_AUTH_COOKIE = "payload-token";

function panelLoginRedirect(request: NextRequest) {
  const url = new URL(PANEL_LOGIN_PATH, request.url);
  const returnTo = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  if (request.nextUrl.pathname !== PANEL_LOGIN_PATH) {
    url.searchParams.set("returnTo", returnTo);
  }

  return NextResponse.redirect(url);
}

/**
 * Proxy yalnızca oturum çerezinin varlığını kontrol eder. Kullanıcının aktifliği ve
 * sayfa bazındaki rolü, her istekte server component/API katmanında doğrulanır.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/yonetim")) {
    return request.cookies.has(PAYLOAD_AUTH_COOKIE)
      ? NextResponse.redirect(new URL("/panel", request.url))
      : panelLoginRedirect(request);
  }

  if (pathname !== PANEL_LOGIN_PATH && !request.cookies.has(PAYLOAD_AUTH_COOKIE)) {
    return panelLoginRedirect(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/panel/:path*", "/yonetim/:path*"],
};
