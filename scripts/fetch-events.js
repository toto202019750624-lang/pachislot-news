/**
 * P-WORLD 取材・来店イベント情報取得スクリプト
 * 
 * P-WORLDの全国の取材・来店情報を取得してSupabaseに保存
 * URL: https://www.p-world.co.jp/hall/interviews/prefs
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
async function fetchPage(url, timeout = 20000) {
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

// 日付文字列をパース（例: "12/2㊋" → Date）
function parseEventDate(dateText) {
  if (!dateText) return new Date().toISOString();
  
  // "12/2" や "12/02" 形式を抽出
  const match = dateText.match(/(\d{1,2})\/(\d{1,2})/);
  if (match) {
    const now = new Date();
    const month = parseInt(match[1], 10);
    const day = parseInt(match[2], 10);
    // 年を決定（現在月より大きい月なら前年）
    let year = now.getFullYear();
    if (month > now.getMonth() + 3) {
      year--;
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
  const seenUrls = new Set();
  
  // リンクから「来店」「取材」を含むイベント情報を抽出
  // 例: "来店 12/03(水) 大阪府大東市 SUPER　COSMO　PREMIUM　大東店"
  $('a').each((index, link) => {
    const $link = $(link);
    const linkText = $link.text().trim();
    const href = $link.attr('href') || '';
    
    // 来店/取材 + 日付 + 地域 + ホール名 のパターンを探す
    if ((linkText.includes('来店') || linkText.includes('取材')) && 
        linkText.match(/\d{1,2}\/\d{1,2}/) &&
        href.length > 0) {
      
      // イベント種別を判定
      const eventType = linkText.includes('来店') ? '来店' : '取材';
      
      // 日付を抽出
      const dateMatch = linkText.match(/(\d{1,2})\/(\d{1,2})/);
      let eventDate = new Date().toISOString();
      if (dateMatch) {
        eventDate = parseEventDate(dateMatch[0]);
      }
      
      // ホール名を抽出（最後の部分がホール名）
      const parts = linkText.split(/\s+/);
      let hallName = '';
      let location = '';
      
      // 「来店 12/03(水) 大阪府大東市 SUPER　COSMO　PREMIUM　大東店」形式をパース
      if (parts.length >= 3) {
        // 都道府県を含む部分を探す
        const prefPattern = /(北海道|青森県|岩手県|宮城県|秋田県|山形県|福島県|茨城県|栃木県|群馬県|埼玉県|千葉県|東京都|神奈川県|新潟県|富山県|石川県|福井県|山梨県|長野県|岐阜県|静岡県|愛知県|三重県|滋賀県|京都府|大阪府|兵庫県|奈良県|和歌山県|鳥取県|島根県|岡山県|広島県|山口県|徳島県|香川県|愛媛県|高知県|福岡県|佐賀県|長崎県|熊本県|大分県|宮崎県|鹿児島県|沖縄県)/;
        
        for (let i = 0; i < parts.length; i++) {
          if (prefPattern.test(parts[i])) {
            location = parts[i];
            hallName = parts.slice(i + 1).join(' ');
            break;
          }
        }
        
        // 都道府県が見つからない場合は最後の部分をホール名に
        if (!hallName) {
          hallName = parts[parts.length - 1];
        }
      }
      
      // URLを整形
      let fullUrl = href;
      if (href.startsWith('//')) {
        fullUrl = 'https:' + href;
      } else if (href.startsWith('/')) {
        fullUrl = 'https://www.p-world.co.jp' + href;
      } else if (!href.startsWith('http')) {
        fullUrl = 'https://www.p-world.co.jp/' + href;
      }
      
      // 重複チェック
      if (!seenUrls.has(fullUrl) && hallName.length > 2) {
        seenUrls.add(fullUrl);
        
        // タイトルを作成（100文字以内に制限）
        const title = `【${eventType}】${hallName}${location ? ` (${location})` : ''}`.substring(0, 100);
        
        events.push({
          title: title,
          url: fullUrl,
          source: 'P-WORLD',
          category: 'event',
          published_at: eventDate,
          summary: linkText.substring(0, 200),
        });
      }
    }
  });
  
  // h3タグからホール名を取得するパターン
  if (events.length === 0) {
    $('h3 a').each((index, link) => {
      const $link = $(link);
      const hallName = $link.text().trim();
      const href = $link.attr('href') || '';
      
      // p-world.jpへのリンクを探す
      if (href.includes('p-world.jp') && hallName.length > 2) {
        let fullUrl = href;
        if (href.startsWith('//')) {
          fullUrl = 'https:' + href;
        }
        
        // 親要素から来店/取材情報を探す
        const parentText = $link.closest('div').text();
        if (parentText.includes('来店') || parentText.includes('取材')) {
          const eventType = parentText.includes('来店') ? '来店' : '取材';
          
          if (!seenUrls.has(fullUrl)) {
            seenUrls.add(fullUrl);
            
            events.push({
              title: `【${eventType}】${hallName}`.substring(0, 100),
              url: fullUrl,
              source: 'P-WORLD',
              category: 'event',
              published_at: new Date().toISOString(),
              summary: `${hallName}での${eventType}イベント`,
            });
          }
        }
      }
    });
  }
  
  console.log(`  → ${events.length}件のイベント情報を取得`);
  return events;
}

// 全てのイベント情報を取得
async function fetchAllEvents() {
  return await fetchPWorldEvents();
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
          ignoreDuplicates: true 
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
    if (savedCount > 0) {
      console.log('\n🎪 最新のイベント（一部）:');
      events.slice(0, 5).forEach((event, i) => {
        console.log(`  ${i + 1}. ${event.title.substring(0, 50)}...`);
      });
    }

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error);
    process.exit(1);
  }

  console.log('\n✨ 処理完了！');
}

main();

