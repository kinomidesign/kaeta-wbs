import React from 'react'

export const LoadingSpinner: React.FC = () => {
  return (
    <div className="min-h-screen bg-dashboard-bg flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-blue mx-auto mb-4"></div>
        <p className="text-dashboard-text-muted">読み込み中...</p>
      </div>
    </div>
  )
}
