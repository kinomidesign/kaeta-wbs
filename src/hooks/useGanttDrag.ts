import { useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Task, GanttDragState } from '@/types'
import { formatDateString } from '@/utils/date'

interface UseGanttDragOptions {
  tasks: Task[]
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>
  fetchTasks: () => Promise<void>
}

interface UseGanttDragReturn {
  dragState: GanttDragState
  hasDraggedRef: React.MutableRefObject<boolean>
  handleDragStart: (e: React.MouseEvent, task: Task, type: 'move' | 'resize-start' | 'resize-end') => void
  handleDragMove: (e: React.MouseEvent) => void
  handleDragEnd: () => Promise<void>
  saving: boolean
}

const initialDragState: GanttDragState = {
  taskId: null,
  type: null,
  startX: 0,
  originalStart: '',
  originalEnd: ''
}

export const useGanttDrag = ({
  tasks,
  setTasks,
  fetchTasks
}: UseGanttDragOptions): UseGanttDragReturn => {
  const [dragState, setDragState] = useState<GanttDragState>(initialDragState)
  const [saving, setSaving] = useState(false)
  
  // ドラッグが発生したかどうか（クリックと区別するため）
  const hasDraggedRef = useRef<boolean>(false)

  // ドラッグ開始
  const handleDragStart = useCallback((
    e: React.MouseEvent,
    task: Task,
    type: 'move' | 'resize-start' | 'resize-end'
  ) => {
    e.stopPropagation()
    e.preventDefault()
    hasDraggedRef.current = false
    setDragState({
      taskId: task.id,
      type,
      startX: e.clientX,
      originalStart: task.start_date,
      originalEnd: task.end_date
    })
  }, [])

  // ドラッグ中
  const handleDragMove = useCallback((e: React.MouseEvent) => {
    if (!dragState.taskId || !dragState.type) return

    const deltaX = e.clientX - dragState.startX
    const daysDelta = Math.round(deltaX / 32) // DAY_WIDTH = 32

    if (daysDelta === 0) return

    // 実際にドラッグが発生した
    hasDraggedRef.current = true

    const task = tasks.find(t => t.id === dragState.taskId)
    if (!task) return

    const originalStart = new Date(dragState.originalStart)
    const originalEnd = new Date(dragState.originalEnd)

    let newStart = task.start_date
    let newEnd = task.end_date

    if (dragState.type === 'move') {
      const newStartDate = new Date(originalStart)
      newStartDate.setDate(newStartDate.getDate() + daysDelta)
      const newEndDate = new Date(originalEnd)
      newEndDate.setDate(newEndDate.getDate() + daysDelta)
      newStart = formatDateString(newStartDate)
      newEnd = formatDateString(newEndDate)
    } else if (dragState.type === 'resize-start') {
      const newStartDate = new Date(originalStart)
      newStartDate.setDate(newStartDate.getDate() + daysDelta)
      if (newStartDate < originalEnd) {
        newStart = formatDateString(newStartDate)
      }
    } else if (dragState.type === 'resize-end') {
      const newEndDate = new Date(originalEnd)
      newEndDate.setDate(newEndDate.getDate() + daysDelta)
      if (newEndDate > originalStart) {
        newEnd = formatDateString(newEndDate)
      }
    }

    setTasks(prev => prev.map(t =>
      t.id === dragState.taskId ? { ...t, start_date: newStart, end_date: newEnd } : t
    ))
  }, [dragState, tasks, setTasks])

  // ドラッグ終了
  const handleDragEnd = useCallback(async () => {
    if (!dragState.taskId) return

    const task = tasks.find(t => t.id === dragState.taskId)
    if (task && (task.start_date !== dragState.originalStart || task.end_date !== dragState.originalEnd)) {
      setSaving(true)
      const { error } = await supabase
        .from('tasks')
        .update({
          start_date: task.start_date,
          end_date: task.end_date,
          updated_at: new Date().toISOString()
        })
        .eq('id', dragState.taskId)

      if (error) {
        console.error('Error updating task:', error)
        fetchTasks()
      }
      setSaving(false)
    }

    setDragState(initialDragState)
  }, [dragState, tasks, fetchTasks])

  return {
    dragState,
    hasDraggedRef,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    saving
  }
}
