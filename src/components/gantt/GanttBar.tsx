import React from 'react'
import type { Task } from '@/types'
import { getBarColor } from '@/utils/style'
import { getDaysFromStart, getDaysBetween } from '@/utils/date'
import { DAY_WIDTH, TIMELINE_DAYS } from '@/constants'

interface GanttBarProps {
  task: Task
  viewStartDate: string
  onDragStart: (e: React.MouseEvent, task: Task, type: 'move' | 'resize-start' | 'resize-end') => void
}

export const GanttBar: React.FC<GanttBarProps> = ({
  task,
  viewStartDate,
  onDragStart
}) => {
  const startOffset = getDaysFromStart(task.start_date, viewStartDate)
  const duration = getDaysBetween(task.start_date, task.end_date)

  if (startOffset < 0 || startOffset >= TIMELINE_DAYS) {
    return null
  }

  const barWidth = Math.max(Math.min(duration, TIMELINE_DAYS - startOffset) * DAY_WIDTH - 4, DAY_WIDTH)

  return (
    <div
      className={`absolute h-6 rounded-md shadow-sm ${getBarColor(task.owner)} ${task.status === '完了' ? 'opacity-50' : ''} flex items-center group select-none`}
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
    </div>
  )
}
