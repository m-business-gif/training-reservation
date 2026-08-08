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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('キャンセル処理エラー:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
