export interface Task {
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
  created_at: string
  updated_at: string
}

export interface Category {
  id: number
  name: string
  phase_id: number
  sort_order: number
  created_at?: string
  updated_at?: string
}

export interface Phase {
  id: number
  name: string
  sort_order: number
}