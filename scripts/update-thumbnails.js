/**
 * 既存ニュースのサムネイル（OGP画像）を取得・更新するスクリプト
 */

const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');

// Supabase設定
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pmeshocxacyhughagupo.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZXNob2N4YWN5aHVnaGFndXBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMjkzMjUsImV4cCI6MjA3OTkwNTMyNX0.5oddZFEIHb7zG8vj7qIYAVhnKf_zas_hd8PkWAjCm1Q';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Google NewsのリダイレクトURLから実際のURLを取得
async function getActualUrl(googleNewsUrl) {
  try {
    const response = await fetch(googleNewsUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      timeout: 10000,
    });
    return response.url;
  } catch (error) {
    console.error('  URL取得エラー:', error.message);
    return googleNewsUrl;
  }
}

// OGP画像を取得
async function getOgImage(url) {
  try {
    // Google Newsのリダイレクトを解決
    let actualUrl = url;
    if (url.includes('news.google.com')) {
      actualUrl = await getActualUrl(url);
    }

    const response = await fetch(actualUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
      },
      timeout: 15000,
    });

    if (!response.ok) {
      console.error(`  HTTPエラー: ${response.status}`);
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // OGP画像を探す（優先順位順）
    let imageUrl = 
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="og:image"]').attr('content') ||
      $('meta[property="twitter:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      $('meta[property="twitter:image:src"]').attr('content') ||
      $('link[rel="image_src"]').attr('href');

    if (imageUrl) {
      // 相対URLを絶対URLに変換
      if (imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl;
      } else if (imageUrl.startsWith('/')) {
        const urlObj = new URL(actualUrl);
        imageUrl = urlObj.origin + imageUrl;
      }
      return imageUrl;
    }

    return null;
  } catch (error) {
    console.error('  OGP取得エラー:', error.message);
    return null;
  }
}

// メイン処理
async function main() {
  console.log('='.repeat(60));
  console.log('🖼️  サムネイル（OGP画像）更新スクリプト');
  console.log('='.repeat(60));

  // サムネイルがないニュースを取得（最新10件）
  console.log('\n📋 サムネイルがないニュースを取得中...\n');

  const { data: newsItems, error } = await supabase
    .from('news')
    .select('id, title, url, image_url')
    .is('image_url', null)
    .order('fetched_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('ニュース取得エラー:', error.message);
    return;
  }

  console.log(`📰 対象ニュース: ${newsItems.length}件\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < newsItems.length; i++) {
    const item = newsItems[i];
    console.log(`[${i + 1}/${newsItems.length}] ${item.title.substring(0, 40)}...`);

    const imageUrl = await getOgImage(item.url);

    if (imageUrl) {
      // データベースを更新
      const { error: updateError } = await supabase
        .from('news')
        .update({ image_url: imageUrl })
        .eq('id', item.id);

      if (updateError) {
        console.error(`  ❌ DB更新エラー: ${updateError.message}`);
        failCount++;
      } else {
        console.log(`  ✅ 画像取得成功: ${imageUrl.substring(0, 50)}...`);
        successCount++;
      }
    } else {
      console.log(`  ⚠️ 画像が見つかりませんでした`);
      failCount++;
    }

    // レート制限を避けるため待機
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 結果サマリー');
  console.log('='.repeat(60));
  console.log(`  ✅ 成功: ${successCount}件`);
  console.log(`  ❌ 失敗: ${failCount}件`);
  console.log('='.repeat(60));
}

main().catch(console.error);



