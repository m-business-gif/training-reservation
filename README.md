# 研修予約システム v2

研修生のシフト管理と予約受付を一元管理するWebアプリケーション

## 🌟 主な機能

### お客様向け機能
- ✅ 5ステップの簡単予約フォーム
- ✅ 予約番号による予約確認・キャンセル
- ✅ スマホ対応レスポンシブデザイン
- ✅ リアルタイムで予約可能時間を表示

### 管理者向け機能
- 📅 HOT PEPPER風月間シフトカレンダー
- 📋 タイムライン予約管理
- 👥 研修生・メニューマスタ管理
- ➕ 手動予約追加機能
- 🔍 予約詳細確認・キャンセル

## 🚀 クイックスタート

### 1. アクセスURL

**お客様用:**
```
https://training-reservation-v2.vercel.app
```

**管理画面:**
```
https://training-reservation-v2.vercel.app/admin
```

### 2. 初期セットアップ

1. **Supabaseでデータベース準備**
   - SQL Editorで `supabase/schema.sql` を実行
   - 予約番号カラムを追加（詳細は[クイックスタートガイド](MANUAL_QUICK_START.md)参照）

2. **研修生を登録**
   - 管理画面 → 基本設定 → 研修生管理

3. **メニューを登録**
   - 管理画面 → 基本設定 → メニュー管理

4. **シフトを設定**
   - 管理画面 → シフト設定 → カレンダーで日付クリック

5. **お客様用URLを共有**

詳細は **[クイックスタートガイド](MANUAL_QUICK_START.md)** をご覧ください。

## 📚 マニュアル

- **[クイックスタートガイド](MANUAL_QUICK_START.md)** - 5分で始める初期セットアップ
- **[お客様用マニュアル](MANUAL_CUSTOMER.md)** - 予約方法・キャンセル方法
- **[管理者用マニュアル](MANUAL_ADMIN.md)** - シフト設定・予約管理の詳細

## 🛠️ 技術スタック

- **フレームワーク:** Next.js 16.2.10 (App Router + Turbopack)
- **データベース:** Supabase PostgreSQL
- **スタイリング:** Tailwind CSS
- **デプロイ:** Vercel
- **言語:** TypeScript

## 📁 プロジェクト構成

```
training-reservation-v2/
├── app/
│   ├── page.tsx                    # お客様用トップページ
│   ├── booking/                    # 新規予約フォーム
│   ├── my-reservation/             # 予約確認・キャンセル
│   └── admin/
│       ├── page.tsx                # 管理画面トップ
│       ├── shifts/                 # シフト設定
│       ├── reservations/           # 予約管理
│       └── settings/               # 基本設定
├── lib/
│   └── supabase.ts                 # Supabaseクライアント
├── types/
│   └── database.ts                 # 型定義
├── supabase/
│   └── schema.sql                  # データベーススキーマ
├── MANUAL_QUICK_START.md           # クイックスタート
├── MANUAL_CUSTOMER.md              # お客様用マニュアル
└── MANUAL_ADMIN.md                 # 管理者用マニュアル
```

## 🗄️ データベース構造

### 主要テーブル

| テーブル名 | 説明 |
|---|---|
| `trainee` | 研修生マスタ |
| `menu` | メニューマスタ |
| `shift` | シフト設定（JSONB形式で時間枠を管理） |
| `reservation` | 予約データ（予約番号含む） |
| `settings` | システム設定 |

詳細は `supabase/schema.sql` を参照してください。

## 🔐 環境変数

`.env.local` に以下を設定：

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 🚢 デプロイ

### Vercelへのデプロイ

```bash
vercel --prod
```

### 環境変数の設定
Vercelダッシュボードで上記の環境変数を設定してください。

## 📱 スマホ対応

全ページでレスポンシブデザイン対応済み
- Tailwind CSS の `sm:` ブレークポイント（640px以上）を使用
- タッチ操作に最適化（`active:` 疑似クラス）
- 見やすいフォントサイズ・余白調整

## 🎨 デザインコンセプト

- **シンプル:** 直感的に操作できるUI
- **サロンボード風:** 業界標準のデザインに近い見た目
- **スマホファースト:** お客様の多くはスマホからアクセス

## ⚠️ 注意事項

### 研修生・メニューの削除
- 過去の予約データに影響する可能性があります
- 削除ではなく「非表示」を推奨（メニューのみ対応済み）

### 予約番号
- 予約完了時に表示される8桁の番号
- 予約確認・キャンセルに必須
- お客様に必ず伝えてください

### メール機能
- 現在、メール通知機能は無効化されています
- ドメイン認証が必要なため

## 🔄 今後の拡張案

- [ ] 予約リマインダー機能（LINE通知）
- [ ] 複数店舗対応
- [ ] 売上レポート機能
- [ ] お客様履歴管理
- [ ] 研修生の非アクティブ化機能

## 📞 サポート

システムに関するご質問は開発担当者までお問い合わせください。

---

## 📄 ライセンス

このプロジェクトは内部利用を目的としています。

## 👨‍💻 開発者

Developed with Claude Code (Anthropic)

---

**最終更新:** 2026年7月2日  
**バージョン:** 2.0.0
