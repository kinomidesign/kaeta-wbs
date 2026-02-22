'use client'

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import type { Task, EditingTask, StatusPopupState } from '@/types'
import { TABLE_WIDTH } from '@/constants'

// Hooks
import {
  useTasks,
  usePhases,
  useCategories,
  useAccordion,
  useGanttDrag,
  useTaskDrag,
  useVirtualGantt,
  useNewTaskDrag
} from '@/hooks'

// Components
import {
  LoadingSpinner,
  Header,
  StatusPopup,
  TaskModal,
  PhaseModal,
  CategoryModal,
  GanttDateHeader,
  GanttBar,
  TaskRow
} from '@/components'

// 初期編集タスク
const initialEditingTask: EditingTask = {
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
}

export default function KaetaWBS() {
  // フェーズ・カテゴリ
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

  // タスク
  const {
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
  } = useTasks({ phases, categories })

  // アコーディオン
  const {
    togglePhaseAccordion,
    toggleCategoryAccordion,
    isPhaseExpanded,
    isCategoryExpanded,
    collapsedTasks,
    toggleTaskCollapse,
    isTaskCollapsed
  } = useAccordion()

  // ガントチャートドラッグ
  const {
    dragState,
    hasDraggedRef,
    handleDragStart: handleGanttDragStart,
    handleDragMove,
    handleDragEnd,
    saving: ganttSaving
  } = useGanttDrag({ tasks, setTasks, fetchTasks })

  // タスクリストドラッグ
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

  // 仮想スクロール
  const {
    ganttRef,
    columnVirtualizer,
    currentViewDate,
    updateCurrentViewDate,
    scrollToYear,
    scrollToDate,
    scrollToToday,
    virtualItems,
    totalSize
  } = useVirtualGantt({ initialScrollToToday: true })

  // 新規タスクドラッグ（空白エリアからの作成）
  const handleCreateTaskFromDrag = useCallback((phase: string, category: string, startDate: string, endDate: string) => {
    setEditingTask({
      ...initialEditingTask,
      phase,
      category,
      start_date: startDate,
      end_date: endDate
    })
    setTaskModalMode('add')
    setShowTaskModal(true)
  }, [])

  // 既存タスクへの日付設定
  const handleUpdateTaskDate = useCallback(async (taskId: number, startDate: string, endDate: string) => {
    await updateTask(taskId, 'start_date', startDate)
    await updateTask(taskId, 'end_date', endDate)
  }, [updateTask])

  const {
    handleTaskDateDragStart,
    handleNewTaskDragMove,
    handleNewTaskDragEnd,
    getPreviewInfo,
    isNewTaskDragging,
    draggingTaskId
  } = useNewTaskDrag({
    ganttRef: ganttRef as React.RefObject<HTMLDivElement>,
    onCreateTask: handleCreateTaskFromDrag,
    onUpdateTaskDate: handleUpdateTaskDate
  })

  // モーダル状態
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [taskModalMode, setTaskModalMode] = useState<'add' | 'edit'>('add')
  const [showPhaseModal, setShowPhaseModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [editingTask, setEditingTask] = useState<EditingTask>(initialEditingTask)

  // フィルター
  const [filterPhase, setFilterPhase] = useState('all')
  const [filterOwner, setFilterOwner] = useState('all')

  // ステータスポップアップ
  const [statusPopup, setStatusPopup] = useState<StatusPopupState | null>(null)

  // テーブルリサイズ
  const [tableWidth, setTableWidth] = useState<number>(TABLE_WIDTH.default)
  const [isResizing, setIsResizing] = useState(false)
  const resizeStartXRef = useRef<number>(0)
  const resizeStartWidthRef = useRef<number>(TABLE_WIDTH.default)

  // スクロール同期
  const taskListRef = useRef<HTMLDivElement>(null)
  const isSyncingScrollRef = useRef(false)

  // フィルター済みタスク
  const filteredTasks = useMemo(
    () => getFilteredTasks(filterPhase, filterOwner),
    [getFilteredTasks, filterPhase, filterOwner]
  )

  // フェーズ・カテゴリでグループ化
  const groupedByPhase = useMemo(
    () => getGroupedByPhase(filteredTasks, phases, categories),
    [getGroupedByPhase, filteredTasks, phases, categories]
  )

  // スクロール同期
  const handleTaskListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isSyncingScrollRef.current) return
    isSyncingScrollRef.current = true
    if (ganttRef.current) {
      ganttRef.current.scrollTop = e.currentTarget.scrollTop
    }
    requestAnimationFrame(() => {
      isSyncingScrollRef.current = false
    })
  }

  const handleGanttScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isSyncingScrollRef.current) return
    isSyncingScrollRef.current = true
    if (taskListRef.current) {
      taskListRef.current.scrollTop = e.currentTarget.scrollTop
    }
    updateCurrentViewDate()
    requestAnimationFrame(() => {
      isSyncingScrollRef.current = false
    })
  }

  // テーブルリサイズ
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    resizeStartXRef.current = e.clientX
    resizeStartWidthRef.current = tableWidth
  }

  useEffect(() => {
    if (!isResizing) return

    const handleResizeMove = (e: MouseEvent) => {
      const delta = e.clientX - resizeStartXRef.current
      const newWidth = Math.max(TABLE_WIDTH.min, Math.min(TABLE_WIDTH.max, resizeStartWidthRef.current + delta))
      setTableWidth(newWidth)
    }

    const handleResizeEnd = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleResizeMove)
    document.addEventListener('mouseup', handleResizeEnd)

    return () => {
      document.removeEventListener('mousemove', handleResizeMove)
      document.removeEventListener('mouseup', handleResizeEnd)
    }
  }, [isResizing])

  // ポップアップクリックアウト
  useEffect(() => {
    const handleClickOutside = () => {
      setStatusPopup(null)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  // タスク追加モーダル
  const handleAddTask = () => {
    const firstPhase = phaseNames[0] || 'Phase 1'
    const phase = phases.find(p => p.name === firstPhase)
    const phaseCategories = phase ? categories.filter(c => c.phase_id === phase.id) : []
    const firstCategory = phaseCategories.length > 0 ? phaseCategories[0].name : ''

    setEditingTask({
      ...initialEditingTask,
      phase: firstPhase,
      category: firstCategory
    })
    setTaskModalMode('add')
    setShowTaskModal(true)
  }

  // タスククリック（編集）
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    setEditingTask({
      phase: task.phase,
      category: task.category,
      name: task.name,
      owner: task.owner,
      status: task.status,
      start_date: task.start_date || '',
      end_date: task.end_date || '',
      effort: task.effort || '',
      priority: task.priority,
      note: task.note || '',
      indent_level: task.indent_level || 0
    })
    setTaskModalMode('edit')
    setShowTaskModal(true)
  }

  // タスク保存
  const handleSaveTask = async () => {
    if (taskModalMode === 'add') {
      await addTask(editingTask, phases, categories)
    } else if (selectedTask) {
      await saveTask(selectedTask.id, editingTask, phases, categories)
    }
    setShowTaskModal(false)
    setSelectedTask(null)
  }

  // タスク削除
  const handleDeleteTask = async () => {
    if (selectedTask && confirm('このタスクを削除しますか？')) {
      await deleteTask(selectedTask.id)
      setShowTaskModal(false)
      setSelectedTask(null)
    }
  }

  // ステータスクリック
  const handleStatusClick = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation()
    setStatusPopup({
      taskId: task.id,
      x: e.clientX,
      y: e.clientY
    })
  }

  // ステータス変更
  const handleStatusSelect = async (taskId: number, status: string) => {
    await updateTask(taskId, 'status', status)
    setStatusPopup(null)
  }

  // インデント変更
  const handleChangeIndent = async (e: React.MouseEvent, taskId: number, delta: number) => {
    e.stopPropagation()
    e.preventDefault()
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    const currentIndent = task.indent_level || 0
    const newIndent = Math.max(0, Math.min(3, currentIndent + delta))
    if (newIndent !== currentIndent) {
      await updateTask(taskId, 'indent_level', newIndent)
    }
  }

  // 日付クリックでスクロール
  const handleDateClick = (startDate: string, e: React.MouseEvent) => {
    e.stopPropagation()
    scrollToDate(startDate)
  }

  // ローディング
  if (loading) {
    return <LoadingSpinner />
  }

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
        onAddTask={handleAddTask}
        onScrollToDate={(date) => scrollToDate(date)}
        onScrollToYear={scrollToYear}
        currentViewDate={currentViewDate}
      />

      {/* メインコンテンツ */}
      <div
        className="flex overflow-hidden"
        style={{ height: 'calc(100vh - 140px)' }}
        onMouseMove={(e) => {
          handleDragMove(e)
          handleNewTaskDragMove(e)
        }}
        onMouseUp={() => {
          handleDragEnd()
          handleNewTaskDragEnd()
        }}
        onMouseLeave={() => {
          handleDragEnd()
          handleNewTaskDragEnd()
        }}
      >
        {/* タスクリスト */}
        <div
          ref={taskListRef}
          className="flex-shrink-0 overflow-y-auto bg-dashboard-card border-r border-dashboard-border scrollbar-hide"
          style={{ width: tableWidth }}
          onScroll={handleTaskListScroll}
        >
          {/* ヘッダー */}
          <div className="sticky top-0 bg-dashboard-card z-20 border-b border-dashboard-border px-4 h-7 flex items-center">
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-dashboard-text-muted w-full">
              <div className="col-span-5">タスク名</div>
              <div className="col-span-2 text-center">担当</div>
              <div className="col-span-3 text-center">期間</div>
              <div className="col-span-2 text-center">ステータス</div>
            </div>
          </div>

          {/* タスク一覧 */}
          {Object.entries(groupedByPhase).map(([phase, categoryGroup]) => {
            const isPhaseOpen = isPhaseExpanded(phase)

            return (
              <div key={phase}>
                {/* フェーズヘッダー */}
                <div
                  className={`sticky top-7 z-10 bg-gray-100 px-4 h-10 font-bold text-dashboard-text-main flex items-center gap-2 cursor-pointer hover:bg-gray-200 border-b border-dashboard-border ${
                    taskDragState.draggingTaskId && taskDragState.dropTarget?.phase === phase && !taskDragState.dropTarget?.category ? 'bg-blue-100' : ''
                  }`}
                  onClick={() => togglePhaseAccordion(phase)}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDropTargetForPhase(phase)
                  }}
                  onDrop={(e) => handleDropToPhase(e, phase)}
                >
                  <span className={`transform transition-transform ${isPhaseOpen ? 'rotate-90' : ''}`}>▶</span>
                  {phase}
                </div>

                {/* カテゴリ */}
                {isPhaseOpen && Object.entries(categoryGroup).map(([category, categoryTasks]) => {
                  const isCategoryOpen = isCategoryExpanded(phase, category)

                  return (
                    <div key={`${phase}-${category}`}>
                      {/* カテゴリヘッダー */}
                      {category && (
                        <div
                          className={`sticky top-[68px] z-10 bg-gray-50 h-7 text-sm font-medium text-dashboard-text-muted flex items-center gap-2 cursor-pointer hover:bg-gray-100 border-b border-dashboard-border ${
                            taskDragState.draggingTaskId && taskDragState.dropTarget?.phase === phase && taskDragState.dropTarget?.category === category ? 'bg-blue-50' : ''
                          }`}
                          style={{ paddingLeft: '32px', paddingRight: '16px' }}
                          onClick={() => toggleCategoryAccordion(phase, category)}
                          onDragOver={(e) => {
                            e.preventDefault()
                            setDropTargetForCategory(phase, category)
                          }}
                          onDrop={(e) => handleDropToCategory(e, phase, category)}
                        >
                          <span className={`transform transition-transform text-xs ${isCategoryOpen ? 'rotate-90' : ''}`}>▶</span>
                          {category}
                          <span className="text-xs text-dashboard-text-muted ml-1">({categoryTasks.length})</span>
                        </div>
                      )}

                      {/* タスク */}
                      {(category ? isCategoryOpen : true) && categoryTasks.map((task, taskIndex) => {
                        const hasChildren = categoryTasks.some((t, i) =>
                          i > taskIndex && (t.indent_level || 0) > (task.indent_level || 0)
                        )
                        const isHidden = (() => {
                          for (let i = taskIndex - 1; i >= 0; i--) {
                            const prevTask = categoryTasks[i]
                            if ((prevTask.indent_level || 0) < (task.indent_level || 0)) {
                              if (collapsedTasks[prevTask.id]) return true
                              break
                            }
                          }
                          return false
                        })()

                        return (
                          <TaskRow
                            key={task.id}
                            task={task}
                            taskIndex={taskIndex}
                            categoryTasks={categoryTasks}
                            selectedTaskId={selectedTask?.id ?? null}
                            taskDragState={taskDragState}
                            collapsedTasks={collapsedTasks}
                            onTaskClick={handleTaskClick}
                            onDragStart={handleTaskDragStart}
                            onDragEnd={handleTaskDragEnd}
                            onDragOver={handleTaskDragOver}
                            onDrop={handleTaskDrop}
                            onStatusClick={handleStatusClick}
                            onDateClick={handleDateClick}
                            onToggleCollapse={toggleTaskCollapse}
                            onChangeIndent={handleChangeIndent}
                            hasChildren={hasChildren}
                            isHidden={isHidden}
                          />
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* リサイズハンドル */}
        <div
          className={`w-1 cursor-col-resize hover:bg-accent-blue flex-shrink-0 transition-colors ${isResizing ? 'bg-accent-blue' : 'bg-gray-200'}`}
          onMouseDown={handleResizeStart}
        />

        {/* ガントチャート */}
        <div
          ref={ganttRef}
          className="flex-1 overflow-auto bg-white"
          onScroll={handleGanttScroll}
        >
          {/* 日付ヘッダー（仮想スクロール） */}
          <GanttDateHeader
            virtualItems={virtualItems}
            totalSize={totalSize}
          />

          {/* ガントバー */}
          <div style={{ width: totalSize, position: 'relative' }}>
            {Object.entries(groupedByPhase).map(([phase, categoryGroup]) => {
              const isPhaseOpen = isPhaseExpanded(phase)

              return (
                <div key={phase}>
                  {/* フェーズ行（空行） */}
                  <div className="h-10 border-b border-gray-100" />

                  {/* カテゴリ */}
                  {isPhaseOpen && Object.entries(categoryGroup).map(([category, categoryTasks]) => {
                    const isCategoryOpen = isCategoryExpanded(phase, category)

                    return (
                      <div key={`${phase}-${category}`}>
                        {/* カテゴリ行（ドラッグ対象外） */}
                        {category && (
                          <div className="h-7 border-b border-gray-100 bg-gray-50/50" />
                        )}

                        {/* タスクバー */}
                        {(category ? isCategoryOpen : true) && categoryTasks.map((task, taskIndex) => {
                          const isHidden = (() => {
                            for (let i = taskIndex - 1; i >= 0; i--) {
                              const prevTask = categoryTasks[i]
                              if ((prevTask.indent_level || 0) < (task.indent_level || 0)) {
                                if (collapsedTasks[prevTask.id]) return true
                                break
                              }
                            }
                            return false
                          })()

                          if (isHidden) return null

                          const hasDate = task.start_date && task.end_date

                          return (
                            <div
                              key={task.id}
                              className="h-12 border-b border-gray-100 relative cursor-crosshair hover:bg-blue-50/30 group/taskrow"
                              onMouseDown={(e) => {
                                // ガントバー以外の領域でドラッグ開始
                                handleTaskDateDragStart(e, task.id, task.phase, task.category)
                              }}
                            >
                              {/* 日付設定済みの場合はガントバーを表示 */}
                              {hasDate && (
                                <div className="absolute top-3 z-10">
                                  <GanttBar
                                    task={task}
                                    onDragStart={handleGanttDragStart}
                                    isDragging={dragState.taskId === task.id}
                                  />
                                </div>
                              )}
                              {/* 日付未設定時のヒント表示 */}
                              {!hasDate && (
                                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex items-center opacity-0 group-hover/taskrow:opacity-100 transition-opacity pointer-events-none z-0">
                                  <span className="text-xs text-gray-400 bg-white px-2 py-1 rounded border border-dashed border-gray-300">
                                    ドラッグで日付を設定
                                  </span>
                                </div>
                              )}
                              {/* ドラッグ中のプレビュー */}
                              {isNewTaskDragging && draggingTaskId === task.id && (() => {
                                const preview = getPreviewInfo()
                                if (!preview) return null
                                return (
                                  <div
                                    className="absolute top-3 h-6 bg-blue-200 border-2 border-blue-400 rounded opacity-70 z-20"
                                    style={{ left: preview.left, width: preview.width }}
                                  >
                                    <span className="absolute -top-5 left-0 text-xs bg-gray-800 text-white px-1 rounded whitespace-nowrap">
                                      {preview.startDate.slice(5)}
                                    </span>
                                    <span className="absolute -top-5 right-0 text-xs bg-gray-800 text-white px-1 rounded whitespace-nowrap">
                                      {preview.endDate.slice(5)}
                                    </span>
                                  </div>
                                )
                              })()}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ステータスポップアップ */}
      {statusPopup && (
        <StatusPopup
          statusPopup={statusPopup}
          tasks={tasks}
          onSelectStatus={handleStatusSelect}
        />
      )}

      {/* タスクモーダル */}
      {showTaskModal && (
        <TaskModal
          mode={taskModalMode}
          editingTask={editingTask}
          setEditingTask={setEditingTask}
          phaseNames={phaseNames}
          phases={phases}
          categories={categories}
          saving={saving}
          onClose={() => {
            setShowTaskModal(false)
            setSelectedTask(null)
          }}
          onSave={handleSaveTask}
          onDelete={taskModalMode === 'edit' ? handleDeleteTask : undefined}
          onOpenCategoryModal={(phaseId) => {
            setSelectedPhaseForCategory(phaseId)
            setShowCategoryModal(true)
          }}
        />
      )}

      {/* フェーズモーダル */}
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

      {/* カテゴリモーダル */}
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
          onAddCategory={() => {
            if (selectedPhaseForCategory) {
              addCategory(newCategoryName, selectedPhaseForCategory)
            }
          }}
          onUpdateCategory={(id, name) => updateCategory(id, name, phases, fetchTasks)}
          onDeleteCategory={(id) => deleteCategory(id, phases, tasks, fetchTasks)}
          onMoveCategoryOrder={moveCategoryOrder}
        />
      )}
    </div>
  )
}
