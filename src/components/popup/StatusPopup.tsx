import React from 'react'
import type { Task, StatusPopupState } from '@/types'
import { STATUSES } from '@/constants'
import { getStatusDotColor } from '@/utils/style'

interface StatusPopupProps {
  statusPopup: StatusPopupState
  tasks: Task[]
  onSelectStatus: (taskId: number, status: string) => void
}

export const StatusPopup: React.FC<StatusPopupProps> = ({
  statusPopup,
  tasks,
  onSelectStatus
}) => {
  const task = tasks.find(t => t.id === statusPopup.taskId)

  return (
    <div
      className="fixed z-50 bg-dashboard-card rounded-lg shadow-lg border border-dashboard-border py-1 min-w-[120px]"
      style={{ left: statusPopup.x, top: statusPopup.y }}
      onClick={(e) => e.stopPropagation()}
    >
      {STATUSES.map(status => {
        const isSelected = task?.status === status
        return (
          <button
            key={status}
            onClick={() => onSelectStatus(statusPopup.taskId, status)}
            className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
              isSelected ? 'bg-gray-50' : ''
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${getStatusDotColor(status)}`}></span>
            {status}
            {isSelected && <span className="ml-auto text-accent-blue-text">✓</span>}
          </button>
        )
      })}
    </div>
  )
}
