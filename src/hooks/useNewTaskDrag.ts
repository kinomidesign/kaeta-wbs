import { useState, useCallback, useRef } from 'react'
import { DAY_WIDTH } from '@/constants'
import { getDateFromIndex, formatDateString } from '@/utils/date'
import type { NewTaskDragState } from '@/types'

interface UseNewTaskDragOptions {
  ganttRef: React.RefObject<HTMLDivElement>
  onCreateTask: (phase: string, category: string, startDate: string, endDate: string) => void
  onUpdateTaskDate?: (taskId: number, startDate: string, endDate: string) => void
}

interface ExtendedDragState extends NewTaskDragState {
  taskId: number | null  // 既存タスクへの日付設定時に使用
}

const initialState: ExtendedDragState = {
  isActive: false,
  startX: 0,
  currentX: 0,
  startIndex: 0,
  currentIndex: 0,
  phase: '',
  category: '',
  taskId: null
}

export const useNewTaskDrag = ({ ganttRef, onCreateTask, onUpdateTaskDate }: UseNewTaskDragOptions) => {
  const [dragState, setDragState] = useState<ExtendedDragState>(initialState)
  const isDraggingRef = useRef(false)

  // 空白エリアでのドラッグ開始（新規タスク作成用）
  const handleEmptyAreaDragStart = useCallback((
    e: React.MouseEvent,
    phase: string,
    category: string
  ) => {
    if (!ganttRef.current) return

    const rect = ganttRef.current.getBoundingClientRect()
    const scrollLeft = ganttRef.current.scrollLeft
    const x = e.clientX - rect.left + scrollLeft
    const index = Math.floor(x / DAY_WIDTH)

    isDraggingRef.current = true
    setDragState({
      isActive: true,
      startX: x,
      currentX: x,
      startIndex: index,
      currentIndex: index,
      phase,
      category,
      taskId: null
    })
  }, [ganttRef])

  // 既存タスク（日付未設定）へのドラッグ開始
  const handleTaskDateDragStart = useCallback((
    e: React.MouseEvent,
    taskId: number,
    phase: string,
    category: string
  ) => {
    if (!ganttRef.current) return

    const rect = ganttRef.current.getBoundingClientRect()
    const scrollLeft = ganttRef.current.scrollLeft
    const x = e.clientX - rect.left + scrollLeft
    const index = Math.floor(x / DAY_WIDTH)

    isDraggingRef.current = true
    setDragState({
      isActive: true,
      startX: x,
      currentX: x,
      startIndex: index,
      currentIndex: index,
      phase,
      category,
      taskId
    })
  }, [ganttRef])

  // ドラッグ中
  const handleDragMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current || !ganttRef.current) return

    const rect = ganttRef.current.getBoundingClientRect()
    const scrollLeft = ganttRef.current.scrollLeft
    const x = e.clientX - rect.left + scrollLeft
    const index = Math.floor(x / DAY_WIDTH)

    setDragState(prev => ({
      ...prev,
      currentX: x,
      currentIndex: index
    }))
  }, [ganttRef])

  // ドラッグ終了
  const handleDragEnd = useCallback(() => {
    if (!isDraggingRef.current) return

    isDraggingRef.current = false

    if (dragState.isActive && dragState.startIndex !== dragState.currentIndex) {
      const startIdx = Math.min(dragState.startIndex, dragState.currentIndex)
      const endIdx = Math.max(dragState.startIndex, dragState.currentIndex)

      const startDate = formatDateString(getDateFromIndex(startIdx))
      const endDate = formatDateString(getDateFromIndex(endIdx))

      if (dragState.taskId && onUpdateTaskDate) {
        // 既存タスクへの日付設定
        onUpdateTaskDate(dragState.taskId, startDate, endDate)
      } else {
        // 新規タスク作成
        onCreateTask(dragState.phase, dragState.category, startDate, endDate)
      }
    }

    setDragState(initialState)
  }, [dragState, onCreateTask, onUpdateTaskDate])

  // ドラッグ中の新規タスクプレビュー情報を取得
  const getPreviewInfo = useCallback(() => {
    if (!dragState.isActive) return null

    const startIdx = Math.min(dragState.startIndex, dragState.currentIndex)
    const endIdx = Math.max(dragState.startIndex, dragState.currentIndex)
    const width = (endIdx - startIdx + 1) * DAY_WIDTH

    return {
      left: startIdx * DAY_WIDTH,
      width,
      startDate: formatDateString(getDateFromIndex(startIdx)),
      endDate: formatDateString(getDateFromIndex(endIdx))
    }
  }, [dragState])

  return {
    newTaskDragState: dragState,
    handleEmptyAreaDragStart,
    handleTaskDateDragStart,
    handleNewTaskDragMove: handleDragMove,
    handleNewTaskDragEnd: handleDragEnd,
    getPreviewInfo,
    isNewTaskDragging: dragState.isActive,
    draggingTaskId: dragState.taskId
  }
}
