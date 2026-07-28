export function decodeBase64Url(value, label = "value") {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error(`Invalid base64url ${label}`);
  }
  return Buffer.from(value, "base64url");
}

export function encodeBase64Url(value) {
  return Buffer.from(value).toString("base64url");
}

export function parseJsonBuffer(buffer, label) {
  try {
    return JSON.parse(buffer.toString("utf8"));
  } catch {
    throw new Error(`Invalid JSON ${label}`);
  }
}
