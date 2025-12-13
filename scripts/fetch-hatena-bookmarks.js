/**
 * はてなブックマーク数取得スクリプト
 * 
 * まとめサイトの記事のはてなブックマーク数を取得してSupabaseに保存
 * 
 * 使用方法: node scripts/fetch-hatena-bookmarks.js
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase設定
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pmeshocxacyhughagupo.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZXNob2N4YWN5aHVnaGFndXBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMjkzMjUsImV4cCI6MjA3OTkwNTMyNX0.5oddZFEIHb7zG8vj7qIYAVhnKf_zas_hd8PkWAjCm1Q';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// はてなブックマークAPIから数を取得
async function fetchBookmarkCount(url) {
    try {
        const apiUrl = `https://bookmark.hatenaapis.com/count/entry?url=${encodeURIComponent(url)}`;
        const response = await fetch(apiUrl);

        if (!response.ok) {
            console.error(`  APIエラー (${response.status}): ${url}`);
            return 0;
        }

        const text = await response.text();
        const count = parseInt(text) || 0;

        return count;
    } catch (error) {
        console.error(`  取得エラー: ${url}`, error.message);
        return 0;
    }
}

// まとめ記事のブックマーク数を更新
async function updateBookmarkCounts() {
    try {
        // まとめカテゴリの記事を取得（最新200件）
        const { data: articles, error } = await supabase
            .from('news')
            .select('id, title, url, view_count')
            .eq('category', 'matome')
            .order('published_at', { ascending: false })
            .limit(200);

        if (error) {
            console.error('記事取得エラー:', error);
            return;
        }

        if (!articles || articles.length === 0) {
            console.log('まとめ記事がありません');
            return;
        }

        console.log(`\n取得した記事数: ${articles.length}件\n`);

        let updatedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const article of articles) {
            try {
                // はてなブックマーク数を取得
                const bookmarkCount = await fetchBookmarkCount(article.url);

                // 既存のview_countと同じ場合はスキップ
                if (article.view_count === bookmarkCount) {
                    skippedCount++;
                    continue;
                }

                // Supabaseを更新
                const { error: updateError } = await supabase
                    .from('news')
                    .update({ view_count: bookmarkCount })
                    .eq('id', article.id);

                if (updateError) {
                    console.error(`  更新エラー: ${article.title.substring(0, 30)}...`, updateError.message);
                    errorCount++;
                } else {
                    updatedCount++;
                    if (bookmarkCount > 0) {
                        console.log(`  ✅ ${article.title.substring(0, 40)}... → ${bookmarkCount}users`);
                    }
                }

                // レート制限対策：200ms待機
                await new Promise(resolve => setTimeout(resolve, 200));
            } catch (err) {
                console.error(`  エラー: ${article.title.substring(0, 30)}...`, err.message);
                errorCount++;
            }
        }

        // 結果サマリー
        console.log('\n' + '='.repeat(60));
        console.log('📋 処理結果サマリー');
        console.log('='.repeat(60));
        console.log(`  ✅ 更新: ${updatedCount}件`);
        console.log(`  ⏭️ スキップ（変更なし）: ${skippedCount}件`);
        console.log(`  ❌ エラー: ${errorCount}件`);
        console.log('='.repeat(60));

    } catch (error) {
        console.error('処理エラー:', error);
    }
}

// メイン処理
async function main() {
    console.log('='.repeat(60));
    console.log('🔖 はてなブックマーク数取得');
    console.log('実行日時:', new Date().toLocaleString('ja-JP'));
    console.log('='.repeat(60));

    await updateBookmarkCounts();

    console.log('\n✨ 処理完了！');
}

main();
