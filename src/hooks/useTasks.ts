import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import type { Task, Phase, Category, EditingTask } from '@/types'

interface UseTasksOptions {
  phases: Phase[]
  categories: Category[]
}

interface UseTasksReturn {
  tasks: Task[]
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>
  loading: boolean
  saving: boolean
  fetchTasks: () => Promise<void>
  updateTask: (id: number, field: string, value: string | number) => Promise<void>
  addTask: (editingTask: EditingTask, phases: Phase[], categories: Category[]) => Promise<Task | null>
  saveTask: (taskId: number, editingTask: EditingTask, phases: Phase[], categories: Category[]) => Promise<boolean>
  deleteTask: (taskId: number) => Promise<boolean>
  getFilteredTasks: (filterPhase: string, filterOwner: string) => Task[]
  getGroupedByPhase: (
    filteredTasks: Task[],
    phases: Phase[],
    categories: Category[]
  ) => Record<string, Record<string, Task[]>>
}

export const useTasks = ({ phases, categories }: UseTasksOptions): UseTasksReturn => {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // データ取得
  const fetchTasks = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('start_date', { ascending: true })

    if (error) {
      console.error('Error fetching tasks:', error)
    } else {
      setTasks(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchTasks()
  }, [])

  // タスク更新
  const updateTask = async (id: number, field: string, value: string | number) => {
    setSaving(true)

    // 楽観的更新
    setTasks(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t))

    const { error } = await supabase
      .from('tasks')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('Error updating task:', error)
      fetchTasks() // エラー時は再取得
    }

    setSaving(false)
  }

  // タスク追加
  const addTask = async (
    editingTask: EditingTask,
    phases: Phase[],
    categories: Category[]
  ): Promise<Task | null> => {
    if (!editingTask.name) return null

    // 同じカテゴリ内の最大sort_orderを取得
    const sameCategoryTasks = tasks.filter(
      t => t.phase === editingTask.phase && t.category === editingTask.category
    )
    const maxSortOrder = sameCategoryTasks.length > 0
      ? Math.max(...sameCategoryTasks.map(t => t.sort_order ?? 0))
      : 0

    // category_idを取得
    const selectedPhase = phases.find(p => p.name === editingTask.phase)
    const selectedCategory = selectedPhase
      ? categories.find(c => c.phase_id === selectedPhase.id && c.name === editingTask.category)
      : null

    // 空文字列の場合はnullに変換
    const taskData = {
      phase: editingTask.phase,
      category: editingTask.category,
      name: editingTask.name,
      owner: editingTask.owner,
      status: editingTask.status,
      start_date: editingTask.start_date || null,
      end_date: editingTask.end_date || null,
      effort: editingTask.effort || null,
      priority: editingTask.priority,
      note: editingTask.note || null,
      category_id: selectedCategory?.id || null,
      indent_level: editingTask.indent_level || 0,
      sort_order: maxSortOrder + 1
    }

    setSaving(true)
    const { data, error } = await supabase
      .from('tasks')
      .insert([taskData])
      .select()

    if (error) {
      console.error('Error adding task:', error)
      setSaving(false)
      return null
    }

    if (data) {
      setTasks(prev => [...prev, data[0]])
      setSaving(false)
      return data[0]
    }

    setSaving(false)
    return null
  }

  // タスク編集保存
  const saveTask = async (
    taskId: number,
    editingTask: EditingTask,
    phases: Phase[],
    categories: Category[]
  ): Promise<boolean> => {
    if (!editingTask.name) return false

    // category_idを取得
    const selectedPhase = phases.find(p => p.name === editingTask.phase)
    const selectedCategory = selectedPhase
      ? categories.find(c => c.phase_id === selectedPhase.id && c.name === editingTask.category)
      : null

    // 空文字列の場合はnullに変換
    const taskData = {
      phase: editingTask.phase,
      category: editingTask.category,
      name: editingTask.name,
      owner: editingTask.owner,
      status: editingTask.status,
      start_date: editingTask.start_date || null,
      end_date: editingTask.end_date || null,
      effort: editingTask.effort || null,
      priority: editingTask.priority,
      note: editingTask.note || null,
      indent_level: editingTask.indent_level || 0,
      category_id: selectedCategory?.id || null,
      updated_at: new Date().toISOString()
    }

    setSaving(true)
    const { error } = await supabase
      .from('tasks')
      .update(taskData)
      .eq('id', taskId)

    if (error) {
      console.error('Error updating task:', error)
      setSaving(false)
      return false
    }

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...editingTask } : t))
    setSaving(false)
    return true
  }

  // タスク削除
  const deleteTask = async (taskId: number): Promise<boolean> => {
    setSaving(true)
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)

    if (error) {
      console.error('Error deleting task:', error)
      setSaving(false)
      return false
    }

    setTasks(prev => prev.filter(t => t.id !== taskId))
    setSaving(false)
    return true
  }

  // フィルタリング
  const getFilteredTasks = (filterPhase: string, filterOwner: string): Task[] => {
    return tasks.filter(task => {
      if (filterPhase !== 'all' && task.phase !== filterPhase) return false
      if (filterOwner !== 'all' && task.owner !== filterOwner) return false
      return true
    })
  }

  // フェーズ・カテゴリでグループ化
  const getGroupedByPhase = (
    filteredTasks: Task[],
    phases: Phase[],
    categories: Category[]
  ): Record<string, Record<string, Task[]>> => {
    const result: Record<string, Record<string, Task[]>> = {}

    // フェーズ順にソート
    const sortedPhaseNames = phases.length > 0
      ? phases.map(p => p.name)
      : [...new Set(filteredTasks.map(t => t.phase))]

    sortedPhaseNames.forEach(phase => {
      result[phase] = {}
    })

    filteredTasks.forEach(task => {
      if (!result[task.phase]) {
        result[task.phase] = {}
      }
      if (!result[task.phase][task.category]) {
        result[task.phase][task.category] = []
      }
      result[task.phase][task.category].push(task)
    })

    // 各カテゴリ内でsort_orderでソート
    Object.values(result).forEach(phaseCategories => {
      Object.values(phaseCategories).forEach(taskList => {
        taskList.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      })
    })

    // カテゴリの順序をcategories.sort_orderでソート
    const sortedResult: Record<string, Record<string, Task[]>> = {}
    sortedPhaseNames.forEach(phaseName => {
      const phase = phases.find(p => p.name === phaseName)
      if (!phase) {
        sortedResult[phaseName] = result[phaseName] || {}
        return
      }

      const phaseCategories = result[phaseName] || {}
      const categoryNames = Object.keys(phaseCategories)

      // カテゴリをsort_orderでソート
      const sortedCategoryNames = categoryNames.sort((a, b) => {
        const catA = categories.find(c => c.phase_id === phase.id && c.name === a)
        const catB = categories.find(c => c.phase_id === phase.id && c.name === b)
        return (catA?.sort_order ?? 9999) - (catB?.sort_order ?? 9999)
      })

      sortedResult[phaseName] = {}
      sortedCategoryNames.forEach(catName => {
        sortedResult[phaseName][catName] = phaseCategories[catName]
      })
    })

    return sortedResult
  }

  return {
    tasks,
    setTasks,
    loading,
    saving,
    fetchTasks,
    updateTask,
    addTask,
    saveTask,
    deleteTask,
    getFilteredTasks,
    getGroupedByPhase
  }
}
