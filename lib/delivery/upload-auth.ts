import "server-only";

import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  randomBytes,
  randomUUID,
  sign,
  verify,
  type KeyObject,
} from "node:crypto";

import { ensureLocalEnvLoaded } from "@/lib/env";

export const DELIVERY_UPLOAD_ALLOWED_MIME = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
] as const;
export const DELIVERY_UPLOAD_MAX_BYTES = 2_147_483_648;
export const DELIVERY_UPLOAD_TOKEN_TTL_SECONDS = 10 * 60;

export type DeliveryUploadRole = "admin" | "field_operator";
export type DeliveryUploadMime = (typeof DELIVERY_UPLOAD_ALLOWED_MIME)[number];

export type DeliveryUploadGrant = {
  iss: string;
  aud: string;
  sub: string;
  userId: string;
  role: DeliveryUploadRole;
  groupId: string;
  videoId: string;
  jti: string;
  nonce: string;
  maxBytes: number;
  allowedMime: DeliveryUploadMime[];
  iat: number;
  exp: number;
};

type DeliveryUploadHeader = {
  alg: "EdDSA";
  kid: string;
  typ: "JWT";
};

type CreateDeliveryUploadGrantInput = {
  userId: string;
  role?: DeliveryUploadRole;
  groupId: string;
  videoId: string;
  jti?: string;
  nonce?: string;
  maxBytes?: number;
  allowedMime?: readonly DeliveryUploadMime[];
};

let privateKey: KeyObject | null = null;
let publicKey: KeyObject | null = null;
let developmentKeyPair: { privateKey: KeyObject; publicKey: KeyObject } | null = null;

function uploadIssuer() {
  ensureLocalEnvLoaded();
  return process.env.DELIVERY_UPLOAD_ISSUER?.trim() || "mizan-web";
}

function uploadAudience() {
  ensureLocalEnvLoaded();
  return process.env.DELIVERY_UPLOAD_AUDIENCE?.trim() || "mizan-video-upload";
}

function uploadKeyId() {
  ensureLocalEnvLoaded();
  return (
    process.env.DELIVERY_UPLOAD_KEY_ID?.trim() ||
    process.env.UPLOAD_TOKEN_KEY_ID?.trim() ||
    "mizan-upload-v1"
  );
}

function decodeConfiguredKey(value: string) {
  const normalized = value.trim().replace(/\\n/g, "\n");
  if (normalized.includes("-----BEGIN")) return normalized;
  const decoded = Buffer.from(normalized, "base64").toString("utf8").trim();
  if (!decoded.includes("-----BEGIN")) {
    throw new Error("Upload anahtarı PEM veya base64 kodlu PEM olmalıdır.");
  }
  return decoded;
}

function getDevelopmentKeyPair() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("DELIVERY_UPLOAD_PRIVATE_KEY yapılandırılmamış.");
  }
  developmentKeyPair ??= generateKeyPairSync("ed25519");
  return developmentKeyPair;
}

function getUploadPrivateKey() {
  ensureLocalEnvLoaded();
  if (privateKey) return privateKey;
  const configured = process.env.DELIVERY_UPLOAD_PRIVATE_KEY?.trim();
  privateKey = configured
    ? createPrivateKey(decodeConfiguredKey(configured))
    : getDevelopmentKeyPair().privateKey;
  return privateKey;
}

function getUploadPublicKey() {
  ensureLocalEnvLoaded();
  if (publicKey) return publicKey;
  const configured =
    process.env.DELIVERY_UPLOAD_PUBLIC_KEY?.trim() ||
    process.env.UPLOAD_TOKEN_PUBLIC_KEY?.trim();
  if (configured) {
    publicKey = createPublicKey(decodeConfiguredKey(configured));
    return publicKey;
  }
  if (process.env.DELIVERY_UPLOAD_PRIVATE_KEY?.trim()) {
    publicKey = createPublicKey(getUploadPrivateKey());
    return publicKey;
  }
  publicKey = getDevelopmentKeyPair().publicKey;
  return publicKey;
}

