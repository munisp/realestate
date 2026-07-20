/**
 * AgentCRMScreen.tsx
 * ==================
 * Full-featured Agent CRM screen for the Nigerian real estate mobile app.
 *
 * Tabs:
 *  1. Pipeline — Kanban-style lead pipeline with stage cards
 *  2. Showings — Upcoming property viewings calendar
 *  3. Follow-ups — Today's tasks with action buttons
 *  4. Performance — KPI dashboard with charts
 *  5. Commission — Earnings tracker
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  FlatList, Alert, RefreshControl, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { trpc } from '../lib/trpc';

// ── Types ─────────────────────────────────────────────────────────────────────
type LeadStage = 'new' | 'contacted' | 'qualified' | 'showing_scheduled' |
                 'offer_made' | 'under_contract' | 'closed' | 'lost';

interface Lead {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  budget?: number;
  stage: LeadStage;
  score: number;
  preferredCity?: string;
  nextFollowUp: string;
  tags: string[];
  notes?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const STAGE_LABELS: Record<LeadStage, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  showing_scheduled: 'Showing Set',
  offer_made: 'Offer Made',
  under_contract: 'Under Contract',
  closed: 'Closed',
  lost: 'Lost',
};

const STAGE_COLORS: Record<LeadStage, string> = {
  new: '#6366F1',
  contacted: '#3B82F6',
  qualified: '#10B981',
  showing_scheduled: '#F59E0B',
  offer_made: '#EF4444',
  under_contract: '#8B5CF6',
  closed: '#059669',
  lost: '#9CA3AF',
};

const SCORE_COLOR = (score: number) => {
  if (score >= 70) return '#059669';
  if (score >= 40) return '#F59E0B';
  return '#EF4444';
};

const formatNaira = (amount: number) =>
  `₦${(amount / 1_000_000).toFixed(1)}M`;

// ── Sub-components ────────────────────────────────────────────────────────────
const ScoreBadge = ({ score }: { score: number }) => (
  <View style={[styles.scoreBadge, { backgroundColor: SCORE_COLOR(score) }]}>
    <Text style={styles.scoreBadgeText}>{score}</Text>
  </View>
);

const StagePill = ({ stage }: { stage: LeadStage }) => (
  <View style={[styles.stagePill, { backgroundColor: STAGE_COLORS[stage] + '20', borderColor: STAGE_COLORS[stage] }]}>
    <Text style={[styles.stagePillText, { color: STAGE_COLORS[stage] }]}>
      {STAGE_LABELS[stage]}
    </Text>
  </View>
);

const KPICard = ({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) => (
  <View style={styles.kpiCard}>
    <Text style={styles.kpiLabel}>{label}</Text>
    <Text style={[styles.kpiValue, color ? { color } : {}]}>{value}</Text>
    {sub && <Text style={styles.kpiSub}>{sub}</Text>}
  </View>
);

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function AgentCRMScreen() {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'showings' | 'followups' | 'performance' | 'commission'>('pipeline');
  const [stageFilter, setStageFilter] = useState<LeadStage | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddLead, setShowAddLead] = useState(false);
  const [newLead, setNewLead] = useState({ firstName: '', lastName: '', phone: '', budget: '' });

  // tRPC queries
  const leadsQuery = trpc.agentCRM.getLeads.useQuery({ stage: stageFilter, limit: 100 });
  const showingsQuery = trpc.agentCRM.getUpcomingShowings.useQuery({ days: 14 });
  const followUpsQuery = trpc.agentCRM.getTodayFollowUps.useQuery();
  const performanceQuery = trpc.agentCRM.getPerformanceDashboard.useQuery({ period: 'month' });
  const commissionsQuery = trpc.agentCRM.getCommissions.useQuery({ period: 'year' });

  const upsertLead = trpc.agentCRM.upsertLead.useMutation({
    onSuccess: () => { leadsQuery.refetch(); setShowAddLead(false); },
  });
  const completeFollowUp = trpc.agentCRM.completeFollowUp.useMutation({
    onSuccess: () => followUpsQuery.refetch(),
  });
  const advanceStage = trpc.agentCRM.advanceLeadStage.useMutation({
    onSuccess: () => leadsQuery.refetch(),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      leadsQuery.refetch(), showingsQuery.refetch(),
      followUpsQuery.refetch(), performanceQuery.refetch(),
    ]);
    setRefreshing(false);
  }, []);

  // ── Pipeline Tab ────────────────────────────────────────────────────────────
  const renderPipeline = () => {
    const leads = leadsQuery.data?.leads ?? [];
    const summary = leadsQuery.data?.summary ?? {};
    const pipelineValue = leadsQuery.data?.totalPipelineValue ?? 0;

    return (
      <View style={{ flex: 1 }}>
        {/* Pipeline value banner */}
        <View style={styles.pipelineBanner}>
          <Text style={styles.pipelineBannerLabel}>Total Pipeline Value</Text>
          <Text style={styles.pipelineBannerValue}>{formatNaira(pipelineValue)}</Text>
        </View>

        {/* Stage filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stageFilterRow}>
          <TouchableOpacity
            style={[styles.stageChip, !stageFilter && styles.stageChipActive]}
            onPress={() => setStageFilter(undefined)}
          >
            <Text style={[styles.stageChipText, !stageFilter && styles.stageChipTextActive]}>
              All ({leads.length})
            </Text>
          </TouchableOpacity>
          {(Object.keys(STAGE_LABELS) as LeadStage[]).map(stage => (
            <TouchableOpacity
              key={stage}
              style={[styles.stageChip, stageFilter === stage && styles.stageChipActive,
                      { borderColor: STAGE_COLORS[stage] }]}
              onPress={() => setStageFilter(stageFilter === stage ? undefined : stage)}
            >
              <Text style={[styles.stageChipText, stageFilter === stage && { color: STAGE_COLORS[stage] }]}>
                {STAGE_LABELS[stage]} ({summary[stage] ?? 0})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Lead cards */}
        <FlatList
          data={leads}
          keyExtractor={item => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item: lead }) => (
            <View style={styles.leadCard}>
              <View style={styles.leadCardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.leadName}>{lead.firstName} {lead.lastName}</Text>
                  <Text style={styles.leadPhone}>{lead.phone}</Text>
                </View>
                <ScoreBadge score={lead.score} />
              </View>

              <View style={styles.leadCardMeta}>
                <StagePill stage={lead.stage} />
                {lead.budget && (
                  <Text style={styles.leadBudget}>{formatNaira(lead.budget)}</Text>
                )}
                {lead.preferredCity && (
                  <Text style={styles.leadCity}>📍 {lead.preferredCity}</Text>
                )}
              </View>

              {lead.notes && (
                <Text style={styles.leadNotes} numberOfLines={2}>{lead.notes}</Text>
              )}

              <View style={styles.leadCardFooter}>
                <Text style={styles.leadFollowUp}>
                  Follow-up: {new Date(lead.nextFollowUp).toLocaleDateString('en-NG')}
                </Text>
                <View style={styles.leadActions}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => Alert.alert('Call', `Calling ${lead.phone}...`)}
                  >
                    <Text style={styles.actionBtnText}>📞</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => Alert.alert('WhatsApp', `Opening WhatsApp for ${lead.firstName}...`)}
                  >
                    <Text style={styles.actionBtnText}>💬</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#6366F1' }]}
                    onPress={() => {
                      const stages = Object.keys(STAGE_LABELS) as LeadStage[];
                      const currentIdx = stages.indexOf(lead.stage);
                      const nextStage = stages[currentIdx + 1];
                      if (nextStage && nextStage !== 'lost') {
                        advanceStage.mutate({ leadId: lead.id, newStage: nextStage });
                      }
                    }}
                  >
                    <Text style={[styles.actionBtnText, { color: '#fff' }]}>→</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No leads yet</Text>
              <Text style={styles.emptyStateSub}>Add your first lead to get started</Text>
            </View>
          }
        />
      </View>
    );
  };

  // ── Showings Tab ────────────────────────────────────────────────────────────
  const renderShowings = () => {
    const showings = showingsQuery.data?.showings ?? [];
    return (
      <FlatList
        data={showings}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View style={styles.showingsSummary}>
            <Text style={styles.showingsSummaryText}>
              {showingsQuery.data?.totalThisWeek ?? 0} this week · {showingsQuery.data?.totalThisMonth ?? 0} total
            </Text>
          </View>
        }
        renderItem={({ item: showing }) => (
          <View style={styles.showingCard}>
            <View style={styles.showingDateBadge}>
              <Text style={styles.showingDay}>
                {new Date(showing.scheduledAt).toLocaleDateString('en-NG', { weekday: 'short' })}
              </Text>
              <Text style={styles.showingDate}>
                {new Date(showing.scheduledAt).getDate()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.showingTitle} numberOfLines={1}>{showing.propertyTitle}</Text>
              <Text style={styles.showingAddress} numberOfLines={1}>{showing.propertyAddress}</Text>
              <Text style={styles.showingBuyer}>👤 {showing.buyerName}</Text>
              <View style={styles.showingMeta}>
                <Text style={styles.showingTime}>
                  🕐 {new Date(showing.scheduledAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Text style={styles.showingType}>
                  {showing.tourType === 'virtual' ? '💻 Virtual' : '🏠 In-Person'}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: '#10B98120' }]}>
                  <Text style={[styles.statusBadgeText, { color: '#10B981' }]}>
                    {showing.status}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No upcoming showings</Text>
          </View>
        }
      />
    );
  };

  // ── Follow-ups Tab ──────────────────────────────────────────────────────────
  const renderFollowUps = () => {
    const followUps = followUpsQuery.data?.followUps ?? [];
    return (
      <FlatList
        data={followUps}
        keyExtractor={item => String(item.leadId)}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListHeaderComponent={
          <View style={styles.followUpHeader}>
            <Text style={styles.followUpHeaderText}>
              {followUpsQuery.data?.highPriority ?? 0} high priority · {followUpsQuery.data?.overdue ?? 0} overdue
            </Text>
          </View>
        }
        renderItem={({ item: fu }) => (
          <View style={[styles.followUpCard, fu.priority === 'high' && styles.followUpCardHigh]}>
            <View style={styles.followUpCardHeader}>
              <Text style={styles.followUpName}>{fu.leadName}</Text>
              <View style={[styles.priorityBadge,
                { backgroundColor: fu.priority === 'high' ? '#FEE2E2' : fu.priority === 'medium' ? '#FEF3C7' : '#F3F4F6' }]}>
                <Text style={[styles.priorityBadgeText,
                  { color: fu.priority === 'high' ? '#EF4444' : fu.priority === 'medium' ? '#F59E0B' : '#6B7280' }]}>
                  {fu.priority}
                </Text>
              </View>
            </View>
            <Text style={styles.followUpNote}>{fu.note}</Text>
            <Text style={styles.followUpTime}>
              Due: {new Date(fu.dueAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <View style={styles.followUpActions}>
              {['call', 'whatsapp', 'email'].map(action => (
                <TouchableOpacity
                  key={action}
                  style={styles.followUpActionBtn}
                  onPress={() => {
                    completeFollowUp.mutate({
                      leadId: fu.leadId,
                      action: action as any,
                      outcome: 'reached',
                      nextFollowUpDays: 3,
                    });
                  }}
                >
                  <Text style={styles.followUpActionText}>
                    {action === 'call' ? '📞 Call' : action === 'whatsapp' ? '💬 WhatsApp' : '✉️ Email'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>✅ All caught up!</Text>
            <Text style={styles.emptyStateSub}>No follow-ups due today</Text>
          </View>
        }
      />
    );
  };

  // ── Performance Tab ─────────────────────────────────────────────────────────
  const renderPerformance = () => {
    const p = performanceQuery.data;
    if (!p) return <View style={styles.emptyState}><Text>Loading...</Text></View>;

    return (
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <Text style={styles.sectionTitle}>Listings</Text>
        <View style={styles.kpiRow}>
          <KPICard label="Active" value={String(p.listings.active)} color="#10B981" />
          <KPICard label="Sold" value={String(p.listings.sold)} color="#6366F1" />
          <KPICard label="Avg DOM" value={`${p.listings.avgDaysOnMarket}d`} />
        </View>

        <Text style={styles.sectionTitle}>Lead Pipeline</Text>
        <View style={styles.kpiRow}>
          <KPICard label="Total" value={String(p.leads.total)} />
          <KPICard label="Hot" value={String(p.leads.hotLeads)} color="#EF4444" />
          <KPICard label="Conversion" value={`${p.leads.conversionRate}%`} color="#10B981" />
        </View>

        <Text style={styles.sectionTitle}>Showings</Text>
        <View style={styles.kpiRow}>
          <KPICard label="Scheduled" value={String(p.showings.scheduled)} />
          <KPICard label="Completed" value={String(p.showings.completed)} color="#10B981" />
          <KPICard label="Rate" value={`${p.showings.completionRate}%`} />
        </View>

        <Text style={styles.sectionTitle}>Revenue</Text>
        <View style={styles.kpiRow}>
          <KPICard label="Earned" value={formatNaira(p.revenue.paidCommission)} color="#10B981" />
          <KPICard label="Pending" value={formatNaira(p.revenue.pendingCommission)} color="#F59E0B" />
          <KPICard label="YTD" value={`${(p.revenue.ytdProgress * 100).toFixed(0)}%`} />
        </View>

        {/* Progress bar for YTD target */}
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>YTD Commission Target</Text>
            <Text style={styles.progressValue}>{formatNaira(p.revenue.totalCommission)} / {formatNaira(50_000_000)}</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min(100, p.revenue.ytdProgress * 100)}%` }]} />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Client Satisfaction</Text>
        <View style={styles.satisfactionCard}>
          <Text style={styles.ratingBig}>⭐ {p.clientSatisfaction.avgRating}</Text>
          <Text style={styles.ratingMeta}>{p.clientSatisfaction.totalReviews} reviews · NPS {p.clientSatisfaction.npsScore}</Text>
        </View>
      </ScrollView>
    );
  };

  // ── Commission Tab ──────────────────────────────────────────────────────────
  const renderCommission = () => {
    const data = commissionsQuery.data;
    if (!data) return <View style={styles.emptyState}><Text>Loading...</Text></View>;

    return (
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View style={styles.commissionSummary}>
          <View style={styles.commissionSummaryItem}>
            <Text style={styles.commissionSummaryLabel}>Total Earned</Text>
            <Text style={[styles.commissionSummaryValue, { color: '#10B981' }]}>
              {formatNaira(data.summary.totalEarned)}
            </Text>
          </View>
          <View style={styles.commissionSummaryItem}>
            <Text style={styles.commissionSummaryLabel}>Pending</Text>
            <Text style={[styles.commissionSummaryValue, { color: '#F59E0B' }]}>
              {formatNaira(data.summary.totalPending)}
            </Text>
          </View>
          <View style={styles.commissionSummaryItem}>
            <Text style={styles.commissionSummaryLabel}>Avg/Deal</Text>
            <Text style={styles.commissionSummaryValue}>
              {formatNaira(data.summary.avgCommissionPerDeal)}
            </Text>
          </View>
        </View>

        {data.commissions.map(c => (
          <View key={c.id} style={styles.commissionCard}>
            <View style={styles.commissionCardHeader}>
              <Text style={styles.commissionProperty} numberOfLines={1}>{c.propertyTitle}</Text>
              <View style={[styles.statusBadge,
                { backgroundColor: c.status === 'paid' ? '#D1FAE5' : c.status === 'pending' ? '#FEF3C7' : '#EDE9FE' }]}>
                <Text style={[styles.statusBadgeText,
                  { color: c.status === 'paid' ? '#059669' : c.status === 'pending' ? '#D97706' : '#7C3AED' }]}>
                  {c.status}
                </Text>
              </View>
            </View>
            <View style={styles.commissionCardBody}>
              <Text style={styles.commissionAmount}>₦{c.commissionAmount.toLocaleString()}</Text>
              <Text style={styles.commissionRate}>{(c.commissionRate * 100).toFixed(1)}% of {formatNaira(c.salePrice)}</Text>
            </View>
            <Text style={styles.commissionDate}>
              {new Date(c.transactionDate).toLocaleDateString('en-NG')}
              {c.paidAt ? ` · Paid ${new Date(c.paidAt).toLocaleDateString('en-NG')}` : ''}
            </Text>
          </View>
        ))}
      </ScrollView>
    );
  };

  // ── Add Lead Modal ──────────────────────────────────────────────────────────
  const renderAddLeadModal = () => (
    <Modal visible={showAddLead} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowAddLead(false)}>
            <Text style={styles.modalCancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Add Lead</Text>
          <TouchableOpacity onPress={() => {
            if (!newLead.firstName || !newLead.phone) {
              Alert.alert('Required', 'First name and phone are required');
              return;
            }
            upsertLead.mutate({
              firstName: newLead.firstName,
              lastName: newLead.lastName,
              phone: newLead.phone,
              budget: newLead.budget ? Number(newLead.budget) : undefined,
              stage: 'new',
            });
          }}>
            <Text style={styles.modalSave}>Save</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={{ padding: 16 }}>
          {[
            { label: 'First Name *', key: 'firstName', placeholder: 'Chidi' },
            { label: 'Last Name', key: 'lastName', placeholder: 'Okafor' },
            { label: 'Phone *', key: 'phone', placeholder: '+234 80X XXX XXXX' },
            { label: 'Budget (₦)', key: 'budget', placeholder: '30000000' },
          ].map(field => (
            <View key={field.key} style={styles.formField}>
              <Text style={styles.formLabel}>{field.label}</Text>
              <TextInput
                style={styles.formInput}
                placeholder={field.placeholder}
                value={(newLead as any)[field.key]}
                onChangeText={val => setNewLead(prev => ({ ...prev, [field.key]: val }))}
                keyboardType={field.key === 'phone' || field.key === 'budget' ? 'phone-pad' : 'default'}
              />
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  const tabs = [
    { key: 'pipeline', label: 'Pipeline' },
    { key: 'showings', label: 'Showings' },
    { key: 'followups', label: 'Tasks' },
    { key: 'performance', label: 'KPIs' },
    { key: 'commission', label: 'Commission' },
  ] as const;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Agent CRM</Text>
        {activeTab === 'pipeline' && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddLead(true)}>
            <Text style={styles.addBtnText}>+ Lead</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tab bar */}
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

      {/* Content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'pipeline' && renderPipeline()}
        {activeTab === 'showings' && renderShowings()}
        {activeTab === 'followups' && renderFollowUps()}
        {activeTab === 'performance' && renderPerformance()}
        {activeTab === 'commission' && renderCommission()}
      </View>

      {renderAddLeadModal()}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  addBtn: { backgroundColor: '#6366F1', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  tabBar: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', flexGrow: 0 },
  tab: { paddingHorizontal: 16, paddingVertical: 12 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#6366F1' },
  tabText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  tabTextActive: { color: '#6366F1', fontWeight: '700' },
  pipelineBanner: { backgroundColor: '#6366F1', padding: 12, alignItems: 'center' },
  pipelineBannerLabel: { color: '#C7D2FE', fontSize: 12 },
  pipelineBannerValue: { color: '#fff', fontSize: 22, fontWeight: '800' },
  stageFilterRow: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 8, flexGrow: 0 },
  stageChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', marginRight: 8, backgroundColor: '#fff' },
  stageChipActive: { backgroundColor: '#EEF2FF', borderColor: '#6366F1' },
  stageChipText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  stageChipTextActive: { color: '#6366F1', fontWeight: '700' },
  leadCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  leadCardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  leadName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  leadPhone: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  scoreBadge: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  scoreBadgeText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  leadCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  stagePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1 },
  stagePillText: { fontSize: 11, fontWeight: '600' },
  leadBudget: { fontSize: 13, fontWeight: '700', color: '#059669' },
  leadCity: { fontSize: 12, color: '#6B7280' },
  leadNotes: { fontSize: 12, color: '#6B7280', marginBottom: 8, fontStyle: 'italic' },
  leadCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  leadFollowUp: { fontSize: 11, color: '#9CA3AF' },
  leadActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  actionBtnText: { fontSize: 16 },
  showingsSummary: { backgroundColor: '#EEF2FF', padding: 12, borderRadius: 8, marginBottom: 8 },
  showingsSummaryText: { color: '#6366F1', fontWeight: '600', textAlign: 'center' },
  showingCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', gap: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  showingDateBadge: { width: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF2FF', borderRadius: 8, padding: 8 },
  showingDay: { fontSize: 11, color: '#6366F1', fontWeight: '600' },
  showingDate: { fontSize: 22, fontWeight: '800', color: '#6366F1' },
  showingTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  showingAddress: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  showingBuyer: { fontSize: 12, color: '#374151', marginTop: 4 },
  showingMeta: { flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' },
  showingTime: { fontSize: 12, color: '#6B7280' },
  showingType: { fontSize: 12, color: '#6B7280' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },
  followUpHeader: { backgroundColor: '#FEF3C7', padding: 12, borderRadius: 8, marginBottom: 8 },
  followUpHeaderText: { color: '#D97706', fontWeight: '600', textAlign: 'center' },
  followUpCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  followUpCardHigh: { borderLeftWidth: 3, borderLeftColor: '#EF4444' },
  followUpCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  followUpName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  priorityBadgeText: { fontSize: 11, fontWeight: '600' },
  followUpNote: { fontSize: 13, color: '#374151', marginBottom: 4 },
  followUpTime: { fontSize: 12, color: '#9CA3AF', marginBottom: 10 },
  followUpActions: { flexDirection: 'row', gap: 8 },
  followUpActionBtn: { flex: 1, backgroundColor: '#F3F4F6', padding: 8, borderRadius: 8, alignItems: 'center' },
  followUpActionText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 4 },
  kpiRow: { flexDirection: 'row', gap: 12 },
  kpiCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  kpiLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '500', marginBottom: 4 },
  kpiValue: { fontSize: 20, fontWeight: '800', color: '#111827' },
  kpiSub: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  progressContainer: { backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 13, color: '#374151', fontWeight: '600' },
  progressValue: { fontSize: 12, color: '#6B7280' },
  progressBar: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#6366F1', borderRadius: 4 },
  satisfactionCard: { backgroundColor: '#fff', borderRadius: 12, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  ratingBig: { fontSize: 36, fontWeight: '800', color: '#111827' },
  ratingMeta: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  commissionSummary: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  commissionSummaryItem: { flex: 1, alignItems: 'center' },
  commissionSummaryLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
  commissionSummaryValue: { fontSize: 16, fontWeight: '800', color: '#111827', marginTop: 4 },
  commissionCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  commissionCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  commissionProperty: { flex: 1, fontSize: 14, fontWeight: '600', color: '#111827', marginRight: 8 },
  commissionCardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 },
  commissionAmount: { fontSize: 18, fontWeight: '800', color: '#059669' },
  commissionRate: { fontSize: 12, color: '#6B7280' },
  commissionDate: { fontSize: 11, color: '#9CA3AF' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyStateText: { fontSize: 18, fontWeight: '700', color: '#374151' },
  emptyStateSub: { fontSize: 14, color: '#9CA3AF', marginTop: 8, textAlign: 'center' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  modalCancel: { fontSize: 16, color: '#6B7280' },
  modalSave: { fontSize: 16, color: '#6366F1', fontWeight: '700' },
  formField: { marginBottom: 16 },
  formLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  formInput: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 15, backgroundColor: '#F9FAFB' },
});
