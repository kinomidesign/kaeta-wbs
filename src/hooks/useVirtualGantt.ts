import { useRef, useState, useCallback, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { DAY_WIDTH, TOTAL_TIMELINE_DAYS, getTimelineStartDate } from '@/constants'
import { getDateFromIndex, getTodayIndex, parseDateString } from '@/utils/date'
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

  // 指定した日付（YYYY-MM-DD形式）へスクロール（左端に配置）
  const scrollToDate = useCallback((dateString: string) => {
    const targetDate = parseDateString(dateString)
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

  // 初期マウント時に今日の位置へスクロール（先頭に配置）
  useEffect(() => {
    if (initialScrollToToday && ganttRef.current) {
      const timer = setTimeout(() => {
        const todayIndex = getTodayIndex()
        columnVirtualizer.scrollToIndex(todayIndex, { align: 'start', behavior: 'auto' })
        // スクロール後にcurrentViewDateを更新
        setTimeout(() => {
          const today = new Date()
          setCurrentViewDate({
            year: today.getFullYear(),
            month: today.getMonth() + 1
          })
        }, 50)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [initialScrollToToday, columnVirtualizer])

  return {
    ganttRef,
    columnVirtualizer,
    currentViewDate,
    updateCurrentViewDate,
    scrollToDate,
    scrollToToday,
    virtualItems: columnVirtualizer.getVirtualItems(),
    totalSize: columnVirtualizer.getTotalSize()
  }
}
