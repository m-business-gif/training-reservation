'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Trainee, Menu, Shift } from '@/types/database'
import { format, addDays } from 'date-fns'
import { ja } from 'date-fns/locale'

export default function BookingPage() {
  const [step, setStep] = useState(1)
  const [menus, setMenus] = useState<Menu[]>([])
  const [trainees, setTrainees] = useState<Trainee[]>([])
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [availableTimes, setAvailableTimes] = useState<string[]>([])

  // 選択内容
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null)
  const [selectedTrainee, setSelectedTrainee] = useState<Trainee | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')

  const [loading, setLoading] = useState(false)

  // 1. メニュー一覧を取得
  useEffect(() => {
    async function loadMenus() {
      const { data } = await supabase
        .from('menu')
        .select('*')
        .eq('is_active', true)
        .order('name')
      setMenus(data ?? [])
    }
    loadMenus()
  }, [])

  // 2. メニュー選択後、そのメニューを扱える研修生を取得
  useEffect(() => {
    if (!selectedMenu) return

    async function loadTrainees() {
      // 今日から30日先までのシフトを取得
      const today = format(new Date(), 'yyyy-MM-dd')
      const endDate = format(addDays(new Date(), 30), 'yyyy-MM-dd')

      const { data: shifts } = await supabase
        .from('shift')
        .select('trainee_id, time_slots')
        .gte('date', today)
        .lte('date', endDate)

      // このメニューIDを含むシフトを持つ研修生IDを抽出
      const traineeIds = new Set<string>()
      for (const shift of shifts ?? []) {
        for (const slot of shift.time_slots) {
          if (selectedMenu && slot.menu_ids.includes(selectedMenu.id)) {
            traineeIds.add(shift.trainee_id)
          }
        }
      }

      if (traineeIds.size === 0) {
        setTrainees([])
        return
      }

      // 研修生情報を取得
      const { data } = await supabase
        .from('trainee')
        .select('*')
        .in('id', Array.from(traineeIds))
        .eq('is_active', true)
        .order('name')

      setTrainees(data ?? [])
    }

    loadTrainees()
  }, [selectedMenu])

  // 3. 研修生選択後、予約可能な日付を取得
  useEffect(() => {
    if (!selectedMenu || !selectedTrainee) return

    async function loadDates() {
      if (!selectedMenu || !selectedTrainee) return

      const today = format(new Date(), 'yyyy-MM-dd')
      const endDate = format(addDays(new Date(), 30), 'yyyy-MM-dd')

      const { data: shifts } = await supabase
        .from('shift')
        .select('date, time_slots')
        .eq('trainee_id', selectedTrainee.id)
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

      setAvailableDates(dates.sort())
    }

    loadDates()
  }, [selectedMenu, selectedTrainee])

  // 4. 日付選択後、予約可能な時間を取得
  useEffect(() => {
    if (!selectedMenu || !selectedTrainee || !selectedDate) return

    async function loadTimes() {
      if (!selectedMenu || !selectedTrainee) return

      // シフト取得
      const { data: shift } = await supabase
        .from('shift')
        .select('time_slots')
        .eq('trainee_id', selectedTrainee.id)
        .eq('date', selectedDate)
        .single()

      if (!shift) {
        setAvailableTimes([])
        return
      }

      // このメニューが設定されているtime_slotのavailable_timesを取得
      let times: string[] = []
      for (const slot of shift.time_slots) {
        if (selectedMenu && slot.menu_ids.includes(selectedMenu.id)) {
          times = [...times, ...slot.available_times]
        }
      }

      // 既に予約済みの時間を除外
      const { data: reservations } = await supabase
        .from('reservation')
        .select('start_time')
        .eq('trainee_id', selectedTrainee.id)
        .eq('date', selectedDate)
        .eq('status', 'confirmed')

      const bookedTimes = new Set((reservations ?? []).map(r => r.start_time.slice(0, 5)))
      const available = times.filter(t => !bookedTimes.has(t))

      setAvailableTimes(available.sort())
    }

    loadTimes()
  }, [selectedMenu, selectedTrainee, selectedDate])

  // 予約確定
  async function handleSubmit() {
    if (!selectedMenu || !selectedTrainee || !selectedDate || !selectedTime || !customerName || !customerPhone) {
      alert('すべての項目を入力してください')
      return
    }

    setLoading(true)

    // 終了時刻を計算
    const [h, m] = selectedTime.split(':').map(Number)
    const startMinutes = h * 60 + m
    const endMinutes = startMinutes + selectedMenu.duration_minutes
    const endH = Math.floor(endMinutes / 60)
    const endM = endMinutes % 60
    const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`

    // 予約をデータベースに保存
    const { error } = await supabase.from('reservation').insert({
      trainee_id: selectedTrainee.id,
      menu_id: selectedMenu.id,
      date: selectedDate,
      start_time: selectedTime + ':00',
      end_time: endTime,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail || null,
      status: 'confirmed'
    })

    setLoading(false)

    if (error) {
      alert('予約に失敗しました: ' + error.message)
      return
    }

    alert('✅ 予約が完了しました！\n\n予約内容:\n日時: ' + format(new Date(selectedDate), 'M月d日(E)', { locale: ja }) + ' ' + selectedTime + '\n研修生: ' + selectedTrainee.name + '\nメニュー: ' + selectedMenu.name)

    // リセット
    setStep(1)
    setSelectedMenu(null)
    setSelectedTrainee(null)
    setSelectedDate('')
    setSelectedTime('')
    setCustomerName('')
    setCustomerPhone('')
    setCustomerEmail('')
  }

  // メールアドレス入力をスキップ
  const skipEmail = true

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">研修予約フォーム</h1>
          <p className="text-lg text-gray-900">必要な情報を入力して予約を完了してください</p>
        </div>

        {/* ステップインジケーター */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3, 4, 5].map(s => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                  step >= s ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-900'
                }`}
              >
                {s}
              </div>
              {s < 5 && <div className={`w-12 h-1 ${step > s ? 'bg-indigo-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Step 1: メニュー選択 */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">メニューを選択</h2>
              <div className="space-y-4">
                {menus.map(menu => (
                  <button
                    key={menu.id}
                    onClick={() => {
                      setSelectedMenu(menu)
                      setStep(2)
                    }}
                    className="w-full text-left p-6 border-2 border-gray-300 rounded-lg hover:border-indigo-600 hover:bg-indigo-50 transition-all"
                  >
                    <div className="text-xl font-bold text-gray-900">{menu.name}</div>
                    <div className="text-base text-gray-900 mt-1">{menu.duration_minutes}分</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: 研修生選択 */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">研修生を選択</h2>
              <p className="text-base text-gray-900 mb-6 bg-gray-50 p-3 rounded">選択メニュー: <span className="font-bold">{selectedMenu?.name}</span></p>
              <div className="space-y-4">
                {trainees.length === 0 ? (
                  <p className="text-gray-900 text-center py-8 text-lg">このメニューを扱える研修生がいません</p>
                ) : (
                  trainees.map(trainee => (
                    <button
                      key={trainee.id}
                      onClick={() => {
                        setSelectedTrainee(trainee)
                        setStep(3)
                      }}
                      className="w-full text-left p-6 border-2 border-gray-300 rounded-lg hover:border-indigo-600 hover:bg-indigo-50 transition-all"
                    >
                      <div className="text-xl font-bold text-gray-900">{trainee.name}</div>
                    </button>
                  ))
                )}
              </div>
              <button
                onClick={() => {
                  setStep(1)
                  setSelectedMenu(null)
                  setTrainees([])
                }}
                className="mt-6 text-gray-900 hover:text-gray-900 text-base"
              >
                ← メニューを変更
              </button>
            </div>
          )}

          {/* Step 3: 日付選択 */}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">日付を選択</h2>
              <p className="text-base text-gray-900 mb-6 bg-gray-50 p-3 rounded">
                <span className="font-bold">{selectedMenu?.name}</span> / <span className="font-bold">{selectedTrainee?.name}</span>
              </p>
              <div className="grid grid-cols-2 gap-4">
                {availableDates.length === 0 ? (
                  <p className="col-span-2 text-gray-900 text-center py-8 text-lg">予約可能な日がありません</p>
                ) : (
                  availableDates.map(date => (
                    <button
                      key={date}
                      onClick={() => {
                        setSelectedDate(date)
                        setStep(4)
                      }}
                      className="p-6 border-2 border-gray-300 rounded-lg hover:border-indigo-600 hover:bg-indigo-50 transition-all text-center"
                    >
                      <div className="text-xl font-bold text-gray-900">
                        {format(new Date(date), 'M月d日(E)', { locale: ja })}
                      </div>
                    </button>
                  ))
                )}
              </div>
              <button
                onClick={() => {
                  setStep(2)
                  setSelectedTrainee(null)
                  setAvailableDates([])
                }}
                className="mt-6 text-gray-900 hover:text-gray-900 text-base"
              >
                ← 研修生を変更
              </button>
            </div>
          )}

          {/* Step 4: 時間選択 */}
          {step === 4 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">時間を選択</h2>
              <p className="text-base text-gray-900 mb-6 bg-gray-50 p-3 rounded">
                <span className="font-bold">{format(new Date(selectedDate), 'M月d日(E)', { locale: ja })}</span> / <span className="font-bold">{selectedTrainee?.name}</span>
              </p>
              <div className="grid grid-cols-3 gap-4">
                {availableTimes.length === 0 ? (
                  <p className="col-span-3 text-gray-900 text-center py-8 text-lg">予約可能な時間がありません</p>
                ) : (
                  availableTimes.map(time => (
                    <button
                      key={time}
                      onClick={() => {
                        setSelectedTime(time)
                        setStep(5)
                      }}
                      className="p-5 border-2 border-gray-300 rounded-lg hover:border-indigo-600 hover:bg-indigo-50 transition-all text-center text-xl font-bold text-gray-900"
                    >
                      {time}
                    </button>
                  ))
                )}
              </div>
              <button
                onClick={() => {
                  setStep(3)
                  setSelectedDate('')
                  setAvailableTimes([])
                }}
                className="mt-6 text-gray-900 hover:text-gray-900 text-base"
              >
                ← 日付を変更
              </button>
            </div>
          )}

          {/* Step 5: お客様情報入力 */}
          {step === 5 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">お客様情報入力</h2>

              <div className="bg-indigo-50 rounded-lg p-5 mb-6">
                <p className="text-base font-medium text-gray-900 mb-2">予約内容</p>
                <div className="text-xl font-bold text-gray-900 mb-1">
                  {format(new Date(selectedDate), 'M月d日(E)', { locale: ja })} {selectedTime} 〜
                </div>
                <div className="text-base text-gray-900">
                  {selectedMenu?.name} / {selectedTrainee?.name}
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-base font-bold text-gray-900 mb-3">お名前 *</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-4 text-lg text-gray-900 font-bold"
                    placeholder="山田 太郎"
                  />
                </div>

                <div>
                  <label className="block text-base font-bold text-gray-900 mb-3">電話番号 *</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-4 text-lg text-gray-900 font-bold"
                    placeholder="090-1234-5678"
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full py-5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold text-xl disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? '予約中...' : '予約を確定する'}
                </button>

                <button
                  onClick={() => {
                    setStep(4)
                    setSelectedTime('')
                  }}
                  className="w-full text-gray-900 hover:text-gray-900 text-base"
                >
                  ← 時間を変更
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="text-center mt-6">
          <a href="/" className="text-gray-900 hover:text-gray-900 text-base font-medium">
            ← トップに戻る
          </a>
        </div>
      </div>
    </div>
  )
}
