import {
  TIMELINE_DAYS,
  getTimelineStartDate
} from '@/constants'

/**
 * 日付文字列（YYYY-MM-DD）をローカルタイムゾーンでDateオブジェクトに変換
 * new Date("2026-02-10") はUTC午前0時として解釈されるため、
 * タイムゾーンによる1日ずれを防ぐために明示的にローカルタイムで作成する
 */
export const parseDateString = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * 2つの日付間の日数を計算（開始日と終了日を含む）
 */
export const getDaysBetween = (start: string, end: string): number => {
  const startDate = parseDateString(start)
  const endDate = parseDateString(end)
  return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

/**
 * 基準日からの日数オフセットを計算 */
export const getDaysFromStart = (date: string, viewStart: string): number => {
  const taskDate = parseDateString(date)
  const startDate = parseDateString(viewStart)
  return Math.ceil((taskDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * 指定した開始日から日付の配列を生成
 */
export const generateDateRange = (startDate: string, days: number = TIMELINE_DAYS): Date[] => {
  const dates: Date[] = []
  const start = parseDateString(startDate)

  for (let i = 0; i < days; i++) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    dates.push(date)
  }

  return dates
}

/**
 * 今年の1月1日を取得
 */
export const getYearStartDate = (): string => {
  const year = new Date().getFullYear()
  return `${year}-01-01`
}

/**
 * 今日の日付を YYYY-MM-DD 形式で取得（ローカルタイム基準）
 */
export const getTodayString = (): string => {
  return formatDateString(new Date())
}

/**
 * Date オブジェクトを YYYY-MM-DD 形式の文字列に変換（ローカルタイム基準）
 */
export const formatDateString = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 日付文字列を表示用にフォーマット (MM/DD)
 */
export const formatDateDisplay = (dateString: string): string => {
  return dateString.replace(/-/g, '/').slice(5)
}

/**
 * 日付に日数を加算
 */
export const addDays = (dateString: string, days: number): string => {
  const date = parseDateString(dateString)
  date.setDate(date.getDate() + days)
  return formatDateString(date)
}

/**
 * 週末かどうかをチェック
 */
export const isWeekend = (date: Date): boolean => {
  const day = date.getDay()
  return day === 0 || day === 6
}

/**
 * 月曜日かどうかをチェック
 */
export const isMonday = (date: Date): boolean => {
  return date.getDay() === 1
}

/**
 * 月初めかどうかをチェック
 */
export const isFirstOfMonth = (date: Date): boolean => {
  return date.getDate() === 1
}

/**
 * 今日かどうかをチェック
 */
export const isToday = (date: Date): boolean => {
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

/**
 * タイムライン基準日からの日数オフセットを計算
 * 仮想スクロール用：タイムライン開始日（基準日-365日）からの日数
 */
export const getDaysFromBase = (date: string): number => {
  const taskDate = parseDateString(date)
  const baseDate = getTimelineStartDate()
  return Math.ceil((taskDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * タイムラインのインデックスから日付を取得
 */
export const getDateFromIndex = (index: number): Date => {
  const baseDate = getTimelineStartDate()
  const date = new Date(baseDate)
  date.setDate(date.getDate() + index)
  return date
}

/**
 * 指定した年の1月1日のタイムラインインデックスを取得
 */
export const getYearStartIndex = (year: number): number => {
  const targetDate = new Date(year, 0, 1)
  const baseDate = getTimelineStartDate()
  return Math.ceil((targetDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * 今日のタイムラインインデックスを取得
 */
export const getTodayIndex = (): number => {
  const today = new Date()
  const baseDate = getTimelineStartDate()
  return Math.ceil((today.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24))
}
