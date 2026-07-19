/**
 * Custom Property Marker Icons
 * SVG-based markers for different property types with price-based colors
 */

export type PropertyType = 'residential' | 'commercial' | 'land' | 'industrial';
export type PriceTier = 'budget' | 'mid' | 'premium' | 'luxury';

/**
 * Property type colors
 */
const PROPERTY_COLORS = {
  residential: '#3b82f6', // Blue
  commercial: '#8b5cf6', // Purple
  land: '#10b981', // Green
  industrial: '#f59e0b', // Orange
};

/**
 * Price tier colors
 */
const PRICE_COLORS = {
  budget: '#10b981', // Green
  mid: '#3b82f6', // Blue
  premium: '#8b5cf6', // Purple
  luxury: '#ef4444', // Red
};

/**
 * Get price tier based on property price
 */
export function getPriceTier(price: number): PriceTier {
  if (price < 50000000) return 'budget'; // < ₦50M
  if (price < 150000000) return 'mid'; // ₦50M - ₦150M
  if (price < 300000000) return 'premium'; // ₦150M - ₦300M
  return 'luxury'; // > ₦300M
}

/**
 * Create SVG marker element for a property
 */
export function createPropertyMarker(
  propertyType: PropertyType,
  price?: number,
  options?: {
    size?: number;
    useTypeColor?: boolean;
    usePriceColor?: boolean;
  }
): HTMLDivElement {
  const size = options?.size || 36;
  const useTypeColor = options?.useTypeColor ?? false;
  const usePriceColor = options?.usePriceColor ?? true;

  // Determine marker color
  let color = PROPERTY_COLORS.residential; // Default
  if (usePriceColor && price) {
    const tier = getPriceTier(price);
    color = PRICE_COLORS[tier];
  } else if (useTypeColor) {
    color = PROPERTY_COLORS[propertyType];
  }

  // Create marker container
  const el = document.createElement('div');
  el.className = 'property-marker';
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.cursor = 'pointer';
  el.style.position = 'relative';

  // Property type icons (simple shapes for now)
  const icons = {
    residential: `
      <svg width="${size}" height="${size}" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="18" cy="18" r="16" fill="${color}" stroke="white" stroke-width="2"/>
        <path d="M18 10L12 16H15V24H21V16H24L18 10Z" fill="white"/>
      </svg>
    `,
    commercial: `
      <svg width="${size}" height="${size}" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="32" height="32" rx="4" fill="${color}" stroke="white" stroke-width="2"/>
        <rect x="10" y="10" width="6" height="6" fill="white"/>
        <rect x="20" y="10" width="6" height="6" fill="white"/>
        <rect x="10" y="20" width="6" height="6" fill="white"/>
        <rect x="20" y="20" width="6" height="6" fill="white"/>
      </svg>
    `,
    land: `
      <svg width="${size}" height="${size}" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <polygon points="18,2 34,34 2,34" fill="${color}" stroke="white" stroke-width="2"/>
        <path d="M18 12L24 24H12L18 12Z" fill="white"/>
      </svg>
    `,
    industrial: `
      <svg width="${size}" height="${size}" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="32" height="32" fill="${color}" stroke="white" stroke-width="2"/>
        <rect x="14" y="8" width="8" height="4" fill="white"/>
        <rect x="8" y="14" width="20" height="14" fill="white" fill-opacity="0.3"/>
        <rect x="12" y="18" width="4" height="8" fill="white"/>
        <rect x="20" y="18" width="4" height="8" fill="white"/>
      </svg>
    `,
  };

  el.innerHTML = icons[propertyType];

  // Add hover effect
  el.style.transition = 'transform 0.2s';
  el.addEventListener('mouseenter', () => {
    el.style.transform = 'scale(1.2)';
  });
  el.addEventListener('mouseleave', () => {
    el.style.transform = 'scale(1)';
  });

  return el;
}

/**
 * Create cluster marker with property count
 */
export function createClusterMarker(
  count: number,
  avgPrice?: number,
  options?: {
    size?: number;
  }
): HTMLDivElement {
  const baseSize = options?.size || 40;
  // Scale size based on count (logarithmic)
  const size = baseSize + Math.log10(count) * 10;

  // Determine color based on average price
  let color = '#3b82f6'; // Default blue
  if (avgPrice) {
    const tier = getPriceTier(avgPrice);
    color = PRICE_COLORS[tier];
  }

  const el = document.createElement('div');
  el.className = 'cluster-marker';
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.borderRadius = '50%';
  el.style.backgroundColor = color;
  el.style.border = '3px solid white';
  el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.style.cursor = 'pointer';
  el.style.fontWeight = 'bold';
  el.style.color = 'white';
  el.style.fontSize = `${Math.min(size / 3, 16)}px`;
  el.style.transition = 'transform 0.2s';

  el.textContent = count > 999 ? '999+' : count.toString();

  // Add hover effect
  el.addEventListener('mouseenter', () => {
    el.style.transform = 'scale(1.15)';
  });
  el.addEventListener('mouseleave', () => {
    el.style.transform = 'scale(1)';
  });

  return el;
}

/**
 * Get marker color for a property
 */
export function getMarkerColor(
  propertyType: PropertyType,
  price?: number,
  usePriceColor: boolean = true
): string {
  if (usePriceColor && price) {
    const tier = getPriceTier(price);
    return PRICE_COLORS[tier];
  }
  return PROPERTY_COLORS[propertyType];
}

/**
 * Format price for display
 */
export function formatPrice(price: number): string {
  if (price >= 1000000000) {
    return `₦${(price / 1000000000).toFixed(1)}B`;
  }
  if (price >= 1000000) {
    return `₦${(price / 1000000).toFixed(1)}M`;
  }
  if (price >= 1000) {
    return `₦${(price / 1000).toFixed(0)}K`;
  }
  return `₦${price.toLocaleString()}`;
}
