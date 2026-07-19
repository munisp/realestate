import { differenceInDays, eachDayOfInterval, getDay } from 'date-fns';

export interface PriceBreakdown {
  nightlyRate: number;
  numberOfNights: number;
  subtotal: number;
  cleaningFee: number;
  serviceFee: number;
  taxes: number;
  total: number;
}

export class DynamicPricingEngine {
  calculatePrice(
    basePrice: number,
    cleaningFee: number,
    checkInDate: Date,
    checkOutDate: Date,
    numberOfGuests: number
  ): PriceBreakdown {
    const numberOfNights = differenceInDays(checkOutDate, checkInDate);
    const dates = eachDayOfInterval({ start: checkInDate, end: checkOutDate });
    
    // Apply weekend premium (20% higher on Fri/Sat)
    let totalNightlyRate = 0;
    dates.forEach(date => {
      const dayOfWeek = getDay(date);
      const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
      const nightRate = isWeekend ? basePrice * 1.2 : basePrice;
      totalNightlyRate += nightRate;
    });

    const averageNightlyRate = totalNightlyRate / numberOfNights;
    
    // Length of stay discount
    let discount = 0;
    if (numberOfNights >= 28) discount = 0.20; // 20% monthly discount
    else if (numberOfNights >= 7) discount = 0.10; // 10% weekly discount

    const subtotal = totalNightlyRate * (1 - discount);
    const serviceFee = subtotal * 0.03; // 3% service fee
    const taxes = (subtotal + cleaningFee + serviceFee) * 0.075; // 7.5% VAT
    const total = subtotal + cleaningFee + serviceFee + taxes;

    return {
      nightlyRate: averageNightlyRate,
      numberOfNights,
      subtotal,
      cleaningFee,
      serviceFee,
      taxes,
      total,
    };
  }
}
