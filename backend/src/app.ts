import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { appDataSource } from './database/data-source';
import { ZodError } from 'zod';
import { authRouter } from './routes/auth';
import { adminRouter } from './routes/admin';
import { HttpError } from './http';
import { branchesRouter } from './routes/branches';
import { revenueRouter } from './routes/revenue';
import { expensesRouter } from './routes/expenses';
import { expenseCategoriesRouter } from './routes/expense-categories';
import { staffRouter } from './routes/staff';
import { settingsRouter } from './routes/settings';
import { notificationsRouter } from './routes/notifications';
import { adminFinanceRouter } from './routes/admin-finance';
import { cashRevenueRouter } from './routes/cash-revenue';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.frontendOrigins, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use('/api/v1', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin && !env.frontendOrigins.includes(req.headers.origin)) {
      res.status(403).json({ error: 'İstek kaynağına izin verilmiyor.' });
      return;
    }
    next();
  });
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/admin', adminRouter);
  app.use('/api/v1/admin', adminFinanceRouter);
  app.use('/api/v1/branches', branchesRouter);
  app.use('/api/v1/branch', revenueRouter);
  app.use('/api/v1/branch', cashRevenueRouter);
  app.use('/api/v1/branch', expensesRouter);
  app.use('/api/v1/branch', expenseCategoriesRouter);
  app.use('/api/v1/branch', staffRouter);
  app.use('/api/v1/settings', settingsRouter);
  app.use('/api/v1/notifications', notificationsRouter);

  app.get('/api/v1/health', (_req, res) => {
    res.json({ status: 'ok', service: 'sube-analitik-cirox-backend' });
  });

  app.get('/api/v1/health/ready', async (_req, res) => {
    try {
      if (!appDataSource.isInitialized) throw new Error('Database not initialized');
      await appDataSource.query('SELECT 1');
      res.json({ status: 'ready', database: 'connected', release: process.env.CIROX_RELEASE_SHA || null });
    } catch {
      res.status(503).json({ status: 'not_ready', database: 'unavailable' });
    }
  });

  app.use((_req, res) => {
    res.status(404).json({ error: 'Endpoint bulunamadı.' });
  });

  const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error?.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ error: 'Fotoğraf en fazla 20 MB olabilir.' }); return;
    }
    if (error?.name === 'MulterError') {
      res.status(400).json({ error: 'Tek bir fotoğraf seçin.' }); return;
    }
    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.message, ...(error.code ? { code: error.code } : {}) });
      return;
    }
    if (error instanceof ZodError) {
      if (error.issues.some(issue => ['amount', 'vatRate', 'creditCard', 'cash', 'online', 'other', 'date', 'receiptIds'].includes(String(issue.path[0])))) {
        res.status(400).json({ error: 'Tarih geçerli olmalı; gelir tutarları negatif olamaz ve en fazla iki ondalık basamak içermelidir.' }); return;
      }
      res.status(400).json({ error: 'Alanları kontrol edin. Kullanıcı adı 3–32 karakter (harf, rakam, nokta, tire, alt çizgi), e-posta geçerli ve şifre en az 6 karakter olmalıdır.' });
      return;
    }
    if (error?.code === 'ER_DUP_ENTRY' || error?.driverError?.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'Kullanıcı adı, e-posta veya kod zaten kullanılıyor.' });
      return;
    }
    if (error?.type === 'entity.too.large') {
      res.status(413).json({ error: 'İstek boyutu sınırı aşıldı.' });
      return;
    }
    if (error?.type === 'entity.parse.failed') {
      res.status(400).json({ error: 'Geçersiz JSON.' });
      return;
    }
    console.error('Request failed.');
    res.status(500).json({ error: 'Sunucu hatası.' });
  };
  app.use(handleError);
  return app;
}
