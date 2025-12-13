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
    getFutureEventsByPrefecture,
    getEventPeriodStart,
    PrefectureEventSummary,
} from '../services/eventAnalytics';
import { NewsItem } from '../types/news';

const isWeb = Platform.OS === 'web';

interface EventAnalyticsProps {
    onClose?: () => void;
}

export const EventAnalytics: React.FC<EventAnalyticsProps> = ({ onClose }) => {
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<PrefectureEventSummary[]>([]);
    const [expandedPrefectures, setExpandedPrefectures] = useState<Set<string>>(new Set());

    // データを取得
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const summaryData = await getFutureEventsByPrefecture();
            setSummary(summaryData);

            // デフォルトで上位3県を展開
            if (summaryData.length > 0) {
                const topThree = new Set(summaryData.slice(0, 3).map(s => s.prefecture));
                setExpandedPrefectures(topThree);
            }
        } catch (error) {
            console.error('イベント分析データ取得エラー:', error);
        } finally {
            setLoading(false);
        }
    };

    // 県の展開/折りたたみ
    const togglePrefecture = (prefecture: string) => {
        const newExpanded = new Set(expandedPrefectures);
        if (newExpanded.has(prefecture)) {
            newExpanded.delete(prefecture);
        } else {
            newExpanded.add(prefecture);
        }
        setExpandedPrefectures(newExpanded);
    };

    // イベント日時をフォーマット
    const formatEventDate = (dateString: string): string => {
        const date = new Date(dateString);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${month}/${day}`;
    };

    // イベントタイプを抽出（タイトルから【来店】【取材】を抽出）
    const extractEventType = (title: string): string => {
        const match = title.match(/【(.+?)】/);
        return match ? match[1] : '';
    };

    return (
        <View style={styles.container}>
            {/* ヘッダー */}
            <View style={styles.header}>
                <Text style={styles.title}>🎪 県別イベント情報</Text>
                {onClose && (
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Text style={styles.closeButtonText}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* 期間表示 */}
            <View style={styles.periodInfo}>
                <View style={styles.periodRow}>
                    <Text style={styles.periodLabel}>対象期間：</Text>
                    <Text style={styles.dateRange}>{getEventPeriodStart()}～</Text>
                </View>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#e74c3c" />
                    <Text style={styles.loadingText}>イベントデータを読み込み中...</Text>
                </View>
            ) : summary.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyIcon}>📭</Text>
                    <Text style={styles.emptyText}>今後のイベント情報がありません</Text>
                </View>
            ) : (
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* 県別イベント一覧 */}
                    <View style={styles.listContainer}>
                        <Text style={styles.listTitle}>県別イベント一覧</Text>
                        {summary.map((item, index) => {
                            const isExpanded = expandedPrefectures.has(item.prefecture);
                            return (
                                <View key={item.prefecture} style={styles.prefectureItem}>
                                    {/* 県ヘッダー */}
                                    <TouchableOpacity
                                        style={styles.prefectureHeader}
                                        onPress={() => togglePrefecture(item.prefecture)}
                                    >
                                        <View style={styles.prefectureRank}>
                                            <Text style={styles.rankNumber}>{index + 1}</Text>
                                        </View>
                                        <View style={styles.prefectureInfo}>
                                            <Text style={styles.prefectureName}>
                                                {item.prefecture}
                                            </Text>
                                            <Text style={styles.eventCountText}>
                                                🎪 {item.eventCount}件のイベント
                                            </Text>
                                        </View>
                                        <Text style={styles.expandIcon}>
                                            {isExpanded ? '▼' : '▶'}
                                        </Text>
                                    </TouchableOpacity>

                                    {/* イベント詳細（展開時のみ表示） */}
                                    {isExpanded && (
                                        <View style={styles.eventsContainer}>
                                            {item.events.map((event, eventIndex) => (
                                                <View key={event.id} style={styles.eventItem}>
                                                    <View style={styles.eventDate}>
                                                        <Text style={styles.eventDateText}>
                                                            {formatEventDate(event.published_at || '')}
                                                        </Text>
                                                    </View>
                                                    <View style={styles.eventDetails}>
                                                        <Text style={styles.eventTitle} numberOfLines={2}>
                                                            {event.title}
                                                        </Text>
                                                        {event.summary && (
                                                            <Text style={styles.eventSummary} numberOfLines={1}>
                                                                {event.summary}
                                                            </Text>
                                                        )}
                                                    </View>
                                                    {extractEventType(event.title) && (
                                                        <View style={styles.eventTypeBadge}>
                                                            <Text style={styles.eventTypeText}>
                                                                {extractEventType(event.title)}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            );
                        })}
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
    periodInfo: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    periodRow: {
        flexDirection: 'row',
        alignItems: 'center',
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
    prefectureItem: {
        marginBottom: 12,
        borderRadius: 8,
        backgroundColor: '#f9f9f9',
        overflow: 'hidden',
    },
    prefectureHeader: {
        flexDirection: 'row',
        padding: 12,
        alignItems: 'center',
    },
    prefectureRank: {
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
    prefectureInfo: {
        flex: 1,
    },
    prefectureName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    eventCountText: {
        fontSize: 12,
        color: '#666',
    },
    expandIcon: {
        fontSize: 16,
        color: '#666',
        marginLeft: 8,
    },
    eventsContainer: {
        paddingHorizontal: 12,
        paddingBottom: 8,
        backgroundColor: '#fff',
    },
    eventItem: {
        flexDirection: 'row',
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        alignItems: 'flex-start',
    },
    eventDate: {
        width: 50,
        paddingTop: 2,
    },
    eventDateText: {
        fontSize: 12,
        color: '#e74c3c',
        fontWeight: '600',
    },
    eventDetails: {
        flex: 1,
        paddingRight: 8,
    },
    eventTitle: {
        fontSize: 13,
        color: '#333',
        marginBottom: 2,
        fontWeight: '500',
    },
    eventSummary: {
        fontSize: 11,
        color: '#888',
    },
    eventTypeBadge: {
        backgroundColor: '#fff3cd',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#ffc107',
    },
    eventTypeText: {
        fontSize: 10,
        color: '#856404',
        fontWeight: 'bold',
    },
});
