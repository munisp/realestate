import { DataSource } from 'typeorm';
import { GuestVerification } from '../entities/GuestVerification';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'verification_db',
  entities: [GuestVerification],
  synchronize: process.env.NODE_ENV === 'development',
  logging: false,
});
