import { jsPDF } from 'jspdf'

const ASSOCIATION_NAME = process.env.RECEIPT_ASSOCIATION_NAME || 'Mizan Yardimlasma ve Dayanisma Dernegi'
const ASSOCIATION_ADDRESS = process.env.RECEIPT_ASSOCIATION_ADDRESS || 'Adres bilgisi yapilandirilmamistir'
const ASSOCIATION_TAX_ID = process.env.RECEIPT_TAX_ID || 'Vergi numarasi yapilandirilmamistir'

export function generateReceipt(
  donorName: string,
  amount: number,
  currency: string,
  date: string,
  receiptNumber: string
): Blob {
  const doc = new jsPDF()

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(ASSOCIATION_NAME, 105, 30, { align: 'center' })

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(ASSOCIATION_ADDRESS, 105, 38, { align: 'center' })
  doc.text(`Vergi No: ${ASSOCIATION_TAX_ID}`, 105, 44, { align: 'center' })

  doc.setDrawColor(22, 163, 74)
  doc.setLineWidth(0.5)
  doc.line(20, 48, 190, 48)

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('BAĞIŞ MAKBUZU', 105, 60, { align: 'center' })

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')

  const startY = 75
  const lineHeight = 12
  const labelX = 40
  const valueX = 80

  doc.text('Makbuz No:', labelX, startY)
  doc.text(receiptNumber, valueX, startY)

  doc.text('Bağışçı:', labelX, startY + lineHeight)
  doc.text(donorName, valueX, startY + lineHeight)

  const formattedAmount = new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currency || 'TRY',
  }).format(amount)

  doc.text('Tutar:', labelX, startY + lineHeight * 2)
  doc.text(formattedAmount, valueX, startY + lineHeight * 2)

  doc.text('Tarih:', labelX, startY + lineHeight * 3)
  doc.text(date, valueX, startY + lineHeight * 3)

  doc.text('Para Birimi:', labelX, startY + lineHeight * 4)
  doc.text(currency || 'TRY', valueX, startY + lineHeight * 4)

  doc.setDrawColor(22, 163, 74)
  doc.setLineWidth(0.5)
  doc.line(20, startY + lineHeight * 5 + 5, 190, startY + lineHeight * 5 + 5)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'italic')
  doc.text('Bu makbuz, yaptığınız bağışın resmi kaydıdır.', 105, startY + lineHeight * 5 + 18, { align: 'center' })
  doc.text('Verdiğiniz destek için teşekkür ederiz.', 105, startY + lineHeight * 5 + 25, { align: 'center' })

  return doc.output('blob')
}
