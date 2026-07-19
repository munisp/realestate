import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Booking } from '../models';

export class BookingRepository {
  private repository: Repository<Booking>;

  constructor() {
    this.repository = AppDataSource.getRepository(Booking);
  }

  async create(booking: Partial<Booking>): Promise<Booking> {
    const newBooking = this.repository.create(booking);
    return await this.repository.save(newBooking);
  }

  async findById(id: string): Promise<Booking | null> {
    return await this.repository.findOne({ where: { id } });
  }

  async findByPropertyId(propertyId: string): Promise<Booking[]> {
    return await this.repository.find({
      where: { propertyId },
      order: { checkInDate: 'DESC' },
    });
  }

  async findByGuestId(guestId: string): Promise<Booking[]> {
    return await this.repository.find({
      where: { guestId },
      order: { checkInDate: 'DESC' },
    });
  }

  async findByHostId(hostId: string): Promise<Booking[]> {
    return await this.repository.find({
      where: { hostId },
      order: { checkInDate: 'DESC' },
    });
  }

  async findOverlapping(
    propertyId: string,
    checkInDate: Date,
    checkOutDate: Date
  ): Promise<Booking[]> {
    return await this.repository
      .createQueryBuilder('booking')
      .where('booking.property_id = :propertyId', { propertyId })
      .andWhere('booking.status IN (:...statuses)', {
        statuses: ['confirmed', 'checked_in'],
      })
      .andWhere(
        '(booking.check_in_date < :checkOut AND booking.check_out_date > :checkIn)',
        { checkIn: checkInDate, checkOut: checkOutDate }
      )
      .getMany();
  }

  async update(id: string, updates: Partial<Booking>): Promise<Booking | null> {
    await this.repository.update(id, updates);
    return await this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
