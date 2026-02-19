'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

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
}

export default function KaetaWBS() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [viewStartDate, setViewStartDate] = useState('2026-02-24')
  const [filterPhase, setFilterPhase] = useState('all')
  const [filterOwner, setFilterOwner] = useState('all')
  const [saving, setSaving] = useState(false)

  const statuses = ['未着手', '進行中', '完了', '保留']
  const owners = ['エンジニア', 'デザイナー', '共同']
  const priorities = ['必須', '推奨', '任意']
  const phases = ['Phase 1', 'Phase 1.5', 'Phase 2']

  // データ取得
  useEffect(() => {
    fetchTasks()
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

  // タスク更新
  const updateTask = async (id: number, field: string, value: string) => {
    setSaving(true)
    
    // ローカル更新
    setTasks(tasks.map(t => t.id === id ? { ...t, [field]: value } : t))
    if (selectedTask && selectedTask.id === id) {
      setSelectedTask({ ...selectedTask, [field]: value })
    }

    // DB更新
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
  const [newTask, setNewTask] = useState({
    phase: 'Phase 1',
    category: '',
    name: '',
    owner: 'エンジニア',
    status: '未着手',
    start_date: '',
    end_date: '',
    effort: '',
    priority: '必須',
    note: ''
  })

  const addTask = async () => {
    if (!newTask.name || !newTask.start_date || !newTask.end_date) return
    
    setSaving(true)
    const { data, error } = await supabase
      .from('tasks')
      .insert([newTask])
      .select()
    
    if (error) {
      console.error('Error adding task:', error)
    } else if (data) {
      setTasks([...tasks, data[0]])
      setShowAddModal(false)
      setNewTask({
        phase: 'Phase 1',
        category: '',
        name: '',
        owner: 'エンジニア',
        status: '未着手',
        start_date: '',
        end_date: '',
        effort: '',
        priority: '必須',
        note: ''
      })
    }
    setSaving(false)
  }

  // タスク削除
  const deleteTask = async (id: number) => {
    if (!confirm('このタスクを削除しますか？')) return
    
    setSaving(true)
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Error deleting task:', error)
    } else {
      setTasks(tasks.filter(t => t.id !== id))
      setSelectedTask(null)
    }
    setSaving(false)
  }

  // ヘルパー関数
  const getStatusColor = (status: string) => {
    switch (status) {
      case '未着手': return 'bg-gray-200 text-gray-700'
      case '進行中': return 'bg-blue-500 text-white'
      case '完了': return 'bg-green-500 text-white'
      case '保留': return 'bg-yellow-500 text-white'
      default: return 'bg-gray-200 text-gray-700'
    }
  }

  const getOwnerColor = (owner: string) => {
    switch (owner) {
      case 'エンジニア': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'デザイナー': return 'bg-pink-100 text-pink-700 border-pink-200'
      case '共同': return 'bg-purple-100 text-purple-700 border-purple-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getBarColor = (owner: string) => {
    switch (owner) {
      case 'エンジニア': return 'bg-blue-400'
      case 'デザイナー': return 'bg-pink-400'
      case '共同': return 'bg-purple-400'
      default: return 'bg-gray-400'
    }
  }

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'Phase 1': return 'bg-blue-500'
      case 'Phase 1.5': return 'bg-green-500'
      case 'Phase 2': return 'bg-purple-500'
      default: return 'bg-gray-500'
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

  const dateRange = generateDateRange(viewStartDate)

  // フィルタリング
  const filteredTasks = tasks.filter(task => {
    if (filterPhase !== 'all' && task.phase !== filterPhase) return false
    if (filterOwner !== 'all' && task.owner !== filterOwner) return false
    return true
  })

  // グループ化
  const groupedTasks = filteredTasks.reduce((acc, task) => {
    const key = `${task.phase}-${task.category}`
    if (!acc[key]) {
      acc[key] = { phase: task.phase, category: task.category, tasks: [] as Task[] }
    }
    acc[key].tasks.push(task)
    return acc
  }, {} as Record<string, { phase: string; category: string; tasks: Task[] }>)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-30">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Kaeta! WBS / ガントチャート</h1>
            <p className="text-sm text-gray-500">
              エンジニアと共有用プロジェクト管理
              {saving && <span className="ml-2 text-blue-500">保存中...</span>}
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
          >
            <span className="text-xl">+</span> タスク追加
          </button>
        </div>
        
        {/* Filters */}
        <div className="flex gap-4 items-center flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">表示開始日:</span>
            <input
              type="date"
              value={viewStartDate}
              onChange={(e) => setViewStartDate(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">フェーズ:</span>
            <select
              value={filterPhase}
              onChange={(e) => setFilterPhase(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value="all">すべて</option>
              {phases.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">担当:</span>
            <select
              value={filterOwner}
              onChange={(e) => setFilterOwner(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value="all">すべて</option>
              {owners.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="flex gap-2 ml-auto">
            <span className="flex items-center gap-1 text-xs"><span className="w-3 h-3 rounded bg-blue-400"></span>エンジニア</span>
            <span className="flex items-center gap-1 text-xs"><span className="w-3 h-3 rounded bg-pink-400"></span>デザイナー</span>
            <span className="flex items-center gap-1 text-xs"><span className="w-3 h-3 rounded bg-purple-400"></span>共同</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex overflow-hidden" style={{ height: 'calc(100vh - 140px)' }}>
        {/* Task List (Left) */}
        <div className="w-96 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="sticky top-0 bg-gray-50 border-b border-gray-200 px-4 py-2 text-xs font-medium text-gray-500 grid grid-cols-12 gap-2">
            <div className="col-span-6">タスク名</div>
            <div className="col-span-3">担当</div>
            <div className="col-span-3">状態</div>
          </div>
          
          {Object.values(groupedTasks).map((group, groupIndex) => (
            <div key={groupIndex}>
              <div className={`${getPhaseColor(group.phase)} text-white px-4 py-2 text-sm font-medium sticky top-8 z-10`}>
                {group.phase} / {group.category}
              </div>
              
              {group.tasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className={`px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 grid grid-cols-12 gap-2 items-center ${selectedTask?.id === task.id ? 'bg-blue-50' : ''}`}
                >
                  <div className="col-span-6">
                    <p className="text-sm font-medium text-gray-800 truncate">{task.name}</p>
                    <p className="text-xs text-gray-400">{task.start_date} 〜 {task.end_date}</p>
                  </div>
                  <div className="col-span-3">
                    <span className={`text-xs px-2 py-1 rounded border ${getOwnerColor(task.owner)}`}>
                      {task.owner}
                    </span>
                  </div>
                  <div className="col-span-3">
                    <span className={`text-xs px-2 py-1 rounded ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Gantt Chart (Right) */}
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <div className="sticky top-0 bg-white z-20 border-b border-gray-200">
            <div className="flex">
              {dateRange.map((date, i) => {
                const isWeekend = date.getDay() === 0 || date.getDay() === 6
                const isMonday = date.getDay() === 1
                const isFirstOfMonth = date.getDate() === 1
                return (
                  <div
                    key={i}
                    className={`w-8 flex-shrink-0 text-center border-r border-gray-100 ${isWeekend ? 'bg-gray-50' : ''}`}
                  >
                    {(isMonday || isFirstOfMonth || i === 0) && (
                      <div className="text-xs text-gray-500 py-1 border-b border-gray-200 bg-gray-50">
                        {date.getMonth() + 1}/{date.getDate()}
                      </div>
                    )}
                    {!(isMonday || isFirstOfMonth || i === 0) && (
                      <div className="text-xs text-gray-300 py-1 border-b border-gray-200">
                        {date.getDate()}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {Object.values(groupedTasks).map((group, groupIndex) => (
            <div key={groupIndex}>
              <div className={`h-8 ${getPhaseColor(group.phase)} opacity-20`}></div>
              
              {group.tasks.map(task => {
                const startOffset = getDaysFromStart(task.start_date, viewStartDate)
                const duration = getDaysBetween(task.start_date, task.end_date)
                
                return (
                  <div
                    key={task.id}
                    className={`h-12 flex items-center border-b border-gray-100 relative ${selectedTask?.id === task.id ? 'bg-blue-50' : ''}`}
                    onClick={() => setSelectedTask(task)}
                  >
                    <div className="absolute inset-0 flex">
                      {dateRange.map((date, i) => {
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
                        className={`absolute h-6 rounded ${getBarColor(task.owner)} ${task.status === '完了' ? 'opacity-50' : ''} cursor-pointer hover:opacity-80 flex items-center px-2`}
                        style={{
                          left: `${startOffset * 32}px`,
                          width: `${Math.min(duration, 56 - startOffset) * 32 - 4}px`
                        }}
                      >
                        <span className="text-xs text-white truncate font-medium">
                          {task.name}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4" onClick={() => setSelectedTask(null)}>
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className={`text-xs px-2 py-1 rounded text-white ${getPhaseColor(selectedTask.phase)}`}>
                    {selectedTask.phase}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">{selectedTask.category}</span>
                </div>
                <button onClick={() => setSelectedTask(null)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
              </div>
              
              <h2 className="text-xl font-bold text-gray-800 mb-6">{selectedTask.name}</h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">担当者</label>
                    <select
                      value={selectedTask.owner}
                      onChange={(e) => updateTask(selectedTask.id, 'owner', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      {owners.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">ステータス</label>
                    <select
                      value={selectedTask.status}
                      onChange={(e) => updateTask(selectedTask.id, 'status', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">開始日</label>
                    <input
                      type="date"
                      value={selectedTask.start_date}
                      onChange={(e) => updateTask(selectedTask.id, 'start_date', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">終了日</label>
                    <input
                      type="date"
                      value={selectedTask.end_date}
                      onChange={(e) => updateTask(selectedTask.id, 'end_date', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">工数</label>
                    <input
                      type="text"
                      value={selectedTask.effort || ''}
                      onChange={(e) => updateTask(selectedTask.id, 'effort', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="例: 2-3時間"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">優先度</label>
                    <select
                      value={selectedTask.priority}
                      onChange={(e) => updateTask(selectedTask.id, 'priority', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">メモ</label>
                  <textarea
                    value={selectedTask.note || ''}
                    onChange={(e) => updateTask(selectedTask.id, 'note', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24"
                    placeholder="補足情報を入力..."
                  />
                </div>
              </div>
              
              <div className="flex justify-between mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => deleteTask(selectedTask.id)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  タスクを削除
                </button>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="bg-gray-800 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">タスクを追加</h2>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">タスク名 *</label>
                  <input
                    type="text"
                    value={newTask.name}
                    onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="タスク名を入力"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">フェーズ</label>
                    <select
                      value={newTask.phase}
                      onChange={(e) => setNewTask({ ...newTask, phase: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      {phases.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">カテゴリ</label>
                    <input
                      type="text"
                      value={newTask.category}
                      onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="例: コア機能開発"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">担当者</label>
                    <select
                      value={newTask.owner}
                      onChange={(e) => setNewTask({ ...newTask, owner: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      {owners.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">優先度</label>
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">開始日 *</label>
                    <input
                      type="date"
                      value={newTask.start_date}
                      onChange={(e) => setNewTask({ ...newTask, start_date: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">終了日 *</label>
                    <input
                      type="date"
                      value={newTask.end_date}
                      onChange={(e) => setNewTask({ ...newTask, end_date: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">工数</label>
                  <input
                    type="text"
                    value={newTask.effort}
                    onChange={(e) => setNewTask({ ...newTask, effort: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="例: 2-3時間、要見積もり"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">メモ</label>
                  <textarea
                    value={newTask.note}
                    onChange={(e) => setNewTask({ ...newTask, note: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 h-20"
                    placeholder="補足情報を入力..."
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  キャンセル
                </button>
                <button
                  onClick={addTask}
                  disabled={!newTask.name || !newTask.start_date || !newTask.end_date || saving}
                  className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? '追加中...' : '追加する'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
