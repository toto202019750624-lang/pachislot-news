// ニュース記事の型定義
export interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  category: string;
  published_at: string | null;
  fetched_at: string;
  summary: string | null;
  image_url: string | null;
}

// カテゴリ定義
export const NEWS_CATEGORIES = [
  { id: 'all', label: '全て', icon: '📰' },
  { id: 'new_machine', label: '新台', icon: '🎰' },
  { id: 'industry', label: '業界', icon: '🏢' },
  { id: 'regulation', label: '規制', icon: '📋' },
  { id: 'hall', label: 'ホール', icon: '🏪' },
  { id: 'maker', label: 'メーカー', icon: '🏭' },
] as const;

export type CategoryId = typeof NEWS_CATEGORIES[number]['id'];

// ソース定義
export const NEWS_SOURCES = [
  { id: 'p-world', name: 'P-WORLD', color: '#e74c3c' },
  { id: 'yugitsunippon', name: '遊技日本', color: '#3498db' },
  { id: 'greenbelt', name: 'グリーンべると', color: '#27ae60' },
  { id: 'pachinko-village', name: 'パチンコビレッジ', color: '#9b59b6' },
  { id: 'google-news', name: 'Google News', color: '#f39c12' },
] as const;

export type SourceId = typeof NEWS_SOURCES[number]['id'];


