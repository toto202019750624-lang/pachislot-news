import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  RefreshControl,
  StatusBar,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { NewsCard, CategoryTabs, SearchBar } from './src/components';
import { getNews, searchNews } from './src/services/supabase';
import { NewsItem, CategoryId } from './src/types/news';

const PAGE_SIZE = 30;

export default function App() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
  const [isSearching, setIsSearching] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  // ニュースを取得
  const fetchNews = useCallback(async (category?: CategoryId, reset: boolean = true) => {
    try {
      const offset = reset ? 0 : news.length;
      const result = await getNews(category, undefined, PAGE_SIZE, offset);
      
      if (reset) {
        setNews(result.data);
      } else {
        setNews(prev => [...prev, ...result.data]);
      }
      setHasMore(result.hasMore);
      setTotalCount(prev => reset ? result.data.length : prev + result.data.length);
    } catch (error) {
      console.error('ニュース取得エラー:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [news.length]);

  // 初回読み込み
  useEffect(() => {
    fetchNews();
  }, []);

  // カテゴリ変更時
  const handleCategoryChange = (category: CategoryId) => {
    setSelectedCategory(category);
    setLoading(true);
    setIsSearching(false);
    setSearchKeyword('');
    setNews([]);
    fetchNews(category, true);
  };

  // プルダウン更新
  const handleRefresh = () => {
    setRefreshing(true);
    if (isSearching && searchKeyword) {
      handleSearch(searchKeyword, true);
    } else {
      fetchNews(selectedCategory, true);
    }
  };

  // 追加読み込み
  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    if (isSearching && searchKeyword) {
      handleSearch(searchKeyword, false);
    } else {
      fetchNews(selectedCategory, false);
    }
  };

  // 検索
  const handleSearch = async (keyword: string, reset: boolean = true) => {
    if (!keyword.trim()) return;
    
    if (reset) {
      setLoading(true);
      setNews([]);
    }
    setIsSearching(true);
    setSearchKeyword(keyword);
    
    try {
      const offset = reset ? 0 : news.length;
      const result = await searchNews(keyword, PAGE_SIZE, offset);
      
      if (reset) {
        setNews(result.data);
      } else {
        setNews(prev => [...prev, ...result.data]);
      }
      setHasMore(result.hasMore);
    } catch (error) {
      console.error('検索エラー:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // 検索クリア
  const handleClearSearch = () => {
    setIsSearching(false);
    setSearchKeyword('');
    setNews([]);
    setLoading(true);
    fetchNews(selectedCategory, true);
  };

  // 現在時刻
  const now = new Date();
  const timeString = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

  // ヘッダーコンポーネント
  const ListHeader = () => (
    <View style={styles.listHeader}>
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {isSearching ? `「${searchKeyword}」の検索結果` : '最新ニュース'}
        </Text>
        <Text style={styles.statsCount}>{news.length}件表示</Text>
      </View>
    </View>
  );

  // フッターコンポーネント（ローディング表示）
  const ListFooter = () => {
    if (!hasMore) {
      return (
        <View style={styles.footer}>
          <Text style={styles.footerText}>すべてのニュースを表示しました</Text>
          <Text style={styles.footerSubText}>© 2024 パチスロニュース</Text>
        </View>
      );
    }
    
    if (loadingMore) {
      return (
        <View style={styles.loadingMore}>
          <ActivityIndicator size="small" color="#e74c3c" />
          <Text style={styles.loadingMoreText}>読み込み中...</Text>
        </View>
      );
    }
    
    return null;
  };

  // 空の状態
  const EmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📭</Text>
      <Text style={styles.emptyText}>
        {isSearching ? '検索結果がありません' : 'ニュースがありません'}
      </Text>
    </View>
  );

  // ニュースアイテムのレンダリング
  const renderItem = ({ item, index }: { item: NewsItem; index: number }) => (
    <NewsCard item={item} isTopNews={index === 0 && !isSearching} />
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#e74c3c" />
      
      {/* ヘッダー */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>🎰</Text>
            <Text style={styles.logoText}>パチスロニュース</Text>
          </View>
          <Text style={styles.headerTime}>{timeString} 更新</Text>
        </View>
        <SearchBar onSearch={(kw) => handleSearch(kw, true)} onClear={handleClearSearch} />
      </View>

      {/* カテゴリタブ */}
      <CategoryTabs
        selectedCategory={selectedCategory}
        onSelectCategory={handleCategoryChange}
      />

      {/* コンテンツ */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#e74c3c" />
          <Text style={styles.loadingText}>読み込み中...</Text>
        </View>
      ) : (
        <FlatList
          data={news}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={ListFooter}
          ListEmptyComponent={EmptyComponent}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#e74c3c"
              colors={['#e74c3c']}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={news.length === 0 ? styles.emptyList : undefined}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  header: {
    backgroundColor: '#e74c3c',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerTime: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    color: '#888',
    marginTop: 12,
    fontSize: 14,
  },
  listHeader: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statsText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  statsCount: {
    fontSize: 12,
    color: '#888',
  },
  loadingMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff',
  },
  loadingMoreText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#888',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    backgroundColor: '#fff',
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
  },
  emptyList: {
    flexGrow: 1,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  footerText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  footerSubText: {
    fontSize: 12,
    color: '#999',
  },
});
