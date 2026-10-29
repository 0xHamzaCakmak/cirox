const assert = require('node:assert/strict');
const { test } = require('node:test');
const path = require('node:path');
const { releaseAction } = require('./pm2-release.cjs');

const project = require('node:fs').realpathSync(path.join(__dirname, '..'));
const oldBackend = path.join(project, '.deploy', 'releases', 'old', 'backend');
const newBackend = path.join(project, '.deploy', 'releases', 'new', 'backend');
const name = 'sube-analitik-cirox-api';
const processFor = (cwd, script = path.join(cwd, 'dist', 'main.js')) => ({ name, pm2_env: { pm_cwd: cwd, pm_exec_path: script, CIROX_RELEASE_SHA: 'new-commit' } });

test('a new environment SHA cannot conceal an old running script or cwd', () => {
  assert.equal(releaseAction([processFor(oldBackend)], name, project, newBackend), 'replace');
  assert.throws(() => releaseAction([processFor(oldBackend)], name, project, newBackend, true), /yeni backend/);
  assert.equal(releaseAction([processFor(newBackend, path.join(oldBackend, 'dist', 'main.js'))], name, project, newBackend), 'replace');
});
test('new installs and same-release reloads preserve unrelated PM2 processes', () => {
  const other = { name: 'masamqr-api', pm2_env: { pm_cwd: '/another-project' } };
  assert.equal(releaseAction([other], name, project, newBackend), 'start');
  assert.equal(releaseAction([other, processFor(newBackend)], name, project, newBackend), 'reload');
  assert.equal(releaseAction([other, processFor(newBackend)], name, project, newBackend, true), 'reload');
  assert.throws(() => releaseAction([other], name, project, newBackend, true), /baslatilamadi/);
});
test('foreign paths and duplicate application names are rejected before replacement', () => {
  const foreign = path.resolve(project, '..', 'unrelated', 'backend');
  assert.throws(() => releaseAction([processFor(foreign)], name, project, newBackend), /ait degil/);
  assert.throws(() => releaseAction([], name, project, foreign), /ait degil/);
  assert.throws(() => releaseAction([processFor(newBackend), processFor(oldBackend)], name, project, newBackend), /birden fazla/);
});
test('rollback also replaces a newer script with the requested older release', () => {
  assert.equal(releaseAction([processFor(newBackend)], name, project, oldBackend), 'replace');
  assert.equal(releaseAction([processFor(oldBackend)], name, project, oldBackend, true), 'reload');
});
