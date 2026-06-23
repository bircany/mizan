import { Resend as ResendClient } from 'resend'

const FROM_EMAIL = 'noreply@mizandernegi.org'
const ADMIN_EMAIL = 'info@mizandernegi.org'

function getClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  return new ResendClient(apiKey)
}

export async function sendDonationReceipt(
  email: string,
  donorName: string,
  amount: number,
  receiptNumber: string
) {
  const resend = getClient()
  if (!resend) {
    console.warn('Resend API key not configured. Skipping email.')
    return
  }

  return resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Bağış Makbuzunuz - Mizan Derneği',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #16a34a;">Teşekkür Ederiz ${donorName}!</h1>
        <p>Bağışınızı aldık. İşte bağış detaylarınız:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Makbuz No:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${receiptNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Tutar:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${amount} TL</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Tarih:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${new Date().toLocaleDateString('tr-TR')}</td>
          </tr>
        </table>
        <p>Bağışınız için tekrar teşekkür ederiz. Yardımlarınızla daha fazla ihtiyaç sahibine ulaşmamız mümkün oluyor.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
        <p style="color: #666; font-size: 12px;">Bu e-posta otomatik olarak gönderilmiştir. Lütfen yanıtlamayınız.</p>
      </div>
    `,
  })
}

export async function sendContactNotification(
  email: string,
  name: string,
  message: string
) {
  const resend = getClient()
  if (!resend) {
    console.warn('Resend API key not configured. Skipping email.')
    return
  }

  return resend.emails.send({
    from: FROM_EMAIL,
    to: ADMIN_EMAIL,
    subject: `İletişim Formu - ${name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Yeni İletişim Mesajı</h2>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Ad Soyad:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>E-Posta:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${email}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Mesaj:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${message}</td>
          </tr>
        </table>
      </div>
    `,
  })
}
