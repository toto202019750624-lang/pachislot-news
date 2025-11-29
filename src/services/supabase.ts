import { createClient } from '@supabase/supabase-js';
import { NewsItem } from '../types/news';

// Supabase設定
const SUPABASE_URL = 'https://pmeshocxacyhughagupo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZXNob2N4YWN5aHVnaGFndXBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMjkzMjUsImV4cCI6MjA3OTkwNTMyNX0.5oddZFEIHb7zG8vj7qIYAVhnKf_zas_hd8PkWAjCm1Q';

// Supabaseクライアント
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ニュース一覧を取得
export const getNews = async (
  category?: string,
  source?: string,
  limit: number = 50
): Promise<NewsItem[]> => {
  try {
    let query = supabase
      .from('news')
      .select('*')
      .order('fetched_at', { ascending: false })
      .limit(limit);

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (source) {
      query = query.eq('source', source);
    }

    const { data, error } = await query;

    if (error) {
      console.error('ニュース取得エラー:', error.message);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('ニュース取得エラー:', error);
    return [];
  }
};

// ニュースを検索
export const searchNews = async (keyword: string): Promise<NewsItem[]> => {
  try {
    const { data, error } = await supabase
      .from('news')
      .select('*')
      .ilike('title', `%${keyword}%`)
      .order('fetched_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('ニュース検索エラー:', error.message);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('ニュース検索エラー:', error);
    return [];
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
      .gte('fetched_at', today.toISOString())
      .order('fetched_at', { ascending: false });

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


