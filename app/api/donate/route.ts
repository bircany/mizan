import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createPayment } from '@/lib/iyzico'
import { sendDonationReceipt } from '@/lib/resend'
import { generateReceipt } from '@/lib/pdf'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { donor_name, email, phone, campaign_id, amount, currency } = body

    if (!donor_name || !email || !amount || !campaign_id) {
      return NextResponse.json(
        { error: 'Missing required fields: donor_name, email, amount, campaign_id' },
        { status: 400 }
      )
    }

    const receiptNumber = `MIZAN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    const donationAmount = Number(amount)
    const donationCurrency = currency || 'TRY'

    const { data: donation, error: dbError } = await supabase
      .from('donations')
      .insert({
        donor_name,
        email,
        phone: phone || null,
        campaign_id,
        amount: donationAmount,
        currency: donationCurrency,
        status: 'pending',
        receipt_number: receiptNumber,
      })
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: 'Failed to save donation' }, { status: 500 })
    }

    const paymentResult = await createPayment(
      donationAmount,
      donationCurrency,
      body.cardDetails,
      body.buyerInfo
    )

    const paymentResponse = paymentResult as { status: string; paymentId?: string; errorMessage?: string }

    if (paymentResponse.status === 'success') {
      await supabase
        .from('donations')
        .update({ status: 'completed' })
        .eq('id', donation.id)

      await sendDonationReceipt(email, donor_name, donationAmount, receiptNumber)

      const pdfBlob = generateReceipt(
        donor_name,
        donationAmount,
        donationCurrency,
        new Date().toLocaleDateString('tr-TR'),
        receiptNumber
      )

      const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer())

      await supabase.storage
        .from('receipts')
        .upload(`receipts/${receiptNumber}.pdf`, pdfBuffer, {
          contentType: 'application/pdf',
        })

      return NextResponse.json({
        success: true,
        redirectUrl: `/odeme/sonuc?receipt=${receiptNumber}`,
        paymentId: paymentResponse.paymentId,
      })
    }

    await supabase
      .from('donations')
      .update({ status: 'failed' })
      .eq('id', donation.id)

    return NextResponse.json({
      success: false,
      error: paymentResponse.errorMessage || 'Payment failed',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
