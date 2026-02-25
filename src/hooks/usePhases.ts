import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import type { Phase, Task } from '@/types'
import { DEFAULT_PHASES } from '@/constants'

interface UsePhasesReturn {
  phases: Phase[]
  setPhases: React.Dispatch<React.SetStateAction<Phase[]>>
  phaseNames: string[]
  fetchPhases: () => Promise<void>
  addPhase: (name: string) => Promise<Phase | null>
  updatePhase: (id: number, name: string, tasks: Task[], fetchTasks: () => Promise<void>) => Promise<boolean>
  deletePhase: (id: number, tasks: Task[], fetchTasks: () => Promise<void>) => Promise<boolean>
  reorderPhases: (orderedIds: number[]) => Promise<void>
  // モーダル用の状態
  newPhaseName: string
  setNewPhaseName: React.Dispatch<React.SetStateAction<string>>
  editingPhase: Phase | null
  setEditingPhase: React.Dispatch<React.SetStateAction<Phase | null>>
}

export const usePhases = (): UsePhasesReturn => {
  const [phases, setPhases] = useState<Phase[]>([])
  const [newPhaseName, setNewPhaseName] = useState('')
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null)

  // 利用可能なフェーズ名リスト
  const phaseNames = useMemo(() => {
    if (phases.length > 0) {
      return phases.map(p => p.name)
    }
    return [...DEFAULT_PHASES]
  }, [phases])

  // データ取得
  const fetchPhases = async () => {
    const { data, error } = await supabase
      .from('phases')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching phases:', error)
      // phasesテーブルがない場合はデフォルト使用
    } else if (data && data.length > 0) {
      setPhases(data)
    }
  }

  useEffect(() => {
    fetchPhases()
  }, [])

  // フェーズ追加
  const addPhase = async (name: string): Promise<Phase | null> => {
    if (!name.trim()) return null

    const maxOrder = phases.length > 0 ? Math.max(...phases.map(p => p.sort_order)) : 0
    const { data, error } = await supabase
      .from('phases')
      .insert([{ name: name.trim(), sort_order: maxOrder + 1 }])
      .select()

    if (error) {
      console.error('Error adding phase:', error)
      return null
    }

    if (data) {
      setPhases(prev => [...prev, data[0]])
      setNewPhaseName('')
      return data[0]
    }

    return null
  }

  // フェーズ更新
  const updatePhase = async (
    id: number,
    name: string,
    tasks: Task[],
    fetchTasks: () => Promise<void>
  ): Promise<boolean> => {
    const oldPhase = phases.find(p => p.id === id)
    if (!oldPhase) return false

    const { error } = await supabase
      .from('phases')
      .update({ name })
      .eq('id', id)

    if (error) {
      console.error('Error updating phase:', error)
      return false
    }

    setPhases(prev => prev.map(p => p.id === id ? { ...p, name } : p))

    // タスクのphaseも更新
    if (oldPhase.name !== name) {
      await supabase
        .from('tasks')
        .update({ phase: name })
        .eq('phase', oldPhase.name)
      fetchTasks()
    }

    setEditingPhase(null)
    return true
  }

  // フェーズ削除
  const deletePhase = async (
    id: number,
    tasks: Task[],
    fetchTasks: () => Promise<void>
  ): Promise<boolean> => {
    const phase = phases.find(p => p.id === id)
    if (!phase) return false

    const tasksInPhase = tasks.filter(t => t.phase === phase.name)
    if (tasksInPhase.length > 0) {
      if (!confirm(`このフェーズには${tasksInPhase.length}件のタスクがあります。フェーズを削除するとタスクも削除されます。続行しますか？`)) {
        return false
      }
      await supabase.from('tasks').delete().eq('phase', phase.name)
    }

    const { error } = await supabase
      .from('phases')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting phase:', error)
      return false
    }

    setPhases(prev => prev.filter(p => p.id !== id))
    fetchTasks()
    return true
  }

  // フェーズの並び順を一括更新（D&D用）
  const reorderPhases = async (orderedIds: number[]) => {
    setPhases(prev => {
      const updated = prev.map(p => {
        const idx = orderedIds.indexOf(p.id)
        if (idx !== -1) return { ...p, sort_order: idx + 1 }
        return p
      })
      return updated.sort((a, b) => a.sort_order - b.sort_order)
    })

    await Promise.all(
      orderedIds.map((id, idx) =>
        supabase.from('phases').update({ sort_order: idx + 1 }).eq('id', id)
      )
    )
  }

  return {
    phases,
    setPhases,
    phaseNames,
    fetchPhases,
    addPhase,
    updatePhase,
    deletePhase,
    reorderPhases,
    newPhaseName,
    setNewPhaseName,
    editingPhase,
    setEditingPhase
  }
}
