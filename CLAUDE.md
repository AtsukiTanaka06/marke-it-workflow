# MArKE-IT Workflow — 引継ぎドキュメント

> このファイルは Claude Code が起動時に自動で読み込む作業引継書です。
> 作業が進んだら「実装状況」セクションを必ず更新してください。

---

## プロジェクト概要

Notion DB をバックエンドとした案件・受注管理 Web アプリケーション。
詳細は `Requirement.md`（要件定義）・`Plan.md`（実装計画）を参照。

| 項目 | 内容 |
|---|---|
| フレームワーク | Next.js 16.2.1 (App Router) / React 19.2.4 |
| UI | shadcn/ui + Tailwind CSS v4 |
| 認証・DB | Supabase |
| データ | Notion API |
| ホスティング | Vercel（予定） |
| コード場所 | `web/` ディレクトリ |
| 環境変数 | `web/.env.local`（git 管理外） |
| アカウント情報 | `.AccountInfo`（git 管理外・絶対に公開しない） |

---

## 実装状況

### ✅ Phase 0: プロジェクト基盤構築（完了）

- [x] Next.js 15 + Tailwind CSS v4 + shadcn/ui 初期化
- [x] `lib/supabase/` 4ファイル（client / server / middleware / admin）
- [x] `src/middleware.ts` Route Guard（未ログイン → /login）
- [x] `types/supabase.ts` 型定義（profiles / system_settings / ai_api_keys）
- [x] `web/.env.local` 環境変数設定済み

### ✅ Supabase DB セットアップ（完了）

以下の SQL を Supabase SQL Editor で実行済み（要確認）：
- [x] `profiles` / `system_settings` / `ai_api_keys` テーブル作成
- [x] `handle_new_user()` トリガー（初回登録ユーザーを admin に自動設定）
- [x] `handle_updated_at()` トリガー（updated_at 自動更新）
- [x] RLS ポリシー全テーブルに設定
- [x] `system_settings` 初期レコード挿入

> **未確認の場合**: Supabase ダッシュボード → SQL Editor で `Plan.md` のフェーズ依存関係図を参照し、上記 SQL を実行すること

---

### ✅ Phase 1: 認証フロー（完了）

- [x] `app/(auth)/layout.tsx` — 認証ページ共通レイアウト
- [x] `app/(auth)/login/page.tsx` — メール+パスワードログイン（招待制・Google OAuth 無効化済み）
- [x] `app/(auth)/invite/page.tsx` — 招待トークン検証 + パスワード設定
- [x] `app/(auth)/forgot-password/page.tsx` — パスワードリセットメール送信
- [x] `app/(auth)/reset-password/page.tsx` — リセットトークン検証 + 新パスワード設定
- [x] `app/api/auth/callback/route.ts` — OAuth コールバック（code → session 交換）
- [x] `app/api/admin/invite/route.ts` — 管理者専用ユーザー招待 API（メール招待、現在は未使用）
- [x] `app/api/admin/users/route.ts` — 管理者専用ユーザー作成 API（初期パスワード自動生成）
- [x] `app/api/settings/password/route.ts` — ユーザー自身のパスワード変更 API

---

### ✅ Phase 2: 共通レイアウト（完了）

- [x] `app/(dashboard)/layout.tsx` — サイドバーが画面全高を占める `flex` 構造（`<Sidebar />` が `<Header />` の外側）
- [x] `components/layout/Header.tsx` — アバター・表示名・ドロップダウン（設定・ログアウト）
- [x] `components/layout/Sidebar.tsx` — 案件一覧・受注一覧ナビゲーション（アクティブ状態・左端アクセントバー付き）
- [x] `app/(dashboard)/projects/page.tsx` — 案件一覧ページ
- [x] `app/(dashboard)/orders/page.tsx` — 受注一覧ページ
- [x] `app/(dashboard)/settings/page.tsx` — 設定ページ
- [x] `app/page.tsx` — `/projects` へリダイレクト

---

### ✅ Phase 3: 暗号化基盤 + Notion クライアント（完了）

- [x] `lib/crypto.ts` — AES-GCM 256bit 暗号化・復号
- [x] `lib/notion/rate-limit.ts` — p-limit(3) + p-retry
- [x] `lib/notion/client.ts` — Supabase から Token 取得・復号・Notion Client 初期化（unstable_cache）
- [x] `lib/notion/projects.ts` — 案件 DB CRUD アダプター（プロパティ ID ベースアクセス）
- [x] `lib/notion/orders.ts` — 受注 DB CRUD アダプター
- [x] `types/notion.ts` — 正規化型定義

