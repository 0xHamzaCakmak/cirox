import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { env } from '../config/env';
import { BranchEntity, CompanyEntity, SessionEntity, UserEntity } from './entities';
import { IdentityFoundation1793145600000 } from './migrations/1793145600000-IdentityFoundation';
import { OptionalMonitoringCenter1793145601000 } from './migrations/1793145601000-OptionalMonitoringCenter';
import { Usernames1793145602000 } from './migrations/1793145602000-Usernames';
import { RevenueReceipts1793145603000 } from './migrations/1793145603000-RevenueReceipts';
import { Expenses1793145604000 } from './migrations/1793145604000-Expenses';
import { BranchExpenseCategories1793145605000 } from './migrations/1793145605000-BranchExpenseCategories';
import { StaffCompensation1793145606000 } from './migrations/1793145606000-StaffCompensation';
import { BranchSettings1793145607000 } from './migrations/1793145607000-BranchSettings';

export const appDataSource = new DataSource({
  type: 'mysql',
  host: env.db.host,
  port: env.db.port,
  username: env.db.username,
  password: env.db.password,
  database: env.db.database,
  charset: 'utf8mb4',
  timezone: 'Z',
  synchronize: false,
  migrationsRun: false,
  logging: env.db.logging,
  entities: [CompanyEntity, BranchEntity, UserEntity, SessionEntity],
  migrations: [IdentityFoundation1793145600000, OptionalMonitoringCenter1793145601000, Usernames1793145602000, RevenueReceipts1793145603000, Expenses1793145604000, BranchExpenseCategories1793145605000, StaffCompensation1793145606000, BranchSettings1793145607000],
  migrationsTableName: 'schema_migrations',
  migrationsTransactionMode: 'none',
  extra: { connectionLimit: 10, connectTimeout: 10000 },
});
