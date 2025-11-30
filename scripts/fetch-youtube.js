/**
 * YouTube動画取得スクリプト
 * 
 * パチンコ・パチスロ関連の人気チャンネルから動画を取得してSupabaseに保存
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

// 対象チャンネル（チャンネル名で検索してIDを取得）
const TARGET_CHANNELS = [
  // 現在取得済み
  'きむちゃんねる',
  'すろぱちすてぇしょん',
  'スロパチステーション',
  'あすピヨのパチ部屋',
  'やっちゃんの崖っぷちスロパチ生活',
  '777パチガブチャンネル',
  'パチスロードch',
  // 追加希望
  '桜高虎',
  'だいいち！チャンネル',
  '1GAME TV',
  'ジャンバリ.TV',
  '日直島田',
  'よしきの成り上がり',
  'いそまるの成り上がり',
  'じゃんじゃんの型破り',
];

// 再生回数の閾値（5万回以上）
const MIN_VIEW_COUNT = 50000;

// チャンネル名からチャンネルIDを取得
async function getChannelId(channelName) {
  try {
    const response = await youtube.search.list({
      part: 'snippet',
      q: channelName,
      type: 'channel',
      maxResults: 1,
    });

    if (response.data.items && response.data.items.length > 0) {
      return {
        id: response.data.items[0].id.channelId,
        name: response.data.items[0].snippet.title,
      };
    }
    return null;
  } catch (error) {
    console.error(`  チャンネル検索エラー (${channelName}):`, error.message);
    return null;
  }
}

// チャンネルから最新動画を取得
async function getChannelVideos(channelId, channelName) {
  try {
    // チャンネルの最新動画を検索（過去14日間）
    const searchResponse = await youtube.search.list({
      part: 'snippet',
      channelId: channelId,
      type: 'video',
      order: 'date',
      publishedAfter: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      maxResults: 10,
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
        source: channelName,
        category: 'youtube',
        published_at: new Date(video.snippet.publishedAt).toISOString(),
        summary: video.snippet.description?.substring(0, 200) || null,
        image_url: video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.default?.url || null,
        view_count: parseInt(video.statistics.viewCount || '0', 10),
      }));

    return videos;
  } catch (error) {
    console.error(`  動画取得エラー (${channelName}):`, error.message);
    return [];
  }
}

// 全チャンネルから動画を取得
async function fetchAllYouTubeVideos() {
  const allVideos = [];
  const seenUrls = new Set();
  const channelResults = [];

  console.log(`📺 ${TARGET_CHANNELS.length}チャンネルから動画を取得中...\n`);

  for (const channelName of TARGET_CHANNELS) {
    console.log(`  🔍 ${channelName}`);
    
    // チャンネルIDを取得
    const channel = await getChannelId(channelName);
    
    if (!channel) {
      console.log(`    ⚠️ チャンネルが見つかりません`);
      continue;
    }

    // チャンネルから動画を取得
    const videos = await getChannelVideos(channel.id, channel.name);
    
    let addedCount = 0;
    for (const video of videos) {
      if (!seenUrls.has(video.url)) {
        seenUrls.add(video.url);
        allVideos.push(video);
        addedCount++;
      }
    }

    if (addedCount > 0) {
      console.log(`    ✅ ${addedCount}件（5万回以上）`);
      channelResults.push({ name: channel.name, count: addedCount });
    } else {
      console.log(`    → 条件を満たす動画なし`);
    }

    // レート制限を避けるため待機
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // 再生回数順にソート
  allVideos.sort((a, b) => b.view_count - a.view_count);

  return { videos: allVideos, channelResults };
}

// 動画をSupabaseに保存
async function saveVideos(videos) {
  let savedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const video of videos) {
    try {
      // view_countも含めてDBに保存
      const { error } = await supabase
        .from('news')
        .upsert(video, {
          onConflict: 'url',
          ignoreDuplicates: false  // 再生回数を更新するため
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
    const { videos, channelResults } = await fetchAllYouTubeVideos();
    console.log(`\n✅ 取得件数: ${videos.length}件（再生回数5万回以上）`);

    if (videos.length === 0) {
      console.log('⚠️ 条件を満たす動画が見つかりませんでした');
      return;
    }

    // チャンネル別の内訳を表示
    if (channelResults.length > 0) {
      console.log('\n📺 チャンネル別内訳:');
      channelResults
        .sort((a, b) => b.count - a.count)
        .forEach(({ name, count }) => {
          console.log(`  ${name}: ${count}件`);
        });
    }

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
