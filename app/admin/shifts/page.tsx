'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Trainee, Menu, Shift, TimeSlot } from '@/types/database'
import Link from 'next/link'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, getDay } from 'date-fns'
import { ja } from 'date-fns/locale'

export default function ShiftsPage() {
  const [trainees, setTrainees] = useState<Trainee[]>([])
  const [menus, setMenus] = useState<Menu[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [shifts, setShifts] = useState<Record<string, Shift>>({}) // key: "trainee_id-YYYY-MM-DD"

  // モーダル
  const [showModal, setShowModal] = useState(false)
  const [selectedTrainee, setSelectedTrainee] = useState<Trainee | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([
    { start_time: '10:00', end_time: '19:00', menu_ids: [], available_times: [] }
  ])

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  useEffect(() => {
    loadTrainees()
    loadMenus()
  }, [])

  useEffect(() => {
    loadMonthShifts()
  }, [currentMonth, trainees])

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

  async function loadMonthShifts() {
    if (trainees.length === 0) return

    const { data } = await supabase
      .from('shift')
      .select('*')
      .gte('date', format(monthStart, 'yyyy-MM-dd'))
      .lte('date', format(monthEnd, 'yyyy-MM-dd'))

    const map: Record<string, Shift> = {}
    for (const s of data ?? []) {
      map[`${s.trainee_id}-${s.date}`] = s
    }
    setShifts(map)
  }

  function openModal(trainee: Trainee, date: Date) {
    const dateStr = format(date, 'yyyy-MM-dd')
    const key = `${trainee.id}-${dateStr}`
    const existingShift = shifts[key]

    setSelectedTrainee(trainee)
    setSelectedDate(dateStr)

    if (existingShift && existingShift.time_slots.length > 0) {
      setTimeSlots(existingShift.time_slots)
    } else {
      setTimeSlots([{ start_time: '10:00', end_time: '19:00', menu_ids: [], available_times: [] }])
    }

    setShowModal(true)
  }

  function addTimeSlot() {
    setTimeSlots([...timeSlots, { start_time: '14:00', end_time: '19:00', menu_ids: [], available_times: [] }])
  }

  function removeTimeSlot(index: number) {
    setTimeSlots(timeSlots.filter((_, i) => i !== index))
  }

  function generateAvailableTimes(slot: TimeSlot): string[] {
    if (slot.menu_ids.length === 0) return []

    const selectedMenus = menus.filter(m => slot.menu_ids.includes(m.id))
    const maxDuration = Math.max(...selectedMenus.map(m => m.duration_minutes))

    const times: string[] = []
    const [startH, startM] = slot.start_time.split(':').map(Number)
    const [endH, endM] = slot.end_time.split(':').map(Number)

    const startMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM

    for (let m = startMinutes; m + maxDuration <= endMinutes; m += maxDuration) {
      const h = Math.floor(m / 60)
      const min = m % 60
      times.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`)
    }

    return times
  }

  async function handleSave() {
    if (!selectedTrainee || !selectedDate) return

    const data = {
      trainee_id: selectedTrainee.id,
      date: selectedDate,
      time_slots: timeSlots,
      break_start: null,
      break_end: null
    }

    const { error } = await supabase
      .from('shift')
      .upsert(data, { onConflict: 'trainee_id,date' })

    if (error) {
      alert('保存に失敗しました: ' + error.message)
    } else {
      alert('✅ シフトを保存しました')
      setShowModal(false)
      loadMonthShifts()
    }
  }

  async function handleDelete() {
    if (!selectedTrainee || !selectedDate) return
    if (!confirm('このシフトを削除しますか？')) return

    const { error } = await supabase
      .from('shift')
      .delete()
      .eq('trainee_id', selectedTrainee.id)
      .eq('date', selectedDate)

    if (!error) {
      alert('✅ シフトを削除しました')
      setShowModal(false)
      loadMonthShifts()
    }
  }

  function getCellStatus(trainee: Trainee, date: Date): string {
    const dateStr = format(date, 'yyyy-MM-dd')
    const key = `${trainee.id}-${dateStr}`
    const shift = shifts[key]

    if (!shift) return 'none' // 未設定
    if (shift.time_slots.length === 0) return 'off' // 休み
    return 'on' // 出勤
  }

  function getCellColor(status: string): string {
    switch (status) {
      case 'on': return 'bg-blue-100 text-blue-900 border-blue-300'
      case 'off': return 'bg-gray-100 text-gray-600 border-gray-300'
      default: return 'bg-white text-gray-400 border-gray-200'
    }
  }

  function getCellText(status: string): string {
    switch (status) {
      case 'on': return '出'
      case 'off': return '休'
      default: return '-'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">シフト設定</h1>
          <Link href="/" className="text-base font-bold text-gray-900 hover:text-indigo-600">
            ← トップに戻る
          </Link>
        </div>

        {/* 月選択 */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex items-center justify-between">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 font-bold"
          >
            ← 前月
          </button>
          <h2 className="text-xl font-bold text-gray-900">
            {format(currentMonth, 'yyyy年 M月', { locale: ja })}
          </h2>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 font-bold"
          >
            次月 →
          </button>
        </div>

        {/* カレンダーマトリクス */}
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2 text-base font-bold text-gray-900 w-32 sticky left-0 bg-gray-100 z-10">
                  研修生名
                </th>
                <th className="border border-gray-300 p-2 text-sm font-bold text-gray-900 w-20">
                  設定状況
                </th>
                {days.map(day => {
                  const dayOfWeek = getDay(day)
                  const isSunday = dayOfWeek === 0
                  const isSaturday = dayOfWeek === 6
                  return (
                    <th
                      key={day.toISOString()}
                      className={`border border-gray-300 p-2 text-sm font-bold w-20 ${
                        isSunday ? 'bg-red-50 text-red-600' : isSaturday ? 'bg-blue-50 text-blue-600' : 'text-gray-900'
                      }`}
                    >
                      <div>{format(day, 'd')}</div>
                      <div className="text-xs">{format(day, '(E)', { locale: ja })}</div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {trainees.map(trainee => {
                const setCount = days.filter(day => getCellStatus(trainee, day) === 'on').length
                const offCount = days.filter(day => getCellStatus(trainee, day) === 'off').length

                return (
                  <tr key={trainee.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 p-2 font-bold text-gray-900 text-base sticky left-0 bg-white z-10">
                      {trainee.name}
                    </td>
                    <td className="border border-gray-300 p-2 text-center text-sm text-gray-900">
                      <div>出: {setCount}日</div>
                      <div>休: {offCount}日</div>
                    </td>
                    {days.map(day => {
                      const status = getCellStatus(trainee, day)
                      return (
                        <td
                          key={day.toISOString()}
                          className={`border border-gray-300 p-0`}
                        >
                          <button
                            onClick={() => openModal(trainee, day)}
                            className={`w-full h-full py-3 text-sm font-bold ${getCellColor(status)} hover:opacity-80 transition-opacity`}
                          >
                            {getCellText(status)}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>

          {trainees.length === 0 && (
            <div className="p-8 text-center text-gray-900 text-lg font-bold">
              研修生が登録されていません。基本設定から研修生を追加してください。
            </div>
          )}
        </div>

        {/* 凡例 */}
        <div className="mt-4 flex items-center gap-4 text-sm text-gray-900 font-bold">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 border border-blue-300 rounded flex items-center justify-center text-blue-900">出</div>
            <span>出勤</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-100 border border-gray-300 rounded flex items-center justify-center text-gray-600">休</div>
            <span>休み</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white border border-gray-200 rounded flex items-center justify-center text-gray-400">-</div>
            <span>未設定</span>
          </div>
        </div>
      </div>

      {/* モーダル */}
      {showModal && selectedTrainee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedTrainee.name} - {format(new Date(selectedDate), 'M月d日(E)', { locale: ja })}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 hover:text-gray-900 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* 休み設定 */}
              <div className="mb-6">
                <button
                  onClick={() => {
                    setTimeSlots([])
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 font-bold"
                >
                  この日を休みにする
                </button>
              </div>

              {/* 時間帯設定 */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">勤務時間帯</h3>
                  <button
                    onClick={addTimeSlot}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold"
                  >
                    + 時間帯を追加
                  </button>
                </div>

                {timeSlots.length === 0 ? (
                  <p className="text-gray-900 font-bold">休み</p>
                ) : (
                  <div className="space-y-4">
                    {timeSlots.map((slot, index) => (
                      <div key={index} className="border-2 border-gray-300 rounded-lg p-4">
                        <div className="flex items-center gap-4 mb-4">
                          <input
                            type="time"
                            value={slot.start_time}
                            onChange={e => {
                              const updated = [...timeSlots]
                              updated[index].start_time = e.target.value
                              setTimeSlots(updated)
                            }}
                            className="border-2 border-gray-300 rounded px-3 py-2 font-bold"
                          />
                          <span className="text-gray-900 font-bold">〜</span>
                          <input
                            type="time"
                            value={slot.end_time}
                            onChange={e => {
                              const updated = [...timeSlots]
                              updated[index].end_time = e.target.value
                              setTimeSlots(updated)
                            }}
                            className="border-2 border-gray-300 rounded px-3 py-2 font-bold"
                          />
                          <button
                            onClick={() => removeTimeSlot(index)}
                            className="ml-auto px-3 py-2 text-red-600 hover:bg-red-50 rounded font-bold"
                          >
                            削除
                          </button>
                        </div>

                        <div className="mb-4">
                          <p className="text-base font-bold text-gray-900 mb-3">受付可能メニュー</p>
                          <div className="space-y-2">
                            {menus.map(menu => (
                              <label key={menu.id} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={slot.menu_ids.includes(menu.id)}
                                  onChange={e => {
                                    const updated = [...timeSlots]
                                    if (e.target.checked) {
                                      updated[index].menu_ids = [...updated[index].menu_ids, menu.id]
                                    } else {
                                      updated[index].menu_ids = updated[index].menu_ids.filter(id => id !== menu.id)
                                    }
                                    setTimeSlots(updated)
                                  }}
                                  className="w-4 h-4"
                                />
                                <span className="text-base font-bold text-gray-900">{menu.name} ({menu.duration_minutes}分)</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="border-t-2 border-gray-200 pt-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-base font-bold text-gray-900">予約可能時間</p>
                            <button
                              onClick={() => {
                                const updated = [...timeSlots]
                                updated[index].available_times = generateAvailableTimes(slot)
                                setTimeSlots(updated)
                              }}
                              className="text-base text-indigo-600 hover:text-indigo-700 font-bold"
                            >
                              自動生成
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {generateAvailableTimes(slot).map(time => (
                              <label key={time} className="flex items-center gap-1 text-base font-bold">
                                <input
                                  type="checkbox"
                                  checked={slot.available_times.includes(time)}
                                  onChange={e => {
                                    const updated = [...timeSlots]
                                    if (e.target.checked) {
                                      updated[index].available_times = [...updated[index].available_times, time].sort()
                                    } else {
                                      updated[index].available_times = updated[index].available_times.filter(t => t !== time)
                                    }
                                    setTimeSlots(updated)
                                  }}
                                  className="w-4 h-4"
                                />
                                <span>{time}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* アクション */}
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-lg"
                >
                  保存する
                </button>
                <button
                  onClick={handleDelete}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold text-lg"
                >
                  削除
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 font-bold text-lg"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
