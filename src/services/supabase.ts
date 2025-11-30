import { createClient } from '@supabase/supabase-js';
import { NewsItem } from '../types/news';

// Supabase設定
const SUPABASE_URL = 'https://pmeshocxacyhughagupo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZXNob2N4YWN5aHVnaGFndXBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMjkzMjUsImV4cCI6MjA3OTkwNTMyNX0.5oddZFEIHb7zG8vj7qIYAVhnKf_zas_hd8PkWAjCm1Q';

// Supabaseクライアント
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ニュース一覧を取得（ページネーション対応）
export const getNews = async (
  category?: string,
  source?: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ data: NewsItem[]; hasMore: boolean }> => {
  try {
    let query = supabase
      .from('news')
      .select('*', { count: 'exact' })
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (source) {
      query = query.eq('source', source);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('ニュース取得エラー:', error.message);
      return { data: [], hasMore: false };
    }

    const hasMore = count ? offset + limit < count : false;
    return { data: data || [], hasMore };
  } catch (error) {
    console.error('ニュース取得エラー:', error);
    return { data: [], hasMore: false };
  }
};

// ニュースを検索（ページネーション対応）
export const searchNews = async (
  keyword: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ data: NewsItem[]; hasMore: boolean }> => {
  try {
    const { data, error, count } = await supabase
      .from('news')
      .select('*', { count: 'exact' })
      .ilike('title', `%${keyword}%`)
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('ニュース検索エラー:', error.message);
      return { data: [], hasMore: false };
    }

    const hasMore = count ? offset + limit < count : false;
    return { data: data || [], hasMore };
  } catch (error) {
    console.error('ニュース検索エラー:', error);
    return { data: [], hasMore: false };
  }
};

// 最新ニュースを取得（今日のニュース）
export const getTodayNews = async (): Promise<NewsItem[]> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('news')
      .select('*')
      .gte('published_at', today.toISOString())
      .order('published_at', { ascending: false });

    if (error) {
      console.error('今日のニュース取得エラー:', error.message);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('今日のニュース取得エラー:', error);
    return [];
  }
};

// 最終更新日時を取得
export const getLastUpdatedTime = async (): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('news')
      .select('fetched_at')
      .order('fetched_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('最終更新日時取得エラー:', error.message);
      return null;
    }

    return data && data.length > 0 ? data[0].fetched_at : null;
  } catch (error) {
    console.error('最終更新日時取得エラー:', error);
    return null;
  }
};


