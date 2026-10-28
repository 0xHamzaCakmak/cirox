import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

// Both src/config and dist/config resolve to the same backend/.env.
dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

const databaseUrl = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : undefined;
if (databaseUrl && databaseUrl.protocol !== 'mysql:') {
  throw new Error('DATABASE_URL must use the mysql:// protocol.');
}

const port = z.coerce.number().int().min(1).max(65535);
const boolean = z.enum(['true', 'false']).transform((value) => value === 'true');
const schema = z.object({
  nodeEnv: z.enum(['development', 'test', 'production']),
  host: z.string().min(1),
  port,
  frontendOrigins: z.array(z.url()).min(1),
  sessionDays: z.coerce.number().int().min(1).max(90),
  db: z.object({
    host: z.string().min(1),
    port,
    username: z.string().min(1),
    password: z.string(),
    database: z.string().regex(/^[a-zA-Z0-9_]+$/),
    logging: boolean,
  }),
});

if (process.env.DB_SYNCHRONIZE && process.env.DB_SYNCHRONIZE !== 'false') {
  throw new Error('DB_SYNCHRONIZE must remain false; use migrations for schema changes.');
}

export const env = schema.parse({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  host: process.env.HOST ?? '127.0.0.1',
  port: process.env.PORT ?? '4002',
  sessionDays: process.env.SESSION_TTL_DAYS ?? '7',
  frontendOrigins: (process.env.PUBLIC_FRONTEND_ORIGINS ?? 'http://localhost:3000,http://127.0.0.1:3000')
    .split(',').map((origin) => origin.trim()).filter(Boolean),
  db: {
    host: process.env.DB_HOST ?? databaseUrl?.hostname ?? '127.0.0.1',
    port: process.env.DB_PORT ?? (databaseUrl?.port || '3306'),
    username: process.env.DB_USERNAME ?? (databaseUrl ? decodeURIComponent(databaseUrl.username) : 'root'),
    password: process.env.DB_PASSWORD ?? (databaseUrl ? decodeURIComponent(databaseUrl.password) : ''),
    database: process.env.DB_NAME ?? (databaseUrl ? decodeURIComponent(databaseUrl.pathname.slice(1)) : 'sube_analitik_cirox'),
    logging: process.env.DB_LOGGING ?? 'false',
  },
});
