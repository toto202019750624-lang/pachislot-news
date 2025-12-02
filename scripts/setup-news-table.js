/**
 * ニューステーブルのセットアップスクリプト
 * 
 * URLにユニーク制約を追加して重複を防ぐ
 */

const { Client } = require('pg');

const connectionString = 'postgresql://postgres.pmeshocxacyhughagupo:TOto1041111-@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres';

async function setupNewsTable() {
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log('✅ Supabaseに接続しました\n');

    // 既存のnewsテーブルを削除して再作成（スキーマ変更のため）
    console.log('📋 newsテーブルを再作成中...\n');

    // 既存テーブルを削除
    await client.query('DROP TABLE IF EXISTS news CASCADE;');

    // 新しいテーブルを作成
    const createTableQuery = `
      CREATE TABLE news (
        id SERIAL PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        url TEXT NOT NULL UNIQUE,
        source VARCHAR(100) DEFAULT 'google-news',
        category VARCHAR(50) DEFAULT 'industry',
        summary TEXT,
        published_at TIMESTAMP WITH TIME ZONE,
        fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- インデックスを作成（検索高速化）
      CREATE INDEX idx_news_category ON news(category);
      CREATE INDEX idx_news_published_at ON news(published_at DESC);
      CREATE INDEX idx_news_fetched_at ON news(fetched_at DESC);
      CREATE INDEX idx_news_source ON news(source);

      -- コメント追加
      COMMENT ON TABLE news IS 'パチンコ・パチスロ業界ニュース';
      COMMENT ON COLUMN news.url IS 'ニュース記事のURL（ユニーク）';
      COMMENT ON COLUMN news.source IS 'ニュースソース（p-world, yugitsunippon, greenbelt等）';
      COMMENT ON COLUMN news.category IS 'カテゴリ（new_machine, regulation, hall, maker, industry）';
    `;

    await client.query(createTableQuery);
    console.log('✅ newsテーブルを作成しました！\n');

    // テーブル構造を表示
    console.log('📊 テーブル構造:');
    console.log('-'.repeat(60));
    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'news'
      ORDER BY ordinal_position;
    `);
    
    columnsResult.rows.forEach(col => {
      console.log(`  ${col.column_name.padEnd(15)} ${col.data_type.padEnd(30)} ${col.is_nullable === 'YES' ? 'NULL可' : 'NOT NULL'}`);
    });

    // インデックスを表示
    console.log('\n📑 インデックス:');
    console.log('-'.repeat(60));
    const indexResult = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'news' AND schemaname = 'public';
    `);
    
    indexResult.rows.forEach(idx => {
      console.log(`  ${idx.indexname}`);
    });

    console.log('\n✅ セットアップ完了！');

  } catch (error) {
    console.error('❌ エラー:', error.message);
  } finally {
    await client.end();
    console.log('\n接続をクローズしました。');
  }
}

setupNewsTable();


