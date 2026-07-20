/**
 * Accessibility utilities — WCAG 2.1 AA compliance helpers
 */

/** Announce a message to screen readers via an ARIA live region */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const id = `aria-live-${priority}`;
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    el.setAttribute('aria-live', priority);
    el.setAttribute('aria-atomic', 'true');
    el.className = 'sr-only';
    document.body.appendChild(el);
  }
  // Clear then set to trigger re-announcement
  el.textContent = '';
  requestAnimationFrame(() => { el!.textContent = message; });
}

/** Trap focus within a container (for modals, drawers) */
export function trapFocus(container: HTMLElement): () => void {
  const focusable = container.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  const first = focusable[0];
  const last  = focusable[focusable.length - 1];

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }
  }

  container.addEventListener('keydown', handleKeyDown);
  first?.focus();
  return () => container.removeEventListener('keydown', handleKeyDown);
}

/** Check if a colour pair meets WCAG AA contrast ratio (4.5:1 for normal text) */
export function meetsContrastRatio(hex1: string, hex2: string, level: 'AA' | 'AAA' = 'AA'): boolean {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  return level === 'AA' ? ratio >= 4.5 : ratio >= 7;
}

function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
}

/** Generate a unique ID for ARIA associations */
let idCounter = 0;
export function generateId(prefix = 'ui'): string {
  return `${prefix}-${++idCounter}`;
}

/** Check if user prefers reduced motion */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Format a price for screen readers (₦1,200,000 → "1 million 200 thousand naira") */
export function formatPriceForSR(amount: number, currency = 'NGN'): string {
  if (currency === 'NGN') {
    if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)} billion naira`;
    if (amount >= 1_000_000)     return `${(amount / 1_000_000).toFixed(1)} million naira`;
    if (amount >= 1_000)         return `${(amount / 1_000).toFixed(0)} thousand naira`;
    return `${amount} naira`;
  }
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(amount);
}
