import fs from 'node:fs';
import { env } from '../config/env';

// Called only by deploy.sh. No credential is written to stdout or process arguments.
try {
  if (!env.frontendOrigins.every(origin => new URL(origin).protocol === 'https:')) throw new Error('PUBLIC_FRONTEND_ORIGINS HTTPS adresleri icermelidir.');
  const required = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_RECEIPT_ENCRYPTION_KEY'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length) throw new Error('Eksik R2 alanlari: ' + missing.join(', '));
  if (Buffer.from(process.env.R2_RECEIPT_ENCRYPTION_KEY!, 'base64').length !== 32) throw new Error('R2_RECEIPT_ENCRYPTION_KEY 32 byte olmalidir.');
  const file = process.argv[2];
  if (!file) throw new Error('MySQL ayar dosyasi yolu eksik.');
  const quote = (value: string) => '"' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t') + '"';
  fs.writeFileSync(file, `[client]\nprotocol=tcp\nhost=${quote(env.db.host)}\nport=${env.db.port}\nuser=${quote(env.db.username)}\npassword=${quote(env.db.password)}\n`, { mode: 0o600, flag: 'wx' });
  process.stdout.write(env.db.database);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Deploy ayarlari gecersiz.');
  process.exitCode = 1;
}
