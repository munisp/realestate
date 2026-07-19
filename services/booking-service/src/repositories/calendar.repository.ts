import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { AppDataSource } from '../config/database';
import { CalendarBlock } from '../models';
import { eachDayOfInterval } from 'date-fns';

export class CalendarRepository {
  private repository: Repository<CalendarBlock>;

  constructor() {
    this.repository = AppDataSource.getRepository(CalendarBlock);
  }

  async getAvailability(
    propertyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CalendarBlock[]> {
    return await this.repository.find({
      where: {
        propertyId,
        date: Between(startDate, endDate),
      },
      order: { date: 'ASC' },
    });
  }

  async blockDates(
    propertyId: string,
    startDate: Date,
    endDate: Date,
    notes?: string
  ): Promise<CalendarBlock[]> {
    const dates = eachDayOfInterval({ start: startDate, end: endDate });
    const blocks: CalendarBlock[] = [];

    for (const date of dates) {
      const block = this.repository.create({
        propertyId,
        date,
        status: 'blocked',
        price: 0,
        notes,
      });
      blocks.push(await this.repository.save(block));
    }

    return blocks;
  }

  async markAsBooked(
    propertyId: string,
    bookingId: string,
    checkInDate: Date,
    checkOutDate: Date,
    price: number
  ): Promise<void> {
    const dates = eachDayOfInterval({ start: checkInDate, end: checkOutDate });

    for (const date of dates) {
      await this.repository.upsert(
        {
          propertyId,
          date,
          status: 'booked',
          price,
          bookingId,
        },
        ['propertyId', 'date']
      );
    }
  }

  async releaseBooking(bookingId: string): Promise<void> {
    await this.repository.update(
      { bookingId },
      { status: 'available', bookingId: null }
    );
  }

  async updatePricing(
    propertyId: string,
    startDate: Date,
    endDate: Date,
    price: number
  ): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(CalendarBlock)
      .set({ price })
      .where('property_id = :propertyId', { propertyId })
      .andWhere('date BETWEEN :startDate AND :endDate', { startDate, endDate })
      .execute();
  }
}
