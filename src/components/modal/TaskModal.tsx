import React, { useState } from 'react'
import { DayPicker, DateRange } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import * as dateFnsLocale from 'date-fns/locale'
import type { Task, Phase, Category, EditingTask } from '@/types'
import { OWNERS, PRIORITIES, STATUSES } from '@/constants'
import { getStatusColor, getOwnerColor } from '@/utils/style'

const ja = dateFnsLocale.ja

interface TaskModalProps {
  mode: 'add' | 'edit'
  editingTask: EditingTask
  setEditingTask: React.Dispatch<React.SetStateAction<EditingTask>>
  phaseNames: string[]
  phases: Phase[]
  categories: Category[]
  saving: boolean
  onClose: () => void
  onSave: () => void
  onDelete?: () => void
  onOpenCategoryModal: (phaseId: number) => void
}

export const TaskModal: React.FC<TaskModalProps> = ({
  mode,
  editingTask,
  setEditingTask,
  phaseNames,
  phases,
  categories,
  saving,
  onClose,
  onSave,
  onDelete,
  onOpenCategoryModal
}) => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    if (editingTask.start_date && editingTask.end_date) {
      return {
        from: new Date(editingTask.start_date),
        to: new Date(editingTask.end_date)
      }
    }
    return undefined
  })
  const [showDatePicker, setShowDatePicker] = useState(false)

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range)
    if (range?.from) {
      setEditingTask(prev => ({
        ...prev,
        start_date: range.from!.toISOString().split('T')[0],
        end_date: range.to ? range.to.toISOString().split('T')[0] : range.from!.toISOString().split('T')[0]
      }))
    }
  }

  const selectedPhase = phases.find(p => p.name === editingTask.phase)
  const phaseCategories = selectedPhase
    ? categories.filter(c => c.phase_id === selectedPhase.id).sort((a, b) => a.sort_order - b.sort_order)
    : []

  const isCategoryNotInDB = editingTask.category && !categories.find(c => {
    return selectedPhase && c.phase_id === selectedPhase.id && c.name === editingTask.category
  })

  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-dashboard-card rounded-[16px] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-lg" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-dashboard-text-main">
              {mode === 'add' ? 'タスクを追加' : 'タスクを編集'}
            </h2>
            <button onClick={onClose} className="text-dashboard-text-muted hover:text-dashboard-text-main text-2xl">×</button>
          </div>

          <div className="space-y-4">
            {/* タスク名 */}
            <div>
              <label className="block text-sm font-medium text-dashboard-text-muted mb-1">タスク名 *</label>
              <input
                type="text"
                value={editingTask.name}
                onChange={(e) => setEditingTask({ ...editingTask, name: e.target.value })}
                className="w-full border border-dashboard-border rounded-md px-3 py-2"
                placeholder="タスク名を入力"
              />
            </div>

            {/* フェーズ */}
            <div>
              <label className="block text-sm font-medium text-dashboard-text-muted mb-2">フェーズ</label>
              <div className="flex gap-2 flex-wrap">
                {phaseNames.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setEditingTask({ ...editingTask, phase: p })}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      editingTask.phase === p
                        ? 'bg-dashboard-primary text-white shadow-md'
                        : 'bg-gray-100 text-dashboard-text-muted hover:bg-gray-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* カテゴリ */}
            <div>
              <label className="block text-sm font-medium text-dashboard-text-muted mb-1">カテゴリ</label>
              <div className="flex gap-2">
                <select
                  value={editingTask.category}
                  onChange={(e) => setEditingTask({ ...editingTask, category: e.target.value })}
                  className="flex-1 border border-dashboard-border rounded-md px-3 py-2"
                >
                  <option value="">カテゴリを選択</option>
                  {phaseCategories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => selectedPhase && onOpenCategoryModal(selectedPhase.id)}
                  className="px-3 py-2 text-sm text-accent-blue-text hover:bg-gray-100 rounded-md border border-dashboard-border whitespace-nowrap"
                  title="カテゴリを追加・編集"
                >
                  管理
                </button>
              </div>
              {isCategoryNotInDB && (
                <p className="text-xs text-yellow-600 mt-1">
                  ※ このカテゴリはまだDBに登録されていません。「管理」からカテゴリを追加してください。
                </p>
              )}
            </div>

            {/* 担当者・優先度 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dashboard-text-muted mb-2">担当者</label>
                <div className="flex gap-2 flex-wrap">
                  {OWNERS.map(o => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => setEditingTask({ ...editingTask, owner: o })}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium border-2 transition-all ${
                        editingTask.owner === o
                          ? `${getOwnerColor(o)} border-current ring-2 ring-offset-1`
                          : 'bg-gray-50 text-dashboard-text-muted border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-dashboard-text-muted mb-2">優先度</label>
                <div className="flex gap-2 flex-wrap">
                  {PRIORITIES.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setEditingTask({ ...editingTask, priority: p })}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium border-2 transition-all ${
                        editingTask.priority === p
                          ? p === '必須' ? 'bg-red-100 text-red-700 border-red-300 ring-2 ring-red-200 ring-offset-1'
                          : p === '推奨' ? 'bg-yellow-100 text-yellow-700 border-yellow-300 ring-2 ring-yellow-200 ring-offset-1'
                          : 'bg-gray-100 text-dashboard-text-main border-gray-300 ring-2 ring-gray-200 ring-offset-1'
                          : 'bg-gray-50 text-dashboard-text-muted border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ステータス（編集時のみ） */}
            {mode === 'edit' && (
              <div>
                <label className="block text-sm font-medium text-dashboard-text-muted mb-2">ステータス</label>
                <div className="flex gap-2 flex-wrap">
                  {STATUSES.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setEditingTask({ ...editingTask, status: s })}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        editingTask.status === s
                          ? getStatusColor(s)
                          : 'bg-gray-50 text-dashboard-text-muted hover:bg-gray-100'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 期間選択 */}
            <div>
              <label className="block text-sm font-medium text-dashboard-text-muted mb-2">期間 *</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="w-full border border-dashboard-border rounded-md px-3 py-2 text-left flex justify-between items-center"
                >
                  <span className={editingTask.start_date ? 'text-dashboard-text-main' : 'text-dashboard-text-muted'}>
                    {editingTask.start_date && editingTask.end_date
                      ? `${editingTask.start_date} 〜 ${editingTask.end_date}`
                      : '日付を選択してください'}
                  </span>
                  <span>📅</span>
                </button>

                {showDatePicker && (
                  <div className="absolute z-50 mt-1 bg-dashboard-card rounded-md shadow-lg border border-dashboard-border p-2">
                    <DayPicker
                      mode="range"
                      selected={dateRange}
                      onSelect={handleDateRangeSelect}
                      locale={ja}
                      numberOfMonths={1}
                      className="text-sm"
                    />
                    <div className="flex justify-end mt-2 border-t border-dashboard-border pt-2">
                      <button
                        type="button"
                        onClick={() => setShowDatePicker(false)}
                        className="text-sm text-accent-blue-text hover:underline"
                      >
                        閉じる
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 工数 */}
            <div>
              <label className="block text-sm font-medium text-dashboard-text-muted mb-1">工数</label>
              <input
                type="text"
                value={editingTask.effort}
                onChange={(e) => setEditingTask({ ...editingTask, effort: e.target.value })}
                className="w-full border border-dashboard-border rounded-md px-3 py-2"
                placeholder="例: 2-3時間、要見積もり"
              />
            </div>

            {/* メモ */}
            <div>
              <label className="block text-sm font-medium text-dashboard-text-muted mb-1">メモ</label>
              <textarea
                value={editingTask.note}
                onChange={(e) => setEditingTask({ ...editingTask, note: e.target.value })}
                className="w-full border border-dashboard-border rounded-md px-3 py-2 h-20"
                placeholder="補足情報を入力..."
              />
            </div>
          </div>

          {/* フッター */}
          <div className="flex justify-between mt-6 pt-4 border-t border-dashboard-border">
            {mode === 'edit' && onDelete ? (
              <button
                onClick={onDelete}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                タスクを削除
              </button>
            ) : (
              <div></div>
            )}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-dashboard-text-muted hover:text-dashboard-text-main"
              >
                キャンセル
              </button>
              <button
                onClick={onSave}
                disabled={!editingTask.name || !editingTask.start_date || !editingTask.end_date || saving}
                className="bg-dashboard-primary text-white px-6 py-2 rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? '保存中...' : mode === 'add' ? '追加する' : '保存する'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
