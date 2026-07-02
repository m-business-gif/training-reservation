import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">研修予約システム</h1>

        <div className="space-y-4">
          <Link
            href="/booking"
            className="block bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
          >
            <h2 className="text-2xl font-bold text-gray-900">予約フォーム</h2>
            <p className="text-base text-gray-900 mt-2">お客様用</p>
          </Link>

          <Link
            href="/admin/shifts"
            className="block bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
          >
            <h2 className="text-2xl font-bold text-gray-900">シフト設定</h2>
            <p className="text-base text-gray-900 mt-2">研修スケジュール・予約可能時間の設定</p>
          </Link>

          <Link
            href="/admin/reservations"
            className="block bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
          >
            <h2 className="text-2xl font-bold text-gray-900">予約管理</h2>
            <p className="text-base text-gray-900 mt-2">予約一覧・キャンセル</p>
          </Link>

          <Link
            href="/admin/settings"
            className="block bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
          >
            <h2 className="text-2xl font-bold text-gray-900">基本設定</h2>
            <p className="text-base text-gray-900 mt-2">研修生・メニュー管理</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
