/**
 * VerificationBadge.tsx
 * ======================
 * Reusable trust badge component for property listings and agent profiles.
 *
 * Variants:
 *  - inline: Small badge for property cards (default)
 *  - card: Full verification card with checklist
 *  - tooltip: Badge with hover tooltip showing checks
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { trpc } from '@/lib/trpc';
import { Shield, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

type BadgeTier = 'unverified' | 'basic' | 'verified' | 'premium';

interface BadgeConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  textColor: string;
}

const BADGE_CONFIG: Record<BadgeTier, BadgeConfig> = {
  unverified: {
    label: 'Unverified',
    color: '#9CA3AF',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-600',
    icon: '⚪',
  },
  basic: {
    label: 'Basic',
    color: '#F59E0B',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
    icon: '🟡',
  },
  verified: {
    label: 'Verified',
    color: '#10B981',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-700',
    icon: '✅',
  },
  premium: {
    label: 'Premium',
    color: '#6366F1',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    textColor: 'text-indigo-700',
    icon: '🏆',
  },
};

// ── Inline Badge (for property cards) ────────────────────────────────────────
export function InlineVerificationBadge({ tier }: { tier: BadgeTier }) {
  const config = BADGE_CONFIG[tier];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${config.bgColor} ${config.borderColor} ${config.textColor}`}>
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
}

// ── Trust Score Ring ──────────────────────────────────────────────────────────
function TrustScoreRing({ score }: { score: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? '#10B981' : score >= 35 ? '#F59E0B' : '#9CA3AF';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="72" height="72" className="-rotate-90">
        <circle cx="36" cy="36" r={radius} fill="none" stroke="#E5E7EB" strokeWidth="6" />
        <circle
          cx="36" cy="36" r={radius} fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-black" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

// ── Check Item ────────────────────────────────────────────────────────────────
function CheckItem({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      {passed
        ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
        : <XCircle className="w-4 h-4 text-gray-300 flex-shrink-0" />
      }
      <span className={`text-sm ${passed ? 'text-gray-800' : 'text-gray-400'}`}>{label}</span>
    </div>
  );
}

// ── Full Verification Card ────────────────────────────────────────────────────
export function VerificationCard({ propertyId }: { propertyId: number }) {
  const { t } = useTranslation();
  const { data, isLoading } = trpc.trust.getListingVerification.useQuery({ propertyId });

  if (isLoading) {
    return (
      <div className="animate-pulse bg-gray-100 rounded-2xl h-48" />
    );
  }

  if (!data) return null;

  const config = BADGE_CONFIG[data.badge as BadgeTier];

  return (
    <div className={`rounded-2xl border-2 p-5 ${config.borderColor} ${config.bgColor}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5" style={{ color: config.color }} />
            <h3 className="font-bold text-gray-900">Listing Verification</h3>
          </div>
          <InlineVerificationBadge tier={data.badge as BadgeTier} />
        </div>
        <TrustScoreRing score={data.trustScore} />
      </div>

      {/* Verification report */}
      <div className="space-y-2 mb-4">
        {Object.entries(data.verificationReport ?? {}).map(([key, value]) => {
          const passed = String(value).startsWith('✅');
          return (
            <div key={key} className="flex items-start gap-2">
              <span className="text-sm">{String(value)}</span>
            </div>
          );
        })}
      </div>

      {/* Dates */}
      {data.verifiedAt && (
        <div className="text-xs text-gray-500 border-t border-gray-200 pt-3 mt-3">
          <span>Verified: {new Date(data.verifiedAt).toLocaleDateString()}</span>
          {data.nextReviewAt && (
            <span className="ml-3">Next review: {new Date(data.nextReviewAt).toLocaleDateString()}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tooltip Badge (for property cards with hover detail) ──────────────────────
export function TooltipVerificationBadge({
  propertyId,
  tier,
}: {
  propertyId: number;
  tier: BadgeTier;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const { data } = trpc.trust.getListingVerification.useQuery(
    { propertyId },
    { enabled: showTooltip }
  );

  const config = BADGE_CONFIG[tier];

  return (
    <div className="relative inline-block">
      <button
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all hover:shadow-sm ${config.bgColor} ${config.borderColor} ${config.textColor}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
      >
        <span>{config.icon}</span>
        {config.label}
        <Info className="w-3 h-3 opacity-60" />
      </button>

      {showTooltip && (
        <div className="absolute bottom-full left-0 mb-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 p-4 z-50">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4" style={{ color: config.color }} />
            <span className="font-bold text-gray-900 text-sm">Verification Details</span>
            <TrustScoreRing score={data?.trustScore ?? 0} />
          </div>

          {data ? (
            <div className="space-y-1.5">
              {Object.entries(data.checks ?? {}).map(([key, passed]) => {
                const labels: Record<string, string> = {
                  agentVerified: 'Agent identity verified',
                  photosVerified: 'Photos authenticated',
                  priceVerified: 'Price market-checked',
                  titleVerified: 'Title document verified',
                  addressVerified: 'Address GPS confirmed',
                  nisvRegistered: 'Agent NIESV registered',
                };
                return (
                  <CheckItem key={key} label={labels[key] ?? key} passed={Boolean(passed)} />
                );
              })}
            </div>
          ) : (
            <div className="space-y-1.5">
              {['Loading verification details...'].map(l => (
                <div key={l} className="h-4 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          )}

          {/* Arrow */}
          <div className="absolute bottom-[-6px] left-4 w-3 h-3 bg-white border-b border-r border-gray-100 rotate-45" />
        </div>
      )}
    </div>
  );
}

// ── Agent Verification Badge ──────────────────────────────────────────────────
export function AgentVerificationBadge({ agentId }: { agentId: number }) {
  const { data, isLoading } = trpc.trust.getAgentVerification.useQuery({ agentId });

  if (isLoading) return <div className="animate-pulse bg-gray-100 rounded-full h-6 w-24" />;
  if (!data) return null;

  const tier = data.badgeTier as BadgeTier;
  const config = BADGE_CONFIG[tier];

  return (
    <div className="space-y-3">
      <InlineVerificationBadge tier={tier} />

      <div className="grid grid-cols-2 gap-2 text-xs">
        <CheckItem label="NIN Verified" passed={data.verifications.nin} />
        <CheckItem label="BVN Verified" passed={data.verifications.bvn} />
        <CheckItem label="CAC Registered" passed={data.verifications.cac} />
        <CheckItem label="NIESV Member" passed={!!data.verifications.nisvNumber} />
      </div>

      {data.verifications.nisvNumber && (
        <div className="text-xs bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg font-mono">
          NIESV: {data.verifications.nisvNumber}
        </div>
      )}

      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span>Trust Score: <strong className="text-gray-900">{data.trustScore}/100</strong></span>
        {data.listingLimit > 0
          ? <span>Listing limit: <strong className="text-gray-900">{data.listingLimit}</strong></span>
          : <span className="text-green-600 font-semibold">Unlimited listings</span>
        }
      </div>
    </div>
  );
}

// ── Default export ────────────────────────────────────────────────────────────
export default function VerificationBadge({
  propertyId,
  tier,
  variant = 'inline',
}: {
  propertyId?: number;
  tier?: BadgeTier;
  variant?: 'inline' | 'card' | 'tooltip';
}) {
  const resolvedTier = tier ?? 'unverified';

  if (variant === 'card' && propertyId) return <VerificationCard propertyId={propertyId} />;
  if (variant === 'tooltip' && propertyId) return <TooltipVerificationBadge propertyId={propertyId} tier={resolvedTier} />;
  return <InlineVerificationBadge tier={resolvedTier} />;
}
