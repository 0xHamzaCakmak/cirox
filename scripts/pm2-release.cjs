const fs = require('node:fs');
const path = require('node:path');

function ownedPath(project, value) {
  if (typeof value !== 'string' || !path.isAbsolute(value)) throw new Error('PM2 uygulama yolu eksik veya gecersiz.');
  const resolved = path.resolve(value);
  const relative = path.relative(project, resolved);
  if (!relative || relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) {
    throw new Error('PM2 uygulamasi bu proje klasorune ait degil. Islem durduruldu.');
  }
  return resolved;
}

function releaseAction(processes, name, projectDirectory, backendDirectory, verify = false) {
  const project = fs.realpathSync(projectDirectory);
  const backend = ownedPath(project, backendDirectory);
  const expectedScript = path.join(backend, 'dist', 'main.js');
  const matches = processes.filter(process => process.name === name);
  if (matches.length > 1) throw new Error('Ayni adda birden fazla PM2 uygulamasi var. Islem durduruldu.');
  if (!matches.length) {
    if (verify) throw new Error('CIROX PM2 uygulamasi baslatilamadi.');
    return 'start';
  }
  const environment = matches[0].pm2_env || {};
  const cwd = ownedPath(project, environment.pm_cwd);
  const script = ownedPath(project, environment.pm_exec_path);
  if (cwd !== backend || script !== expectedScript) {
    if (verify) throw new Error('PM2 yeni backend dosya yoluna gecmedi. Frontend yayinlanmadi.');
    return 'replace';
  }
  return 'reload';
}

module.exports = { releaseAction };
if (require.main === module) {
  try {
    const [file, name, project, backend, mode] = process.argv.slice(2);
    const action = releaseAction(JSON.parse(fs.readFileSync(file, 'utf8')), name, project, backend, mode === 'verify');
    if (mode !== 'verify') process.stdout.write(action);
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'PM2 surumu dogrulanamadi.');
    process.exitCode = 1;
  }
}
