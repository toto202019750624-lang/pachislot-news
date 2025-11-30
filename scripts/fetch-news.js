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

// ソース名のマッピング
const SOURCE_MAPPING = {
  'p-world': 'P-WORLD',
  'yugitsunippon': '遊技日本',
  'greenbelt': 'グリーンべると',
  'pachinko-village': 'パチンコビレッジ',
  'nikkansports': '日刊スポーツ',
  'yahoo': 'Yahoo!ニュース',
  'livedoor': 'livedoor',
  'oricon': 'ORICON',
  'itmedia': 'ITmedia',
  'gigazine': 'GIGAZINE',
  'automaton': 'AUTOMATON',
  'famitsu': 'ファミ通',
  '4gamer': '4Gamer',
  'inside-games': 'インサイド',
  'game.watch': 'GAME Watch',
  'dengekionline': '電撃オンライン',
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

// Google Newsのタイトルからソース名を抽出
function extractSourceFromTitle(title) {
  // タイトルの最後に「 - ソース名」がある場合
  const match = title.match(/ - ([^-]+)$/);
  if (match) {
    return match[1].trim();
  }
  return null;
}

// URLからソースを判定
function detectSourceFromUrl(url) {
  const lowerUrl = url.toLowerCase();
  
  for (const [key, name] of Object.entries(SOURCE_MAPPING)) {
    if (lowerUrl.includes(key)) {
      return name;
    }
  }
  
  // ドメインから抽出
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    // ドメインの最初の部分を取得（例: news.yahoo.co.jp → yahoo）
    const parts = domain.split('.');
    if (parts.length >= 2) {
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }
    return domain;
  } catch {
    return null;
  }
}

// タイトルの類似度を計算（Jaccard係数ベース）
function calculateSimilarity(title1, title2) {
  // タイトルを正規化（記号除去、小文字化）
  const normalize = (str) => str.replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
  const t1 = normalize(title1);
  const t2 = normalize(title2);
  
  if (t1 === t2) return 1.0;
  if (t1.length === 0 || t2.length === 0) return 0;
  
  // 2-gramで分割
  const ngram = (str, n = 2) => {
    const grams = new Set();
    for (let i = 0; i <= str.length - n; i++) {
      grams.add(str.substring(i, i + n));
    }
    return grams;
  };
  
  const set1 = ngram(t1);
  const set2 = ngram(t2);
  
  if (set1.size === 0 || set2.size === 0) return 0;
  
  // 積集合のサイズ
  let intersection = 0;
  for (const gram of set1) {
    if (set2.has(gram)) intersection++;
  }
  
  // 和集合のサイズ
  const union = set1.size + set2.size - intersection;
  
  return intersection / union;
}

// 重複タイトルを除去（90%以上類似したものを除去）
function removeDuplicateTitles(newsItems, threshold = 0.9) {
  const uniqueNews = [];
  let duplicateCount = 0;
  
  for (const item of newsItems) {
    let isDuplicate = false;
    
    for (const existing of uniqueNews) {
      const similarity = calculateSimilarity(item.title, existing.title);
      if (similarity >= threshold) {
        isDuplicate = true;
        duplicateCount++;
        break;
      }
    }
    
    if (!isDuplicate) {
      uniqueNews.push(item);
    }
  }
  
  console.log(`  🔍 類似タイトル除去: ${duplicateCount}件`);
  return uniqueNews;
}

// Google News RSSからニュースを取得
async function fetchGoogleNews(query) {
  const encodedQuery = encodeURIComponent(query);
  const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=ja&gl=JP&ceid=JP:ja`;
  
  try {
    console.log(`  検索中: "${query}"`);
    const feed = await parser.parseURL(rssUrl);
    
    return feed.items.map(item => {
      // タイトルからソース名を抽出
      const sourceFromTitle = extractSourceFromTitle(item.title);
      // タイトルからソース名を除去
      const cleanTitle = item.title.replace(/ - [^-]+$/, '').trim();
      
      // ソースを決定（タイトルから抽出 > RSSのsource > URLから推測）
      let source = sourceFromTitle || 
                   item.source?.$text || 
                   item.source ||
                   detectSourceFromUrl(item.link) ||
                   'ニュース';
      
      return {
        title: cleanTitle,
        url: item.link,
        source: source,
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
    
    // URL重複を除去
    for (const item of news) {
      if (!seenUrls.has(item.url)) {
        seenUrls.add(item.url);
        allNews.push(item);
      }
    }
    
    // レート制限を避けるため少し待機
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // タイトルの類似度で重複除去
  const uniqueNews = removeDuplicateTitles(allNews);
  
  return uniqueNews;
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
    console.log(`\n✅ 取得件数（重複除去後）: ${news.length}件`);

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

    // ソース別の内訳を表示
    const sourceCount = {};
    news.forEach(item => {
      sourceCount[item.source] = (sourceCount[item.source] || 0) + 1;
    });
    console.log('\n📰 ソース別内訳（上位10）:');
    Object.entries(sourceCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([src, count]) => {
        console.log(`  ${src}: ${count}件`);
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
        console.log(`  ${i + 1}. [${item.source}] ${item.title.substring(0, 40)}...`);
      });
    }

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error);
    process.exit(1);
  }

  console.log('\n✨ 処理完了！');
}

main();
