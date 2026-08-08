-- 通知テーブル
CREATE TABLE IF NOT EXISTS notification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('cancellation', 'new_reservation')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  reservation_id UUID REFERENCES reservation(id) ON DELETE SET NULL,
  reservation_number TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_notification_is_read ON notification(is_read);
CREATE INDEX IF NOT EXISTS idx_notification_created_at ON notification(created_at DESC);

-- RLS有効化
ALTER TABLE notification ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all notification" ON notification FOR ALL USING (true) WITH CHECK (true);
