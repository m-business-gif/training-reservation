'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Trainee, Menu } from '@/types/database'
import Link from 'next/link'

export default function SettingsPage() {
  const [trainees, setTrainees] = useState<Trainee[]>([])
  const [menus, setMenus] = useState<Menu[]>([])

  // 研修生追加フォーム
  const [newTraineeName, setNewTraineeName] = useState('')

  // メニュー追加フォーム
  const [newMenuName, setNewMenuName] = useState('')
  const [newMenuDuration, setNewMenuDuration] = useState(60)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [t, m] = await Promise.all([
      supabase.from('trainee').select('*').order('name'),
      supabase.from('menu').select('*').order('name')
    ])
    setTrainees(t.data ?? [])
    setMenus(m.data ?? [])
  }

  async function addTrainee() {
    if (!newTraineeName.trim()) return
    const { error } = await supabase
      .from('trainee')
      .insert({ name: newTraineeName.trim(), is_active: true })

    if (!error) {
      setNewTraineeName('')
      loadData()
    }
  }

  async function deleteTrainee(id: string) {
    // 関連データの件数を確認
    const [shiftsResult, reservationsResult] = await Promise.all([
      supabase.from('shift').select('id', { count: 'exact', head: true }).eq('trainee_id', id),
      supabase.from('reservation').select('id', { count: 'exact', head: true }).eq('trainee_id', id)
    ])

    const shiftsCount = shiftsResult.count ?? 0
    const reservationsCount = reservationsResult.count ?? 0

    const message = `本当に削除しますか？

【関連データも一緒に削除されます】
・シフト: ${shiftsCount}件
・予約: ${reservationsCount}件

※この操作は取り消せません。`

    if (!confirm(message)) return

    // まず予約を削除
    if (reservationsCount > 0) {
      const { error: reservationError } = await supabase
        .from('reservation')
        .delete()
        .eq('trainee_id', id)

      if (reservationError) {
        alert('❌ 予約の削除に失敗しました\n\n' + reservationError.message)
        return
      }
    }

    // 次にシフトを削除（CASCADE設定されているが念のため）
    if (shiftsCount > 0) {
      const { error: shiftError } = await supabase
        .from('shift')
        .delete()
        .eq('trainee_id', id)

      if (shiftError) {
        alert('❌ シフトの削除に失敗しました\n\n' + shiftError.message)
        return
      }
    }

    // 最後に研修生を削除
    const { error } = await supabase.from('trainee').delete().eq('id', id)

    if (error) {
      alert('❌ 削除に失敗しました\n\n' + error.message)
      return
    }

    alert('✅ 削除しました')
    loadData()
  }

  async function addMenu() {
    if (!newMenuName.trim()) return
    const { error } = await supabase
      .from('menu')
      .insert({
        name: newMenuName.trim(),
        duration_minutes: newMenuDuration,
        is_active: true
      })

    if (!error) {
      setNewMenuName('')
      setNewMenuDuration(60)
      loadData()
    }
  }

  async function deleteMenu(id: string) {
    // 関連データの件数を確認
    const { count } = await supabase
      .from('reservation')
      .select('id', { count: 'exact', head: true })
      .eq('menu_id', id)

    const reservationsCount = count ?? 0

    const message = `本当に削除しますか？

【関連データも一緒に削除されます】
・予約: ${reservationsCount}件

※この操作は取り消せません。`

    if (!confirm(message)) return

    // まず予約を削除
    if (reservationsCount > 0) {
      const { error: reservationError } = await supabase
        .from('reservation')
        .delete()
        .eq('menu_id', id)

      if (reservationError) {
        alert('❌ 予約の削除に失敗しました\n\n' + reservationError.message)
        return
      }
    }

    // 最後にメニューを削除
    const { error } = await supabase.from('menu').delete().eq('id', id)

    if (error) {
      alert('❌ 削除に失敗しました\n\n' + error.message)
      return
    }

    alert('✅ 削除しました')
    loadData()
  }

  async function toggleTraineeActive(id: string, is_active: boolean) {
    await supabase.from('trainee').update({ is_active: !is_active }).eq('id', id)
    loadData()
  }

  async function toggleMenuActive(id: string, is_active: boolean) {
    await supabase.from('menu').update({ is_active: !is_active }).eq('id', id)
    loadData()
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">基本設定</h1>
          <Link href="/admin" className="text-base font-bold text-gray-900 hover:text-indigo-600">
            ← 管理画面トップ
          </Link>
        </div>

        {/* 研修生管理 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">研修生管理</h2>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newTraineeName}
              onChange={e => setNewTraineeName(e.target.value)}
              placeholder="研修生の名前"
              className="flex-1 border-2 border-gray-300 rounded-lg px-3 py-3 text-base text-gray-900 font-bold"
              onKeyDown={e => e.key === 'Enter' && addTrainee()}
            />
            <button
              onClick={addTrainee}
              className="px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold text-base"
            >
              追加
            </button>
          </div>

          <div className="space-y-2">
            {trainees.map(t => (
              <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-bold text-gray-900 text-lg">{t.name}</span>
                  {!t.is_active && (
                    <span className="ml-2 text-xs bg-gray-300 text-gray-900 px-2 py-1 rounded font-bold">非表示</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleTraineeActive(t.id, t.is_active)}
                    className="px-3 py-1 text-sm text-gray-900 hover:bg-gray-100 rounded font-bold"
                  >
                    {t.is_active ? '非表示' : '表示'}
                  </button>
                  <button
                    onClick={() => deleteTrainee(t.id)}
                    className="px-3 py-1 text-red-600 hover:bg-red-50 rounded text-sm font-bold"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* メニュー管理 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">メニュー管理</h2>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newMenuName}
              onChange={e => setNewMenuName(e.target.value)}
              placeholder="メニュー名"
              className="flex-1 border-2 border-gray-300 rounded-lg px-3 py-3 text-base text-gray-900 font-bold"
            />
            <input
              type="number"
              value={newMenuDuration}
              onChange={e => setNewMenuDuration(Number(e.target.value))}
              className="w-24 border-2 border-gray-300 rounded-lg px-3 py-3 text-base font-bold text-gray-900"
            />
            <span className="flex items-center text-base text-gray-900 font-bold">分</span>
            <button
              onClick={addMenu}
              className="px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold text-base"
            >
              追加
            </button>
          </div>

          <div className="space-y-2">
            {menus.map(m => (
              <div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-bold text-gray-900 text-lg">{m.name}</span>
                  <span className="text-base text-gray-900 ml-2">({m.duration_minutes}分)</span>
                  {!m.is_active && (
                    <span className="ml-2 text-xs bg-gray-300 text-gray-900 px-2 py-1 rounded font-bold">非表示</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleMenuActive(m.id, m.is_active)}
                    className="px-3 py-1 text-sm text-gray-900 hover:bg-gray-100 rounded font-bold"
                  >
                    {m.is_active ? '非表示' : '表示'}
                  </button>
                  <button
                    onClick={() => deleteMenu(m.id)}
                    className="px-3 py-1 text-red-600 hover:bg-red-50 rounded text-sm font-bold"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
