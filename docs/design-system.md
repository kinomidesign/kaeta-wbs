WBS/Gantt Chart Styling Specification (Based on Minimalist Design System)
この仕様は、提供されたWBSの画像に対し、定義済みのデザイントークンを適用するためのガイドです。

1. Tailwind Configuration Reference (再掲)
この設定が前提となります。

JavaScript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        dashboard: {
          bg: '#F9FAFB',         // 全体の背景（極薄グレー）
          card: '#FFFFFF',       // カード背景（白）
          border: '#E5E7EB',     // 境界線
          text: {
            main: '#111827',     // 主要テキスト（ほぼ黒）
            muted: '#6B7280',    // 補足テキスト（グレー）
          },
          success: {             // 「完了」ステータス用
            bg: '#DCFCE7',
            text: '#15803D',
          },
          primary: '#111827',    // メインボタンなど
        },
        // ガントバー用のアクセントカラー（役割別）
        accent: {
          blue: '#D5F0EF',       // エンジニア用
          pink: '#FFE5E4',       // デザイナー用
        }
      },
      borderRadius: {
        'card': '16px',          // 大きなコンテナ用
        'md': '8px',             // ボタン、入力欄用
        'full': '9999px',        // バッジ用
      }
    }
  }
}
2. Component Styling Guidelines
WBSの各要素へのスタイル適用ルールです。

A. Main Container (全体構造)
ガントチャート全体を一つの大きなカードとして扱います。

Page Background: bg-dashboard-bg

Chart Container (Card):

Background: bg-dashboard-card (白)

Border Radius: rounded-card (16px)

Shadow: shadow-sm (控えめな影)

Border: border border-dashboard-border (薄い境界線)

B. Header & Controls (上部)
Title ("Kaeta! WBS..."): text-dashboard-text-main, font-semibold.

Primary Button ("+ タスク追加"):

Background: bg-dashboard-primary (黒/濃紺)

Text: text-white

Radius: rounded-md (8px)

Filters (Dropdowns/Date Picker):

Background: bg-white

Border: border-dashboard-border

Radius: rounded-md

Text: text-dashboard-text-main

C. WBS List (左側タスクリスト)
Header Row (項目名):

Background: bg-gray-50 (非常に薄いグレー)

Text: text-dashboard-text-muted, text-xs, font-medium.

Phase Header (青い帯の部分):

変更: 強い青を廃止し、落ち着いたセクション区切りに変更します。

Background: bg-gray-100

Text: text-dashboard-text-main, font-semibold.

Padding: py-3 px-4

Task Row (タスク行):

Border: 下線に border-dashboard-border。

Task Name: text-dashboard-text-main, text-sm.

Date/Subtext: text-dashboard-text-muted, text-xs.

Badges (担当・状態):

共通: rounded-full, text-xs, font-medium, px-2.5 py-0.5.

状態「完了」: bg-dashboard-success-bg, text-dashboard-success-text.

状態「未着手/進行中」: bg-gray-100, text-gray-600.

担当「エンジニア」: bg-blue-100, text-blue-800 (アクセントカラーに対応).

担当「デザイナー」: bg-pink-100, text-pink-800 (アクセントカラーに対応).

D. Gantt Chart Area (右側チャート)
Calendar Header (日付):

Text: text-dashboard-text-muted, text-xs.

Border: border-dashboard-border.

Weekend Highlight: 土日の列の背景を bg-gray-50 にする。

Gantt Bars (タスクバー):

共通: h-6 (少し高さを出す), rounded (または rounded-md で少し丸くする), shadow-sm.

エンジニアのタスク: bg-accent-blue (#3B82F6).

デザイナーのタスク: bg-accent-pink (#EC4899).

注: バー内のテキストは白 (text-white) にする。

3. Claude Code Prompt Example
Claude Codeに、このスタイル変更を依頼する際のプロンプト例です。

Task: Reskin the existing WBS/Gantt chart component using the provided Tailwind CSS design system.

Global Styles:

Wrap the entire component in a container with bg-dashboard-bg.

The main content area should be a white card: bg-dashboard-card, rounded-card (16px), with a thin border-dashboard-border and subtle shadow.

Use text-dashboard-text-main for primary text and text-dashboard-text-muted for secondary text/dates.

Component Specifics:

Buttons & Inputs: Update the "+ Task Add" button to use bg-dashboard-primary and rounded-md. All filter inputs should have rounded-md borders.

WBS List: Change the blue phase header bars to a neutral bg-gray-100 with dark text. Ensure task rows have thin borders.

Badges: Update status badges. "Completed" must use the success tokens (bg-dashboard-success-bg). "Not Started" should be neutral gray. Role badges (Engineer/Designer) should use lighter versions of the accent colors with rounded-full shape.

Gantt Bars: Update the colors of the bars in the chart area. Engineer tasks should be bg-accent-blue and Designer tasks should be bg-accent-pink. Apply rounded-md to the bars for a modern feel.