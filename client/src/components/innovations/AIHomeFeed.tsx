/**
 * Innovation 7: Personalised AI Home Feed
 * Infinite scroll with ML-ranked property cards, real-time personalization
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface FeedProperty {
  id: string;
  title: string;
  price: number;
  location: string;
  bedrooms: number;
  area: number;
  imageUrl: string;
  matchScore: number;
  matchReasons: string[];
  isNew: boolean;
  isPriceDrop: boolean;
  priceDropPercent?: number;
  daysOnMarket: number;
  views: number;
}

interface AIHomeFeedProps {
  userId?: string;
  onPropertyClick?: (id: string) => void;
  onSave?: (id: string) => void;
}

function PropertyCard({ property, onSave, onClick }: { property: FeedProperty; onSave?: (id: string) => void; onClick?: (id: string) => void }) {
  const [saved, setSaved] = useState(false);
  const formatPrice = (n: number) => n >= 1_000_000 ? `₦${(n / 1_000_000).toFixed(1)}M` : `₦${(n / 1_000).toFixed(0)}K`;
  const matchColor = property.matchScore >= 90 ? 'text-green-600' : property.matchScore >= 70 ? 'text-blue-600' : 'text-muted-foreground';

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl overflow-hidden border bg-card shadow-sm hover:shadow-md transition-shadow"
      aria-label={`${property.title}, ${formatPrice(property.price)}`}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        <img src={property.imageUrl} alt={property.title} className="w-full h-full object-cover" loading="lazy" />
        <div className="absolute top-3 left-3 flex gap-1.5">
          {property.isNew && <Badge className="bg-blue-500 text-white text-xs py-0">New</Badge>}
          {property.isPriceDrop && <Badge className="bg-green-500 text-white text-xs py-0">↓{property.priceDropPercent}%</Badge>}
        </div>
        <button
          onClick={() => { setSaved(!saved); onSave?.(property.id); }}
          className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center shadow transition-all ${saved ? 'bg-red-500 text-white' : 'bg-white/90 text-slate-600'}`}
          aria-label={saved ? 'Remove from saved' : 'Save property'}
          aria-pressed={saved}
        >
          {saved ? '♥' : '♡'}
        </button>
        {/* Match score badge */}
        <div className={`absolute bottom-3 right-3 bg-white/95 rounded-full px-2 py-0.5 text-xs font-bold ${matchColor}`}>
          {property.matchScore}% match
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-semibold text-sm leading-tight flex-1 mr-2">{property.title}</h3>
          <span className="font-bold text-base text-primary shrink-0">{formatPrice(property.price)}</span>
        </div>
        <p className="text-xs text-muted-foreground mb-2">{property.location}</p>
        <div className="flex gap-3 text-xs text-muted-foreground mb-3">
          <span>{property.bedrooms} bed</span>
          <span>{property.area.toLocaleString()} sqm</span>
          <span>{property.daysOnMarket}d listed</span>
        </div>

        {/* AI match reasons */}
        {property.matchReasons.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {property.matchReasons.slice(0, 2).map(r => (
              <span key={r} className="text-xs bg-primary/8 text-primary px-2 py-0.5 rounded-full">{r}</span>
            ))}
          </div>
        )}

        <Button size="sm" className="w-full" onClick={() => onClick?.(property.id)}>
          View Details
        </Button>
      </div>
    </motion.article>
  );
}

function FeedSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden border bg-card">
      <Skeleton className="aspect-[4/3] w-full" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-8 w-full mt-2" />
      </div>
    </div>
  );
}

export function AIHomeFeed({ userId, onPropertyClick, onSave }: AIHomeFeedProps) {
  const [properties, setProperties] = useState<FeedProperty[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<'all' | 'new' | 'price-drop' | 'high-match'>('all');
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      // In production, call: /api/trpc/properties.getPersonalisedFeed
      await new Promise(r => setTimeout(r, 800));
      const mockProps: FeedProperty[] = Array.from({ length: 6 }, (_, i) => ({
        id: `prop-${page * 6 + i}`,
        title: ['Luxury 3-Bed Apartment', '4-Bed Duplex', 'Modern Studio', '5-Bed Mansion', '2-Bed Flat', 'Penthouse Suite'][i % 6],
        price: [45_000_000, 120_000_000, 15_000_000, 350_000_000, 25_000_000, 200_000_000][i % 6],
        location: ['Lekki Phase 1', 'Maitama, Abuja', 'Yaba, Lagos', 'Banana Island', 'Surulere', 'Victoria Island'][i % 6],
        bedrooms: [3, 4, 1, 5, 2, 4][i % 6],
        area: [180, 320, 65, 800, 120, 450][i % 6],
        imageUrl: `https://picsum.photos/seed/${page * 6 + i}/400/300`,
        matchScore: Math.floor(Math.random() * 30 + 70),
        matchReasons: [['Near your office', 'Within budget', 'Preferred area', 'Right size', 'Good schools nearby'][i % 5]],
        isNew: i % 4 === 0,
        isPriceDrop: i % 5 === 0,
        priceDropPercent: i % 5 === 0 ? Math.floor(Math.random() * 15 + 5) : undefined,
        daysOnMarket: Math.floor(Math.random() * 60),
        views: Math.floor(Math.random() * 500 + 50),
      }));
      setProperties(prev => [...prev, ...mockProps]);
      setPage(p => p + 1);
      if (page >= 4) setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page]);

  // Infinite scroll observer
  useEffect(() => {
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadMore();
    }, { threshold: 0.1 });
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [loadMore]);

  useEffect(() => { loadMore(); }, []);

  const filtered = properties.filter(p => {
    if (filter === 'new') return p.isNew;
    if (filter === 'price-drop') return p.isPriceDrop;
    if (filter === 'high-match') return p.matchScore >= 85;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" role="tablist" aria-label="Feed filters">
        {[
          { key: 'all', label: 'For You' },
          { key: 'high-match', label: 'Best Match' },
          { key: 'new', label: 'New' },
          { key: 'price-drop', label: 'Price Drops' },
        ].map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={filter === key}
            onClick={() => setFilter(key as typeof filter)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Property grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(p => (
          <PropertyCard key={p.id} property={p} onSave={onSave} onClick={onPropertyClick} />
        ))}
        {loading && Array.from({ length: 3 }).map((_, i) => <FeedSkeleton key={i} />)}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-4" aria-hidden="true" />

      {!hasMore && (
        <p className="text-center text-sm text-muted-foreground py-4">
          You've seen all personalised recommendations. <button className="text-primary underline" onClick={() => { setPage(0); setHasMore(true); setProperties([]); }}>Refresh feed</button>
        </p>
      )}
    </div>
  );
}

export default AIHomeFeed;
