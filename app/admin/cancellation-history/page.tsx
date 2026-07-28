'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { CancellationHistory } from '@/types/database'
import Link from 'next/link'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export default function CancellationHistoryPage() {
  const [history, setHistory] = useState<CancellationHistory[]>([])
  const [filter, setFilter] = useState<'all' | 'salon' | 'customer'>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [stats, setStats] = useState({
    total: 0,
    salon: 0,
    customer: 0
  })

  useEffect(() => {
    loadHistory()
  }, [filter, startDate, endDate])

  async function loadHistory() {
    let query = supabase
      .from('cancellation_history')
      .select('*')
      .order('cancelled_at', { ascending: false })

    if (filter !== 'all') {
      query = query.eq('cancelled_by', filter)
    }

    if (startDate) {
      query = query.gte('date', startDate)
    }

    if (endDate) {
      query = query.lte('date', endDate)
    }

    const { data } = await query

    if (data) {
      setHistory(data)

      // 統計を計算
      const total = data.length
      const salon = data.filter(h => h.cancelled_by === 'salon').length
      const customer = data.filter(h => h.cancelled_by === 'customer').length

      setStats({ total, salon, customer })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">キャンセル履歴</h1>
          <Link href="/admin" className="text-base font-bold text-gray-900 hover:text-indigo-600">
            ← 管理画面トップ
          </Link>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 font-bold">総キャンセル数</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">🏪</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 font-bold">サロン都合</p>
                <p className="text-3xl font-bold text-orange-600">{stats.salon}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">👤</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 font-bold">モデル都合</p>
                <p className="text-3xl font-bold text-blue-600">{stats.customer}</p>
              </div>
            </div>
          </div>
        </div>

        {/* フィルター */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">キャンセル種別</label>
              <select
                value={filter}
                onChange={e => setFilter(e.target.value as 'all' | 'salon' | 'customer')}
                className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-base text-gray-900 font-bold"
              >
                <option value="all">すべて</option>
                <option value="salon">サロン都合</option>
                <option value="customer">モデル都合</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">開始日</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-base text-gray-900 font-bold"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">終了日</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-base text-gray-900 font-bold"
              />
            </div>
          </div>
        </div>

        {/* キャンセル履歴リスト */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                    キャンセル日時
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                    予約日時
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                    研修生
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                    メニュー
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                    お客様名
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                    電話番号
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                    理由
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                    メモ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.map(h => (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">
                        {format(new Date(h.cancelled_at), 'M/d HH:mm', { locale: ja })}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">
                        {format(new Date(h.date), 'M/d(E)', { locale: ja })}
                      </div>
                      <div className="text-sm text-gray-600">
                        {h.start_time.slice(0, 5)} 〜 {h.end_time.slice(0, 5)}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{h.trainee_name}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{h.menu_name}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{h.customer_name}様</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{h.customer_phone}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${
                        h.cancelled_by === 'salon'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {h.cancelled_by === 'salon' ? 'サロン都合' : 'モデル都合'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {h.cancellation_reason || '-'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {history.length === 0 && (
              <div className="p-8 text-center text-gray-500 text-base font-bold">
                キャンセル履歴がありません
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
