export type EftBankAccount = {
  bankName: string;
  accountHolder: string;
  iban: string;
  currency: string;
};

export type EftGuidance = {
  title: string;
  description: string[];
  phone: string;
  whatsapp: string;
  workingHours: string;
  accounts: EftBankAccount[];
};

type MutableAccount = Partial<EftBankAccount>;

function normalizedLabel(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, " ");
}

export function normalizeIban(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidTurkishIban(value: string) {
  const iban = normalizeIban(value);
  if (!/^TR\d{24}$/.test(iban)) return false;

  const rearranged = `${iban.slice(4)}${iban.slice(0, 4)}`;
  const numeric = rearranged
    .split("")
    .map((character) =>
      /[A-Z]/.test(character)
        ? String(character.charCodeAt(0) - 55)
        : character,
    )
    .join("");
  let remainder = 0;
  for (const digit of numeric) {
    remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

export function formatIban(value: string) {
  return normalizeIban(value).replace(/(.{4})/g, "$1 ").trim();
}

export function phoneHref(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return `+90${digits.slice(1)}`;
  if (digits.startsWith("90")) return `+${digits}`;
  return `+${digits}`;
}

export function whatsappNumber(value: string) {
  return phoneHref(value).replace(/\D/g, "");
}

export function parseEftGuidance(
  title: string,
  paragraphs: string[],
): EftGuidance {
  const result: EftGuidance = {
    title: title || "EFT / Havale ile Bağış",
    description: [],
    phone: "",
    whatsapp: "",
    workingHours: "",
    accounts: [],
  };
  let current: MutableAccount | null = null;

  function finishAccount() {
    if (
      current?.bankName &&
      current.accountHolder &&
      current.iban &&
      isValidTurkishIban(current.iban)
    ) {
      result.accounts.push({
        bankName: current.bankName,
        accountHolder: current.accountHolder,
        iban: normalizeIban(current.iban),
        currency: current.currency || "TRY",
      });
    }
    current = null;
  }

  const lines = paragraphs.flatMap((paragraph) => paragraph.split(/\r?\n/));
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 1) {
      result.description.push(line);
      continue;
    }

    const label = normalizedLabel(line.slice(0, separator));
    const value = line.slice(separator + 1).trim();
    if (label === "telefon") result.phone = value;
    else if (label === "whatsapp") result.whatsapp = value;
    else if (label === "çalışma saatleri") result.workingHours = value;
    else if (label === "banka") {
      finishAccount();
      current = { bankName: value };
    } else if (label === "hesap sahibi") {
      current = { ...(current || {}), accountHolder: value };
    } else if (label === "iban" || label === "ıban") {
      current = { ...(current || {}), iban: value };
    } else if (label === "para birimi") {
      current = {
        ...(current || {}),
        currency: value.toUpperCase() || "TRY",
      };
    } else {
      result.description.push(line);
    }
  }
  finishAccount();

  return result;
}

export function validatePublishedEftGuidance(
  title: string,
  content: string,
) {
  const guidance = parseEftGuidance(
    title,
    content.split(/\n\s*\n/).map((value) => value.trim()).filter(Boolean),
  );
  if (!phoneHref(guidance.phone) && !whatsappNumber(guidance.whatsapp)) {
    return "EFT yönlendirmesi için Telefon veya WhatsApp numarası zorunludur.";
  }
  if (!guidance.accounts.length) {
    return "En az bir banka hesabı ve geçerli TR IBAN girilmelidir.";
  }
  return null;
}
