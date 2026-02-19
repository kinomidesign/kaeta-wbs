export interface Task {
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
  created_at: string
  updated_at: string
}