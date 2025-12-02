/**
 * P-WORLD 取材・来店イベント情報取得スクリプト
 * 
 * P-WORLDの全国の取材・来店情報を取得してSupabaseに保存
 * URL: https://www.p-world.co.jp/hall/interviews/prefs
 * 
 * 取得対象:
 * - ピックアップ取材・来店情報［PR］
 * - yyyy/MM/DDの取材・来店情報（50件）
 */

const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');

// SSL証明書エラーを無視
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Supabase設定
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pmeshocxacyhughagupo.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZXNob2N4YWN5aHVnaGFndXBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMjkzMjUsImV4cCI6MjA3OTkwNTMyNX0.5oddZFEIHb7zG8vj7qIYAVhnKf_zas_hd8PkWAjCm1Q';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// P-WORLD 取材・来店情報ページURL（全国・全てのホール）
const PWORLD_EVENT_URL = 'https://www.p-world.co.jp/hall/interviews/prefs';

// ページを取得
async function fetchPage(url, timeout = 30000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`HTTP ${response.status}: ${url}`);
      return null;
    }
    
    return await response.text();
  } catch (error) {
    console.error(`ページ取得エラー: ${error.message}`);
    return null;
  }
}

// 日付文字列をパース（例: "12/02(火)" → Date）
function parseEventDate(dateText) {
  if (!dateText) return new Date().toISOString();
  
  // "12/2" や "12/02" 形式を抽出
  const match = dateText.match(/(\d{1,2})\/(\d{1,2})/);
  if (match) {
    const now = new Date();
    const month = parseInt(match[1], 10);
    const day = parseInt(match[2], 10);
    // 年を決定（現在月より3ヶ月以上先なら前年）
    let year = now.getFullYear();
    if (month < now.getMonth() - 1) {
      year++; // 来年のイベント
    }
    return new Date(year, month - 1, day).toISOString();
  }
  
  return new Date().toISOString();
}

// P-WORLDの取材・来店情報をパース
async function fetchPWorldEvents() {
  console.log('📡 P-WORLD 取材・来店情報を取得中...');
  console.log(`   URL: ${PWORLD_EVENT_URL}`);
  
  const html = await fetchPage(PWORLD_EVENT_URL);
  if (!html) {
    console.error('❌ ページの取得に失敗しました');
    return [];
  }
  
  const $ = cheerio.load(html);
  const events = [];
  const seenKeys = new Set(); // ホール名+日付でユニーク化
  
  // ========================================
  // パターン1: ピックアップ取材・来店情報［PR］
  // 例: "来店 12/03(水) 大阪府大東市 SUPER　COSMO　PREMIUM　大東店"
  // ========================================
  console.log('\n  📌 ピックアップ情報を解析中...');
  
  $('a').each((index, link) => {
    const $link = $(link);
    const linkText = $link.text().trim();
    const href = $link.attr('href') || '';
    
    // 「来店/取材 + 日付 + 地域 + ホール名」のパターン
    const eventMatch = linkText.match(/^(来店|取材)\s+(\d{1,2}\/\d{1,2})\([日月火水木金土]\)\s+(.+?)\s+(.+)$/);
    if (eventMatch && href.length > 0) {
      const eventType = eventMatch[1];
      const dateStr = eventMatch[2];
      const location = eventMatch[3];
      const hallName = eventMatch[4].trim();
      
      const eventDate = parseEventDate(dateStr);
      const uniqueKey = `${hallName}_${dateStr}_${eventType}`;
      
      if (!seenKeys.has(uniqueKey) && hallName.length > 2) {
        seenKeys.add(uniqueKey);
        
        // URLを整形
        let fullUrl = href;
        if (href.startsWith('//')) fullUrl = 'https:' + href;
        else if (href.startsWith('/')) fullUrl = 'https://www.p-world.co.jp' + href;
        
        events.push({
          title: `【${eventType}】${hallName} - ${dateStr}`,
          url: fullUrl,
          source: 'P-WORLD',
          category: 'event',
          published_at: eventDate,
          summary: `${location} ${hallName}での${eventType}イベント`,
        });
      }
    }
  });
  
  console.log(`    → ピックアップ: ${events.length}件`);
  
  // ========================================
  // パターン2: メインリスト（各ホールの取材・来店情報）
  // 「来店 xxx PR 12/02(火)」または「取材 xxx PR 12/02(火)」形式のリンク
  // ========================================
  console.log('  📋 メインリストを解析中...');
  
  let mainListCount = 0;
  
  // 全てのリンクから来店/取材情報を探す
  $('a').each((index, link) => {
    const $link = $(link);
    const linkText = $link.text().trim();
    const href = $link.attr('href') || '';
    
    // 「来店」または「取材」で始まり、PRと日付を含むリンク
    // 例: "来店 あんチャーンさん来店予定！！ PR 12/02(火)"
    // 例: "取材 三角関係(ラブトライアングル) PR 12/02(火)09:00〜23:00"
    if ((linkText.startsWith('来店') || linkText.startsWith('取材')) && 
        linkText.includes('PR') && 
        linkText.match(/\d{1,2}\/\d{1,2}/)) {
      
      const eventType = linkText.startsWith('来店') ? '来店' : '取材';
      
      // 日付を抽出
      const dateMatch = linkText.match(/(\d{1,2}\/\d{1,2})/);
      const dateStr = dateMatch ? dateMatch[1] : '';
      const eventDate = parseEventDate(dateStr);
      
      // イベント詳細を抽出（「来店/取材」と「PR」の間の部分）
      let eventDetail = linkText
        .replace(/^(来店|取材)\s*/, '')
        .replace(/\s*PR\s*\d{1,2}\/\d{1,2}.*$/, '')
        .trim();
      
      // 詳細が長すぎる場合は切り詰め
      if (eventDetail.length > 40) {
        eventDetail = eventDetail.substring(0, 40) + '...';
      }
      
      // 親要素からホール名を探す（h3タグ）
      let hallName = '';
      const $container = $link.closest('div').parent().parent();
      const $h3 = $container.find('h3').first();
      if ($h3.length > 0) {
        hallName = $h3.text().trim();
      }
      
      // ホール名が見つからない場合はスキップ
      if (!hallName || hallName.length < 3) return;
      
      // ホールのURLを取得
      let hallUrl = '';
      const $hallLink = $h3.find('a').first();
      if ($hallLink.length > 0) {
        hallUrl = $hallLink.attr('href') || '';
        if (hallUrl.startsWith('//')) hallUrl = 'https:' + hallUrl;
      }
      
      const uniqueKey = `${hallName}_${dateStr}_${eventType}_${eventDetail.substring(0, 20)}`;
      
      if (!seenKeys.has(uniqueKey)) {
        seenKeys.add(uniqueKey);
        mainListCount++;
        
        // タイトルを作成
        let title = `【${eventType}】${hallName}`;
        if (eventDetail && eventDetail.length > 2) {
          title += ` - ${eventDetail}`;
        }
        if (dateStr) {
          title += ` (${dateStr})`;
        }
        
        // 100文字以内に制限
        title = title.substring(0, 100);
        
        events.push({
          title: title,
          url: hallUrl || `https://www.p-world.co.jp/hall/interviews/prefs`,
          source: 'P-WORLD',
          category: 'event',
          published_at: eventDate,
          summary: linkText.substring(0, 200),
        });
      }
    }
  });
  
  console.log(`    → メインリスト: ${mainListCount}件`);
  console.log(`  → 合計: ${events.length}件のイベント情報を取得`);
  
  return events;
}

