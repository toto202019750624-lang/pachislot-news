/**
 * おかしい日付を修正するスクリプト
 * 
 * - 未来の日付 → fetched_at に置き換え
 * - 30日以上前の日付 → fetched_at に置き換え
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pmeshocxacyhughagupo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZXNob2N4YWN5aHVnaGFndXBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMjkzMjUsImV4cCI6MjA3OTkwNTMyNX0.5oddZFEIHb7zG8vj7qIYAVhnKf_zas_hd8PkWAjCm1Q';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fixDates() {
  console.log('='.repeat(60));
  console.log('📅 日付修正スクリプト');
  console.log('='.repeat(60));

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // 全ニュースを取得
  const { data, error } = await supabase
    .from('news')
    .select('id, title, published_at, fetched_at')
    .order('id', { ascending: true });

  if (error) {
    console.error('エラー:', error.message);
    return;
  }

  console.log(`\n📰 総ニュース数: ${data.length}件\n`);

  let futureCount = 0;
  let oldCount = 0;
  let fixedCount = 0;

  for (const item of data) {
    const publishedAt = new Date(item.published_at);
    const fetchedAt = new Date(item.fetched_at);
    let needsFix = false;
    let reason = '';

    // 未来の日付チェック
    if (publishedAt > now) {
      needsFix = true;
      reason = '未来の日付';
      futureCount++;
    }
    // 30日以上前の日付チェック
    else if (publishedAt < thirtyDaysAgo) {
      needsFix = true;
      reason = '30日以上前';
      oldCount++;
    }

    if (needsFix) {
      console.log(`🔧 修正: [${item.id}] ${item.title.substring(0, 35)}...`);
      console.log(`   理由: ${reason}`);
      console.log(`   ${publishedAt.toLocaleDateString('ja-JP')} → ${fetchedAt.toLocaleDateString('ja-JP')}`);

      // published_at を fetched_at に更新
      const { error: updateError } = await supabase
        .from('news')
        .update({ published_at: item.fetched_at })
        .eq('id', item.id);

      if (updateError) {
        console.log(`   ❌ 更新エラー: ${updateError.message}`);
      } else {
        console.log(`   ✅ 修正完了`);
        fixedCount++;
      }
      console.log('');
    }
  }

  console.log('='.repeat(60));
  console.log('📊 結果サマリー');
  console.log('='.repeat(60));
  console.log(`  📰 総ニュース数: ${data.length}件`);
  console.log(`  ⏩ 未来の日付: ${futureCount}件`);
  console.log(`  ⏪ 30日以上前: ${oldCount}件`);
  console.log(`  ✅ 修正完了: ${fixedCount}件`);
  console.log('='.repeat(60));
}

fixDates().catch(console.error);


