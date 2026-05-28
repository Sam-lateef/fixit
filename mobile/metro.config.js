// Metro config for monorepo (npm workspaces).
// Without this, release-mode bundling (`gradlew assembleRelease` / `export:embed`)
// can't resolve `expo-router/entry` when react-native + expo-router are hoisted
// to the repo-root node_modules.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
// Keep hierarchical lookup ENABLED so Metro can find packages npm nested
// under react-native/node_modules (e.g. @react-native/virtualized-lists).

module.exports = config;
