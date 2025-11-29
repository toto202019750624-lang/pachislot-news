import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  StatusBar,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { NewsCard, CategoryTabs, SearchBar, TopicsSection } from './src/components';
import { getNews, searchNews } from './src/services/supabase';
import { NewsItem, CategoryId } from './src/types/news';

export default function App() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
  const [isSearching, setIsSearching] = useState(false);

  // ニュースを取得
  const fetchNews = useCallback(async (category?: CategoryId) => {
    try {
      const data = await getNews(category);
      setNews(data);
    } catch (error) {
      console.error('ニュース取得エラー:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // 初回読み込み
  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  // カテゴリ変更時
  const handleCategoryChange = (category: CategoryId) => {
    setSelectedCategory(category);
    setLoading(true);
    setIsSearching(false);
    fetchNews(category);
  };

  // プルダウン更新
  const handleRefresh = () => {
    setRefreshing(true);
    fetchNews(selectedCategory);
  };

  // 検索
  const handleSearch = async (keyword: string) => {
    setLoading(true);
    setIsSearching(true);
    try {
      const data = await searchNews(keyword);
      setNews(data);
    } catch (error) {
      console.error('検索エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  // 検索クリア
  const handleClearSearch = () => {
    setIsSearching(false);
    fetchNews(selectedCategory);
  };

  // カテゴリ別にニュースを分類
  const newMachineNews = news.filter(n => n.category === 'new_machine');
  const industryNews = news.filter(n => n.category === 'industry');
  const regulationNews = news.filter(n => n.category === 'regulation');
  const makerNews = news.filter(n => n.category === 'maker');

  // トップニュース（最新1件）
  const topNews = news[0];
  // その他のニュース
  const otherNews = news.slice(1, 6);

  // 現在時刻
  const now = new Date();
  const timeString = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

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
        <SearchBar onSearch={handleSearch} onClear={handleClearSearch} />
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
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#e74c3c"
              colors={['#e74c3c']}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {news.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>
                {isSearching ? '検索結果がありません' : 'ニュースがありません'}
              </Text>
            </View>
          ) : (
            <>
              {/* トップニュース */}
              {topNews && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionIcon}>🔥</Text>
                    <Text style={styles.sectionTitle}>トップニュース</Text>
                  </View>
                  <NewsCard item={topNews} isTopNews />
                </View>
              )}

              {/* 最新ニュース一覧 */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionIcon}>📰</Text>
                  <Text style={styles.sectionTitle}>最新ニュース</Text>
                </View>
                <View style={styles.newsList}>
                  {otherNews.map((item) => (
                    <NewsCard key={item.id} item={item} />
                  ))}
                </View>
              </View>

              {/* カテゴリ別セクション */}
              {selectedCategory === 'all' && (
                <>
                  <TopicsSection 
                    title="新台情報" 
                    icon="🎰" 
                    news={newMachineNews}
                    color="#e74c3c"
                  />
                  <TopicsSection 
                    title="業界動向" 
                    icon="🏢" 
                    news={industryNews}
                    color="#3498db"
                  />
                  <TopicsSection 
                    title="規制・法令" 
                    icon="📋" 
                    news={regulationNews}
                    color="#27ae60"
                  />
                  <TopicsSection 
                    title="メーカー情報" 
                    icon="🏭" 
                    news={makerNews}
                    color="#9b59b6"
                  />
                </>
              )}

              {/* フッター */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>© 2024 パチスロニュース</Text>
              </View>
            </>
          )}
        </ScrollView>
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
  scrollView: {
    flex: 1,
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
  section: {
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  newsList: {
    backgroundColor: '#fff',
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
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});
