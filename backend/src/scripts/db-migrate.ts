import { appDataSource } from '../database/data-source';

async function migrate() {
  try {
    await appDataSource.initialize();
    const applied = await appDataSource.runMigrations({ transaction: 'none' });
    console.log(applied.length ? `Migration tamamlandı: ${applied.map(item => item.name).join(', ')}` : 'Veritabanı güncel.');
  } finally {
    if (appDataSource.isInitialized) await appDataSource.destroy();
  }
}
void migrate().catch((error: { code?: string }) => {
  console.error(`Migration başarısız (${error.code ?? 'MIGRATION_ERROR'}).`);
  process.exitCode = 1;
});
