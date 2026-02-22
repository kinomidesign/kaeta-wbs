/**
 * ステータスに応じた背景色・テキスト色のクラスを返す
 */
export const getStatusColor = (status: string): string => {
  switch (status) {
    case '未着手':
      return 'bg-gray-100 text-dashboard-text-muted'
    case '進行中':
      return 'bg-blue-100 text-blue-800'
    case '完了':
      return 'bg-dashboard-success-bg text-dashboard-success-text'
    case '保留':
      return 'bg-yellow-100 text-yellow-800'
    default:
      return 'bg-gray-100 text-dashboard-text-muted'
  }
}

/**
 * 担当者に応じた背景色・テキスト色・ボーダー色のクラスを返す
 */
export const getOwnerColor = (owner: string): string => {
  switch (owner) {
    case 'エンジニア':
      return 'bg-accent-blue text-accent-blue-text-text border-accent-blue'
    case 'デザイナー':
      return 'bg-accent-pink text-accent-pink-text border-accent-pink'
    case '共同':
      return 'bg-accent-purple text-accent-purple-text border-accent-purple'
    default:
      return 'bg-gray-100 text-dashboard-text-muted border-gray-200'
  }
}

/**
 * 担当者に応じたガントバーの背景色クラスを返す
 */
export const getBarColor = (owner: string): string => {
  switch (owner) {
    case 'エンジニア':
      return 'bg-accent-blue'
    case 'デザイナー':
      return 'bg-accent-pink'
    case '共同':
      return 'bg-accent-purple'
    default:
      return 'bg-gray-400'
  }
}

/**
 * 優先度に応じたスタイルクラスを返す（選択時）
 */
export const getPriorityColorSelected = (priority: string): string => {
  switch (priority) {
    case '必須':
      return 'bg-red-100 text-red-700 border-red-300 ring-2 ring-red-200 ring-offset-1'
    case '推奨':
      return 'bg-yellow-100 text-yellow-700 border-yellow-300 ring-2 ring-yellow-200 ring-offset-1'
    case '任意':
      return 'bg-gray-100 text-dashboard-text-main border-gray-300 ring-2 ring-gray-200 ring-offset-1'
    default:
      return 'bg-gray-50 text-dashboard-text-muted border-gray-200'
  }
}

/**
 * ステータスのドットカラーを返す
 */
export const getStatusDotColor = (status: string): string => {
  switch (status) {
    case '未着手':
      return 'bg-gray-400'
    case '進行中':
      return 'bg-blue-500'
    case '完了':
      return 'bg-green-500'
    case '保留':
      return 'bg-yellow-500'
    default:
      return 'bg-gray-400'
  }
}
