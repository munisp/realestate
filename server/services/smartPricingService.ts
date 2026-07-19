/**
 * Smart Pricing Service
 * 
 * Calculates dynamic pricing for properties based on:
 * - Base price and pricing rules
 * - Seasonal adjustments
 * - Weekend vs weekday pricing
 * - Demand-based pricing
 * - Last-minute discounts
 * - Length-of-stay discounts
 * - Special events
 * - Custom date overrides
 */

interface PricingRule {
  basePrice: number;
  strategy: string;
  weekendMultiplier: string;
  highSeasonStart: string | null;
  highSeasonEnd: string | null;
  highSeasonMultiplier: string;
  lowSeasonStart: string | null;
  lowSeasonEnd: string | null;
  lowSeasonMultiplier: string;
  enableDemandPricing: boolean;
  demandMultiplierMin: string;
  demandMultiplierMax: string;
  lastMinuteDays: number;
  lastMinuteDiscount: string;
  weeklyDiscount: string;
  monthlyDiscount: string;
}

interface SpecialEvent {
  startDate: Date;
  endDate: Date;
  priceMultiplier: string;
}

interface CustomPricing {
  date: Date;
  price: number;
}

export class SmartPricingService {
  /**
   * Calculate price for a specific date range
   */
  static calculatePrice(params: {
    pricingRule: PricingRule;
    checkInDate: Date;
    checkOutDate: Date;
    specialEvents?: SpecialEvent[];
    customPricing?: CustomPricing[];
    currentOccupancyRate?: number;
  }): {
    totalPrice: number;
    pricePerNight: number;
    breakdown: Array<{
      date: string;
      basePrice: number;
      adjustedPrice: number;
      factors: string[];
    }>;
    discounts: Array<{
      type: string;
      amount: number;
      percentage: number;
    }>;
  } {
    const {
      pricingRule,
      checkInDate,
      checkOutDate,
      specialEvents = [],
      customPricing = [],
      currentOccupancyRate = 0.5,
    } = params;

    const nights = this.calculateNights(checkInDate, checkOutDate);
    const breakdown: Array<{
      date: string;
      basePrice: number;
      adjustedPrice: number;
      factors: string[];
    }> = [];

    let totalPrice = 0;

    // Calculate price for each night
    for (let i = 0; i < nights; i++) {
      const currentDate = new Date(checkInDate);
      currentDate.setDate(currentDate.getDate() + i);

      const nightPrice = this.calculateNightPrice({
        date: currentDate,
        pricingRule,
        specialEvents,
        customPricing,
        currentOccupancyRate,
      });

      breakdown.push(nightPrice);
      totalPrice += nightPrice.adjustedPrice;
    }

    // Apply length-of-stay discounts
    const discounts = this.calculateDiscounts({
      totalPrice,
      nights,
      checkInDate,
      pricingRule,
    });

    discounts.forEach(discount => {
      totalPrice -= discount.amount;
    });

    return {
      totalPrice: Math.round(totalPrice),
      pricePerNight: Math.round(totalPrice / nights),
      breakdown,
      discounts,
    };
  }

  /**
   * Calculate price for a single night
   */
  private static calculateNightPrice(params: {
    date: Date;
    pricingRule: PricingRule;
    specialEvents: SpecialEvent[];
    customPricing: CustomPricing[];
    currentOccupancyRate: number;
  }): {
    date: string;
    basePrice: number;
    adjustedPrice: number;
    factors: string[];
  } {
    const { date, pricingRule, specialEvents, customPricing, currentOccupancyRate } = params;
    const factors: string[] = [];
    let price = pricingRule.basePrice;

    // Check for custom pricing override
    const customPrice = customPricing.find(cp => 
      this.isSameDate(cp.date, date)
    );
    if (customPrice) {
      return {
        date: date.toISOString().split('T')[0],
        basePrice: pricingRule.basePrice,
        adjustedPrice: customPrice.price,
        factors: ['Custom pricing override'],
      };
    }

    // Weekend multiplier
    if (this.isWeekend(date)) {
      const multiplier = parseFloat(pricingRule.weekendMultiplier);
      price *= multiplier;
      factors.push(`Weekend (${multiplier}x)`);
    }

    // Seasonal multiplier
    const seasonMultiplier = this.getSeasonMultiplier(date, pricingRule);
    if (seasonMultiplier !== 1.0) {
      price *= seasonMultiplier;
      factors.push(`Seasonal (${seasonMultiplier}x)`);
    }

    // Special event multiplier
    const eventMultiplier = this.getEventMultiplier(date, specialEvents);
    if (eventMultiplier !== 1.0) {
      price *= eventMultiplier;
      factors.push(`Special event (${eventMultiplier}x)`);
    }

    // Demand-based pricing
    if (pricingRule.enableDemandPricing) {
      const demandMultiplier = this.calculateDemandMultiplier(
        currentOccupancyRate,
        parseFloat(pricingRule.demandMultiplierMin),
        parseFloat(pricingRule.demandMultiplierMax)
      );
      price *= demandMultiplier;
      factors.push(`Demand (${demandMultiplier.toFixed(2)}x, ${(currentOccupancyRate * 100).toFixed(0)}% occupancy)`);
    }

    return {
      date: date.toISOString().split('T')[0],
      basePrice: pricingRule.basePrice,
      adjustedPrice: Math.round(price),
      factors,
    };
  }

