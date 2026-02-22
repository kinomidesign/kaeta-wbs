import React, { useState } from 'react'
import { DayPicker, DateRange } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import * as dateFnsLocale from 'date-fns/locale'
import type { Task, Phase, Category, EditingTask } from '@/types'
import { OWNERS, STATUSES } from '@/constants'
import { getStatusColor } from '@/utils/style'
import { formatDateString } from '@/utils/date'

const ja = dateFnsLocale.ja

// 編集アイコン（鉛筆）
const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
)

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
  const [showOwnerDropdown, setShowOwnerDropdown] = useState(false)

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range)
    if (range?.from) {
      setEditingTask(prev => ({
        ...prev,
        start_date: formatDateString(range.from!),
        end_date: range.to ? formatDateString(range.to) : formatDateString(range.from!)
      }))
    }
  }

  const selectedPhase = phases.find(p => p.name === editingTask.phase)
  const phaseCategories = selectedPhase
    ? categories.filter(c => c.phase_id === selectedPhase.id).sort((a, b) => a.sort_order - b.sort_order)
    : []

  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-dashboard-card rounded-[16px] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-lg" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          {/* ヘッダー */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-dashboard-text-main">
              {mode === 'add' ? 'タスクを追加' : 'タスクを編集'}
            </h2>
            <button onClick={onClose} className="text-dashboard-text-muted hover:text-dashboard-text-main text-xl leading-none">×</button>
          </div>

          <div className="space-y-6">
            {/* タスク名 - 枠線なし、大きいプレースホルダー */}
            <div>
              <input
                type="text"
                value={editingTask.name}
                onChange={(e) => setEditingTask({ ...editingTask, name: e.target.value })}
                className="w-full text-2xl font-medium text-dashboard-text-main placeholder:text-dashboard-text-muted/60 bg-transparent border-none outline-none focus:ring-0"
                placeholder="タスク名を入力..."
                autoFocus
              />
            </div>

            {/* 日付・担当者・ステータス - 3列グリッド */}
            <div className="grid grid-cols-3 gap-6">
              {/* 日付 */}
              <div className="relative">
                <label className="block text-sm text-dashboard-text-muted mb-1">日付</label>
                <button
                  type="button"
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="text-sm text-dashboard-text-main hover:text-dashboard-text-muted text-left"
                >
                  {editingTask.start_date && editingTask.end_date
                    ? `${editingTask.start_date} ~ ${editingTask.end_date}`
                    : '未設定'}
                </button>
                {showDatePicker && (
                  <div className="absolute z-50 mt-1 left-0 bg-dashboard-card rounded-lg shadow-lg border border-dashboard-border p-2">
                    <DayPicker
                      mode="range"
                      selected={dateRange}
                      onSelect={handleDateRangeSelect}
                      locale={ja}
                      numberOfMonths={1}
                      className="text-sm"
                    />
                    <div className="flex justify-between mt-2 border-t border-dashboard-border pt-2">
                      {editingTask.start_date && (
                        <button
                          type="button"
                          onClick={() => {
                            setDateRange(undefined)
                            setEditingTask(prev => ({ ...prev, start_date: '', end_date: '' }))
                          }}
                          className="text-sm text-red-500 hover:text-red-700"
                        >
                          クリア
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowDatePicker(false)}
                        className="text-sm text-dashboard-text-muted hover:text-dashboard-text-main ml-auto"
                      >
                        閉じる
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 担当者 */}
              <div className="relative">
                <label className="block text-sm text-dashboard-text-muted mb-1">担当者</label>
                <button
                  type="button"
                  onClick={() => setShowOwnerDropdown(!showOwnerDropdown)}
                  className="text-sm text-dashboard-text-main hover:text-dashboard-text-muted text-left"
                >
                  {editingTask.owner || '未入力'}
                </button>
                {showOwnerDropdown && (
                  <div className="absolute z-50 mt-1 left-0 bg-dashboard-card rounded-lg shadow-lg border border-dashboard-border py-1 min-w-[120px]">
                    {OWNERS.map(o => (
                      <button
                        key={o}
                        type="button"
                        onClick={() => {
                          setEditingTask({ ...editingTask, owner: o })
                          setShowOwnerDropdown(false)
                        }}
                        className={`w-full px-3 py-2 text-sm text-left hover:bg-gray-100 ${
                          editingTask.owner === o ? 'bg-gray-50 font-medium' : ''
                        }`}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ステータス */}
              <div>
                <label className="block text-sm text-dashboard-text-muted mb-1">ステータス</label>
                <span className={`inline-block text-sm px-2 py-0.5 rounded-full ${getStatusColor(editingTask.status)}`}>
                  {editingTask.status}
                </span>
              </div>
            </div>

            {/* フェーズ */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-dashboard-text-muted">フェーズ</label>
                <button
                  type="button"
                  className="text-dashboard-text-muted hover:text-dashboard-text-main"
                  title="フェーズを編集"
                >
                  <EditIcon />
                </button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {phaseNames.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setEditingTask({ ...editingTask, phase: p, category: '' })}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      editingTask.phase === p
                        ? 'bg-dashboard-primary text-white'
                        : 'bg-gray-100 text-dashboard-text-muted hover:bg-gray-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* カテゴリ - ピルボタン形式 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-dashboard-text-muted">カテゴリ</label>
                <button
                  type="button"
                  onClick={() => selectedPhase && onOpenCategoryModal(selectedPhase.id)}
                  className="text-dashboard-text-muted hover:text-dashboard-text-main"
                  title="カテゴリを編集"
                >
                  <EditIcon />
                </button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {phaseCategories.length > 0 ? (
                  phaseCategories.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setEditingTask({ ...editingTask, category: cat.name })}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        editingTask.category === cat.name
                          ? 'bg-gray-200 text-dashboard-text-main'
                          : 'bg-gray-100 text-dashboard-text-muted hover:bg-gray-200'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))
                ) : (
                  <span className="text-sm text-dashboard-text-muted">カテゴリがありません</span>
                )}
              </div>
            </div>

            {/* メモ - 枠線なし */}
            <div>
              <label className="block text-sm text-dashboard-text-muted mb-1">メモ</label>
              <textarea
                value={editingTask.note}
                onChange={(e) => setEditingTask({ ...editingTask, note: e.target.value })}
                className="w-full bg-transparent border-none outline-none focus:ring-0 text-sm text-dashboard-text-main placeholder:text-dashboard-text-muted/60 resize-none"
                placeholder="補足情報を入力..."
                rows={2}
              />
            </div>
          </div>

          {/* フッター */}
          <div className="flex justify-end items-center gap-3 mt-6 pt-4">
            {mode === 'edit' && onDelete && (
              <button
                onClick={onDelete}
                className="text-red-500 hover:text-red-700 text-sm mr-auto"
              >
                タスクを削除
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-dashboard-text-muted hover:text-dashboard-text-main border border-dashboard-border rounded-md"
            >
              キャンセル
            </button>
            <button
              onClick={onSave}
              disabled={!editingTask.name || saving}
              className="bg-dashboard-primary text-white px-6 py-2 text-sm rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? '保存中...' : mode === 'add' ? '追加する' : '保存する'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
