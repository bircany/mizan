import { Resend as ResendClient } from "resend";

const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@mizandernegi.org";
const ADMIN_EMAIL =
  process.env.CONTACT_NOTIFICATION_EMAIL || "info@mizandernegi.org";

function getClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new ResendClient(apiKey);
}

type DeliveryResult =
  | { status: "sent"; messageId?: string }
  | { status: "skipped"; reason: string };

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character];
  });
}

async function sendEmail(input: Parameters<ResendClient["emails"]["send"]>[0]): Promise<DeliveryResult> {
  const resend = getClient();
  if (!resend) {
    return { status: "skipped", reason: "RESEND_API_KEY yapılandırılmamış." };
  }

  const { data, error } = await resend.emails.send(input);
  if (error) {
    throw new Error(`E-posta gönderilemedi: ${error.message}`);
  }

  return { status: "sent", messageId: data?.id };
}

export async function sendDonationReceipt(
  email: string,
  donorName: string,
  amount: number,
  currency: string,
  receiptNumber: string,
): Promise<DeliveryResult> {
  return sendEmail({
    from: FROM_EMAIL,
    to: email,
    subject: "Bağış Makbuzunuz - Mizan Derneği",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #16a34a;">Teşekkür ederiz ${escapeHtml(donorName)}!</h1>
        <p>Bağışınızı aldık. İşte bağış detaylarınız:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Makbuz No:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${escapeHtml(receiptNumber)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Tutar:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${amount} ${escapeHtml(currency)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Tarih:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${new Date().toLocaleDateString("tr-TR")}</td>
          </tr>
        </table>
        <p>Desteğinizle daha fazla ihtiyaç sahibine ulaşmamız mümkün oluyor.</p>
      </div>
    `,
  });
}

export async function sendDonationRefundNotice(input: {
  email: string;
  donorName: string;
  amount: number;
  currency: string;
  receiptNumber: string;
  isPartial: boolean;
}) {
  return sendEmail({
    from: FROM_EMAIL,
    to: input.email,
    subject: input.isPartial
      ? "Kısmi İade Bilgilendirmesi - Mizan Derneği"
      : "İade Bilgilendirmesi - Mizan Derneği",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #065f46;">Bilgilendirme</h1>
        <p>Sayın ${escapeHtml(input.donorName)}, bağış kaydınız için ${
          input.isPartial ? "kısmi iade" : "iade"
        } işlemi tamamlandı.</p>
        <p>Makbuz No: <strong>${escapeHtml(input.receiptNumber)}</strong></p>
        <p>İade Tutarı: <strong>${input.amount} ${escapeHtml(input.currency)}</strong></p>
      </div>
    `,
  });
}

export async function sendContactNotification(
  email: string,
  name: string,
  message: string,
  subject = "İletişim Formu",
  recipient = ADMIN_EMAIL,
) {
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message).replace(/\r?\n/g, "<br />");
  const safeSubject = subject.replace(/[\r\n]+/g, " ").trim().slice(0, 140);

  return sendEmail({
    from: FROM_EMAIL,
    to: recipient,
    replyTo: email,
    subject: `${safeSubject || "İletişim Formu"} - ${name.replace(/[\r\n]+/g, " ")}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Yeni İletişim Mesajı</h2>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Ad Soyad:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${safeName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>E-Posta:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${safeEmail}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Mesaj:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${safeMessage}</td>
          </tr>
        </table>
      </div>
    `,
  });
}
