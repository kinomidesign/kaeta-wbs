import React from 'react'
import type { Task } from '@/types'
import { getBarColor } from '@/utils/style'
import { getDaysFromBase, getDaysBetween, formatDateDisplay } from '@/utils/date'
import { DAY_WIDTH, TOTAL_TIMELINE_DAYS } from '@/constants'

interface GanttBarProps {
  task: Task
  onDragStart: (e: React.MouseEvent, task: Task, type: 'move' | 'resize-start' | 'resize-end') => void
  isDragging?: boolean
}

export const GanttBar: React.FC<GanttBarProps> = ({
  task,
  onDragStart,
  isDragging = false
}) => {
  // 日付がnullの場合はバーを表示しない
  if (!task.start_date || !task.end_date) {
    return null
  }

  const startOffset = getDaysFromBase(task.start_date)
  const duration = getDaysBetween(task.start_date, task.end_date)

  // タイムライン範囲外のタスクは表示しない
  if (startOffset < 0 || startOffset >= TOTAL_TIMELINE_DAYS) {
    return null
  }

  const barWidth = Math.max(Math.min(duration, TOTAL_TIMELINE_DAYS - startOffset) * DAY_WIDTH - 4, DAY_WIDTH)

  return (
    <div
      className={`absolute h-6 rounded-md shadow-sm ${getBarColor(task.owner)} ${task.status === '完了' ? 'opacity-50' : ''} flex items-center group select-none ${isDragging ? 'z-50 ring-2 ring-blue-400' : ''}`}
      style={{
        left: `${startOffset * DAY_WIDTH}px`,
        width: `${barWidth}px`
      }}
    >
      {/* 左端リサイズハンドル */}
      <div
        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 rounded-l"
        onMouseDown={(e) => onDragStart(e, task, 'resize-start')}
      />
      {/* 中央ドラッグ領域 */}
      <div
        className="flex-1 h-full flex items-center justify-center cursor-move px-2"
        onMouseDown={(e) => onDragStart(e, task, 'move')}
      >
        <span className="text-xs text-dashboard-text-main font-medium truncate pointer-events-none drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
          {task.name}
        </span>
      </div>
      {/* 右端リサイズハンドル */}
      <div
        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 rounded-r"
        onMouseDown={(e) => onDragStart(e, task, 'resize-end')}
      />
      {/* ドラッグ中の日付表示 */}
      {isDragging && (
        <>
          <div className="absolute -top-5 left-0 text-xs bg-gray-800 text-white px-1 rounded whitespace-nowrap">
            {formatDateDisplay(task.start_date)}
          </div>
          <div className="absolute -top-5 right-0 text-xs bg-gray-800 text-white px-1 rounded whitespace-nowrap">
            {formatDateDisplay(task.end_date)}
          </div>
        </>
      )}
    </div>
  )
}
