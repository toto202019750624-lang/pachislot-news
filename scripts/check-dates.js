/**
 * データベースの日付状態を確認するスクリプト
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pmeshocxacyhughagupo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZXNob2N4YWN5aHVnaGFndXBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMjkzMjUsImV4cCI6MjA3OTkwNTMyNX0.5oddZFEIHb7zG8vj7qIYAVhnKf_zas_hd8PkWAjCm1Q';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkDates() {
  console.log('='.repeat(70));
  console.log('📅 データベースの日付状態確認');
  console.log('='.repeat(70));

  // 最新20件のニュースを取得
  const { data, error } = await supabase
    .from('news')
    .select('id, title, published_at, fetched_at')
    .order('fetched_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('エラー:', error.message);
    return;
  }

  console.log('\n📰 最新20件のニュース日付:\n');
  console.log('ID'.padEnd(6) + 'published_at'.padEnd(22) + 'fetched_at'.padEnd(22) + 'タイトル');
  console.log('-'.repeat(70));

  let nullCount = 0;
  let matchCount = 0;
  let mismatchCount = 0;

  data.forEach(item => {
    const pubDate = item.published_at 
      ? new Date(item.published_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
      : 'NULL';
    const fetchDate = new Date(item.fetched_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
    const title = item.title.substring(0, 25) + '...';

    console.log(
      String(item.id).padEnd(6) +
      pubDate.padEnd(22) +
      fetchDate.padEnd(22) +
      title
    );

    if (!item.published_at) {
      nullCount++;
    } else {
      const pubDay = new Date(item.published_at).toDateString();
      const fetchDay = new Date(item.fetched_at).toDateString();
      if (pubDay === fetchDay) {
        matchCount++;
      } else {
        mismatchCount++;
      }
    }
  });

  // 統計情報
  console.log('\n' + '='.repeat(70));
  console.log('📊 統計情報');
  console.log('='.repeat(70));

  // 全体のカウント
  const { count: totalCount } = await supabase
    .from('news')
    .select('*', { count: 'exact', head: true });

  const { count: nullPublishedCount } = await supabase
    .from('news')
    .select('*', { count: 'exact', head: true })
    .is('published_at', null);

  console.log(`\n総ニュース数: ${totalCount}件`);
  console.log(`published_at がNULL: ${nullPublishedCount}件`);
  console.log(`published_at が設定済み: ${totalCount - nullPublishedCount}件`);

  console.log('\n📋 サンプル20件の内訳:');
  console.log(`  - published_at がNULL: ${nullCount}件`);
  console.log(`  - published_at と fetched_at が同じ日: ${matchCount}件`);
  console.log(`  - published_at と fetched_at が異なる日: ${mismatchCount}件`);

  // 日付の分布
  console.log('\n📅 published_at の日付分布（最新10日）:');
  const { data: dateDistribution } = await supabase
    .from('news')
    .select('published_at')
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(500);

  if (dateDistribution) {
    const dateCounts = {};
    dateDistribution.forEach(item => {
      const date = new Date(item.published_at).toLocaleDateString('ja-JP');
      dateCounts[date] = (dateCounts[date] || 0) + 1;
    });

    const sortedDates = Object.entries(dateCounts)
      .sort((a, b) => new Date(b[0]) - new Date(a[0]))
      .slice(0, 10);

    sortedDates.forEach(([date, count]) => {
      const bar = '█'.repeat(Math.min(count, 30));
      console.log(`  ${date}: ${bar} ${count}件`);
    });
  }

  console.log('\n' + '='.repeat(70));
}

checkDates().catch(console.error);


