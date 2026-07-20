import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MOCK_NOTIFS = [
  { id: '1', type: 'price_drop', title: 'Price Drop Alert', body: '4-Bed Duplex in Lekki dropped by ₦5M', time: '2m ago', read: false, icon: '📉' },
  { id: '2', type: 'booking', title: 'Tour Confirmed', body: 'Your tour at 3-Bed Apartment, VI is confirmed for tomorrow at 10:00', time: '1h ago', read: false, icon: '✅' },
  { id: '3', type: 'message', title: 'New Message', body: 'Adaeze Okonkwo sent you a message about the Ikoyi property', time: '3h ago', read: true, icon: '💬' },
  { id: '4', type: 'new_listing', title: 'New Listing Match', body: 'A new 3-bed apartment in Lekki matches your saved search', time: '5h ago', read: true, icon: '🏠' },
  { id: '5', type: 'payment', title: 'Payment Received', body: 'Your escrow deposit of ₦500,000 has been confirmed', time: '1d ago', read: true, icon: '💰' },
  { id: '6', type: 'kyc', title: 'KYC Approved', body: 'Your identity verification has been approved', time: '2d ago', read: true, icon: '🎉' },
];

export default function NotificationsScreen({ navigation }: any) {
  const [notifs, setNotifs] = useState(MOCK_NOTIFS);
  const unreadCount = notifs.filter(n => !n.read).length;

  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  const markRead = (id: string) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead}><Text style={s.markAll}>Mark all read</Text></TouchableOpacity>
        )}
      </View>
      {unreadCount > 0 && <View style={s.badge}><Text style={s.badgeText}>{unreadCount} unread</Text></View>}
      <FlatList
        data={notifs}
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={[s.item, !item.read && s.itemUnread]} onPress={() => markRead(item.id)}>
            <Text style={s.icon}>{item.icon}</Text>
            <View style={s.itemContent}>
              <View style={s.itemHeader}>
                <Text style={[s.itemTitle, !item.read && s.itemTitleUnread]}>{item.title}</Text>
                <Text style={s.itemTime}>{item.time}</Text>
              </View>
              <Text style={s.itemBody} numberOfLines={2}>{item.body}</Text>
            </View>
            {!item.read && <View style={s.dot} />}
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={s.sep} />}
        ListEmptyComponent={<View style={s.empty}><Text style={s.emptyText}>No notifications yet</Text></View>}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '700' },
  markAll: { color: '#007AFF', fontSize: 14 },
  badge: { backgroundColor: '#eff6ff', marginHorizontal: 20, marginBottom: 8, borderRadius: 8, padding: 8 },
  badgeText: { color: '#007AFF', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  item: { flexDirection: 'row', padding: 16, alignItems: 'flex-start', gap: 12 },
  itemUnread: { backgroundColor: '#f0f9ff' },
  icon: { fontSize: 28, width: 36, textAlign: 'center' },
  itemContent: { flex: 1 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  itemTitle: { fontSize: 14, fontWeight: '500', flex: 1 },
  itemTitleUnread: { fontWeight: '700' },
  itemTime: { fontSize: 12, color: '#888', marginLeft: 8 },
  itemBody: { fontSize: 13, color: '#666', lineHeight: 18 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#007AFF', marginTop: 6 },
  sep: { height: 1, backgroundColor: '#f5f5f5', marginLeft: 64 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#888', fontSize: 15 },
});
