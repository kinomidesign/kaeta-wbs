-- ============================================
-- カテゴリ管理機能のマイグレーション
-- ============================================

-- 1. categoriesテーブルの作成
-- フェーズごとにカテゴリを管理（phase_idで紐付け）
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phase_id INTEGER REFERENCES phases(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- フェーズ内でカテゴリ名をユニークにする
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_phase_name
  ON categories(phase_id, name);

-- sort_orderでの検索を高速化
CREATE INDEX IF NOT EXISTS idx_categories_sort_order
  ON categories(phase_id, sort_order);

-- 2. tasksテーブルにcategory_idカラムを追加
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;

-- category_idでの検索を高速化
CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON tasks(category_id);

-- 3. 既存データのマイグレーション
-- 既存のcategoryカラム（文字列）からcategoriesテーブルにレコードを作成
-- 同時にtasks.category_idを設定

-- まず、phases名とcategory名の組み合わせでcategoriesレコードを作成
INSERT INTO categories (name, phase_id, sort_order)
SELECT DISTINCT
  t.category,
  p.id as phase_id,
  ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY MIN(t.start_date)) as sort_order
FROM tasks t
JOIN phases p ON t.phase = p.name
WHERE t.category IS NOT NULL AND t.category != ''
GROUP BY t.category, p.id
ON CONFLICT (phase_id, name) DO NOTHING;

-- tasksのcategory_idを更新
UPDATE tasks t
SET category_id = c.id
FROM categories c
JOIN phases p ON c.phase_id = p.id
WHERE t.phase = p.name AND t.category = c.name;

-- 4. RLS（Row Level Security）ポリシー（必要に応じて）
-- ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all" ON categories FOR ALL USING (true);

-- ============================================
-- 注意事項:
-- - このスクリプトはSupabase SQL Editorで実行してください
-- - 既存のcategoryカラム（文字列）は後方互換性のため残しています
-- - 移行完了後、category_idのみを使用するようアプリを更新してください
-- ============================================
