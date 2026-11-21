/** Genera les icones de l'app (PWA, Apple i favicon) a partir del logotip. */
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(__dirname, "..");
const logo = (size: number, padding: number, rounded: boolean) => {
  const r = rounded ? size * 0.22 : 0;
  const inner = size - padding * 2;
  const s = inner / 24;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3B82F6"/><stop offset="1" stop-color="#22D3EE"/></linearGradient>
    <radialGradient id="bg" cx="0.3" cy="0.2" r="1"><stop offset="0" stop-color="#0F1E3D"/><stop offset="1" stop-color="#05070D"/></radialGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${r}" fill="url(#bg)"/>
  <rect x="${padding}" y="${padding}" width="${inner}" height="${inner}" rx="${inner * 0.24}" fill="url(#g)"/>
  <g transform="translate(${padding} ${padding}) scale(${s})" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4.5 16.5l4.5-5.4 3.6 2.7 5.4-7.2"/><path d="M15.3 6.6h2.7v2.7"/>
  </g>
</svg>`);
};

const out = [
  { file: "public/icons/icon-192.png", size: 192, pad: 28, rounded: true },
  { file: "public/icons/icon-512.png", size: 512, pad: 76, rounded: true },
  { file: "public/icons/maskable-512.png", size: 512, pad: 120, rounded: false },
  { file: "app/apple-icon.png", size: 180, pad: 24, rounded: false },
  { file: "app/icon.png", size: 64, pad: 6, rounded: true },
];

void Promise.all(out.map((o) => sharp(logo(o.size, o.pad, o.rounded)).png().toFile(path.join(root, o.file)))).then(() => console.log("Icones generades"));
