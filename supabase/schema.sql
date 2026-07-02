-- 研修予約システム v2 - シンプル設計

-- 1. 研修生テーブル
CREATE TABLE IF NOT EXISTS trainee (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT CHECK (brand IN ('most_eyes', 'ssin_studio', 'lumiss')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. メニューテーブル
CREATE TABLE IF NOT EXISTS menu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  color TEXT DEFAULT '#6366f1',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. シフト設定テーブル（研修生ごと・日ごと）
CREATE TABLE IF NOT EXISTS shift (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id UUID NOT NULL REFERENCES trainee(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time_slots JSONB DEFAULT '[]'::jsonb,
  -- time_slots 構造例:
  -- [
  --   {
  --     "start_time": "10:00",
  --     "end_time": "13:00",
  --     "menu_ids": ["menu-uuid-1", "menu-uuid-2"],
  --     "available_times": ["10:00", "11:00", "12:00"],
  --     "blocked_times": ["11:30"]  -- 予約不可時間
  --   }
  -- ]
  break_start TIME,
  break_end TIME,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trainee_id, date)
);

-- 4. 予約テーブル
CREATE TABLE IF NOT EXISTS reservation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id UUID NOT NULL REFERENCES trainee(id),
  menu_id UUID NOT NULL REFERENCES menu(id),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ
);

-- 5. システム設定テーブル
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_shift_trainee_date ON shift(trainee_id, date);
CREATE INDEX IF NOT EXISTS idx_reservation_trainee_date ON reservation(trainee_id, date);
CREATE INDEX IF NOT EXISTS idx_reservation_status ON reservation(status);

-- RLS有効化
ALTER TABLE trainee ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation ENABLE ROW LEVEL SECURITY;

-- 全データ公開（認証なし）
CREATE POLICY "Allow all trainee" ON trainee FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all menu" ON menu FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all shift" ON shift FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all reservation" ON reservation FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all settings" ON settings FOR ALL USING (true) WITH CHECK (true);
