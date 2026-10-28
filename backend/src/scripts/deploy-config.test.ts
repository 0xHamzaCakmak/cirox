import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

test('deploy config protects credentials, preserves existing files and rejects incomplete production configuration', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cirox-deploy-config-'));
  const file = path.join(directory, 'client.cnf');
  const env = { ...process.env, NODE_ENV: 'production', PUBLIC_FRONTEND_ORIGINS: 'https://cirox.example.test', DATABASE_URL: '',
    DB_HOST: '127.0.0.1', DB_PORT: '3306', DB_USERNAME: 'deploy_test', DB_NAME: 'cirox_deploy_test', DB_SYNCHRONIZE: 'false',
    DB_PASSWORD: 'a"b\\c\nline\tmore', R2_ACCOUNT_ID: 'demo-account', R2_ACCESS_KEY_ID: 'demo-access', R2_SECRET_ACCESS_KEY: 'demo-secret',
    R2_BUCKET: 'demo-bucket', R2_RECEIPT_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64') };
  const run = (changes: NodeJS.ProcessEnv = {}) => spawnSync(process.execPath, [path.join(__dirname, 'deploy-config.js'), file], { env: { ...env, ...changes }, encoding: 'utf8' });
  try {
    const valid = run(); assert.equal(valid.status, 0); assert.equal(valid.stdout, 'cirox_deploy_test');
    const config = fs.readFileSync(file, 'utf8');
    assert.ok(config.startsWith('[client]\nprotocol=tcp\nhost="127.0.0.1"\n'));
    assert.ok(config.includes('password="a\\"b\\\\c\\nline\\tmore"'));
    assert.ok(!valid.stdout.includes(env.DB_PASSWORD) && !valid.stderr.includes(env.DB_PASSWORD));
    if (process.platform !== 'win32') assert.equal(fs.statSync(file).mode & 0o777, 0o600);
    assert.equal(run().status, 1); assert.equal(fs.readFileSync(file, 'utf8'), config);
    fs.unlinkSync(file);
    const http = run({ PUBLIC_FRONTEND_ORIGINS: 'http://cirox.example.test' });
    assert.equal(http.status, 1); assert.ok(http.stderr.includes('HTTPS')); assert.ok(!fs.existsSync(file));
    const missingKey = run({ R2_SECRET_ACCESS_KEY: '' });
    assert.equal(missingKey.status, 1); assert.ok(missingKey.stderr.includes('R2_SECRET_ACCESS_KEY')); assert.ok(!fs.existsSync(file));
  } finally {
    if (fs.existsSync(file)) fs.unlinkSync(file);
    fs.rmdirSync(directory);
  }
});
