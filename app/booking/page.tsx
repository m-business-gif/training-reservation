'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Trainee, Menu, Shift } from '@/types/database'
import { format, addDays } from 'date-fns'
import { ja } from 'date-fns/locale'

interface TimeSlotWithTrainee {
  traineeId: string
  traineeName: string
  time: string
}

export default function BookingPage() {
  const [step, setStep] = useState(1)
  const [menus, setMenus] = useState<Menu[]>([])
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlotWithTrainee[]>([])

  // 選択内容
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlotWithTrainee | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')

  const [loading, setLoading] = useState(false)

  // 1. メニュー一覧を取得（シフト設定されているメニューのみ）
  useEffect(() => {
    async function loadMenus() {
      // 今日から30日先までのシフトを取得
      const today = format(new Date(), 'yyyy-MM-dd')
      const endDate = format(addDays(new Date(), 30), 'yyyy-MM-dd')

      const { data: shifts } = await supabase
        .from('shift')
        .select('time_slots')
        .gte('date', today)
        .lte('date', endDate)

      // シフトで使われているメニューIDを抽出
      const menuIdsInShifts = new Set<string>()
      for (const shift of shifts ?? []) {
        for (const slot of shift.time_slots) {
          for (const menuId of slot.menu_ids) {
            menuIdsInShifts.add(menuId)
          }
        }
      }

      if (menuIdsInShifts.size === 0) {
        setMenus([])
        return
      }

      // シフトで使われているメニューのみ取得
      const { data } = await supabase
        .from('menu')
        .select('*')
        .eq('is_active', true)
        .in('id', Array.from(menuIdsInShifts))
        .order('name')
      setMenus(data ?? [])
    }
    loadMenus()
  }, [])

  // 2. メニュー選択後、予約可能な日付を取得
  useEffect(() => {
    if (!selectedMenu) return

    async function loadDates() {
      const today = format(new Date(), 'yyyy-MM-dd')
      const endDate = format(addDays(new Date(), 30), 'yyyy-MM-dd')

      const { data: shifts } = await supabase
        .from('shift')
        .select('date, time_slots')
        .gte('date', today)
        .lte('date', endDate)

      const dates: string[] = []
      for (const shift of shifts ?? []) {
        // このメニューを含むtime_slotがあるか確認
        const hasMenu = shift.time_slots.some((slot: any) =>
          selectedMenu && slot.menu_ids.includes(selectedMenu.id) && slot.available_times.length > 0
        )
        if (hasMenu) {
          dates.push(shift.date)
        }
      }

      setAvailableDates([...new Set(dates)].sort())
    }

    loadDates()
  }, [selectedMenu])

  // 3. 日付選択後、全研修生の予約可能な時間を取得（研修生名付き）
  useEffect(() => {
    if (!selectedMenu || !selectedDate) return

    async function loadTimeSlots() {
      // その日のシフトを全て取得
      const { data: shifts } = await supabase
        .from('shift')
        .select('trainee_id, time_slots')
        .eq('date', selectedDate)

      if (!shifts) {
        setAvailableTimeSlots([])
        return
      }

      // 研修生情報を取得
      const traineeIds = shifts.map(s => s.trainee_id)
      const { data: trainees } = await supabase
        .from('trainee')
        .select('*')
        .in('id', traineeIds)
        .eq('is_active', true)

      const traineeMap = new Map(trainees?.map(t => [t.id, t.name]))

      // 既存の予約を取得
      const { data: reservations } = await supabase
        .from('reservation')
        .select('trainee_id, start_time')
        .eq('date', selectedDate)
        .eq('status', 'confirmed')

      const bookedSlots = new Set(
        (reservations ?? []).map(r => `${r.trainee_id}_${r.start_time.slice(0, 5)}`)
      )

      // 各研修生の予約可能時間を収集
      const timeSlots: TimeSlotWithTrainee[] = []
      for (const shift of shifts) {
        const traineeName = traineeMap.get(shift.trainee_id)
        if (!traineeName) continue

        for (const slot of shift.time_slots) {
          if (selectedMenu && slot.menu_ids.includes(selectedMenu.id)) {
            for (const time of slot.available_times) {
              const slotKey = `${shift.trainee_id}_${time}`
              if (!bookedSlots.has(slotKey)) {
                timeSlots.push({
                  traineeId: shift.trainee_id,
                  traineeName: traineeName,
                  time: time
                })
              }
            }
          }
        }
      }

      // 時間でソート
      timeSlots.sort((a, b) => a.time.localeCompare(b.time))
      setAvailableTimeSlots(timeSlots)
    }

    loadTimeSlots()
  }, [selectedMenu, selectedDate])

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

  // 予約確定
  async function handleSubmit() {
    if (!selectedMenu || !selectedTimeSlot || !selectedDate || !customerName || !customerPhone) {
      alert('すべての項目を入力してください')
      return
    }

    setLoading(true)

    // 終了時刻を計算
    const [h, m] = selectedTimeSlot.time.split(':').map(Number)
    const startMinutes = h * 60 + m
    const endMinutes = startMinutes + selectedMenu.duration_minutes
    const endH = Math.floor(endMinutes / 60)
    const endM = endMinutes % 60
    const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`

    // 予約番号を生成
    const reservationNumber = await generateReservationNumber()

    // 予約をデータベースに保存
    const { data: newReservation, error } = await supabase.from('reservation').insert({
      reservation_number: reservationNumber,
      trainee_id: selectedTimeSlot.traineeId,
      menu_id: selectedMenu.id,
      date: selectedDate,
      start_time: selectedTimeSlot.time + ':00',
      end_time: endTime,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail || null,
      status: 'confirmed'
    }).select().single()

    if (error) {
      setLoading(false)
      alert('予約に失敗しました: ' + error.message)
      return
    }

    // Slack通知を送信
    try {
      await fetch('/api/send-slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservation: newReservation,
          trainee: { id: selectedTimeSlot.traineeId, name: selectedTimeSlot.traineeName },
          menu: selectedMenu
        })
      })
    } catch (slackError) {
      console.error('Slack notification failed:', slackError)
      // Slack送信失敗してもアラートは出さない（予約は成功しているため）
    }

    setLoading(false)

    alert('✅ 予約が完了しました！\n\n予約内容:\n日時: ' + format(new Date(selectedDate), 'M月d日(E)', { locale: ja }) + ' ' + selectedTimeSlot.time + '\n研修生: ' + selectedTimeSlot.traineeName + '\nメニュー: ' + selectedMenu.name + '\n\n※電話番号で予約の確認・キャンセルができます。')

    // リセット
    setStep(1)
    setSelectedMenu(null)
    setSelectedDate('')
    setSelectedTimeSlot(null)
    setCustomerName('')
    setCustomerPhone('')
    setCustomerEmail('')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-2 sm:mb-3">研修予約フォーム</h1>
          <p className="text-sm sm:text-lg text-gray-900">必要な情報を入力して予約を完了してください</p>
        </div>

        {/* ステップインジケーター */}
        <div className="flex items-center justify-center mb-6 sm:mb-8">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold ${
                  step >= s ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-900'
                }`}
              >
                {s}
              </div>
              {s < 4 && <div className={`w-6 sm:w-12 h-1 ${step > s ? 'bg-indigo-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-8">
          {/* Step 1: メニュー選択 */}
          {step === 1 && (
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">メニューを選択</h2>
              <div className="space-y-3 sm:space-y-4">
                {menus.map(menu => (
                  <button
                    key={menu.id}
                    onClick={() => {
                      setSelectedMenu(menu)
                      setStep(2)
                    }}
                    className="w-full text-left p-4 sm:p-6 border-2 border-gray-300 rounded-lg hover:border-indigo-600 hover:bg-indigo-50 active:border-indigo-600 active:bg-indigo-50 transition-all"
                  >
                    <div className="text-lg sm:text-xl font-bold text-gray-900">{menu.name}</div>
                    <div className="text-sm sm:text-base text-gray-900 mt-1">{menu.duration_minutes}分</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: 日付選択 */}
          {step === 2 && (
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">日付を選択</h2>
              <p className="text-sm sm:text-base text-gray-900 mb-4 sm:mb-6 bg-gray-50 p-3 rounded">
                選択メニュー: <span className="font-bold">{selectedMenu?.name}</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {availableDates.length === 0 ? (
                  <p className="col-span-full text-gray-900 text-center py-8 text-base sm:text-lg">予約可能な日がありません</p>
                ) : (
                  availableDates.map(date => (
                    <button
                      key={date}
                      onClick={() => {
                        setSelectedDate(date)
                        setStep(3)
                      }}
                      className="p-4 sm:p-6 border-2 border-gray-300 rounded-lg hover:border-indigo-600 hover:bg-indigo-50 active:border-indigo-600 active:bg-indigo-50 transition-all text-center"
                    >
                      <div className="text-lg sm:text-xl font-bold text-gray-900">
                        {format(new Date(date), 'M月d日(E)', { locale: ja })}
                      </div>
                    </button>
                  ))
                )}
              </div>
              <button
                onClick={() => {
                  setStep(1)
                  setSelectedMenu(null)
                  setAvailableDates([])
                }}
                className="mt-4 sm:mt-6 text-gray-900 hover:text-gray-900 text-sm sm:text-base"
              >
                ← メニューを変更
              </button>
            </div>
          )}

          {/* Step 3: 時間選択 */}
          {step === 3 && (
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">時間を選択</h2>
              <p className="text-sm sm:text-base text-gray-900 mb-4 sm:mb-6 bg-gray-50 p-3 rounded">
                <span className="font-bold">{format(new Date(selectedDate), 'M月d日(E)', { locale: ja })}</span> / <span className="font-bold">{selectedMenu?.name}</span>
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                {availableTimeSlots.length === 0 ? (
                  <p className="col-span-full text-gray-900 text-center py-8 text-base sm:text-lg">予約可能な時間がありません</p>
                ) : (
                  availableTimeSlots.map((slot, idx) => (
                    <button
                      key={`${slot.traineeId}_${slot.time}_${idx}`}
                      onClick={() => {
                        setSelectedTimeSlot(slot)
                        setStep(4)
                      }}
                      className="p-4 sm:p-5 border-2 border-gray-300 rounded-lg hover:border-indigo-600 hover:bg-indigo-50 active:border-indigo-600 active:bg-indigo-50 transition-all text-center"
                    >
                      <div className="text-lg sm:text-xl font-bold text-gray-900">{slot.time}</div>
                      <div className="text-xs sm:text-sm text-gray-600 mt-1">{slot.traineeName}</div>
                    </button>
                  ))
                )}
              </div>
              <button
                onClick={() => {
                  setStep(2)
                  setSelectedDate('')
                  setAvailableTimeSlots([])
                }}
                className="mt-4 sm:mt-6 text-gray-900 hover:text-gray-900 text-sm sm:text-base"
              >
                ← 日付を変更
              </button>
            </div>
          )}

          {/* Step 4: お客様情報入力 */}
          {step === 4 && (
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">お客様情報入力</h2>

              <div className="bg-indigo-50 rounded-lg p-4 sm:p-5 mb-4 sm:mb-6">
                <p className="text-sm sm:text-base font-medium text-gray-900 mb-2">予約内容</p>
                <div className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
                  {format(new Date(selectedDate), 'M月d日(E)', { locale: ja })} {selectedTimeSlot?.time} 〜
                </div>
                <div className="text-sm sm:text-base text-gray-900">
                  {selectedMenu?.name} / {selectedTimeSlot?.traineeName}
                </div>
              </div>

              <div className="space-y-4 sm:space-y-5">
                <div>
                  <label className="block text-sm sm:text-base font-bold text-gray-900 mb-2 sm:mb-3">お名前 *</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 sm:py-4 text-base sm:text-lg text-gray-900 font-bold"
                    placeholder="山田 太郎"
                  />
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

                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full py-4 sm:py-5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 active:bg-indigo-700 font-bold text-lg sm:text-xl disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? '予約中...' : '予約を確定する'}
                </button>

                <button
                  onClick={() => {
                    setStep(3)
                    setSelectedTimeSlot(null)
                  }}
                  className="w-full text-gray-900 hover:text-gray-900 text-sm sm:text-base"
                >
                  ← 時間を変更
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="text-center mt-4 sm:mt-6 space-y-3">
          <div>
            <a href="/my-reservation" className="text-indigo-600 hover:text-indigo-700 text-sm sm:text-base font-bold">
              予約の確認・キャンセルはこちら →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