> **Notion SDK v5 の注意点**: `databases.query` は廃止。`dataSources.query({ data_source_id })` を使う。
> - 案件 data_source_id: `19d9707a-4e5d-81f1-9897-000b9e734139`
> - 受注 data_source_id: `1a49707a-4e5d-81ef-acaa-000b9e67f97c`
> **プロパティ ID の注意点**: Notion API が返すプロパティ ID は特殊文字が URL エンコードされる（例: `>` → `%3E`, `|` → `%7C`, `\` → `%5C`, `=` → `%3D`, `{` → `%7B`, `;` → `%3B`, `]` → `%5D`, `}` → `%7D`）。`/api/notion/orders/{id}` の `_debug_propIds` で実際の ID を確認すること。

---

### ✅ Phase 4: 案件一覧・詳細（完了）

- [x] `system_settings.notion_token_encrypted` に暗号化済み Notion Token を保存
- [x] `store/filterStore.ts` — Zustand フィルター + カーソルスタック
- [x] `app/api/notion/projects/route.ts` — GET (一覧) / POST (作成)
- [x] `app/api/notion/projects/[id]/route.ts` — GET (詳細) / PATCH (更新)
- [x] `components/projects/ProjectsView.tsx` — Client Component メインコンテナ
- [x] `components/projects/ProjectCard.tsx` — カードコンポーネント（ステータスバッジ色付き・`React.memo` 適用済み）
- [x] `components/projects/ProjectFilters.tsx` — 検索・進捗・種別フィルター（検索入力に 300ms デバウンス済み）
- [x] `components/projects/Pagination.tsx` — カーソルベースページネーション
- [x] `components/projects/ProjectCreateModal.tsx` — 新規作成ダイアログ（`next/dynamic` で遅延ロード）
- [x] `components/projects/ProjectsView.tsx` — モーダルを dynamic import で遅延ロード
- [x] `app/(dashboard)/projects/page.tsx` — 案件一覧ページ
- [x] `app/(dashboard)/projects/[id]/page.tsx` — 案件詳細（Server Component）
- [x] `app/(dashboard)/projects/[id]/ProjectEditForm.tsx` — 編集フォーム

> **base-ui 注意点**: `DialogTrigger` は `asChild` 非対応。`render={<Button />}` プロップを使う。
> **Select 注意点**: `onValueChange` の引数は `unknown` → `as string` キャストが必要。
> **Select controlled 注意点**: フィルターリセット時は `key` プロップで強制再マウントする。
> **パフォーマンス対策**: カードに `React.memo`、検索に debounce(300ms)、モーダルに `next/dynamic`（ssr:false）を適用。

---

### ✅ Phase 5: 受注一覧・詳細（完了）

- [x] `store/orderFilterStore.ts` — Zustand フィルター + カーソルスタック（受注専用）
- [x] `app/api/notion/orders/route.ts` — GET (一覧) / POST (作成)
- [x] `app/api/notion/orders/[id]/route.ts` — GET (詳細) / PATCH (更新)
- [x] `components/orders/OrdersView.tsx` — Client Component メインコンテナ
- [x] `components/orders/OrderCard.tsx` — カードコンポーネント（ステータスバッジ色付き・`React.memo` 適用済み）
- [x] `components/orders/OrderFilters.tsx` — 検索・進捗・運用進捗フィルター（検索入力に 300ms デバウンス済み）
- [x] `components/orders/OrderCreateModal.tsx` — 新規作成ダイアログ（`next/dynamic` で遅延ロード・ドキュメント差し込みフィールド付き）
- [x] `components/orders/OrdersView.tsx` — モーダルを dynamic import で遅延ロード
- [x] `app/(dashboard)/orders/page.tsx` — 受注一覧ページ
- [x] `app/(dashboard)/orders/[id]/page.tsx` — 受注詳細（Server Component）
- [x] `app/(dashboard)/orders/[id]/OrderEditForm.tsx` — 編集フォーム
- [x] `app/(dashboard)/orders/[id]/OrderDetailTabs.tsx` — タブ切り替え（受注情報 / コンテンツ作成）
- [x] `components/projects/Pagination.tsx` — `PaginationUI` をエクスポート（受注でも再利用）

---

### ✅ Phase 6: 設定画面（完了）

- [x] `app/api/settings/profile/route.ts` — GET/PATCH プロフィール
- [x] `app/api/settings/password/route.ts` — PATCH パスワード変更（ポリシー検証付き）
- [x] `app/api/settings/users/route.ts` — GET ユーザー一覧（admin専用）
- [x] `app/api/settings/users/[id]/route.ts` — PATCH ロール変更（admin専用）
- [x] `app/api/settings/notion/route.ts` — GET/PATCH Notionトークン（admin専用）
- [x] `app/api/settings/notion-users/route.ts` — GET/POST Notion ユーザー登録（admin専用）
- [x] `app/api/settings/notion-users/[id]/route.ts` — DELETE Notion ユーザー削除（admin専用）
- [x] `app/api/settings/notion-users/workspace/route.ts` — GET Notion ワークスペースメンバー取得（admin専用）
- [x] `app/api/settings/ai/route.ts` — GET/PATCH AI設定（admin専用）
- [x] `components/settings/ProfileSection.tsx` — 表示名・アバターURL変更 + パスワード変更フォーム
- [x] `components/settings/UserManagementSection.tsx` — ユーザー作成（初期パスワード自動生成・表示）・ロール変更
- [x] `components/settings/NotionSettingsSection.tsx` — Notionトークン保存・状態表示
- [x] `components/settings/NotionUsersSection.tsx` — Notion ユーザー登録管理（担当者ピッカー用）
- [x] `components/settings/AISettingsSection.tsx` — プロバイダー選択・APIキー登録
- [x] `app/(dashboard)/settings/SettingsView.tsx` — タブナビ付き設定ビュー（プロフィール / ユーザー管理 / Notion連携 / ユーザー登録 / AI設定 / Google Drive連携）
- [x] `app/(dashboard)/settings/page.tsx` — 設定ページ（Server Component）
- [x] `types/supabase.ts` — 各テーブルに `Relationships: []` 追加 + `notion_users` テーブル型定義

> **Supabase型推論の注意点**: `@supabase/postgrest-js` v2系は各テーブルに `Relationships: []` フィールドが必須。ないと型が `never` になる。
> **Next.js 16 revalidateTag**: 第2引数 `profile` が必須 → `revalidateTag('tag', {})` で空プロファイルを渡す。
> **パスワードポリシー**: 8文字以上・大文字（A-Z）・小文字（a-z）・数字（0-9）を各1文字以上。クライアント（Zod）とサーバー（API route）の両方で検証。
> **ユーザー作成フロー**: 管理者が `/api/admin/users` で作成 → 自動生成パスワードをモーダルに表示 → ユーザーが初回ログイン後にパスワード変更。招待メール方式（`/api/admin/invite`）は未使用。

---

### ✅ Phase 6.5: Google Drive / Docs 連携拡張（完了）

- [x] `lib/google/drive.ts` — `getDocsClient()` 追加（Google Docs API v1 用 OAuth クライアント）
- [x] `lib/google/drive.ts` — `copyFolderRecursive` に `replacements` 対応（Google ドキュメントコピー後に `replaceAllText` で差し込み）
- [x] `lib/google/drive.ts` — `copyTemplateFolder` に `replacements?: Record<string, string>` パラメータ追加
- [x] `app/api/notion/orders/route.ts` — `docReplacements` を受け取り `copyTemplateFolder` に渡す
- [x] `components/orders/OrderCreateModal.tsx` — テンプレートフォルダ選択時に差し込みフィールド表示（`{{顧客名}}`・`{{LStep構築費用}}`）、案件選択で `{{顧客名}}` を自動入力

> **プレースホルダー規則**: テンプレートドキュメント内に `{{顧客名}}` / `{{LStep構築費用}}` を記述しておく。Google ドキュメント（MIME: `application/vnd.google-apps.document`）のみ置換対象。スプレッドシート・スライドは別途 Sheets/Slides API が必要。
> **Google Cloud Console 設定**: Google Docs API を有効化すること（Drive API と同じプロジェクトで有効化）。
> **削除済み**: `lib/notion/template-blocks.ts`（Notion デフォルトテンプレート適用処理）を削除。`projects.ts` / `orders.ts` からの `applyDefaultTemplate` 呼び出しも削除済み。

---

### 🔲 Phase 7: 品質・仕上げ・Vercel デプロイ（**次の作業**）

#### 機能実装の残件

- [ ] **「コンテンツ作成」タブの実装**（`app/(dashboard)/orders/[id]/OrderDetailTabs.tsx`）
  - 現在はプレースホルダー表示のみ（「コンテンツ作成機能は今後実装予定です。」）
  - 要件は `Requirement.md` を参照して実装内容を確定すること

#### 品質・仕上げ

- [ ] TypeScript 型エラーの最終チェック（`npm run build` でビルドが通ることを確認）
- [ ] 主要フローの動作確認（ローカル）
  - ログイン / パスワードリセット
  - 案件・受注の CRUD
  - Google Drive フォルダコピー + ドキュメント置換

#### Vercel デプロイ

- [ ] 本番環境移行チェックリスト（下記）をすべて完了させてからデプロイ

---

## 🚀 本番環境移行チェックリスト

> Vercel へデプロイする前・後に必ず確認すること。
> `<vercel-url>` は実際のデプロイ URL に置き換える。

### Supabase ダッシュボード設定

#### Authentication → URL Configuration
- [ ] **Site URL** を本番 URL に変更
  - `https://<vercel-url>`
