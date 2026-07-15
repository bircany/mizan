function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function getPaymentPublicUrl(requestUrl: string, path: string) {
  const request = new URL(requestUrl);
  const configuredBaseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim();

  if (!configuredBaseUrl) {
    return new URL(path, request.origin).toString();
  }

  const configured = new URL(configuredBaseUrl);
  const baseUrl =
    isLocalHost(request.hostname) && isLocalHost(configured.hostname)
      ? request.origin
      : configured.origin;

  return new URL(path, baseUrl).toString();
}
