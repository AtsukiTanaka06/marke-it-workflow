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
- [x] `app/(auth)/login/page.tsx` — メール+パスワード + Google OAuth ログイン
- [x] `app/(auth)/invite/page.tsx` — 招待トークン検証 + パスワード設定
- [x] `app/api/auth/callback/route.ts` — OAuth コールバック（code → session 交換）
- [x] `app/api/admin/invite/route.ts` — 管理者専用ユーザー招待 API

#### Supabase ダッシュボードで必要な手動設定（要確認）
- Authentication → URL Configuration → **Additional Redirect URLs** に以下を追加:
  - `http://localhost:3000/invite`（開発）
  - `https://<vercel-url>/invite`（本番・デプロイ後）
- Google OAuth を使う場合は Authentication → Providers → Google を有効化

---

### ✅ Phase 2: 共通レイアウト（完了）

- [x] `app/(dashboard)/layout.tsx` — ヘッダー + サイドバー共通レイアウト（Server Component・認証チェック付き）
- [x] `components/layout/Header.tsx` — アバター・表示名・ドロップダウン（設定・ログアウト）
- [x] `components/layout/Sidebar.tsx` — 案件一覧・受注一覧ナビゲーション（アクティブ状態対応）
- [x] `app/(dashboard)/projects/page.tsx` — プレースホルダー
- [x] `app/(dashboard)/orders/page.tsx` — プレースホルダー
- [x] `app/(dashboard)/settings/page.tsx` — プレースホルダー
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

---

### ✅ Phase 4: 案件一覧・詳細（完了）

- [x] `system_settings.notion_token_encrypted` に暗号化済み Notion Token を保存
- [x] `store/filterStore.ts` — Zustand フィルター + カーソルスタック
- [x] `app/api/notion/projects/route.ts` — GET (一覧) / POST (作成)
- [x] `app/api/notion/projects/[id]/route.ts` — GET (詳細) / PATCH (更新)
- [x] `components/projects/ProjectsView.tsx` — Client Component メインコンテナ
- [x] `components/projects/ProjectCard.tsx` — カードコンポーネント（ステータスバッジ色付き）
- [x] `components/projects/ProjectFilters.tsx` — 検索・進捗・種別フィルター
- [x] `components/projects/Pagination.tsx` — カーソルベースページネーション
- [x] `components/projects/ProjectCreateModal.tsx` — 新規作成ダイアログ
- [x] `app/(dashboard)/projects/page.tsx` — 案件一覧ページ
- [x] `app/(dashboard)/projects/[id]/page.tsx` — 案件詳細（Server Component）
- [x] `app/(dashboard)/projects/[id]/ProjectEditForm.tsx` — 編集フォーム

> **base-ui 注意点**: `DialogTrigger` は `asChild` 非対応。`render={<Button />}` プロップを使う。
> **Select 注意点**: `onValueChange` の引数は `unknown` → `as string` キャストが必要。
> **Select controlled 注意点**: フィルターリセット時は `key` プロップで強制再マウントする。

---

### ✅ Phase 5: 受注一覧・詳細（完了）

- [x] `store/orderFilterStore.ts` — Zustand フィルター + カーソルスタック（受注専用）
- [x] `app/api/notion/orders/route.ts` — GET (一覧) / POST (作成)
- [x] `app/api/notion/orders/[id]/route.ts` — GET (詳細) / PATCH (更新)
- [x] `components/orders/OrdersView.tsx` — Client Component メインコンテナ
- [x] `components/orders/OrderCard.tsx` — カードコンポーネント（ステータスバッジ色付き）
- [x] `components/orders/OrderFilters.tsx` — 検索・進捗・運用進捗フィルター
- [x] `components/orders/OrderCreateModal.tsx` — 新規作成ダイアログ
- [x] `app/(dashboard)/orders/page.tsx` — 受注一覧ページ
- [x] `app/(dashboard)/orders/[id]/page.tsx` — 受注詳細（Server Component）
- [x] `app/(dashboard)/orders/[id]/OrderEditForm.tsx` — 編集フォーム
- [x] `components/projects/Pagination.tsx` — `PaginationUI` をエクスポート（受注でも再利用）

---

### ✅ Phase 6: 設定画面（完了）

- [x] `app/api/settings/profile/route.ts` — GET/PATCH プロフィール
- [x] `app/api/settings/users/route.ts` — GET ユーザー一覧（admin専用）
- [x] `app/api/settings/users/[id]/route.ts` — PATCH ロール変更（admin専用）
- [x] `app/api/settings/notion/route.ts` — GET/PATCH Notionトークン（admin専用）
- [x] `app/api/settings/ai/route.ts` — GET/PATCH AI設定（admin専用）
- [x] `components/settings/ProfileSection.tsx` — 表示名・アバターURL変更
- [x] `components/settings/UserManagementSection.tsx` — ユーザー一覧・招待・ロール変更
- [x] `components/settings/NotionSettingsSection.tsx` — Notionトークン保存・状態表示
- [x] `components/settings/AISettingsSection.tsx` — プロバイダー選択・APIキー登録
- [x] `app/(dashboard)/settings/SettingsView.tsx` — タブナビ付き設定ビュー（Client）
- [x] `app/(dashboard)/settings/page.tsx` — 設定ページ（Server Component）
- [x] `types/supabase.ts` — 各テーブルに `Relationships: []` 追加（Supabase型推論修正）

> **Supabase型推論の注意点**: `@supabase/postgrest-js` v2系は各テーブルに `Relationships: []` フィールドが必須。ないと型が `never` になる。
> **Next.js 16 revalidateTag**: 第2引数 `profile` が必須 → `revalidateTag('tag', {})` で空プロファイルを渡す。

---

### 🔲 Phase 7: 品質・仕上げ・Vercel デプロイ（**次の作業**）

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
