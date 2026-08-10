import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { reservationId } = await request.json()

    if (!reservationId) {
      return NextResponse.json({ error: '予約IDが必要です' }, { status: 400 })
    }

    // 予約情報を取得
    const { data: reservation, error: fetchError } = await supabase
      .from('reservation')
      .select(`
        *,
        trainee:trainee_id(name),
        menu:menu_id(name)
      `)
      .eq('id', reservationId)
      .single()

    if (fetchError || !reservation) {
      return NextResponse.json({ error: '予約が見つかりません' }, { status: 404 })
    }

    // 予約をキャンセル
    const { error: updateError } = await supabase
      .from('reservation')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('id', reservationId)

    if (updateError) {
      return NextResponse.json({ error: 'キャンセルに失敗しました' }, { status: 500 })
    }

    // 通知を作成
    const { error: notificationError } = await supabase
      .from('notification')
      .insert({
        type: 'cancellation',
        title: 'お客様がキャンセルしました',
        message: `${reservation.customer_name}様の予約がキャンセルされました（${reservation.trainee?.name} / ${reservation.menu?.name}）`,
        reservation_id: reservationId,
        reservation_number: reservation.reservation_number,
        is_read: false
      })

    if (notificationError) {
      console.error('通知作成エラー:', notificationError)
    }

    // Slack通知を送信
    if (process.env.SLACK_WEBHOOK_URL) {
      try {
        const slackMessage = {
          text: '⚠️ お客様がキャンセルしました',
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: '⚠️ お客様がキャンセルしました',
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
                  text: `*研修生:*\n${reservation.trainee?.name}`
                },
                {
                  type: 'mrkdwn',
                  text: `*メニュー:*\n${reservation.menu?.name} (${reservation.menu?.duration_minutes}分)`
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
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `キャンセル日時: <!date^${Math.floor(Date.now() / 1000)}^{date_short_pretty} {time}|${new Date().toLocaleString('ja-JP')}>`
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
                  style: 'danger'
                }
              ]
            }
          ]
        }

        const slackResponse = await fetch(process.env.SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(slackMessage)
        })

        if (!slackResponse.ok) {
          console.error('Slack通知送信エラー:', await slackResponse.text())
        }
      } catch (slackError) {
        console.error('Slack通知エラー:', slackError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('キャンセル処理エラー:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
