import React from 'react'
import { isWeekend, isMonday, isFirstOfMonth, isToday, getDateFromIndex } from '@/utils/date'
import { DAY_WIDTH, TOTAL_TIMELINE_DAYS } from '@/constants'
import type { VirtualItem } from '@tanstack/react-virtual'

interface GanttDateHeaderProps {
  virtualItems: VirtualItem[]
  totalSize: number
}

export const GanttDateHeader: React.FC<GanttDateHeaderProps> = ({
  virtualItems,
  totalSize
}) => {
  return (
    <div className="sticky top-0 bg-white z-20 border-b border-dashboard-border">
      <div
        className="flex relative bg-white"
        style={{ width: totalSize, height: 28 }}
      >
        {virtualItems.map((virtualItem) => {
          const date = getDateFromIndex(virtualItem.index)
          const weekend = isWeekend(date)
          const monday = isMonday(date)
          const firstOfMonth = isFirstOfMonth(date)
          const today = isToday(date)
          const showLabel = monday || firstOfMonth || virtualItem.index === 0

          return (
            <div
              key={virtualItem.key}
              className={`absolute top-0 text-center border-r border-gray-100 ${weekend ? 'bg-gray-100' : 'bg-white'}`}
              style={{
                left: virtualItem.start,
                width: DAY_WIDTH,
                height: 28
              }}
            >
              {showLabel ? (
                <div
                  className={`text-xs font-medium py-1 border-b h-full flex items-center justify-center ${weekend ? 'bg-gray-100' : 'bg-gray-50'} ${today ? 'border-b-4' : 'border-dashboard-border'}`}
                  style={{
                    color: '#009EA4',
                    borderBottomColor: today ? '#009EA4' : undefined
                  }}
                >
                  {date.getMonth() + 1}/{date.getDate()}
                </div>
              ) : (
                <div
                  className={`text-xs py-1 h-full flex items-center justify-center ${weekend ? 'bg-gray-100' : 'bg-white'} ${today ? 'border-b-4 font-medium' : 'border-b border-dashboard-border'}`}
                  style={{
                    color: today ? '#009EA4' : undefined,
                    borderBottomColor: today ? '#009EA4' : undefined
                  }}
                >
                  {date.getDate()}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
