import { supabase } from './supabase';

// 週単位の集計データ型
export interface WeeklyChannelData {
    channel: string;
    weekStart: string;
    totalViews: number;
    videoCount: number;
}

export interface ChannelWeeklySummary {
    channel: string;
    totalViews: number;
    videoCount: number;
    averageViews: number;
}

// 週の開始日を取得（月曜日）
function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 月曜日を週の開始とする
    return new Date(d.setDate(diff));
}

// 週の開始日を文字列フォーマットで取得
function formatWeekStart(date: Date): string {
    const weekStart = getWeekStart(date);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart.toISOString();
}

// N週間前の日付を取得
function getWeeksAgo(weeks: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - (weeks * 7));
    return date;
}

// チャンネル別の週次視聴回数を取得
export async function getChannelViewsByWeek(
    weeks: number = 4
): Promise<{ byWeek: WeeklyChannelData[]; summary: ChannelWeeklySummary[] }> {
    try {
        const startDate = getWeeksAgo(weeks);

        // YouTubeカテゴリの動画を取得
        const { data, error } = await supabase
            .from('news')
            .select('source, published_at, view_count')
            .eq('category', 'youtube')
            .gte('published_at', startDate.toISOString())
            .not('view_count', 'is', null)
            .order('published_at', { ascending: false });

        if (error) {
            console.error('YouTube分析データ取得エラー:', error);
            return { byWeek: [], summary: [] };
        }

        if (!data || data.length === 0) {
            return { byWeek: [], summary: [] };
        }

        // 週ごとにグループ化
        const weeklyData: { [key: string]: WeeklyChannelData } = {};
        const channelSummary: { [channel: string]: { views: number; count: number } } = {};

        data.forEach((item) => {
            if (!item.published_at || !item.view_count) return;

            const publishDate = new Date(item.published_at);
            const weekStart = formatWeekStart(publishDate);
            const key = `${item.source}_${weekStart}`;

            if (!weeklyData[key]) {
                weeklyData[key] = {
                    channel: item.source,
                    weekStart: weekStart,
                    totalViews: 0,
                    videoCount: 0,
                };
            }

            weeklyData[key].totalViews += item.view_count;
            weeklyData[key].videoCount += 1;

            // チャンネル別サマリー
            if (!channelSummary[item.source]) {
                channelSummary[item.source] = { views: 0, count: 0 };
            }
            channelSummary[item.source].views += item.view_count;
            channelSummary[item.source].count += 1;
        });

        // 配列に変換してソート
        const byWeek = Object.values(weeklyData).sort((a, b) =>
            b.weekStart.localeCompare(a.weekStart)
        );

        const summary: ChannelWeeklySummary[] = Object.entries(channelSummary).map(
            ([channel, stats]) => ({
                channel,
                totalViews: stats.views,
                videoCount: stats.count,
                averageViews: Math.round(stats.views / stats.count),
            })
        ).sort((a, b) => b.totalViews - a.totalViews);

        return { byWeek, summary };
    } catch (error) {
        console.error('YouTube分析データ取得エラー:', error);
        return { byWeek: [], summary: [] };
    }
}

// 週次トレンドデータを取得（折れ線グラフ用）
export async function getWeeklyTrends(weeks: number = 4): Promise<{
    labels: string[];
    datasets: { data: number[]; label: string }[];
}> {
    try {
        const { byWeek } = await getChannelViewsByWeek(weeks);

        if (byWeek.length === 0) {
            return { labels: [], datasets: [] };
        }

        // 週のラベルを生成
        const weekLabels = new Set<string>();
        byWeek.forEach((item) => {
            const date = new Date(item.weekStart);
            const label = `${date.getMonth() + 1}/${date.getDate()}`;
            weekLabels.add(label);
        });

        const labels = Array.from(weekLabels).reverse();

        // チャンネルごとのデータセットを生成
        const channelData: { [channel: string]: number[] } = {};

        byWeek.forEach((item) => {
            const date = new Date(item.weekStart);
            const label = `${date.getMonth() + 1}/${date.getDate()}`;
            const index = labels.indexOf(label);

            if (!channelData[item.channel]) {
                channelData[item.channel] = new Array(labels.length).fill(0);
            }

            if (index !== -1) {
                channelData[item.channel][index] = item.totalViews;
            }
        });

        const datasets = Object.entries(channelData).map(([channel, data]) => ({
            data,
            label: channel,
        }));

        return { labels, datasets };
    } catch (error) {
        console.error('週次トレンドデータ取得エラー:', error);
        return { labels: [], datasets: [] };
    }
}
