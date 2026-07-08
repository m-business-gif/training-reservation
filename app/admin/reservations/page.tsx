'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Trainee, Menu, Reservation } from '@/types/database'
import Link from 'next/link'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface ReservationWithDetails extends Reservation {
  trainee?: Trainee
  menu?: Menu
}

const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]

export default function ReservationsPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [reservations, setReservations] = useState<ReservationWithDetails[]>([])
  const [trainees, setTrainees] = useState<Trainee[]>([])
  const [menus, setMenus] = useState<Menu[]>([])
  const [weeklyStats, setWeeklyStats] = useState<Array<{ date: string; count: number }>>([])
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline')

  // 手動予約追加モーダル
  const [showAddModal, setShowAddModal] = useState(false)
  const [addTraineeId, setAddTraineeId] = useState('')
  const [addMenuId, setAddMenuId] = useState('')
  const [addStartTime, setAddStartTime] = useState('')
  const [addCustomerName, setAddCustomerName] = useState('')
  const [addCustomerPhone, setAddCustomerPhone] = useState('')

  // 予約詳細モーダル
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<ReservationWithDetails | null>(null)

  useEffect(() => {
    loadTrainees()
    loadMenus()
    loadWeeklyStats()
  }, [])

  useEffect(() => {
    if (selectedDate) {
      loadReservations()
    }
  }, [selectedDate])

  async function loadWeeklyStats() {
    // 今日から7日分の予約件数を取得
    const today = new Date()
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      return format(d, 'yyyy-MM-dd')
    })

    const stats = await Promise.all(
      dates.map(async date => {
        const { data, count } = await supabase
          .from('reservation')
          .select('*', { count: 'exact', head: false })
          .eq('date', date)
          .eq('status', 'confirmed')
        return { date, count: count ?? 0 }
      })
    )
    setWeeklyStats(stats)
  }

  async function loadTrainees() {
    const { data } = await supabase
      .from('trainee')
      .select('*')
      .eq('is_active', true)
      .order('name')
    setTrainees(data ?? [])
  }

  async function loadMenus() {
    const { data } = await supabase
      .from('menu')
      .select('*')
      .eq('is_active', true)
      .order('name')
    setMenus(data ?? [])
  }

  async function loadReservations() {
    const { data } = await supabase
      .from('reservation')
      .select(`
        *,
        trainee:trainee_id(*),
        menu:menu_id(*)
      `)
      .eq('date', selectedDate)
      .eq('status', 'confirmed')
      .order('start_time')

    setReservations(data ?? [])
  }

  async function handleCancel(id: string) {
    if (!confirm('この予約をキャンセルしますか？')) return

    const { error } = await supabase
      .from('reservation')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', id)

    if (!error) {
      alert('✅ キャンセルしました')
      setShowDetailModal(false)
      loadReservations()
      loadWeeklyStats()
    }
  }

  // 予約詳細を表示
  function showReservationDetail(reservation: ReservationWithDetails) {
    setSelectedReservation(reservation)
    setShowDetailModal(true)
  }

  // 手動予約追加
  function openAddModal(traineeId: string, time: string) {
    setAddTraineeId(traineeId)
    setAddStartTime(time)
    setAddMenuId('')
    setAddCustomerName('')
    setAddCustomerPhone('')
    setShowAddModal(true)
  }

  // 8桁の予約番号を生成（重複チェック付き）
  async function generateReservationNumber(): Promise<string> {
    while (true) {
      const number = Math.floor(10000000 + Math.random() * 90000000).toString()
      const { data } = await supabase
        .from('reservation')
        .select('id')
        .eq('reservation_number', number)
        .single()

      if (!data) return number
    }
  }

  async function handleAddReservation() {
    if (!addTraineeId || !addMenuId || !addStartTime || !addCustomerName || !addCustomerPhone) {
      alert('すべての必須項目を入力してください')
      return
    }

    // メニューの所要時間を取得
    const menu = menus.find(m => m.id === addMenuId)
    if (!menu) return

    // 終了時刻を計算
    const [h, m] = addStartTime.split(':').map(Number)
    const startMinutes = h * 60 + m
    const endMinutes = startMinutes + menu.duration_minutes
    const endH = Math.floor(endMinutes / 60)
    const endM = endMinutes % 60
    const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`

    // 予約番号を生成
    const reservationNumber = await generateReservationNumber()

    const { data: newReservation, error } = await supabase.from('reservation').insert({
      reservation_number: reservationNumber,
      trainee_id: addTraineeId,
      menu_id: addMenuId,
      date: selectedDate,
      start_time: addStartTime + ':00',
      end_time: endTime,
      customer_name: addCustomerName,
      customer_phone: addCustomerPhone,
      customer_email: null,
      status: 'confirmed'
    }).select().single()

    if (error) {
      alert('予約追加に失敗しました: ' + error.message)
      return
    }

    // 管理者にメール通知を送信
    const trainee = trainees.find(t => t.id === addTraineeId)
    try {
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'admin_notification',
          reservation: newReservation,
          trainee: trainee,
          menu: menu
        })
      })
    } catch (emailError) {
      console.error('Email notification failed:', emailError)
    }

    alert('✅ 予約を追加しました\n予約番号: ' + reservationNumber)
    setShowAddModal(false)
    loadReservations()
    loadWeeklyStats()
  }

  // 時間を分に変換
  function timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
  }

  const todayCount = reservations.filter(r => r.date === format(new Date(), 'yyyy-MM-dd') && r.status === 'confirmed').length

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">予約管理</h1>
          <Link href="/admin" className="text-base font-bold text-gray-900 hover:text-indigo-600">
            ← 管理画面トップ
          </Link>
        </div>

        {/* サマリーカード */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => {
              setSelectedDate(format(new Date(), 'yyyy-MM-dd'))
              setViewMode('timeline')
            }}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-all text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">📅</span>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900">本日のスケジュール</h2>
                <p className="text-base text-gray-900">TODAY'S SCHEDULE</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-600">{todayCount}</div>
                <div className="text-sm text-gray-900 font-bold">件</div>
              </div>
            </div>
          </button>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">📋</span>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900">本日の予約一覧</h2>
                <p className="text-base text-gray-900">TODAY'S RESERVE LIST</p>
              </div>
            </div>
            <div className="border-t-2 border-gray-200 pt-4 space-y-2 max-h-64 overflow-y-auto">
              {reservations.filter(r => r.date === format(new Date(), 'yyyy-MM-dd') && r.status === 'confirmed').length === 0 ? (
                <p className="text-gray-900 text-base text-center py-4">本日の予約はありません</p>
              ) : (
                reservations
                  .filter(r => r.date === format(new Date(), 'yyyy-MM-dd') && r.status === 'confirmed')
                  .map(r => (
                    <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-indigo-600 text-base">{r.start_time.slice(0, 5)}</span>
                          <span className="font-bold text-gray-900 text-base">{r.trainee?.name}</span>
                          <span className="text-gray-900 text-base">-</span>
                          <span className="font-bold text-gray-900 text-base">{r.customer_name}様</span>
                        </div>
                        <div className="text-sm text-gray-900 mt-1">{r.menu?.name}</div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        {/* 週間予約状況 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">週間予約状況</h2>
          <div className="grid grid-cols-7 gap-2">
            {weeklyStats.map((stat, i) => {
              const date = new Date(stat.date)
              const isToday = stat.date === format(new Date(), 'yyyy-MM-dd')
              const isSunday = date.getDay() === 0
              return (
                <div
                  key={stat.date}
                  className={`text-center p-3 rounded-lg ${
                    isSunday ? 'bg-red-50' : isToday ? 'bg-blue-50' : 'bg-gray-50'
                  }`}
                >
                  <div className={`text-base font-bold mb-1 ${isSunday ? 'text-red-600' : 'text-gray-900'}`}>
                    {format(date, 'M/d(E)', { locale: ja })}
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{stat.count}件</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 予約アラート */}
        {todayCount > 0 && (
          <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-orange-600 font-bold text-lg">⚠️ 予約</span>
              <p className="text-base text-gray-900 font-bold">
                新着予約があります。予約詳細を確認してください。({todayCount}件)
              </p>
            </div>
          </div>
        )}

        {/* ビュー切り替え */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="text-base font-bold text-gray-900">日付:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="border-2 border-gray-300 rounded-lg px-3 py-2 text-base text-gray-900 font-bold"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-4 py-2 rounded-lg text-base font-bold ${
                viewMode === 'timeline' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-900'
              }`}
            >
              タイムライン
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg text-base font-bold ${
                viewMode === 'list' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-900'
              }`}
            >
              リスト
            </button>
          </div>
        </div>

        {/* タイムライン表示 */}
        {viewMode === 'timeline' && (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
          <div className="min-w-[1200px]">
            {/* ヘッダー（時間軸） */}
            <div className="flex border-b border-gray-200 bg-gray-50">
              <div className="w-32 p-2 font-bold text-base text-gray-900 border-r border-gray-200">
                研修生
              </div>
              {HOURS.map(hour => (
                <div key={hour} className="flex-1 p-2 text-center text-base font-bold text-gray-900 border-r border-gray-200">
                  {hour}:00
                </div>
              ))}
            </div>

            {/* 各研修生の行 */}
            {trainees.map(trainee => {
              const traineeReservations = reservations.filter(r => r.trainee_id === trainee.id)

              return (
                <div key={trainee.id} className="flex border-b border-gray-200 hover:bg-gray-50">
                  {/* 研修生名 */}
                  <div className="w-32 p-2 text-base font-bold text-gray-900 border-r border-gray-200 flex items-center">
                    {trainee.name}
                  </div>

                  {/* タイムライン */}
                  <div className="flex-1 relative" style={{ minHeight: '60px' }}>
                    {/* グリッド線（クリック可能） */}
                    <div className="absolute inset-0 flex">
                      {HOURS.map((hour, i) => (
                        <div
                          key={i}
                          className="flex-1 border-r border-gray-200 hover:bg-indigo-50 cursor-pointer transition-colors"
                          onClick={() => openAddModal(trainee.id, `${String(hour).padStart(2, '0')}:00`)}
                          title={`${hour}:00 に予約を追加`}
                        />
                      ))}
                    </div>

                    {/* 予約ブロック */}
                    {traineeReservations.map(res => {
                      const startMinutes = timeToMinutes(res.start_time)
                      const endMinutes = timeToMinutes(res.end_time)
                      const startHour = 9 * 60 // 9:00
                      const totalMinutes = (HOURS.length) * 60

                      const left = ((startMinutes - startHour) / totalMinutes) * 100
                      const width = ((endMinutes - startMinutes) / totalMinutes) * 100

                      return (
                        <div
                          key={res.id}
                          className="absolute top-1 bottom-1 bg-indigo-100 border-l-4 border-indigo-600 rounded px-2 py-1 overflow-hidden cursor-pointer hover:bg-indigo-200 transition-colors group"
                          style={{ left: `${left}%`, width: `${width}%` }}
                          onClick={(e) => {
                            e.stopPropagation()
                            showReservationDetail(res)
                          }}
                        >
                          <div className="text-xs font-bold text-indigo-900">
                            {res.start_time.slice(0, 5)} 〜 {res.end_time.slice(0, 5)}
                          </div>
                          <div className="text-xs text-indigo-800 truncate">
                            {res.menu?.name}
                          </div>
                          <div className="text-xs text-indigo-700 truncate">
                            {res.customer_name}
                          </div>
                          <div className="hidden group-hover:block absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg p-2 text-xs whitespace-nowrap z-10">
                            クリックで詳細表示
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {trainees.length === 0 && (
              <div className="p-8 text-center text-gray-900 text-lg font-bold">
                研修生が登録されていません
              </div>
            )}
          </div>
        </div>
        )}

        {/* リスト表示 */}
        {viewMode === 'list' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">予約一覧</h2>
            <div className="space-y-3">
              {reservations.map(res => (
                <div
                  key={res.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-indigo-600 text-lg">
                        {res.start_time.slice(0, 5)} 〜 {res.end_time.slice(0, 5)}
                      </span>
                      <span className="font-bold text-gray-900 text-lg">{res.trainee?.name}</span>
                      <span className="text-gray-900 text-base font-bold">{res.menu?.name}</span>
                    </div>
                    <div className="text-base text-gray-900 mt-1 font-bold">
                      {res.customer_name} / {res.customer_phone}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCancel(res.id)}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-base font-bold"
                  >
                    キャンセル
                  </button>
                </div>
              ))}
              {reservations.length === 0 && (
                <div className="p-8 text-center text-gray-900 text-lg font-bold">
                  この日の予約はありません
                </div>
              )}
            </div>
          </div>
        )}

        {/* 予約詳細モーダル */}
        {showDetailModal && selectedReservation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">予約詳細</h2>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="text-gray-500 hover:text-gray-900 text-3xl leading-none"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4">
                  {selectedReservation.reservation_number && (
                    <div className="bg-indigo-50 rounded-lg p-4">
                      <p className="text-sm text-gray-900 font-bold mb-1">予約番号</p>
                      <p className="text-3xl font-bold text-indigo-600">{selectedReservation.reservation_number}</p>
                    </div>
                  )}

                  <div className="border-t-2 border-gray-200 pt-4">
                    <p className="text-sm text-gray-900 font-bold mb-2">日時</p>
                    <p className="text-xl font-bold text-gray-900">
                      {format(new Date(selectedReservation.date), 'M月d日(E)', { locale: ja })}
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      {selectedReservation.start_time.slice(0, 5)} 〜 {selectedReservation.end_time.slice(0, 5)}
                    </p>
                  </div>

                  <div className="border-t-2 border-gray-200 pt-4">
                    <p className="text-sm text-gray-900 font-bold mb-1">研修生</p>
                    <p className="text-lg font-bold text-gray-900">{selectedReservation.trainee?.name}</p>
                  </div>

                  <div className="border-t-2 border-gray-200 pt-4">
                    <p className="text-sm text-gray-900 font-bold mb-1">メニュー</p>
                    <p className="text-lg font-bold text-gray-900">{selectedReservation.menu?.name}</p>
                    <p className="text-base text-gray-900">({selectedReservation.menu?.duration_minutes}分)</p>
                  </div>

                  <div className="border-t-2 border-gray-200 pt-4">
                    <p className="text-sm text-gray-900 font-bold mb-1">お客様名</p>
                    <p className="text-lg font-bold text-gray-900">{selectedReservation.customer_name}様</p>
                  </div>

                  <div className="border-t-2 border-gray-200 pt-4">
                    <p className="text-sm text-gray-900 font-bold mb-1">電話番号</p>
                    <p className="text-lg font-bold text-gray-900">{selectedReservation.customer_phone}</p>
                  </div>

                  {selectedReservation.customer_email && (
                    <div className="border-t-2 border-gray-200 pt-4">
                      <p className="text-sm text-gray-900 font-bold mb-1">メールアドレス</p>
                      <p className="text-base text-gray-900">{selectedReservation.customer_email}</p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => handleCancel(selectedReservation.id)}
                      className="flex-1 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold text-lg"
                    >
                      この予約をキャンセル
                    </button>
                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="px-6 py-3 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 font-bold text-lg"
                    >
                      閉じる
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 手動予約追加モーダル */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">手動で予約を追加</h2>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="text-gray-500 hover:text-gray-900 text-2xl"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-base font-bold text-gray-900 mb-2">研修生</label>
                    <select
                      value={addTraineeId}
                      onChange={e => setAddTraineeId(e.target.value)}
                      className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-base font-bold text-gray-900"
                    >
                      <option value="">選択してください</option>
                      {trainees.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-base font-bold text-gray-900 mb-2">メニュー *</label>
                    <select
                      value={addMenuId}
                      onChange={e => setAddMenuId(e.target.value)}
                      className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-base font-bold text-gray-900"
                    >
                      <option value="">選択してください</option>
                      {menus.map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.duration_minutes}分)</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-base font-bold text-gray-900 mb-2">開始時刻 *</label>
                    <input
                      type="time"
                      value={addStartTime}
                      onChange={e => setAddStartTime(e.target.value)}
                      className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-base font-bold text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-base font-bold text-gray-900 mb-2">お客様名 *</label>
                    <input
                      type="text"
                      value={addCustomerName}
                      onChange={e => setAddCustomerName(e.target.value)}
                      placeholder="山田 太郎"
                      className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-base text-gray-900 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-base font-bold text-gray-900 mb-2">電話番号 *</label>
                    <input
                      type="tel"
                      value={addCustomerPhone}
                      onChange={e => setAddCustomerPhone(e.target.value)}
                      placeholder="090-1234-5678"
                      className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-base text-gray-900 font-bold"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleAddReservation}
                      className="flex-1 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold text-lg"
                    >
                      予約を追加
                    </button>
                    <button
                      onClick={() => setShowAddModal(false)}
                      className="px-6 py-3 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 font-bold text-lg"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
