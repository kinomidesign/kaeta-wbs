import React from 'react'
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
  onDeletePhase
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-dashboard-card rounded-[16px] w-full max-w-md shadow-lg" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-dashboard-text-main">フェーズ管理</h2>
            <button onClick={onClose} className="text-dashboard-text-muted hover:text-dashboard-text-main text-2xl">×</button>
          </div>

          {/* 新規追加 */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newPhaseName}
              onChange={(e) => setNewPhaseName(e.target.value)}
              className="flex-1 border border-dashboard-border rounded-md px-3 py-2"
              placeholder="新しいフェーズ名"
            />
            <button
              onClick={onAddPhase}
              disabled={!newPhaseName.trim()}
              className="bg-dashboard-primary text-white px-4 py-2 rounded-md hover:bg-gray-800 disabled:opacity-50"
            >
              追加
            </button>
          </div>

          {/* フェーズ一覧 */}
          <div className="space-y-2">
            {phases.length === 0 && (
              <p className="text-dashboard-text-muted text-sm text-center py-4">
                フェーズがありません。<br />
                Supabaseにphasesテーブルを作成してください。
              </p>
            )}
            {phases.map(phase => (
              <div key={phase.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                {editingPhase?.id === phase.id ? (
                  <>
                    <input
                      type="text"
                      value={editingPhase.name}
                      onChange={(e) => setEditingPhase({ ...editingPhase, name: e.target.value })}
                      className="flex-1 border border-dashboard-border rounded px-2 py-1 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => onUpdatePhase(phase.id, editingPhase.name)}
                      className="text-accent-blue-text text-sm hover:underline"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => setEditingPhase(null)}
                      className="text-dashboard-text-muted text-sm hover:underline"
                    >
                      取消
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-dashboard-text-main">{phase.name}</span>
                    <button
                      onClick={() => setEditingPhase(phase)}
                      className="text-accent-blue-text text-sm hover:underline"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => onDeletePhase(phase.id)}
                      className="text-red-500 text-sm hover:underline"
                    >
                      削除
                    </button>
                  </>
                )}
              </div>
            ))}
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
