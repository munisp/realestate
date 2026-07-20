import { notifyOwner } from "../_core/notification";
import { logger } from "../_core/logger";

interface RateAlert {
  userId: string;
  currency: string;
  threshold: number; // percentage change
  lastRate: number;
  email?: string;
}

// In-memory storage for demo (in production, use database)
const rateAlerts: Map<string, RateAlert> = new Map();
const lastCheckedRates: Map<string, number> = new Map();

/**
 * Register a user for exchange rate alerts
 */
export function registerRateAlert(alert: RateAlert) {
  const key = `${alert.userId}_${alert.currency}`;
  rateAlerts.set(key, alert);
  lastCheckedRates.set(alert.currency, alert.lastRate);
  return { success: true, key };
}

/**
 * Unregister a user from exchange rate alerts
 */
export function unregisterRateAlert(userId: string, currency: string) {
  const key = `${userId}_${currency}`;
  rateAlerts.delete(key);
  return { success: true };
}

/**
 * Check exchange rates and send notifications if thresholds are exceeded
 */
export async function checkExchangeRates() {
  try {
    const uniqueCurrencies = new Set(Array.from(rateAlerts.values()).map(a => a.currency));
    
    for (const currency of uniqueCurrencies) {
      // Fetch current rate from exchange rate API
      const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${currency}`);
      if (!response.ok) continue;
      
      const data = await response.json();
      const currentRate = data.rates.USD; // Rate to USD
      const lastRate = lastCheckedRates.get(currency);
      
      if (!lastRate) {
        lastCheckedRates.set(currency, currentRate);
        continue;
      }
      
      // Calculate percentage change
      const percentChange = Math.abs(((currentRate - lastRate) / lastRate) * 100);
      
      // Check all alerts for this currency
      for (const [key, alert] of rateAlerts.entries()) {
        if (alert.currency !== currency) continue;
        
        if (percentChange >= alert.threshold) {
          // Send notification
          const direction = currentRate > lastRate ? 'increased' : 'decreased';
          await notifyOwner({
            title: `Exchange Rate Alert: ${currency}`,
            content: `The ${currency} exchange rate has ${direction} by ${percentChange.toFixed(2)}% (from ${lastRate.toFixed(4)} to ${currentRate.toFixed(4)} USD). Your alert threshold was ${alert.threshold}%.${alert.email ? ` Notification sent to ${alert.email}.` : ''}`,
          });
          
          // Update last checked rate
          alert.lastRate = currentRate;
        }
      }
      
      // Update last checked rate for currency
      lastCheckedRates.set(currency, currentRate);
    }
    
    return { success: true, checked: uniqueCurrencies.size };
  } catch (error) {
    logger.error('[Exchange Rate Monitor] Error checking rates:', { error: String(error) });
    return { success: false, error: String(error) };
  }
}

/**
 * Get all active alerts for a user
 */
export function getUserAlerts(userId: string): RateAlert[] {
  return Array.from(rateAlerts.values()).filter(alert => alert.userId === userId);
}

/**
 * Start periodic monitoring (call this once on server startup)
 * Checks rates every hour
 */
export function startExchangeRateMonitoring() {
  // Check immediately
  checkExchangeRates();
  
  // Then check every hour
  setInterval(() => {
    checkExchangeRates();
  }, 60 * 60 * 1000); // 1 hour
  
  logger.info('[Exchange Rate Monitor] Started monitoring exchange rates (checking every hour)');
}
