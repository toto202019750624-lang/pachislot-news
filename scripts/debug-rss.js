/**
 * RSSフィードの構造を確認
 */

const Parser = require('rss-parser');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const parser = new Parser();

const feeds = [
  'https://pachinkopachisro.com/index.rdf',
  'http://blog.livedoor.jp/fiveslot777/index.rdf',
  'https://pachinkolist.com/index.rdf',
];

async function debugRss() {
  for (const url of feeds) {
    console.log('='.repeat(60));
    console.log('URL:', url);
    console.log('='.repeat(60));
    
    try {
      const feed = await parser.parseURL(url);
      console.log('フィードタイトル:', feed.title);
      console.log('アイテム数:', feed.items.length);
      
      if (feed.items.length > 0) {
        const item = feed.items[0];
        console.log('\n最初のアイテム:');
        console.log('  title:', item.title);
        console.log('  link:', item.link);
        console.log('  pubDate:', item.pubDate);
        console.log('  isoDate:', item.isoDate);
        console.log('  dc:date:', item['dc:date']);
        console.log('  published:', item.published);
        console.log('  全キー:', Object.keys(item).join(', '));
      }
    } catch (error) {
      console.log('エラー:', error.message);
    }
    console.log('');
  }
}

debugRss();



