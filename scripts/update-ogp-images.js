/**
 * 既存ニュースのOGP画像を取得・更新するスクリプト
 */

const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pmeshocxacyhughagupo.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZXNob2N4YWN5aHVnaGFndXBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMjkzMjUsImV4cCI6MjA3OTkwNTMyNX0.5oddZFEIHb7zG8vj7qIYAVhnKf_zas_hd8PkWAjCm1Q';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// OGP画像を取得
async function fetchOgpImage(url, timeout = 8000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    // Google Newsのリダイレクトを解決
    let targetUrl = url;
    if (url.includes('news.google.com')) {
      // Google Newsのリンクは直接アクセスしてリダイレクト先を取得
      try {
        const redirectResponse = await fetch(url, {
          signal: controller.signal,
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });
        targetUrl = redirectResponse.url;
      } catch {
        // リダイレクト解決に失敗した場合は元のURLを使用
      }
    }
    
    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.log(`    HTTP ${response.status}: ${targetUrl.substring(0, 50)}...`);
      return null;
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // OGP画像を探す（優先順位順）
    const ogImage = $('meta[property="og:image"]').attr('content') ||
                    $('meta[name="og:image"]').attr('content') ||
                    $('meta[property="twitter:image"]').attr('content') ||
                    $('meta[name="twitter:image"]').attr('content') ||
                    $('meta[name="twitter:image:src"]').attr('content');
    
    if (ogImage) {
      // 相対URLを絶対URLに変換
      if (ogImage.startsWith('//')) {
        return 'https:' + ogImage;
      } else if (ogImage.startsWith('/')) {
        const urlObj = new URL(targetUrl);
        return urlObj.origin + ogImage;
      }
      return ogImage;
    }
    
    return null;
  } catch (error) {
    // タイムアウトやネットワークエラーは無視
    return null;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('OGP画像更新スクリプト');
  console.log('='.repeat(60));
  
  // image_urlがnullのニュースを取得（最新100件）
  const { data: news, error } = await supabase
    .from('news')
    .select('id, url, title, category')
    .is('image_url', null)
    .neq('category', 'youtube')
    .order('published_at', { ascending: false })
    .limit(100);
  
  if (error) {
    console.error('データベースエラー:', error.message);
    return;
  }
  
  console.log(`対象ニュース: ${news.length}件\n`);
  
  let updated = 0;
  let failed = 0;
  
  for (let i = 0; i < news.length; i++) {
    const item = news[i];
    console.log(`[${i + 1}/${news.length}] ${item.title.substring(0, 40)}...`);
    
    const imageUrl = await fetchOgpImage(item.url);
    
    if (imageUrl) {
      const { error: updateError } = await supabase
        .from('news')
        .update({ image_url: imageUrl })
        .eq('id', item.id);
      
      if (!updateError) {
        updated++;
        console.log(`  ✅ 画像取得成功`);
      } else {
        failed++;
        console.log(`  ❌ DB更新エラー: ${updateError.message}`);
      }
    } else {
      failed++;
      console.log(`  ⚠️ 画像なし`);
    }
    
    // レート制限を避けるため待機
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('結果サマリー');
  console.log('='.repeat(60));
  console.log(`  ✅ 更新成功: ${updated}件`);
  console.log(`  ⚠️ 画像なし/エラー: ${failed}件`);
  console.log('='.repeat(60));
}

main();

