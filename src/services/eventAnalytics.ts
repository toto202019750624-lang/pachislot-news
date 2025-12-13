import { supabase } from './supabase';
import { NewsItem } from '../types/news';

// 都道府県リスト
const PREFECTURES = [
    '北海道',
    '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
    '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
    '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
    '静岡県', '愛知県',
    '三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
    '鳥取県', '島根県', '岡山県', '広島県', '山口県',
    '徳島県', '香川県', '愛媛県', '高知県',
    '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県',
    '沖縄県',
];

// P-WORLD URLのパス部分から県を推測する辞書
const URL_PATH_TO_PREFECTURE: { [key: string]: string } = {
    // 北海道・東北
    'hokkaido': '北海道',
    'aomori': '青森県',
    'iwate': '岩手県',
    'miyagi': '宮城県',
    'akita': '秋田県',
    'yamagata': '山形県',
    'fukushima': '福島県',

    // 関東
    'ibaraki': '茨城県',
    'tochigi': '栃木県',
    'gunma': '群馬県',
    'saitama': '埼玉県',
    'chiba': '千葉県',
    'tokyo': '東京都',
    'kanagawa': '神奈川県',

    // 中部
    'niigata': '新潟県',
    'toyama': '富山県',
    'ishikawa': '石川県',
    'fukui': '福井県',
    'yamanashi': '山梨県',
    'nagano': '長野県',
    'gifu': '岐阜県',
    'shizuoka': '静岡県',
    'aichi': '愛知県',

    // 近畿
    'mie': '三重県',
    'shiga': '滋賀県',
    'kyoto': '京都府',
    'osaka': '大阪府',
    'hyogo': '兵庫県',
    'nara': '奈良県',
    'wakayama': '和歌山県',

    // 中国
    'tottori': '鳥取県',
    'shimane': '島根県',
    'okayama': '岡山県',
    'hiroshima': '広島県',
    'yamaguchi': '山口県',

    // 四国
    'tokushima': '徳島県',
    'kagawa': '香川県',
    'ehime': '愛媛県',
    'kochi': '高知県',

    // 九州・沖縄
    'fukuoka': '福岡県',
    'saga': '佐賀県',
    'nagasaki': '長崎県',
    'kumamoto': '熊本県',
    'oita': '大分県',
    'miyazaki': '宮崎県',
    'kagoshima': '鹿児島県',
    'okinawa': '沖縄県',
};

// 市区町村から県を推測する辞書（主要なもの）
const CITY_TO_PREFECTURE: { [key: string]: string } = {
    // 主要都市のみ（頻出するもの）
    '札幌': '北海道', '仙台': '宮城県', 'さいたま': '埼玉県', '千葉': '千葉県',
    '横浜': '神奈川県', '川崎': '神奈川県', '名古屋': '愛知県', '京都': '京都府',
    '大阪': '大阪府', '堺': '大阪府', '神戸': '兵庫県', '広島': '広島県',
    '福岡': '福岡県', '北九州': '福岡県',
    // よく使われる市区町村名
    '大東': '大阪府', '布施': '大阪府', '鶴瀬': '埼玉県', '葛西': '東京都',
    '上野': '東京都', '平間': '神奈川県', '海老名': '神奈川県', '港南': '神奈川県',
    '浦安': '千葉県', '新鎌ヶ谷': '千葉県', '草加': '埼玉県', 'おゆみ野': '千葉県',
    '上社': '愛知県', '七宝': '愛知県', '大府': '愛知県',
    '沼津': '静岡県', '那須塩原': '栃木県',
};

// 県別イベントサマリー
export interface PrefectureEventSummary {
    prefecture: string;
    eventCount: number;
    events: NewsItem[];
}

