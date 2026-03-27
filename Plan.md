# 実装計画書 — 案件管理Webアプリケーション

**作成日**: 2026-03-26
**ステータス**: 確定

---

## 1. 技術スタック

| 種別 | 採用技術 | 選定理由 |
|---|---|---|
| フレームワーク | **Next.js 15 (App Router)** | Route HandlerでNotion Token・AIキーをサーバーサイドに閉じ込められる。SSR・動的ルーティング・Vercelデプロイとの相性が最良 |
| UI | **shadcn/ui + Tailwind CSS v4** | コンポーネントをプロジェクトにコピーする設計でカスタマイズが完全に可能。Radix UIベースのアクセシビリティ対応が内蔵 |
| Notion API | **@notionhq/client**（公式SDK） | TypeScript型定義完備。サーバーサイドのRoute Handlerのみで使用し、クライアントバンドルには含めない |
| Supabase | **@supabase/supabase-js + @supabase/ssr** | Next.js App Routerの Server Components / Route Handler / Middleware での公式SSRサポート |
| 状態管理 | **Zustand**（最小限） | フィルタ・検索クエリ・ページ番号等のUIステート管理のみ。サーバーデータはSSRで処理 |
| フォーム | **React Hook Form + Zod** | shadcn/ui `<Form>` との統合が公式。ZodスキーマをAPIバリデーションにも再利用可能 |
| ホスティング | **Vercel** | Next.jsの開発元。環境変数管理UI・Preview Deployment・Supabaseとの公式インテグレーションが充実 |
| 暗号化 | **Web Crypto API (Node.js built-in)** | AES-GCM 256bit。外部ライブラリ不要。暗号化鍵は環境変数 `ENCRYPTION_KEY` で管理 |

### その他ライブラリ

| ライブラリ | 用途 |
|---|---|
| `p-retry` | Notion APIエクスポネンシャルバックオフリトライ |
| `p-limit` | Notion API 3req/秒レート制限の同時実行数制御 |
| `date-fns` | 日付フォーマット |
| `sonner` | Toast通知（保存成功・エラー表示） |
| `next-themes` | ダークモード対応（将来拡張に備えた軽量な投資） |

---

## 2. ディレクトリ構成

```
/
├── app/
│   ├── (auth)/                         # 認証不要ページ
│   │   ├── login/page.tsx
│   │   └── invite/page.tsx
│   │
│   ├── (dashboard)/                    # 認証必須ページ
│   │   ├── layout.tsx                  # ヘッダー + サイドバー共通レイアウト
│   │   ├── projects/
│   │   │   ├── page.tsx                # 案件一覧
│   │   │   ├── _components/
│   │   │   │   ├── ProjectCard.tsx
│   │   │   │   ├── ProjectFilters.tsx
│   │   │   │   ├── ProjectCreateModal.tsx
│   │   │   │   └── Pagination.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx            # 案件詳細
│   │   │       └── _components/
│   │   │           └── ProjectEditForm.tsx
│   │   ├── orders/
│   │   │   ├── page.tsx                # 受注一覧
│   │   │   ├── _components/
│   │   │   │   ├── OrderCard.tsx
│   │   │   │   ├── OrderFilters.tsx
│   │   │   │   └── OrderCreateModal.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx            # 受注詳細
│   │   │       └── _components/
│   │   │           └── OrderEditForm.tsx
│   │   └── settings/
│   │       ├── page.tsx
│   │       └── _components/
│   │           ├── ProfileSection.tsx
│   │           ├── UserManagementSection.tsx   # admin only
│   │           ├── NotionSettingsSection.tsx   # admin only
│   │           └── AISettingsSection.tsx       # admin only
│   │
│   └── api/                            # Route Handlers（サーバーサイドのみ）
│       ├── notion/
│       │   ├── projects/
│       │   │   ├── route.ts            # GET（一覧）, POST（作成）
│       │   │   └── [id]/route.ts       # GET（詳細）, PATCH（更新）
│       │   └── orders/
│       │       ├── route.ts            # GET（一覧）, POST（作成）
│       │       └── [id]/route.ts       # GET（詳細）, PATCH（更新）
│       ├── settings/
│       │   ├── notion-token/route.ts   # PUT: 暗号化保存
│       │   ├── ai-keys/route.ts        # GET（存在確認のみ）, PUT, DELETE
│       │   └── user-mapping/route.ts   # GET（Notionユーザー一覧）, POST
│       └── admin/
│           ├── invite/route.ts         # POST: Supabase inviteUserByEmail
│           └── users/route.ts          # GET（一覧）, PATCH（ロール変更）
│
├── components/
│   ├── ui/                             # shadcn/ui コンポーネント（自動生成）
│   ├── layout/
│   │   ├── Header.tsx
│   │   └── Sidebar.tsx
│   └── common/
│       ├── LoadingSpinner.tsx
│       └── ErrorMessage.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                   # ブラウザ用クライアント
│   │   ├── server.ts                   # Server Components用クライアント
│   │   ├── middleware.ts               # Middleware用クライアント
│   │   └── admin.ts                    # Admin Client（サービスロールキー）
│   ├── notion/
│   │   ├── client.ts                   # Notionクライアント初期化（Token動的取得）
│   │   ├── rate-limit.ts               # レート制限・リトライ処理
│   │   ├── projects.ts                 # 案件DB操作・アダプター関数
│   │   └── orders.ts                   # 受注DB操作・アダプター関数
│   ├── crypto.ts                       # AES-GCM 暗号化・復号
│   └── utils.ts                        # cn() 等の汎用ユーティリティ
│
├── types/
│   ├── notion.ts                       # Notionレスポンス型・正規化後の型
│   ├── supabase.ts                     # Supabaseテーブル型（自動生成）
│   └── api.ts                          # APIリクエスト/レスポンス型
│
├── hooks/
│   ├── useProfile.ts
│   └── useFilter.ts
│
├── store/
│   └── filterStore.ts                  # フィルタ・ページネーション状態（Zustand）
│
├── middleware.ts                       # Route Guard
├── .env.local                          # 環境変数（gitignore）
├── .env.example                        # 環境変数テンプレート
└── next.config.ts
```

