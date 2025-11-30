/**
 * YouTube動画取得スクリプト
 * 
 * パチンコ・パチスロ関連の人気動画を取得してSupabaseに保存
 */

const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');

// YouTube API設定
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || 'AIzaSyCF_MkYYra2Zhs8PE-H_J7wBVmtJKr4_cQ';
const youtube = google.youtube({ version: 'v3', auth: YOUTUBE_API_KEY });

// Supabase設定
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pmeshocxacyhughagupo.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZXNob2N4YWN5aHVnaGFndXBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMjkzMjUsImV4cCI6MjA3OTkwNTMyNX0.5oddZFEIHb7zG8vj7qIYAVhnKf_zas_hd8PkWAjCm1Q';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 検索キーワード
const SEARCH_QUERIES = [
  'パチンコ 新台',
  'パチスロ 新台',
  'パチンコ 実践',
  'パチスロ 実践',
];

// 再生回数の閾値（5万回以上）
const MIN_VIEW_COUNT = 50000;

// YouTube動画を検索
async function searchYouTubeVideos(query) {
  try {
    console.log(`  検索中: "${query}"`);
    
    // 動画を検索（過去7日間）
    const searchResponse = await youtube.search.list({
      part: 'snippet',
      q: query,
      type: 'video',
      order: 'viewCount',
      publishedAfter: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      maxResults: 10,
      regionCode: 'JP',
      relevanceLanguage: 'ja',
    });

    if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
      return [];
    }

    // 動画IDを取得
    const videoIds = searchResponse.data.items.map(item => item.id.videoId);

    // 動画の詳細情報（再生回数など）を取得
    const videosResponse = await youtube.videos.list({
      part: 'snippet,statistics',
      id: videoIds.join(','),
    });

    const videos = videosResponse.data.items
      .filter(video => {
        const viewCount = parseInt(video.statistics.viewCount || '0', 10);
        return viewCount >= MIN_VIEW_COUNT;
      })
      .map(video => ({
        title: video.snippet.title,
        url: `https://www.youtube.com/watch?v=${video.id}`,
        source: video.snippet.channelTitle,
        category: 'youtube',
        published_at: new Date(video.snippet.publishedAt).toISOString(),
        summary: video.snippet.description?.substring(0, 200) || null,
        image_url: video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.default?.url || null,
        view_count: parseInt(video.statistics.viewCount || '0', 10),
      }));

    console.log(`    → ${videos.length}件（5万回以上）`);
    return videos;
  } catch (error) {
    console.error(`  エラー (${query}):`, error.message);
    return [];
  }
}

// 全クエリから動画を取得
async function fetchAllYouTubeVideos() {
  const allVideos = [];
  const seenUrls = new Set();

  for (const query of SEARCH_QUERIES) {
    const videos = await searchYouTubeVideos(query);
    
    for (const video of videos) {
      if (!seenUrls.has(video.url)) {
        seenUrls.add(video.url);
        allVideos.push(video);
      }
    }

    // レート制限を避けるため待機
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // 再生回数順にソート
  allVideos.sort((a, b) => b.view_count - a.view_count);

  return allVideos;
}

// 動画をSupabaseに保存
async function saveVideos(videos) {
  let savedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const video of videos) {
    try {
      // view_countを除去してDBに保存
      const { view_count, ...videoData } = video;
      
      const { error } = await supabase
        .from('news')
        .upsert(videoData, {
          onConflict: 'url',
          ignoreDuplicates: true
        });

      if (error) {
        if (error.code === '23505') {
          skippedCount++;
        } else {
          console.error(`  保存エラー: ${video.title.substring(0, 30)}...`, error.message);
          errorCount++;
        }
      } else {
        savedCount++;
      }
    } catch (err) {
      console.error(`  エラー: ${video.title.substring(0, 30)}...`, err.message);
      errorCount++;
    }
  }

  return { savedCount, skippedCount, errorCount };
}

// メイン処理
async function main() {
  console.log('='.repeat(60));
  console.log('🎬 YouTube動画収集');
  console.log('実行日時:', new Date().toLocaleString('ja-JP'));
  console.log('='.repeat(60));

  try {
    console.log('\n📡 YouTube APIから動画を取得中...\n');
    const videos = await fetchAllYouTubeVideos();
    console.log(`\n✅ 取得件数: ${videos.length}件（再生回数5万回以上）`);

    if (videos.length === 0) {
      console.log('⚠️ 条件を満たす動画が見つかりませんでした');
      return;
    }

    // チャンネル別の内訳を表示
    const channelCount = {};
    videos.forEach(v => {
      channelCount[v.source] = (channelCount[v.source] || 0) + 1;
    });
    console.log('\n📺 チャンネル別内訳:');
    Object.entries(channelCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([channel, count]) => {
        console.log(`  ${channel}: ${count}件`);
      });

    // 上位動画を表示
    console.log('\n🔥 再生回数TOP5:');
    videos.slice(0, 5).forEach((v, i) => {
      const views = (v.view_count / 10000).toFixed(1);
      console.log(`  ${i + 1}. [${views}万回] ${v.title.substring(0, 40)}...`);
    });

    // Supabaseに保存
    console.log('\n💾 Supabaseに保存中...');
    const { savedCount, skippedCount, errorCount } = await saveVideos(videos);

    // 結果サマリー
    console.log('\n' + '='.repeat(60));
    console.log('📋 処理結果サマリー');
    console.log('='.repeat(60));
    console.log(`  ✅ 新規保存: ${savedCount}件`);
    console.log(`  ⏭️ スキップ（重複）: ${skippedCount}件`);
    console.log(`  ❌ エラー: ${errorCount}件`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error);
    process.exit(1);
  }

  console.log('\n✨ 処理完了！');
}

main();

