# Slack通知設定手順

## ステップ1: Slackアプリを作成

1. https://api.slack.com/apps にアクセス
2. **「Create New App」** をクリック
3. **「From scratch」** を選択
4. 以下を入力：
   - App Name: `研修予約通知`
   - Pick a workspace: 通知を送りたいSlackワークスペースを選択
5. **「Create App」** をクリック

---

## ステップ2: Incoming Webhooksを有効化

1. 左メニューから **「Incoming Webhooks」** をクリック
2. 右上のトグルを **「On」** にする
3. 下にスクロールして **「Add New Webhook to Workspace」** をクリック
4. 通知を送りたいチャンネルを選択（例: #予約通知）
5. **「許可する」** をクリック

---

## ステップ3: Webhook URLをコピー

1. **Webhook URL** が表示されます（例: `https://hooks.slack.com/services/...`）
2. この **Webhook URL全体をコピー**してください

---

## ステップ4: VercelにWebhook URLを設定

ターミナルで以下のコマンドを実行：

```bash
cd ~/training-reservation-v2
vercel env add SLACK_WEBHOOK_URL production
```

実行すると以下を聞かれます：

1. **"What's the value of SLACK_WEBHOOK_URL?"**
   → コピーしたWebhook URLを貼り付け

2. **"Which Environments?"**
   → `Production` を選択（スペースキーで選択、Enterで確定）

---

## ステップ5: 再デプロイ

```bash
vercel --prod
```

---

## ✅ 完了

これで予約が入ると、Slackの指定したチャンネルに通知が届きます！

### 通知内容:
- 🔔 新規予約が入りました
- 予約番号
- 日時
- 研修生
- メニュー
- お客様名
- 電話番号
- 📋 予約管理画面を開くボタン

---

## 💡 ヒント

### 複数のチャンネルに通知したい場合:
1. ステップ2で複数のWebhookを作成
2. 各チャンネル用のWebhook URLを取得
3. 現在は1つのチャンネルのみ対応

### 通知先チャンネルを変更したい場合:
1. Slackアプリ管理画面の「Incoming Webhooks」
2. 既存のWebhookを削除
3. 新しいチャンネルでWebhookを追加
4. 新しいWebhook URLをVercelに設定
