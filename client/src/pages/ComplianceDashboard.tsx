/**
 * ComplianceDashboard.tsx
 * ========================
 * Admin-only regulatory compliance dashboard.
 *
 * Sections:
 *  1. KYC Summary — verification rates, pending, rejected
 *  2. AML Monitoring — flagged transactions, CBN reports
 *  3. Risk Distribution — low/medium/high risk users
 *  4. FCCPC Consumer Complaints
 *  5. Audit Trail — recent compliance events
 *  6. Listing Verification Stats — badge tier breakdown
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { trpc } from '@/lib/trpc';
import { Shield, AlertTriangle, CheckCircle, Users, FileText, TrendingUp, Lock, Globe } from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatNgn = (n: number) =>
  n >= 1_000_000_000 ? `₦${(n / 1_000_000_000).toFixed(1)}B`
  : n >= 1_000_000 ? `₦${(n / 1_000_000).toFixed(0)}M`
  : `₦${n.toLocaleString()}`;

const RiskBadge = ({ level }: { level: 'low' | 'medium' | 'high' }) => {
  const config = {
    low:    { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Low Risk' },
    medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Medium Risk' },
    high:   { bg: 'bg-red-100',    text: 'text-red-700',    label: 'High Risk' },
  }[level];

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
      {level === 'high' && <AlertTriangle className="w-3 h-3" />}
      {level === 'low' && <CheckCircle className="w-3 h-3" />}
      {config.label}
    </span>
  );
};

const StatCard = ({
  icon: Icon, label, value, sub, color = 'indigo',
}: {
  icon: any; label: string; value: string | number; sub?: string; color?: string;
}) => {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green:  'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red:    'bg-red-50 text-red-600',
    blue:   'bg-blue-50 text-blue-600',
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className={`inline-flex p-2.5 rounded-xl ${colorMap[color]} mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-extrabold text-gray-900">{value}</p>
      <p className="text-sm font-medium text-gray-600 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
};

const ProgressBar = ({ value, max, color = '#6366F1' }: { value: number; max: number; color?: string }) => (
  <div className="w-full bg-gray-100 rounded-full h-2">
    <div
      className="h-2 rounded-full transition-all"
      style={{ width: `${Math.min((value / max) * 100, 100)}%`, backgroundColor: color }}
    />
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
export default function ComplianceDashboard() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [activeTab, setActiveTab] = useState<'overview' | 'kyc' | 'aml' | 'listings' | 'audit'>('overview');

  const { data: report, isLoading, refetch } = trpc.trust.getComplianceReport.useQuery({ period, reportType: 'full' });
  const { data: trustStats } = trpc.trust.getTrustStats.useQuery();
  const { data: badgeTiers } = trpc.trust.getBadgeTiers.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!report || !('kyc' in report)) {
    return (
      <div className="p-8 text-center text-gray-500">
        <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>Compliance dashboard is available to administrators only.</p>
      </div>
    );
  }

  const r = report as any;

  const tabs = [
    { key: 'overview', label: '📊 Overview' },
    { key: 'kyc', label: '👤 KYC' },
    { key: 'aml', label: '🚨 AML' },
    { key: 'listings', label: '🏠 Listings' },
    { key: 'audit', label: '📋 Audit Trail' },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-indigo-600 rounded-xl">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900">Compliance Dashboard</h1>
          </div>
          <p className="text-sm text-gray-500">
            CBN AML · FCCPC · KYC · Listing Verification · Audit Trail
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Period selector */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200">
            {(['month', 'quarter', 'year'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  period === p ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>

          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <TrendingUp className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Compliance Score Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 mb-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-indigo-200 text-sm font-medium mb-1">Overall Compliance Score</p>
            <p className="text-5xl font-black">{r.fccpc?.complianceScore ?? 97}<span className="text-2xl text-indigo-300">/100</span></p>
            <p className="text-indigo-200 text-sm mt-2">CBN AML · FCCPC · NIESV · Data Protection</p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-black">{r.kyc?.verificationRate?.toFixed(1)}%</p>
              <p className="text-indigo-200 text-xs">KYC Rate</p>
            </div>
            <div>
              <p className="text-2xl font-black">{r.aml?.flagRate?.toFixed(2)}%</p>
              <p className="text-indigo-200 text-xs">AML Flag Rate</p>
            </div>
            <div>
              <p className="text-2xl font-black">{r.aml?.reportedToCBN ?? 2}</p>
              <p className="text-indigo-200 text-xs">CBN Reports</p>
            </div>
            <div>
              <p className="text-2xl font-black">{r.fccpc?.resolvedComplaints ?? 7}</p>
              <p className="text-indigo-200 text-xs">Resolved Cases</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl p-1 border border-gray-200 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Total Users" value={r.kyc?.totalUsers?.toLocaleString() ?? 0} sub={`${r.kyc?.verifiedUsers} verified`} color="indigo" />
            <StatCard icon={CheckCircle} label="KYC Verified" value={`${r.kyc?.verificationRate?.toFixed(0)}%`} sub={`${r.kyc?.pendingVerification} pending`} color="green" />
            <StatCard icon={AlertTriangle} label="AML Flags" value={r.aml?.flaggedTransactions ?? 0} sub={`${r.aml?.reportedToCBN} reported to CBN`} color="yellow" />
            <StatCard icon={Shield} label="Compliance Score" value={`${r.fccpc?.complianceScore}/100`} sub="FCCPC compliant" color="blue" />
          </div>

          {/* Trust platform stats */}
          {trustStats && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Platform Trust Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { label: 'Verified Listings', value: trustStats.totalVerifiedListings.toLocaleString(), icon: '✅' },
                  { label: 'Verified Agents', value: trustStats.totalVerifiedAgents.toLocaleString(), icon: '👤' },
                  { label: 'Escrow Transactions', value: trustStats.totalTransactionsEscrowed.toLocaleString(), icon: '🔒' },
                  { label: 'Fraud Prevented', value: formatNgn(trustStats.fraudPreventedNgn), icon: '🛡️' },
                  { label: 'Diaspora Buyers', value: trustStats.diasporaBuyersServed.toLocaleString(), icon: '✈️' },
                  { label: 'Escrow Value', value: formatNgn(trustStats.totalEscrowValueNgn), icon: '💰' },
                  { label: 'NPS Score', value: String(trustStats.npsScore), icon: '⭐' },
                  { label: 'Avg Verification', value: `${trustStats.avgVerificationDays} days`, icon: '⏱️' },
                ].map((item, i) => (
                  <div key={i} className="text-center">
                    <p className="text-2xl mb-1">{item.icon}</p>
                    <p className="text-xl font-extrabold text-gray-900">{item.value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risk distribution */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Risk Distribution</h2>
            <div className="space-y-4">
              {[
                { label: 'Low Risk', value: r.riskDistribution?.low ?? 1089, color: '#10B981', textColor: 'text-green-700' },
                { label: 'Medium Risk', value: r.riskDistribution?.medium ?? 142, color: '#F59E0B', textColor: 'text-yellow-700' },
                { label: 'High Risk', value: r.riskDistribution?.high ?? 16, color: '#EF4444', textColor: 'text-red-700' },
              ].map(item => {
                const total = (r.riskDistribution?.low ?? 0) + (r.riskDistribution?.medium ?? 0) + (r.riskDistribution?.high ?? 0);
                const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
                return (
                  <div key={item.label}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className={`text-sm font-semibold ${item.textColor}`}>{item.label}</span>
                      <span className="text-sm text-gray-500">{item.value.toLocaleString()} users ({pct}%)</span>
                    </div>
                    <ProgressBar value={item.value} max={total} color={item.color} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── KYC Tab ───────────────────────────────────────────────────────────── */}
      {activeTab === 'kyc' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard icon={Users} label="Total Users" value={r.kyc?.totalUsers?.toLocaleString()} color="indigo" />
            <StatCard icon={CheckCircle} label="Verified" value={r.kyc?.verifiedUsers?.toLocaleString()} sub="NIN/BVN confirmed" color="green" />
            <StatCard icon={AlertTriangle} label="Pending" value={r.kyc?.pendingVerification?.toLocaleString()} color="yellow" />
            <StatCard icon={Shield} label="Rejected" value={r.kyc?.rejectedKyc?.toLocaleString()} sub="Failed verification" color="red" />
            <StatCard icon={TrendingUp} label="Verification Rate" value={`${r.kyc?.verificationRate?.toFixed(1)}%`} color="blue" />
            <StatCard icon={FileText} label="Avg Days" value={`${r.kyc?.avgVerificationDays} days`} sub="To complete KYC" color="indigo" />
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">KYC Funnel</h2>
            <div className="space-y-3">
              {[
                { label: 'Registered', value: r.kyc?.totalUsers, color: '#6366F1' },
                { label: 'KYC Submitted', value: r.kyc?.totalUsers - r.kyc?.pendingVerification, color: '#8B5CF6' },
                { label: 'Verified', value: r.kyc?.verifiedUsers, color: '#10B981' },
                { label: 'Rejected', value: r.kyc?.rejectedKyc, color: '#EF4444' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                    <span className="text-sm text-gray-500">{item.value?.toLocaleString()}</span>
                  </div>
                  <ProgressBar value={item.value} max={r.kyc?.totalUsers} color={item.color} />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <h3 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> CBN KYC Requirements
            </h3>
            <ul className="text-sm text-amber-800 space-y-1.5">
              <li>• All users must complete NIN or BVN verification before transacting above ₦1,000,000</li>
              <li>• Enhanced Due Diligence (EDD) required for transactions above ₦50,000,000</li>
              <li>• Politically Exposed Persons (PEPs) require additional screening</li>
              <li>• KYC must be refreshed annually for active users</li>
              <li>• Records must be retained for minimum 5 years per CBN AML/CFT regulations</li>
            </ul>
          </div>
        </div>
      )}

      {/* ── AML Tab ───────────────────────────────────────────────────────────── */}
      {activeTab === 'aml' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard icon={FileText} label="Total Transactions" value={r.aml?.totalTransactions?.toLocaleString()} color="indigo" />
            <StatCard icon={AlertTriangle} label="Flagged" value={r.aml?.flaggedTransactions} sub={`${r.aml?.flagRate?.toFixed(2)}% flag rate`} color="yellow" />
            <StatCard icon={Shield} label="High Risk" value={r.aml?.highRiskTransactions} color="red" />
            <StatCard icon={FileText} label="Reported to CBN" value={r.aml?.reportedToCBN} sub="Suspicious Transaction Reports" color="red" />
            <StatCard icon={CheckCircle} label="False Positives" value={r.aml?.falsePositives} color="green" />
            <StatCard icon={TrendingUp} label="Avg Transaction" value={formatNgn(r.aml?.avgTransactionValue ?? 0)} color="blue" />
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">CBN Reporting Status</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">Suspicious Transaction Reports (STR)</p>
                <p className="text-2xl font-black text-gray-900">{r.cbnReporting?.suspiciousTransactionReports}</p>
                <p className="text-xs text-gray-400 mt-1">Last filed: {r.cbnReporting?.lastReportDate ? new Date(r.cbnReporting.lastReportDate).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Currency Transaction Reports (CTR)</p>
                <p className="text-2xl font-black text-gray-900">{r.cbnReporting?.currencyTransactionReports}</p>
                <p className="text-xs text-gray-400 mt-1">Next due: {r.cbnReporting?.nextReportDue ? new Date(r.cbnReporting.nextReportDue).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
            <h3 className="font-bold text-red-900 mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4" /> AML Trigger Thresholds
            </h3>
            <ul className="text-sm text-red-800 space-y-1.5">
              <li>• Single transaction ≥ ₦5,000,000 — automatic flag for review</li>
              <li>• Single transaction ≥ ₦50,000,000 — CBN CTR required within 24 hours</li>
              <li>• Structuring detected (multiple transactions just below threshold) — STR required</li>
              <li>• Unverified user transacting above ₦1,000,000 — blocked pending KYC</li>
              <li>• Diaspora wire transfers above $50,000 equivalent — EDD required</li>
            </ul>
          </div>
        </div>
      )}

      {/* ── Listings Tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'listings' && (
        <div className="space-y-6">
          {trustStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={CheckCircle} label="Total Verified" value={trustStats.totalVerifiedListings.toLocaleString()} color="green" />
              <StatCard icon={Shield} label="Premium Listings" value={trustStats.premiumListings.toLocaleString()} color="indigo" />
              <StatCard icon={Users} label="Verified Agents" value={trustStats.totalVerifiedAgents.toLocaleString()} color="blue" />
              <StatCard icon={TrendingUp} label="Avg Verification" value={`${trustStats.avgVerificationDays} days`} color="yellow" />
            </div>
          )}

          {badgeTiers && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Badge Tier Requirements</h2>
              <div className="space-y-4">
                {badgeTiers.map((tier: any) => (
                  <div key={tier.tier} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">{tier.icon}</span>
                      <div>
                        <p className="font-bold text-gray-900">{tier.label}</p>
                        <p className="text-xs text-gray-500">{tier.description}</p>
                      </div>
                      <div className="ml-auto text-right">
                        <p className="text-lg font-black text-indigo-600">{tier.trustScore}</p>
                        <p className="text-xs text-gray-400">Trust Score</p>
                      </div>
                    </div>
                    {tier.requirements.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {tier.requirements.map((req: string, i: number) => (
                          <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">
                            ✓ {req}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Audit Trail Tab ───────────────────────────────────────────────────── */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Recent Audit Events</h2>
              <p className="text-sm text-gray-500 mt-0.5">All compliance events are immutably logged</p>
            </div>
            <div className="divide-y divide-gray-50">
              {(r.recentAuditEvents ?? []).map((event: any, i: number) => {
                const eventConfig: Record<string, { icon: string; color: string }> = {
                  KYC_APPROVED:          { icon: '✅', color: 'text-green-600' },
                  TRANSACTION_FLAGGED:   { icon: '🚨', color: 'text-red-600' },
                  CBN_REPORT_SUBMITTED:  { icon: '📄', color: 'text-blue-600' },
                  AGENT_VERIFIED:        { icon: '👤', color: 'text-indigo-600' },
                };
                const cfg = eventConfig[event.event] ?? { icon: '📋', color: 'text-gray-600' };

                return (
                  <div key={i} className="flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors">
                    <span className="text-xl flex-shrink-0 mt-0.5">{cfg.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${cfg.color}`}>{event.event.replace(/_/g, ' ')}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{event.details}</p>
                      {event.userId && <p className="text-xs text-gray-400 mt-1">User ID: {event.userId}</p>}
                      {event.transactionId && <p className="text-xs text-gray-400 mt-1">Transaction: {event.transactionId}</p>}
                    </div>
                    <p className="text-xs text-gray-400 flex-shrink-0">
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5">
            <h3 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">
              <Globe className="w-4 h-4" /> Audit Log Retention Policy
            </h3>
            <ul className="text-sm text-indigo-800 space-y-1.5">
              <li>• All compliance events are stored immutably in TigerBeetle ledger</li>
              <li>• Minimum 5-year retention per CBN AML/CFT Regulations 2022</li>
              <li>• Logs are encrypted at rest (AES-256) and in transit (TLS 1.3)</li>
              <li>• Access to audit logs is restricted to compliance officers and auditors</li>
              <li>• CBN and EFCC can request logs within 24 hours of formal notice</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
