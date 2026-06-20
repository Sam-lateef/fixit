import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = join(__dirname, "..");
const publicDir = join(appRoot, "public");
const sourceIcon = join(
  appRoot,
  "..",
  "mobile",
  "assets",
  "images",
  "fixit-icon-1024.png",
);

const sizes = [
  { name: "favicon-16x16.png", size: 16 },
  { name: "favicon-32x32.png", size: 32 },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
];

await mkdir(publicDir, { recursive: true });

for (const { name, size } of sizes) {
  await sharp(sourceIcon)
    .resize(size, size, { fit: "cover" })
    .png()
    .toFile(join(publicDir, name));
}

const favicon16 = await sharp(sourceIcon).resize(16, 16).png().toBuffer();
const favicon32 = await sharp(sourceIcon).resize(32, 32).png().toBuffer();
const faviconIco = await pngToIco([favicon16, favicon32]);
await writeFile(join(publicDir, "favicon.ico"), faviconIco);

console.log("Web icons written to app/public/");
