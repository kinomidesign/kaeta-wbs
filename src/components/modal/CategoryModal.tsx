import React, { useState, useRef, useEffect } from 'react'
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
  const [addingToPhase, setAddingToPhase] = useState<number | null>(null)
  const [localNewName, setLocalNewName] = useState('')
  const addInputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (addingToPhase !== null && addInputRef.current) {
      addInputRef.current.focus()
    }
  }, [addingToPhase])

  useEffect(() => {
    if (editingCategory && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingCategory])

  const handleAddSubmit = (phaseId: number) => {
    if (!localNewName.trim()) return
    setNewCategoryName(localNewName.trim())
    setSelectedPhaseForCategory(phaseId)
    // Defer the add call to let state update
    setTimeout(() => {
      onAddCategory()
      setLocalNewName('')
      setAddingToPhase(null)
    }, 0)
  }

  const handleAddKeyDown = (e: React.KeyboardEvent, phaseId: number) => {
    if (e.key === 'Enter') {
      handleAddSubmit(phaseId)
    } else if (e.key === 'Escape') {
      setLocalNewName('')
      setAddingToPhase(null)
    }
  }

  const handleEditKeyDown = (e: React.KeyboardEvent, catId: number) => {
    if (e.key === 'Enter' && editingCategory) {
      onUpdateCategory(catId, editingCategory.name)
      setEditingCategory(null)
    } else if (e.key === 'Escape') {
      setEditingCategory(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-xl border border-gray-200/60"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-dashboard-text-main">カテゴリ管理</h2>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-dashboard-text-muted hover:text-dashboard-text-main transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 1l12 12M13 1L1 13" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(80vh-57px)]">
          {phases.map(phase => {
            const phaseCategories = categories
              .filter(c => c.phase_id === phase.id)
              .sort((a, b) => a.sort_order - b.sort_order)

            return (
              <div key={phase.id}>
                {/* Phase header */}
                <div className="px-5 py-2.5 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-dashboard-text-muted uppercase tracking-wide">{phase.name}</span>
                    <span className="text-[10px] text-dashboard-text-muted bg-gray-200/70 rounded-full px-1.5 py-0.5 font-medium">
                      {phaseCategories.length}
                    </span>
                  </div>
                </div>

                {/* Category list */}
                <div>
                  {phaseCategories.map((cat, index) => (
                    <div
                      key={cat.id}
                      className="group/catitem flex items-center gap-1.5 px-3 py-0 border-b border-gray-50 hover:bg-gray-50/80 transition-colors"
                    >
                      {editingCategory?.id === cat.id ? (
                        // Edit mode
                        <div className="flex-1 flex items-center gap-2 py-1.5">
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editingCategory.name}
                            onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                            onKeyDown={(e) => handleEditKeyDown(e, cat.id)}
                            onBlur={() => {
                              if (editingCategory.name.trim()) {
                                onUpdateCategory(cat.id, editingCategory.name)
                              }
                              setEditingCategory(null)
                            }}
                            className="flex-1 text-sm px-2 py-1 border border-accent-blue rounded-md outline-none focus:ring-2 focus:ring-accent-blue/50 bg-white"
                          />
                        </div>
                      ) : (
                        // View mode
                        <>
                          {/* Sort up/down */}
                          <div className="flex flex-col opacity-0 group-hover/catitem:opacity-100 transition-opacity">
                            <button
                              onClick={() => onMoveCategoryOrder(cat.id, 'up')}
                              disabled={index === 0}
                              className="w-4 h-3 flex items-center justify-center text-gray-400 hover:text-dashboard-text-main disabled:opacity-0 disabled:cursor-default transition-colors"
                              title="上へ移動"
                            >
                              <svg width="8" height="5" viewBox="0 0 8 5" fill="currentColor">
                                <path d="M4 0L8 5H0L4 0Z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => onMoveCategoryOrder(cat.id, 'down')}
                              disabled={index === phaseCategories.length - 1}
                              className="w-4 h-3 flex items-center justify-center text-gray-400 hover:text-dashboard-text-main disabled:opacity-0 disabled:cursor-default transition-colors"
                              title="下へ移動"
                            >
                              <svg width="8" height="5" viewBox="0 0 8 5" fill="currentColor">
                                <path d="M4 5L0 0h8L4 5Z" />
                              </svg>
                            </button>
                          </div>

                          {/* Drag handle (grip dots) */}
                          <span className="w-4 flex items-center justify-center text-gray-300 opacity-0 group-hover/catitem:opacity-100 transition-opacity cursor-grab">
                            <svg width="6" height="10" viewBox="0 0 6 10" fill="currentColor">
                              <circle cx="1.5" cy="1.5" r="1" />
                              <circle cx="4.5" cy="1.5" r="1" />
                              <circle cx="1.5" cy="5" r="1" />
                              <circle cx="4.5" cy="5" r="1" />
                              <circle cx="1.5" cy="8.5" r="1" />
                              <circle cx="4.5" cy="8.5" r="1" />
                            </svg>
                          </span>

                          {/* Category name */}
                          <span
                            className="flex-1 text-sm text-dashboard-text-main py-2 cursor-text min-w-0 truncate"
                            onClick={() => setEditingCategory(cat)}
                          >
                            {cat.name}
                          </span>

                          {/* Action buttons (visible on hover) */}
                          <div className="flex items-center gap-0.5 opacity-0 group-hover/catitem:opacity-100 transition-opacity">
                            <button
                              onClick={() => setEditingCategory(cat)}
                              className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-dashboard-text-main hover:bg-gray-100 transition-colors"
                              title="名前を変更"
                            >
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10 1.5l2.5 2.5M1.5 12.5l.5-2L9.5 3l2.5 2.5L4.5 13l-3 .5z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`「${cat.name}」を削除しますか？`)) {
                                  onDeleteCategory(cat.id)
                                }
                              }}
                              className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="削除"
                            >
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2.5 3.5h9M5.5 3.5V2a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1.5M3.5 3.5l.5 8.5a1 1 0 001 1h4a1 1 0 001-1l.5-8.5" />
                              </svg>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}

                  {/* Empty state */}
                  {phaseCategories.length === 0 && addingToPhase !== phase.id && (
                    <div className="px-5 py-4 text-center">
                      <p className="text-xs text-gray-400">カテゴリがありません</p>
                    </div>
                  )}

                  {/* Inline add input */}
                  {addingToPhase === phase.id ? (
                    <div className="flex items-center gap-2 px-5 py-2 border-b border-gray-50">
                      <input
                        ref={addInputRef}
                        type="text"
                        value={localNewName}
                        onChange={(e) => setLocalNewName(e.target.value)}
                        onKeyDown={(e) => handleAddKeyDown(e, phase.id)}
                        onBlur={() => {
                          if (localNewName.trim()) {
                            handleAddSubmit(phase.id)
                          } else {
                            setAddingToPhase(null)
                          }
                        }}
                        className="flex-1 text-sm px-2 py-1 border border-accent-blue rounded-md outline-none focus:ring-2 focus:ring-accent-blue/50 bg-white"
                        placeholder="カテゴリ名を入力..."
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setAddingToPhase(phase.id)
                        setLocalNewName('')
                      }}
                      className="w-full flex items-center gap-1.5 px-5 py-2 text-xs text-gray-400 hover:text-accent-blue-text hover:bg-gray-50/80 transition-colors border-b border-gray-100/50"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <path d="M6 1v10M1 6h10" />
                      </svg>
                      <span>カテゴリを追加</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
