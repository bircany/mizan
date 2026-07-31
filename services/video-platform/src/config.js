import path from "node:path";

const GIB = 1024 ** 3;

function env(name, fallback) {
  const value = process.env[name]?.trim();
  if (value) return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required environment variable: ${name}`);
}

function positiveInteger(name, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const value = Number.parseInt(env(name, String(fallback)), 10);
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}

function boolean(name, fallback = false) {
  const value = env(name, String(fallback)).toLowerCase();
  if (["1", "true", "yes"].includes(value)) return true;
  if (["0", "false", "no"].includes(value)) return false;
  throw new Error(`${name} must be true or false`);
}

function commaList(name, fallback = "") {
  return env(name, fallback)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function secret(name, minimumBytes = 32) {
  const value = env(name);
  if (Buffer.byteLength(value, "utf8") < minimumBytes) {
    throw new Error(`${name} must contain at least ${minimumBytes} bytes`);
  }
  return value;
}

export function databaseConfig() {
  return {
    connectionString: env("DATABASE_URL"),
    max: positiveInteger("DATABASE_POOL_MAX", 8, { max: 30 }),
    idleTimeoutMillis: positiveInteger("DATABASE_IDLE_TIMEOUT_MS", 30_000, { max: 300_000 }),
    connectionTimeoutMillis: positiveInteger("DATABASE_CONNECT_TIMEOUT_MS", 10_000, { max: 60_000 }),
    statementTimeoutMillis: positiveInteger("DATABASE_STATEMENT_TIMEOUT_MS", 30_000, { max: 120_000 }),
    sslMode: env("DATABASE_SSL_MODE", "require"),
  };
}

export function storageConfig() {
  const root = path.resolve(env("STORAGE_ROOT", "/var/lib/mizan"));
  return Object.freeze({
    root,
    uploads: path.resolve(env("UPLOADS_DIR", path.join(root, "uploads"))),
    raw: path.resolve(env("RAW_DIR", path.join(root, "raw"))),
    processing: path.resolve(env("PROCESSING_DIR", path.join(root, "processing"))),
    ready: path.resolve(env("READY_DIR", path.join(root, "ready"))),
    replaced: path.resolve(env("REPLACED_DIR", path.join(root, "replaced"))),
    quarantine: path.resolve(env("QUARANTINE_DIR", path.join(root, "quarantine"))),
    logo: path.resolve(env("LOGO_PATH", "/opt/mizan/assets/mizan-logo.png")),
    fontRegular: path.resolve(env("FONT_REGULAR_PATH", "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf")),
    fontBold: path.resolve(env("FONT_BOLD_PATH", "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf")),
  });
}

export function uploadConfig() {
  return Object.freeze({
    publicKey: env("UPLOAD_TOKEN_PUBLIC_KEY").replaceAll("\\n", "\n"),
    keyId: process.env.UPLOAD_TOKEN_KEY_ID?.trim() || null,
    issuer: env("UPLOAD_TOKEN_ISSUER", "mizan-web"),
    audience: env("UPLOAD_TOKEN_AUDIENCE", "mizan-video-upload"),
    maxBytes: positiveInteger("UPLOAD_MAX_BYTES", 2 * GIB, { max: 2 * GIB }),
    maxSeconds: positiveInteger("UPLOAD_MAX_SECONDS", 600, { max: 600 }),
    maxTokenLifetimeSeconds: positiveInteger("UPLOAD_TOKEN_MAX_TTL_SECONDS", 600, { max: 600 }),
    clockToleranceSeconds: positiveInteger("UPLOAD_TOKEN_CLOCK_TOLERANCE_SECONDS", 20, { max: 60 }),
    hookSecret: secret("HOOK_SHARED_SECRET"),
  });
}

export function apiConfig() {
  const origins = commaList(
    "CORS_ALLOWED_ORIGINS",
    "https://mizander.com.tr,https://www.mizander.com.tr",
  );
  if (origins.some((origin) => origin === "*")) {
    throw new Error("Wildcard CORS is forbidden");
  }
  return Object.freeze({
    host: env("API_HOST", "0.0.0.0"),
    port: positiveInteger("API_PORT", 8080, { max: 65_535 }),
    allowedOrigins: new Set(origins),
    trustProxy: boolean("TRUST_PROXY", true),
    publicBaseUrl: env("VIDEO_PUBLIC_BASE_URL", "https://video.softartdevstudios.cloud").replace(/\/$/, ""),
    mediaSecret: secret("MEDIA_SIGNING_SECRET"),
    mediaTtlSeconds: positiveInteger("MEDIA_TOKEN_TTL_SECONDS", 300, { max: 600 }),
    accessAttempts: positiveInteger("ACCESS_CODE_MAX_ATTEMPTS", 5, { max: 10 }),
    accessWindowSeconds: positiveInteger("ACCESS_CODE_WINDOW_SECONDS", 900, { max: 3600 }),
    accessBlockSeconds: positiveInteger("ACCESS_CODE_BLOCK_SECONDS", 900, { max: 3600 }),
    deliveryMode: env("MEDIA_DELIVERY_MODE", "node"),
    xAccelPrefix: env("MEDIA_X_ACCEL_PREFIX", "/_protected-video"),
    internalSecret: secret("INTERNAL_API_SHARED_SECRET"),
    internalSignatureMaxAgeSeconds: positiveInteger("INTERNAL_SIGNATURE_MAX_AGE_SECONDS", 300, { max: 600 }),
  });
}

export function accessCodeEncryptionConfig() {
  const encodedKey = env("ACCESS_CODE_ENCRYPTION_KEY");
  const key = Buffer.from(encodedKey, "base64");
  if (key.length !== 32 || key.toString("base64").replace(/=+$/, "") !== encodedKey.replace(/=+$/, "")) {
    throw new Error("ACCESS_CODE_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
  }
  return Object.freeze({ key });
}

export function accessMaterialsConfig() {
  return Object.freeze({
    ...accessCodeEncryptionConfig(),
    publicLinkSecret: secret("PUBLIC_LINK_TOKEN_SECRET"),
    landingBaseUrl: env("DELIVERY_WEB_BASE_URL", "https://www.mizander.com.tr").replace(/\/$/, ""),
  });
}

export function safeTestRecipientsConfig() {
  let parsed;
  try {
    parsed = JSON.parse(env("DELIVERY_SAFE_TEST_NUMBERS_JSON", "[]"));
  } catch {
    throw new Error("DELIVERY_SAFE_TEST_NUMBERS_JSON must be valid JSON");
  }
  if (!Array.isArray(parsed)) throw new Error("DELIVERY_SAFE_TEST_NUMBERS_JSON must be an array");
  const recipients = new Map();
  for (const entry of parsed) {
    const key = String(entry?.key || "");
    const label = String(entry?.label || "");
    const phone = String(entry?.phone || "").replace(/\D/g, "");
    if (
      !/^[a-z0-9_-]{2,40}$/.test(key) ||
      label.length < 2 ||
      label.length > 80 ||
      !/^\d{10,15}$/.test(phone) ||
      recipients.has(key)
    ) {
      throw new Error("DELIVERY_SAFE_TEST_NUMBERS_JSON contains an invalid or duplicate recipient");
    }
    recipients.set(key, Object.freeze({ key, label, phone }));
  }
  return recipients;
}

export function videoWorkerConfig() {
  return Object.freeze({
    workerId: env("WORKER_ID", `video-${process.pid}`),
    pollIntervalMs: positiveInteger("VIDEO_WORKER_POLL_MS", 5_000, { min: 500, max: 60_000 }),
    maxSeconds: positiveInteger("UPLOAD_MAX_SECONDS", 600, { max: 600 }),
    maxBytes: positiveInteger("UPLOAD_MAX_BYTES", 2 * GIB, { max: 2 * GIB }),
    ffmpegTimeoutMs: positiveInteger("FFMPEG_TIMEOUT_MS", 45 * 60_000, { min: 60_000, max: 90 * 60_000 }),
    outputGrowthRatio: Number.parseFloat(env("OUTPUT_MAX_RAW_RATIO", "1.10")),
    retryDelaySeconds: positiveInteger("VIDEO_RETRY_DELAY_SECONDS", 30, { max: 3600 }),
    ffmpegThreads: positiveInteger("FFMPEG_THREADS", 2, { max: 8 }),
    transcodeEnabled: boolean("VIDEO_TRANSCODE_ENABLED", false),
    closingTitle: env("CLOSING_TITLE", "Mizan İnsani Yardım Derneği"),
    closingMessage: env("CLOSING_MESSAGE", "Allah hayrınızı kabul etsin."),
    closingCredit: env("CLOSING_CREDIT", "Powered by SoftArt Studios"),
  });
}

export function deliveryPolicyConfig() {
  return Object.freeze({
    requireTestBeforeDispatch: boolean("REQUIRE_DELIVERY_TEST", false),
  });
}

export function messageWorkerConfig() {
  return Object.freeze({
    workerId: env("WORKER_ID", `message-${process.pid}`),
    pollIntervalMs: positiveInteger("MESSAGE_WORKER_POLL_MS", 2_000, { min: 500, max: 60_000 }),
    leaseMinutes: positiveInteger("MESSAGE_LEASE_MINUTES", 5, { max: 30 }),
    evolutionUrl: env("EVOLUTION_INTERNAL_URL").replace(/\/$/, ""),
    evolutionApiKey: env("EVOLUTION_API_KEY"),
    evolutionInstance: env("EVOLUTION_INSTANCE_NAME"),
    requestTimeoutMs: positiveInteger("EVOLUTION_TIMEOUT_MS", 20_000, { max: 60_000 }),
    healthPath: env("EVOLUTION_HEALTH_PATH", "/instance/connectionState/{instance}"),
    lookupPath: process.env.EVOLUTION_LOOKUP_PATH?.trim() || null,
    minDelayMs: positiveInteger("MESSAGE_MIN_DELAY_MS", 5_000, { min: 5_000, max: 9_000 }),
    maxDelayMs: positiveInteger("MESSAGE_MAX_DELAY_MS", 9_000, { min: 5_000, max: 9_000 }),
    batchSize: positiveInteger("MESSAGE_BATCH_SIZE", 50, { max: 50 }),
    batchPauseMs: positiveInteger("MESSAGE_BATCH_PAUSE_MS", 120_000, { min: 120_000, max: 600_000 }),
    outageErrorLimit: positiveInteger("EVOLUTION_OUTAGE_ERROR_LIMIT", 5, { max: 10 }),
  });
}

export function retentionConfig() {
  return Object.freeze({
    intervalMs: positiveInteger("RETENTION_INTERVAL_MS", 60 * 60_000, { min: 60_000, max: 24 * 60 * 60_000 }),
    warningBytes: positiveInteger("DISK_WARNING_BYTES", 20 * GIB),
    blockBytes: positiveInteger("DISK_BLOCK_BYTES", 15 * GIB),
    ffmpegReserveBytes: positiveInteger("FFMPEG_RESERVE_BYTES", GIB),
  });
}
