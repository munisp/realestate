import React, { useState, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Dimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const SLIDES = [
  { id: '1', emoji: '🏠', title: 'Find Your Dream Home', subtitle: 'Browse thousands of verified properties across Nigeria — Lagos, Abuja, Port Harcourt and more.' },
  { id: '2', emoji: '🤖', title: 'AI-Powered Matching', subtitle: 'Our ML engine learns your preferences and surfaces the properties most likely to be your perfect match.' },
  { id: '3', emoji: '🔒', title: 'Secure Transactions', subtitle: 'Escrow-protected payments, KYC verification, and CBN-licensed payment processing keep your money safe.' },
  { id: '4', emoji: '📱', title: 'Book Tours Instantly', subtitle: 'Schedule physical or virtual tours in seconds. Meet verified agents and inspect properties on your schedule.' },
];

export default function OnboardingScreen({ navigation }: any) {
  const [current, setCurrent] = useState(0);
  const flatRef = useRef<FlatList>(null);

  const next = () => {
    if (current < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: current + 1 });
      setCurrent(current + 1);
    } else {
      navigation.replace('Login');
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <FlatList
        ref={flatRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={e => setCurrent(Math.round(e.nativeEvent.contentOffset.x / width))}
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <View style={s.slide}>
            <Text style={s.emoji}>{item.emoji}</Text>
            <Text style={s.slideTitle}>{item.title}</Text>
            <Text style={s.slideSubtitle}>{item.subtitle}</Text>
          </View>
        )}
      />
      <View style={s.footer}>
        <View style={s.dots}>
          {SLIDES.map((_, i) => <View key={i} style={[s.dot, i === current && s.dotActive]} />)}
        </View>
        <TouchableOpacity style={s.btn} onPress={next}>
          <Text style={s.btnText}>{current === SLIDES.length - 1 ? 'Get Started' : 'Next'}</Text>
        </TouchableOpacity>
        {current < SLIDES.length - 1 && (
          <TouchableOpacity onPress={() => navigation.replace('Login')} style={s.skip}>
            <Text style={s.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  slide: { width, flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emoji: { fontSize: 80, marginBottom: 32 },
  slideTitle: { fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
  slideSubtitle: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 24 },
  footer: { padding: 32, alignItems: 'center', gap: 16 },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e5e7eb' },
  dotActive: { width: 24, backgroundColor: '#007AFF' },
  btn: { backgroundColor: '#007AFF', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 48, width: '100%', alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  skip: { padding: 8 },
  skipText: { color: '#888', fontSize: 15 },
});
