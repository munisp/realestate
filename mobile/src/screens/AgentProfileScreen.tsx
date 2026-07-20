import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AgentProfileScreen({ route, navigation }: any) {
  const { agentId } = route?.params || {};
  const [activeTab, setActiveTab] = useState<'listings' | 'reviews'>('listings');

  const agent = {
    id: agentId || 'a1',
    name: 'Adaeze Okonkwo',
    title: 'Senior Property Consultant',
    agency: 'Prime Realty Lagos',
    avatar: 'https://i.pravatar.cc/150?img=47',
    phone: '+234 801 234 5678',
    email: 'adaeze@primerealty.ng',
    rating: 4.8,
    reviewCount: 124,
    dealsClosed: 87,
    yearsExp: 9,
    specialties: ['Luxury Apartments', 'Off-Plan', 'Commercial'],
    bio: 'Adaeze is a top-performing property consultant with 9 years of experience in Lagos real estate. Specialising in luxury and off-plan properties across Lekki, VI, and Ikoyi.',
    listings: [
      { id: 'p1', title: '4-Bed Duplex, Lekki Phase 1', price: '₦85M', image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400' },
      { id: 'p2', title: '3-Bed Apartment, Victoria Island', price: '₦65M', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400' },
      { id: 'p3', title: 'Office Space, Ikoyi', price: '₦12M/yr', image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400' },
    ],
    reviews: [
      { author: 'Emeka O.', rating: 5, text: 'Adaeze was incredibly professional and helped us find our dream home in Lekki.', date: '2 weeks ago' },
      { author: 'Fatima A.', rating: 5, text: 'Very knowledgeable about the market. Closed our deal in record time!', date: '1 month ago' },
      { author: 'Chidi N.', rating: 4, text: 'Great experience overall. Would highly recommend.', date: '2 months ago' },
    ],
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView>
        {/* Header */}
        <View style={s.header}>
          <Image source={{ uri: agent.avatar }} style={s.avatar} />
          <Text style={s.name}>{agent.name}</Text>
          <Text style={s.title}>{agent.title}</Text>
          <Text style={s.agency}>{agent.agency}</Text>
          <View style={s.ratingRow}>
            <Text style={s.star}>⭐</Text>
            <Text style={s.rating}>{agent.rating}</Text>
            <Text style={s.ratingCount}>({agent.reviewCount} reviews)</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          {[{ label: 'Deals Closed', value: agent.dealsClosed }, { label: 'Years Exp.', value: agent.yearsExp }, { label: 'Rating', value: agent.rating }].map(stat => (
            <View key={stat.label} style={s.stat}>
              <Text style={s.statValue}>{stat.value}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Contact buttons */}
        <View style={s.contactRow}>
          <TouchableOpacity style={s.callBtn} onPress={() => Linking.openURL(`tel:${agent.phone}`)}>
            <Text style={s.callBtnText}>📞 Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.chatBtn} onPress={() => Linking.openURL(`https://wa.me/${agent.phone.replace(/\D/g, '')}`)}>
            <Text style={s.chatBtnText}>💬 WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.emailBtn} onPress={() => Linking.openURL(`mailto:${agent.email}`)}>
            <Text style={s.emailBtnText}>✉️ Email</Text>
          </TouchableOpacity>
        </View>

        {/* Bio */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>About</Text>
          <Text style={s.bio}>{agent.bio}</Text>
          <View style={s.specialties}>
            {agent.specialties.map(sp => (
              <View key={sp} style={s.specialtyChip}><Text style={s.specialtyText}>{sp}</Text></View>
            ))}
          </View>
        </View>

        {/* Tabs */}
        <View style={s.tabs}>
          {(['listings', 'reviews'] as const).map(tab => (
            <TouchableOpacity key={tab} style={[s.tab, activeTab === tab && s.tabActive]} onPress={() => setActiveTab(tab)}>
              <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>{tab === 'listings' ? `Listings (${agent.listings.length})` : `Reviews (${agent.reviews.length})`}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'listings' ? (
          <View style={s.listingsGrid}>
            {agent.listings.map(l => (
              <TouchableOpacity key={l.id} style={s.listingCard} onPress={() => navigation.navigate('PropertyDetail', { propertyId: l.id })}>
                <Image source={{ uri: l.image }} style={s.listingImg} />
                <View style={s.listingInfo}>
                  <Text style={s.listingTitle} numberOfLines={2}>{l.title}</Text>
                  <Text style={s.listingPrice}>{l.price}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={s.reviews}>
            {agent.reviews.map((r, i) => (
              <View key={i} style={s.reviewCard}>
                <View style={s.reviewHeader}>
                  <Text style={s.reviewAuthor}>{r.author}</Text>
                  <Text style={s.reviewDate}>{r.date}</Text>
                </View>
                <Text style={s.reviewStars}>{'⭐'.repeat(r.rating)}</Text>
                <Text style={s.reviewText}>{r.text}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { alignItems: 'center', padding: 24, backgroundColor: '#f8faff' },
  avatar: { width: 90, height: 90, borderRadius: 45, marginBottom: 12 },
  name: { fontSize: 22, fontWeight: '700' },
  title: { fontSize: 14, color: '#555', marginTop: 2 },
  agency: { fontSize: 13, color: '#007AFF', marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 },
  star: { fontSize: 16 },
  rating: { fontSize: 16, fontWeight: '700' },
  ratingCount: { fontSize: 13, color: '#888' },
  statsRow: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  stat: { flex: 1, alignItems: 'center', padding: 16 },
  statValue: { fontSize: 22, fontWeight: '700', color: '#007AFF' },
  statLabel: { fontSize: 12, color: '#888', marginTop: 2 },
  contactRow: { flexDirection: 'row', padding: 16, gap: 10 },
  callBtn: { flex: 1, backgroundColor: '#007AFF', borderRadius: 12, padding: 12, alignItems: 'center' },
  callBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  chatBtn: { flex: 1, backgroundColor: '#25D366', borderRadius: 12, padding: 12, alignItems: 'center' },
  chatBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  emailBtn: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 12, padding: 12, alignItems: 'center' },
  emailBtnText: { color: '#333', fontWeight: '600', fontSize: 14 },
  section: { padding: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  bio: { fontSize: 14, color: '#555', lineHeight: 22 },
  specialties: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  specialtyChip: { backgroundColor: '#eff6ff', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  specialtyText: { color: '#007AFF', fontSize: 12, fontWeight: '600' },
  tabs: { flexDirection: 'row', borderTopWidth: 1, borderColor: '#f0f0f0', marginTop: 8 },
  tab: { flex: 1, padding: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#007AFF' },
  tabText: { fontSize: 14, color: '#888' },
  tabTextActive: { color: '#007AFF', fontWeight: '600' },
  listingsGrid: { padding: 16, gap: 12 },
  listingCard: { flexDirection: 'row', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#f0f0f0' },
  listingImg: { width: 100, height: 80 },
  listingInfo: { flex: 1, padding: 12, justifyContent: 'center' },
  listingTitle: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  listingPrice: { fontSize: 15, fontWeight: '700', color: '#007AFF' },
  reviews: { padding: 16, gap: 12 },
  reviewCard: { padding: 16, borderRadius: 12, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#f0f0f0' },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  reviewAuthor: { fontSize: 14, fontWeight: '600' },
  reviewDate: { fontSize: 12, color: '#888' },
  reviewStars: { fontSize: 14, marginBottom: 6 },
  reviewText: { fontSize: 13, color: '#555', lineHeight: 20 },
});
