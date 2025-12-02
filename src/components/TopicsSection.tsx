import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { NewsItem } from '../types/news';

interface TopicsSectionProps {
  title: string;
  icon: string;
  news: NewsItem[];
  color?: string;
}

export const TopicsSection: React.FC<TopicsSectionProps> = ({ 
  title, 
  icon, 
  news,
  color = '#e74c3c'
}) => {
  if (news.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={[styles.title, { color }]}>{title}</Text>
        <TouchableOpacity style={styles.moreButton}>
          <Text style={styles.moreText}>もっと見る ›</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        {news.slice(0, 5).map((item, index) => (
          <TouchableOpacity
            key={item.id}
            style={styles.item}
            onPress={() => Linking.openURL(item.url)}
            activeOpacity={0.7}
          >
            <Text style={styles.itemNumber}>{index + 1}</Text>
            <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginTop: 8,
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  icon: {
    fontSize: 18,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  moreButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  moreText: {
    fontSize: 12,
    color: '#666',
  },
  content: {},
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  itemNumber: {
    width: 24,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#e74c3c',
  },
  itemTitle: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
});


