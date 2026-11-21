import 'dotenv/config';
import 'reflect-metadata';
import { join } from 'path';
import { DataSource } from 'typeorm';

/**
 * Standalone DataSource for the TypeORM CLI (migrations) and the seed script.
 * The Nest app builds its own connection in app.module.ts from the same env vars.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME ?? 'carsale',
  password: process.env.DB_PASSWORD ?? 'carsale',
  database: process.env.DB_NAME ?? 'carsale',
  entities: [join(__dirname, '..', 'modules', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
});

export default AppDataSource;
