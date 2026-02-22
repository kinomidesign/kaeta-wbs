import { useRef, useState, useCallback, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { DAY_WIDTH, TOTAL_TIMELINE_DAYS, getTimelineStartDate } from '@/constants'
import { getDateFromIndex, getYearStartIndex, getTodayIndex } from '@/utils/date'
import type { CurrentViewDate } from '@/types'

interface UseVirtualGanttOptions {
  initialScrollToToday?: boolean
}

export const useVirtualGantt = (options: UseVirtualGanttOptions = {}) => {
  const { initialScrollToToday = true } = options

  const ganttRef = useRef<HTMLDivElement>(null)
  const [currentViewDate, setCurrentViewDate] = useState<CurrentViewDate>({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1
  })

  // スクロール位置監視用のthrottle
  const lastScrollUpdateRef = useRef<number>(0)

  // 水平仮想スクロール設定
  const columnVirtualizer = useVirtualizer({
    count: TOTAL_TIMELINE_DAYS,
    getScrollElement: () => ganttRef.current,
    estimateSize: () => DAY_WIDTH,
    horizontal: true,
    overscan: 14, // 前後14日分（2週間）を余分にレンダリング
  })

  // スクロール位置に応じて現在表示中の日付を更新
  const updateCurrentViewDate = useCallback(() => {
    const now = Date.now()
    // 100ms間隔でスロットル
    if (now - lastScrollUpdateRef.current < 100) return
    lastScrollUpdateRef.current = now

    if (!ganttRef.current) return

    const scrollLeft = ganttRef.current.scrollLeft
    const centerIndex = Math.floor((scrollLeft + ganttRef.current.clientWidth / 2) / DAY_WIDTH)
    const centerDate = getDateFromIndex(centerIndex)

    setCurrentViewDate({
      year: centerDate.getFullYear(),
      month: centerDate.getMonth() + 1
    })
  }, [])

  // 現在表示中の日付から相対的に年移動（瞬時切り替え）
  const scrollToYear = useCallback((deltaYears: number) => {
    if (!ganttRef.current) return

    // 現在表示中の左端の日付を取得
    const scrollLeft = ganttRef.current.scrollLeft
    const currentIndex = Math.floor(scrollLeft / DAY_WIDTH)
    const currentDate = getDateFromIndex(currentIndex)

    // deltaYears年後/前の同じ月日を計算
    const targetDate = new Date(currentDate)
    targetDate.setFullYear(targetDate.getFullYear() + deltaYears)

    // ターゲット日付のインデックスを計算
    const baseDate = getTimelineStartDate()
    const targetIndex = Math.ceil((targetDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24))
    const clampedIndex = Math.max(0, Math.min(TOTAL_TIMELINE_DAYS - 1, targetIndex))

    // 瞬時に切り替え
    columnVirtualizer.scrollToIndex(clampedIndex, { align: 'start', behavior: 'auto' })
  }, [columnVirtualizer])

  // 指定した日付（YYYY-MM-DD形式）へスクロール（左端に配置）
  const scrollToDate = useCallback((dateString: string) => {
    const targetDate = new Date(dateString)
    const baseDate = getTimelineStartDate()
    const index = Math.ceil((targetDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24))
    // インデックスが範囲内かチェック
    const clampedIndex = Math.max(0, Math.min(TOTAL_TIMELINE_DAYS - 1, index))
    columnVirtualizer.scrollToIndex(clampedIndex, { align: 'start', behavior: 'smooth' })
  }, [columnVirtualizer])

  // 今日へスクロール（左端に配置）
  const scrollToToday = useCallback(() => {
    const index = getTodayIndex()
    columnVirtualizer.scrollToIndex(index, { align: 'start', behavior: 'smooth' })
  }, [columnVirtualizer])

  // 初期マウント時に今日の位置へスクロール
  useEffect(() => {
    if (initialScrollToToday && ganttRef.current) {
      const timer = setTimeout(() => {
        const todayIndex = getTodayIndex()
        columnVirtualizer.scrollToIndex(todayIndex, { align: 'center', behavior: 'auto' })
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [initialScrollToToday, columnVirtualizer])

  return {
    ganttRef,
    columnVirtualizer,
    currentViewDate,
    updateCurrentViewDate,
    scrollToYear,
    scrollToDate,
    scrollToToday,
    virtualItems: columnVirtualizer.getVirtualItems(),
    totalSize: columnVirtualizer.getTotalSize()
  }
}
