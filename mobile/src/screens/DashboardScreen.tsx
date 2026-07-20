import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DashboardScreen({ navigation }: any) {
  const stats = [
    { label: 'Saved Properties', value: '12', icon: '❤️', color: '#fee2e2' },
    { label: 'Active Alerts', value: '5', icon: '🔔', color: '#fef3c7' },
    { label: 'Tours Booked', value: '3', icon: '📅', color: '#dbeafe' },
    { label: 'Documents', value: '8', icon: '📄', color: '#dcfce7' },
  ];

  const recentActivity = [
    { text: 'Price drop on 4-Bed Duplex, Lekki', time: '2h ago', icon: '📉' },
    { text: 'Tour confirmed for tomorrow 10:00', time: '5h ago', icon: '✅' },
    { text: 'New match: 3-Bed Apartment, VI', time: '1d ago', icon: '🏠' },
    { text: 'KYC verification approved', time: '2d ago', icon: '🎉' },
  ];

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.greeting}>Good morning, Emeka 👋</Text>
        <Text style={s.subtitle}>Here's your property activity</Text>

        <View style={s.statsGrid}>
          {stats.map(stat => (
            <View key={stat.label} style={[s.statCard, { backgroundColor: stat.color }]}>
              <Text style={s.statIcon}>{stat.icon}</Text>
              <Text style={s.statValue}>{stat.value}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <Text style={s.sectionTitle}>Recent Activity</Text>
        {recentActivity.map((a, i) => (
          <View key={i} style={s.activityRow}>
            <Text style={s.activityIcon}>{a.icon}</Text>
            <View style={s.activityContent}>
              <Text style={s.activityText}>{a.text}</Text>
              <Text style={s.activityTime}>{a.time}</Text>
            </View>
          </View>
        ))}

        <Text style={s.sectionTitle}>Quick Actions</Text>
        <View style={s.actionsGrid}>
          {[
            { label: 'Search Properties', icon: '🔍', screen: 'Search' },
            { label: 'Book a Tour', icon: '📅', screen: 'Booking' },
            { label: 'Mortgage Calc', icon: '🧮', screen: 'MortgageCalculator' },
            { label: 'My Documents', icon: '📁', screen: 'Documents' },
          ].map(action => (
            <TouchableOpacity key={action.label} style={s.actionCard} onPress={() => navigation.navigate(action.screen)}>
              <Text style={s.actionIcon}>{action.icon}</Text>
              <Text style={s.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 20 },
  greeting: { fontSize: 26, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#666', marginBottom: 24 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  statCard: { width: '47%', borderRadius: 16, padding: 16 },
  statIcon: { fontSize: 28, marginBottom: 8 },
  statValue: { fontSize: 28, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 12, color: '#555', fontWeight: '500' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 14 },
  activityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14, backgroundColor: '#fff', padding: 14, borderRadius: 12 },
  activityIcon: { fontSize: 22, width: 32, textAlign: 'center' },
  activityContent: { flex: 1 },
  activityText: { fontSize: 14, fontWeight: '500', marginBottom: 2 },
  activityTime: { fontSize: 12, color: '#888' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  actionCard: { width: '47%', backgroundColor: '#fff', borderRadius: 16, padding: 20, alignItems: 'center', gap: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  actionIcon: { fontSize: 32 },
  actionLabel: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
});
