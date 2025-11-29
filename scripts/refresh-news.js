/**
 * ニュースを全て削除して再取得するスクリプト
 */

const { Client } = require('pg');

const connectionString = 'postgresql://postgres.pmeshocxacyhughagupo:TOto1041111-@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres';

async function refreshNews() {
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log('✅ Supabaseに接続しました\n');

    // 既存のニュースを全て削除
    console.log('🗑️ 既存のニュースを削除中...');
    const deleteResult = await client.query('DELETE FROM news;');
    console.log(`✅ ${deleteResult.rowCount}件のニュースを削除しました\n`);

    console.log('📡 ニュースを再取得してください:');
    console.log('   node scripts/fetch-news.js\n');

  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await client.end();
  }
}

refreshNews();

