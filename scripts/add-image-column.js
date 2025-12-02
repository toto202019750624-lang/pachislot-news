/**
 * newsテーブルにimage_urlカラムを追加
 */

const { Client } = require('pg');

const connectionString = 'postgresql://postgres.pmeshocxacyhughagupo:TOto1041111-@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres';

async function addImageColumn() {
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log('✅ Supabaseに接続しました\n');

    // image_urlカラムを追加
    console.log('📋 image_urlカラムを追加中...');
    await client.query(`
      ALTER TABLE news 
      ADD COLUMN IF NOT EXISTS image_url TEXT;
    `);
    console.log('✅ image_urlカラムを追加しました！\n');

    // テーブル構造を確認
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'news'
      ORDER BY ordinal_position;
    `);

    console.log('📊 現在のテーブル構造:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await client.end();
  }
}

addImageColumn();


