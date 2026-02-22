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

// タイムライン基準日（現在の年の1月1日）
export const getTimelineBaseDate = (): Date => {
  const currentYear = new Date().getFullYear()
  // ローカルタイムで日付を作成（タイムゾーン問題を回避）
  return new Date(currentYear, 0, 1)
}

// タイムライン表示範囲（基準日から前後）
export const TIMELINE_DAYS_BEFORE = 365
export const TIMELINE_DAYS_AFTER = 365

// 総タイムライン日数（730日 = 約2年分）
export const TOTAL_TIMELINE_DAYS = TIMELINE_DAYS_BEFORE + TIMELINE_DAYS_AFTER

// タイムライン表示日数（後方互換性のため残す）
export const TIMELINE_DAYS = 365

// タイムラインの開始日を取得（現在年-1年の1月1日）
export const getTimelineStartDate = (): Date => {
  const base = getTimelineBaseDate()
  const start = new Date(base)
  start.setDate(start.getDate() - TIMELINE_DAYS_BEFORE)
  return start
}

// インデントの最大レベル
export const MAX_INDENT_LEVEL = 3

// テーブル幅の制限
export const TABLE_WIDTH = {
  min: 300,
  max: 800,
  default: 450
} as const
