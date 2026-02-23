import React from 'react'
import { IndentDecrease, IndentIncrease } from 'lucide-react'
import type { Task, TaskDragState } from '@/types'
import { getOwnerColor, getStatusDotColor } from '@/utils/style'
import { formatDateDisplay } from '@/utils/date'

interface TaskRowProps {
  task: Task
  taskIndex: number
  categoryTasks: Task[]
  selectedTaskId: number | null
  taskDragState: TaskDragState
  collapsedTasks: Record<number, boolean>
  onTaskClick: (task: Task) => void
  onDragStart: (e: React.DragEvent, task: Task) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent, task: Task, position: 'before' | 'after') => void
  onDrop: (e: React.DragEvent, task: Task, position: 'before' | 'after') => void
  onStatusClick: (task: Task, e: React.MouseEvent) => void
  onDateClick: (startDate: string, e: React.MouseEvent) => void
  onToggleCollapse: (taskId: number, e: React.MouseEvent) => void
  onChangeIndent: (e: React.MouseEvent, taskId: number, delta: number) => void
  hasChildren: boolean
  isHidden: boolean
}

export const TaskRow: React.FC<TaskRowProps> = ({
  task,
  selectedTaskId,
  taskDragState,
  collapsedTasks,
  onTaskClick,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onStatusClick,
  onDateClick,
  onToggleCollapse,
  onChangeIndent,
  hasChildren,
  isHidden
}) => {
  if (isHidden) return null

  const isDragging = taskDragState.draggingTaskId === task.id
  const isDropTargetBefore = taskDragState.dropTarget?.taskId === task.id && taskDragState.dropTarget?.position === 'before'
  const isDropTargetAfter = taskDragState.dropTarget?.taskId === task.id && taskDragState.dropTarget?.position === 'after'
  const indentLevel = task.indent_level || 0
  const isCollapsed = collapsedTasks[task.id]

  return (
    <div className="relative">
      {/* ドロップインジケーター（上） */}
      {isDropTargetBefore && (
        <div
          className="absolute top-0 left-0 right-0 h-1 bg-accent-blue z-10"
          style={{ marginLeft: `${64 + indentLevel * 24}px` }}
        />
      )}

      {/* タスク行 */}
      <div
        draggable
        onDragStart={(e) => onDragStart(e, task)}
        onDragEnd={onDragEnd}
        onDragOver={(e) => {
          e.preventDefault()
          const rect = e.currentTarget.getBoundingClientRect()
          const y = e.clientY - rect.top
          const height = rect.height
          const position = y < height * 0.5 ? 'before' : 'after'
          onDragOver(e, task, position)
        }}
        onDrop={(e) => {
          const rawPosition = taskDragState.dropTarget?.position
          const position: 'before' | 'after' = rawPosition === 'before' ? 'before' : 'after'
          onDrop(e, task, position)
        }}
        onClick={() => onTaskClick(task)}
        className={`group/task h-12 border-b border-gray-100 cursor-grab hover:bg-gray-50 grid grid-cols-12 gap-2 items-center transition-all
          ${selectedTaskId === task.id ? 'bg-blue-50' : ''}
          ${isDragging ? 'opacity-50 bg-gray-100' : ''}
        `}
        style={{ paddingLeft: `${64 + indentLevel * 24}px`, paddingRight: '16px' }}
      >
        {/* 階層構造の接続線 */}
        {indentLevel > 0 && (
          <div className="absolute left-0 top-0 bottom-0 pointer-events-none" style={{ width: `${64 + indentLevel * 24}px` }}>
            {Array.from({ length: indentLevel }).map((_, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 w-px bg-gray-200 group-hover/task:bg-gray-300"
                style={{ left: `${64 + i * 24 + 8}px` }}
              />
            ))}
            <div
              className="absolute h-px bg-gray-200 group-hover/task:bg-gray-300"
              style={{
                left: `${64 + (indentLevel - 1) * 24 + 8}px`,
                top: '50%',
                width: '16px'
              }}
            />
          </div>
        )}

        <div className="col-span-5 flex items-center gap-2">
          {/* トグルボタン（子タスクがある場合）またはドラッグハンドル */}
          <div className="flex items-center gap-1">
            {hasChildren ? (
              <button
                type="button"
                draggable={false}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => onToggleCollapse(task.id, e)}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 text-dashboard-text-muted"
                title={isCollapsed ? '子タスクを展開' : '子タスクを折りたたむ'}
              >
                <span className={`transform transition-transform text-xs ${isCollapsed ? '' : 'rotate-90'}`}>▶</span>
              </button>
            ) : (
              <span className="w-5 h-5 flex items-center justify-center cursor-grab text-dashboard-text-muted opacity-0 group-hover/task:opacity-100 transition-opacity" title="ドラッグして移動">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <circle cx="3" cy="3" r="1.5"/>
                  <circle cx="9" cy="3" r="1.5"/>
                  <circle cx="3" cy="9" r="1.5"/>
                  <circle cx="9" cy="9" r="1.5"/>
                </svg>
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-dashboard-text-main break-words">{task.name}</p>
          </div>
        </div>

        {/* インデント変更ポップアップ（ホバーで表示） */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover/task:opacity-100 transition-all duration-150 pointer-events-none group-hover/task:pointer-events-auto z-20">
          <div className="bg-white shadow-md rounded-lg border border-gray-200 p-1 flex items-center gap-0.5">
            <button
              type="button"
              draggable={false}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => onChangeIndent(e, task.id, -1)}
              disabled={indentLevel === 0}
              className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${indentLevel === 0 ? 'cursor-not-allowed text-gray-300' : 'text-gray-600 hover:bg-blue-100 hover:text-blue-600 active:bg-blue-200'}`}
              title="階層を上げる"
            >
              <IndentDecrease size={18} strokeWidth={2} />
            </button>
            <button
              type="button"
              draggable={false}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => onChangeIndent(e, task.id, 1)}
              disabled={indentLevel >= 3}
              className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${indentLevel >= 3 ? 'cursor-not-allowed text-gray-300' : 'text-gray-600 hover:bg-blue-100 hover:text-blue-600 active:bg-blue-200'}`}
              title="階層を下げる"
            >
              <IndentIncrease size={18} strokeWidth={2} />
            </button>
          </div>
          {/* 下向き三角（吹き出しの矢印） */}
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-white border-r border-b border-gray-200 rotate-45"></div>
        </div>

        <div className="col-span-2 flex items-center justify-center">
          <span className={`text-xs px-2 py-1 rounded border whitespace-nowrap ${getOwnerColor(task.owner)}`}>
            {task.owner}
          </span>
        </div>

        <div className="col-span-3 flex items-center justify-center">
          {task.start_date && task.end_date ? (
            <button
              type="button"
              draggable={false}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => onDateClick(task.start_date!, e)}
              className="text-xs hover:underline cursor-pointer"
              style={{ color: '#009EA4' }}
              title="クリックで開始日にスクロール"
            >
              {formatDateDisplay(task.start_date)} - {formatDateDisplay(task.end_date)}
            </button>
          ) : (
            <span className="text-xs text-dashboard-text-muted">日付未設定</span>
          )}
        </div>

        <div className="col-span-2 flex items-center justify-center">
          <button
            type="button"
            draggable={false}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onStatusClick(task, e); }}
            className="text-xs px-2 py-1 rounded-full cursor-pointer hover:bg-gray-100 transition-colors flex items-center gap-1.5 border border-gray-200 bg-white text-gray-700"
            title="クリックでステータス変更"
          >
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusDotColor(task.status)}`}></span>
            {task.status}
          </button>
        </div>
      </div>

      {/* ドロップインジケーター（下） */}
      {isDropTargetAfter && (
        <div
          className="absolute bottom-0 left-0 right-0 h-1 bg-accent-blue z-10"
          style={{ marginLeft: `${64 + indentLevel * 24}px` }}
        />
      )}
    </div>
  )
}
