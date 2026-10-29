const path = require('node:path');
const backendDirectory = path.resolve(process.env.CIROX_BACKEND_DIR || __dirname);
module.exports = {
  apps: [{
    name: 'sube-analitik-cirox-api',
    cwd: backendDirectory,
    script: path.join(backendDirectory, 'dist', 'main.js'),
    interpreter: process.execPath,
    instances: 1,
    exec_mode: 'fork',
    env_production: {
      NODE_ENV: 'production', HOST: '127.0.0.1',
      PORT: process.env.CIROX_BACKEND_PORT || '4002',
      DB_SYNCHRONIZE: 'false',
      CIROX_RELEASE_SHA: process.env.CIROX_RELEASE_SHA || '',
    },
    time: true,
    max_memory_restart: '512M',
    kill_timeout: 12000,
  }],
};
