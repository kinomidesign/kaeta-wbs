import React from 'react'
import { isWeekend, isMonday, isFirstOfMonth, isToday } from '@/utils/date'

interface GanttDateHeaderProps {
  dateRange: Date[]
}

export const GanttDateHeader: React.FC<GanttDateHeaderProps> = ({ dateRange }) => {
  return (
    <div className="sticky top-0 bg-dashboard-card z-20 border-b border-dashboard-border">
      <div className="flex">
        {dateRange.map((date, i) => {
          const weekend = isWeekend(date)
          const monday = isMonday(date)
          const firstOfMonth = isFirstOfMonth(date)
          const today = isToday(date)
          const showLabel = monday || firstOfMonth || i === 0

          return (
            <div
              key={i}
              className={`w-8 flex-shrink-0 text-center border-r border-gray-100 ${weekend ? 'bg-gray-50' : ''}`}
            >
              {showLabel ? (
                <div
                  className={`text-xs font-medium py-1 border-b bg-gray-50 ${today ? 'border-b-4' : 'border-dashboard-border'}`}
                  style={{
                    color: '#009EA4',
                    borderBottomColor: today ? '#009EA4' : undefined
                  }}
                >
                  {date.getMonth() + 1}/{date.getDate()}
                </div>
              ) : (
                <div
                  className={`text-xs py-1 ${today ? 'border-b-4 font-medium' : 'border-b border-dashboard-border'}`}
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
