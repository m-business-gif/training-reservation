import Link from 'next/link'

export default function AdminHome() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">管理画面</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/admin/shifts"
            className="block bg-white rounded-lg shadow p-8 hover:shadow-lg transition-all hover:border-indigo-500 border-2 border-transparent"
          >
            <div className="text-5xl mb-4">📅</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">シフト設定</h2>
            <p className="text-base text-gray-900">
              研修生の月間シフトを設定<br />
              出勤日・時間帯・メニューを管理
            </p>
          </Link>

          <Link
            href="/admin/reservations"
            className="block bg-white rounded-lg shadow p-8 hover:shadow-lg transition-all hover:border-indigo-500 border-2 border-transparent"
          >
            <div className="text-5xl mb-4">📋</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">予約管理</h2>
            <p className="text-base text-gray-900">
              予約一覧・タイムライン表示<br />
              手動予約追加・キャンセル処理
            </p>
          </Link>

          <Link
            href="/admin/settings"
            className="block bg-white rounded-lg shadow p-8 hover:shadow-lg transition-all hover:border-indigo-500 border-2 border-transparent"
          >
            <div className="text-5xl mb-4">⚙️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">基本設定</h2>
            <p className="text-base text-gray-900">
              研修生・メニュー管理<br />
              メール通知設定
            </p>
          </Link>

          <a
            href="https://training-reservation-v2.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-indigo-50 rounded-lg shadow p-8 hover:shadow-lg transition-all hover:border-indigo-500 border-2 border-transparent"
          >
            <div className="text-5xl mb-4">🔗</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">お客様用予約ページ</h2>
            <p className="text-base text-gray-900">
              お客様に共有するURLを確認<br />
              新しいタブで開く
            </p>
          </a>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">📱 お客様用URL</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <code className="text-lg font-bold text-indigo-600">
              https://training-reservation-v2.vercel.app
            </code>
          </div>
          <p className="text-base text-gray-900 mt-3">
            ↑ このURLをお客様に共有してください（管理画面は表示されません）
          </p>
        </div>
      </div>
    </div>
  )
}
