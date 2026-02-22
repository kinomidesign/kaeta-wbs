import React from 'react'
import { OWNERS } from '@/constants'
import { getTodayString } from '@/utils/date'
import type { CurrentViewDate } from '@/types'

interface HeaderProps {
  saving: boolean
  filterPhase: string
  setFilterPhase: (phase: string) => void
  filterOwner: string
  setFilterOwner: (owner: string) => void
  phaseNames: string[]
  onShowPhaseModal: () => void
  onShowCategoryModal: () => void
  onAddTask: () => void
  onScrollToDate: (date: string) => void
  currentViewDate?: CurrentViewDate
}

export const Header: React.FC<HeaderProps> = ({
  saving,
  filterPhase,
  setFilterPhase,
  filterOwner,
  setFilterOwner,
  phaseNames,
  onShowPhaseModal,
  onShowCategoryModal,
  onAddTask,
  onScrollToDate,
  currentViewDate
}) => {
  return (
    <div className="bg-dashboard-card border-b border-dashboard-border px-6 py-4 sticky top-0 z-30">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-dashboard-text-main">Kaeta! WBS / ガントチャート</h1>
          <p className="text-sm text-dashboard-text-muted">
            エンジニアと共有用プロジェクト管理
            {saving && <span className="ml-2 text-accent-blue-text">保存中...</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onShowPhaseModal}
            className="bg-dashboard-card hover:bg-gray-50 text-dashboard-text-main border border-dashboard-border px-4 py-2 rounded-md font-medium"
          >
            フェーズ管理
          </button>
          <button
            onClick={onShowCategoryModal}
            className="bg-dashboard-card hover:bg-gray-50 text-dashboard-text-main border border-dashboard-border px-4 py-2 rounded-md font-medium"
          >
            カテゴリ管理
          </button>
          <button
            onClick={onAddTask}
            className="bg-dashboard-primary hover:bg-gray-800 text-white px-4 py-2 rounded-md font-medium flex items-center gap-2"
          >
            <span className="text-xl">+</span> タスク追加
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-dashboard-text-muted">表示中:</span>
          <span className="text-sm font-medium text-dashboard-text-main">
            {currentViewDate ? `${currentViewDate.year}年${currentViewDate.month}月` : `${new Date().getFullYear()}年`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-dashboard-text-muted">フェーズ:</span>
          <select
            value={filterPhase}
            onChange={(e) => setFilterPhase(e.target.value)}
            className="border border-dashboard-border rounded-md px-2 py-1 text-sm"
          >
            <option value="all">すべて</option>
            {phaseNames.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-dashboard-text-muted">担当:</span>
          <select
            value={filterOwner}
            onChange={(e) => setFilterOwner(e.target.value)}
            className="border border-dashboard-border rounded-md px-2 py-1 text-sm"
          >
            <option value="all">すべて</option>
            {OWNERS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onScrollToDate(getTodayString())
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-dashboard-border hover:bg-gray-50 transition-colors text-accent-blue-text-text"
          title="今日の位置へスクロール"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 4v6h-6" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          今日に移動
        </button>
        <div className="flex gap-2 ml-auto">
          <span className="flex items-center gap-1 text-xs"><span className="w-3 h-3 rounded bg-accent-blue"></span>エンジニア</span>
          <span className="flex items-center gap-1 text-xs"><span className="w-3 h-3 rounded bg-accent-pink"></span>デザイナー</span>
          <span className="flex items-center gap-1 text-xs"><span className="w-3 h-3 rounded bg-accent-purple"></span>共同</span>
        </div>
      </div>
    </div>
  )
}
