/**
 * イベントデータの県別分析を改善するためのデバッグスクリプト
 * 
 * Supabaseから実際のイベントデータを取得して、
 * どのようなパターンが「その他」に分類されているか分析します。
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pmeshocxacyhughagupo.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZXNob2N4YWN5aHVnaGFndXBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMjkzMjUsImV4cCI6MjA3OTkwNTMyNX0.5oddZFEIHb7zG8vj7qIYAVhnKf_zas_hd8PkWAjCm1Q';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function analyzeEvents() {
    console.log('='.repeat(60));
    console.log('📊 イベントデータ分析');
    console.log('='.repeat(60));

    try {
        // 未来のイベントを取得
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
            .from('news')
            .select('*')
            .eq('category', 'event')
            .gte('published_at', today.toISOString())
            .limit(50);

        if (error) {
            console.error('エラー:', error);
            return;
        }

        if (!data || data.length === 0) {
            console.log('未来のイベントデータがありません');
            return;
        }

        console.log(`\n取得したイベント数: ${data.length}件\n`);
        console.log('='.repeat(60));

        // サンプルデータを表示
        data.slice(0, 20).forEach((item, index) => {
            console.log(`\n[${index + 1}] イベント情報:`);
            console.log(`  Title: ${item.title}`);
            console.log(`  Summary: ${item.summary || '(なし)'}`);
            console.log(`  URL: ${item.url}`);
            console.log(`  Source: ${item.source}`);
            console.log(`  Published: ${item.published_at}`);
            console.log('-'.repeat(60));
        });

    } catch (err) {
        console.error('分析エラー:', err);
    }
}

analyzeEvents();
