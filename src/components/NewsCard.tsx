import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Image } from 'react-native';
import { NewsItem, NEWS_SOURCES } from '../types/news';

interface NewsCardProps {
  item: NewsItem;
  isTopNews?: boolean;
}

export const NewsCard: React.FC<NewsCardProps> = ({ item, isTopNews = false }) => {
  const sourceInfo = NEWS_SOURCES.find(s => s.id === item.source);
  
  const handlePress = () => {
    Linking.openURL(item.url);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 60) return `${diffMins}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    return date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
  };

  // トップニュース用の大きいカード
  if (isTopNews) {
    return (
      <TouchableOpacity 
        style={styles.topCard} 
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.topImagePlaceholder}>
          <Text style={styles.topImageIcon}>🎰</Text>
        </View>
        <View style={styles.topContent}>
          <Text style={styles.topTitle} numberOfLines={2}>{item.title}</Text>
          <View style={styles.topMeta}>
            <Text style={styles.topSource}>{sourceInfo?.name || item.source}</Text>
            <Text style={styles.topDate}>{formatDate(item.fetched_at)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // 通常のニュースカード（Yahoo風リスト）
  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <View style={styles.meta}>
          <Text style={styles.source}>{sourceInfo?.name || item.source}</Text>
          <Text style={styles.separator}>•</Text>
          <Text style={styles.date}>{formatDate(item.fetched_at)}</Text>
        </View>
      </View>
      <View style={styles.thumbnail}>
        <Text style={styles.thumbnailIcon}>📰</Text>
      </View>
    </TouchableOpacity>
  );
};

// コンパクトなニュースアイテム
export const NewsItemCompact: React.FC<{ item: NewsItem; index: number }> = ({ item, index }) => {
  const handlePress = () => {
    Linking.openURL(item.url);
  };

  return (
    <TouchableOpacity 
      style={styles.compactCard} 
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text style={styles.compactNumber}>{index + 1}</Text>
      <Text style={styles.compactTitle} numberOfLines={1}>{item.title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // トップニュースカード
  topCard: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  topImagePlaceholder: {
    height: 180,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topImageIcon: {
    fontSize: 60,
  },
  topContent: {
    padding: 12,
  },
  topTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1a1a1a',
    lineHeight: 24,
    marginBottom: 8,
  },
  topMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topSource: {
    fontSize: 12,
    color: '#e74c3c',
    fontWeight: '600',
  },
  topDate: {
    fontSize: 12,
    color: '#888',
    marginLeft: 8,
  },

  // 通常のニュースカード
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cardContent: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 15,
    color: '#1a1a1a',
    lineHeight: 22,
    fontWeight: '500',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  source: {
    fontSize: 11,
    color: '#e74c3c',
    fontWeight: '600',
  },
  separator: {
    fontSize: 11,
    color: '#ccc',
    marginHorizontal: 6,
  },
  date: {
    fontSize: 11,
    color: '#888',
  },
  thumbnail: {
    width: 80,
    height: 60,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailIcon: {
    fontSize: 24,
  },

  // コンパクトカード
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  compactNumber: {
    width: 24,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#e74c3c',
  },
  compactTitle: {
    flex: 1,
    fontSize: 14,
    color: '#1a1a1a',
  },
});
