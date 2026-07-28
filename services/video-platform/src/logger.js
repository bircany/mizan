const secretKeys = /authorization|token|secret|password|access.?code|recipient.?phone|body/i;

function redact(value, key = "") {
  if (secretKeys.test(key)) return "[REDACTED]";
  if (Array.isArray(value)) return value.map((item) => redact(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([childKey, child]) => [childKey, redact(child, childKey)]));
  }
  return value;
}

export function log(level, message, fields = {}) {
  const record = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...redact(fields),
  };
  process.stdout.write(`${JSON.stringify(record)}\n`);
}

export const logger = {
  debug: (message, fields) => log("debug", message, fields),
  info: (message, fields) => log("info", message, fields),
  warn: (message, fields) => log("warn", message, fields),
  error: (message, fields) => log("error", message, fields),
};