- [ ] **Additional Redirect URLs** に以下をすべて追加
  - `http://localhost:3000/invite`（開発用）
  - `http://localhost:3000/reset-password`（開発用）
  - `https://<vercel-url>/invite`
  - `https://<vercel-url>/reset-password`

#### Authentication → Providers
- [ ] **Google** プロバイダーが**無効**になっていることを確認（メール招待制のため）
- [ ] **Email** プロバイダーが有効になっていることを確認

#### Authentication → Email Templates
- [ ] **Reset Password** テンプレートのリンク URL が `/reset-password` を向いていることを確認
  - デフォルトの `{{ .ConfirmationURL }}` は Site URL + `/reset-password?token_hash=...&type=recovery` を生成する
- [ ] 必要に応じてメール件名・本文を日本語に変更
  - Reset Password: 件名 `パスワードリセットのご案内`

#### Authentication → Sign In / Sign Up（任意・推奨）
- [ ] **"Allow new users to sign up"** を**無効化**（管理者によるユーザー作成のみを許可）
  - Supabase ダッシュボード → Authentication → Sign In/Up → "Allow new users to sign up" を OFF

#### Google Cloud Console → API の有効化
- [ ] **Google Drive API** が有効になっていることを確認
- [x] **Google Docs API** を有効化（ドキュメント内プレースホルダー置換に必要）✅ 有効化済み