---

## 3. 環境変数

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ENCRYPTION_KEY=          # 32バイトのランダム文字列（Notion Token・AIキーの暗号化に使用）
```

> `NOTION_TOKEN` は環境変数ではなく、管理者が設定画面から入力してSupabaseに暗号化保存する。

---

## 4. 実装フェーズ計画

### Phase 0: プロジェクト基盤構築（複雑度: S）

| # | 実装内容 |
|---|---|
| 1 | Next.js 15プロジェクト初期化（create-next-app） |
| 2 | Tailwind CSS v4・shadcn/ui初期化 |
| 3 | 環境変数ファイル作成（.env.local, .env.example） |
| 4 | `lib/supabase/` 4ファイル実装（client / server / middleware / admin） |
| 5 | `middleware.ts` によるRoute Guard実装（未ログイン→/login リダイレクト） |
| 6 | `types/supabase.ts` 自動生成（supabase gen types typescript） |

**依存関係**: なし（起点）

---

### Phase 1: 認証フロー（複雑度: M）

| # | 実装内容 |
|---|---|
| 1 | `/login` ページ: メール+パスワード + Googleログインボタン |
| 2 | Supabaseデータベーストリガー: `auth.users` INSERT時 `profiles` 自動生成（初期ユーザーは `admin`） |
| 3 | `/invite` ページ: 招待トークン受け取り・パスワード設定フォーム |
| 4 | `POST /api/admin/invite` Route Handler: adminのみ呼び出し可能 |

**依存関係**: Phase 0完了後

---

### Phase 2: 共通レイアウト（複雑度: S）

| # | 実装内容 |
|---|---|
| 1 | `(dashboard)/layout.tsx`: ヘッダー + サイドバー共通レイアウト |
| 2 | `Header.tsx`: アバター・表示名・ドロップダウンメニュー（設定・ログアウト） |
| 3 | `Sidebar.tsx`: 案件一覧・受注一覧ナビゲーション + アクティブ状態 |

**依存関係**: Phase 1完了後

---

### Phase 3: 暗号化基盤 + Notionクライアント（複雑度: M）

| # | 実装内容 |
|---|---|
| 1 | `lib/crypto.ts`: AES-GCM 256bit の encrypt / decrypt 関数 |
| 2 | `lib/notion/rate-limit.ts`: p-limit(3) + p-retry でレート制限・リトライ |
| 3 | `lib/notion/client.ts`: Supabaseから暗号化Tokenを取得・復号してNotionクライアントを初期化 |
| 4 | `lib/notion/projects.ts` / `orders.ts`: NotionAPIレスポンスをアプリ型に変換するアダプター |

**依存関係**: Phase 0完了後（Phase 1と並行可能）

> **注意**: 案件一覧DBの `進捗状況` プロパティ名には末尾スペースあり（`"進捗状況 "`）。
> アダプター層でプロパティIDベース（`bW^a`）のアクセスに統一してバグを防ぐ。

---

### Phase 4: 案件一覧・案件詳細（複雑度: L）

| # | 実装内容 |
|---|---|
| 1 | `GET /api/notion/projects`: フィルタ・検索・ページネーション対応 |
| 2 | `POST /api/notion/projects`: 新規作成（Zodバリデーション付き） |
| 3 | `app/(dashboard)/projects/page.tsx`: Server Componentとして初期データフェッチ |
| 4 | `ProjectCard.tsx` / `ProjectFilters.tsx` / `Pagination.tsx` |
| 5 | `ProjectCreateModal.tsx`: shadcn/ui Dialog + React Hook Form + Zod |
| 6 | `GET /api/notion/projects/[id]` + `PATCH /api/notion/projects/[id]` |
| 7 | `app/(dashboard)/projects/[id]/page.tsx` + `ProjectEditForm.tsx` |

**依存関係**: Phase 3完了後

---

### Phase 5: 受注一覧・受注詳細（複雑度: L）

Phase 4と同構成を受注DBに対して実装。

| Phase 4との差分 | 対応方法 |
|---|---|
| `担当者`（people型）の更新 | `{ people: [{ id: notion_user_id }] }` 形式。`profiles.notion_user_id` と照合 |
| `案件名`（relation型）の選択肢 | `GET /api/notion/projects?for=relation` でページ一覧を取得してセレクトに表示 |
| `進捗`（status型） | selectとは異なるAPIレスポンス構造。アダプター層で吸収 |
| `添付`（files型） | 表示のみ（更新不可） |

**依存関係**: Phase 3完了後（Phase 4のパターン確立後を推奨）

---

### Phase 6: 設定画面（複雑度: M）

| # | 実装内容 |
|---|---|
| 1 | `ProfileSection.tsx`: 表示名変更 + アイコンアップロード（Supabase Storage） |
| 2 | `UserManagementSection.tsx`: ユーザー一覧・招待・ロール変更（adminのみ） |
| 3 | `NotionSettingsSection.tsx`: Notion Token入力・保存 + Notionユーザー紐づけ（adminのみ） |
| 4 | `AISettingsSection.tsx`: プロバイダー選択 + 各APIキー登録（adminのみ） |

**依存関係**: Phase 3完了後

---

### Phase 7: 品質・仕上げ（複雑度: M）

| # | 実装内容 |
|---|---|
| 1 | モバイル対応: サイドバーをドロワー化 |
| 2 | `error.tsx` / `loading.tsx` の全画面への設置 |
| 3 | Notionリッチテキストのレンダリングコンポーネント整備 |
| 4 | Notion Token未設定時のエラー表示（「管理者に連絡してください」） |
| 5 | Vercel本番デプロイ・環境変数設定 |

**依存関係**: Phase 4〜6完了後

---

## 5. フェーズ依存関係図

```
Phase 0（基盤）
    │
    ├─── Phase 1（認証）
    │         │
    │         └─── Phase 2（レイアウト）
    │                    │
    │              ┌─────┴────────┐
    │              │              │
    └─── Phase 3（暗号化・Notion）│
               │              │
         ┌─────┼──────┐       │
         │     │      │       │
      Phase4 Phase5  Phase6   │
      案件  受注   設定      │
         │     │      │       │
         └─────┴──────┴───────┘
                    │
                Phase 7（仕上げ）
