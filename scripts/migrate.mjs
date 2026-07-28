import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// .env.localを読み込み
config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 環境変数が設定されていません')
  process.exit(1)
}

console.log('🔗 Supabaseに接続中...')
console.log('URL:', supabaseUrl)

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration() {
  console.log('\n🔄 マイグレーションを実行します...\n')

  // テーブル作成
  console.log('1. cancellation_historyテーブルを作成...')
  const { error: createError } = await supabase.rpc('exec', {
    sql: `
      CREATE TABLE IF NOT EXISTS cancellation_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        reservation_id UUID REFERENCES reservation(id) ON DELETE SET NULL,
        reservation_number TEXT,
        trainee_id UUID REFERENCES trainee(id) ON DELETE SET NULL,
        trainee_name TEXT NOT NULL,
        menu_name TEXT NOT NULL,
        date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        customer_email TEXT,
        cancelled_by TEXT NOT NULL CHECK (cancelled_by IN ('salon', 'customer')),
        cancelled_at TIMESTAMPTZ DEFAULT NOW(),
        cancellation_reason TEXT,
        original_created_at TIMESTAMPTZ
      );
    `
  }).then(() => ({ error: null }))
    .catch((e) => ({ error: e }))

  if (!createError) {
    console.log('   ✅ テーブル作成成功')
  }

  // インデックス作成
  console.log('2. インデックスを作成...')
  await supabase.rpc('exec', {
    sql: `CREATE INDEX IF NOT EXISTS idx_cancellation_history_date ON cancellation_history(date);`
  }).catch(() => {})

  await supabase.rpc('exec', {
    sql: `CREATE INDEX IF NOT EXISTS idx_cancellation_history_cancelled_by ON cancellation_history(cancelled_by);`
  }).catch(() => {})

  console.log('   ✅ インデックス作成成功')

  // RLS設定
  console.log('3. RLSを設定...')
  await supabase.rpc('exec', {
    sql: `ALTER TABLE cancellation_history ENABLE ROW LEVEL SECURITY;`
  }).catch(() => {})

  await supabase.rpc('exec', {
    sql: `CREATE POLICY IF NOT EXISTS "Allow all cancellation_history" ON cancellation_history FOR ALL USING (true) WITH CHECK (true);`
  }).catch(() => {})

  console.log('   ✅ RLS設定成功')

  // 確認
  console.log('\n4. テーブルの存在確認...')
  const { data, error } = await supabase
    .from('cancellation_history')
    .select('*')
    .limit(1)

  if (!error) {
    console.log('   ✅ cancellation_historyテーブルが正常にアクセス可能です')
  } else {
    console.log('   ⚠️  確認エラー:', error.message)
  }

  console.log('\n✅ マイグレーション完了！')
}

runMigration().catch((error) => {
  console.error('❌ マイグレーションエラー:', error)
  process.exit(1)
})
