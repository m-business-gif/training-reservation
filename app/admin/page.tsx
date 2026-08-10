'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Notification } from '@/types/database'

export default function AdminHome() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [toastNotification, setToastNotification] = useState<Notification | null>(null)

  useEffect(() => {
    loadNotifications()

    // リアルタイム通知の購読
    const channel = supabase
      .channel('notification-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification'
        },
        (payload) => {
          const newNotification = payload.new as Notification
          setNotifications(prev => [newNotification, ...prev])
          setUnreadCount(prev => prev + 1)

          // アプリ内トースト通知を表示
          showToast(newNotification)
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  async function loadNotifications() {
    const { data } = await supabase
      .from('notification')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    if (data) {
      setNotifications(data)
      const unreadNotifications = data.filter(n => !n.is_read)
      setUnreadCount(unreadNotifications.length)

      // 未読通知がある場合、最新の1件をトースト表示
      if (unreadNotifications.length > 0) {
        showToast(unreadNotifications[0])
      }
    }
  }

  function showToast(notification: Notification) {
    setToastNotification(notification)

    // 5秒後に自動的に消す
    setTimeout(() => {
      setToastNotification(null)
    }, 5000)
  }

  async function markAsRead(id: string) {
    await supabase
      .from('notification')
      .update({ is_read: true })
      .eq('id', id)

    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  async function markAllAsRead() {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)

    if (unreadIds.length === 0) return

    await supabase
      .from('notification')
      .update({ is_read: true })
      .in('id', unreadIds)

    setNotifications(prev =>
      prev.map(n => ({ ...n, is_read: true }))
    )
    setUnreadCount(0)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* トースト通知 */}
        {toastNotification && (
          <div className="fixed top-4 right-4 z-50 animate-slide-in">
            <div className="bg-white rounded-lg shadow-2xl border-2 border-indigo-500 p-4 max-w-md">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 text-3xl">
                  {toastNotification.type === 'cancellation' ? '⚠️' : '📅'}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-lg mb-1">
                    {toastNotification.title}
                  </h3>
                  <p className="text-sm text-gray-700">
                    {toastNotification.message}
                  </p>
                  {toastNotification.reservation_number && (
                    <p className="text-xs text-gray-600 mt-2">
                      予約番号: {toastNotification.reservation_number}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setToastNotification(null)}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600 text-xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">管理画面</h1>

          {/* 通知ベル */}
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-3 bg-white rounded-full shadow hover:shadow-lg transition-all"
          >
            <span className="text-2xl">🔔</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* 通知パネル */}
        {showNotifications && (
          <div className="bg-white rounded-lg shadow-lg p-4 mb-6 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">通知</h2>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-bold"
                >
                  すべて既読にする
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <p className="text-gray-600 text-center py-4">通知はありません</p>
            ) : (
              <div className="space-y-2">
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg border-2 ${
                      notification.is_read
                        ? 'bg-gray-50 border-gray-200'
                        : 'bg-indigo-50 border-indigo-200'
                    }`}
                    onClick={() => !notification.is_read && markAsRead(notification.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-bold text-gray-900">{notification.title}</p>
                        <p className="text-sm text-gray-700 mt-1">{notification.message}</p>
                        <p className="text-xs text-gray-600 mt-2">
                          {new Date(notification.created_at).toLocaleString('ja-JP')}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <span className="ml-2 w-2 h-2 bg-indigo-600 rounded-full"></span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <Link
            href="/admin/shifts"
            className="block bg-white rounded-lg shadow p-6 sm:p-8 hover:shadow-lg active:shadow-lg transition-all hover:border-indigo-500 active:border-indigo-500 border-2 border-transparent"
          >
            <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">📅</div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">シフト設定</h2>
            <p className="text-sm sm:text-base text-gray-900">
              研修生の月間シフトを設定<br />
              出勤日・時間帯・メニューを管理
            </p>
          </Link>

          <Link
            href="/admin/reservations"
            className="block bg-white rounded-lg shadow p-6 sm:p-8 hover:shadow-lg active:shadow-lg transition-all hover:border-indigo-500 active:border-indigo-500 border-2 border-transparent"
          >
            <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">📋</div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">予約管理</h2>
            <p className="text-sm sm:text-base text-gray-900">
              予約一覧・タイムライン表示<br />
              手動予約追加・キャンセル処理
            </p>
          </Link>

          <Link
            href="/admin/cancellation-history"
            className="block bg-white rounded-lg shadow p-6 sm:p-8 hover:shadow-lg active:shadow-lg transition-all hover:border-indigo-500 active:border-indigo-500 border-2 border-transparent"
          >
            <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">📝</div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">キャンセル履歴</h2>
            <p className="text-sm sm:text-base text-gray-900">
              サロン都合・モデル都合を管理<br />
              キャンセル理由の確認
            </p>
          </Link>

          <Link
            href="/admin/settings"
            className="block bg-white rounded-lg shadow p-6 sm:p-8 hover:shadow-lg active:shadow-lg transition-all hover:border-indigo-500 active:border-indigo-500 border-2 border-transparent"
          >
            <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">⚙️</div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">基本設定</h2>
            <p className="text-sm sm:text-base text-gray-900">
              研修生・メニュー管理<br />
              メール通知設定
            </p>
          </Link>

          <a
            href="https://training-reservation-v2.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-indigo-50 rounded-lg shadow p-6 sm:p-8 hover:shadow-lg active:shadow-lg transition-all hover:border-indigo-500 active:border-indigo-500 border-2 border-transparent"
          >
            <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">🔗</div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">お客様用予約ページ</h2>
            <p className="text-sm sm:text-base text-gray-900">
              お客様に共有するURLを確認<br />
              新しいタブで開く
            </p>
          </a>
        </div>

        <div className="mt-6 sm:mt-8 bg-white rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">📱 お客様用URL</h3>
          <div className="bg-gray-50 p-3 sm:p-4 rounded-lg overflow-x-auto">
            <code className="text-sm sm:text-lg font-bold text-indigo-600 break-all">
              https://training-reservation-v2.vercel.app
            </code>
          </div>
          <p className="text-sm sm:text-base text-gray-900 mt-3">
            ↑ このURLをお客様に共有してください（管理画面は表示されません）
          </p>
        </div>
      </div>
    </div>
  )
}
