# Google Drive 連携 セットアップ手順

> 受注新規作成時のフォルダ自動コピー機能を有効にするための手順です。
> 作業には Google Cloud Console への管理者アクセスが必要です。

---

## 1. Google Cloud でプロジェクトを準備する

1. [Google Cloud Console](https://console.cloud.google.com/) を開く
2. 対象プロジェクトを選択（なければ新規作成）

---

## 2. Google Drive API を有効化する

1. 左メニュー → **「APIとサービス」→「ライブラリ」**
2. 「Google Drive API」を検索 → **「有効にする」**

> または以下の URL で直接有効化できます（`PROJECT_ID` は Cloud Console 上部のプロジェクト ID に置き換え）：
> `https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=PROJECT_ID`

> **注意**: 有効化後、反映まで 1〜2 分かかる場合があります。

---

## 3. OAuth 同意画面を設定する

1. 左メニュー → **「APIとサービス」→「OAuth 同意画面」**
2. ユーザーの種類: **「外部」** を選択 → 「作成」
3. アプリ名（例: `MArKE-IT Workflow`）・サポートメールを入力 → 「保存して次へ」
4. スコープ設定はそのまま → 「保存して次へ」
5. **「テストユーザー」** セクション → **「+ ADD USERS」** → 認可に使う Google アカウントのメールアドレスを追加 → 「保存して次へ」

> テストユーザーに追加することで、Google 審査完了前でも警告なしに認可できます。

---

## 4. OAuth 2.0 クライアント ID を作成する

1. 左メニュー → **「APIとサービス」→「認証情報」**
2. **「認証情報を作成」→「OAuth 2.0 クライアント ID」**
3. アプリケーションの種類: **「ウェブ アプリケーション」**
4. **「承認済みのリダイレクト URI」** に以下を追加：
   - `http://localhost:3000/api/auth/google/callback`（開発環境）
   - `https://<vercel-url>/api/auth/google/callback`（本番・デプロイ後）
5. 「作成」→ **クライアント ID** と **クライアント シークレット** をコピー

---

## 5. Google Drive フォルダを共有する

テンプレートドライブ・作業ドライブの **両フォルダ** に対して以下を実施：

1. Google Drive でフォルダを右クリック → **「共有」**
2. 認可に使う Google アカウントのメールアドレスを入力
3. 権限を **「編集者」** に設定 → 「送信」

---

## 6. フォルダ ID を確認する

Google Drive のフォルダを開いたときの URL から確認します：

```
https://drive.google.com/drive/folders/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
                                        ↑ これがフォルダ ID
```

テンプレートドライブ・作業ドライブそれぞれのフォルダ ID をメモしておきます。

---

## 7. Supabase に列を追加する（初回のみ）

Supabase ダッシュボード → **SQL Editor** で以下を実行：

```sql
ALTER TABLE system_settings
  ADD COLUMN IF NOT EXISTS google_oauth_client_id TEXT,
  ADD COLUMN IF NOT EXISTS google_oauth_client_secret_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS google_oauth_refresh_token_encrypted TEXT;
```

---

## 8. アプリに設定を保存して認可する

1. アプリに **admin アカウント** でログイン
2. 右上メニュー → **「設定」**
3. **「Google Drive 連携」** タブを開く
4. 以下を入力して **「保存」**：

| 項目 | 入力値 |
|---|---|
| テンプレートドライブ フォルダ ID | 手順 6 で確認した ID |
| 作業ドライブ フォルダ ID | 手順 6 で確認した ID |
| クライアント ID | 手順 4 で取得したクライアント ID |
| クライアント シークレット | 手順 4 で取得したクライアント シークレット |

5. **「Google アカウントで認可」** ボタンをクリック
6. Google アカウントを選択して「許可」
7. 設定画面に戻り **「認可済み」** と表示されれば完了

---

## 動作確認

1. 受注一覧 → **「新規作成」**
2. 「ワークフローを作成する」チェックが ON の状態で案件・受注項目名を入力
3. **「テンプレートフォルダ」** のドロップダウンにフォルダ一覧が表示されることを確認
4. フォルダを選択して「作成」
5. 作業ドライブに `yyyymmdd_受注名_フォルダ名` のフォルダとその中身のファイルがコピーされていることを確認
6. Notion 受注一覧 DB の「GoogleドライブURL」プロパティにリンクが設定されていることを確認

---

## トラブルシューティング

| 症状 | 原因 / 対処 |
|---|---|
| 保存時に 500 エラー | Supabase の SQL（手順 7）が未実行 |
| フォルダ一覧が表示されない | 認可未完了、またはテンプレートフォルダ ID が未設定 |
| 「アクセスをブロック」画面が表示される | OAuth 同意画面のテストユーザーに自分のメールを追加する（手順 3）|
| "権限がありません" エラー | 認可アカウントがフォルダに共有されていない（手順 5）|
| "Google Drive API が無効" エラー | Google Cloud で Drive API を有効化する（手順 2）|
| フォルダはコピーされるが中身がない | 認可アカウントがテンプレートフォルダのメンバーになっていない（手順 5）|
| "storage quota has been exceeded" エラー | 認可アカウントの Drive 容量が不足している |
