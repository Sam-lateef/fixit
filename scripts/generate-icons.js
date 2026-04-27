/**
 * One-off: regenerate FixIt launcher / notification icons.
 *
 * Why: existing assets were 1376x768 (landscape) which iOS distorts in the
 * home-screen square slot, and `Fix.png` was square but transparent (Apple
 * rejects transparent icons). This script outputs:
 *
 *   - fixit-icon-1024.png        — 1024x1024 opaque white bg, centered wrench
 *                                  → used for `icon` and `ios.icon`
 *   - fixit-adaptive-fg-1024.png — 1024x1024 transparent bg, wrench in 66%
 *                                  safe-zone → used for Android adaptiveIcon
 *                                  foreground (Android paints its own bg)
 *   - fixit-notification-96.png  — 96x96 white-on-transparent silhouette →
 *                                  Android notification icon (system tints it)
 */
const sharp = require("sharp");
const path = require("path");

const SRC_LANDSCAPE = path.resolve(
  __dirname,
  "..",
  "mobile",
  "assets",
  "images",
  "launcher-wrench-green.png",
);
const SRC_NOTIF = path.resolve(
  __dirname,
  "..",
  "mobile",
  "assets",
  "images",
  "android-notification-wrench.png",
);
const OUT_DIR = path.resolve(__dirname, "..", "mobile", "assets", "images");

async function makeSquareOpaque(input, output) {
  const meta = await sharp(input).metadata();
  // Centered square crop from landscape source.
  const side = Math.min(meta.width, meta.height);
  const left = Math.floor((meta.width - side) / 2);
  const top = Math.floor((meta.height - side) / 2);
  await sharp(input)
    .extract({ left, top, width: side, height: side })
    .resize(1024, 1024, { fit: "cover" })
    // Flatten onto white so any transparency becomes opaque white (iOS req).
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png({ compressionLevel: 9 })
    .toFile(output);
  console.log(`✓ ${path.basename(output)}  1024x1024 opaque`);
}

async function makeAdaptiveForeground(input, output) {
  const meta = await sharp(input).metadata();
  const side = Math.min(meta.width, meta.height);
  const left = Math.floor((meta.width - side) / 2);
  const top = Math.floor((meta.height - side) / 2);
  // Extract centered square then shrink wrench into ~66% safe zone, padding
  // the rest with transparent so Android's adaptive-icon mask doesn't crop it.
  const inner = await sharp(input)
    .extract({ left, top, width: side, height: side })
    .resize(672, 672, { fit: "cover" })
    .toBuffer();
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: inner, top: 176, left: 176 }])
    .png({ compressionLevel: 9 })
    .toFile(output);
  console.log(`✓ ${path.basename(output)}  1024x1024 transparent (safe zone)`);
}

async function makeNotificationIcon(input, output) {
  const meta = await sharp(input).metadata();
  const side = Math.min(meta.width, meta.height);
  const left = Math.floor((meta.width - side) / 2);
  const top = Math.floor((meta.height - side) / 2);
  // Existing source is white-on-transparent, just needs to be square + small.
  // Android tints this in the status bar so the actual color doesn't matter.
  await sharp(input)
    .extract({ left, top, width: side, height: side })
    .resize(96, 96, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(output);
  console.log(`✓ ${path.basename(output)}  96x96 white-on-transparent`);
}

async function main() {
  await makeSquareOpaque(SRC_LANDSCAPE, path.join(OUT_DIR, "fixit-icon-1024.png"));
  await makeAdaptiveForeground(SRC_LANDSCAPE, path.join(OUT_DIR, "fixit-adaptive-fg-1024.png"));
  await makeNotificationIcon(SRC_NOTIF, path.join(OUT_DIR, "fixit-notification-96.png"));
  console.log("\nDone. Wire into mobile/app.json next.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
