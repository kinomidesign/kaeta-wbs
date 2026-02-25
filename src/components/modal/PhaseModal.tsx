import React, { useState, useRef, useEffect } from 'react'
import type { Phase } from '@/types'

interface PhaseModalProps {
  phases: Phase[]
  newPhaseName: string
  setNewPhaseName: (name: string) => void
  editingPhase: Phase | null
  setEditingPhase: (phase: Phase | null) => void
  onClose: () => void
  onAddPhase: () => void
  onUpdatePhase: (id: number, name: string) => void
  onDeletePhase: (id: number) => void
  onReorderPhases: (orderedIds: number[]) => void
}

export const PhaseModal: React.FC<PhaseModalProps> = ({
  phases,
  newPhaseName,
  setNewPhaseName,
  editingPhase,
  setEditingPhase,
  onClose,
  onAddPhase,
  onUpdatePhase,
  onDeletePhase,
  onReorderPhases
}) => {
  const [isAdding, setIsAdding] = useState(false)
  const addInputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  // D&D state
  const [draggedId, setDraggedId] = useState<number | null>(null)
  const [dragOverId, setDragOverId] = useState<number | null>(null)
  const [dragOverPosition, setDragOverPosition] = useState<'before' | 'after'>('after')

  useEffect(() => {
    if (isAdding && addInputRef.current) {
      addInputRef.current.focus()
    }
  }, [isAdding])

  useEffect(() => {
    if (editingPhase && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingPhase])

  const handleAddSubmit = () => {
    if (!newPhaseName.trim()) return
    onAddPhase()
    setIsAdding(false)
  }

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddSubmit()
    } else if (e.key === 'Escape') {
      setNewPhaseName('')
      setIsAdding(false)
    }
  }

  const handleEditKeyDown = (e: React.KeyboardEvent, phaseId: number) => {
    if (e.key === 'Enter' && editingPhase) {
      onUpdatePhase(phaseId, editingPhase.name)
      setEditingPhase(null)
    } else if (e.key === 'Escape') {
      setEditingPhase(null)
    }
  }

  // D&D handlers
  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5'
    }
  }

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1'
    }
    setDraggedId(null)
    setDragOverId(null)
  }

  const handleDragOver = (e: React.DragEvent, id: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedId === id) return

    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const position = y < rect.height / 2 ? 'before' : 'after'
    setDragOverId(id)
    setDragOverPosition(position)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (!draggedId || !dragOverId || draggedId === dragOverId) {
      setDraggedId(null)
      setDragOverId(null)
      return
    }

    const sorted = [...phases].sort((a, b) => a.sort_order - b.sort_order)
    const ordered = sorted.map(p => p.id)
    const fromIdx = ordered.indexOf(draggedId)
    const toIdx = ordered.indexOf(dragOverId)
    if (fromIdx === -1 || toIdx === -1) return

    ordered.splice(fromIdx, 1)
    const insertIdx = dragOverPosition === 'before' ? ordered.indexOf(dragOverId) : ordered.indexOf(dragOverId) + 1
    ordered.splice(insertIdx, 0, draggedId)

    onReorderPhases(ordered)
    setDraggedId(null)
    setDragOverId(null)
  }

  const sortedPhases = [...phases].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-xl border border-gray-200/60"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-dashboard-text-main">フェーズ管理</h2>
            <span className="text-[10px] text-dashboard-text-muted bg-gray-200/70 rounded-full px-1.5 py-0.5 font-medium">
              {phases.length}
            </span>
          </div>
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
          {/* Phase list */}
          {sortedPhases.length === 0 && !isAdding && (
            <div className="px-5 py-8 text-center">
              <p className="text-xs text-gray-400">フェーズがありません</p>
            </div>
          )}

          {sortedPhases.map((phase) => {
            const showDropBefore = draggedId !== null && dragOverId === phase.id && dragOverPosition === 'before' && draggedId !== phase.id
            const showDropAfter = draggedId !== null && dragOverId === phase.id && dragOverPosition === 'after' && draggedId !== phase.id

            return (
              <div
                key={phase.id}
                draggable={editingPhase?.id !== phase.id}
                onDragStart={(e) => handleDragStart(e, phase.id)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, phase.id)}
                onDrop={handleDrop}
                className={`group/phaseitem relative flex items-center gap-1.5 px-3 py-0 border-b border-gray-50 hover:bg-gray-50/80 transition-colors ${
                  draggedId === phase.id ? 'opacity-50' : ''
                }`}
              >
                {/* Drop indicator (before) */}
                {showDropBefore && (
                  <div className="absolute top-0 left-3 right-3 h-0.5 bg-accent-blue-text rounded-full -translate-y-px z-10" />
                )}

                {editingPhase?.id === phase.id ? (
                  <div className="flex-1 flex items-center gap-2 py-1.5">
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editingPhase.name}
                      onChange={(e) => setEditingPhase({ ...editingPhase, name: e.target.value })}
                      onKeyDown={(e) => handleEditKeyDown(e, phase.id)}
                      onBlur={() => {
                        if (editingPhase.name.trim()) {
                          onUpdatePhase(phase.id, editingPhase.name)
                        }
                        setEditingPhase(null)
                      }}
                      className="flex-1 text-sm px-2 py-1 border border-accent-blue rounded-md outline-none focus:ring-2 focus:ring-accent-blue/50 bg-white"
                    />
                  </div>
                ) : (
                  <>
                    {/* Drag handle */}
                    <span className="w-5 flex-shrink-0 flex items-center justify-center text-gray-300 opacity-0 group-hover/phaseitem:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                      <svg width="8" height="14" viewBox="0 0 8 14" fill="currentColor">
                        <circle cx="2" cy="2" r="1.2" />
                        <circle cx="6" cy="2" r="1.2" />
                        <circle cx="2" cy="7" r="1.2" />
                        <circle cx="6" cy="7" r="1.2" />
                        <circle cx="2" cy="12" r="1.2" />
                        <circle cx="6" cy="12" r="1.2" />
                      </svg>
                    </span>

                    {/* Phase name */}
                    <span
                      className="flex-1 text-sm text-dashboard-text-main py-2.5 cursor-text min-w-0 truncate"
                      onClick={() => setEditingPhase(phase)}
                    >
                      {phase.name}
                    </span>

                    {/* Action buttons */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover/phaseitem:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingPhase(phase)}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-dashboard-text-main hover:bg-gray-100 transition-colors"
                        title="名前を変更"
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10 1.5l2.5 2.5M1.5 12.5l.5-2L9.5 3l2.5 2.5L4.5 13l-3 .5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`「${phase.name}」を削除しますか？`)) {
                            onDeletePhase(phase.id)
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

                {/* Drop indicator (after) */}
                {showDropAfter && (
                  <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-accent-blue-text rounded-full translate-y-px z-10" />
                )}
              </div>
            )
          })}

          {/* Inline add input */}
          {isAdding ? (
            <div className="flex items-center gap-2 px-5 py-2.5 border-b border-gray-50">
              <input
                ref={addInputRef}
                type="text"
                value={newPhaseName}
                onChange={(e) => setNewPhaseName(e.target.value)}
                onKeyDown={handleAddKeyDown}
                onBlur={() => {
                  if (newPhaseName.trim()) {
                    handleAddSubmit()
                  } else {
                    setIsAdding(false)
                  }
                }}
                className="flex-1 text-sm px-2 py-1 border border-accent-blue rounded-md outline-none focus:ring-2 focus:ring-accent-blue/50 bg-white"
                placeholder="フェーズ名を入力..."
              />
            </div>
          ) : (
            <button
              onClick={() => {
                setNewPhaseName('')
                setIsAdding(true)
              }}
              className="w-full flex items-center gap-1.5 px-5 py-2.5 text-xs text-gray-400 hover:text-accent-blue-text hover:bg-gray-50/80 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M6 1v10M1 6h10" />
              </svg>
              <span>フェーズを追加</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
