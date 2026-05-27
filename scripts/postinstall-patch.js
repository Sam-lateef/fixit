/**
 * Root-level postinstall guard.
 *
 * `patch-package` lives in mobile devDeps and is hoisted to the repo root
 * only when mobile is installed (e.g. EAS, or `npm install` at repo root).
 *
 * The API Dockerfile runs `npm ci -w api -w app` which skips mobile, so
 * patch-package is absent and `npm postinstall` would crash with
 * "patch-package: not found" (exit 127). Skip silently in that case.
 *
 * Likewise, if react-native isn't hoisted to the repo root (standalone
 * mobile install applies its own patches via mobile/scripts/postinstall-patch.js),
 * there is nothing to patch here.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const patchPackageBin = path.join(repoRoot, 'node_modules', '.bin', 'patch-package');
const patchPackageBinWin = patchPackageBin + '.cmd';
const hoistedReactNative = path.join(repoRoot, 'node_modules', 'react-native');

if (!fs.existsSync(patchPackageBin) && !fs.existsSync(patchPackageBinWin)) {
  console.log(
    '[root postinstall] patch-package not installed (API-only build); skipping',
  );
  process.exit(0);
}

if (!fs.existsSync(hoistedReactNative)) {
  console.log(
    '[root postinstall] react-native not hoisted to repo root; skipping patch-package',
  );
  process.exit(0);
}

execSync('npx patch-package', { stdio: 'inherit', cwd: repoRoot });