  /**
   * Calculate discounts (last-minute, weekly, monthly)
   */
  private static calculateDiscounts(params: {
    totalPrice: number;
    nights: number;
    checkInDate: Date;
    pricingRule: PricingRule;
  }): Array<{
    type: string;
    amount: number;
    percentage: number;
  }> {
    const { totalPrice, nights, checkInDate, pricingRule } = params;
    const discounts: Array<{
      type: string;
      amount: number;
      percentage: number;
    }> = [];

    // Last-minute discount
    const daysUntilCheckIn = this.calculateDaysUntil(checkInDate);
    if (daysUntilCheckIn <= pricingRule.lastMinuteDays && parseFloat(pricingRule.lastMinuteDiscount) > 0) {
      const percentage = parseFloat(pricingRule.lastMinuteDiscount);
      const amount = totalPrice * percentage;
      discounts.push({
        type: `Last-minute booking (${daysUntilCheckIn} days)`,
        amount: Math.round(amount),
        percentage,
      });
    }

    // Weekly discount (7+ nights)
    if (nights >= 7 && parseFloat(pricingRule.weeklyDiscount) > 0) {
      const percentage = parseFloat(pricingRule.weeklyDiscount);
      const amount = totalPrice * percentage;
      discounts.push({
        type: 'Weekly stay discount',
        amount: Math.round(amount),
        percentage,
      });
    }

    // Monthly discount (28+ nights)
    if (nights >= 28 && parseFloat(pricingRule.monthlyDiscount) > 0) {
      const percentage = parseFloat(pricingRule.monthlyDiscount);
      const amount = totalPrice * percentage;
      discounts.push({
        type: 'Monthly stay discount',
        amount: Math.round(amount),
        percentage,
      });
    }

    return discounts;
  }

  /**
   * Get seasonal multiplier for a date
   */
  private static getSeasonMultiplier(date: Date, pricingRule: PricingRule): number {
    const dateStr = this.formatMMDD(date);

    // High season
    if (pricingRule.highSeasonStart && pricingRule.highSeasonEnd) {
      if (this.isDateInRange(dateStr, pricingRule.highSeasonStart, pricingRule.highSeasonEnd)) {
        return parseFloat(pricingRule.highSeasonMultiplier);
      }
    }

    // Low season
    if (pricingRule.lowSeasonStart && pricingRule.lowSeasonEnd) {
      if (this.isDateInRange(dateStr, pricingRule.lowSeasonStart, pricingRule.lowSeasonEnd)) {
        return parseFloat(pricingRule.lowSeasonMultiplier);
      }
    }

    return 1.0;
  }

  /**
   * Get event multiplier for a date
   */
  private static getEventMultiplier(date: Date, specialEvents: SpecialEvent[]): number {
    for (const event of specialEvents) {
      if (date >= event.startDate && date <= event.endDate) {
        return parseFloat(event.priceMultiplier);
      }
    }
    return 1.0;
  }

  /**
   * Calculate demand-based multiplier
   */
  private static calculateDemandMultiplier(
    occupancyRate: number,
    min: number,
    max: number
  ): number {
    // Linear interpolation based on occupancy rate
    // 0% occupancy = min multiplier
    // 100% occupancy = max multiplier
    return min + (max - min) * occupancyRate;
  }

