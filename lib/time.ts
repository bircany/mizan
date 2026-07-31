export const APP_TIME_ZONE = "Europe/Istanbul";

type DateValue = string | number | Date;

function validDate(value: DateValue) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatIstanbulDate(
  value: DateValue,
  locale = "tr-TR",
  options: Intl.DateTimeFormatOptions = {},
) {
  const date = validDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...options,
    timeZone: APP_TIME_ZONE,
  }).format(date);
}

export function formatIstanbulDateTime(
  value: DateValue,
  locale = "tr-TR",
  options: Intl.DateTimeFormatOptions = {},
) {
  const date = validDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    ...options,
    timeZone: APP_TIME_ZONE,
  }).format(date);
}

export function getIstanbulYear(value: DateValue = new Date()) {
  const date = validDate(value);
  if (!date) return NaN;
  return Number(
    new Intl.DateTimeFormat("en", {
      timeZone: APP_TIME_ZONE,
      year: "numeric",
    }).format(date),
  );
}

export function toIstanbulDateTimeLocal(value: DateValue) {
  const date = validDate(value);
  if (!date) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

export function istanbulDateTimeLocalToIso(value: string) {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
      value.trim(),
    );
  if (!match) throw new Error("Tarih ve saat geçerli değil.");
  const [, year, month, day, hour, minute, second = "00"] = match;
  const date = new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour) - 3,
      Number(minute),
      Number(second),
    ),
  );
  if (
    Number.isNaN(date.getTime()) ||
    toIstanbulDateTimeLocal(date) !==
      `${year}-${month}-${day}T${hour}:${minute}`
  ) {
    throw new Error("Tarih ve saat geçerli değil.");
  }
  return date.toISOString();
}
