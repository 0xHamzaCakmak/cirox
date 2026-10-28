import { appDataSource } from '../database/data-source';

async function ping() {
  try {
    await appDataSource.initialize();
    await appDataSource.query('SELECT 1');
    console.log('MySQL bağlantısı başarılı. Hedef veritabanına erişim doğrulandı.');
  } finally {
    if (appDataSource.isInitialized) await appDataSource.destroy();
  }
}

void ping().catch((error: { code?: string }) => {
  console.error(`MySQL bağlantısı kurulamadı (${error.code ?? 'DATABASE_ERROR'}). backend/.env ayarlarını kontrol edin.`);
  process.exitCode = 1;
});
