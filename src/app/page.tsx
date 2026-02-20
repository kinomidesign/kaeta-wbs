'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { DayPicker, DateRange } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { ja } from 'date-fns/locale'

// Supabase クライアント
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Task {
  id: number
  phase: string
  category: string
  name: string
  owner: string
  status: string
  start_date: string
  end_date: string
  effort: string | null
  priority: string
  note: string | null
  indent_level?: number
}

interface Phase {
  id: number
  name: string
  sort_order: number
}

interface AccordionState {
  phases: Record<string, boolean>
  categories: Record<string, boolean>
}

export default function KaetaWBS() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [phases, setPhases] = useState<Phase[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [taskModalMode, setTaskModalMode] = useState<'add' | 'edit'>('add')
  const [showPhaseModal, setShowPhaseModal] = useState(false)
  const [viewStartDate, setViewStartDate] = useState('2026-02-24')
  const [filterPhase, setFilterPhase] = useState('all')
  const [filterOwner, setFilterOwner] = useState('all')
  const [saving, setSaving] = useState(false)

  // アコーディオン状態
  const [accordionState, setAccordionState] = useState<AccordionState>({
    phases: {},
    categories: {}
  })

  const statuses = ['未着手', '進行中', '完了', '保留']
  const owners = ['エンジニア', 'デザイナー', '共同']
  const priorities = ['必須', '推奨', '任意']

  // デフォルトフェーズ（DBからロードできない場合のフォールバック）
  const defaultPhases = ['Phase 1', 'Phase 1.5', 'Phase 2']

  // 利用可能なフェーズ名リスト
  const phaseNames = useMemo(() => {
    if (phases.length > 0) {
      return phases.map(p => p.name)
    }
    return defaultPhases
  }, [phases])

  // 既存カテゴリを抽出
  const existingCategories = useMemo(() => {
    const categories = [...new Set(tasks.map(t => t.category).filter(Boolean))]
    return categories.sort()
  }, [tasks])

  // ドラッグ関連の状態
  const [dragState, setDragState] = useState<{
    taskId: number | null
    type: 'move' | 'resize-start' | 'resize-end' | null
    startX: number
    originalStart: string
    originalEnd: string
  }>({ taskId: null, type: null, startX: 0, originalStart: '', originalEnd: '' })
  const ganttRef = useRef<HTMLDivElement>(null)

  // 新規/編集タスク用の状態
  const [editingTask, setEditingTask] = useState({
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

  // DateRangePicker用
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [showDatePicker, setShowDatePicker] = useState(false)

  // データ取得
  useEffect(() => {
    fetchTasks()
    fetchPhases()
  }, [])

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

  // タスク更新
  const updateTask = async (id: number, field: string, value: string | number) => {
    setSaving(true)

    setTasks(tasks.map(t => t.id === id ? { ...t, [field]: value } : t))
    if (selectedTask && selectedTask.id === id) {
      setSelectedTask({ ...selectedTask, [field]: value })
    }

    const { error } = await supabase
      .from('tasks')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('Error updating task:', error)
      fetchTasks()
    }

    setSaving(false)
  }

  // ステータストグル
  const toggleStatus = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation()
    const currentIndex = statuses.indexOf(task.status)
    const nextIndex = (currentIndex + 1) % statuses.length
    await updateTask(task.id, 'status', statuses[nextIndex])
  }

  // インデント操作
  const changeIndent = async (task: Task, delta: number, e: React.MouseEvent) => {
    e.stopPropagation()
    const currentLevel = task.indent_level || 0
    const newLevel = Math.max(0, Math.min(3, currentLevel + delta))
    if (newLevel !== currentLevel) {
      await updateTask(task.id, 'indent_level', newLevel)
    }
  }

  // タスク追加
  const addTask = async () => {
    if (!editingTask.name || !editingTask.start_date || !editingTask.end_date) return

    setSaving(true)
    const { data, error } = await supabase
      .from('tasks')
      .insert([{
        ...editingTask,
        indent_level: editingTask.indent_level || 0
      }])
      .select()

    if (error) {
      console.error('Error adding task:', error)
    } else if (data) {
      setTasks([...tasks, data[0]])
      setShowTaskModal(false)
      resetEditingTask()
    }
    setSaving(false)
  }

  // タスク編集保存
  const saveTask = async () => {
    if (!selectedTask) return
    if (!editingTask.name || !editingTask.start_date || !editingTask.end_date) return

    setSaving(true)
    const { error } = await supabase
      .from('tasks')
      .update({
        ...editingTask,
        updated_at: new Date().toISOString()
      })
      .eq('id', selectedTask.id)

    if (error) {
      console.error('Error updating task:', error)
    } else {
      setTasks(tasks.map(t => t.id === selectedTask.id ? { ...t, ...editingTask } : t))
      setShowTaskModal(false)
      setSelectedTask(null)
      resetEditingTask()
    }
    setSaving(false)
  }

  // タスク削除
  const deleteTask = async () => {
    if (!selectedTask) return
    if (!confirm('このタスクを削除しますか？')) return

    setSaving(true)
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', selectedTask.id)

    if (error) {
      console.error('Error deleting task:', error)
    } else {
      setTasks(tasks.filter(t => t.id !== selectedTask.id))
      setShowTaskModal(false)
      setSelectedTask(null)
    }
    setSaving(false)
  }

  const resetEditingTask = () => {
    setEditingTask({
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
    setDateRange(undefined)
  }

  // タスクモーダルを開く（追加/編集）
  const openTaskModal = (mode: 'add' | 'edit', task?: Task, defaultPhase?: string, defaultCategory?: string) => {
    setTaskModalMode(mode)
    if (mode === 'edit' && task) {
      setSelectedTask(task)
      setEditingTask({
        phase: task.phase,
        category: task.category,
        name: task.name,
        owner: task.owner,
        status: task.status,
        start_date: task.start_date,
        end_date: task.end_date,
        effort: task.effort || '',
        priority: task.priority,
        note: task.note || '',
        indent_level: task.indent_level || 0
      })
      if (task.start_date && task.end_date) {
        setDateRange({
          from: new Date(task.start_date),
          to: new Date(task.end_date)
        })
      }
    } else {
      resetEditingTask()
      if (defaultPhase) {
        setEditingTask(prev => ({ ...prev, phase: defaultPhase }))
      }
      if (defaultCategory) {
        setEditingTask(prev => ({ ...prev, category: defaultCategory }))
      }
    }
    setShowTaskModal(true)
  }

  // フェーズ管理
  const [newPhaseName, setNewPhaseName] = useState('')
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null)

  const addPhase = async () => {
    if (!newPhaseName.trim()) return

    const maxOrder = phases.length > 0 ? Math.max(...phases.map(p => p.sort_order)) : 0
    const { data, error } = await supabase
      .from('phases')
      .insert([{ name: newPhaseName.trim(), sort_order: maxOrder + 1 }])
      .select()

    if (error) {
      console.error('Error adding phase:', error)
      alert('フェーズの追加に失敗しました')
    } else if (data) {
      setPhases([...phases, data[0]])
      setNewPhaseName('')
    }
  }

  const updatePhase = async (id: number, name: string) => {
    const oldPhase = phases.find(p => p.id === id)
    if (!oldPhase) return

    const { error } = await supabase
      .from('phases')
      .update({ name })
      .eq('id', id)

    if (error) {
      console.error('Error updating phase:', error)
    } else {
      setPhases(phases.map(p => p.id === id ? { ...p, name } : p))
      // タスクのphaseも更新
      if (oldPhase.name !== name) {
        await supabase
          .from('tasks')
          .update({ phase: name })
          .eq('phase', oldPhase.name)
        fetchTasks()
      }
    }
    setEditingPhase(null)
  }

  const deletePhase = async (id: number) => {
    const phase = phases.find(p => p.id === id)
    if (!phase) return

    const tasksInPhase = tasks.filter(t => t.phase === phase.name)
    if (tasksInPhase.length > 0) {
      if (!confirm(`このフェーズには${tasksInPhase.length}件のタスクがあります。フェーズを削除するとタスクも削除されます。続行しますか？`)) {
        return
      }
      await supabase.from('tasks').delete().eq('phase', phase.name)
    }

    const { error } = await supabase
      .from('phases')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting phase:', error)
    } else {
      setPhases(phases.filter(p => p.id !== id))
      fetchTasks()
    }
  }

  // アコーディオン操作
  const togglePhaseAccordion = (phase: string) => {
    setAccordionState(prev => ({
      ...prev,
      phases: { ...prev.phases, [phase]: !prev.phases[phase] }
    }))
  }

  const toggleCategoryAccordion = (phase: string, category: string) => {
    const key = `${phase}-${category}`
    setAccordionState(prev => ({
      ...prev,
      categories: { ...prev.categories, [key]: !prev.categories[key] }
    }))
  }

  const isPhaseExpanded = (phase: string) => accordionState.phases[phase] !== false
  const isCategoryExpanded = (phase: string, category: string) =>
    accordionState.categories[`${phase}-${category}`] !== false

  // ヘルパー関数
  const getStatusColor = (status: string) => {
    switch (status) {
      case '未着手': return 'bg-gray-100 text-dashboard-text-muted'
      case '進行中': return 'bg-blue-100 text-blue-800'
      case '完了': return 'bg-dashboard-success-bg text-dashboard-success-text'
      case '保留': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-dashboard-text-muted'
    }
  }

  const getOwnerColor = (owner: string) => {
    switch (owner) {
      case 'エンジニア': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'デザイナー': return 'bg-pink-100 text-pink-800 border-pink-200'
      case '共同': return 'bg-purple-100 text-purple-800 border-purple-200'
      default: return 'bg-gray-100 text-dashboard-text-muted border-gray-200'
    }
  }

  const getBarColor = (owner: string) => {
    switch (owner) {
      case 'エンジニア': return 'bg-accent-blue'
      case 'デザイナー': return 'bg-accent-pink'
      case '共同': return 'bg-accent-purple'
      default: return 'bg-gray-400'
    }
  }

  const getDaysBetween = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  }

  const getDaysFromStart = (date: string, viewStart: string) => {
    const taskDate = new Date(date)
    const startDate = new Date(viewStart)
    return Math.ceil((taskDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  }

  const generateDateRange = (startDate: string) => {
    const dates: Date[] = []
    const start = new Date(startDate)
    for (let i = 0; i < 56; i++) {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      dates.push(date)
    }
    return dates
  }

  const ganttDateRange = generateDateRange(viewStartDate)

  // ドラッグ操作のハンドラー
  const handleDragStart = (e: React.MouseEvent, task: Task, type: 'move' | 'resize-start' | 'resize-end') => {
    e.stopPropagation()
    e.preventDefault()
    setDragState({
      taskId: task.id,
      type,
      startX: e.clientX,
      originalStart: task.start_date,
      originalEnd: task.end_date
    })
  }

  const handleDragMove = (e: React.MouseEvent) => {
    if (!dragState.taskId || !dragState.type) return

    const deltaX = e.clientX - dragState.startX
    const daysDelta = Math.round(deltaX / 32)

    if (daysDelta === 0) return

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
      newStart = newStartDate.toISOString().split('T')[0]
      newEnd = newEndDate.toISOString().split('T')[0]
    } else if (dragState.type === 'resize-start') {
      const newStartDate = new Date(originalStart)
      newStartDate.setDate(newStartDate.getDate() + daysDelta)
      if (newStartDate < originalEnd) {
        newStart = newStartDate.toISOString().split('T')[0]
      }
    } else if (dragState.type === 'resize-end') {
      const newEndDate = new Date(originalEnd)
      newEndDate.setDate(newEndDate.getDate() + daysDelta)
      if (newEndDate > originalStart) {
        newEnd = newEndDate.toISOString().split('T')[0]
      }
    }

    setTasks(tasks.map(t =>
      t.id === dragState.taskId ? { ...t, start_date: newStart, end_date: newEnd } : t
    ))
  }

  const handleDragEnd = async () => {
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

    setDragState({ taskId: null, type: null, startX: 0, originalStart: '', originalEnd: '' })
  }

  // フィルタリング
  const filteredTasks = tasks.filter(task => {
    if (filterPhase !== 'all' && task.phase !== filterPhase) return false
    if (filterOwner !== 'all' && task.owner !== filterOwner) return false
    return true
  })

  // フェーズ・カテゴリでグループ化
  const groupedByPhase = useMemo(() => {
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

    return result
  }, [filteredTasks, phases])

  // DateRange選択時の処理
  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range)
    if (range?.from) {
      setEditingTask(prev => ({
        ...prev,
        start_date: range.from!.toISOString().split('T')[0],
        end_date: range.to ? range.to.toISOString().split('T')[0] : range.from!.toISOString().split('T')[0]
      }))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dashboard-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-blue mx-auto mb-4"></div>
          <p className="text-dashboard-text-muted">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dashboard-bg">
      {/* Header */}
      <div className="bg-dashboard-card border-b border-dashboard-border px-6 py-4 sticky top-0 z-30">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-dashboard-text-main">Kaeta! WBS / ガントチャート</h1>
            <p className="text-sm text-dashboard-text-muted">
              エンジニアと共有用プロジェクト管理
              {saving && <span className="ml-2 text-accent-blue">保存中...</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowPhaseModal(true)}
              className="bg-dashboard-card hover:bg-gray-50 text-dashboard-text-main border border-dashboard-border px-4 py-2 rounded-md font-medium"
            >
              フェーズ管理
            </button>
            <button
              onClick={() => openTaskModal('add')}
              className="bg-dashboard-primary hover:bg-gray-800 text-white px-4 py-2 rounded-md font-medium flex items-center gap-2"
            >
              <span className="text-xl">+</span> タスク追加
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 items-center flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-dashboard-text-muted">表示開始日:</span>
            <input
              type="date"
              value={viewStartDate}
              onChange={(e) => setViewStartDate(e.target.value)}
              className="border border-dashboard-border rounded-md px-2 py-1 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-dashboard-text-muted">フェーズ:</span>
            <select
              value={filterPhase}
              onChange={(e) => setFilterPhase(e.target.value)}
              className="border border-dashboard-border rounded-md px-2 py-1 text-sm"
            >
              <option value="all">すべて</option>
              {phaseNames.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-dashboard-text-muted">担当:</span>
            <select
              value={filterOwner}
              onChange={(e) => setFilterOwner(e.target.value)}
              className="border border-dashboard-border rounded-md px-2 py-1 text-sm"
            >
              <option value="all">すべて</option>
              {owners.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="flex gap-2 ml-auto">
            <span className="flex items-center gap-1 text-xs"><span className="w-3 h-3 rounded bg-accent-blue"></span>エンジニア</span>
            <span className="flex items-center gap-1 text-xs"><span className="w-3 h-3 rounded bg-accent-pink"></span>デザイナー</span>
            <span className="flex items-center gap-1 text-xs"><span className="w-3 h-3 rounded bg-accent-purple"></span>共同</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex overflow-hidden" style={{ height: 'calc(100vh - 140px)' }}>
        {/* Task List (Left) */}
        <div className="w-[450px] flex-shrink-0 bg-dashboard-card border-r border-dashboard-border overflow-y-auto">
          <div className="sticky top-0 bg-gray-50 border-b border-dashboard-border px-4 py-2 text-xs font-medium text-dashboard-text-muted grid grid-cols-12 gap-2">
            <div className="col-span-5">タスク名</div>
            <div className="col-span-3">担当</div>
            <div className="col-span-2">状態</div>
            <div className="col-span-2">操作</div>
          </div>

          {Object.entries(groupedByPhase).map(([phase, categories]) => (
            <div key={phase}>
              {/* Phase Header */}
              <div
                onClick={() => togglePhaseAccordion(phase)}
                className="bg-gray-100 text-dashboard-text-main px-4 py-3 text-sm font-semibold sticky top-8 z-10 cursor-pointer hover:bg-gray-200 flex items-center justify-between border-b border-dashboard-border"
              >
                <div className="flex items-center gap-2">
                  <span className={`transform transition-transform ${isPhaseExpanded(phase) ? 'rotate-90' : ''}`}>▶</span>
                  {phase}
                </div>
                <span className="text-xs text-dashboard-text-muted font-normal">
                  {Object.values(categories).flat().length} タスク
                </span>
              </div>

              {isPhaseExpanded(phase) && (
                <>
                  {Object.entries(categories).map(([category, categoryTasks]) => (
                    <div key={`${phase}-${category}`}>
                      {/* Category Header */}
                      <div
                        onClick={() => toggleCategoryAccordion(phase, category)}
                        className="bg-gray-50 text-dashboard-text-main px-4 py-2 pl-8 text-sm cursor-pointer hover:bg-gray-100 flex items-center justify-between border-b border-dashboard-border"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`transform transition-transform text-xs ${isCategoryExpanded(phase, category) ? 'rotate-90' : ''}`}>▶</span>
                          {category || '(カテゴリなし)'}
                        </div>
                        <span className="text-xs text-dashboard-text-muted">
                          {categoryTasks.length} タスク
                        </span>
                      </div>

                      {isCategoryExpanded(phase, category) && (
                        <>
                          {categoryTasks.map(task => (
                            <div
                              key={task.id}
                              onClick={() => openTaskModal('edit', task)}
                              className={`px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 grid grid-cols-12 gap-2 items-center ${selectedTask?.id === task.id ? 'bg-blue-50' : ''}`}
                              style={{ paddingLeft: `${16 + (task.indent_level || 0) * 16}px` }}
                            >
                              <div className="col-span-5">
                                <p className="text-sm font-medium text-dashboard-text-main truncate">{task.name}</p>
                                <p className="text-xs text-dashboard-text-muted">{task.start_date} 〜 {task.end_date}</p>
                              </div>
                              <div className="col-span-3">
                                <span className={`text-xs px-2 py-1 rounded border ${getOwnerColor(task.owner)}`}>
                                  {task.owner}
                                </span>
                              </div>
                              <div className="col-span-2">
                                <button
                                  onClick={(e) => toggleStatus(task, e)}
                                  className={`text-xs px-2 py-1 rounded cursor-pointer hover:opacity-80 transition-opacity ${getStatusColor(task.status)}`}
                                  title="クリックでステータス変更"
                                >
                                  {task.status}
                                </button>
                              </div>
                              <div className="col-span-2 flex gap-1">
                                <button
                                  onClick={(e) => changeIndent(task, -1, e)}
                                  className="text-xs px-1.5 py-1 rounded bg-gray-100 hover:bg-gray-200 text-dashboard-text-muted"
                                  title="インデント減"
                                >
                                  ←
                                </button>
                                <button
                                  onClick={(e) => changeIndent(task, 1, e)}
                                  className="text-xs px-1.5 py-1 rounded bg-gray-100 hover:bg-gray-200 text-dashboard-text-muted"
                                  title="インデント増"
                                >
                                  →
                                </button>
                              </div>
                            </div>
                          ))}

                          {/* クイック追加ボタン */}
                          <div
                            onClick={() => openTaskModal('add', undefined, phase, category)}
                            className="px-4 py-2 pl-12 border-b border-gray-100 cursor-pointer hover:bg-blue-50 text-accent-blue text-sm flex items-center gap-1"
                          >
                            <span>+</span> タスクを追加
                          </div>
                        </>
                      )}
                    </div>
                  ))}

                  {/* フェーズ末尾にクイック追加（カテゴリなし） */}
                  {Object.keys(categories).length === 0 && (
                    <div
                      onClick={() => openTaskModal('add', undefined, phase, '')}
                      className="px-4 py-2 pl-8 border-b border-gray-100 cursor-pointer hover:bg-blue-50 text-accent-blue text-sm flex items-center gap-1"
                    >
                      <span>+</span> タスクを追加
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {/* Gantt Chart (Right) */}
        <div
          ref={ganttRef}
          className="flex-1 overflow-x-auto overflow-y-auto"
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
        >
          <div className="sticky top-0 bg-dashboard-card z-20 border-b border-dashboard-border">
            <div className="flex">
              {ganttDateRange.map((date, i) => {
                const isWeekend = date.getDay() === 0 || date.getDay() === 6
                const isMonday = date.getDay() === 1
                const isFirstOfMonth = date.getDate() === 1
                return (
                  <div
                    key={i}
                    className={`w-8 flex-shrink-0 text-center border-r border-gray-100 ${isWeekend ? 'bg-gray-50' : ''}`}
                  >
                    {(isMonday || isFirstOfMonth || i === 0) && (
                      <div className="text-xs text-accent-blue font-medium py-1 border-b border-dashboard-border bg-gray-50">
                        {date.getMonth() + 1}/{date.getDate()}
                      </div>
                    )}
                    {!(isMonday || isFirstOfMonth || i === 0) && (
                      <div className="text-xs text-dashboard-text-muted py-1 border-b border-dashboard-border">
                        {date.getDate()}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {Object.entries(groupedByPhase).map(([phase, categories]) => (
            <div key={phase}>
              {/* Phase spacer */}
              <div className="h-12 bg-gray-100 border-b border-dashboard-border"></div>

              {isPhaseExpanded(phase) && (
                <>
                  {Object.entries(categories).map(([category, categoryTasks]) => (
                    <div key={`${phase}-${category}`}>
                      {/* Category spacer */}
                      <div className="h-10 bg-gray-50 border-b border-dashboard-border"></div>

                      {isCategoryExpanded(phase, category) && (
                        <>
                          {categoryTasks.map(task => {
                            const startOffset = getDaysFromStart(task.start_date, viewStartDate)
                            const duration = getDaysBetween(task.start_date, task.end_date)

                            return (
                              <div
                                key={task.id}
                                className={`h-12 flex items-center border-b border-gray-100 relative ${selectedTask?.id === task.id ? 'bg-blue-50' : ''}`}
                                onClick={() => openTaskModal('edit', task)}
                              >
                                <div className="absolute inset-0 flex">
                                  {ganttDateRange.map((date, i) => {
                                    const isWeekend = date.getDay() === 0 || date.getDay() === 6
                                    return (
                                      <div
                                        key={i}
                                        className={`w-8 flex-shrink-0 border-r border-gray-50 ${isWeekend ? 'bg-gray-50' : ''}`}
                                      />
                                    )
                                  })}
                                </div>

                                {startOffset >= 0 && startOffset < 56 && (
                                  <div
                                    className={`absolute h-6 rounded-md shadow-sm ${getBarColor(task.owner)} ${task.status === '完了' ? 'opacity-50' : ''} flex items-center group select-none`}
                                    style={{
                                      left: `${startOffset * 32}px`,
                                      width: `${Math.max(Math.min(duration, 56 - startOffset) * 32 - 4, 32)}px`
                                    }}
                                  >
                                    {/* 左端リサイズハンドル */}
                                    <div
                                      className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 rounded-l"
                                      onMouseDown={(e) => handleDragStart(e, task, 'resize-start')}
                                    />
                                    {/* 中央ドラッグ領域 */}
                                    <div
                                      className="flex-1 h-full flex items-center justify-center cursor-move px-2"
                                      onMouseDown={(e) => handleDragStart(e, task, 'move')}
                                    >
                                      <span className="text-xs text-dashboard-text-main font-medium truncate pointer-events-none drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
                                        {task.name}
                                      </span>
                                    </div>
                                    {/* 右端リサイズハンドル */}
                                    <div
                                      className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 rounded-r"
                                      onMouseDown={(e) => handleDragStart(e, task, 'resize-end')}
                                    />
                                  </div>
                                )}
                              </div>
                            )
                          })}

                          {/* クイック追加スペース */}
                          <div className="h-10 border-b border-gray-100"></div>
                        </>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Task Modal (統一された追加/編集モーダル) */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4" onClick={() => { setShowTaskModal(false); setSelectedTask(null); resetEditingTask(); }}>
          <div className="bg-dashboard-card rounded-[16px] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-lg" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-dashboard-text-main">
                  {taskModalMode === 'add' ? 'タスクを追加' : 'タスクを編集'}
                </h2>
                <button onClick={() => { setShowTaskModal(false); setSelectedTask(null); resetEditingTask(); }} className="text-dashboard-text-muted hover:text-dashboard-text-main text-2xl">×</button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dashboard-text-muted mb-1">タスク名 *</label>
                  <input
                    type="text"
                    value={editingTask.name}
                    onChange={(e) => setEditingTask({ ...editingTask, name: e.target.value })}
                    className="w-full border border-dashboard-border rounded-md px-3 py-2"
                    placeholder="タスク名を入力"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-dashboard-text-muted mb-2">フェーズ</label>
                  <div className="flex gap-2 flex-wrap">
                    {phaseNames.map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setEditingTask({ ...editingTask, phase: p })}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                          editingTask.phase === p
                            ? 'bg-dashboard-primary text-white shadow-md'
                            : 'bg-gray-100 text-dashboard-text-muted hover:bg-gray-200'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dashboard-text-muted mb-1">カテゴリ</label>
                  <select
                    value={existingCategories.includes(editingTask.category) ? editingTask.category : '__new__'}
                    onChange={(e) => {
                      if (e.target.value === '__new__') {
                        setEditingTask({ ...editingTask, category: '' })
                      } else {
                        setEditingTask({ ...editingTask, category: e.target.value })
                      }
                    }}
                    className="w-full border border-dashboard-border rounded-md px-3 py-2"
                  >
                    <option value="">カテゴリを選択</option>
                    {existingCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="__new__">+ 新規カテゴリを追加</option>
                  </select>
                  {!existingCategories.includes(editingTask.category) && editingTask.category !== '' && (
                    <input
                      type="text"
                      value={editingTask.category}
                      onChange={(e) => setEditingTask({ ...editingTask, category: e.target.value })}
                      className="w-full border border-dashboard-border rounded-md px-3 py-2 mt-2"
                      placeholder="新規カテゴリ名を入力"
                    />
                  )}
                  {!existingCategories.includes(editingTask.category) && editingTask.category === '' && (
                    <input
                      type="text"
                      value={editingTask.category}
                      onChange={(e) => setEditingTask({ ...editingTask, category: e.target.value })}
                      className="w-full border border-dashboard-border rounded-md px-3 py-2 mt-2"
                      placeholder="新規カテゴリ名を入力"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dashboard-text-muted mb-2">担当者</label>
                    <div className="flex gap-2 flex-wrap">
                      {owners.map(o => (
                        <button
                          key={o}
                          type="button"
                          onClick={() => setEditingTask({ ...editingTask, owner: o })}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium border-2 transition-all ${
                            editingTask.owner === o
                              ? `${getOwnerColor(o)} border-current ring-2 ring-offset-1`
                              : 'bg-gray-50 text-dashboard-text-muted border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dashboard-text-muted mb-2">優先度</label>
                    <div className="flex gap-2 flex-wrap">
                      {priorities.map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setEditingTask({ ...editingTask, priority: p })}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium border-2 transition-all ${
                            editingTask.priority === p
                              ? p === '必須' ? 'bg-red-100 text-red-700 border-red-300 ring-2 ring-red-200 ring-offset-1'
                              : p === '推奨' ? 'bg-yellow-100 text-yellow-700 border-yellow-300 ring-2 ring-yellow-200 ring-offset-1'
                              : 'bg-gray-100 text-dashboard-text-main border-gray-300 ring-2 ring-gray-200 ring-offset-1'
                              : 'bg-gray-50 text-dashboard-text-muted border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ステータス（編集時のみ） */}
                {taskModalMode === 'edit' && (
                  <div>
                    <label className="block text-sm font-medium text-dashboard-text-muted mb-2">ステータス</label>
                    <div className="flex gap-2 flex-wrap">
                      {statuses.map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setEditingTask({ ...editingTask, status: s })}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                            editingTask.status === s
                              ? getStatusColor(s)
                              : 'bg-gray-50 text-dashboard-text-muted hover:bg-gray-100'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 期間選択 */}
                <div>
                  <label className="block text-sm font-medium text-dashboard-text-muted mb-2">期間 *</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowDatePicker(!showDatePicker)}
                      className="w-full border border-dashboard-border rounded-md px-3 py-2 text-left flex justify-between items-center"
                    >
                      <span className={editingTask.start_date ? 'text-dashboard-text-main' : 'text-dashboard-text-muted'}>
                        {editingTask.start_date && editingTask.end_date
                          ? `${editingTask.start_date} 〜 ${editingTask.end_date}`
                          : '日付を選択してください'}
                      </span>
                      <span>📅</span>
                    </button>

                    {showDatePicker && (
                      <div className="absolute z-50 mt-1 bg-dashboard-card rounded-md shadow-lg border border-dashboard-border p-2">
                        <DayPicker
                          mode="range"
                          selected={dateRange}
                          onSelect={handleDateRangeSelect}
                          locale={ja}
                          numberOfMonths={1}
                          className="text-sm"
                        />
                        <div className="flex justify-end mt-2 border-t border-dashboard-border pt-2">
                          <button
                            type="button"
                            onClick={() => setShowDatePicker(false)}
                            className="text-sm text-accent-blue hover:underline"
                          >
                            閉じる
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dashboard-text-muted mb-1">工数</label>
                  <input
                    type="text"
                    value={editingTask.effort}
                    onChange={(e) => setEditingTask({ ...editingTask, effort: e.target.value })}
                    className="w-full border border-dashboard-border rounded-md px-3 py-2"
                    placeholder="例: 2-3時間、要見積もり"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-dashboard-text-muted mb-1">メモ</label>
                  <textarea
                    value={editingTask.note}
                    onChange={(e) => setEditingTask({ ...editingTask, note: e.target.value })}
                    className="w-full border border-dashboard-border rounded-md px-3 py-2 h-20"
                    placeholder="補足情報を入力..."
                  />
                </div>
              </div>

              <div className="flex justify-between mt-6 pt-4 border-t border-dashboard-border">
                {taskModalMode === 'edit' ? (
                  <button
                    onClick={deleteTask}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    タスクを削除
                  </button>
                ) : (
                  <div></div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowTaskModal(false); setSelectedTask(null); resetEditingTask(); }}
                    className="px-4 py-2 text-dashboard-text-muted hover:text-dashboard-text-main"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={taskModalMode === 'add' ? addTask : saveTask}
                    disabled={!editingTask.name || !editingTask.start_date || !editingTask.end_date || saving}
                    className="bg-dashboard-primary text-white px-6 py-2 rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? '保存中...' : taskModalMode === 'add' ? '追加する' : '保存する'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Phase Management Modal */}
      {showPhaseModal && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4" onClick={() => setShowPhaseModal(false)}>
          <div className="bg-dashboard-card rounded-[16px] w-full max-w-md shadow-lg" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-dashboard-text-main">フェーズ管理</h2>
                <button onClick={() => setShowPhaseModal(false)} className="text-dashboard-text-muted hover:text-dashboard-text-main text-2xl">×</button>
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
                  onClick={addPhase}
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
                          onClick={() => updatePhase(phase.id, editingPhase.name)}
                          className="text-accent-blue text-sm hover:underline"
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
                          className="text-accent-blue text-sm hover:underline"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => deletePhase(phase.id)}
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
                  onClick={() => setShowPhaseModal(false)}
                  className="w-full bg-gray-100 text-dashboard-text-main px-4 py-2 rounded-md hover:bg-gray-200"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
