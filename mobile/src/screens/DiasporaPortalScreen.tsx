/**
 * DiasporaPortalScreen.tsx
 * =========================
 * Dedicated portal for Nigerian diaspora buyers (UK, US, Canada, etc.)
 *
 * Features:
 *  - Multi-currency pricing (USD, GBP, EUR, CAD) with live NGN conversion
 *  - Verified listings with trust badges
 *  - Escrow service initiation
 *  - Trusted agent matching
 *  - Virtual tour scheduling
 *  - Title verification status
 *  - Remote KYC completion
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  FlatList, RefreshControl, Modal, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { trpc } from '../lib/trpc';

// ── Types ─────────────────────────────────────────────────────────────────────
type Currency = 'USD' | 'GBP' | 'EUR' | 'CAD';

const CURRENCIES: Array<{ code: Currency; symbol: string; flag: string; label: string }> = [
  { code: 'USD', symbol: '$', flag: '🇺🇸', label: 'US Dollar' },
  { code: 'GBP', symbol: '£', flag: '🇬🇧', label: 'British Pound' },
  { code: 'EUR', symbol: '€', flag: '🇪🇺', label: 'Euro' },
  { code: 'CAD', symbol: 'CA$', flag: '🇨🇦', label: 'Canadian Dollar' },
];

const BADGE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  premium: { bg: '#EDE9FE', text: '#7C3AED', border: '#C4B5FD' },
  verified: { bg: '#D1FAE5', text: '#059669', border: '#6EE7B7' },
  basic: { bg: '#FEF3C7', text: '#D97706', border: '#FCD34D' },
  unverified: { bg: '#F3F4F6', text: '#6B7280', border: '#E5E7EB' },
};

// ── Sub-components ────────────────────────────────────────────────────────────
const TrustBadge = ({ tier }: { tier: string }) => {
  const style = BADGE_STYLES[tier] ?? BADGE_STYLES.unverified;
  const icons: Record<string, string> = { premium: '🏆', verified: '✅', basic: '🟡', unverified: '⚪' };
  const labels: Record<string, string> = { premium: 'Premium', verified: 'Verified', basic: 'Basic', unverified: 'Unverified' };

  return (
    <View style={[styles.badge, { backgroundColor: style.bg, borderColor: style.border }]}>
      <Text style={[styles.badgeText, { color: style.text }]}>
        {icons[tier]} {labels[tier]}
      </Text>
    </View>
  );
};

const StatCard = ({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon: string }) => (
  <View style={styles.statCard}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    {sub && <Text style={styles.statSub}>{sub}</Text>}
  </View>
);

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function DiasporaPortalScreen({ navigation }: any) {
  const [currency, setCurrency] = useState<Currency>('USD');
  const [selectedCity, setSelectedCity] = useState<string | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showEscrowModal, setShowEscrowModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'listings' | 'tools' | 'agents' | 'guide'>('listings');

  const listingsQuery = trpc.trust.getDiasporaListings.useQuery({ currency, city: selectedCity, limit: 20 });
  const statsQuery = trpc.trust.getTrustStats.useQuery();
  const profileQuery = trpc.trust.getDiasporaProfile.useQuery();
  const initiateEscrow = trpc.trust.initiateDiasporaEscrow.useMutation({
    onSuccess: (data) => {
      setShowEscrowModal(false);
      Alert.alert(
        '✅ Escrow Initiated',
        `Escrow ID: ${data.escrowId}\n\nTransfer ${CURRENCIES.find(c => c.code === currency)?.symbol}${data.amounts.foreign.toLocaleString()} to the escrow account. Your agent will be notified.`,
        [{ text: 'View Details', onPress: () => {} }, { text: 'OK' }]
      );
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([listingsQuery.refetch(), statsQuery.refetch()]);
    setRefreshing(false);
  }, []);

  const currencySymbol = CURRENCIES.find(c => c.code === currency)?.symbol ?? '$';
  const currencyFlag = CURRENCIES.find(c => c.code === currency)?.flag ?? '🇺🇸';

  // ── Trust Stats Banner ──────────────────────────────────────────────────────
  const renderStatsBanner = () => {
    const stats = statsQuery.data;
    if (!stats) return null;

    return (
      <View style={styles.statsBanner}>
        <Text style={styles.statsBannerTitle}>🇳🇬 Trusted Nigerian Real Estate</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsRow}>
          <StatCard label="Verified Listings" value={stats.totalVerifiedListings.toLocaleString()} icon="✅" />
          <StatCard label="Verified Agents" value={stats.totalVerifiedAgents.toLocaleString()} icon="👤" />
          <StatCard label="Diaspora Served" value={stats.diasporaBuyersServed.toLocaleString()} icon="✈️" />
          <StatCard label="Escrow Value" value={`₦${(stats.totalEscrowValueNgn / 1_000_000_000).toFixed(1)}B`} icon="🔒" />
          <StatCard label="Satisfaction" value={`${stats.customerSatisfaction}/5`} icon="⭐" />
        </ScrollView>
      </View>
    );
  };

  // ── Listings Tab ────────────────────────────────────────────────────────────
  const renderListings = () => {
    const listings = listingsQuery.data?.listings ?? [];
    const exchangeRate = listingsQuery.data?.exchangeRate ?? 1600;

    return (
      <View style={{ flex: 1 }}>
        {/* Filters */}
        <View style={styles.filterBar}>
          {/* Currency picker */}
          <TouchableOpacity style={styles.currencyBtn} onPress={() => setShowCurrencyPicker(true)}>
            <Text style={styles.currencyBtnText}>{currencyFlag} {currency}</Text>
            <Text style={styles.chevron}>▼</Text>
          </TouchableOpacity>

          {/* City filter */}
          {['All', 'Lagos', 'Abuja', 'Port Harcourt'].map(city => (
            <TouchableOpacity
              key={city}
              style={[styles.cityChip, selectedCity === (city === 'All' ? undefined : city) && styles.cityChipActive]}
              onPress={() => setSelectedCity(city === 'All' ? undefined : city)}
            >
              <Text style={[styles.cityChipText, selectedCity === (city === 'All' ? undefined : city) && styles.cityChipTextActive]}>
                {city}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Exchange rate note */}
        <View style={styles.rateNote}>
          <Text style={styles.rateNoteText}>
            1 {currency} ≈ ₦{exchangeRate.toLocaleString()} · Prices are indicative
          </Text>
        </View>

        <FlatList
          data={listings}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item: listing }) => (
            <View style={styles.listingCard}>
              {/* Image placeholder */}
              <View style={styles.listingImage}>
                <Text style={styles.listingImagePlaceholder}>🏠</Text>
                {listing.virtualTourAvailable && (
                  <View style={styles.virtualTourBadge}>
                    <Text style={styles.virtualTourText}>💻 Virtual Tour</Text>
                  </View>
                )}
              </View>

              <View style={styles.listingContent}>
                <View style={styles.listingHeader}>
                  <Text style={styles.listingTitle} numberOfLines={2}>{listing.title}</Text>
                  <TrustBadge tier={listing.badge} />
                </View>

                {/* Pricing */}
                <View style={styles.pricingRow}>
                  <Text style={styles.foreignPrice}>
                    {currencySymbol}{listing.foreignPrice.toLocaleString()}
                  </Text>
                  <Text style={styles.ngnPrice}>≈ ₦{(listing.ngnPrice / 1_000_000).toFixed(0)}M</Text>
                </View>

                {/* Details */}
                <View style={styles.detailsRow}>
                  <Text style={styles.detailItem}>🛏 {listing.bedrooms} bed</Text>
                  <Text style={styles.detailItem}>📐 {listing.sqm} sqm</Text>
                  <Text style={styles.detailItem}>📍 {listing.city}</Text>
                </View>

                {/* Title type */}
                <View style={styles.titleRow}>
                  <Text style={styles.titleType}>📄 {listing.titleType}</Text>
                  {listing.escrowAvailable && (
                    <View style={styles.escrowBadge}>
                      <Text style={styles.escrowBadgeText}>🔒 Escrow</Text>
                    </View>
                  )}
                </View>

                {/* Agent */}
                <View style={styles.agentRow}>
                  <Text style={styles.agentName}>👤 {listing.agentName}</Text>
                  {listing.agentVerified && <Text style={styles.agentVerified}>✅ Verified</Text>}
                </View>

                {/* Actions */}
                <View style={styles.listingActions}>
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={() => {
                      setSelectedProperty(listing);
                      setShowEscrowModal(true);
                    }}
                  >
                    <Text style={styles.primaryBtnText}>🔒 Start Escrow</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={() => Alert.alert('Virtual Tour', 'Opening virtual tour...')}
                  >
                    <Text style={styles.secondaryBtnText}>💻 Tour</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No listings found</Text>
            </View>
          }
        />
      </View>
    );
  };

  // ── Tools Tab ───────────────────────────────────────────────────────────────
  const renderTools = () => (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Text style={styles.sectionTitle}>Diaspora Buyer Tools</Text>

      {[
        { icon: '🔒', title: 'Escrow Service', desc: 'Secure your purchase with our CBN-compliant escrow. Funds held until title transfer is complete.', action: 'Set Up Escrow' },
        { icon: '📄', title: 'Title Verification', desc: 'We verify C of O, Governor\'s Consent, and Deed of Assignment with the state land registry.', action: 'Verify Title' },
        { icon: '👤', title: 'Remote KYC', desc: 'Complete your identity verification (NIN/BVN equivalent) from anywhere in the world.', action: 'Complete KYC' },
        { icon: '💻', title: 'Virtual Tours', desc: '360° virtual tours and live video walkthroughs with your agent — no travel required.', action: 'Book Tour' },
        { icon: '⚖️', title: 'Legal Support', desc: 'Connect with NIESV-registered solicitors who specialise in diaspora property transactions.', action: 'Find Solicitor' },
        { icon: '🏠', title: 'Property Management', desc: 'We manage your property after purchase — tenant sourcing, rent collection, maintenance.', action: 'Learn More' },
        { icon: '💱', title: 'Currency Exchange', desc: 'Competitive NGN exchange rates for USD, GBP, EUR, and CAD via our banking partners.', action: 'Get Rate' },
        { icon: '📊', title: 'Investment Analysis', desc: 'ROI calculator, rental yield analysis, and market appreciation forecasts for Nigerian cities.', action: 'Analyse' },
      ].map((tool, i) => (
        <View key={i} style={styles.toolCard}>
          <Text style={styles.toolIcon}>{tool.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.toolTitle}>{tool.title}</Text>
            <Text style={styles.toolDesc}>{tool.desc}</Text>
          </View>
          <TouchableOpacity style={styles.toolBtn} onPress={() => Alert.alert(tool.title, tool.desc)}>
            <Text style={styles.toolBtnText}>{tool.action}</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );

  // ── Trusted Agents Tab ──────────────────────────────────────────────────────
  const renderAgents = () => {
    const agents = profileQuery.data?.trustedAgents ?? [];

    return (
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View style={styles.agentsBanner}>
          <Text style={styles.agentsBannerTitle}>🏆 Diaspora-Trusted Agents</Text>
          <Text style={styles.agentsBannerSub}>All agents are NIESV-registered, NIN/BVN verified, and experienced with diaspora transactions</Text>
        </View>

        {agents.map((agent: any) => (
          <View key={agent.agentId} style={styles.agentCard}>
            <View style={styles.agentAvatar}>
              <Text style={styles.agentAvatarText}>{agent.name.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.agentCardName}>{agent.name}</Text>
              <Text style={styles.agentCardCity}>📍 {agent.city}</Text>
              <View style={styles.agentCardMeta}>
                <Text style={styles.agentCardRating}>⭐ {agent.rating}</Text>
                <TrustBadge tier={agent.badge} />
              </View>
            </View>
            <View style={styles.agentCardActions}>
              <TouchableOpacity style={styles.agentCallBtn} onPress={() => Alert.alert('Call', `Calling ${agent.name}...`)}>
                <Text style={styles.agentCallBtnText}>📞</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.agentWhatsAppBtn} onPress={() => Alert.alert('WhatsApp', `Opening WhatsApp...`)}>
                <Text style={styles.agentWhatsAppBtnText}>💬</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.findMoreBtn} onPress={() => Alert.alert('Find More Agents', 'Searching for verified agents...')}>
          <Text style={styles.findMoreBtnText}>Find More Verified Agents</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  // ── Buyer Guide Tab ─────────────────────────────────────────────────────────
  const renderGuide = () => (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Text style={styles.sectionTitle}>Diaspora Buyer Guide</Text>

      {[
        {
          step: '1', title: 'Search & Shortlist',
          content: 'Browse verified listings in your preferred city. Filter by budget in your currency. Save properties to your wishlist.',
          warning: null,
        },
        {
          step: '2', title: 'Verify the Title',
          content: 'Before any payment, verify the title document. Acceptable titles: C of O (best), Governor\'s Consent, Deed of Assignment. We verify with the state land registry.',
          warning: 'Never pay any deposit without seeing the original title document.',
        },
        {
          step: '3', title: 'Engage a Verified Agent',
          content: 'Work only with NIESV-registered agents. Our platform verifies agent NIN, BVN, and NIESV membership. All agents are rated by past clients.',
          warning: null,
        },
        {
          step: '4', title: 'Virtual Tour',
          content: 'Schedule a virtual tour with your agent. They will conduct a live video walkthrough. You can also request an independent inspection report.',
          warning: null,
        },
        {
          step: '5', title: 'Initiate Escrow',
          content: 'Transfer funds to our CBN-compliant escrow account. Funds are held securely until title transfer is complete. Platform fee: 0.5%. Agent commission: 3%.',
          warning: 'Never transfer funds directly to an agent or seller without escrow.',
        },
        {
          step: '6', title: 'Sign Documents',
          content: 'Sign the Deed of Assignment and other documents electronically. Our solicitors will ensure all documents are legally valid in Nigeria.',
          warning: null,
        },
        {
          step: '7', title: 'Title Transfer',
          content: 'Upon signing, funds are released to the seller. Title is transferred to your name. You receive a certified copy of the new title document.',
          warning: null,
        },
      ].map((step, i) => (
        <View key={i} style={styles.guideStep}>
          <View style={styles.guideStepNumber}>
            <Text style={styles.guideStepNumberText}>{step.step}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.guideStepTitle}>{step.title}</Text>
            <Text style={styles.guideStepContent}>{step.content}</Text>
            {step.warning && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>⚠️ {step.warning}</Text>
              </View>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );

  // ── Escrow Modal ────────────────────────────────────────────────────────────
  const renderEscrowModal = () => (
    <Modal visible={showEscrowModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowEscrowModal(false)}>
            <Text style={styles.modalCancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Start Escrow</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView style={{ padding: 16 }}>
          {selectedProperty && (
            <>
              <View style={styles.escrowPropertyCard}>
                <Text style={styles.escrowPropertyTitle}>{selectedProperty.title}</Text>
                <Text style={styles.escrowPropertyPrice}>
                  {currencySymbol}{selectedProperty.foreignPrice.toLocaleString()} ({currency})
                </Text>
                <Text style={styles.escrowPropertyNgn}>≈ ₦{(selectedProperty.ngnPrice / 1_000_000).toFixed(0)}M</Text>
              </View>

              <View style={styles.escrowBreakdown}>
                <Text style={styles.escrowBreakdownTitle}>Cost Breakdown</Text>
                {[
                  { label: 'Property Price', value: `${currencySymbol}${selectedProperty.foreignPrice.toLocaleString()}` },
                  { label: 'Platform Fee (0.5%)', value: `${currencySymbol}${Math.round(selectedProperty.foreignPrice * 0.005).toLocaleString()}` },
                  { label: 'Agent Commission (3%)', value: `${currencySymbol}${Math.round(selectedProperty.foreignPrice * 0.03).toLocaleString()}` },
                  { label: 'Legal Fees (est.)', value: `${currencySymbol}${Math.round(selectedProperty.foreignPrice * 0.01).toLocaleString()}` },
                ].map((item, i) => (
                  <View key={i} style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>{item.label}</Text>
                    <Text style={styles.breakdownValue}>{item.value}</Text>
                  </View>
                ))}
                <View style={[styles.breakdownRow, styles.breakdownTotal]}>
                  <Text style={styles.breakdownTotalLabel}>Total</Text>
                  <Text style={styles.breakdownTotalValue}>
                    {currencySymbol}{Math.round(selectedProperty.foreignPrice * 1.045).toLocaleString()}
                  </Text>
                </View>
              </View>

              <View style={styles.escrowWarning}>
                <Text style={styles.escrowWarningText}>
                  🔒 Your funds will be held in escrow until title transfer is complete. You can cancel within 48 hours for a full refund.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.escrowConfirmBtn}
                onPress={() => {
                  initiateEscrow.mutate({
                    propertyId: selectedProperty.id,
                    agentId: selectedProperty.agentId,
                    offerAmountNgn: selectedProperty.ngnPrice,
                    buyerCurrency: currency,
                    buyerCountry: 'United Kingdom',
                  });
                }}
                disabled={initiateEscrow.isPending}
              >
                <Text style={styles.escrowConfirmBtnText}>
                  {initiateEscrow.isPending ? 'Processing...' : '🔒 Confirm & Start Escrow'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // ── Currency Picker Modal ───────────────────────────────────────────────────
  const renderCurrencyPicker = () => (
    <Modal visible={showCurrencyPicker} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowCurrencyPicker(false)}>
            <Text style={styles.modalCancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Select Currency</Text>
          <View style={{ width: 60 }} />
        </View>
        {CURRENCIES.map(c => (
          <TouchableOpacity
            key={c.code}
            style={[styles.currencyOption, currency === c.code && styles.currencyOptionActive]}
            onPress={() => { setCurrency(c.code); setShowCurrencyPicker(false); }}
          >
            <Text style={styles.currencyOptionFlag}>{c.flag}</Text>
            <View>
              <Text style={styles.currencyOptionCode}>{c.code}</Text>
              <Text style={styles.currencyOptionLabel}>{c.label}</Text>
            </View>
            {currency === c.code && <Text style={styles.currencyOptionCheck}>✓</Text>}
          </TouchableOpacity>
        ))}
      </SafeAreaView>
    </Modal>
  );

  // ── Main render ─────────────────────────────────────────────────────────────
  const tabs = [
    { key: 'listings', label: '🏠 Listings' },
    { key: 'tools', label: '🔧 Tools' },
    { key: 'agents', label: '👤 Agents' },
    { key: 'guide', label: '📖 Guide' },
  ] as const;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>✈️ Diaspora Portal</Text>
        <Text style={styles.headerSub}>Buy Nigerian property from anywhere</Text>
      </View>

      {renderStatsBanner()}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={{ flex: 1 }}>
        {activeTab === 'listings' && renderListings()}
        {activeTab === 'tools' && renderTools()}
        {activeTab === 'agents' && renderAgents()}
        {activeTab === 'guide' && renderGuide()}
      </View>

      {renderEscrowModal()}
      {renderCurrencyPicker()}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: '#1E1B4B', padding: 16 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: '#A5B4FC', marginTop: 2 },
  statsBanner: { backgroundColor: '#fff', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  statsBannerTitle: { fontSize: 13, fontWeight: '700', color: '#374151', paddingHorizontal: 16, marginBottom: 8 },
  statsRow: { paddingHorizontal: 12 },
  statCard: { backgroundColor: '#F9FAFB', borderRadius: 10, padding: 10, alignItems: 'center', marginHorizontal: 4, minWidth: 90 },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '800', color: '#111827' },
  statLabel: { fontSize: 10, color: '#6B7280', textAlign: 'center', marginTop: 2 },
  statSub: { fontSize: 9, color: '#9CA3AF' },
  tabBar: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', flexGrow: 0 },
  tab: { paddingHorizontal: 16, paddingVertical: 12 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#6366F1' },
  tabText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  tabTextActive: { color: '#6366F1', fontWeight: '700' },
  filterBar: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  currencyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  currencyBtnText: { fontSize: 13, fontWeight: '700', color: '#6366F1' },
  chevron: { fontSize: 10, color: '#6366F1' },
  cityChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff' },
  cityChipActive: { backgroundColor: '#EEF2FF', borderColor: '#6366F1' },
  cityChipText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  cityChipTextActive: { color: '#6366F1', fontWeight: '700' },
  rateNote: { backgroundColor: '#FEF3C7', paddingHorizontal: 16, paddingVertical: 6 },
  rateNoteText: { fontSize: 11, color: '#D97706' },
  listingCard: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 3 },
  listingImage: { height: 140, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  listingImagePlaceholder: { fontSize: 48 },
  virtualTourBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: '#1E1B4B', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  virtualTourText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  listingContent: { padding: 14 },
  listingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  listingTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: '#111827', marginRight: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  pricingRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 8 },
  foreignPrice: { fontSize: 22, fontWeight: '800', color: '#059669' },
  ngnPrice: { fontSize: 13, color: '#6B7280' },
  detailsRow: { flexDirection: 'row', gap: 12, marginBottom: 6 },
  detailItem: { fontSize: 12, color: '#374151' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  titleType: { fontSize: 12, color: '#6B7280' },
  escrowBadge: { backgroundColor: '#D1FAE5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  escrowBadgeText: { fontSize: 11, color: '#059669', fontWeight: '600' },
  agentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  agentName: { fontSize: 12, color: '#374151' },
  agentVerified: { fontSize: 11, color: '#059669', fontWeight: '600' },
  listingActions: { flexDirection: 'row', gap: 8 },
  primaryBtn: { flex: 1, backgroundColor: '#6366F1', padding: 10, borderRadius: 10, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  secondaryBtn: { backgroundColor: '#EEF2FF', padding: 10, borderRadius: 10, alignItems: 'center', paddingHorizontal: 16 },
  secondaryBtnText: { color: '#6366F1', fontWeight: '700', fontSize: 13 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  toolCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  toolIcon: { fontSize: 28, width: 40 },
  toolTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  toolDesc: { fontSize: 12, color: '#6B7280', lineHeight: 18 },
  toolBtn: { backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginTop: 8 },
  toolBtnText: { fontSize: 12, color: '#6366F1', fontWeight: '600' },
  agentsBanner: { backgroundColor: '#1E1B4B', padding: 14, borderRadius: 12 },
  agentsBannerTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 4 },
  agentsBannerSub: { fontSize: 12, color: '#A5B4FC', lineHeight: 18 },
  agentCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  agentAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  agentAvatarText: { fontSize: 20, fontWeight: '700', color: '#6366F1' },
  agentCardName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  agentCardCity: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  agentCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  agentCardRating: { fontSize: 12, color: '#374151', fontWeight: '600' },
  agentCardActions: { flexDirection: 'row', gap: 8 },
  agentCallBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center' },
  agentCallBtnText: { fontSize: 18 },
  agentWhatsAppBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  agentWhatsAppBtnText: { fontSize: 18 },
  findMoreBtn: { backgroundColor: '#6366F1', padding: 14, borderRadius: 12, alignItems: 'center' },
  findMoreBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  guideStep: { flexDirection: 'row', gap: 14 },
  guideStepNumber: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  guideStepNumberText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  guideStepTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  guideStepContent: { fontSize: 13, color: '#374151', lineHeight: 20 },
  warningBox: { backgroundColor: '#FEF3C7', borderRadius: 8, padding: 10, marginTop: 8, borderLeftWidth: 3, borderLeftColor: '#F59E0B' },
  warningText: { fontSize: 12, color: '#D97706', fontWeight: '600' },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyStateText: { fontSize: 16, color: '#6B7280' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  modalCancel: { fontSize: 16, color: '#6B7280' },
  escrowPropertyCard: { backgroundColor: '#EEF2FF', borderRadius: 12, padding: 16, marginBottom: 16 },
  escrowPropertyTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  escrowPropertyPrice: { fontSize: 22, fontWeight: '800', color: '#059669' },
  escrowPropertyNgn: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  escrowBreakdown: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  escrowBreakdownTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 12 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  breakdownLabel: { fontSize: 13, color: '#6B7280' },
  breakdownValue: { fontSize: 13, fontWeight: '600', color: '#111827' },
  breakdownTotal: { borderBottomWidth: 0, paddingTop: 10, marginTop: 4, borderTopWidth: 2, borderTopColor: '#E5E7EB' },
  breakdownTotalLabel: { fontSize: 15, fontWeight: '800', color: '#111827' },
  breakdownTotalValue: { fontSize: 15, fontWeight: '800', color: '#059669' },
  escrowWarning: { backgroundColor: '#D1FAE5', borderRadius: 10, padding: 12, marginBottom: 16 },
  escrowWarningText: { fontSize: 13, color: '#059669', lineHeight: 20 },
  escrowConfirmBtn: { backgroundColor: '#6366F1', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 32 },
  escrowConfirmBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  currencyOption: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  currencyOptionActive: { backgroundColor: '#EEF2FF' },
  currencyOptionFlag: { fontSize: 28 },
  currencyOptionCode: { fontSize: 16, fontWeight: '700', color: '#111827' },
  currencyOptionLabel: { fontSize: 13, color: '#6B7280' },
  currencyOptionCheck: { marginLeft: 'auto', fontSize: 20, color: '#6366F1', fontWeight: '800' },
});
