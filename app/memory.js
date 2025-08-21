import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { MemoryService } from '../lib/memoryService';

export default function MemoryScreen() {
  const [conversations, setConversations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [preferences, setPreferences] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const router = useRouter();

  useEffect(() => {
    loadMemoryData();
  }, []);

  const loadMemoryData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Load conversations
        const conversationsData = await MemoryService.loadConversations(user.id, 50);
        setConversations(conversationsData);

        // Load categories
        const categoriesData = await MemoryService.getCategories(user.id);
        setCategories(categoriesData);

        // Load preferences
        const preferencesData = await MemoryService.loadPreferences(user.id);
        setPreferences(preferencesData);
      }
    } catch (error) {
      console.error('Error loading memory data:', error);
      Alert.alert('Error', 'Failed to load memory data');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteConversation = async (conversationId) => {
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await MemoryService.deleteConversation(conversationId);
              await loadMemoryData(); // Reload data
              Alert.alert('Success', 'Conversation deleted successfully');
            } catch (error) {
              console.error('Error deleting conversation:', error);
              Alert.alert('Error', 'Failed to delete conversation');
            }
          }
        }
      ]
    );
  };

  const searchConversations = async () => {
    if (!searchTerm.trim()) {
      await loadMemoryData();
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const searchResults = await MemoryService.searchConversations(
          user.id,
          searchTerm,
          selectedCategory
        );
        setConversations(searchResults);
      }
    } catch (error) {
      console.error('Error searching conversations:', error);
      Alert.alert('Error', 'Failed to search conversations');
    }
  };

  const renderConversation = ({ item }) => (
    <View style={styles.conversationItem}>
      <View style={styles.conversationHeader}>
        <View style={styles.conversationInfo}>
          <Text style={styles.conversationDate}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
          {item.topic && (
            <Text style={styles.conversationTopic}>Topic: {item.topic}</Text>
          )}
          {item.memory_categories && (
            <View style={[styles.categoryTag, { backgroundColor: item.memory_categories.color + '20' }]}>
              <Text style={[styles.categoryText, { color: item.memory_categories.color }]}>
                {item.memory_categories.name}
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteConversation(item.id)}
        >
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
      {item.summary && (
        <Text style={styles.conversationSummary} numberOfLines={2}>
          {item.summary}
        </Text>
      )}
      <Text style={styles.messageCount}>
        {item.messages ? item.messages.length : 0} messages
      </Text>
    </View>
  );

  const renderCategory = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        selectedCategory === item.id && styles.selectedCategory
      ]}
      onPress={() => setSelectedCategory(selectedCategory === item.id ? null : item.id)}
    >
      <View style={[styles.categoryColor, { backgroundColor: item.color }]} />
      <Text style={styles.categoryName}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderPreference = ({ item }) => (
    <View style={styles.preferenceItem}>
      <Text style={styles.preferenceCategory}>{item.category}</Text>
      <Text style={styles.preferenceKey}>{item.key}</Text>
      <Text style={styles.preferenceValue}>
        {typeof item.value === 'object' ? JSON.stringify(item.value) : item.value}
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your memories...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#10B981" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Memory Management</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          onSubmitEditing={searchConversations}
        />
        <TouchableOpacity style={styles.searchButton} onPress={searchConversations}>
          <Ionicons name="search" size={20} color="#10B981" />
        </TouchableOpacity>
      </View>

      {/* Categories Filter */}
      <View style={styles.categoriesContainer}>
        <Text style={styles.sectionTitle}>Filter by Category</Text>
        <FlatList
          data={categories}
          renderItem={renderCategory}
          keyExtractor={item => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesList}
        />
      </View>

      {/* Conversations */}
      <View style={styles.conversationsContainer}>
        <Text style={styles.sectionTitle}>
          Conversations ({conversations.length})
        </Text>
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          style={styles.conversationsList}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  searchButton: {
    width: 40,
    height: 40,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  categoriesList: {
    flexGrow: 0,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedCategory: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
  },
  categoryColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  categoryName: {
    fontSize: 14,
    color: '#374151',
  },
  conversationsContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  conversationsList: {
    flex: 1,
  },
  conversationItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  conversationTopic: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  categoryTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 8,
  },
  conversationSummary: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  messageCount: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  preferenceItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  preferenceCategory: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  preferenceKey: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  preferenceValue: {
    fontSize: 14,
    color: '#374151',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
});
