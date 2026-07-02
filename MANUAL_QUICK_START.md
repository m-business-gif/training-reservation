# 研修予約システム クイックスタートガイド

## 🚀 初期セットアップ（5分で完了）

### 1. Supabaseでデータベースを準備

**SQL Editorで以下を実行：**
```sql
-- 予約番号カラムを追加
ALTER TABLE reservation ADD COLUMN IF NOT EXISTS reservation_number TEXT UNIQUE;

-- 既存の予約に予約番号を付与
DO $$
DECLARE
  r RECORD;
  new_number TEXT;
BEGIN
  FOR r IN SELECT id FROM reservation WHERE reservation_number IS NULL LOOP
    LOOP
      new_number := LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0');
      BEGIN
        UPDATE reservation SET reservation_number = new_number WHERE id = r.id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        CONTINUE;
      END;
    END LOOP;
  END LOOP;
END $$;
```

---

### 2. 管理画面にアクセス

```
https://training-reservation-v2.vercel.app/admin
```

---

### 3. 研修生を登録

1. 「基本設定」をクリック
2. 「研修生管理」で名前を入力
3. 「追加」ボタンをクリック

**例:**
- 山田 太郎
- 佐藤 花子
- 鈴木 一郎

---

### 4. メニューを登録

1. 同じく「基本設定」画面
2. 「メニュー管理」でメニュー名と所要時間を入力
3. 「追加」ボタンをクリック

**例:**
| メニュー名 | 所要時間 |
|---|---|
| まつげパーマ | 45分 |
| 眉カット | 30分 |
| まつげパーマ＋眉カット | 60分 |

---

### 5. シフトを設定

1. 管理画面トップに戻る
2. 「シフト設定」をクリック
3. カレンダーで日付セルをクリック
4. 「出勤」を選択
5. 時間枠を追加：
   - 開始: 10:00
   - 終了: 18:00
   - メニュー: すべて選択
6. 「保存」をクリック

**ポイント:**
- 予約可能時間が自動生成されます
- 複数の時間枠を設定できます（午前・午後など）

---

### 6. お客様用URLを共有

**管理画面トップの下部に表示されているURLを共有：**
```
https://training-reservation-v2.vercel.app
```

**共有方法:**
- LINE、メール、SNSで送信
- QRコード作成（Google検索: QRコード作成）
- 店舗HPに掲載

---

## ✅ 動作確認

### お客様画面で予約テスト

1. お客様用URLにアクセス
2. 「新規予約」をクリック
3. 予約フローを試す
4. 予約番号をメモ

### 管理画面で確認

1. 「予約管理」をクリック
2. タイムラインに予約が表示されることを確認
3. 予約ブロックをクリックして詳細確認

---

## 📱 日常の使い方

### 毎日やること

**予約管理画面を確認**
- 本日の予約件数・内容を確認
- 予約ブロックをクリックして詳細確認

### 毎月やること

**シフト設定**
- 翌月のシフトをカレンダーに入力
- 研修生ごとの出勤日・時間帯を設定

### 予約変更・キャンセル時

**お客様から連絡があった場合**
1. 予約管理画面を開く
2. 該当の予約をクリック
3. 「この予約をキャンセル」ボタンをクリック

**電話予約を受けた場合**
1. タイムラインの空いているセルをクリック
2. お客様情報を入力
3. 「予約を追加」をクリック
4. 表示された予約番号をお客様に伝える

---

## 🎯 運用のコツ

### ✅ DO（推奨）
- シフトは1ヶ月前に設定
- 予約番号は必ずお客様に伝える
- 毎朝、本日の予約を確認

### ❌ DON'T（非推奨）
- 研修生やメニューの削除（過去の予約に影響）
- 直接データベースを編集（管理画面を使用）
- 予約番号を紛失（再発行不可）

---

## 📞 トラブルシューティング

### 予約が表示されない
→ 日付が正しく選択されているか確認

### お客様が予約できない
→ シフト設定がされているか確認
→ メニューが「表示」になっているか確認

### 予約番号がわからない
→ 予約管理画面から該当の予約を探してクリック

---

## 🔗 リンク集

| 項目 | URL |
|---|---|
| お客様用TOP | https://training-reservation-v2.vercel.app |
| 管理画面TOP | https://training-reservation-v2.vercel.app/admin |
| シフト設定 | https://training-reservation-v2.vercel.app/admin/shifts |
| 予約管理 | https://training-reservation-v2.vercel.app/admin/reservations |
| 基本設定 | https://training-reservation-v2.vercel.app/admin/settings |

---

## 📚 詳細マニュアル

- [お客様用マニュアル](MANUAL_CUSTOMER.md)
- [管理者用マニュアル](MANUAL_ADMIN.md)
