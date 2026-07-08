import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, reservation, trainee, menu } = body

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'RESEND_API_KEY is not set' }, { status: 500 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // お客様への予約確認メール
    if (type === 'new_reservation') {
      if (!reservation.customer_email) {
        return NextResponse.json({ error: 'Customer email is required' }, { status: 400 })
      }

      const { data, error } = await resend.emails.send({
        from: 'onboarding@resend.dev', // Resendのデフォルト送信元（後で独自ドメインに変更可能）
        to: reservation.customer_email,
        subject: `【予約確認】${reservation.customer_name}様 - ご予約を承りました`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <h1 style="color: #4f46e5; margin-top: 0;">ご予約ありがとうございます</h1>

              <p style="font-size: 16px; color: #111827; line-height: 1.6;">
                ${reservation.customer_name}様<br><br>
                この度は研修のご予約をいただき、誠にありがとうございます。<br>
                以下の内容でご予約を承りました。
              </p>

              <div style="background-color: #eef2ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="margin-top: 0; color: #312e81; font-size: 18px;">ご予約内容</h2>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 12px 0; color: #6b7280; font-weight: bold; width: 120px;">日時</td>
                    <td style="padding: 12px 0; color: #111827; font-weight: bold; font-size: 18px;">${reservation.date} ${reservation.start_time.slice(0, 5)} 〜 ${reservation.end_time.slice(0, 5)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; color: #6b7280; font-weight: bold;">担当研修生</td>
                    <td style="padding: 12px 0; color: #111827; font-size: 16px;">${trainee.name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; color: #6b7280; font-weight: bold;">メニュー</td>
                    <td style="padding: 12px 0; color: #111827; font-size: 16px;">${menu.name} (${menu.duration_minutes}分)</td>
                  </tr>
                </table>
              </div>

              <div style="background-color: #fff7ed; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="margin-top: 0; color: #92400e; font-size: 18px;">ご予約者情報</h2>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 12px 0; color: #6b7280; font-weight: bold; width: 120px;">お名前</td>
                    <td style="padding: 12px 0; color: #111827; font-size: 16px;">${reservation.customer_name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; color: #6b7280; font-weight: bold;">電話番号</td>
                    <td style="padding: 12px 0; color: #111827; font-size: 16px;">${reservation.customer_phone}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; color: #6b7280; font-weight: bold;">メールアドレス</td>
                    <td style="padding: 12px 0; color: #111827; font-size: 16px;">${reservation.customer_email}</td>
                  </tr>
                </table>
              </div>

              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                  <strong>ご来店時のお願い</strong><br>
                  ご予約時間の5分前までにお越しください。<br>
                  やむを得ずキャンセルされる場合は、お早めにご連絡をお願いいたします。
                </p>
              </div>

              <p style="color: #6b7280; font-size: 14px; margin-top: 30px; line-height: 1.6;">
                ご不明な点がございましたら、お気軽にお問い合わせください。<br>
                当日お会いできることを楽しみにしております。
              </p>
            </div>
          </div>
        `,
      })

      if (error) {
        console.error('Email send error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, data })
    }

    // 管理者への予約通知メール
    if (type === 'admin_notification') {
      // settingsから管理者メールアドレスを取得
      const { data: settings } = await supabase
        .from('settings')
        .select('notification_email')
        .single()

      if (!settings?.notification_email) {
        return NextResponse.json({ error: 'Admin email not configured' }, { status: 400 })
      }

      // 改行で分割して複数のメールアドレスに対応
      const emailAddresses = settings.notification_email
        .split('\n')
        .map((email: string) => email.trim())
        .filter((email: string) => email.length > 0)

      if (emailAddresses.length === 0) {
        return NextResponse.json({ error: 'No valid email addresses configured' }, { status: 400 })
      }

      const { data, error } = await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: emailAddresses,
        subject: `【新規予約】${reservation.customer_name}様 - ${reservation.date} ${reservation.start_time.slice(0, 5)}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <h1 style="color: #4f46e5; margin-top: 0;">🔔 新規予約が入りました</h1>

              <div style="background-color: #eef2ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="margin-top: 0; color: #312e81; font-size: 18px;">予約内容</h2>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 12px 0; color: #6b7280; font-weight: bold; width: 120px;">予約番号</td>
                    <td style="padding: 12px 0; color: #4f46e5; font-weight: bold; font-size: 20px;">${reservation.reservation_number}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; color: #6b7280; font-weight: bold;">日時</td>
                    <td style="padding: 12px 0; color: #111827; font-weight: bold; font-size: 18px;">${reservation.date} ${reservation.start_time.slice(0, 5)} 〜 ${reservation.end_time.slice(0, 5)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; color: #6b7280; font-weight: bold;">担当研修生</td>
                    <td style="padding: 12px 0; color: #111827; font-size: 16px;">${trainee.name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; color: #6b7280; font-weight: bold;">メニュー</td>
                    <td style="padding: 12px 0; color: #111827; font-size: 16px;">${menu.name} (${menu.duration_minutes}分)</td>
                  </tr>
                </table>
              </div>

              <div style="background-color: #fff7ed; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="margin-top: 0; color: #92400e; font-size: 18px;">お客様情報</h2>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 12px 0; color: #6b7280; font-weight: bold; width: 120px;">お名前</td>
                    <td style="padding: 12px 0; color: #111827; font-size: 16px;">${reservation.customer_name}様</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; color: #6b7280; font-weight: bold;">電話番号</td>
                    <td style="padding: 12px 0; color: #111827; font-size: 16px;">${reservation.customer_phone}</td>
                  </tr>
                </table>
              </div>

              <div style="text-align: center; margin-top: 30px;">
                <a href="https://training-reservation-v2.vercel.app/admin/reservations"
                   style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                  予約管理画面を開く
                </a>
              </div>
            </div>
          </div>
        `,
      })

      if (error) {
        console.error('Admin email send error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, data })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
