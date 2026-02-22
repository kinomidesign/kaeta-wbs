# ファイル参照ガイド

修正したい内容に応じて、どのファイルを編集すればよいかの一覧です。

---

## 目次

- [機能別](#機能別)
- [UI/デザイン別](#uiデザイン別)
- [データ・ロジック別](#データロジック別)
- [ディレクトリ構造](#ディレクトリ構造)

---

## 機能別

### タスク関連

| 修正内容 | ファイル |
|---------|---------|
| タスクの追加・編集・削除ロジック | `src/hooks/useTasks.ts` |
| タスク編集モーダルのUI | `src/components/modal/TaskModal.tsx` |
| タスクリストの1行表示 | `src/components/task/TaskRow.tsx` |
| タスクのドラッグ&ドロップ | `src/hooks/useTaskDrag.ts` |
| タスクの型定義 | `src/types/index.ts` |

### フェーズ関連

| 修正内容 | ファイル |
|---------|---------|
| フェーズの追加・編集・削除ロジック | `src/hooks/usePhases.ts` |
| フェーズ管理モーダルのUI | `src/components/modal/PhaseModal.tsx` |
| デフォルトフェーズの変更 | `src/constants/index.ts` |

### カテゴリ関連

| 修正内容 | ファイル |
|---------|---------|
| カテゴリの追加・編集・削除ロジック | `src/hooks/useCategories.ts` |
| カテゴリ管理モーダルのUI | `src/components/modal/CategoryModal.tsx` |
| カテゴリの並び替え | `src/hooks/useCategories.ts` → `moveCategoryOrder` |

### ガントチャート関連

| 修正内容 | ファイル |
|---------|---------|
| ガントバーの見た目 | `src/components/gantt/GanttBar.tsx` |
| 日付ヘッダーの表示 | `src/components/gantt/GanttDateHeader.tsx` |
| ガントバーのドラッグ操作 | `src/hooks/useGanttDrag.ts` |
| 表示日数の変更 | `src/constants/index.ts` → `TIMELINE_DAYS` |
| 1日あたりの幅 | `src/constants/index.ts` → `DAY_WIDTH` |

### アコーディオン（折りたたみ）

| 修正内容 | ファイル |
|---------|---------|
| フェーズ/カテゴリの展開・折りたたみ | `src/hooks/useAccordion.ts` |
| タスク階層の折りたたみ | `src/hooks/useAccordion.ts` → `collapsedTasks` |

---

## UI/デザイン別

### ヘッダー・フィルター

| 修正内容 | ファイル |
|---------|---------|
| ヘッダーのレイアウト | `src/components/Header.tsx` |
| フィルターの選択肢 | `src/constants/index.ts` → `OWNERS` |
| 「今日に移動」ボタン | `src/components/Header.tsx` |

### ポップアップ

| 修正内容 | ファイル |
|---------|---------|
| ステータス変更ポップアップ | `src/components/popup/StatusPopup.tsx` |
| インデント変更ポップアップ | `src/components/popup/IndentPopup.tsx` |

### モーダル

| 修正内容 | ファイル |
|---------|---------|
| タスク追加/編集モーダル | `src/components/modal/TaskModal.tsx` |
| フェーズ管理モーダル | `src/components/modal/PhaseModal.tsx` |
| カテゴリ管理モーダル | `src/components/modal/CategoryModal.tsx` |

### 色・スタイル

| 修正内容 | ファイル |
|---------|---------|
| ステータスの色 | `src/utils/style.ts` → `getStatusColor` |
| 担当者の色 | `src/utils/style.ts` → `getOwnerColor` |
| ガントバーの色 | `src/utils/style.ts` → `getBarColor` |
| 優先度の色 | `src/utils/style.ts` → `getPriorityColorSelected` |
| グローバルCSS | `src/app/globals.css` |

### ローディング

| 修正内容 | ファイル |
|---------|---------|
| ローディング表示 | `src/components/LoadingSpinner.tsx` |

---

## データ・ロジック別

### 定数・設定

| 修正内容 | ファイル |
|---------|---------|
| ステータス一覧 | `src/constants/index.ts` → `STATUSES` |
| 担当者一覧 | `src/constants/index.ts` → `OWNERS` |
| 優先度一覧 | `src/constants/index.ts` → `PRIORITIES` |
| テーブル幅の制限 | `src/constants/index.ts` → `TABLE_WIDTH` |
| インデント最大レベル | `src/constants/index.ts` → `MAX_INDENT_LEVEL` |

### 日付処理

| 修正内容 | ファイル |
|---------|---------|
| 日付の計算（日数差など） | `src/utils/date.ts` |
| 日付フォーマット | `src/utils/date.ts` → `formatDateDisplay` |
| 週末判定 | `src/utils/date.ts` → `isWeekend` |

### データベース（Supabase）

| 修正内容 | ファイル |
|---------|---------|
| Supabaseクライアント設定 | `src/lib/supabase.ts` |
| タスクのCRUD | `src/hooks/useTasks.ts` |
| フェーズのCRUD | `src/hooks/usePhases.ts` |
| カテゴリのCRUD | `src/hooks/useCategories.ts` |

### 型定義

| 修正内容 | ファイル |
|---------|---------|
| Task, Phase, Category | `src/types/index.ts` |
| ドラッグ状態の型 | `src/types/index.ts` → `GanttDragState`, `TaskDragState` |
| ポップアップ状態の型 | `src/types/index.ts` → `StatusPopupState`, `IndentPopupState` |
| 編集中タスクの型 | `src/types/index.ts` → `EditingTask` |

---

## ディレクトリ構造

```
src/
├── app/
│   ├── page.tsx              # メインページ（コンポーネント組み合わせ）
│   ├── layout.tsx            # レイアウト
│   └── globals.css           # グローバルCSS
│
├── types/
│   └── index.ts              # 全ての型定義
│
├── lib/
│   └── supabase.ts           # Supabaseクライアント
│
├── constants/
│   └── index.ts              # 定数（STATUSES, OWNERS, etc.）
│
├── utils/
│   ├── date.ts               # 日付ユーティリティ
│   └── style.ts              # スタイルユーティリティ
│
├── hooks/
│   ├── index.ts              # 全フックのエクスポート
│   ├── useTasks.ts           # タスクCRUD
│   ├── usePhases.ts          # フェーズCRUD
│   ├── useCategories.ts      # カテゴリCRUD
│   ├── useAccordion.ts       # アコーディオン状態
│   ├── useGanttDrag.ts       # ガントチャートドラッグ
│   └── useTaskDrag.ts        # タスクドラッグ&ドロップ
│
└── components/
    ├── index.ts              # 全コンポーネントのエクスポート
    ├── LoadingSpinner.tsx    # ローディング
    ├── Header.tsx            # ヘッダー
    │
    ├── popup/
    │   ├── index.ts
    │   ├── StatusPopup.tsx   # ステータス変更
    │   └── IndentPopup.tsx   # インデント変更
    │
    ├── modal/
    │   ├── index.ts
    │   ├── TaskModal.tsx     # タスク追加/編集
    │   ├── PhaseModal.tsx    # フェーズ管理
    │   └── CategoryModal.tsx # カテゴリ管理
    │
    ├── gantt/
    │   ├── index.ts
    │   ├── GanttDateHeader.tsx # 日付ヘッダー
    │   └── GanttBar.tsx      # ガントバー
    │
    └── task/
        ├── index.ts
        └── TaskRow.tsx       # タスク1行
```

---

## よくある修正パターン

### 新しいステータスを追加したい
1. `src/constants/index.ts` の `STATUSES` に追加
2. `src/utils/style.ts` の `getStatusColor` と `getStatusDotColor` に色を追加

### 新しい担当者を追加したい
1. `src/constants/index.ts` の `OWNERS` に追加
2. `src/utils/style.ts` の `getOwnerColor` と `getBarColor` に色を追加

### タスクに新しいフィールドを追加したい
1. `src/types/index.ts` の `Task` と `EditingTask` に追加
2. `src/hooks/useTasks.ts` の `addTask` と `saveTask` を修正
3. `src/components/modal/TaskModal.tsx` にフォーム要素を追加
4. 必要に応じて `src/components/task/TaskRow.tsx` に表示を追加