  /**
   * Helper: Calculate number of nights
   */
  private static calculateNights(checkIn: Date, checkOut: Date): number {
    const diffTime = checkOut.getTime() - checkIn.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Helper: Calculate days until a date
   */
  private static calculateDaysUntil(date: Date): number {
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Helper: Check if date is weekend
   */
  private static isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 5 || day === 6; // Friday, Saturday, Sunday
  }

  /**
   * Helper: Format date as MM-DD
   */
  private static formatMMDD(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}-${day}`;
  }

  /**
   * Helper: Check if date is in range (MM-DD format)
   */
  private static isDateInRange(dateStr: string, startStr: string, endStr: string): boolean {
    // Handle year wrap-around (e.g., 12-15 to 01-15)
    if (startStr <= endStr) {
      return dateStr >= startStr && dateStr <= endStr;
    } else {
      return dateStr >= startStr || dateStr <= endStr;
    }
  }

  /**
   * Helper: Check if two dates are the same day
   */
  private static isSameDate(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  /**
   * Generate pricing recommendations based on market data
   */
  static generateRecommendations(params: {
    propertyId: number;
    basePrice: number;
    competitorPrices: number[];
    historicalOccupancy: number;
    upcomingEvents: SpecialEvent[];
  }): {
    recommendedBasePrice: number;
    confidence: number;
    reasoning: string[];
    suggestedAdjustments: Array<{
      type: string;
      currentValue: number;
      recommendedValue: number;
      impact: string;
    }>;
  } {
    const { basePrice, competitorPrices, historicalOccupancy, upcomingEvents } = params;
    const reasoning: string[] = [];
    const suggestedAdjustments: Array<{
      type: string;
      currentValue: number;
      recommendedValue: number;
      impact: string;
    }> = [];

    // Calculate market average
    const marketAvg = competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length;
    const pricePosition = (basePrice / marketAvg - 1) * 100;

    let recommendedBasePrice = basePrice;
    let confidence = 0.7;

    // Price positioning analysis
    if (pricePosition < -15) {
      reasoning.push(`Your price is ${Math.abs(pricePosition).toFixed(0)}% below market average. Consider increasing to capture more value.`);
      recommendedBasePrice = marketAvg * 0.95;
      suggestedAdjustments.push({
        type: 'Base Price',
        currentValue: basePrice,
        recommendedValue: Math.round(recommendedBasePrice),
        impact: 'Increase revenue by ~' + ((recommendedBasePrice / basePrice - 1) * 100).toFixed(0) + '%',
      });
    } else if (pricePosition > 15) {
      reasoning.push(`Your price is ${pricePosition.toFixed(0)}% above market average. Consider lowering to improve occupancy.`);
      recommendedBasePrice = marketAvg * 1.05;
      suggestedAdjustments.push({
        type: 'Base Price',
        currentValue: basePrice,
        recommendedValue: Math.round(recommendedBasePrice),
        impact: 'Improve occupancy by ~10-15%',
      });
    } else {
      reasoning.push(`Your price is well-positioned at ${pricePosition > 0 ? '+' : ''}${pricePosition.toFixed(0)}% vs market average.`);
      confidence = 0.85;
    }

    // Occupancy analysis
    if (historicalOccupancy < 0.6) {
      reasoning.push(`Low occupancy rate (${(historicalOccupancy * 100).toFixed(0)}%). Consider enabling demand-based pricing with lower minimums.`);
      suggestedAdjustments.push({
        type: 'Demand Pricing Min',
        currentValue: 0.8,
        recommendedValue: 0.7,
        impact: 'Fill more low-demand dates',
      });
    } else if (historicalOccupancy > 0.85) {
      reasoning.push(`High occupancy rate (${(historicalOccupancy * 100).toFixed(0)}%). You can afford to increase prices.`);
      suggestedAdjustments.push({
        type: 'Demand Pricing Max',
        currentValue: 1.5,
        recommendedValue: 1.7,
        impact: 'Capture premium during peak demand',
      });
    }

    // Event-based recommendations
    if (upcomingEvents.length > 0) {
      reasoning.push(`${upcomingEvents.length} special events detected. Ensure event pricing is configured.`);
      confidence *= 0.95;
    }

    return {
      recommendedBasePrice: Math.round(recommendedBasePrice),
      confidence,
      reasoning,
      suggestedAdjustments,
    };
  }
}
