import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Category, Phase, Task } from '@/types'

interface UseCategoriesReturn {
  categories: Category[]
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>
  fetchCategories: () => Promise<void>
  addCategory: (name: string, phaseId: number) => Promise<Category | null>
  updateCategory: (
    id: number,
    name: string,
    phases: Phase[],
    fetchTasks: () => Promise<void>
  ) => Promise<boolean>
  deleteCategory: (
    id: number,
    phases: Phase[],
    tasks: Task[],
    fetchTasks: () => Promise<void>
  ) => Promise<boolean>
  moveCategoryOrder: (categoryId: number, direction: 'up' | 'down') => Promise<void>
  reorderCategories: (orderedIds: number[]) => Promise<void>
  // モーダル用の状態
  newCategoryName: string
  setNewCategoryName: React.Dispatch<React.SetStateAction<string>>
  selectedPhaseForCategory: number | null
  setSelectedPhaseForCategory: React.Dispatch<React.SetStateAction<number | null>>
  editingCategory: Category | null
  setEditingCategory: React.Dispatch<React.SetStateAction<Category | null>>
}

export const useCategories = (): UseCategoriesReturn => {
  const [categories, setCategories] = useState<Category[]>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [selectedPhaseForCategory, setSelectedPhaseForCategory] = useState<number | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  // データ取得
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

  useEffect(() => {
    fetchCategories()
  }, [])

  // カテゴリ追加
  const addCategory = async (name: string, phaseId: number): Promise<Category | null> => {
    if (!name.trim() || !phaseId) return null

    const phaseCategories = categories.filter(c => c.phase_id === phaseId)
    const maxOrder = phaseCategories.length > 0
      ? Math.max(...phaseCategories.map(c => c.sort_order))
      : 0

    const { data, error } = await supabase
      .from('categories')
      .insert([{
        name: name.trim(),
        phase_id: phaseId,
        sort_order: maxOrder + 1
      }])
      .select()

    if (error) {
      console.error('Error adding category:', error)
      return null
    }

    if (data) {
      setCategories(prev => [...prev, data[0]])
      setNewCategoryName('')
      return data[0]
    }

    return null
  }

  // カテゴリ更新
  const updateCategory = async (
    id: number,
    name: string,
    phases: Phase[],
    fetchTasks: () => Promise<void>
  ): Promise<boolean> => {
    const oldCategory = categories.find(c => c.id === id)
    if (!oldCategory) return false

    const { error } = await supabase
      .from('categories')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('Error updating category:', error)
      return false
    }

    setCategories(prev => prev.map(c => c.id === id ? { ...c, name } : c))

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

    setEditingCategory(null)
    return true
  }

  // カテゴリ削除
  const deleteCategory = async (
    id: number,
    phases: Phase[],
    tasks: Task[],
    fetchTasks: () => Promise<void>
  ): Promise<boolean> => {
    const category = categories.find(c => c.id === id)
    if (!category) return false

    const phase = phases.find(p => p.id === category.phase_id)
    if (!phase) return false

    const tasksInCategory = tasks.filter(t => t.phase === phase.name && t.category === category.name)
    if (tasksInCategory.length > 0) {
      if (!confirm(`このカテゴリには${tasksInCategory.length}件のタスクがあります。カテゴリを削除するとタスクのカテゴリが空になります。続行しますか？`)) {
        return false
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
      return false
    }

    setCategories(prev => prev.filter(c => c.id !== id))
    fetchTasks()
    return true
  }

  // カテゴリの並び順変更
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
    setCategories(prev => prev.map(c => {
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

  // カテゴリの並び順を一括更新（D&D用）
  const reorderCategories = async (orderedIds: number[]) => {
    // 楽観的更新
    setCategories(prev => prev.map(c => {
      const idx = orderedIds.indexOf(c.id)
      if (idx !== -1) return { ...c, sort_order: idx + 1 }
      return c
    }))

    // DB一括更新
    await Promise.all(
      orderedIds.map((id, idx) =>
        supabase.from('categories').update({ sort_order: idx + 1 }).eq('id', id)
      )
    )
  }

  return {
    categories,
    setCategories,
    fetchCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    moveCategoryOrder,
    reorderCategories,
    newCategoryName,
    setNewCategoryName,
    selectedPhaseForCategory,
    setSelectedPhaseForCategory,
    editingCategory,
    setEditingCategory
  }
}
