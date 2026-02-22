'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { DayPicker, DateRange } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { IndentDecrease, IndentIncrease } from 'lucide-react'
// date-fns locale - 直接インポートでエラーが出る場合は動的にロード
import * as dateFnsLocale from 'date-fns/locale'

const ja = dateFnsLocale.ja

// Supabase クライアント - クライアントサイドでのみ作成
const supabase = typeof window !== 'undefined'
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  : null as unknown as ReturnType<typeof createClient>

interface Task {
  id: number
  phase: string
  category: string
  category_id: number | null
  name: string
  owner: string
  status: string
  start_date: string
  end_date: string
  effort: string | null
  priority: string
  note: string | null
  indent_level?: number
  sort_order?: number
}

interface Phase {
  id: number
  name: string
  sort_order: number
}

interface Category {
  id: number
  name: string
  phase_id: number
  sort_order: number
}

interface AccordionState {
  phases: Record<string, boolean>
  categories: Record<string, boolean>
}

export default function KaetaWBS() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [phases, setPhases] = useState<Phase[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [taskModalMode, setTaskModalMode] = useState<'add' | 'edit'>('add')
  const [showPhaseModal, setShowPhaseModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  // タイムラインの固定開始日（今年1月1日から365日分をレンダリング）
  const [viewStartDate] = useState(() => {
    const year = new Date().getFullYear()
    return `${year}-01-01`
  })
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

  // ガントチャートドラッグ関連の状態
  const [dragState, setDragState] = useState<{
    taskId: number | null
    type: 'move' | 'resize-start' | 'resize-end' | null
    startX: number
    originalStart: string
    originalEnd: string
  }>({ taskId: null, type: null, startX: 0, originalStart: '', originalEnd: '' })
  const ganttRef = useRef<HTMLDivElement>(null)
  // ドラッグが発生したかどうか（クリックと区別するため）
  const hasDraggedRef = useRef<boolean>(false)
  // スクロール同期中フラグ（無限ループ防止）
  const isSyncingScrollRef = useRef<boolean>(false)

  // タスクリストドラッグ＆ドロップ関連の状態
  const [taskDragState, setTaskDragState] = useState<{
    draggingTaskId: number | null
    startX: number
    previewIndent: number
    originalIndent: number
    dropTarget: {
      taskId: number | null
      position: 'before' | 'after' | 'child' | null
      phase?: string
      category?: string
    } | null
  }>({ draggingTaskId: null, startX: 0, previewIndent: 0, originalIndent: 0, dropTarget: null })
  // ドラッグオーバーのスロットリング用
  const lastDropTargetRef = useRef<string | null>(null)
  // ドロップ処理中フラグ（dragEndより先にdropが処理されるようにする）
  const isDropProcessingRef = useRef<boolean>(false)

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

  // ステータスポップアップ用
  const [statusPopup, setStatusPopup] = useState<{ taskId: number; x: number; y: number } | null>(null)

  // インデントポップアップ用
  const [indentPopup, setIndentPopup] = useState<{ taskId: number; x: number; y: number; currentLevel: number } | null>(null)

  // タスクの折りたたみ状態（親タスクIDをキーとして、折りたたんでいるかどうか）
  const [collapsedTasks, setCollapsedTasks] = useState<Record<number, boolean>>({})

  // テーブルエリアの幅調整用
  const [tableWidth, setTableWidth] = useState(450)
  const [isResizing, setIsResizing] = useState(false)
  const resizeStartXRef = useRef(0)
  const resizeStartWidthRef = useRef(450)

  // スクロール連動用
  const taskListRef = useRef<HTMLDivElement>(null)
  const mainScrollRef = useRef<HTMLDivElement>(null)

  // 指定した日付へスクロール
  const scrollToDate = (targetDate: string, smooth: boolean = true) => {
    if (!ganttRef.current) return
    const dayOffset = getDaysFromStart(targetDate, viewStartDate)
    const scrollPosition = dayOffset * 32 // DAY_WIDTH = 32px
    ganttRef.current.scrollTo({
      left: scrollPosition,
      behavior: smooth ? 'smooth' : 'auto'
    })
  }

  // 日付クリックでガントチャートをスクロール
  const scrollToTaskDate = (startDate: string, e: React.MouseEvent) => {
    e.stopPropagation()
    scrollToDate(startDate)
  }

  // テーブルとガントチャートの縦スクロール同期
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
    requestAnimationFrame(() => {
      isSyncingScrollRef.current = false
    })
  }

  // テーブルエリアのリサイズハンドラー
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
      const newWidth = Math.max(300, Math.min(800, resizeStartWidthRef.current + delta))
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

  // データ取得
  useEffect(() => {
    fetchTasks()
    fetchPhases()
    fetchCategories()
  }, [])

  // 初期マウント時に今日の位置へスクロール
  useEffect(() => {
    if (!loading && ganttRef.current) {
      // 少し遅延させてDOMが確実にレンダリングされてからスクロール
      const timer = setTimeout(() => {
        const today = new Date().toISOString().split('T')[0]
        const dayOffset = getDaysFromStart(today, viewStartDate)
        if (ganttRef.current) {
          ganttRef.current.scrollTo({
            left: dayOffset * 32,
            behavior: 'auto' // 初期表示は即座に
          })
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [loading, viewStartDate])

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

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching categories:', error)
      // categoriesテーブルがない場合は空配列
    } else if (data) {
      setCategories(data)
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

  // ステータスポップアップを開く
  const openStatusPopup = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation()
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    setStatusPopup({
      taskId: task.id,
      x: rect.left,
      y: rect.bottom + 4
    })
  }

  // ステータスを選択
  const selectStatus = async (taskId: number, status: string) => {
    await updateTask(taskId, 'status', status)
    setStatusPopup(null)
  }

  // インデントポップアップを開く
  const openIndentPopup = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    setIndentPopup({
      taskId: task.id,
      x: rect.left,
      y: rect.bottom + 4,
      currentLevel: task.indent_level || 0
    })
  }

  // インデントを選択
  const selectIndent = async (taskId: number, level: number) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    const currentLevel = task.indent_level || 0
    if (level !== currentLevel) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, indent_level: level } : t))
      await updateTask(taskId, 'indent_level', level)
    }
    setIndentPopup(null)
  }

  // インデント増減（ホバーボタン用）
  const changeIndent = async (e: React.MouseEvent, taskId: number, delta: number) => {
    e.stopPropagation()
    e.preventDefault()
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    const currentLevel = task.indent_level || 0
    const newLevel = Math.max(0, Math.min(3, currentLevel + delta))
    if (newLevel !== currentLevel) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, indent_level: newLevel } : t))
      const { error } = await supabase
        .from('tasks')
        .update({ indent_level: newLevel })
        .eq('id', taskId)
      if (error) {
        console.error('Error changing indent:', error)
        // エラー時は元に戻す
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, indent_level: currentLevel } : t))
      }
    }
  }

  // タスクの折りたたみ/展開をトグル
  const toggleTaskCollapse = (taskId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setCollapsedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }))
  }

  // タスクが子タスクを持っているかチェック（同じカテゴリ内で次のタスクがより深いインデントを持つ場合）
  const hasChildren = (task: Task, allTasksInCategory: Task[], taskIndex: number): boolean => {
    if (taskIndex >= allTasksInCategory.length - 1) return false
    const nextTask = allTasksInCategory[taskIndex + 1]
    return (nextTask.indent_level || 0) > (task.indent_level || 0)
  }

  // タスクが非表示かどうかをチェック（親が折りたたまれている場合）
  const isTaskHidden = (task: Task, allTasksInCategory: Task[], taskIndex: number): boolean => {
    const taskLevel = task.indent_level || 0
    if (taskLevel === 0) return false

    // このタスクより前のタスクで、より浅いインデントのものを探す
    for (let i = taskIndex - 1; i >= 0; i--) {
      const prevTask = allTasksInCategory[i]
      const prevLevel = prevTask.indent_level || 0
      if (prevLevel < taskLevel) {
        // 親が見つかった
        if (collapsedTasks[prevTask.id]) return true
        // さらに上の親もチェック
        if (prevLevel > 0) continue
        break
      }
    }
    return false
  }

  // 初期状態にリセット
  const resetTaskDragState = () => ({
    draggingTaskId: null,
    startX: 0,
    previewIndent: 0,
    originalIndent: 0,
    dropTarget: null
  })

  // タスクリストのドラッグアンドドロップハンドラー
  const handleTaskDragStart = (e: React.DragEvent, task: Task) => {
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
  }

  const handleTaskDragOver = (e: React.DragEvent, targetTask: Task, position: 'before' | 'after' | 'child') => {
    e.preventDefault()
    e.stopPropagation()

    // 自分自身へのドロップは無視
    if (taskDragState.draggingTaskId === targetTask.id) return

    // スロットリング: 同じターゲット・同じ位置なら更新しない
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
  }

  const handleTaskDragLeave = () => {
    // 何もしない（次のonDragOverで上書きされる）
  }

  const handleTaskDrop = async (e: React.DragEvent, targetTask: Task, position: 'before' | 'after' | 'child') => {
    e.preventDefault()
    e.stopPropagation()

    // ドロップ処理中フラグを設定
    isDropProcessingRef.current = true

    const draggedTaskId = taskDragState.draggingTaskId
    if (!draggedTaskId || draggedTaskId === targetTask.id) {
      isDropProcessingRef.current = false
      setTaskDragState(resetTaskDragState())
      return
    }

    const draggedTask = tasks.find(t => t.id === draggedTaskId)
    if (!draggedTask) {
      isDropProcessingRef.current = false
      setTaskDragState(resetTaskDragState())
      return
    }

    // 移動先カテゴリ内のタスクを取得してソート（ドラッグ中のタスクを除外）
    const sameCategoryTasks = tasks
      .filter(t => t.phase === targetTask.phase && t.category === targetTask.category && t.id !== draggedTaskId)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

    // ターゲットのインデックスを取得
    const targetIndex = sameCategoryTasks.findIndex(t => t.id === targetTask.id)
    const targetOrder = targetTask.sort_order ?? 0

    // 新しいsort_orderを計算（シンプルなロジック）
    let newSortOrder: number

    // before: ターゲットの前に配置
    // after/child: ターゲットの後に配置
    const insertBefore = position === 'before'

    if (insertBefore) {
      // ターゲットの前に挿入
      const prevTask = targetIndex > 0 ? sameCategoryTasks[targetIndex - 1] : null
      const prevOrder = prevTask?.sort_order ?? (targetOrder - 1000)
      newSortOrder = (prevOrder + targetOrder) / 2
    } else {
      // ターゲットの後に挿入
      const nextTask = targetIndex < sameCategoryTasks.length - 1 ? sameCategoryTasks[targetIndex + 1] : null
      const nextOrder = nextTask?.sort_order ?? (targetOrder + 1000)
      newSortOrder = (targetOrder + nextOrder) / 2
    }

    // 更新するフィールドを決定（phase, category, sort_order のみ）
    // インデントは変更しない（ホバーポップアップで変更可能）
    const updates: Partial<Task> = {
      phase: targetTask.phase,
      category: targetTask.category,
      sort_order: newSortOrder
    }

    // 楽観的更新
    const originalTask = { ...draggedTask }
    setTasks(prev => prev.map(t =>
      t.id === draggedTaskId ? { ...t, ...updates } : t
    ))

    // DB更新
    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', draggedTaskId)

    if (error) {
      // エラー時は元に戻す
      setTasks(prev => prev.map(t =>
        t.id === draggedTaskId ? originalTask : t
      ))
    }

    setTaskDragState(resetTaskDragState())
    lastDropTargetRef.current = null
    isDropProcessingRef.current = false
  }

  const handleTaskDragEnd = () => {
    // ドロップ処理中は何もしない（handleTaskDropで処理される）
    if (isDropProcessingRef.current) return
    setTaskDragState(resetTaskDragState())
    lastDropTargetRef.current = null
  }

  // タスク追加
  const addTask = async () => {
    if (!editingTask.name || !editingTask.start_date || !editingTask.end_date) return

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

    setSaving(true)
    const { data, error } = await supabase
      .from('tasks')
      .insert([{
        ...editingTask,
        category_id: selectedCategory?.id || null,
        indent_level: editingTask.indent_level || 0,
        sort_order: maxSortOrder + 1
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

    // category_idを取得
    const selectedPhase = phases.find(p => p.name === editingTask.phase)
    const selectedCategory = selectedPhase
      ? categories.find(c => c.phase_id === selectedPhase.id && c.name === editingTask.category)
      : null

    setSaving(true)
    const { error } = await supabase
      .from('tasks')
      .update({
        ...editingTask,
        category_id: selectedCategory?.id || null,
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

  // カテゴリ管理
  const [newCategoryName, setNewCategoryName] = useState('')
  const [selectedPhaseForCategory, setSelectedPhaseForCategory] = useState<number | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  const addCategory = async () => {
    if (!newCategoryName.trim() || !selectedPhaseForCategory) return

    const phaseCategories = categories.filter(c => c.phase_id === selectedPhaseForCategory)
    const maxOrder = phaseCategories.length > 0
      ? Math.max(...phaseCategories.map(c => c.sort_order))
      : 0

    const { data, error } = await supabase
      .from('categories')
      .insert([{
        name: newCategoryName.trim(),
        phase_id: selectedPhaseForCategory,
        sort_order: maxOrder + 1
      }])
      .select()

    if (error) {
      console.error('Error adding category:', error)
      alert('カテゴリの追加に失敗しました')
    } else if (data) {
      setCategories([...categories, data[0]])
      setNewCategoryName('')
    }
  }

  const updateCategory = async (id: number, name: string) => {
    const oldCategory = categories.find(c => c.id === id)
    if (!oldCategory) return

    const { error } = await supabase
      .from('categories')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('Error updating category:', error)
    } else {
      setCategories(categories.map(c => c.id === id ? { ...c, name } : c))
      // タスクのcategoryも更新
      if (oldCategory.name !== name) {
        const phase = phases.find(p => p.id === oldCategory.phase_id)
        if (phase) {
          await supabase
            .from('tasks')
            .update({ category: name })
            .eq('phase', phase.name)
            .eq('category', oldCategory.name)
          fetchTasks()
        }
      }
    }
    setEditingCategory(null)
  }

  const deleteCategory = async (id: number) => {
    const category = categories.find(c => c.id === id)
    if (!category) return

    const phase = phases.find(p => p.id === category.phase_id)
    if (!phase) return

    const tasksInCategory = tasks.filter(t => t.phase === phase.name && t.category === category.name)
    if (tasksInCategory.length > 0) {
      if (!confirm(`このカテゴリには${tasksInCategory.length}件のタスクがあります。カテゴリを削除するとタスクのカテゴリが空になります。続行しますか？`)) {
        return
      }
      // タスクのカテゴリを空に
      await supabase
        .from('tasks')
        .update({ category: '', category_id: null })
        .eq('phase', phase.name)
        .eq('category', category.name)
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting category:', error)
    } else {
      setCategories(categories.filter(c => c.id !== id))
      fetchTasks()
    }
  }

  const moveCategoryOrder = async (categoryId: number, direction: 'up' | 'down') => {
    const category = categories.find(c => c.id === categoryId)
    if (!category) return

    const phaseCategories = categories
      .filter(c => c.phase_id === category.phase_id)
      .sort((a, b) => a.sort_order - b.sort_order)

    const currentIndex = phaseCategories.findIndex(c => c.id === categoryId)
    if (currentIndex === -1) return

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (swapIndex < 0 || swapIndex >= phaseCategories.length) return

    const swapCategory = phaseCategories[swapIndex]

    // sort_orderを入れ替え
    const tempOrder = category.sort_order
    const newOrder = swapCategory.sort_order

    // 楽観的更新
    setCategories(categories.map(c => {
      if (c.id === categoryId) return { ...c, sort_order: newOrder }
      if (c.id === swapCategory.id) return { ...c, sort_order: tempOrder }
      return c
    }))

    // DB更新
    await Promise.all([
      supabase.from('categories').update({ sort_order: newOrder }).eq('id', categoryId),
      supabase.from('categories').update({ sort_order: tempOrder }).eq('id', swapCategory.id)
    ])
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
      case 'エンジニア': return 'bg-accent-blue text-accent-blue-text-text border-accent-blue'
      case 'デザイナー': return 'bg-accent-pink text-accent-pink-text border-accent-pink'
      case '共同': return 'bg-accent-purple text-accent-purple-text border-accent-purple'
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
    // 365日分をレンダリング（1年分）
    for (let i = 0; i < 365; i++) {
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
    hasDraggedRef.current = false // ドラッグ開始時にリセット
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
  }, [filteredTasks, phases, categories])

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
              {saving && <span className="ml-2 text-accent-blue-text">保存中...</span>}
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
              onClick={() => setShowCategoryModal(true)}
              className="bg-dashboard-card hover:bg-gray-50 text-dashboard-text-main border border-dashboard-border px-4 py-2 rounded-md font-medium"
            >
              カテゴリ管理
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
            <span className="text-sm text-dashboard-text-muted">期間:</span>
            <span className="text-sm font-medium text-dashboard-text-main">
              {new Date().getFullYear()}年
            </span>
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
          <button
            onClick={(e) => {
              e.stopPropagation()
              scrollToDate(new Date().toISOString().split('T')[0])
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-dashboard-border hover:bg-gray-50 transition-colors text-accent-blue-text-text"
            title="今日の位置へスクロール"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            今日に移動
          </button>
          <div className="flex gap-2 ml-auto">
            <span className="flex items-center gap-1 text-xs"><span className="w-3 h-3 rounded bg-accent-blue"></span>エンジニア</span>
            <span className="flex items-center gap-1 text-xs"><span className="w-3 h-3 rounded bg-accent-pink"></span>デザイナー</span>
            <span className="flex items-center gap-1 text-xs"><span className="w-3 h-3 rounded bg-accent-purple"></span>共同</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        ref={mainScrollRef}
        className={`flex ${isResizing ? 'cursor-col-resize select-none' : ''}`}
        style={{ height: 'calc(100vh - 140px)' }}
        onClick={() => { setStatusPopup(null); setIndentPopup(null); }}
      >
        {/* Task List (Left) - 縦スクロールのみ */}
        <div ref={taskListRef} onScroll={handleTaskListScroll} className="flex-shrink-0 bg-dashboard-card relative overflow-y-auto overflow-x-hidden scrollbar-hide" style={{ width: `${tableWidth}px` }}>
          <div className="sticky top-0 bg-gray-50 border-b border-dashboard-border px-4 py-2 text-xs font-medium text-dashboard-text-muted grid grid-cols-12 gap-2 z-20">
            <div className="col-span-5">タスク</div>
            <div className="col-span-2 text-center">担当者</div>
            <div className="col-span-3 text-center">期限</div>
            <div className="col-span-2 text-center">ステータス</div>
          </div>

          {Object.entries(groupedByPhase).map(([phase, categories]) => (
            <div key={phase}>
              {/* Phase Header */}
              <div
                onClick={() => togglePhaseAccordion(phase)}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (!taskDragState.draggingTaskId) return
                  const targetKey = `phase-${phase}`
                  if (lastDropTargetRef.current === targetKey) return
                  lastDropTargetRef.current = targetKey
                  setTaskDragState(prev => ({
                    ...prev,
                    dropTarget: { taskId: null, position: 'after', phase, category: '' }
                  }))
                }}
                onDrop={async (e) => {
                  e.preventDefault()
                  const draggedTaskId = taskDragState.draggingTaskId
                  if (!draggedTaskId) return
                  const draggedTask = tasks.find(t => t.id === draggedTaskId)
                  if (!draggedTask) return

                  // カテゴリなしでフェーズに移動（先頭に配置）
                  const samePhaseTasks = tasks.filter(t => t.phase === phase && t.category === '')
                  const minSortOrder = samePhaseTasks.length > 0
                    ? Math.min(...samePhaseTasks.map(t => t.sort_order ?? 0))
                    : 0
                  const updates = { phase, category: '', indent_level: 0, sort_order: minSortOrder - 1 }
                  const originalTask = { ...draggedTask }
                  setTasks(prev => prev.map(t => t.id === draggedTaskId ? { ...t, ...updates } : t))

                  const { error } = await supabase
                    .from('tasks')
                    .update(updates)
                    .eq('id', draggedTaskId)

                  if (error) {
                    console.error('Error moving to phase:', error.message)
                    setTasks(prev => prev.map(t => t.id === draggedTaskId ? originalTask : t))
                  }
                  setTaskDragState(resetTaskDragState())
                  lastDropTargetRef.current = null
                }}
                className={`bg-gray-100 text-dashboard-text-main px-4 h-12 text-sm font-semibold cursor-pointer hover:bg-gray-200 flex items-center justify-between border-b border-dashboard-border transition-all
                  ${taskDragState.dropTarget?.phase === phase && taskDragState.dropTarget?.category === '' && taskDragState.dropTarget?.taskId === null ? 'ring-2 ring-accent-blue ring-inset bg-accent-blue/20' : ''}
                `}
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
                        onDragOver={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          if (!taskDragState.draggingTaskId) return
                          const targetKey = `category-${phase}-${category}`
                          if (lastDropTargetRef.current === targetKey) return
                          lastDropTargetRef.current = targetKey
                          setTaskDragState(prev => ({
                            ...prev,
                            dropTarget: { taskId: null, position: 'after', phase, category }
                          }))
                        }}
                        onDrop={async (e) => {
                          e.preventDefault()
                          const draggedTaskId = taskDragState.draggingTaskId
                          if (!draggedTaskId) return
                          const draggedTask = tasks.find(t => t.id === draggedTaskId)
                          if (!draggedTask) return

                          // カテゴリの先頭に配置
                          const sameCategoryTasks = tasks.filter(t => t.phase === phase && t.category === category)
                          const minSortOrder = sameCategoryTasks.length > 0
                            ? Math.min(...sameCategoryTasks.map(t => t.sort_order ?? 0))
                            : 0
                          const updates = { phase, category, indent_level: 0, sort_order: minSortOrder - 1 }
                          const originalTask = { ...draggedTask }
                          setTasks(prev => prev.map(t => t.id === draggedTaskId ? { ...t, ...updates } : t))

                          const { error } = await supabase
                            .from('tasks')
                            .update(updates)
                            .eq('id', draggedTaskId)

                          if (error) {
                            console.error('Error moving to category:', error.message)
                            setTasks(prev => prev.map(t => t.id === draggedTaskId ? originalTask : t))
                          }
                          setTaskDragState(resetTaskDragState())
                          lastDropTargetRef.current = null
                        }}
                        className={`bg-gray-50 text-dashboard-text-main px-4 h-10 pl-8 text-sm cursor-pointer hover:bg-gray-100 flex items-center justify-between border-b border-dashboard-border transition-all
                          ${taskDragState.dropTarget?.phase === phase && taskDragState.dropTarget?.category === category && taskDragState.dropTarget?.taskId === null ? 'ring-2 ring-accent-blue ring-inset bg-accent-blue/10' : ''}
                        `}
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
                          {categoryTasks.map((task, taskIndex) => {
                            const isDragging = taskDragState.draggingTaskId === task.id
                            const isDropTargetBefore = taskDragState.dropTarget?.taskId === task.id && taskDragState.dropTarget?.position === 'before'
                            const isDropTargetAfter = taskDragState.dropTarget?.taskId === task.id && taskDragState.dropTarget?.position === 'after'
                            const indentLevel = task.indent_level || 0
                            const taskHasChildren = hasChildren(task, categoryTasks, taskIndex)
                            const isHidden = isTaskHidden(task, categoryTasks, taskIndex)
                            const isCollapsed = collapsedTasks[task.id]

                            if (isHidden) return null

                            return (
                              <div key={task.id} className="relative">
                                {/* ドロップインジケーター（上） */}
                                {isDropTargetBefore && (
                                  <div
                                    className="absolute top-0 left-0 right-0 h-1 bg-accent-blue z-10"
                                    style={{ marginLeft: `${16 + indentLevel * 24}px` }}
                                  />
                                )}

                                {/* タスク行 */}
                                <div
                                  draggable
                                  onDragStart={(e) => handleTaskDragStart(e, task)}
                                  onDragEnd={handleTaskDragEnd}
                                  onDragOver={(e) => {
                                    e.preventDefault()
                                    const rect = e.currentTarget.getBoundingClientRect()
                                    const y = e.clientY - rect.top
                                    const height = rect.height
                                    // シンプルに上半分がbefore、下半分がafter
                                    const position = y < height * 0.5 ? 'before' : 'after'
                                    handleTaskDragOver(e, task, position)
                                  }}
                                  onDragLeave={handleTaskDragLeave}
                                  onDrop={(e) => {
                                    const position = taskDragState.dropTarget?.position || 'after'
                                    handleTaskDrop(e, task, position)
                                  }}
                                  onClick={() => openTaskModal('edit', task)}
                                  className={`group/task px-4 h-12 border-b border-gray-100 cursor-grab hover:bg-gray-50 grid grid-cols-12 gap-2 items-center transition-all
                                    ${selectedTask?.id === task.id ? 'bg-blue-50' : ''}
                                    ${isDragging ? 'opacity-50 bg-gray-100' : ''}
                                  `}
                                  style={{ paddingLeft: `${16 + indentLevel * 24}px` }}
                                >
                                  {/* 階層構造の接続線 */}
                                  {indentLevel > 0 && (
                                    <div className="absolute left-0 top-0 bottom-0 pointer-events-none" style={{ width: `${16 + indentLevel * 24}px` }}>
                                      {Array.from({ length: indentLevel }).map((_, i) => (
                                        <div
                                          key={i}
                                          className="absolute top-0 bottom-0 w-px bg-gray-200 group-hover/task:bg-gray-300"
                                          style={{ left: `${16 + i * 24 + 8}px` }}
                                        />
                                      ))}
                                      <div
                                        className="absolute h-px bg-gray-200 group-hover/task:bg-gray-300"
                                        style={{
                                          left: `${16 + (indentLevel - 1) * 24 + 8}px`,
                                          top: '50%',
                                          width: '16px'
                                        }}
                                      />
                                    </div>
                                  )}

                                  <div className="col-span-5 flex items-center gap-2">
                                    {/* トグルボタン（子タスクがある場合）またはドラッグハンドル */}
                                    <div className="flex items-center gap-1">
                                      {taskHasChildren ? (
                                        <button
                                          type="button"
                                          draggable={false}
                                          onMouseDown={(e) => e.stopPropagation()}
                                          onClick={(e) => toggleTaskCollapse(task.id, e)}
                                          className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 text-dashboard-text-muted"
                                          title={isCollapsed ? '子タスクを展開' : '子タスクを折りたたむ'}
                                        >
                                          <span className={`transform transition-transform text-xs ${isCollapsed ? '' : 'rotate-90'}`}>▶</span>
                                        </button>
                                      ) : (
                                        <span className="w-5 h-5 flex items-center justify-center cursor-grab text-dashboard-text-muted opacity-0 group-hover/task:opacity-100 transition-opacity" title="ドラッグして移動">
                                          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                                            <circle cx="3" cy="3" r="1.5"/>
                                            <circle cx="9" cy="3" r="1.5"/>
                                            <circle cx="3" cy="9" r="1.5"/>
                                            <circle cx="9" cy="9" r="1.5"/>
                                          </svg>
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-dashboard-text-main truncate" title={task.name}>{task.name}</p>
                                    </div>
                                  </div>

                                  {/* インデント変更ポップアップ（ホバーで表示、タスクの上に重なる） */}
                                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover/task:opacity-100 transition-all duration-150 pointer-events-none group-hover/task:pointer-events-auto z-20">
                                    <div className="bg-white shadow-md rounded-lg border border-gray-200 p-1 flex items-center gap-0.5">
                                      <button
                                        type="button"
                                        draggable={false}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => changeIndent(e, task.id, -1)}
                                        disabled={indentLevel === 0}
                                        className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${indentLevel === 0 ? 'cursor-not-allowed text-gray-300' : 'text-gray-600 hover:bg-blue-100 hover:text-blue-600 active:bg-blue-200'}`}
                                        title="階層を上げる"
                                      >
                                        <IndentDecrease size={18} strokeWidth={2} />
                                      </button>
                                      <button
                                        type="button"
                                        draggable={false}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => changeIndent(e, task.id, 1)}
                                        disabled={indentLevel >= 3}
                                        className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${indentLevel >= 3 ? 'cursor-not-allowed text-gray-300' : 'text-gray-600 hover:bg-blue-100 hover:text-blue-600 active:bg-blue-200'}`}
                                        title="階層を下げる"
                                      >
                                        <IndentIncrease size={18} strokeWidth={2} />
                                      </button>
                                    </div>
                                    {/* 下向き三角（吹き出しの矢印） */}
                                    <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-white border-r border-b border-gray-200 rotate-45"></div>
                                  </div>
                                  <div className="col-span-2 flex items-center justify-center">
                                    <span className={`text-xs px-2 py-1 rounded border ${getOwnerColor(task.owner)}`}>
                                      {task.owner}
                                    </span>
                                  </div>
                                  <div className="col-span-3 flex items-center justify-center">
                                    <button
                                      type="button"
                                      draggable={false}
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onClick={(e) => scrollToTaskDate(task.start_date, e)}
                                      className="text-xs hover:underline cursor-pointer"
                                      style={{ color: '#009EA4' }}
                                      title="クリックで開始日にスクロール"
                                    >
                                      {task.start_date.replace(/-/g, '/').slice(5)} - {task.end_date.replace(/-/g, '/').slice(5)}
                                    </button>
                                  </div>
                                  <div className="col-span-2 flex items-center justify-center">
                                    <button
                                      type="button"
                                      draggable={false}
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onClick={(e) => { e.stopPropagation(); openStatusPopup(task, e); }}
                                      className={`text-xs px-2 py-1 rounded cursor-pointer hover:opacity-80 transition-opacity ${getStatusColor(task.status)}`}
                                      title="クリックでステータス変更"
                                    >
                                      {task.status}
                                    </button>
                                  </div>
                                </div>

                                {/* ドロップインジケーター（下） */}
                                {isDropTargetAfter && (
                                  <div
                                    className="absolute bottom-0 left-0 right-0 h-1 bg-accent-blue z-10"
                                    style={{ marginLeft: `${16 + indentLevel * 24}px` }}
                                  />
                                )}
                              </div>
                            )
                          })}

                          {/* クイック追加ボタン */}
                          <div
                            onClick={() => openTaskModal('add', undefined, phase, category)}
                            className="px-4 h-10 pl-12 border-b border-gray-100 cursor-pointer hover:bg-blue-50 text-accent-blue-text text-sm flex items-center gap-1"
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
                      className="px-4 h-10 pl-8 border-b border-gray-100 cursor-pointer hover:bg-blue-50 text-accent-blue-text text-sm flex items-center gap-1"
                    >
                      <span>+</span> タスクを追加
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {/* リサイズハンドル（独立した兄弟要素として配置） */}
        <div
          className={`flex-shrink-0 w-1 cursor-col-resize z-30 group hover:bg-[#009EA4] transition-colors relative ${isResizing ? 'bg-[#009EA4]' : 'bg-dashboard-border'}`}
          onMouseDown={handleResizeStart}
        >
          {/* ホバー時のリサイズアイコン */}
          <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div className="bg-[#009EA4] rounded-full p-1.5 shadow-md">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="white">
                <path d="M2 6L4.5 3.5V8.5L2 6ZM10 6L7.5 3.5V8.5L10 6Z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Gantt Chart (Right) - 横スクロール可能 */}
        <div
          ref={ganttRef}
          className="flex-1 min-w-0 overflow-x-auto overflow-y-auto"
          onScroll={handleGanttScroll}
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
                const today = new Date()
                const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()
                return (
                  <div
                    key={i}
                    className={`w-8 flex-shrink-0 text-center border-r border-gray-100 ${isWeekend ? 'bg-gray-100' : 'bg-white'}`}
                  >
                    {(isMonday || isFirstOfMonth || i === 0) && (
                      <div
                        className={`text-xs font-medium py-1 border-b ${isWeekend ? 'bg-gray-100' : 'bg-gray-50'} ${isToday ? 'border-b-4' : 'border-dashboard-border'}`}
                        style={{
                          color: '#009EA4',
                          borderBottomColor: isToday ? '#009EA4' : undefined
                        }}
                      >
                        {date.getMonth() + 1}/{date.getDate()}
                      </div>
                    )}
                    {!(isMonday || isFirstOfMonth || i === 0) && (
                      <div
                        className={`text-xs py-1 ${isWeekend ? 'bg-gray-100' : 'bg-white'} ${isToday ? 'border-b-4 font-medium' : 'border-b border-dashboard-border'}`}
                        style={{
                          color: isToday ? '#009EA4' : undefined,
                          borderBottomColor: isToday ? '#009EA4' : undefined
                        }}
                      >
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
                          {categoryTasks.map((task, taskIndex) => {
                            const startOffset = getDaysFromStart(task.start_date, viewStartDate)
                            const duration = getDaysBetween(task.start_date, task.end_date)
                            const isHidden = isTaskHidden(task, categoryTasks, taskIndex)

                            if (isHidden) return null

                            return (
                              <div
                                key={task.id}
                                className={`h-12 flex items-center border-b border-gray-100 relative ${selectedTask?.id === task.id ? 'bg-blue-50' : ''}`}
                                onClick={() => {
                                  // ドラッグが発生した場合はタスク編集画面を開かない
                                  if (hasDraggedRef.current) {
                                    hasDraggedRef.current = false
                                    return
                                  }
                                  openTaskModal('edit', task)
                                }}
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

                                {startOffset >= 0 && startOffset < 365 && (
                                  <div
                                    className={`absolute h-6 rounded-md shadow-sm ${getBarColor(task.owner)} ${task.status === '完了' ? 'opacity-50' : ''} flex items-center group select-none`}
                                    style={{
                                      left: `${startOffset * 32}px`,
                                      width: `${Math.max(Math.min(duration, 365 - startOffset) * 32 - 4, 32)}px`
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

      {/* Status Popup */}
      {statusPopup && (
        <div
          className="fixed z-50 bg-dashboard-card rounded-lg shadow-lg border border-dashboard-border py-1 min-w-[120px]"
          style={{ left: statusPopup.x, top: statusPopup.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {statuses.map(status => {
            const task = tasks.find(t => t.id === statusPopup.taskId)
            const isSelected = task?.status === status
            return (
              <button
                key={status}
                onClick={() => selectStatus(statusPopup.taskId, status)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
                  isSelected ? 'bg-gray-50' : ''
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${
                  status === '未着手' ? 'bg-gray-400' :
                  status === '進行中' ? 'bg-blue-500' :
                  status === '完了' ? 'bg-green-500' :
                  'bg-yellow-500'
                }`}></span>
                {status}
                {isSelected && <span className="ml-auto text-accent-blue-text">✓</span>}
              </button>
            )
          })}
        </div>
      )}

      {/* Indent Popup */}
      {indentPopup && (
        <div
          className="fixed z-50 bg-dashboard-card rounded-lg shadow-lg border border-dashboard-border py-2 px-3 min-w-[160px]"
          style={{ left: indentPopup.x, top: indentPopup.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-xs text-dashboard-text-muted mb-2">階層レベルを選択</div>
          {[0, 1, 2, 3].map(level => {
            const isSelected = indentPopup.currentLevel === level
            return (
              <button
                key={level}
                onClick={() => selectIndent(indentPopup.taskId, level)}
                className={`w-full px-2 py-1.5 text-left text-sm hover:bg-gray-50 rounded flex items-center gap-2 ${
                  isSelected ? 'bg-accent-blue/20' : ''
                }`}
              >
                <span className="flex items-center" style={{ paddingLeft: `${level * 12}px` }}>
                  {level === 0 ? '親タスク' : `${'└'.repeat(1)} レベル ${level}`}
                </span>
                {isSelected && <span className="ml-auto text-accent-blue-text-text">✓</span>}
              </button>
            )
          })}
        </div>
      )}

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
                  {(() => {
                    const selectedPhase = phases.find(p => p.name === editingTask.phase)
                    const phaseCategories = selectedPhase
                      ? categories.filter(c => c.phase_id === selectedPhase.id).sort((a, b) => a.sort_order - b.sort_order)
                      : []

                    return (
                      <div className="flex gap-2">
                        <select
                          value={editingTask.category}
                          onChange={(e) => setEditingTask({ ...editingTask, category: e.target.value })}
                          className="flex-1 border border-dashboard-border rounded-md px-3 py-2"
                        >
                          <option value="">カテゴリを選択</option>
                          {phaseCategories.map(cat => (
                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            setShowTaskModal(false)
                            setShowCategoryModal(true)
                            if (selectedPhase) {
                              setSelectedPhaseForCategory(selectedPhase.id)
                            }
                          }}
                          className="px-3 py-2 text-sm text-accent-blue-text hover:bg-gray-100 rounded-md border border-dashboard-border whitespace-nowrap"
                          title="カテゴリを追加・編集"
                        >
                          管理
                        </button>
                      </div>
                    )
                  })()}
                  {editingTask.category && !categories.find(c => {
                    const selectedPhase = phases.find(p => p.name === editingTask.phase)
                    return selectedPhase && c.phase_id === selectedPhase.id && c.name === editingTask.category
                  }) && (
                    <p className="text-xs text-yellow-600 mt-1">
                      ※ このカテゴリはまだDBに登録されていません。「管理」からカテゴリを追加してください。
                    </p>
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
                            className="text-sm text-accent-blue-text hover:underline"
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

      {/* Category Management Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4" onClick={() => setShowCategoryModal(false)}>
          <div className="bg-dashboard-card rounded-[16px] w-full max-w-lg max-h-[80vh] overflow-hidden shadow-lg" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-dashboard-text-main">カテゴリ管理</h2>
                <button onClick={() => setShowCategoryModal(false)} className="text-dashboard-text-muted hover:text-dashboard-text-main text-2xl">×</button>
              </div>

              {/* 新規追加 */}
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-dashboard-text-muted mb-2">新規カテゴリを追加</p>
                <div className="flex gap-2 mb-2">
                  <select
                    value={selectedPhaseForCategory ?? ''}
                    onChange={(e) => setSelectedPhaseForCategory(e.target.value ? Number(e.target.value) : null)}
                    className="border border-dashboard-border rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">フェーズを選択</option>
                    {phases.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-1 border border-dashboard-border rounded-md px-3 py-2 text-sm"
                    placeholder="カテゴリ名"
                  />
                  <button
                    onClick={addCategory}
                    disabled={!newCategoryName.trim() || !selectedPhaseForCategory}
                    className="bg-dashboard-primary text-white px-4 py-2 rounded-md hover:bg-gray-800 disabled:opacity-50 text-sm whitespace-nowrap"
                  >
                    追加
                  </button>
                </div>
              </div>

              {/* フェーズごとのカテゴリ一覧 */}
              <div className="overflow-y-auto max-h-[50vh] space-y-4">
                {phases.map(phase => {
                  const phaseCategories = categories
                    .filter(c => c.phase_id === phase.id)
                    .sort((a, b) => a.sort_order - b.sort_order)

                  return (
                    <div key={phase.id} className="border border-dashboard-border rounded-lg overflow-hidden">
                      <div className="bg-gray-100 px-4 py-2 font-medium text-dashboard-text-main text-sm">
                        {phase.name}
                        <span className="text-dashboard-text-muted font-normal ml-2">
                          ({phaseCategories.length} カテゴリ)
                        </span>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {phaseCategories.length === 0 && (
                          <p className="text-dashboard-text-muted text-sm text-center py-4">
                            カテゴリがありません
                          </p>
                        )}
                        {phaseCategories.map((cat, index) => (
                          <div key={cat.id} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50">
                            {editingCategory?.id === cat.id ? (
                              <>
                                <input
                                  type="text"
                                  value={editingCategory.name}
                                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                                  className="flex-1 border border-dashboard-border rounded px-2 py-1 text-sm"
                                  autoFocus
                                />
                                <button
                                  onClick={() => updateCategory(cat.id, editingCategory.name)}
                                  className="text-accent-blue-text text-sm hover:underline"
                                >
                                  保存
                                </button>
                                <button
                                  onClick={() => setEditingCategory(null)}
                                  className="text-dashboard-text-muted text-sm hover:underline"
                                >
                                  取消
                                </button>
                              </>
                            ) : (
                              <>
                                {/* 並び替えボタン */}
                                <div className="flex flex-col gap-0.5">
                                  <button
                                    onClick={() => moveCategoryOrder(cat.id, 'up')}
                                    disabled={index === 0}
                                    className="w-5 h-5 flex items-center justify-center text-dashboard-text-muted hover:text-dashboard-text-main disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="上へ移動"
                                  >
                                    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                                      <path d="M5 2L9 7H1L5 2Z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => moveCategoryOrder(cat.id, 'down')}
                                    disabled={index === phaseCategories.length - 1}
                                    className="w-5 h-5 flex items-center justify-center text-dashboard-text-muted hover:text-dashboard-text-main disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="下へ移動"
                                  >
                                    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                                      <path d="M5 8L1 3H9L5 8Z" />
                                    </svg>
                                  </button>
                                </div>
                                <span className="flex-1 text-dashboard-text-main text-sm">{cat.name}</span>
                                <button
                                  onClick={() => setEditingCategory(cat)}
                                  className="text-accent-blue-text text-xs hover:underline"
                                >
                                  編集
                                </button>
                                <button
                                  onClick={() => deleteCategory(cat.id)}
                                  className="text-red-500 text-xs hover:underline"
                                >
                                  削除
                                </button>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-6 pt-4 border-t border-dashboard-border">
                <button
                  onClick={() => setShowCategoryModal(false)}
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
