import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    ScrollView,
    Platform,
} from 'react-native';
import {
    getChannelViewsByWeek,
    ChannelWeeklySummary,
} from '../services/youtubeAnalytics';

const isWeb = Platform.OS === 'web';

interface YouTubeAnalyticsProps {
    onClose?: () => void;
}

export const YouTubeAnalytics: React.FC<YouTubeAnalyticsProps> = ({ onClose }) => {
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState<number>(4); // デフォルト4週間
    const [summary, setSummary] = useState<ChannelWeeklySummary[]>([]);

    // データを取得
    useEffect(() => {
        fetchData();
    }, [selectedPeriod]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { summary: summaryData } = await getChannelViewsByWeek(selectedPeriod);
            setSummary(summaryData);
        } catch (error) {
            console.error('分析データ取得エラー:', error);
        } finally {
            setLoading(false);
        }
    };

    // 期間選択ボタン
    const periodButtons = [
        { weeks: 1, label: '1週間' },
        { weeks: 2, label: '2週間' },
        { weeks: 4, label: '4週間' },
        { weeks: 8, label: '8週間' },
    ];

    // 日付範囲を計算
    const getDateRange = (weeks: number): string => {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (weeks * 7));

        const formatDate = (date: Date): string => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}/${month}/${day}`;
        };

        return `${formatDate(startDate)}～${formatDate(endDate)}`;
    };

    // 視聴回数をフォーマット
    const formatViews = (views: number): string => {
        if (views >= 10000000) {
            return `${(views / 10000000).toFixed(1)}千万`;
        } else if (views >= 10000) {
            return `${(views / 10000).toFixed(1)}万`;
        }
        return views.toLocaleString();
    };

    return (
        <View style={styles.container}>
            {/* ヘッダー */}
            <View style={styles.header}>
                <Text style={styles.title}>📊 チャンネル別視聴回数分析</Text>
                {onClose && (
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Text style={styles.closeButtonText}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* 期間選択と日付範囲 */}
            <View style={styles.periodSelector}>
                <View style={styles.periodRow}>
                    <Text style={styles.periodLabel}>期間：</Text>
                    <Text style={styles.dateRange}>{getDateRange(selectedPeriod)}</Text>
                </View>
                <View style={styles.periodButtons}>
                    {periodButtons.map((period) => (
                        <TouchableOpacity
                            key={period.weeks}
                            style={[
                                styles.periodButton,
                                selectedPeriod === period.weeks && styles.periodButtonActive,
                            ]}
                            onPress={() => setSelectedPeriod(period.weeks)}
                        >
                            <Text
                                style={[
                                    styles.periodButtonText,
                                    selectedPeriod === period.weeks && styles.periodButtonTextActive,
                                ]}
                            >
                                {period.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#e74c3c" />
                    <Text style={styles.loadingText}>分析データを読み込み中...</Text>
                </View>
            ) : summary.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyIcon}>📭</Text>
                    <Text style={styles.emptyText}>データがありません</Text>
                </View>
            ) : (
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* チャンネル一覧 */}
                    <View style={styles.listContainer}>
                        <Text style={styles.listTitle}>チャンネル詳細</Text>
                        {summary.map((item, index) => (
                            <View key={item.channel} style={styles.channelItem}>
                                <View style={styles.channelRank}>
                                    <Text style={styles.rankNumber}>{index + 1}</Text>
                                </View>
                                <View style={styles.channelInfo}>
                                    <Text style={styles.channelName}>{item.channel}</Text>
                                    <View style={styles.channelStats}>
                                        <Text style={styles.statText}>
                                            📊 {formatViews(item.totalViews)}回
                                        </Text>
                                        <Text style={styles.statText}>
                                            🎬 {item.videoCount}本
                                        </Text>
                                        <Text style={styles.statText}>
                                            📈 平均{formatViews(item.averageViews)}回
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 8,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    closeButton: {
        padding: 8,
    },
    closeButtonText: {
        fontSize: 20,
        color: '#666',
    },
    periodSelector: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    periodRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    periodLabel: {
        fontSize: 14,
        color: '#666',
        marginRight: 8,
    },
    dateRange: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    periodButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    periodButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: '#f5f5f5',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    periodButtonActive: {
        backgroundColor: '#e74c3c',
        borderColor: '#e74c3c',
    },
    periodButtonText: {
        fontSize: 13,
        color: '#666',
        fontWeight: '500',
    },
    periodButtonTextActive: {
        color: '#fff',
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 12,
        color: '#888',
        fontSize: 14,
    },
    emptyContainer: {
        padding: 60,
        alignItems: 'center',
    },
    emptyIcon: {
        fontSize: 60,
        marginBottom: 16,
    },
    emptyText: {
        color: '#888',
        fontSize: 16,
    },
    content: {
        maxHeight: 600,
    },
    listContainer: {
        padding: 16,
    },
    listTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    channelItem: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        marginBottom: 8,
    },
    channelRank: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#e74c3c',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    rankNumber: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    channelInfo: {
        flex: 1,
    },
    channelName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 6,
    },
    channelStats: {
        flexDirection: 'row',
        gap: 12,
        flexWrap: 'wrap',
    },
    statText: {
        fontSize: 12,
        color: '#666',
    },
});
