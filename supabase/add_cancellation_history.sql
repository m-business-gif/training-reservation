-- キャンセル履歴テーブル追加マイグレーション

-- テーブル作成
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

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_cancellation_history_date ON cancellation_history(date);
CREATE INDEX IF NOT EXISTS idx_cancellation_history_cancelled_by ON cancellation_history(cancelled_by);

-- RLS設定
ALTER TABLE cancellation_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all cancellation_history" ON cancellation_history FOR ALL USING (true) WITH CHECK (true);
