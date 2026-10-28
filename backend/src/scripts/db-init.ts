import mysql from 'mysql2/promise';
import { env } from '../config/env';

async function initializeDatabase() {
  // Database names are restricted to letters, numbers and underscores by env.ts.
  // Only an empty database is created; no existing tables are changed.
  const connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.username,
    password: env.db.password,
    connectTimeout: 10000,
  });
  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${env.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    console.log(`Veritabanı hazır: ${env.db.database}. Tablo veya uygulama verisi oluşturulmadı.`);
  } finally {
    await connection.end();
  }
}

void initializeDatabase().catch((error: { code?: string }) => {
  console.error(`Veritabanı hazırlanamadı (${error.code ?? 'DATABASE_ERROR'}). MySQL bağlantısını ve CREATE yetkisini kontrol edin.`);
  process.exitCode = 1;
});
