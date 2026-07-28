import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reservation, trainee, menu } = body

    if (!process.env.SLACK_WEBHOOK_URL) {
      return NextResponse.json({ error: 'SLACK_WEBHOOK_URL is not set' }, { status: 500 })
    }

    // Slack通知メッセージを作成
    const message = {
      text: '🔔 新規予約が入りました',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🔔 新規予約が入りました',
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*予約番号:*\n${reservation.reservation_number}`
            },
            {
              type: 'mrkdwn',
              text: `*日時:*\n${reservation.date} ${reservation.start_time.slice(0, 5)}`
            },
            {
              type: 'mrkdwn',
              text: `*研修生:*\n${trainee.name}`
            },
            {
              type: 'mrkdwn',
              text: `*メニュー:*\n${menu.name} (${menu.duration_minutes}分)`
            },
            {
              type: 'mrkdwn',
              text: `*お客様:*\n${reservation.customer_name}様`
            },
            {
              type: 'mrkdwn',
              text: `*電話番号:*\n${reservation.customer_phone}`
            }
          ]
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '📋 予約管理画面を開く',
                emoji: true
              },
              url: 'https://training-reservation-v2.vercel.app/admin/reservations',
              style: 'primary'
            }
          ]
        }
      ]
    }

    // Slackに送信
    const response = await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Slack send error:', error)
      return NextResponse.json({ error: 'Failed to send Slack notification' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
