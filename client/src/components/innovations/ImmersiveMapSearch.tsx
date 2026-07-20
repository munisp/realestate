/**
 * Innovation 2: Immersive Map Search
 * Full-screen map with gesture-driven swipeable property cards
 * Uses Framer Motion for physics-based animations
 */
import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Property {
  id: string;
  title: string;
  price: number;
  location: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  imageUrl: string;
  lat: number;
  lng: number;
  type: string;
  isNew?: boolean;
  isPriceDrop?: boolean;
}

interface ImmersiveMapSearchProps {
  properties?: Property[];
  onPropertySelect?: (property: Property) => void;
  onSave?: (propertyId: string) => void;
}

const SWIPE_THRESHOLD = 100;

export function ImmersiveMapSearch({ properties = [], onPropertySelect, onSave }: ImmersiveMapSearchProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);
  const [activeMapPin, setActiveMapPin] = useState<string | null>(null);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);
  const saveIndicatorOpacity = useTransform(x, [0, 80], [0, 1]);
  const skipIndicatorOpacity = useTransform(x, [-80, 0], [1, 0]);

  const filteredProperties = properties.filter(p =>
    !searchQuery || p.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentProperty = filteredProperties[currentIndex];
  const nextProperty = filteredProperties[currentIndex + 1];

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    if (info.offset.x > SWIPE_THRESHOLD) {
      setExitDirection('right');
      if (currentProperty) {
        setSavedIds(s => new Set([...s, currentProperty.id]));
        onSave?.(currentProperty.id);
      }
      setTimeout(() => { setCurrentIndex(i => i + 1); setExitDirection(null); }, 300);
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      setExitDirection('left');
      setTimeout(() => { setCurrentIndex(i => i + 1); setExitDirection(null); }, 300);
    }
  }, [currentProperty, onSave]);

  const handleSave = useCallback(() => {
    if (currentProperty) {
      setSavedIds(s => new Set([...s, currentProperty.id]));
      onSave?.(currentProperty.id);
      setExitDirection('right');
      setTimeout(() => { setCurrentIndex(i => i + 1); setExitDirection(null); }, 300);
    }
  }, [currentProperty, onSave]);

  const handleSkip = useCallback(() => {
    setExitDirection('left');
    setTimeout(() => { setCurrentIndex(i => i + 1); setExitDirection(null); }, 300);
  }, []);

  const formatPrice = (price: number) =>
    price >= 1_000_000 ? `₦${(price / 1_000_000).toFixed(1)}M` : `₦${(price / 1_000).toFixed(0)}K`;

  return (
    <div className="relative w-full h-screen bg-slate-900 overflow-hidden flex flex-col">
      {/* Map background (placeholder — integrate with Leaflet/Mapbox in production) */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900">
        {/* Simulated map grid */}
        <svg className="absolute inset-0 w-full h-full opacity-10" aria-hidden="true">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Map pins for visible properties */}
        {filteredProperties.slice(0, 10).map((p, i) => (
          <button
            key={p.id}
            className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200 ${
              activeMapPin === p.id ? 'scale-125 z-10' : 'scale-100'
            }`}
            style={{ left: `${20 + (i * 8) % 60}%`, top: `${20 + (i * 11) % 50}%` }}
            onClick={() => { setActiveMapPin(p.id); setCurrentIndex(filteredProperties.indexOf(p)); }}
            aria-label={`View ${p.title} on map`}
          >
            <div className={`px-2 py-1 rounded-full text-xs font-bold shadow-lg transition-colors ${
              activeMapPin === p.id
                ? 'bg-primary text-white'
                : i === currentIndex ? 'bg-white text-slate-900' : 'bg-white/80 text-slate-700'
            }`}>
              {formatPrice(p.price)}
            </div>
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="relative z-20 p-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search Lagos, Abuja, Port Harcourt..."
              className="bg-white/95 backdrop-blur border-0 shadow-lg pl-10"
              aria-label="Search properties by location"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true">🔍</span>
          </div>
          <Button
            variant="secondary"
            size="icon"
            className="bg-white/95 shadow-lg"
            onClick={() => setFilterOpen(!filterOpen)}
            aria-label="Open filters"
            aria-expanded={filterOpen}
          >
            ⚙
          </Button>
        </div>
        {/* Stats bar */}
        <div className="flex gap-2 mt-2">
          <Badge variant="secondary" className="bg-white/90 text-slate-700 text-xs">
            {filteredProperties.length} properties
          </Badge>
          <Badge variant="secondary" className="bg-white/90 text-slate-700 text-xs">
            {savedIds.size} saved
          </Badge>
          <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
            {filteredProperties.filter(p => p.isPriceDrop).length} price drops
          </Badge>
        </div>
      </div>

      {/* Swipeable property cards */}
      <div className="relative z-10 flex-1 flex items-end justify-center pb-8 px-4">
        {filteredProperties.length === 0 ? (
          <div className="text-white text-center">
            <p className="text-lg font-semibold">No properties found</p>
            <p className="text-sm text-white/60 mt-1">Try adjusting your search</p>
          </div>
        ) : currentIndex >= filteredProperties.length ? (
          <div className="text-white text-center">
            <p className="text-2xl mb-2">🏠</p>
            <p className="text-lg font-semibold">You've seen all properties!</p>
            <Button className="mt-4" onClick={() => setCurrentIndex(0)} variant="secondary">
              Start Over
            </Button>
          </div>
        ) : (
          <div className="relative w-full max-w-sm" style={{ height: 380 }}>
            {/* Background card (next property) */}
            {nextProperty && (
              <div className="absolute inset-0 rounded-2xl overflow-hidden shadow-xl scale-95 opacity-60"
                   style={{ transform: 'scale(0.95) translateY(16px)' }}>
                <img src={nextProperty.imageUrl} alt="" className="w-full h-full object-cover" aria-hidden="true" />
              </div>
            )}

            {/* Swipe indicators */}
            <motion.div
              className="absolute top-6 left-6 z-20 bg-green-500 text-white px-4 py-2 rounded-full font-bold text-sm rotate-[-15deg]"
              style={{ opacity: saveIndicatorOpacity }}
              aria-hidden="true"
            >
              SAVE ♥
            </motion.div>
            <motion.div
              className="absolute top-6 right-6 z-20 bg-red-500 text-white px-4 py-2 rounded-full font-bold text-sm rotate-[15deg]"
              style={{ opacity: skipIndicatorOpacity }}
              aria-hidden="true"
            >
              SKIP ✕
            </motion.div>

            {/* Main draggable card */}
            <AnimatePresence>
              {!exitDirection && (
                <motion.div
                  key={currentProperty.id}
                  className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing"
                  style={{ x, rotate }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.8}
                  onDragEnd={handleDragEnd}
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ x: exitDirection === 'right' ? 400 : -400, opacity: 0, transition: { duration: 0.3 } }}
                  role="article"
                  aria-label={`${currentProperty.title}, ${formatPrice(currentProperty.price)}`}
                >
                  {/* Property image */}
                  <img
                    src={currentProperty.imageUrl}
                    alt={currentProperty.title}
                    className="w-full h-full object-cover"
                  />

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                  {/* Badges */}
                  <div className="absolute top-4 left-4 flex gap-2">
                    {currentProperty.isNew && (
                      <Badge className="bg-blue-500 text-white text-xs">New</Badge>
                    )}
                    {currentProperty.isPriceDrop && (
                      <Badge className="bg-green-500 text-white text-xs">Price Drop</Badge>
                    )}
                  </div>

                  {/* Property info */}
                  <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-lg leading-tight">{currentProperty.title}</h3>
                        <p className="text-white/80 text-sm">{currentProperty.location}</p>
                      </div>
                      <p className="font-bold text-xl text-green-400">{formatPrice(currentProperty.price)}</p>
                    </div>
                    <div className="flex gap-4 text-sm text-white/80">
                      <span>{currentProperty.bedrooms} bed</span>
                      <span>{currentProperty.bathrooms} bath</span>
                      <span>{currentProperty.area.toLocaleString()} sqm</span>
                    </div>
                    <Button
                      className="w-full mt-3 bg-white text-slate-900 hover:bg-white/90"
                      onClick={() => onPropertySelect?.(currentProperty)}
                    >
                      View Details
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {currentIndex < filteredProperties.length && (
        <div className="relative z-20 flex justify-center gap-6 pb-6">
          <button
            onClick={handleSkip}
            className="w-14 h-14 rounded-full bg-white shadow-lg flex items-center justify-center text-2xl hover:scale-110 transition-transform"
            aria-label="Skip this property"
          >
            ✕
          </button>
          <button
            onClick={() => onPropertySelect?.(currentProperty)}
            className="w-14 h-14 rounded-full bg-blue-500 shadow-lg flex items-center justify-center text-2xl text-white hover:scale-110 transition-transform"
            aria-label="View property details"
          >
            ℹ
          </button>
          <button
            onClick={handleSave}
            className="w-14 h-14 rounded-full bg-green-500 shadow-lg flex items-center justify-center text-2xl text-white hover:scale-110 transition-transform"
            aria-label="Save this property"
          >
            ♥
          </button>
        </div>
      )}

      {/* Progress indicator */}
      <div className="relative z-20 flex justify-center gap-1 pb-4" aria-label="Property progress">
        {filteredProperties.slice(0, 10).map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === currentIndex ? 'w-6 bg-white' : i < currentIndex ? 'w-2 bg-white/40' : 'w-2 bg-white/20'
            }`}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  );
}

export default ImmersiveMapSearch;
