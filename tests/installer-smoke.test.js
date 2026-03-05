'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const INSTALLER = path.join(ROOT, 'bin', 'install.js');

const RUNTIMES = [
  { key: 'claude', flag: '--claude' },
  { key: 'codex', flag: '--codex' },
  { key: 'cursor', flag: '--cursor' },
  { key: 'copilot', flag: '--copilot' },
  { key: 'gemini', flag: '--gemini' },
  { key: 'amazon-q', flag: '--amazon-q' },
  { key: 'windsurf', flag: '--windsurf' },
  { key: 'opencode', flag: '--opencode' },
  { key: 'aider', flag: '--aider' },
];

function runInstaller(args, cwd, homeDir) {
  return spawnSync(process.execPath, [INSTALLER, ...args], {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      HOME: homeDir,
      USERPROFILE: homeDir,
    },
  });
}

function expectedManifestPath(projectDir, runtimeKey) {
  if (runtimeKey === 'claude') {
    return path.join(projectDir, '.claude', 'legion', 'manifest.json');
  }
  return path.join(projectDir, '.legion', 'manifest.json');
}

function assertRunOk(result, contextLabel) {
  assert.equal(
    result.status,
    0,
    `${contextLabel} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
  );
}

test('installer local mode smoke test across all runtimes', async (t) => {
  const sandboxRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'legion-smoke-'));
  const homeDir = path.join(sandboxRoot, 'home');
  fs.mkdirSync(homeDir, { recursive: true });

  t.after(() => {
    fs.rmSync(sandboxRoot, { recursive: true, force: true });
  });

  for (const runtime of RUNTIMES) {
    await t.test(`${runtime.key} install + uninstall`, () => {
      const projectDir = path.join(sandboxRoot, `project-${runtime.key}`);
      fs.mkdirSync(projectDir, { recursive: true });

      const installResult = runInstaller([runtime.flag, '--local'], projectDir, homeDir);
      assertRunOk(installResult, `${runtime.key} install`);

      const manifestFile = expectedManifestPath(projectDir, runtime.key);
      assert.ok(fs.existsSync(manifestFile), `${runtime.key}: manifest.json should exist`);

      const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
      assert.equal(manifest.runtime, runtime.key, `${runtime.key}: runtime mismatch in manifest`);
      assert.equal(manifest.scope, 'local', `${runtime.key}: scope mismatch in manifest`);
      assert.ok(fs.existsSync(manifest.paths.agents), `${runtime.key}: agents directory missing`);
      assert.ok(fs.existsSync(manifest.paths.commands), `${runtime.key}: commands directory missing`);
      assert.ok(fs.existsSync(path.join(manifest.paths.commands, 'build.md')), `${runtime.key}: build.md missing`);

      const uninstallResult = runInstaller([runtime.flag, '--local', '--uninstall'], projectDir, homeDir);
      assertRunOk(uninstallResult, `${runtime.key} uninstall`);
      assert.ok(!fs.existsSync(manifestFile), `${runtime.key}: manifest.json should be removed after uninstall`);
    });
  }
});

test('installer --verify validates checksums in local source installs', () => {
  const sandboxRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'legion-verify-'));
  const homeDir = path.join(sandboxRoot, 'home');
  const projectDir = path.join(sandboxRoot, 'project');
  fs.mkdirSync(homeDir, { recursive: true });
  fs.mkdirSync(projectDir, { recursive: true });

  const installResult = runInstaller(['--codex', '--local', '--verify'], projectDir, homeDir);
  assertRunOk(installResult, 'codex install --verify');
  assert.match(installResult.stdout, /Integrity verification passed/, 'verify output should confirm checksum validation');

  fs.rmSync(sandboxRoot, { recursive: true, force: true });
});
