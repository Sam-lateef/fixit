import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "iq.fixit.app",
  appName: "Fix It Iraq",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
