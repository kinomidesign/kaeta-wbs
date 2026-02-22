import { useState, useCallback } from 'react'
import type { AccordionState } from '@/types'

interface UseAccordionReturn {
  accordionState: AccordionState
  togglePhaseAccordion: (phase: string) => void
  toggleCategoryAccordion: (phase: string, category: string) => void
  isPhaseExpanded: (phase: string) => boolean
  isCategoryExpanded: (phase: string, category: string) => boolean
  // タスクの折りたたみ状態
  collapsedTasks: Record<number, boolean>
  toggleTaskCollapse: (taskId: number, e: React.MouseEvent) => void
  isTaskCollapsed: (taskId: number) => boolean
}

export const useAccordion = (): UseAccordionReturn => {
  // フェーズ・カテゴリのアコーディオン状態
  const [accordionState, setAccordionState] = useState<AccordionState>({
    phases: {},
    categories: {}
  })

  // タスクの折りたたみ状態（親タスクIDをキー）
  const [collapsedTasks, setCollapsedTasks] = useState<Record<number, boolean>>({})

  // フェーズのアコーディオン操作
  const togglePhaseAccordion = useCallback((phase: string) => {
    setAccordionState(prev => ({
      ...prev,
      phases: { ...prev.phases, [phase]: !prev.phases[phase] }
    }))
  }, [])

  // カテゴリのアコーディオン操作
  const toggleCategoryAccordion = useCallback((phase: string, category: string) => {
    const key = `${phase}-${category}`
    setAccordionState(prev => ({
      ...prev,
      categories: { ...prev.categories, [key]: !prev.categories[key] }
    }))
  }, [])

  // フェーズが展開されているかどうか
  const isPhaseExpanded = useCallback((phase: string): boolean => {
    return accordionState.phases[phase] !== false
  }, [accordionState.phases])

  // カテゴリが展開されているかどうか
  const isCategoryExpanded = useCallback((phase: string, category: string): boolean => {
    return accordionState.categories[`${phase}-${category}`] !== false
  }, [accordionState.categories])

  // タスクの折りたたみ/展開をトグル
  const toggleTaskCollapse = useCallback((taskId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setCollapsedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }))
  }, [])

  // タスクが折りたたまれているかどうか
  const isTaskCollapsed = useCallback((taskId: number): boolean => {
    return collapsedTasks[taskId] === true
  }, [collapsedTasks])

  return {
    accordionState,
    togglePhaseAccordion,
    toggleCategoryAccordion,
    isPhaseExpanded,
    isCategoryExpanded,
    collapsedTasks,
    toggleTaskCollapse,
    isTaskCollapsed
  }
}
