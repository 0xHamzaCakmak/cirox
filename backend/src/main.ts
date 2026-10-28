import { createApp } from './app';
import { env } from './config/env';
import { appDataSource } from './database/data-source';

async function bootstrap() {
  await appDataSource.initialize();
  const server = createApp().listen(env.port, env.host, () => {
    console.log(`Backend: http://${env.host}:${env.port}/api/v1/health`);
  });

  let stopping = false;
  const shutdown = () => {
    if (stopping) return;
    stopping = true;
    const timeout = setTimeout(() => process.exit(1), 10000);
    timeout.unref();
    server.close(() => {
      void appDataSource.destroy().then(() => {
        clearTimeout(timeout);
        process.exit(0);
      }).catch(() => process.exit(1));
    });
  };
  server.on('error', (error: NodeJS.ErrnoException) => {
    console.error(`HTTP server could not start (${error.code ?? 'UNKNOWN'}).`);
    void appDataSource.destroy().finally(() => process.exit(1));
  });
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

void bootstrap().catch((error: { code?: string }) => {
  console.error(`Backend could not start (${error.code ?? 'CONFIG_OR_DATABASE_ERROR'}). Check backend/.env and MySQL.`);
  process.exitCode = 1;
});
