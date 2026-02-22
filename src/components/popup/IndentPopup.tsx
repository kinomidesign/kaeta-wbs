import React from 'react'
import type { IndentPopupState } from '@/types'

interface IndentPopupProps {
  indentPopup: IndentPopupState
  onSelectIndent: (taskId: number, level: number) => void
}

export const IndentPopup: React.FC<IndentPopupProps> = ({
  indentPopup,
  onSelectIndent
}) => {
  return (
    <div
      className="fixed z-50 bg-dashboard-card rounded-lg shadow-lg border border-dashboard-border py-2 px-3 min-w-[160px]"
      style={{ left: indentPopup.x, top: indentPopup.y }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-xs text-dashboard-text-muted mb-2">階層レベルを選択</div>
      {[0, 1, 2, 3].map(level => {
        const isSelected = indentPopup.currentLevel === level
        return (
          <button
            key={level}
            onClick={() => onSelectIndent(indentPopup.taskId, level)}
            className={`w-full px-2 py-1.5 text-left text-sm hover:bg-gray-50 rounded flex items-center gap-2 ${
              isSelected ? 'bg-accent-blue/20' : ''
            }`}
          >
            <span className="flex items-center" style={{ paddingLeft: `${level * 12}px` }}>
              {level === 0 ? '親タスク' : `${'└'.repeat(1)} レベル ${level}`}
            </span>
            {isSelected && <span className="ml-auto text-accent-blue-text-text">✓</span>}
          </button>
        )
      })}
    </div>
  )
}
