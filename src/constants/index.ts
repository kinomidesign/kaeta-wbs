// ステータス一覧
export const STATUSES = ['未着手', '進行中', '完了', '保留'] as const
export type Status = typeof STATUSES[number]

// 担当者一覧
export const OWNERS = ['エンジニア', 'デザイナー', '共同'] as const
export type Owner = typeof OWNERS[number]

// 優先度一覧
export const PRIORITIES = ['必須', '推奨', '任意'] as const
export type Priority = typeof PRIORITIES[number]

// デフォルトフェーズ（DBからロードできない場合のフォールバック）
export const DEFAULT_PHASES = ['Phase 1', 'Phase 1.5', 'Phase 2'] as const

// ガントチャートの1日あたりの幅（px）
export const DAY_WIDTH = 32

// タイムライン表示日数
export const TIMELINE_DAYS = 365

// インデントの最大レベル
export const MAX_INDENT_LEVEL = 3

// テーブル幅の制限
export const TABLE_WIDTH = {
  min: 300,
  max: 800,
  default: 450
} as const
