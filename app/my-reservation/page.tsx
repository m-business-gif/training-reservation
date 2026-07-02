'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Reservation, Trainee, Menu } from '@/types/database'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface ReservationWithDetails extends Reservation {
  trainee?: Trainee
  menu?: Menu
}

export default function MyReservationPage() {
  const [reservationNumber, setReservationNumber] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [reservation, setReservation] = useState<ReservationWithDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)

  async function handleSearch() {
    if (!reservationNumber || !customerPhone) {
      alert('予約番号と電話番号を入力してください')
      return
    }

    setLoading(true)
    setNotFound(false)

    const { data, error } = await supabase
      .from('reservation')
      .select(`
        *,
        trainee:trainee_id(*),
        menu:menu_id(*)
      `)
      .eq('reservation_number', reservationNumber)
      .eq('customer_phone', customerPhone)
      .single()

    setLoading(false)

    if (error || !data) {
      setNotFound(true)
      setReservation(null)
    } else {
      setReservation(data)
      setNotFound(false)
    }
  }

  async function handleCancel() {
    if (!reservation) return
    if (!confirm('本当にキャンセルしますか？')) return

    const { error } = await supabase
      .from('reservation')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', reservation.id)

    if (!error) {
      alert('✅ 予約をキャンセルしました')
      setReservation(null)
      setReservationNumber('')
      setCustomerPhone('')
    } else {
      alert('キャンセルに失敗しました')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8 text-center">予約確認・キャンセル</h1>

        {!reservation ? (
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-8">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">予約情報を入力してください</h2>

            <div className="space-y-4 sm:space-y-5">
              <div>
                <label className="block text-sm sm:text-base font-bold text-gray-900 mb-2 sm:mb-3">予約番号 *</label>
                <input
                  type="text"
                  value={reservationNumber}
                  onChange={e => setReservationNumber(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 sm:py-4 text-base sm:text-lg text-gray-900 font-bold"
                  placeholder="12345678"
                  maxLength={8}
                />
                <p className="text-xs sm:text-sm text-gray-900 mt-2">※ 予約完了時に表示された8桁の番号</p>
              </div>

              <div>
                <label className="block text-sm sm:text-base font-bold text-gray-900 mb-2 sm:mb-3">電話番号 *</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 sm:py-4 text-base sm:text-lg text-gray-900 font-bold"
                  placeholder="090-1234-5678"
                />
              </div>

              {notFound && (
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                  <p className="text-red-900 font-bold">予約が見つかりませんでした。</p>
                  <p className="text-red-900 text-sm mt-1">予約番号と電話番号を確認してください。</p>
                </div>
              )}

              <button
                onClick={handleSearch}
                disabled={loading}
                className="w-full py-3 sm:py-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 active:bg-indigo-700 font-bold text-lg sm:text-xl disabled:bg-gray-400"
              >
                {loading ? '検索中...' : '予約を確認する'}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">予約内容</h2>

            {reservation.status === 'cancelled' ? (
              <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
                <p className="text-lg sm:text-xl font-bold text-red-900">この予約はキャンセル済みです</p>
              </div>
            ) : (
              <div className="bg-indigo-50 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-900 font-bold">予約番号</p>
                    <p className="text-xl sm:text-2xl font-bold text-indigo-600">{reservation.reservation_number}</p>
                  </div>

                  <div className="border-t-2 border-indigo-200 pt-3 sm:pt-4">
                    <p className="text-xs sm:text-sm text-gray-900 font-bold mb-1 sm:mb-2">日時</p>
                    <p className="text-lg sm:text-xl font-bold text-gray-900">
                      {format(new Date(reservation.date), 'M月d日(E)', { locale: ja })}
                    </p>
                    <p className="text-base sm:text-lg font-bold text-gray-900">
                      {reservation.start_time.slice(0, 5)} 〜 {reservation.end_time.slice(0, 5)}
                    </p>
                  </div>

                  <div className="border-t-2 border-indigo-200 pt-3 sm:pt-4">
                    <p className="text-xs sm:text-sm text-gray-900 font-bold">研修生</p>
                    <p className="text-base sm:text-lg font-bold text-gray-900">{reservation.trainee?.name}</p>
                  </div>

                  <div className="border-t-2 border-indigo-200 pt-3 sm:pt-4">
                    <p className="text-xs sm:text-sm text-gray-900 font-bold">メニュー</p>
                    <p className="text-base sm:text-lg font-bold text-gray-900">{reservation.menu?.name}</p>
                    <p className="text-sm sm:text-base text-gray-900">({reservation.menu?.duration_minutes}分)</p>
                  </div>

                  <div className="border-t-2 border-indigo-200 pt-3 sm:pt-4">
                    <p className="text-xs sm:text-sm text-gray-900 font-bold">お名前</p>
                    <p className="text-base sm:text-lg font-bold text-gray-900">{reservation.customer_name}様</p>
                  </div>

                  <div className="border-t-2 border-indigo-200 pt-3 sm:pt-4">
                    <p className="text-xs sm:text-sm text-gray-900 font-bold">電話番号</p>
                    <p className="text-base sm:text-lg font-bold text-gray-900">{reservation.customer_phone}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {reservation.status === 'confirmed' && (
                <button
                  onClick={handleCancel}
                  className="w-full py-3 sm:py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 active:bg-red-700 font-bold text-lg sm:text-xl"
                >
                  予約をキャンセルする
                </button>
              )}

              <button
                onClick={() => {
                  setReservation(null)
                  setReservationNumber('')
                  setCustomerPhone('')
                  setNotFound(false)
                }}
                className="w-full py-3 sm:py-4 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 active:bg-gray-300 font-bold text-lg sm:text-xl"
              >
                戻る
              </button>
            </div>
          </div>
        )}

        <div className="text-center mt-4 sm:mt-6">
          <a href="/" className="text-gray-900 hover:text-indigo-600 text-sm sm:text-base font-bold">
            ← 予約ページに戻る
          </a>
        </div>
      </div>
    </div>
  )
}
