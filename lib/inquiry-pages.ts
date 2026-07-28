export type ContactPageContent = {
  title: string;
  intro: string;
  address: string;
  phone: string;
  whatsapp: string;
  emails: string[];
  workingHours: string[];
  mapQuery: string;
};

export type StudentPageContent = {
  title: string;
  intro: string;
  weekday: string;
  weekend: string;
  phone: string;
  email: string;
  programs: string[];
};

function label(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, " ");
}

function lines(paragraphs: string[]) {
  return paragraphs
    .flatMap((paragraph) => paragraph.split(/\r?\n/))
    .map((line) => line.trim())
    .filter(Boolean);
}

function splitLabel(line: string) {
  const separator = line.indexOf(":");
  if (separator < 1) return null;
  return {
    key: label(line.slice(0, separator)),
    value: line.slice(separator + 1).trim(),
  };
}

export function parseContactPage(
  title: string,
  paragraphs: string[],
): ContactPageContent {
  const result: ContactPageContent = {
    title: title || "İletişim",
    intro: "",
    address: "",
    phone: "",
    whatsapp: "",
    emails: [],
    workingHours: [],
    mapQuery: "",
  };
  let section: "address" | "contact" | "email" | "hours" | null = null;
  const intro: string[] = [];
  const address: string[] = [];

  for (const line of lines(paragraphs)) {
    const normalized = label(line);
    if (normalized === "adres") {
      section = "address";
      continue;
    }
    if (normalized === "telefon ve whatsapp") {
      section = "contact";
      continue;
    }
    if (normalized === "e-posta" || normalized === "e-posta adresleri") {
      section = "email";
      continue;
    }
    if (normalized === "çalışma saatleri") {
      section = "hours";
      continue;
    }

    const field = splitLabel(line);
    if (field?.key === "açıklama") {
      intro.push(field.value);
      section = null;
    } else if (field?.key === "adres") {
      address.push(field.value);
      section = "address";
    } else if (field?.key === "telefon") {
      result.phone = field.value;
      section = null;
    } else if (field?.key === "whatsapp") {
      result.whatsapp = field.value;
      section = null;
    } else if (field?.key === "e-posta") {
      if (field.value) result.emails.push(field.value);
      section = "email";
    } else if (field?.key === "çalışma saatleri") {
      if (field.value) result.workingHours.push(field.value);
      section = "hours";
    } else if (field?.key === "harita") {
      result.mapQuery = field.value;
      section = null;
    } else if (section === "address") {
      address.push(line);
    } else if (section === "contact") {
      if (!result.phone) result.phone = line;
      if (!result.whatsapp) result.whatsapp = line;
    } else if (section === "email") {
      result.emails.push(line);
    } else if (section === "hours") {
      result.workingHours.push(line);
    } else {
      intro.push(line);
    }
  }

  result.intro =
    intro.join(" ") ||
    "Bağış, faaliyet, gönüllülük ve diğer sorularınız için bizimle iletişime geçebilirsiniz.";
  result.address = address.join(", ");
  result.whatsapp ||= result.phone;
  result.mapQuery ||= result.address;
  result.emails = [...new Set(result.emails)];
  result.workingHours = [...new Set(result.workingHours)];
  return result;
}

export function parseStudentPage(
  title: string,
  paragraphs: string[],
): StudentPageContent {
  const result: StudentPageContent = {
    title: title || "Talebe Ol",
    intro: "",
    weekday: "",
    weekend: "",
    phone: "",
    email: "",
    programs: [],
  };
  const intro: string[] = [];

  for (const line of lines(paragraphs)) {
    const field = splitLabel(line);
    if (field?.key === "açıklama") intro.push(field.value);
    else if (field?.key === "hafta içi") result.weekday = field.value;
    else if (field?.key === "hafta sonu") result.weekend = field.value;
    else if (field?.key === "telefon") result.phone = field.value;
    else if (field?.key === "e-posta") result.email = field.value;
    else if (field?.key === "eğitim seçeneği" && field.value) {
      result.programs.push(field.value);
    } else {
      intro.push(line);
    }
  }

  result.intro =
    intro.join(" ") ||
    "Eğitim çalışmalarımız hakkında bilgi almak ve ön başvuru bırakmak için formu doldurabilirsiniz.";
  result.programs = [...new Set(result.programs)];
  if (!result.programs.length) result.programs.push("Genel bilgi ve ön başvuru");
  return result;
}

export function validatePublishedContactPage(title: string, content: string) {
  const parsed = parseContactPage(
    title,
    content.split(/\n\s*\n/).filter(Boolean),
  );
  if (!parsed.address) return "İletişim sayfasında Adres alanı zorunludur.";
  if (!parsed.phone && !parsed.emails.length) {
    return "İletişim sayfasında Telefon veya E-posta alanı zorunludur.";
  }
  if (!parsed.mapQuery) return "İletişim sayfasında Harita alanı zorunludur.";
  return null;
}

export function validatePublishedStudentPage(title: string, content: string) {
  const hasProgram = lines([content]).some((line) => {
    const field = splitLabel(line);
    return field?.key === "eğitim seçeneği" && Boolean(field.value);
  });
  const parsed = parseStudentPage(
    title,
    content.split(/\n\s*\n/).filter(Boolean),
  );
  if (!hasProgram) {
    return "Talebe Ol sayfasında en az bir Eğitim Seçeneği zorunludur.";
  }
  if (!parsed.phone && !parsed.email) {
    return "Talebe Ol sayfasında Telefon veya E-posta alanı zorunludur.";
  }
  return null;
}