// URLから県名を抽出（P-WORLD URL専用）
function extractPrefectureFromUrl(url: string): string | null {
    if (!url || !url.includes('p-world.co.jp')) return null;

    try {
        // URLのパス部分を抽出
        // 例: https://www.p-world.co.jp/osaka/xxx.htm → osaka
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(p => p);

        if (pathParts.length > 0) {
            const firstPart = pathParts[0].toLowerCase();

            // URL_PATH_TO_PREFECTUREで県を検索
            if (URL_PATH_TO_PREFECTURE[firstPart]) {
                return URL_PATH_TO_PREFECTURE[firstPart];
            }
        }
    } catch (error) {
        // URL解析エラーは無視
    }

    return null;
}

// summaryまたはtitleから県名を抽出
function extractPrefectureFromText(text: string): string | null {
    if (!text) return null;

    // 1. 都道府県名を直接マッチング
    for (const prefecture of PREFECTURES) {
        if (text.includes(prefecture)) {
            return prefecture;
        }
    }

    // 2. 市区町村名から推測
    for (const [cityPart, prefecture] of Object.entries(CITY_TO_PREFECTURE)) {
        if (text.includes(cityPart)) {
            return prefecture;
        }
    }

    return null;
}

// イベントから県名を抽出（複数の方法を試す）
function extractPrefecture(item: NewsItem): string | null {
    // 優先度1: URLから抽出（最も確実）
    let prefecture = extractPrefectureFromUrl(item.url);
    if (prefecture) {
        return prefecture;
    }

    // 優先度2: summaryから抽出
    prefecture = extractPrefectureFromText(item.summary || '');
    if (prefecture) {
        return prefecture;
    }

    // 優先度3: titleから抽出
    prefecture = extractPrefectureFromText(item.title || '');
    if (prefecture) {
        return prefecture;
    }

    return null;
}

// 未来のイベントを県別に集計
export async function getFutureEventsByPrefecture(): Promise<PrefectureEventSummary[]> {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 未来のイベントを取得
        const { data, error } = await supabase
            .from('news')
            .select('*')
            .eq('category', 'event')
            .gte('published_at', today.toISOString())
            .order('published_at', { ascending: true });

        if (error) {
            console.error('イベントデータ取得エラー:', error);
            return [];
        }

        if (!data || data.length === 0) {
            return [];
        }

        // 県別にグループ化
        const prefectureMap: { [prefecture: string]: NewsItem[] } = {};
        let unclassifiedCount = 0;
        let urlExtracted = 0;
        let textExtracted = 0;

        data.forEach((item) => {
            const prefecture = extractPrefecture(item);

            if (prefecture) {
                // 統計用
                if (item.url && item.url.includes('p-world.co.jp')) {
                    const urlPref = extractPrefectureFromUrl(item.url);
                    if (urlPref === prefecture) {
                        urlExtracted++;
                    } else {
                        textExtracted++;
                    }
                } else {
                    textExtracted++;
                }

                if (!prefectureMap[prefecture]) {
                    prefectureMap[prefecture] = [];
                }
                prefectureMap[prefecture].push(item);
            } else {
                // デバッグ用：「その他」に分類されるデータをコンソールに出力
                unclassifiedCount++;
                if (unclassifiedCount <= 3) {
                    console.log('【県名抽出失敗】', {
                        title: item.title?.substring(0, 50),
                        summary: item.summary?.substring(0, 50),
                        url: item.url,
                    });
                }

                if (!prefectureMap['その他']) {
                    prefectureMap['その他'] = [];
                }
                prefectureMap['その他'].push(item);
            }
        });

        console.log(`📊 県名抽出統計: URLから${urlExtracted}件, テキストから${textExtracted}件, その他${unclassifiedCount}件`);

        // 配列に変換してイベント件数でソート
        const summary: PrefectureEventSummary[] = Object.entries(prefectureMap).map(
            ([prefecture, events]) => ({
                prefecture,
                eventCount: events.length,
                events,
            })
        ).sort((a, b) => b.eventCount - a.eventCount);

        return summary;
    } catch (error) {
        console.error('県別イベントデータ取得エラー:', error);
        return [];
    }
}

// 集計対象期間の開始日を取得
export function getEventPeriodStart(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
}
