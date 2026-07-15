import path from "path";

let loaded = false;

export function ensureLocalEnvLoaded() {
  if (loaded) return;

  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, ".env.local"),
    path.join(cwd, ".env"),
    path.join(cwd, "..", ".env.local"),
    path.join(cwd, "..", ".env"),
  ];

  for (const filePath of candidates) {
    try {
      process.loadEnvFile(filePath);
    } catch {
      continue;
    }
  }

  loaded = true;
}

export function requiredEnv(name: string) {
  ensureLocalEnvLoaded();

  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  const normalized = value.trim();
  const invalidPatterns = [
    /^REPLACE_WITH_/i,
    /^YOUR_/i,
    /(^|[_-])example([_-]|$)/i,
    /^base$/i,
  ];

  if (
    !normalized ||
    invalidPatterns.some((pattern) => pattern.test(normalized))
  ) {
    throw new Error(`${name} has an invalid placeholder value.`);
  }

  return normalized;
}
