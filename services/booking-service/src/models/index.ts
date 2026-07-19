import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';

@Entity('shortlet_properties')
export class ShortletProperty {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'property_id' })
  propertyId!: string;

  @Column({ name: 'host_id' })
  hostId!: string;

  @Column({ type: 'enum', enum: ['entire_place', 'private_room', 'shared_room'] })
  listingType!: string;

  @Column({ name: 'instant_book_enabled', default: false })
  instantBookEnabled!: boolean;

  @Column({ name: 'minimum_stay', default: 1 })
  minimumStay!: number;

  @Column({ name: 'maximum_stay', nullable: true })
  maximumStay?: number;

  @Column({ name: 'check_in_time', default: '14:00' })
  checkInTime!: string;

  @Column({ name: 'check_out_time', default: '11:00' })
  checkOutTime!: string;

  @Column({ name: 'base_price', type: 'decimal', precision: 10, scale: 2 })
  basePrice!: number;

  @Column({ name: 'cleaning_fee', type: 'decimal', precision: 10, scale: 2, default: 0 })
  cleaningFee!: number;

  @Column({ name: 'security_deposit', type: 'decimal', precision: 10, scale: 2, default: 0 })
  securityDeposit!: number;

  @Column({ type: 'simple-array', nullable: true })
  amenities?: string[];

  @Column({ name: 'house_rules', type: 'simple-array', nullable: true })
  houseRules?: string[];

  @Column({ name: 'cancellation_policy', type: 'enum', enum: ['flexible', 'moderate', 'strict'], default: 'moderate' })
  cancellationPolicy!: string;

  @Column({ type: 'enum', enum: ['active', 'inactive', 'suspended'], default: 'active' })
  status!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => Booking, booking => booking.property)
  bookings!: Booking[];
}

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'property_id' })
  propertyId!: string;

  @Column({ name: 'guest_id' })
  guestId!: string;

  @Column({ name: 'host_id' })
  hostId!: string;

  @Column({ name: 'check_in_date', type: 'date' })
  checkInDate!: Date;

  @Column({ name: 'check_out_date', type: 'date' })
  checkOutDate!: Date;

  @Column({ name: 'number_of_guests' })
  numberOfGuests!: number;

  @Column({ name: 'total_price', type: 'decimal', precision: 10, scale: 2 })
  totalPrice!: number;

  @Column({ type: 'json' })
  breakdown!: {
    nightlyRate: number;
    numberOfNights: number;
    subtotal: number;
    cleaningFee: number;
    serviceFee: number;
    taxes: number;
    total: number;
  };

  @Column({ type: 'enum', enum: ['inquiry', 'pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'completed'], default: 'pending' })
  status!: string;

  @Column({ name: 'payment_status', type: 'enum', enum: ['pending', 'partial', 'paid', 'refunded'], default: 'pending' })
  paymentStatus!: string;

  @Column({ name: 'cancellation_reason', nullable: true })
  cancellationReason?: string;

  @Column({ name: 'special_requests', type: 'text', nullable: true })
  specialRequests?: string;

  @Column({ type: 'enum', enum: ['direct', 'airbnb', 'booking_com', 'local_platform'], default: 'direct' })
  source!: string;

  @Column({ name: 'external_booking_id', nullable: true })
  externalBookingId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => ShortletProperty, property => property.bookings)
  @JoinColumn({ name: 'property_id' })
  property!: ShortletProperty;

  @OneToMany(() => Review, review => review.booking)
  reviews!: Review[];
}

@Entity('calendar_blocks')
export class CalendarBlock {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'property_id' })
  propertyId!: string;

  @Column({ type: 'date' })
  date!: Date;

  @Column({ type: 'enum', enum: ['available', 'booked', 'blocked'], default: 'available' })
  status!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price!: number;

  @Column({ name: 'minimum_stay', default: 1 })
  minimumStay!: number;

  @Column({ name: 'booking_id', nullable: true })
  bookingId?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

@Entity('guests')
export class Guest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @Column({ name: 'verification_status', type: 'enum', enum: ['unverified', 'email_verified', 'phone_verified', 'id_verified', 'fully_verified'], default: 'unverified' })
  verificationStatus!: string;

  @Column({ name: 'government_id', nullable: true })
  governmentId?: string;

  @Column({ name: 'profile_photo', nullable: true })
  profilePhoto?: string;

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({ type: 'simple-array', nullable: true })
  languages?: string[];

  @Column({ name: 'total_bookings', default: 0 })
  totalBookings!: number;

  @Column({ name: 'average_rating', type: 'decimal', precision: 3, scale: 2, default: 0 })
  averageRating!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'booking_id' })
  bookingId!: string;

  @Column({ name: 'reviewer_id' })
  reviewerId!: string;

  @Column({ name: 'reviewee_id' })
  revieweeId!: string;

  @Column({ type: 'enum', enum: ['guest_to_host', 'host_to_guest'] })
  type!: string;

  @Column({ type: 'int' })
  rating!: number;

  @Column({ type: 'int', nullable: true })
  cleanliness?: number;

  @Column({ type: 'int', nullable: true })
  communication?: number;

  @Column({ name: 'check_in', type: 'int', nullable: true })
  checkIn?: number;

  @Column({ type: 'int', nullable: true })
  accuracy?: number;

  @Column({ type: 'int', nullable: true })
  location?: number;

  @Column({ type: 'int', nullable: true })
  value?: number;

  @Column({ type: 'text' })
  comment!: string;

  @Column({ type: 'text', nullable: true })
  response?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => Booking, booking => booking.reviews)
  @JoinColumn({ name: 'booking_id' })
  booking!: Booking;
}

export { ShortletProperty, Booking, CalendarBlock, Guest, Review };
