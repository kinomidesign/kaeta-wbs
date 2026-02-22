import { useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Task, TaskDragState } from '@/types'

interface UseTaskDragOptions {
  tasks: Task[]
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>
}

interface UseTaskDragReturn {
  taskDragState: TaskDragState
  lastDropTargetRef: React.MutableRefObject<string | null>
  isDropProcessingRef: React.MutableRefObject<boolean>
  handleTaskDragStart: (e: React.DragEvent, task: Task) => void
  handleTaskDragOver: (e: React.DragEvent, targetTask: Task, position: 'before' | 'after' | 'child') => void
  handleTaskDragLeave: () => void
  handleTaskDrop: (e: React.DragEvent, targetTask: Task, position: 'before' | 'after' | 'child') => Promise<void>
  handleTaskDragEnd: () => void
  handleDropToPhase: (e: React.DragEvent, phase: string) => Promise<void>
  handleDropToCategory: (e: React.DragEvent, phase: string, category: string) => Promise<void>
  setDropTargetForPhase: (phase: string) => void
  setDropTargetForCategory: (phase: string, category: string) => void
  resetTaskDragState: () => void
}

const initialTaskDragState: TaskDragState = {
  draggingTaskId: null,
  startX: 0,
  previewIndent: 0,
  originalIndent: 0,
  dropTarget: null
}

