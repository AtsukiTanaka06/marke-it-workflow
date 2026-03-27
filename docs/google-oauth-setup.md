# Google OAuth 設定手順（Supabase 連携）

このプロジェクトの Supabase プロジェクト ID: `bnlzclhfhvbdwycahikl`

---

## Step 1: Google Cloud Console でプロジェクト作成

1. https://console.cloud.google.com/ にアクセス
2. 上部のプロジェクト選択 → **「新しいプロジェクト」**
3. プロジェクト名を入力 → **作成**

---

## Step 2: OAuth 同意画面の設定

1. 左メニュー → **「APIとサービス」→「OAuth同意画面」**
2. User Type: **「外部」** → **作成**
3. 以下を入力：
   - アプリ名: `MArKE-IT Workflow`
   - ユーザーサポートメール: 自分のメールアドレス
   - デベロッパーの連絡先: 自分のメールアドレス
4. **「保存して次へ」** を3回押して完了

---

## Step 3: OAuth クライアント ID の作成

1. 左メニュー → **「APIとサービス」→「認証情報」**
2. **「認証情報を作成」→「OAuth クライアント ID」**
3. アプリケーションの種類: **「ウェブ アプリケーション」**
4. 名前: `MArKE-IT Workflow`（任意）
5. **「承認済みのリダイレクト URI」** に以下を追加：

   ```
   https://bnlzclhfhvbdwycahikl.supabase.co/auth/v1/callback
   ```

   > 本番環境（Vercel）にデプロイ後、Vercel の URL も追加すること（Supabase 側の設定は不要、Google 側のみ）

6. **「作成」** をクリック → クライアント ID とクライアントシークレットをコピー

---

## Step 4: Supabase に設定

1. Supabase ダッシュボード → **Authentication → Providers → Google**
2. 以下を入力して保存：
   - **Client ID**: Google で発行されたクライアント ID
   - **Client Secret**: Google で発行されたクライアントシークレット

---

## Step 5: Supabase の Redirect URL 設定

1. Supabase ダッシュボード → **Authentication → URL Configuration**
2. **Additional Redirect URLs** に以下を追加：

   ```
   http://localhost:3000/invite
   ```

   > 本番デプロイ後: `https://<vercel-url>/invite` も追加する

---

## 動作フロー

```
ユーザー
  → Googleログインボタンクリック
  → supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: '/api/auth/callback' })
  → Google 認証画面
  → Supabase コールバック (supabase.co/auth/v1/callback)
  → アプリのコールバック (/api/auth/callback?code=xxx)
  → supabase.auth.exchangeCodeForSession(code)
  → /projects にリダイレクト
```

---

## トラブルシューティング

| 症状 | 原因 | 対処 |
|---|---|---|
| `redirect_uri_mismatch` エラー | Google Console のリダイレクト URI が未登録 | Step 3-5 の URI を追加 |
| ログイン後に `/login` に戻る | Supabase の Redirect URL 未設定 | Step 5 を確認 |
| `profiles` レコードが作成されない | DB トリガー未設定 | Supabase SQL Editor で `handle_new_user` トリガーを確認 |
