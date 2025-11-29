/**
 * パチンコ・パチスロ業界ニュース収集スクリプト
 * 
 * Google News RSSから実際のニュースを取得してSupabaseに保存
 * 
 * 使用方法: node scripts/fetch-news.js
 */

const Parser = require('rss-parser');
const { createClient } = require('@supabase/supabase-js');

// Supabase設定
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pmeshocxacyhughagupo.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZXNob2N4YWN5aHVnaGFndXBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMjkzMjUsImV4cCI6MjA3OTkwNTMyNX0.5oddZFEIHb7zG8vj7qIYAVhnKf_zas_hd8PkWAjCm1Q';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const parser = new Parser({
  customFields: {
    item: ['source'],
  },
});

// 検索キーワード（複数のクエリでニュースを取得）
const SEARCH_QUERIES = [
  'パチンコ 新台',
  'パチスロ 新台',
  'パチンコ 業界',
  'パチスロ メーカー',
  'SANKYO パチンコ',
  'サミー パチスロ',
  '遊技機 規制',
  'パチンコホール',
];

// カテゴリ判定キーワード
const CATEGORY_KEYWORDS = {
  new_machine: ['新台', '導入', 'スペック', '機種', '登場', '発売', 'デビュー', '導入開始'],
  regulation: ['規制', '規則', '警察庁', '法令', '改正', '適合', '検定', '行政', '条例'],
  hall: ['ホール', '店舗', '閉店', '開店', 'グランドオープン', '稼働', 'マルハン', 'ダイナム', 'ガイア'],
  maker: ['SANKYO', 'サンキョー', 'サミー', 'Sammy', '平和', '大都', 'ユニバーサル', '三洋', 'ニューギン', '京楽', '藤商事', 'メーカー', '開発'],
  industry: ['業界', '市場', '売上', '動向', '協会', '組合', '決算', '業績'],
};

// カテゴリを判定
function detectCategory(title) {
  const lowerTitle = title.toLowerCase();
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => lowerTitle.includes(keyword.toLowerCase()))) {
      return category;
    }
  }
  return 'industry'; // デフォルト
}

// ソースを判定
function detectSource(link, sourceTitle) {
  const lowerLink = link.toLowerCase();
  const lowerSource = (sourceTitle || '').toLowerCase();
  
  if (lowerLink.includes('p-world') || lowerSource.includes('p-world')) return 'p-world';
  if (lowerLink.includes('yugitsunippon') || lowerSource.includes('遊技日本')) return 'yugitsunippon';
  if (lowerLink.includes('greenbelt') || lowerSource.includes('グリーンべると')) return 'greenbelt';
  if (lowerLink.includes('pachinko-village')) return 'pachinko-village';
  
  return 'google-news';
}

// Google News RSSからニュースを取得
async function fetchGoogleNews(query) {
  const encodedQuery = encodeURIComponent(query);
  const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=ja&gl=JP&ceid=JP:ja`;
  
  try {
    console.log(`  検索中: "${query}"`);
    const feed = await parser.parseURL(rssUrl);
    
    return feed.items.map(item => {
      // Google Newsのリダイレクトリンクから実際のURLを抽出（簡易版）
      let actualUrl = item.link;
      
      return {
        title: item.title.replace(/ - [^-]+$/, '').trim(), // ソース名を除去
        url: actualUrl,
        source: detectSource(item.link, item.source?.$text || item.source),
        category: detectCategory(item.title),
        published_at: item.pubDate ? new Date(item.pubDate).toISOString() : null,
        summary: item.contentSnippet || null,
      };
    });
  } catch (error) {
    console.error(`  エラー (${query}):`, error.message);
    return [];
  }
}

// 全てのクエリからニュースを取得
async function fetchAllNews() {
  const allNews = [];
  const seenUrls = new Set();
  
  for (const query of SEARCH_QUERIES) {
    const news = await fetchGoogleNews(query);
    
    // 重複を除去
    for (const item of news) {
      if (!seenUrls.has(item.url)) {
        seenUrls.add(item.url);
        allNews.push(item);
      }
    }
    
    // レート制限を避けるため少し待機
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return allNews;
}

// ニュースをSupabaseに保存
async function saveNews(newsItems) {
  let savedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const item of newsItems) {
    try {
      // URLで重複チェック（upsert）
      const { error } = await supabase
        .from('news')
        .upsert(item, { 
          onConflict: 'url',
          ignoreDuplicates: true 
        });

      if (error) {
        if (error.code === '23505') { // 重複エラー
          skippedCount++;
        } else {
          console.error(`  保存エラー: ${item.title.substring(0, 30)}...`, error.message);
          errorCount++;
        }
      } else {
        savedCount++;
      }
    } catch (err) {
      console.error(`  エラー: ${item.title.substring(0, 30)}...`, err.message);
      errorCount++;
    }
  }

  return { savedCount, skippedCount, errorCount };
}

// 古いニュースを削除（30日以上前）
async function cleanupOldNews() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  try {
    const { error, count } = await supabase
      .from('news')
      .delete()
      .lt('fetched_at', thirtyDaysAgo.toISOString());
    
    if (error) {
      console.error('古いニュースの削除エラー:', error.message);
      return 0;
    }
    return count || 0;
  } catch (err) {
    console.error('クリーンアップエラー:', err.message);
    return 0;
  }
}

// メイン処理
async function main() {
  console.log('='.repeat(60));
  console.log('🎰 パチンコ・パチスロ業界ニュース収集');
  console.log('実行日時:', new Date().toLocaleString('ja-JP'));
  console.log('='.repeat(60));

  try {
    // Google Newsからニュースを取得
    console.log('\n📡 Google Newsからニュースを取得中...\n');
    const news = await fetchAllNews();
    console.log(`\n✅ 取得件数: ${news.length}件`);

    if (news.length === 0) {
      console.log('⚠️ ニュースが取得できませんでした');
      return;
    }

    // カテゴリ別の内訳を表示
    const categoryCount = {};
    news.forEach(item => {
      categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
    });
    console.log('\n📊 カテゴリ別内訳:');
    Object.entries(categoryCount).forEach(([cat, count]) => {
      const icons = { new_machine: '🎰', regulation: '📋', hall: '🏪', maker: '🏭', industry: '🏢' };
      console.log(`  ${icons[cat] || '📰'} ${cat}: ${count}件`);
    });

    // Supabaseに保存
    console.log('\n💾 Supabaseに保存中...');
    const { savedCount, skippedCount, errorCount } = await saveNews(news);

    // 古いニュースをクリーンアップ
    console.log('\n🧹 古いニュースをクリーンアップ中...');
    const deletedCount = await cleanupOldNews();

    // 結果サマリー
    console.log('\n' + '='.repeat(60));
    console.log('📋 処理結果サマリー');
    console.log('='.repeat(60));
    console.log(`  ✅ 新規保存: ${savedCount}件`);
    console.log(`  ⏭️ スキップ（重複）: ${skippedCount}件`);
    console.log(`  ❌ エラー: ${errorCount}件`);
    console.log(`  🗑️ 削除（30日以上前）: ${deletedCount}件`);
    console.log('='.repeat(60));

    // 最新のニュースを表示
    if (savedCount > 0) {
      console.log('\n📰 最新のニュース（一部）:');
      news.slice(0, 5).forEach((item, i) => {
        console.log(`  ${i + 1}. ${item.title.substring(0, 50)}...`);
      });
    }

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error);
    process.exit(1);
  }

  console.log('\n✨ 処理完了！');
}

main();
