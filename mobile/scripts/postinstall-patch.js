/**
 * Apply react-native patch when it lives in mobile/node_modules (standalone install).
 * Skip when npm workspaces hoist react-native to the repo root — root postinstall runs patch-package there (EAS).
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const mobileRoot = path.join(__dirname, '..');
const localReactNative = path.join(mobileRoot, 'node_modules', 'react-native');

if (!fs.existsSync(localReactNative)) {
  console.log(
    '[mobile postinstall] react-native not in mobile/node_modules (workspace hoist); skipping patch-package',
  );
  process.exit(0);
}

execSync('patch-package', { stdio: 'inherit', cwd: mobileRoot });
