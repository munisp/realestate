import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../_core/trpc';

// Exchange rates cache
let exchangeRatesCache: {
  rates: Record<string, number>;
  base: string;
  timestamp: number;
} | null = null;

const CACHE_DURATION = 3600000; // 1 hour in milliseconds

// Supported currencies
const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'NGN',
  'ZAR', 'KES', 'GHS', 'EGP', 'MAD', 'TZS', 'UGX', 'RWF', 'ETB', 'MUR'
] as const;

type Currency = typeof SUPPORTED_CURRENCIES[number];

/**
 * Fetch exchange rates from exchangerate-api.com (free tier)
 * Fallback to hardcoded rates if API fails
 */
async function fetchExchangeRates(baseCurrency: string = 'USD'): Promise<Record<string, number>> {
  // Check cache first
  if (exchangeRatesCache && 
      exchangeRatesCache.base === baseCurrency && 
      Date.now() - exchangeRatesCache.timestamp < CACHE_DURATION) {
    return exchangeRatesCache.rates;
  }

  try {
    // Try to fetch from API (free tier, no API key required)
    const response = await fetch(`https://open.exchangerate-api.com/v6/latest/${baseCurrency}`);
    
    if (!response.ok) {
      throw new Error('Exchange rate API failed');
    }

    const data = await response.json();
    
    if (data.rates) {
      // Cache the rates
      exchangeRatesCache = {
        rates: data.rates,
        base: baseCurrency,
        timestamp: Date.now(),
      };
      
      return data.rates;
    }
  } catch (error) {
    console.error('[Currency] Failed to fetch exchange rates:', error);
  }

  // Fallback to approximate rates (updated periodically)
  const fallbackRates: Record<string, number> = {
    'USD': 1.00,
    'EUR': 0.92,
    'GBP': 0.79,
    'JPY': 149.50,
    'CAD': 1.36,
    'AUD': 1.53,
    'CHF': 0.88,
    'CNY': 7.24,
    'INR': 83.12,
    'NGN': 1620.00,  // Nigerian Naira
    'ZAR': 18.75,    // South African Rand
    'KES': 129.50,   // Kenyan Shilling
    'GHS': 12.05,    // Ghanaian Cedi
    'EGP': 30.90,    // Egyptian Pound
    'MAD': 10.12,    // Moroccan Dirham
    'TZS': 2505.00,  // Tanzanian Shilling
    'UGX': 3720.00,  // Ugandan Shilling
    'RWF': 1290.00,  // Rwandan Franc
    'ETB': 56.50,    // Ethiopian Birr
    'MUR': 45.50,    // Mauritian Rupee
  };

  // If base is not USD, convert rates
  if (baseCurrency !== 'USD') {
    const baseRate = fallbackRates[baseCurrency];
    if (!baseRate) {
      return fallbackRates; // Return USD-based rates as fallback
    }

    const convertedRates: Record<string, number> = {};
    for (const [currency, rate] of Object.entries(fallbackRates)) {
      convertedRates[currency] = rate / baseRate;
    }
    
    exchangeRatesCache = {
      rates: convertedRates,
      base: baseCurrency,
      timestamp: Date.now(),
    };
    
    return convertedRates;
  }

  exchangeRatesCache = {
    rates: fallbackRates,
    base: 'USD',
    timestamp: Date.now(),
  };

  return fallbackRates;
}

