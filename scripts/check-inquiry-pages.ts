import assert from "node:assert/strict";

import {
  parseContactPage,
  parseStudentPage,
  validatePublishedContactPage,
  validatePublishedStudentPage,
} from "../lib/inquiry-pages";

const contactText = `Açıklama: Bize ulaşabilirsiniz.

Adres: Örnek Mahallesi No:1, Elbistan

Telefon: 0552 402 67 38

WhatsApp: 0552 402 67 38

E-posta: bilgi@example.org

Çalışma Saatleri: Hafta içi 09:00 - 18:00

Harita: Örnek Mahallesi Elbistan`;
const contact = parseContactPage("İletişim", contactText.split(/\n\s*\n/));
assert.equal(contact.address, "Örnek Mahallesi No:1, Elbistan");
assert.equal(contact.emails[0], "bilgi@example.org");
assert.equal(contact.workingHours.length, 1);
assert.equal(validatePublishedContactPage("İletişim", contactText), null);

const studentText = `Açıklama: Bilgi almak için başvurun.

Eğitim Seçeneği: Genel bilgi

Eğitim Seçeneği: Hafızlık eğitimi

Hafta İçi: Randevu ile

Telefon: 0552 402 67 38`;
const student = parseStudentPage("Talebe Ol", studentText.split(/\n\s*\n/));
assert.deepEqual(student.programs, ["Genel bilgi", "Hafızlık eğitimi"]);
assert.equal(student.weekday, "Randevu ile");
assert.equal(validatePublishedStudentPage("Talebe Ol", studentText), null);
assert.match(
  validatePublishedStudentPage(
    "Talebe Ol",
    "Açıklama: Eksik program.\n\nTelefon: 0552 402 67 38",
  ) || "",
  /Eğitim Seçeneği/,
);
assert.match(
  validatePublishedContactPage("İletişim", "Açıklama: Eksik") || "",
  /Adres/,
);

console.log("İletişim ve Talebe Ol sayfa içerik kontrolleri geçti.");
