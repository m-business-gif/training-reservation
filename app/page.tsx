import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-6">
        <h1 className="text-4xl font-bold text-gray-900 text-center mb-12">研修予約システム</h1>

        <div className="grid gap-6">
          <a
            href="/booking"
            className="block bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-all border-2 border-transparent hover:border-indigo-600"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-2">新規予約</h2>
            <p className="text-gray-900 text-base">研修の予約を行います</p>
          </a>

          <a
            href="/my-reservation"
            className="block bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-all border-2 border-transparent hover:border-indigo-600"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-2">予約確認・キャンセル</h2>
            <p className="text-gray-900 text-base">予約番号で予約内容を確認・キャンセルできます</p>
          </a>
        </div>

        <div className="text-center mt-12">
          <a href="/admin" className="text-gray-600 hover:text-gray-900 text-sm">
            管理者の方はこちら
          </a>
        </div>
      </div>
    </div>
  )
}