#### Database → `notion_users` テーブル
- [ ] SQL Editor で `notion_users` テーブルが作成済みか確認
  ```sql
  create table if not exists notion_users (
    notion_user_id text primary key,
    name           text not null,
    avatar_url     text,
    created_at     timestamptz default now()
  );
  alter table notion_users enable row level security;
  create policy "認証済みユーザーのみ参照可" on notion_users
    for select using (auth.role() = 'authenticated');
  create policy "管理者のみ編集可" on notion_users
    for all using (
      exists (select 1 from profiles where id = auth.uid() and role = 'admin')
    );
  ```

---

### Vercel 環境変数設定

- [ ] 以下の環境変数を Vercel プロジェクト設定 → Environment Variables に登録
  | 変数名 | 説明 |
  |---|---|
  | `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL |
  | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
  | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key（サーバー専用） |
  | `ENCRYPTION_KEY` | AES-GCM 暗号化キー（**既存値と必ず同じにする**） |
  | `GOOGLE_CLIENT_EMAIL` | Google Drive API サービスアカウント |
  | `GOOGLE_PRIVATE_KEY` | Google Drive API 秘密鍵 |
  | `GOOGLE_DRIVE_TEMPLATE_FOLDER_ID` | テンプレートフォルダ ID |

---

### デプロイ後の動作確認

- [ ] ログイン画面が表示される（未ログイン時）
- [ ] 管理者アカウントでログイン → 設定 → ユーザー管理 → ユーザー追加が動作する
- [ ] 追加したユーザーが初期パスワードでログインできる
- [ ] ログイン後にパスワード変更が動作する
- [ ] ログイン画面の「パスワードをお忘れの方」→ メール受信 → リセット完了まで動作する
- [ ] 案件一覧・受注一覧が Notion データを正しく取得・表示する
- [ ] Google Drive へのフォルダコピーが動作する
- [ ] コピーされた Google ドキュメント内の `{{顧客名}}` / `{{LStep構築費用}}` が正しく置換される

---

## Notion DB 情報

| DB 名 | DB ID |
|---|---|
| 案件一覧 DB | `19d9707a-4e5d-800d-a40f-dec078f895df` |
| 受注一覧 DB | `1a49707a-4e5d-80b0-89b5-e9960da11e2f` |

---

## 重要ルール

- `lib/supabase/admin.ts` は Route Handler 専用。クライアントから import しない
- Route Handler では必ず `supabase.auth.getUser()` で認証確認（`getSession()` は使わない）
- `/api/admin/*` と `/api/settings/*` では必ずロール確認（admin でなければ 403）
- `ENCRYPTION_KEY` は変更すると既存暗号化データが復号不能になる。変更厳禁
