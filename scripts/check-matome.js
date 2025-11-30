/**
 * まとめサイトのニュース日付を確認
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pmeshocxacyhughagupo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZXNob2N4YWN5aHVnaGFndXBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMjkzMjUsImV4cCI6MjA3OTkwNTMyNX0.5oddZFEIHb7zG8vj7qIYAVhnKf_zas_hd8PkWAjCm1Q';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkMatome() {
  const { data, error } = await supabase
    .from('news')
    .select('id, title, source, published_at, fetched_at')
    .eq('category', 'matome')
    .order('fetched_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('エラー:', error.message);
    return;
  }

  console.log('📝 まとめサイトのニュース:\n');
  console.log('ソース'.padEnd(25) + 'published_at'.padEnd(22) + 'タイトル');
  console.log('-'.repeat(80));

  data.forEach(item => {
    const pubDate = item.published_at 
      ? new Date(item.published_at).toLocaleString('ja-JP')
      : 'NULL';
    console.log(
      item.source.padEnd(25) +
      pubDate.padEnd(22) +
      item.title.substring(0, 30) + '...'
    );
  });

  // NULL件数
  const nullCount = data.filter(d => !d.published_at).length;
  console.log(`\n📊 published_atがNULL: ${nullCount}/${data.length}件`);
}

checkMatome();

