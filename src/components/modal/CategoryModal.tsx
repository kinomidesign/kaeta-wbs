import React from 'react'
import type { Phase, Category } from '@/types'

interface CategoryModalProps {
  phases: Phase[]
  categories: Category[]
  newCategoryName: string
  setNewCategoryName: (name: string) => void
  selectedPhaseForCategory: number | null
  setSelectedPhaseForCategory: (phaseId: number | null) => void
  editingCategory: Category | null
  setEditingCategory: (category: Category | null) => void
  onClose: () => void
  onAddCategory: () => void
  onUpdateCategory: (id: number, name: string) => void
  onDeleteCategory: (id: number) => void
  onMoveCategoryOrder: (categoryId: number, direction: 'up' | 'down') => void
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  phases,
  categories,
  newCategoryName,
  setNewCategoryName,
  selectedPhaseForCategory,
  setSelectedPhaseForCategory,
  editingCategory,
  setEditingCategory,
  onClose,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onMoveCategoryOrder
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-dashboard-card rounded-[16px] w-full max-w-lg max-h-[80vh] overflow-hidden shadow-lg" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-dashboard-text-main">カテゴリ管理</h2>
            <button onClick={onClose} className="text-dashboard-text-muted hover:text-dashboard-text-main text-2xl">×</button>
          </div>

          {/* 新規追加 */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-dashboard-text-muted mb-2">新規カテゴリを追加</p>
            <div className="flex gap-2 mb-2">
              <select
                value={selectedPhaseForCategory ?? ''}
                onChange={(e) => setSelectedPhaseForCategory(e.target.value ? Number(e.target.value) : null)}
                className="border border-dashboard-border rounded-md px-3 py-2 text-sm"
              >
                <option value="">フェーズを選択</option>
                {phases.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-1 border border-dashboard-border rounded-md px-3 py-2 text-sm"
                placeholder="カテゴリ名"
              />
              <button
                onClick={onAddCategory}
                disabled={!newCategoryName.trim() || !selectedPhaseForCategory}
                className="bg-dashboard-primary text-white px-4 py-2 rounded-md hover:bg-gray-800 disabled:opacity-50 text-sm whitespace-nowrap"
              >
                追加
              </button>
            </div>
          </div>

          {/* フェーズごとのカテゴリ一覧 */}
          <div className="overflow-y-auto max-h-[50vh] space-y-4">
            {phases.map(phase => {
              const phaseCategories = categories
                .filter(c => c.phase_id === phase.id)
                .sort((a, b) => a.sort_order - b.sort_order)

              return (
                <div key={phase.id} className="border border-dashboard-border rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-4 py-2 font-medium text-dashboard-text-main text-sm">
                    {phase.name}
                    <span className="text-dashboard-text-muted font-normal ml-2">
                      ({phaseCategories.length} カテゴリ)
                    </span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {phaseCategories.length === 0 && (
                      <p className="text-dashboard-text-muted text-sm text-center py-4">
                        カテゴリがありません
                      </p>
                    )}
                    {phaseCategories.map((cat, index) => (
                      <div key={cat.id} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50">
                        {editingCategory?.id === cat.id ? (
                          <>
                            <input
                              type="text"
                              value={editingCategory.name}
                              onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                              className="flex-1 border border-dashboard-border rounded px-2 py-1 text-sm"
                              autoFocus
                            />
                            <button
                              onClick={() => onUpdateCategory(cat.id, editingCategory.name)}
                              className="text-accent-blue-text text-sm hover:underline"
                            >
                              保存
                            </button>
                            <button
                              onClick={() => setEditingCategory(null)}
                              className="text-dashboard-text-muted text-sm hover:underline"
                            >
                              取消
                            </button>
                          </>
                        ) : (
                          <>
                            {/* 並び替えボタン */}
                            <div className="flex flex-col gap-0.5">
                              <button
                                onClick={() => onMoveCategoryOrder(cat.id, 'up')}
                                disabled={index === 0}
                                className="w-5 h-5 flex items-center justify-center text-dashboard-text-muted hover:text-dashboard-text-main disabled:opacity-30 disabled:cursor-not-allowed"
                                title="上へ移動"
                              >
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                                  <path d="M5 2L9 7H1L5 2Z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => onMoveCategoryOrder(cat.id, 'down')}
                                disabled={index === phaseCategories.length - 1}
                                className="w-5 h-5 flex items-center justify-center text-dashboard-text-muted hover:text-dashboard-text-main disabled:opacity-30 disabled:cursor-not-allowed"
                                title="下へ移動"
                              >
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                                  <path d="M5 8L1 3H9L5 8Z" />
                                </svg>
                              </button>
                            </div>
                            <span className="flex-1 text-dashboard-text-main text-sm">{cat.name}</span>
                            <button
                              onClick={() => setEditingCategory(cat)}
                              className="text-accent-blue-text text-xs hover:underline"
                            >
                              編集
                            </button>
                            <button
                              onClick={() => onDeleteCategory(cat.id)}
                              className="text-red-500 text-xs hover:underline"
                            >
                              削除
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-dashboard-border">
            <button
              onClick={onClose}
              className="w-full bg-gray-100 text-dashboard-text-main px-4 py-2 rounded-md hover:bg-gray-200"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