// イベントをSupabaseに保存
async function saveEvents(events) {
  let savedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const event of events) {
    try {
      const { error } = await supabase
        .from('news')
        .upsert(event, { 
          onConflict: 'url',
          ignoreDuplicates: false  // 更新を許可
        });

      if (error) {
        if (error.code === '23505') {
          skippedCount++;
        } else {
          console.error(`  保存エラー: ${event.title.substring(0, 30)}...`, error.message);
          errorCount++;
        }
      } else {
        savedCount++;
      }
    } catch (err) {
      console.error(`  エラー: ${event.title.substring(0, 30)}...`, err.message);
      errorCount++;
    }
  }

  return { savedCount, skippedCount, errorCount };
}

// メイン処理
async function main() {
  console.log('='.repeat(60));
  console.log('🎪 P-WORLD 取材・来店情報収集');
  console.log('実行日時:', new Date().toLocaleString('ja-JP'));
  console.log('='.repeat(60));

  try {
    const events = await fetchPWorldEvents();
    
    if (events.length === 0) {
      console.log('⚠️ イベント情報が取得できませんでした');
      console.log('P-WORLDのページ構造が変更された可能性があります');
      return;
    }

    // Supabaseに保存
    console.log('\n💾 Supabaseに保存中...');
    const { savedCount, skippedCount, errorCount } = await saveEvents(events);

    // 結果サマリー
    console.log('\n' + '='.repeat(60));
    console.log('📋 処理結果サマリー');
    console.log('='.repeat(60));
    console.log(`  ✅ 新規保存: ${savedCount}件`);
    console.log(`  ⏭️ スキップ（重複）: ${skippedCount}件`);
    console.log(`  ❌ エラー: ${errorCount}件`);
    console.log('='.repeat(60));

    // 最新のイベントを表示
    console.log('\n🎪 取得したイベント（一部）:');
    events.slice(0, 10).forEach((event, i) => {
      console.log(`  ${i + 1}. ${event.title}`);
    });

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error);
    process.exit(1);
  }

  console.log('\n✨ 処理完了！');
}

main();
