import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(__dirname, "..", "assets", "images");
const wrench = join(assetsDir, "fixit-adaptive-fg-1024.png");
const out = join(assetsDir, "splash-icon.png");

const canvas = 1024;
const tile = 380;
const wrenchSize = 210;
const radius = 90;
const green = { r: 27, g: 67, b: 50, alpha: 1 };

const wrenchPng = await sharp(wrench)
  .resize(wrenchSize, wrenchSize, {
    fit: "contain",
    background: { r: 255, g: 255, b: 255, alpha: 0 },
  })
  .png()
  .toBuffer();

const tileSvg = Buffer.from(
  `<svg width="${tile}" height="${tile}"><rect width="${tile}" height="${tile}" rx="${radius}" ry="${radius}" fill="#ffffff"/></svg>`
);

const whiteTile = await sharp(tileSvg)
  .png()
  .composite([{ input: wrenchPng, gravity: "center" }])
  .png()
  .toBuffer();

await sharp({
  create: {
    width: canvas,
    height: canvas,
    channels: 4,
    background: green,
  },
})
  .composite([{ input: whiteTile, gravity: "center" }])
  .png()
  .toFile(out);

console.log("Wrote", out);
