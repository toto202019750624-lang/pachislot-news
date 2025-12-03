import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  useWindowDimensions,
} from 'react-native';
import { NewsCard, CategoryTabs, SearchBar, AnimatedLogo } from './src/components';
import { getNews, searchNews, getLastUpdatedTime } from './src/services/supabase';
import { NewsItem, CategoryId } from './src/types/news';

const PAGE_SIZE = 30;

// Web用の最大幅
const MAX_CONTENT_WIDTH = 680;
const isWeb = Platform.OS === 'web';

export default function App() {
  const listRef = useRef<FlatList<NewsItem> | null>(null);
  const scrollOffsetRef = useRef(0);
  
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
  const [isSearching, setIsSearching] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // ニュースを取得
  const fetchNews = useCallback(async (category?: CategoryId, reset: boolean = true) => {
    try {
      const offset = reset ? 0 : news.length;
      const result = await getNews(category, undefined, PAGE_SIZE, offset);
      
      if (reset) {
        setNews(result.data);
      } else {
        setNews(prev => [...prev, ...result.data]);

        // 追加時にスクロール位置を維持
        requestAnimationFrame(() => {
          if (listRef.current) {
            listRef.current.scrollToOffset({
              offset: scrollOffsetRef.current,
              animated: false,
            });
          }
        });
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

  // 最終更新日時を取得
  const fetchLastUpdated = useCallback(async () => {
    const time = await getLastUpdatedTime();
    setLastUpdated(time);
  }, []);

  // 初回読み込み
  useEffect(() => {
    fetchNews();
    fetchLastUpdated();
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
    fetchLastUpdated();
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

  // 最終更新日時をフォーマット
  const formatLastUpdated = (dateString: string | null) => {
    if (!dateString) return '---';
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}/${day} ${hours}:${minutes}`;
  };

  const timeString = formatLastUpdated(lastUpdated);

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
  // フッターコンポーネント（ローディング表示 & さらに読み込むボタン）
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
    
    return (
      <View style={styles.footer}>
        <TouchableOpacity style={styles.loadMoreButton} onPress={handleLoadMore}>
          <Text style={styles.loadMoreButtonText}>さらに読み込む</Text>
        </TouchableOpacity>
      </View>
    );
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

  // Web用のコンテンツラッパー
  const ContentWrapper = ({ children }: { children: React.ReactNode }) => {
    if (isWeb) {
      return (
        <View style={styles.webWrapper}>
          <View style={styles.webContent}>
            {children}
          </View>
        </View>
      );
    }
    return <>{children}</>;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      
      {/* ヘッダー */}
      <View style={styles.header}>
        <View style={[styles.headerInner, isWeb && styles.webHeaderInner]}>
          <View style={styles.headerTop}>
            <AnimatedLogo />
            <Text style={styles.headerTime}>{timeString} 更新</Text>
          </View>
          <SearchBar onSearch={(kw) => handleSearch(kw, true)} onClear={handleClearSearch} />
        </View>
      </View>

      {/* カテゴリタブ */}
      <View style={[isWeb && styles.webCategoryWrapper]}>
        <View style={[isWeb && styles.webCategoryInner]}>
          <CategoryTabs
            selectedCategory={selectedCategory}
            onSelectCategory={handleCategoryChange}
          />
        </View>
      </View>

      {/* コンテンツ */}
      <ContentWrapper>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#e74c3c" />
            <Text style={styles.loadingText}>読み込み中...</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={news}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
            ListHeaderComponent={ListHeader}
            ListFooterComponent={ListFooter}
            ListEmptyComponent={EmptyComponent}
            onScroll={(e) => {
              // 現在のスクロール位置を保存
              scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
            refreshControl={
              // Web版ではプルダウン更新を無効化して、
              // 意図しない再読み込みによるスクロールリセットを防ぐ
              isWeb
                ? undefined
                : (
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    tintColor="#e74c3c"
                    colors={['#e74c3c']}
                  />
                )
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={news.length === 0 ? styles.emptyList : undefined}
          />
        )}
      </ContentWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  // Web用のラッパー
  webWrapper: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#e8e8e8',
  },
  webContent: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    backgroundColor: '#f0f0f0',
    ...(isWeb ? { boxShadow: '0 0 20px rgba(0,0,0,0.1)' } : {}),
  },
  webHeaderInner: {
    maxWidth: MAX_CONTENT_WIDTH,
    width: '100%',
    alignSelf: 'center',
  },
  webCategoryWrapper: {
    backgroundColor: '#fff',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  webCategoryInner: {
    maxWidth: MAX_CONTENT_WIDTH,
    width: '100%',
  },
  header: {
    backgroundColor: '#1a1a2e',
    paddingTop: Platform.OS === 'ios' ? 50 : Platform.OS === 'web' ? 16 : 30,
  },
  headerInner: {
    width: '100%',
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
  loadMoreButton: {
    marginTop: 4,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#e74c3c',
  },
  loadMoreButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
