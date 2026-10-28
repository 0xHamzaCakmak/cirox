import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { appDataSource } from '../database/data-source';
import { UserEntity } from '../database/entities';
import { hashPassword } from '../auth/password';

async function seed() {
  const email = z.string().trim().toLowerCase().email().max(128).parse(process.env.SEED_ADMIN_EMAIL);
  const password = z.string().min(12).max(256).parse(process.env.SEED_ADMIN_PASSWORD);
  try {
    await appDataSource.initialize();
    if (await appDataSource.getRepository(UserEntity).existsBy({ role: 'admin' })) {
      console.log('Admin zaten mevcut; hesap veya şifre değiştirilmedi.');
      return;
    }
    await appDataSource.getRepository(UserEntity).insert({
      id: randomUUID(), companyId: null, branchId: null, name: 'Süper Admin',
      email, passwordHash: await hashPassword(password), role: 'admin',
      title: 'Sistem Yöneticisi', phone: '', active: true,
    });
    console.log(`İlk admin hesabı oluşturuldu: ${email}. Şifre backend/.env içindeki SEED_ADMIN_PASSWORD değeridir.`);
  } finally {
    if (appDataSource.isInitialized) await appDataSource.destroy();
  }
}
void seed().catch((error: { code?: string }) => {
  console.error(`Admin oluşturulamadı (${error.code ?? 'SEED_CONFIG_ERROR'}). Migration ve SEED_ADMIN ayarlarını kontrol edin.`);
  process.exitCode = 1;
});
