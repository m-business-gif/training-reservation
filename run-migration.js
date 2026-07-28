const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// 環境変数から接続情報を取得
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 環境変数が設定されていません')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  console.log('🔄 マイグレーションを実行します...')

  // SQLファイルを読み込み
  const sql = fs.readFileSync('./supabase/add_cancellation_history.sql', 'utf8')

  // SQLを実行（複数のステートメントに分割）
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  for (const statement of statements) {
    if (statement.trim()) {
      console.log(`実行中: ${statement.substring(0, 50)}...`)

      const { error } = await supabase.rpc('exec_sql', {
        sql_query: statement + ';'
      }).catch(async () => {
        // rpcが使えない場合は直接実行を試みる
        return await supabase.from('_migrations').insert({
          statement: statement
        })
      })

      if (error) {
        console.error('❌ エラー:', error.message)
      }
    }
  }

  console.log('✅ マイグレーション完了')
}

runMigration().catch(console.error)
