/**
 * アクセスカウンター用テーブルをSupabaseに作成
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pmeshocxacyhughagupo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZXNob2N4YWN5aHVnaGFndXBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMjkzMjUsImV4cCI6MjA3OTkwNTMyNX0.5oddZFEIHb7zG8vj7qIYAVhnKf_zas_hd8PkWAjCm1Q';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function setupAccessCounter() {
  console.log('アクセスカウンター用テーブルを確認中...');

  // site_statsテーブルにアクセスカウンターの初期値を挿入
  const { data, error } = await supabase
    .from('site_stats')
    .upsert({ 
      id: 1, 
      stat_name: 'access_count', 
      value: 0 
    }, { 
      onConflict: 'id' 
    });

  if (error) {
    console.error('エラー:', error.message);
    console.log('\n以下のSQLをSupabaseのSQLエディタで実行してください：');
    console.log(`
CREATE TABLE IF NOT EXISTS site_stats (
  id SERIAL PRIMARY KEY,
  stat_name VARCHAR(50) NOT NULL UNIQUE,
  value BIGINT DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO site_stats (stat_name, value) VALUES ('access_count', 0)
ON CONFLICT (stat_name) DO NOTHING;

-- RLSポリシーを設定
ALTER TABLE site_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access" ON site_stats FOR SELECT USING (true);
CREATE POLICY "Allow update access" ON site_stats FOR UPDATE USING (true);
    `);
  } else {
    console.log('✅ アクセスカウンターが設定されました');
  }
}

setupAccessCounter();

