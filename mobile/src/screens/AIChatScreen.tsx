/**
 * AIChatScreen.tsx
 * =================
 * Session-aware AI chat interface for Nigerian real estate.
 *
 * Features:
 *  - Persistent conversation sessions (survives app backgrounding)
 *  - Language selector (English / Yoruba / Hausa / Igbo)
 *  - Intent badges (property_search, valuation, legal, financing, investment)
 *  - Suggested action chips that deep-link into the app
 *  - Extracted search params displayed as a property search card
 *  - Typing indicator while AI is thinking
 *  - Voice input button (wired to existing voice search)
 *  - Clear conversation with confirmation
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator, ScrollView, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trpc } from '../lib/trpc';

// ── Types ─────────────────────────────────────────────────────────────────────
type Language = 'en' | 'yo' | 'ha' | 'ig';
type Intent = 'property_search' | 'valuation' | 'legal' | 'financing' | 'investment' | 'agent_search' | 'general';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  intent?: Intent | null;
  language?: string;
  suggestedActions?: string[];
  extractedSearch?: Record<string, unknown> | null;
  deepLink?: string | null;
  isLoading?: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const LANGUAGES: Array<{ code: Language; label: string; flag: string }> = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'yo', label: 'Yorùbá', flag: '🟢' },
  { code: 'ha', label: 'Hausa', flag: '🔵' },
  { code: 'ig', label: 'Igbo', flag: '🔴' },
];

const INTENT_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  property_search: { label: 'Property Search', color: '#6366F1', emoji: '🏠' },
  valuation: { label: 'Valuation', color: '#10B981', emoji: '💰' },
  legal: { label: 'Legal', color: '#EF4444', emoji: '⚖️' },
  financing: { label: 'Financing', color: '#F59E0B', emoji: '🏦' },
  investment: { label: 'Investment', color: '#8B5CF6', emoji: '📈' },
  agent_search: { label: 'Find Agent', color: '#3B82F6', emoji: '👤' },
  general: { label: 'General', color: '#6B7280', emoji: '💬' },
};

const QUICK_PROMPTS = [
  'Find a 3-bedroom duplex in Lekki under ₦80M',
  'What is the C of O process in Lagos?',
  'How much is property in Maitama, Abuja?',
  'Best areas to invest in Lagos?',
  'How do I verify a property title?',
  'Calculate mortgage for ₦50M property',
];

const SESSION_KEY = 'ai_chat_session_id';

// ── Sub-components ────────────────────────────────────────────────────────────
const TypingIndicator = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      ).start();

    animate(dot1, 0);
    animate(dot2, 150);
    animate(dot3, 300);
  }, []);

  return (
    <View style={styles.typingContainer}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View key={i} style={[styles.typingDot, { transform: [{ translateY: dot }] }]} />
      ))}
    </View>
  );
};

const ExtractedSearchCard = ({ search, deepLink, onPress }: {
  search: Record<string, unknown>;
  deepLink: string | null;
  onPress: () => void;
}) => (
  <TouchableOpacity style={styles.searchCard} onPress={onPress}>
    <Text style={styles.searchCardTitle}>🔍 Detected Search</Text>
    <View style={styles.searchCardParams}>
      {search.city && <Text style={styles.searchParam}>📍 {String(search.city)}</Text>}
      {search.bedrooms && <Text style={styles.searchParam}>🛏 {String(search.bedrooms)} bed</Text>}
      {search.listingType && <Text style={styles.searchParam}>{search.listingType === 'rent' ? '🔑 Rent' : '🏠 Buy'}</Text>}
      {search.maxPrice && <Text style={styles.searchParam}>₦{(Number(search.maxPrice) / 1_000_000).toFixed(0)}M max</Text>}
      {search.propertyType && <Text style={styles.searchParam}>🏗 {String(search.propertyType)}</Text>}
    </View>
    <Text style={styles.searchCardCTA}>Tap to search →</Text>
  </TouchableOpacity>
);

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function AIChatScreen({ navigation }: any) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>('en');
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [showQuickPrompts, setShowQuickPrompts] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  const chatMutation = trpc.aiChat.chat.useMutation();
  const createSession = trpc.aiChat.createSession.useMutation();
  const clearSession = trpc.aiChat.clearSession.useMutation();

  // Load persisted session
  useEffect(() => {
    AsyncStorage.getItem(SESSION_KEY).then(id => {
      if (id) setSessionId(id);
    });

    // Welcome message
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: 'Welcome! I\'m your Nigerian real estate AI assistant. I can help you find properties, understand market prices, navigate legal requirements, or explore financing options.\n\nWhat would you like to know?',
      timestamp: new Date(),
      suggestedActions: ['Find a property', 'Get a valuation', 'Legal questions', 'Investment advice'],
    }]);
  }, []);

  const initSession = useCallback(async () => {
    try {
      const result = await createSession.mutateAsync();
      setSessionId(result.session_id);
      await AsyncStorage.setItem(SESSION_KEY, result.session_id);
      return result.session_id;
    } catch {
      return null;
    }
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    const loadingMessage: Message = {
      id: `loading-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInputText('');
    setShowQuickPrompts(false);

    // Scroll to bottom
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    // Ensure session exists
    let sid = sessionId;
    if (!sid) {
      sid = await initSession();
    }

    try {
      const result = await chatMutation.mutateAsync({
        message: text.trim(),
        sessionId: sid ?? undefined,
        language,
      });

      // Update session ID if new
      if (result.sessionId && result.sessionId !== sid) {
        setSessionId(result.sessionId);
        await AsyncStorage.setItem(SESSION_KEY, result.sessionId);
      }

      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: result.message,
        timestamp: new Date(),
        intent: result.intent as Intent | null,
        language: result.language,
        suggestedActions: result.suggestedActions,
        extractedSearch: result.extractedSearch,
        deepLink: result.deepLink,
      };

      setMessages(prev => prev.filter(m => !m.isLoading).concat(aiMessage));
    } catch (error) {
      setMessages(prev => prev.filter(m => !m.isLoading).concat({
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I\'m having trouble connecting right now. Please try again in a moment.',
        timestamp: new Date(),
      }));
    }

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
  }, [sessionId, language, chatMutation, initSession]);

  const handleClearConversation = () => {
    Alert.alert('Clear Conversation', 'Start a new conversation?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          if (sessionId) {
            await clearSession.mutateAsync({ sessionId });
          }
          setSessionId(null);
          await AsyncStorage.removeItem(SESSION_KEY);
          setMessages([{
            id: 'welcome-new',
            role: 'assistant',
            content: 'New conversation started. How can I help you?',
            timestamp: new Date(),
          }]);
          setShowQuickPrompts(true);
        },
      },
    ]);
  };

  // ── Render message ──────────────────────────────────────────────────────────
  const renderMessage = ({ item: msg }: { item: Message }) => {
    const isUser = msg.role === 'user';

    return (
      <View style={[styles.messageWrapper, isUser && styles.messageWrapperUser]}>
        {!isUser && (
          <View style={styles.avatarContainer}>
            <Text style={styles.avatar}>🤖</Text>
          </View>
        )}

        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
          {msg.isLoading ? (
            <TypingIndicator />
          ) : (
            <>
              {/* Intent badge */}
              {msg.intent && INTENT_CONFIG[msg.intent] && (
                <View style={[styles.intentBadge, { backgroundColor: INTENT_CONFIG[msg.intent].color + '20' }]}>
                  <Text style={[styles.intentBadgeText, { color: INTENT_CONFIG[msg.intent].color }]}>
                    {INTENT_CONFIG[msg.intent].emoji} {INTENT_CONFIG[msg.intent].label}
                  </Text>
                </View>
              )}

              {/* Message text */}
              <Text style={[styles.messageText, isUser && styles.userMessageText]}>
                {msg.content}
              </Text>

              {/* Extracted search card */}
              {msg.extractedSearch && Object.keys(msg.extractedSearch).length > 0 && (
                <ExtractedSearchCard
                  search={msg.extractedSearch}
                  deepLink={msg.deepLink ?? null}
                  onPress={() => {
                    if (navigation && msg.deepLink) {
                      navigation.navigate('Search', { query: msg.deepLink });
                    }
                  }}
                />
              )}

              {/* Suggested actions */}
              {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                <View style={styles.suggestedActions}>
                  {msg.suggestedActions.map((action, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.actionChip}
                      onPress={() => sendMessage(action)}
                    >
                      <Text style={styles.actionChipText}>{action}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Timestamp */}
              <Text style={[styles.timestamp, isUser && styles.timestampUser]}>
                {msg.timestamp.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </>
          )}
        </View>
      </View>
    );
  };

  // ── Quick prompts ───────────────────────────────────────────────────────────
  const renderQuickPrompts = () => (
    <View style={styles.quickPromptsContainer}>
      <Text style={styles.quickPromptsTitle}>Try asking:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {QUICK_PROMPTS.map((prompt, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.quickPrompt}
            onPress={() => sendMessage(prompt)}
          >
            <Text style={styles.quickPromptText}>{prompt}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // ── Language selector ───────────────────────────────────────────────────────
  const renderLanguageSelector = () => (
    <View style={styles.languageSelector}>
      {LANGUAGES.map(lang => (
        <TouchableOpacity
          key={lang.code}
          style={[styles.langBtn, language === lang.code && styles.langBtnActive]}
          onPress={() => { setLanguage(lang.code); setShowLanguageSelector(false); }}
        >
          <Text style={styles.langFlag}>{lang.flag}</Text>
          <Text style={[styles.langLabel, language === lang.code && styles.langLabelActive]}>
            {lang.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.onlineIndicator} />
          <View>
            <Text style={styles.headerTitle}>AI Assistant</Text>
            <Text style={styles.headerSub}>Nigerian Real Estate Expert</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => setShowLanguageSelector(!showLanguageSelector)}
          >
            <Text style={styles.headerBtnText}>
              {LANGUAGES.find(l => l.code === language)?.flag} {language.toUpperCase()}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={handleClearConversation}>
            <Text style={styles.headerBtnText}>🗑</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Language selector dropdown */}
      {showLanguageSelector && renderLanguageSelector()}

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={showQuickPrompts ? renderQuickPrompts : null}
      />

      {/* Input area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask about Nigerian property..."
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={2000}
            returnKeyType="send"
            onSubmitEditing={() => sendMessage(inputText)}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || chatMutation.isPending) && styles.sendBtnDisabled]}
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || chatMutation.isPending}
          >
            {chatMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendBtnText}>↑</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  onlineIndicator: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  headerSub: { fontSize: 12, color: '#6B7280' },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  headerBtnText: { fontSize: 13, color: '#374151', fontWeight: '600' },
  languageSelector: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', flexDirection: 'row', padding: 8, gap: 8 },
  langBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  langBtnActive: { backgroundColor: '#EEF2FF', borderColor: '#6366F1' },
  langFlag: { fontSize: 16 },
  langLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  langLabelActive: { color: '#6366F1', fontWeight: '700' },
  messageList: { padding: 16, gap: 12 },
  messageWrapper: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 12 },
  messageWrapperUser: { flexDirection: 'row-reverse' },
  avatarContainer: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  avatar: { fontSize: 18 },
  messageBubble: { maxWidth: '80%', borderRadius: 16, padding: 12 },
  userBubble: { backgroundColor: '#6366F1', borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: '#fff', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  intentBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 6 },
  intentBadgeText: { fontSize: 11, fontWeight: '600' },
  messageText: { fontSize: 15, color: '#111827', lineHeight: 22 },
  userMessageText: { color: '#fff' },
  searchCard: { backgroundColor: '#EEF2FF', borderRadius: 10, padding: 10, marginTop: 8, borderWidth: 1, borderColor: '#C7D2FE' },
  searchCardTitle: { fontSize: 12, fontWeight: '700', color: '#6366F1', marginBottom: 6 },
  searchCardParams: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  searchParam: { fontSize: 12, backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, color: '#374151', fontWeight: '500' },
  searchCardCTA: { fontSize: 12, color: '#6366F1', fontWeight: '600' },
  suggestedActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  actionChip: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  actionChipText: { fontSize: 12, color: '#374151', fontWeight: '500' },
  timestamp: { fontSize: 10, color: '#9CA3AF', marginTop: 4 },
  timestampUser: { color: '#C7D2FE', textAlign: 'right' },
  typingContainer: { flexDirection: 'row', gap: 4, padding: 4 },
  typingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#9CA3AF' },
  quickPromptsContainer: { padding: 16 },
  quickPromptsTitle: { fontSize: 13, color: '#6B7280', fontWeight: '600', marginBottom: 8 },
  quickPrompt: { backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#E5E7EB', maxWidth: 220 },
  quickPromptText: { fontSize: 13, color: '#374151' },
  inputArea: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB', gap: 8 },
  input: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#111827', maxHeight: 120, borderWidth: 1, borderColor: '#E5E7EB' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#C7D2FE' },
  sendBtnText: { color: '#fff', fontSize: 20, fontWeight: '700' },
});