export const useTaskDrag = ({
  tasks,
  setTasks
}: UseTaskDragOptions): UseTaskDragReturn => {
  const [taskDragState, setTaskDragState] = useState<TaskDragState>(initialTaskDragState)
  const lastDropTargetRef = useRef<string | null>(null)
  const isDropProcessingRef = useRef<boolean>(false)

  const resetTaskDragState = useCallback(() => {
    setTaskDragState(initialTaskDragState)
    lastDropTargetRef.current = null
  }, [])

  const handleTaskDragStart = useCallback((e: React.DragEvent, task: Task) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', task.id.toString())
    const indent = task.indent_level || 0
    setTaskDragState({
      draggingTaskId: task.id,
      startX: e.clientX,
      previewIndent: indent,
      originalIndent: indent,
      dropTarget: null
    })
  }, [])

  const handleTaskDragOver = useCallback((
    e: React.DragEvent,
    targetTask: Task,
    position: 'before' | 'after' | 'child'
  ) => {
    e.preventDefault()
    e.stopPropagation()
    if (taskDragState.draggingTaskId === targetTask.id) return
    const targetKey = `${targetTask.id}-${position}`
    if (lastDropTargetRef.current === targetKey) return
    lastDropTargetRef.current = targetKey
    setTaskDragState(prev => ({
      ...prev,
      dropTarget: {
        taskId: targetTask.id,
        position,
        phase: targetTask.phase,
        category: targetTask.category
      }
    }))
  }, [taskDragState.draggingTaskId])

  const handleTaskDragLeave = useCallback(() => {}, [])

  const handleTaskDrop = useCallback(async (
    e: React.DragEvent,
    targetTask: Task,
    position: 'before' | 'after' | 'child'
  ) => {
    e.preventDefault()
    e.stopPropagation()
    isDropProcessingRef.current = true

    const draggedTaskId = taskDragState.draggingTaskId
    if (!draggedTaskId || draggedTaskId === targetTask.id) {
      isDropProcessingRef.current = false
      resetTaskDragState()
      return
    }

    const draggedTask = tasks.find(t => t.id === draggedTaskId)
    if (!draggedTask) {
      isDropProcessingRef.current = false
      resetTaskDragState()
      return
    }

    const sameCategoryTasks = tasks
      .filter(t => t.phase === targetTask.phase && t.category === targetTask.category && t.id !== draggedTaskId)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

    const targetIndex = sameCategoryTasks.findIndex(t => t.id === targetTask.id)
    const targetOrder = targetTask.sort_order ?? 0
    let newSortOrder: number
    const insertBefore = position === 'before'

    if (insertBefore) {
      const prevTask = targetIndex > 0 ? sameCategoryTasks[targetIndex - 1] : null
      const prevOrder = prevTask?.sort_order ?? (targetOrder - 1000)
      newSortOrder = (prevOrder + targetOrder) / 2
    } else {
      const nextTask = targetIndex < sameCategoryTasks.length - 1 ? sameCategoryTasks[targetIndex + 1] : null
      const nextOrder = nextTask?.sort_order ?? (targetOrder + 1000)
      newSortOrder = (targetOrder + nextOrder) / 2
    }

    const updates: Partial<Task> = {
      phase: targetTask.phase,
      category: targetTask.category,
      sort_order: newSortOrder
    }

    const originalTask = { ...draggedTask }
    setTasks(prev => prev.map(t => t.id === draggedTaskId ? { ...t, ...updates } : t))

    const { error } = await supabase.from('tasks').update(updates).eq('id', draggedTaskId)
    if (error) {
      setTasks(prev => prev.map(t => t.id === draggedTaskId ? originalTask : t))
    }

    resetTaskDragState()
    isDropProcessingRef.current = false
  }, [taskDragState.draggingTaskId, tasks, setTasks, resetTaskDragState])

  const handleTaskDragEnd = useCallback(() => {
    if (isDropProcessingRef.current) return
    resetTaskDragState()
  }, [resetTaskDragState])

  const handleDropToPhase = useCallback(async (e: React.DragEvent, phase: string) => {
    e.preventDefault()
    const draggedTaskId = taskDragState.draggingTaskId
    if (!draggedTaskId) return

    const draggedTask = tasks.find(t => t.id === draggedTaskId)
    if (!draggedTask) return

    const samePhaseTasks = tasks.filter(t => t.phase === phase && t.category === '')
    const minSortOrder = samePhaseTasks.length > 0
      ? Math.min(...samePhaseTasks.map(t => t.sort_order ?? 0))
      : 0

    const updates = { phase, category: '', indent_level: 0, sort_order: minSortOrder - 1 }
    const originalTask = { ...draggedTask }
    setTasks(prev => prev.map(t => t.id === draggedTaskId ? { ...t, ...updates } : t))

    const { error } = await supabase.from('tasks').update(updates).eq('id', draggedTaskId)
    if (error) {
      console.error('Error moving to phase:', error.message)
      setTasks(prev => prev.map(t => t.id === draggedTaskId ? originalTask : t))
    }
    resetTaskDragState()
  }, [taskDragState.draggingTaskId, tasks, setTasks, resetTaskDragState])

  const handleDropToCategory = useCallback(async (e: React.DragEvent, phase: string, category: string) => {
    e.preventDefault()
    const draggedTaskId = taskDragState.draggingTaskId
    if (!draggedTaskId) return

    const draggedTask = tasks.find(t => t.id === draggedTaskId)
    if (!draggedTask) return

    const sameCategoryTasks = tasks.filter(t => t.phase === phase && t.category === category)
    const minSortOrder = sameCategoryTasks.length > 0
      ? Math.min(...sameCategoryTasks.map(t => t.sort_order ?? 0))
      : 0

    const updates = { phase, category, indent_level: 0, sort_order: minSortOrder - 1 }
    const originalTask = { ...draggedTask }
    setTasks(prev => prev.map(t => t.id === draggedTaskId ? { ...t, ...updates } : t))

    const { error } = await supabase.from('tasks').update(updates).eq('id', draggedTaskId)
    if (error) {
      console.error('Error moving to category:', error.message)
      setTasks(prev => prev.map(t => t.id === draggedTaskId ? originalTask : t))
    }
    resetTaskDragState()
  }, [taskDragState.draggingTaskId, tasks, setTasks, resetTaskDragState])

  const setDropTargetForPhase = useCallback((phase: string) => {
    const targetKey = `phase-${phase}`
    if (lastDropTargetRef.current === targetKey) return
    lastDropTargetRef.current = targetKey
    setTaskDragState(prev => ({
      ...prev,
      dropTarget: { taskId: null, position: 'after', phase, category: '' }
    }))
  }, [])

  const setDropTargetForCategory = useCallback((phase: string, category: string) => {
    const targetKey = `category-${phase}-${category}`
    if (lastDropTargetRef.current === targetKey) return
    lastDropTargetRef.current = targetKey
    setTaskDragState(prev => ({
      ...prev,
      dropTarget: { taskId: null, position: 'after', phase, category }
    }))
  }, [])

  return {
    taskDragState,
    lastDropTargetRef,
    isDropProcessingRef,
    handleTaskDragStart,
    handleTaskDragOver,
    handleTaskDragLeave,
    handleTaskDrop,
    handleTaskDragEnd,
    handleDropToPhase,
    handleDropToCategory,
    setDropTargetForPhase,
    setDropTargetForCategory,
    resetTaskDragState
  }
}
