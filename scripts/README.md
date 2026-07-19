# Database Seeding

## Overview

This script populates the database with sample data for development and testing purposes.

## What Gets Created

- **10 sample users** (1 admin, 9 regular users)
- **3 verified builders** with company profiles
- **30 properties for sale** across Lagos, Abuja, Port Harcourt, Lekki, and Victoria Island
- **15 builder projects** (pre-construction, under-construction, completed) with milestones
- **20 short-let properties** with various nightly rates
- **10 sample bookings** for short-let properties
- **15 builder reviews** with ratings

## Running the Seed Script

```bash
# Install dependencies first
pnpm install

# Run the seed script
pnpm seed
```

## Database Reset

To reset the database before seeding:

```bash
# Drop all tables and recreate schema
pnpm db:push

# Then run seed
pnpm seed
```

## Customization

Edit `scripts/seed-database.ts` to:
- Change the number of properties/builders/users
- Modify price ranges
- Add different cities
- Customize property features and amenities

## Sample Data Details

### Cities Covered
- Lagos (Lekki, Victoria Island)
- Abuja (FCT)
- Port Harcourt (Rivers)

### Property Types
- Houses
- Apartments
- Condos
- Land

### Price Ranges
- Properties for sale: ₦20M - ₦120M
- Builder projects: ₦30M - ₦110M per unit
- Short-lets: ₦15k - ₦65k per night

## Notes

- All sample data uses placeholder images from Picsum
- Email addresses follow the pattern `user{n}@example.com`
- Phone numbers are randomly generated Nigerian numbers
- Builder CAC numbers are randomly generated