export const currencyRouter = router({
  /**
   * Get list of supported currencies
   */
  getSupportedCurrencies: publicProcedure.query(() => {
    return {
      currencies: SUPPORTED_CURRENCIES.map(code => ({
        code,
        name: getCurrencyName(code),
        symbol: getCurrencySymbol(code),
      })),
    };
  }),

  /**
   * Get current exchange rates
   */
  getExchangeRates: publicProcedure
    .input(z.object({
      base: z.enum(SUPPORTED_CURRENCIES).optional(),
    }))
    .query(async ({ input }) => {
      const rates = await fetchExchangeRates(input.base || 'USD');
      
      return {
        base: input.base || 'USD',
        rates,
        timestamp: Date.now(),
        cached: exchangeRatesCache !== null,
      };
    }),

  /**
   * Convert amount between currencies
   */
  convert: publicProcedure
    .input(z.object({
      amount: z.number(),
      from: z.enum(SUPPORTED_CURRENCIES),
      to: z.enum(SUPPORTED_CURRENCIES),
    }))
    .query(async ({ input }) => {
      const { amount, from, to } = input;

      if (from === to) {
        return {
          amount,
          converted: amount,
          from,
          to,
          rate: 1,
        };
      }

      const rates = await fetchExchangeRates(from);
      const rate = rates[to];

      if (!rate) {
        throw new Error(`Exchange rate not available for ${from} to ${to}`);
      }

      const converted = amount * rate;

      return {
        amount,
        converted: Math.round(converted * 100) / 100, // Round to 2 decimals
        from,
        to,
        rate,
      };
    }),

  /**
   * Convert multiple amounts at once (batch conversion)
   */
  convertBatch: publicProcedure
    .input(z.object({
      conversions: z.array(z.object({
        amount: z.number(),
        from: z.enum(SUPPORTED_CURRENCIES),
        to: z.enum(SUPPORTED_CURRENCIES),
      })),
    }))
    .query(async ({ input }) => {
      const results = await Promise.all(
        input.conversions.map(async ({ amount, from, to }) => {
          if (from === to) {
            return {
              amount,
              converted: amount,
              from,
              to,
              rate: 1,
            };
          }

          const rates = await fetchExchangeRates(from);
          const rate = rates[to];

          if (!rate) {
            return {
              amount,
              converted: amount,
              from,
              to,
              rate: 1,
              error: `Exchange rate not available for ${from} to ${to}`,
            };
          }

          const converted = amount * rate;

          return {
            amount,
            converted: Math.round(converted * 100) / 100,
            from,
            to,
            rate,
          };
        })
      );

      return {
        results,
        timestamp: Date.now(),
      };
    }),

  /**
   * Get user's preferred currency
   */
  getPreferredCurrency: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { currency: 'USD' as Currency, symbol: '$' };

    const [pref] = await db.select().from(notificationPreferences)
      .where(eq(notificationPreferences.userId, ctx.user.id))
      .limit(1);

    const currency = (pref?.preferredCurrency as Currency) || 'USD';
    return {
      currency,
      symbol: CURRENCY_SYMBOLS[currency],
    };
  }),

  /**
   * Set user's preferred currency
   */
  setPreferredCurrency: protectedProcedure
    .input(z.object({
      currency: z.enum(SUPPORTED_CURRENCIES),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      await db.insert(notificationPreferences).values({
        userId: ctx.user.id,
        preferredCurrency: input.currency,
      }).onDuplicateKeyUpdate({
        set: { preferredCurrency: input.currency },
      });

      return {
        success: true,
        currency: input.currency,
        message: `Preferred currency set to ${input.currency}`,
      };
    }),

  /**
   * Format amount with currency symbol
   */
  format: publicProcedure
    .input(z.object({
      amount: z.number(),
      currency: z.enum(SUPPORTED_CURRENCIES),
      locale: z.string().optional(),
    }))
    .query(({ input }) => {
      const { amount, currency, locale = 'en-US' } = input;

      const formatted = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount);

      return {
        formatted,
        amount,
        currency,
        symbol: getCurrencySymbol(currency),
      };
    }),
});

/**
 * Get currency name
 */
function getCurrencyName(code: string): string {
  const names: Record<string, string> = {
    'USD': 'US Dollar',
    'EUR': 'Euro',
    'GBP': 'British Pound',
    'JPY': 'Japanese Yen',
    'CAD': 'Canadian Dollar',
    'AUD': 'Australian Dollar',
    'CHF': 'Swiss Franc',
    'CNY': 'Chinese Yuan',
    'INR': 'Indian Rupee',
    'NGN': 'Nigerian Naira',
    'ZAR': 'South African Rand',
    'KES': 'Kenyan Shilling',
    'GHS': 'Ghanaian Cedi',
    'EGP': 'Egyptian Pound',
    'MAD': 'Moroccan Dirham',
    'TZS': 'Tanzanian Shilling',
    'UGX': 'Ugandan Shilling',
    'RWF': 'Rwandan Franc',
    'ETB': 'Ethiopian Birr',
    'MUR': 'Mauritian Rupee',
  };

  return names[code] || code;
}

/**
 * Get currency symbol
 */
function getCurrencySymbol(code: string): string {
  const symbols: Record<string, string> = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
    'CAD': 'CA$',
    'AUD': 'A$',
    'CHF': 'CHF',
    'CNY': '¥',
    'INR': '₹',
    'NGN': '₦',
    'ZAR': 'R',
    'KES': 'KSh',
    'GHS': 'GH₵',
    'EGP': 'E£',
    'MAD': 'MAD',
    'TZS': 'TSh',
    'UGX': 'USh',
    'RWF': 'FRw',
    'ETB': 'Br',
    'MUR': '₨',
  };

  return symbols[code] || code;
}
