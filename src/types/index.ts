// タスクの型定義
export interface Task {
  id: number
  phase: string
  category: string
  category_id: number | null
  name: string
  owner: string
  status: string
  start_date: string
  end_date: string
  effort: string | null
  priority: string
  note: string | null
  indent_level?: number
  sort_order?: number
}

// フェーズの型定義
export interface Phase {
  id: number
  name: string
  sort_order: number
}

// カテゴリの型定義
export interface Category {
  id: number
  name: string
  phase_id: number
  sort_order: number
}

// アコーディオン状態の型定義
export interface AccordionState {
  phases: Record<string, boolean>
  categories: Record<string, boolean>
}

// ガントチャートドラッグ状態の型定義
export interface GanttDragState {
  taskId: number | null
  type: 'move' | 'resize-start' | 'resize-end' | null
  startX: number
  originalStart: string
  originalEnd: string
}

// タスクリストドラッグ状態の型定義
export interface TaskDragState {
  draggingTaskId: number | null
  startX: number
  previewIndent: number
  originalIndent: number
  dropTarget: {
    taskId: number | null
    position: 'before' | 'after' | 'child' | null
    phase?: string
    category?: string
  } | null
}

// ステータスポップアップの型定義
export interface StatusPopupState {
  taskId: number
  x: number
  y: number
}

// インデントポップアップの型定義
export interface IndentPopupState {
  taskId: number
  x: number
  y: number
  currentLevel: number
}

// 編集中タスクの型定義
export interface EditingTask {
  phase: string
  category: string
  name: string
  owner: string
  status: string
  start_date: string
  end_date: string
  effort: string
  priority: string
  note: string
  indent_level: number
}