function encodeJson(value: object) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function decodeJson<T>(value: string): T | null {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

function isDeliveryUploadMime(value: unknown): value is DeliveryUploadMime {
  return DELIVERY_UPLOAD_ALLOWED_MIME.includes(value as DeliveryUploadMime);
}

export function createDeliveryUploadGrant(
  input: CreateDeliveryUploadGrantInput,
  ttlSeconds = DELIVERY_UPLOAD_TOKEN_TTL_SECONDS,
) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const lifetime = Math.max(
    30,
    Math.min(Math.floor(ttlSeconds), DELIVERY_UPLOAD_TOKEN_TTL_SECONDS),
  );
  const maxBytes = Math.min(
    Math.max(1, Math.floor(input.maxBytes || DELIVERY_UPLOAD_MAX_BYTES)),
    DELIVERY_UPLOAD_MAX_BYTES,
  );
  const allowedMime = [...new Set(
    (input.allowedMime || DELIVERY_UPLOAD_ALLOWED_MIME).filter(isDeliveryUploadMime),
  )];
  if (!allowedMime.length) throw new Error("Upload tokenı için video MIME tipi bulunamadı.");

  const header: DeliveryUploadHeader = {
    alg: "EdDSA",
    kid: uploadKeyId(),
    typ: "JWT",
  };
  const claims: DeliveryUploadGrant = {
    iss: uploadIssuer(),
    aud: uploadAudience(),
    sub: input.userId,
    userId: input.userId,
    role: input.role || "field_operator",
    groupId: input.groupId,
    videoId: input.videoId,
    jti: input.jti || randomUUID(),
    nonce: input.nonce || randomBytes(24).toString("base64url"),
    maxBytes,
    allowedMime,
    iat: issuedAt,
    exp: issuedAt + lifetime,
  };
  const signingInput = `${encodeJson(header)}.${encodeJson(claims)}`;
  const signature = sign(null, Buffer.from(signingInput), getUploadPrivateKey());
  return `${signingInput}.${signature.toString("base64url")}`;
}

export function verifyDeliveryUploadGrant(token: string): DeliveryUploadGrant | null {
  const [encodedHeader, encodedClaims, encodedSignature, extra] = token.split(".");
  if (!encodedHeader || !encodedClaims || !encodedSignature || extra) return null;
  const header = decodeJson<DeliveryUploadHeader>(encodedHeader);
  const claims = decodeJson<DeliveryUploadGrant>(encodedClaims);
  if (
    !header ||
    header.alg !== "EdDSA" ||
    header.typ !== "JWT" ||
    header.kid !== uploadKeyId() ||
    !claims
  ) return null;

  let signature: Buffer;
  try {
    signature = Buffer.from(encodedSignature, "base64url");
  } catch {
    return null;
  }
  const signingInput = `${encodedHeader}.${encodedClaims}`;
  if (!verify(null, Buffer.from(signingInput), getUploadPublicKey(), signature)) return null;

  const now = Math.floor(Date.now() / 1000);
  if (
    claims.iss !== uploadIssuer() ||
    claims.aud !== uploadAudience() ||
    !claims.sub ||
    claims.sub !== claims.userId ||
    !["admin", "field_operator"].includes(claims.role) ||
    !claims.groupId ||
    !claims.videoId ||
    !claims.jti ||
    !claims.nonce ||
    !Number.isInteger(claims.iat) ||
    !Number.isInteger(claims.exp) ||
    claims.iat > now + 30 ||
    claims.exp <= now ||
    claims.exp - claims.iat > DELIVERY_UPLOAD_TOKEN_TTL_SECONDS ||
    !Number.isInteger(claims.maxBytes) ||
    claims.maxBytes <= 0 ||
    claims.maxBytes > DELIVERY_UPLOAD_MAX_BYTES ||
    !Array.isArray(claims.allowedMime) ||
    !claims.allowedMime.length ||
    !claims.allowedMime.every(isDeliveryUploadMime)
  ) return null;
  return claims;
}
