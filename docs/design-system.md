# MArKE-IT Workflow — デザインシステム

## コンセプト

**「Microsoft Teams ライクなビジネスツール」**
Teams の配色（ダークパープルサイドバー × ウォームグレー背景 × Teamsパープルのアクセント）を基調とした、プロフェッショナルで親しみやすい UI。

---

## カラーパレット

参考元: Microsoft Teams (#6264A7 / #33344A / #F3F2F1)

| トークン | 値 (oklch) | HEX 参考値 | 用途 |
|---|---|---|---|
| `--primary` | `oklch(0.46 0.12 275)` | `#6264A7` | Teams パープル。ボタン・アクティブ状態 |
| `--background` | `oklch(0.965 0.005 60)` | `#F3F2F1` | ウォームグレー。コンテンツ背景 |
| `--card` | `oklch(1 0 0)` | `#FFFFFF` | 純白。カード・モーダル |
| `--muted` | `oklch(0.955 0.004 60)` | `#EDEBE9` | ごく薄いウォームグレー |
| `--muted-foreground` | `oklch(0.46 0.005 60)` | `#616161` | サブテキスト |
| `--border` | `oklch(0.895 0.005 60)` | `#E1DFDD` | 罫線 |
| `--destructive` | `oklch(0.577 0.245 27.3)` | `#C4314B` | エラー・削除 |
| `--sidebar` | `oklch(0.225 0.045 275)` | `#33344A` | ダークパープル。サイドバー背景 |
| `--sidebar-foreground` | `oklch(0.82 0.015 275)` | `#C8C6C4` | サイドバー通常テキスト |
| `--sidebar-accent` | `oklch(0.315 0.055 275)` | `#464775` | サイドバーホバー背景 |
| `--sidebar-accent-foreground` | `oklch(0.97 0 0)` | `#FFFFFF` | サイドバーホバーテキスト |
| `--sidebar-primary` | `oklch(0.46 0.12 275)` | `#6264A7` | サイドバーアクティブ |
| `--sidebar-border` | `oklch(0.30 0.05 275)` | `#3D3E57` | サイドバー罫線 |

---

## タイポグラフィ

| 用途 | クラス | 備考 |
|---|---|---|
| ページタイトル | `text-2xl font-semibold tracking-tight` | 24px / 600 |
| セクション見出し | `text-lg font-semibold` | 18px / 600 |
| 本文 | `text-sm` | 14px / 400 |
| サブテキスト | `text-sm text-muted-foreground` | 14px / グレー |
| ラベル | `text-xs font-medium uppercase tracking-wide text-muted-foreground` | 12px / 大文字 |

フォント: **Geist Sans**（システム既定）

---

## スペーシング

| 箇所 | 値 |
|---|---|
| ページパディング | `p-6`（24px） |
| カード内パディング | `p-5`（20px） |
| セクション間 | `gap-6`（24px） |
| 要素間 | `gap-3`（12px） |
| フォーム要素間 | `space-y-4`（16px） |

---

## ボーダー・シャドウ

| 用途 | クラス |
|---|---|
| 通常カード | `border shadow-sm` |
| 浮き上がるカード | `border shadow-md` |
| 角丸（標準） | `rounded-lg`（`--radius: 0.5rem`） |
| 角丸（小） | `rounded-md` |

---

## コンポーネントルール

### ボタン
- Primary: `bg-primary text-primary-foreground` — 重要なアクション
- Outline: `border bg-background` — 副次的なアクション
- Ghost: `hover:bg-accent` — サイドバー・テーブル内

### インプット
- `bg-white border rounded-md h-9 px-3 text-sm` — 統一サイズ

### バッジ
- ステータス表示に使用。`rounded-full` でピル型

### ヘッダー
- 高さ: `h-14`
- 背景: `bg-white border-b`
- 右端: ユーザーアバター + ドロップダウン

### サイドバー
- 幅: `w-56`
- 背景: `bg-sidebar`（ダークネイビー）
- ロゴエリア: 上部 `h-14` にブランド名
- ナビアイテム: `rounded-md px-3 py-2` / アクティブ時は `bg-sidebar-primary text-white`

---

## ログイン画面

- 背景: 淡いインディゴグラデーション（`from-indigo-50 to-slate-100`）
- カード: `shadow-xl rounded-xl` で浮遊感
- ロゴ: インディゴドット + ブランド名
