# キャンセル履歴機能 マイグレーションガイド

## 概要
サロン都合・モデル都合のキャンセル履歴を管理できる機能を追加しました。

## 新機能
1. **キャンセル時に理由を選択**
   - サロン都合（研修生都合・店舗都合など）
   - モデル都合（お客様のキャンセル）
   - 補足メモも保存可能

2. **キャンセル履歴画面**
   - 統計表示（総数・サロン都合・モデル都合）
   - フィルタ機能（種別・期間）
   - 詳細な履歴テーブル

## マイグレーション手順

### 1. Supabaseダッシュボードでマイグレーション実行

1. Supabaseダッシュボードにアクセス
   https://app.supabase.com/project/zuidgnuqsogpfwrlvtui

2. 左メニュー「SQL Editor」をクリック

3. 「New Query」をクリック

4. 以下のSQLを実行:

```sql
-- キャンセル履歴テーブル追加
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

CREATE INDEX IF NOT EXISTS idx_cancellation_history_date ON cancellation_history(date);
CREATE INDEX IF NOT EXISTS idx_cancellation_history_cancelled_by ON cancellation_history(cancelled_by);

ALTER TABLE cancellation_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all cancellation_history" ON cancellation_history FOR ALL USING (true) WITH CHECK (true);
```

5. 「Run」をクリックして実行

### 2. デプロイ

```bash
cd ~/training-reservation-v2
git add .
git commit -m "feat: キャンセル履歴機能を追加（サロン都合・モデル都合管理）"
git push origin main
```

Vercelが自動的にデプロイします。

### 3. 動作確認

1. 管理画面トップ（https://training-reservation-v2.vercel.app/admin）にアクセス
2. 新しく追加された「キャンセル履歴」カードをクリック
3. 既存の予約をキャンセルして履歴が保存されるか確認

## データベース構造

### cancellation_history テーブル

| カラム名 | 型 | 説明 |
|---|---|---|
| id | UUID | 主キー |
| reservation_id | UUID | 元の予約ID（削除されるとNULL） |
| reservation_number | TEXT | 予約番号 |
| trainee_id | UUID | 研修生ID（削除されるとNULL） |
| trainee_name | TEXT | 研修生名（スナップショット） |
| menu_name | TEXT | メニュー名（スナップショット） |
| date | DATE | 予約日 |
| start_time | TIME | 開始時刻 |
| end_time | TIME | 終了時刻 |
| customer_name | TEXT | お客様名 |
| customer_phone | TEXT | 電話番号 |
| customer_email | TEXT | メールアドレス |
| cancelled_by | TEXT | `'salon'` or `'customer'` |
| cancelled_at | TIMESTAMPTZ | キャンセル日時 |
| cancellation_reason | TEXT | キャンセル理由（任意） |
| original_created_at | TIMESTAMPTZ | 元の予約作成日時 |

## ロールバック（元に戻す）

もし問題があった場合、以下のSQLで削除できます:

```sql
DROP TABLE IF EXISTS cancellation_history CASCADE;
```
