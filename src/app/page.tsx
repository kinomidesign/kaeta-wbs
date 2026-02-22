'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import type { Task, EditingTask, StatusPopupState, IndentPopupState } from '@/types'
import { TABLE_WIDTH, DAY_WIDTH } from '@/constants'
import { supabase } from '@/lib/supabase'
import { generateDateRange, getYearStartDate, getDaysFromStart } from '@/utils/date'
import { useTasks, usePhases, useCategories, useAccordion, useGanttDrag, useTaskDrag } from '@/hooks'
import {
  LoadingSpinner,
  Header,
  StatusPopup,
  IndentPopup,
  TaskModal,
  PhaseModal,
  CategoryModal,
  GanttDateHeader,
  GanttBar,
  TaskRow
} from '@/components'
import { isWeekend } from '@/utils/date'

export default function KaetaWBS() {
  // フェーズとカテゴリのフック
  const {
    phases,
    phaseNames,
    fetchPhases,
    addPhase,
    updatePhase,
    deletePhase,
    newPhaseName,
    setNewPhaseName,
    editingPhase,
    setEditingPhase
  } = usePhases()

  const {
    categories,
    fetchCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    moveCategoryOrder,
    newCategoryName,
    setNewCategoryName,
    selectedPhaseForCategory,
    setSelectedPhaseForCategory,
    editingCategory,
    setEditingCategory
  } = useCategories()

  // タスクのフック
  const {
    tasks,
    setTasks,
    loading,
    saving,
    fetchTasks,
    updateTask,
    addTask: addTaskToDb,
    saveTask: saveTaskToDb,
    deleteTask: deleteTaskFromDb,
    getFilteredTasks,
    getGroupedByPhase
  } = useTasks({ phases, categories })

  // アコーディオンのフック
  const {
    togglePhaseAccordion,
    toggleCategoryAccordion,
    isPhaseExpanded,
    isCategoryExpanded,
    collapsedTasks,
    toggleTaskCollapse
  } = useAccordion()

  // ガントチャートドラッグのフック
  const {
    hasDraggedRef,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    saving: ganttSaving
  } = useGanttDrag({ tasks, setTasks, fetchTasks })

  // タスクドラッグのフック
  const {
    taskDragState,
    handleTaskDragStart,
    handleTaskDragOver,
    handleTaskDrop,
    handleTaskDragEnd,
    handleDropToPhase,
    handleDropToCategory,
    setDropTargetForPhase,
    setDropTargetForCategory
  } = useTaskDrag({ tasks, setTasks })

  // UI状態
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [taskModalMode, setTaskModalMode] = useState<'add' | 'edit'>('add')
  const [showPhaseModal, setShowPhaseModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [filterPhase, setFilterPhase] = useState('all')
  const [filterOwner, setFilterOwner] = useState('all')
  const [statusPopup, setStatusPopup] = useState<StatusPopupState | null>(null)
  const [indentPopup, setIndentPopup] = useState<IndentPopupState | null>(null)

  // 編集中タスク
  const [editingTask, setEditingTask] = useState<EditingTask>({
    phase: 'Phase 1',
    category: '',
    name: '',
    owner: 'エンジニア',
    status: '未着手',
    start_date: '',
    end_date: '',
    effort: '',
    priority: '必須',
    note: '',
    indent_level: 0
  })

  // タイムライン
  const viewStartDate = useMemo(() => getYearStartDate(), [])
  const ganttDateRange = useMemo(() => generateDateRange(viewStartDate), [viewStartDate])

  // テーブル幅
  const [tableWidth, setTableWidth] = useState<number>(TABLE_WIDTH.default)
  const [isResizing, setIsResizing] = useState(false)
  const resizeStartXRef = useRef(0)
  const resizeStartWidthRef = useRef<number>(TABLE_WIDTH.default)

  // スクロール同期
  const ganttRef = useRef<HTMLDivElement>(null)
  const taskListRef = useRef<HTMLDivElement>(null)
  const isSyncingScrollRef = useRef(false)

  // データ取得
  useEffect(() => {
    fetchPhases()
    fetchCategories()
  }, [])

  // 初期スクロール
  useEffect(() => {
    if (!loading && ganttRef.current) {
      const timer = setTimeout(() => {
        const today = new Date().toISOString().split('T')[0]
        const dayOffset = getDaysFromStart(today, viewStartDate)
        if (ganttRef.current) {
          ganttRef.current.scrollTo({ left: dayOffset * DAY_WIDTH, behavior: 'auto' })
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [loading, viewStartDate])

  // リサイズ処理
  useEffect(() => {
    if (!isResizing) return
    const handleResizeMove = (e: MouseEvent) => {
      const delta = e.clientX - resizeStartXRef.current
      const newWidth = Math.max(TABLE_WIDTH.min, Math.min(TABLE_WIDTH.max, resizeStartWidthRef.current + delta))
      setTableWidth(newWidth)
    }
    const handleResizeEnd = () => setIsResizing(false)
    document.addEventListener('mousemove', handleResizeMove)
    document.addEventListener('mouseup', handleResizeEnd)
    return () => {
      document.removeEventListener('mousemove', handleResizeMove)
      document.removeEventListener('mouseup', handleResizeEnd)
    }
  }, [isResizing])

  // スクロール同期
  const handleTaskListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isSyncingScrollRef.current) return
    isSyncingScrollRef.current = true
    if (ganttRef.current) ganttRef.current.scrollTop = e.currentTarget.scrollTop
    requestAnimationFrame(() => { isSyncingScrollRef.current = false })
  }

  const handleGanttScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isSyncingScrollRef.current) return
    isSyncingScrollRef.current = true
    if (taskListRef.current) taskListRef.current.scrollTop = e.currentTarget.scrollTop
    requestAnimationFrame(() => { isSyncingScrollRef.current = false })
  }

  // 日付へスクロール
  const scrollToDate = (targetDate: string, smooth = true) => {
    if (!ganttRef.current) return
    const dayOffset = getDaysFromStart(targetDate, viewStartDate)
    ganttRef.current.scrollTo({ left: dayOffset * DAY_WIDTH, behavior: smooth ? 'smooth' : 'auto' })
  }

  // リサイズ開始
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    resizeStartXRef.current = e.clientX
    resizeStartWidthRef.current = tableWidth
  }

  // タスクの子チェック・非表示チェック
  const hasChildren = (task: Task, allTasks: Task[], taskIndex: number): boolean => {
    if (taskIndex >= allTasks.length - 1) return false
    return (allTasks[taskIndex + 1].indent_level || 0) > (task.indent_level || 0)
  }

  const isTaskHidden = (task: Task, allTasks: Task[], taskIndex: number): boolean => {
    const taskLevel = task.indent_level || 0
    if (taskLevel === 0) return false
    for (let i = taskIndex - 1; i >= 0; i--) {
      const prevTask = allTasks[i]
      const prevLevel = prevTask.indent_level || 0
      if (prevLevel < taskLevel) {
        if (collapsedTasks[prevTask.id]) return true
        if (prevLevel > 0) continue
        break
      }
    }
    return false
  }

  // タスクモーダル
  const resetEditingTask = () => {
    setEditingTask({
      phase: 'Phase 1', category: '', name: '', owner: 'エンジニア', status: '未着手',
      start_date: '', end_date: '', effort: '', priority: '必須', note: '', indent_level: 0
    })
  }

  const openTaskModal = (mode: 'add' | 'edit', task?: Task, defaultPhase?: string, defaultCategory?: string) => {
    setTaskModalMode(mode)
    if (mode === 'edit' && task) {
      setSelectedTask(task)
      setEditingTask({
        phase: task.phase, category: task.category, name: task.name, owner: task.owner,
        status: task.status, start_date: task.start_date, end_date: task.end_date,
        effort: task.effort || '', priority: task.priority, note: task.note || '',
        indent_level: task.indent_level || 0
      })
    } else {
      resetEditingTask()
      if (defaultPhase) setEditingTask(prev => ({ ...prev, phase: defaultPhase }))
      if (defaultCategory) setEditingTask(prev => ({ ...prev, category: defaultCategory }))
    }
    setShowTaskModal(true)
  }

  const handleSaveTask = async () => {
    if (taskModalMode === 'add') {
      const result = await addTaskToDb(editingTask, phases, categories)
      if (result) {
        setShowTaskModal(false)
        resetEditingTask()
      }
    } else if (selectedTask) {
      const success = await saveTaskToDb(selectedTask.id, editingTask, phases, categories)
      if (success) {
        setShowTaskModal(false)
        setSelectedTask(null)
        resetEditingTask()
      }
    }
  }

  const handleDeleteTask = async () => {
    if (!selectedTask || !confirm('このタスクを削除しますか？')) return
    const success = await deleteTaskFromDb(selectedTask.id)
    if (success) {
      setShowTaskModal(false)
      setSelectedTask(null)
    }
  }

  // ステータス変更
  const selectStatus = async (taskId: number, status: string) => {
    await updateTask(taskId, 'status', status)
    setStatusPopup(null)
  }

  // インデント変更
  const changeIndent = async (e: React.MouseEvent, taskId: number, delta: number) => {
    e.stopPropagation()
    e.preventDefault()
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    const currentLevel = task.indent_level || 0
    const newLevel = Math.max(0, Math.min(3, currentLevel + delta))
    if (newLevel !== currentLevel) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, indent_level: newLevel } : t))
      const { error } = await supabase.from('tasks').update({ indent_level: newLevel }).eq('id', taskId)
      if (error) setTasks(prev => prev.map(t => t.id === taskId ? { ...t, indent_level: currentLevel } : t))
    }
  }

  // フィルタリング・グルーピング
  const filteredTasks = getFilteredTasks(filterPhase, filterOwner)
  const groupedByPhase = useMemo(
    () => getGroupedByPhase(filteredTasks, phases, categories),
    [filteredTasks, phases, categories, getGroupedByPhase]
  )

  if (loading) return <LoadingSpinner />

  return (
    <div className="min-h-screen bg-dashboard-bg">
      <Header
        saving={saving || ganttSaving}
        filterPhase={filterPhase}
        setFilterPhase={setFilterPhase}
        filterOwner={filterOwner}
        setFilterOwner={setFilterOwner}
        phaseNames={phaseNames}
        onShowPhaseModal={() => setShowPhaseModal(true)}
        onShowCategoryModal={() => setShowCategoryModal(true)}
        onAddTask={() => openTaskModal('add')}
        onScrollToDate={scrollToDate}
      />

      {/* Main Content */}
      <div
        className={`flex ${isResizing ? 'cursor-col-resize select-none' : ''}`}
        style={{ height: 'calc(100vh - 140px)' }}
        onClick={() => { setStatusPopup(null); setIndentPopup(null) }}
      >
        {/* Task List */}
        <div ref={taskListRef} onScroll={handleTaskListScroll} className="flex-shrink-0 bg-dashboard-card relative overflow-y-auto overflow-x-hidden scrollbar-hide" style={{ width: `${tableWidth}px` }}>
          <div className="sticky top-0 bg-gray-50 border-b border-dashboard-border px-4 py-2 text-xs font-medium text-dashboard-text-muted grid grid-cols-12 gap-2 z-20">
            <div className="col-span-5">タスク</div>
            <div className="col-span-2 text-center">担当者</div>
            <div className="col-span-3 text-center">期限</div>
            <div className="col-span-2 text-center">ステータス</div>
          </div>

          {Object.entries(groupedByPhase).map(([phase, phaseCategories]) => (
            <div key={phase}>
              {/* Phase Header */}
              <div
                onClick={() => togglePhaseAccordion(phase)}
                onDragOver={(e) => { e.preventDefault(); if (taskDragState.draggingTaskId) setDropTargetForPhase(phase) }}
                onDrop={(e) => handleDropToPhase(e, phase)}
                className={`bg-gray-100 text-dashboard-text-main px-4 h-12 text-sm font-semibold cursor-pointer hover:bg-gray-200 flex items-center justify-between border-b border-dashboard-border transition-all
                  ${taskDragState.dropTarget?.phase === phase && taskDragState.dropTarget?.category === '' && !taskDragState.dropTarget?.taskId ? 'ring-2 ring-accent-blue ring-inset bg-accent-blue/20' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`transform transition-transform ${isPhaseExpanded(phase) ? 'rotate-90' : ''}`}>▶</span>
                  {phase}
                </div>
                <span className="text-xs text-dashboard-text-muted font-normal">
                  {Object.values(phaseCategories).flat().length} タスク
                </span>
              </div>

              {isPhaseExpanded(phase) && Object.entries(phaseCategories).map(([category, categoryTasks]) => (
                <div key={`${phase}-${category}`}>
                  {/* Category Header */}
                  <div
                    onClick={() => toggleCategoryAccordion(phase, category)}
                    onDragOver={(e) => { e.preventDefault(); if (taskDragState.draggingTaskId) setDropTargetForCategory(phase, category) }}
                    onDrop={(e) => handleDropToCategory(e, phase, category)}
                    className={`bg-gray-50 text-dashboard-text-main px-4 h-10 pl-8 text-sm cursor-pointer hover:bg-gray-100 flex items-center justify-between border-b border-dashboard-border transition-all
                      ${taskDragState.dropTarget?.phase === phase && taskDragState.dropTarget?.category === category && !taskDragState.dropTarget?.taskId ? 'ring-2 ring-accent-blue ring-inset bg-accent-blue/10' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`transform transition-transform text-xs ${isCategoryExpanded(phase, category) ? 'rotate-90' : ''}`}>▶</span>
                      {category || '(カテゴリなし)'}
                    </div>
                    <span className="text-xs text-dashboard-text-muted">{categoryTasks.length} タスク</span>
                  </div>

                  {isCategoryExpanded(phase, category) && (
                    <>
                      {categoryTasks.map((task, taskIndex) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          taskIndex={taskIndex}
                          categoryTasks={categoryTasks}
                          selectedTaskId={selectedTask?.id ?? null}
                          taskDragState={taskDragState}
                          collapsedTasks={collapsedTasks}
                          onTaskClick={(t) => openTaskModal('edit', t)}
                          onDragStart={handleTaskDragStart}
                          onDragEnd={handleTaskDragEnd}
                          onDragOver={handleTaskDragOver}
                          onDrop={handleTaskDrop}
                          onStatusClick={(t, e) => {
                            const rect = (e.target as HTMLElement).getBoundingClientRect()
                            setStatusPopup({ taskId: t.id, x: rect.left, y: rect.bottom + 4 })
                          }}
                          onDateClick={(startDate, e) => { e.stopPropagation(); scrollToDate(startDate) }}
                          onToggleCollapse={toggleTaskCollapse}
                          onChangeIndent={changeIndent}
                          hasChildren={hasChildren(task, categoryTasks, taskIndex)}
                          isHidden={isTaskHidden(task, categoryTasks, taskIndex)}
                        />
                      ))}
                      <div onClick={() => openTaskModal('add', undefined, phase, category)} className="px-4 h-10 pl-12 border-b border-gray-100 cursor-pointer hover:bg-blue-50 text-accent-blue-text text-sm flex items-center gap-1">
                        <span>+</span> タスクを追加
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Resize Handle */}
        <div
          className={`flex-shrink-0 w-1 cursor-col-resize z-30 group hover:bg-[#009EA4] transition-colors relative ${isResizing ? 'bg-[#009EA4]' : 'bg-dashboard-border'}`}
          onMouseDown={handleResizeStart}
        >
          <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div className="bg-[#009EA4] rounded-full p-1.5 shadow-md">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="white"><path d="M2 6L4.5 3.5V8.5L2 6ZM10 6L7.5 3.5V8.5L10 6Z" /></svg>
            </div>
          </div>
        </div>

        {/* Gantt Chart */}
        <div
          ref={ganttRef}
          className="flex-1 min-w-0 overflow-x-auto overflow-y-auto"
          onScroll={handleGanttScroll}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
        >
          <GanttDateHeader dateRange={ganttDateRange} />

          {Object.entries(groupedByPhase).map(([phase, phaseCategories]) => (
            <div key={phase}>
              <div className="h-12 bg-gray-100 border-b border-dashboard-border"></div>
              {isPhaseExpanded(phase) && Object.entries(phaseCategories).map(([category, categoryTasks]) => (
                <div key={`${phase}-${category}`}>
                  <div className="h-10 bg-gray-50 border-b border-dashboard-border"></div>
                  {isCategoryExpanded(phase, category) && (
                    <>
                      {categoryTasks.map((task, taskIndex) => {
                        if (isTaskHidden(task, categoryTasks, taskIndex)) return null
                        return (
                          <div
                            key={task.id}
                            className={`h-12 flex items-center border-b border-gray-100 relative ${selectedTask?.id === task.id ? 'bg-blue-50' : ''}`}
                            onClick={() => { if (!hasDraggedRef.current) openTaskModal('edit', task); hasDraggedRef.current = false }}
                          >
                            <div className="absolute inset-0 flex">
                              {ganttDateRange.map((date, i) => (
                                <div key={i} className={`w-8 flex-shrink-0 border-r border-gray-50 ${isWeekend(date) ? 'bg-gray-50' : ''}`} />
                              ))}
                            </div>
                            <GanttBar task={task} viewStartDate={viewStartDate} onDragStart={handleDragStart} />
                          </div>
                        )
                      })}
                      <div className="h-10 border-b border-gray-100"></div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Popups */}
      {statusPopup && <StatusPopup statusPopup={statusPopup} tasks={tasks} onSelectStatus={selectStatus} />}
      {indentPopup && <IndentPopup indentPopup={indentPopup} onSelectIndent={(id, level) => { changeIndent({ stopPropagation: () => {}, preventDefault: () => {} } as React.MouseEvent, id, level - (tasks.find(t => t.id === id)?.indent_level || 0)); setIndentPopup(null) }} />}

      {/* Modals */}
      {showTaskModal && (
        <TaskModal
          mode={taskModalMode}
          editingTask={editingTask}
          setEditingTask={setEditingTask}
          phaseNames={phaseNames}
          phases={phases}
          categories={categories}
          saving={saving}
          onClose={() => { setShowTaskModal(false); setSelectedTask(null); resetEditingTask() }}
          onSave={handleSaveTask}
          onDelete={taskModalMode === 'edit' ? handleDeleteTask : undefined}
          onOpenCategoryModal={(phaseId) => { setShowTaskModal(false); setSelectedPhaseForCategory(phaseId); setShowCategoryModal(true) }}
        />
      )}

      {showPhaseModal && (
        <PhaseModal
          phases={phases}
          newPhaseName={newPhaseName}
          setNewPhaseName={setNewPhaseName}
          editingPhase={editingPhase}
          setEditingPhase={setEditingPhase}
          onClose={() => setShowPhaseModal(false)}
          onAddPhase={() => addPhase(newPhaseName)}
          onUpdatePhase={(id, name) => updatePhase(id, name, tasks, fetchTasks)}
          onDeletePhase={(id) => deletePhase(id, tasks, fetchTasks)}
        />
      )}

      {showCategoryModal && (
        <CategoryModal
          phases={phases}
          categories={categories}
          newCategoryName={newCategoryName}
          setNewCategoryName={setNewCategoryName}
          selectedPhaseForCategory={selectedPhaseForCategory}
          setSelectedPhaseForCategory={setSelectedPhaseForCategory}
          editingCategory={editingCategory}
          setEditingCategory={setEditingCategory}
          onClose={() => setShowCategoryModal(false)}
          onAddCategory={() => selectedPhaseForCategory && addCategory(newCategoryName, selectedPhaseForCategory)}
          onUpdateCategory={(id, name) => updateCategory(id, name, phases, fetchTasks)}
          onDeleteCategory={(id) => deleteCategory(id, phases, tasks, fetchTasks)}
          onMoveCategoryOrder={moveCategoryOrder}
        />
      )}
    </div>
  )
}