```

---

## 6. リスク・注意事項

### セキュリティ

| リスク | 対策 |
|---|---|
| Route Handlerでの認証チェック漏れ | 各Route Handler内で必ず `supabase.auth.getUser()` を呼ぶ。`getSession()` はローカルJWT検証なので信頼しない |
| 管理者専用エンドポイントへの不正アクセス | `/api/admin/*` / `/api/settings/*` では必ずロール確認（adminでなければ403） |
| 暗号化キーのローテーション | `ENCRYPTION_KEY` 変更時は既存データが復号不能になる。初期は1バージョン固定。将来的にはキーバージョン管理が必要 |
| Admin ClientのRLS回避 | `lib/supabase/admin.ts` はRoute Handler専用。クライアントバンドルに含めない |

### Notion API

| リスク | 対策 |
|---|---|
| `進捗状況 ` プロパティ末尾スペース | アダプター層でプロパティIDベースのアクセスに統一（`bW^a`） |
| ページネーションの1回100件制限 | リクエストごとにカーソルを使いAPIを叩く。Next.jsキャッシュ（`revalidate: 60`）でAPIコール数を削減 |
| Notion Token動的取得によるレイテンシ | `unstable_cache` でリクエストスコープ内のインスタンスを再利用。Token更新時は `revalidateTag('notion-token')` でキャッシュ無効化 |
| Notion Token未設定時のハンドリング | Route Handlerから503+専用エラーメッセージ。フロント側で「管理者に連絡してください」を表示 |

### Supabase

| リスク | 対策 |
|---|---|
| 招待フローのリダイレクトURL設定漏れ | SupabaseダッシュボードでSite URL + Additional Redirect URLsに `/invite` を登録 |
| `profiles.role` 列の不正変更 | role変更はAdmin Client経由のRoute Handlerのみから実施。通常のRLSポリシーでは本人のみ更新可に制限 |
| Googleログイン後のprofilesレコード未生成 | OAuthログインを含むすべての `auth.users` INSERTに対してトリガーが発火することをPhase 1で確認 |
