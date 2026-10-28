module.exports = {
  apps: [{
    name: 'sube-analitik-cirox-api',
    cwd: __dirname,
    script: 'dist/main.js',
    instances: 1,
    exec_mode: 'fork',
    env_production: { NODE_ENV: 'production', HOST: '127.0.0.1', PORT: '4002' },
    time: true,
    max_memory_restart: '512M',
    kill_timeout: 12000,
  }],
};
