// Local entry shim for monorepo + Windows builds.
// React Native Gradle Plugin's cliPath() emits a *relative* entry path on
// Windows. When expo-router is hoisted to the repo-root node_modules, that
// relative path traverses out of the mobile/ workspace and confuses
// @expo/cli's project-root inference. Re-importing expo-router/entry from a
// mobile-local file keeps the Gradle-passed entry path inside mobile/ and
// lets Metro's resolver (configured in metro.config.js) find expo-router in
// the hoisted location. Linux/Mac builds (EAS) work either way.
import "expo-router/entry";
