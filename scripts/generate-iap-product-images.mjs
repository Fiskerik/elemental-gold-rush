import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const OUTPUT_DIR = join(process.cwd(), "app-store-iap-images");
const SIZE = 1024;

function singleCoin(cx, cy, r, rotate = 0, opacity = 1) {
  const thickness = Math.max(12, r * 0.18);
  return `
    <g transform="translate(${cx} ${cy}) rotate(${rotate})" opacity="${opacity}">
      <path d="M ${-r} 0 C ${-r * 0.92} ${thickness}, ${r * 0.92} ${thickness}, ${r} 0 L ${r} ${thickness * 0.7} C ${r * 0.86} ${thickness * 1.8}, ${-r * 0.86} ${thickness * 1.8}, ${-r} ${thickness * 0.7} Z"
        fill="url(#coinEdge)" stroke="#8b5200" stroke-width="${Math.max(2, r * 0.025)}"/>
      <ellipse cx="0" cy="0" rx="${r}" ry="${r * 0.72}" fill="url(#coinFace)" stroke="#fff4a8" stroke-width="${Math.max(3, r * 0.055)}"/>
      <ellipse cx="0" cy="0" rx="${r * 0.68}" ry="${r * 0.46}" fill="none" stroke="#b87200" stroke-width="${Math.max(3, r * 0.045)}" opacity="0.62"/>
      <circle cx="0" cy="0" r="${r * 0.18}" fill="#fff1a0" opacity="0.58"/>
      <ellipse cx="${-r * 0.22}" cy="${-r * 0.24}" rx="${r * 0.28}" ry="${r * 0.11}" fill="#fffad0" opacity="0.7"/>
      <path d="M ${-r * 0.55} ${r * 0.18} C ${-r * 0.2} ${r * 0.38}, ${r * 0.2} ${r * 0.38}, ${r * 0.55} ${r * 0.18}" fill="none" stroke="#7f4700" stroke-width="${Math.max(2, r * 0.04)}" opacity="0.34"/>
    </g>
  `;
}

function star(cx, cy, r, opacity = 1) {
  return `
    <g transform="translate(${cx} ${cy})" opacity="${opacity}">
      <path d="M0 ${-r} L${r * 0.16} ${-r * 0.16} L${r} 0 L${r * 0.16} ${r * 0.16} L0 ${r} L${-r * 0.16} ${r * 0.16} L${-r} 0 L${-r * 0.16} ${-r * 0.16} Z" fill="#fff8b8"/>
    </g>
  `;
}

function coinLayer(rx, ry, y, opacity = 1) {
  return `
    <g opacity="${opacity}">
      <ellipse cx="0" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#coinEdge)" stroke="#8b5200" stroke-width="3"/>
      <path d="M ${-rx} ${y} C ${-rx * 0.72} ${y + ry * 0.78}, ${rx * 0.72} ${y + ry * 0.78}, ${rx} ${y}" fill="none" stroke="#fff1a0" stroke-width="3" opacity="0.55"/>
    </g>
  `;
}

function coinColumn(cx, baseY, r, layers, rotate = 0, opacity = 1) {
  const rx = r;
  const ry = r * 0.42;
  const layerGap = Math.max(7, r * 0.17);
  const topY = -layers * layerGap;
  const layerLines = Array.from({ length: layers }, (_, index) =>
    coinLayer(rx, ry, -index * layerGap, 0.85 + index / layers * 0.15),
  ).join("");

  return `
    <g transform="translate(${cx} ${baseY}) rotate(${rotate})" opacity="${opacity}">
      <path d="M ${-rx} ${topY} L ${-rx} 0 C ${-rx * 0.82} ${ry * 1.05}, ${rx * 0.82} ${ry * 1.05}, ${rx} 0 L ${rx} ${topY} C ${rx * 0.78} ${topY + ry * 0.92}, ${-rx * 0.78} ${topY + ry * 0.92}, ${-rx} ${topY} Z"
        fill="#b36f00" opacity="0.68"/>
      ${layerLines}
      <ellipse cx="0" cy="${topY}" rx="${rx}" ry="${ry}" fill="url(#coinFace)" stroke="#fff4a8" stroke-width="${Math.max(3, r * 0.06)}"/>
      <ellipse cx="0" cy="${topY}" rx="${rx * 0.66}" ry="${ry * 0.58}" fill="none" stroke="#9b6000" stroke-width="${Math.max(2, r * 0.045)}" opacity="0.62"/>
      <ellipse cx="${-rx * 0.25}" cy="${topY - ry * 0.22}" rx="${rx * 0.28}" ry="${ry * 0.15}" fill="#fffad0" opacity="0.62"/>
    </g>
  `;
}

function fiveCoinPile() {
  return [
    singleCoin(334, 568, 128, -15),
    singleCoin(512, 572, 136, 5),
    singleCoin(688, 568, 126, 14),
    singleCoin(422, 436, 118, -8),
    singleCoin(598, 432, 116, 10),
  ].join("");
}

function stackedCoinPile(multiplier) {
  const configs =
    multiplier === 20
      ? [
          [322, 640, 76, 4, -6],
          [438, 620, 82, 5, 4],
          [556, 628, 82, 5, -3],
          [674, 642, 76, 4, 5],
          [500, 514, 74, 4, 0],
        ]
      : multiplier === 50
        ? [
            [228, 660, 58, 4, -8],
            [318, 628, 64, 6, 5],
            [420, 612, 68, 7, -4],
            [526, 604, 70, 8, 3],
            [636, 618, 66, 7, -3],
            [732, 650, 60, 5, 7],
            [374, 500, 58, 5, -5],
            [586, 500, 58, 5, 5],
          ]
        : [
            [172, 672, 45, 6, -8],
            [242, 650, 50, 8, 4],
            [322, 628, 54, 10, -5],
            [414, 608, 58, 12, 3],
            [512, 598, 60, 14, 0],
            [610, 608, 58, 12, -3],
            [702, 632, 54, 10, 5],
            [784, 660, 48, 8, -5],
            [354, 480, 48, 8, 4],
            [508, 454, 50, 9, -2],
            [662, 486, 46, 7, 6],
          ];

  return configs
    .map(([cx, baseY, r, layers, rotate], index) =>
      coinColumn(cx, baseY, r, layers, rotate, 0.94 + (index % 3) * 0.02),
    )
    .join("");
}

function coinStack(multiplier) {
  return multiplier === 5 ? fiveCoinPile() : stackedCoinPile(multiplier);
}

function sharedDefs() {
  return `
    <defs>
      <radialGradient id="bgGlow" cx="50%" cy="42%" r="70%">
        <stop offset="0%" stop-color="#0b76b8"/>
        <stop offset="36%" stop-color="#082860"/>
        <stop offset="76%" stop-color="#02081e"/>
        <stop offset="100%" stop-color="#00030f"/>
      </radialGradient>
      <radialGradient id="coinFace" cx="35%" cy="22%" r="78%">
        <stop offset="0%" stop-color="#fffbc0"/>
        <stop offset="22%" stop-color="#ffe15a"/>
        <stop offset="56%" stop-color="#f0a900"/>
        <stop offset="100%" stop-color="#8a5400"/>
      </radialGradient>
      <linearGradient id="coinEdge" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fff6a3"/>
        <stop offset="38%" stop-color="#ffbf17"/>
        <stop offset="100%" stop-color="#8b4d00"/>
      </linearGradient>
      <linearGradient id="titleGold" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#fff7a2"/>
        <stop offset="46%" stop-color="#ffd717"/>
        <stop offset="100%" stop-color="#f08c00"/>
      </linearGradient>
      <filter id="softGlow" x="-35%" y="-35%" width="170%" height="170%">
        <feGaussianBlur stdDeviation="18" result="blur"/>
        <feColorMatrix in="blur" type="matrix" values="1 0 0 0 1  0 0.72 0 0 0.64  0 0 0.2 0 0.05  0 0 0 0.95 0"/>
        <feMerge>
          <feMergeNode/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <filter id="textShadow" x="-25%" y="-25%" width="150%" height="150%">
        <feDropShadow dx="0" dy="8" stdDeviation="5" flood-color="#000000" flood-opacity="0.72"/>
        <feDropShadow dx="0" dy="0" stdDeviation="8" flood-color="#ffb400" flood-opacity="0.55"/>
      </filter>
    </defs>
  `;
}

function coinPile(multiplier) {
  const coins = coinStack(multiplier);

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
      ${sharedDefs()}
      <rect width="1024" height="1024" rx="96" fill="url(#bgGlow)"/>
      <rect x="38" y="38" width="948" height="948" rx="72" fill="none" stroke="#6fd9ff" stroke-opacity="0.38" stroke-width="8"/>
      <circle cx="512" cy="448" r="380" fill="#13a7ff" opacity="0.08"/>
      <circle cx="512" cy="448" r="295" fill="#ffffff" opacity="0.035"/>
      <g stroke="#58d8ff" stroke-opacity="0.16" stroke-width="3" fill="none">
        <ellipse cx="512" cy="458" rx="352" ry="128" transform="rotate(18 512 458)"/>
        <ellipse cx="512" cy="458" rx="352" ry="128" transform="rotate(-24 512 458)"/>
        <ellipse cx="512" cy="458" rx="352" ry="128" transform="rotate(82 512 458)"/>
      </g>
      ${star(188, 188, 30, 0.9)}
      ${star(818, 214, 21, 0.75)}
      ${star(784, 372, 15, 0.45)}
      ${star(228, 354, 14, 0.55)}
      <g filter="url(#softGlow)">${coins}</g>
      <text x="512" y="846" text-anchor="middle"
        font-family="Arial Black, Impact, system-ui, sans-serif"
        font-size="186"
        font-weight="900"
        letter-spacing="-5"
        fill="url(#titleGold)"
        stroke="#5a2a00"
        stroke-width="11"
        paint-order="stroke fill"
        filter="url(#textShadow)">${multiplier}x</text>
    </svg>
  `;
}

function labPack() {
  const orbit = (rotate, color = "#ffd600") => `
    <ellipse cx="512" cy="500" rx="280" ry="112" transform="rotate(${rotate} 512 500)"
      fill="none" stroke="${color}" stroke-width="26" stroke-linecap="round" opacity="0.95"/>
  `;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
      ${sharedDefs()}
      <rect width="1024" height="1024" rx="96" fill="url(#bgGlow)"/>
      <rect x="38" y="38" width="948" height="948" rx="72" fill="none" stroke="#6fd9ff" stroke-opacity="0.38" stroke-width="8"/>
      <circle cx="512" cy="500" r="348" fill="#03102e" stroke="#31c8ff" stroke-opacity="0.4" stroke-width="10"/>
      <circle cx="512" cy="500" r="292" fill="#03285f" opacity="0.52"/>
      ${star(210, 192, 31, 0.95)}
      ${star(804, 228, 24, 0.7)}
      ${star(760, 764, 18, 0.65)}
      <g filter="url(#softGlow)">
        ${orbit(0)}
        ${orbit(60)}
        ${orbit(120)}
        <circle cx="512" cy="500" r="88" fill="url(#coinFace)" stroke="#fff4a8" stroke-width="12"/>
        <circle cx="512" cy="500" r="34" fill="#fff7a6" opacity="0.78"/>
        <circle cx="512" cy="276" r="34" fill="#fff0a0"/>
        <circle cx="296" cy="584" r="30" fill="#ffd717"/>
        <circle cx="728" cy="584" r="30" fill="#ffd717"/>
      </g>
      <path d="M512 165 C614 258 710 310 822 318 C790 426 810 540 864 637 C754 661 650 732 594 829 C506 770 392 770 306 829 C278 721 206 627 108 568 C199 496 246 388 235 273 C342 284 435 240 512 165 Z"
        fill="none" stroke="#ffcf21" stroke-width="22" stroke-linejoin="round" opacity="0.95" filter="url(#textShadow)"/>
      <text x="512" y="894" text-anchor="middle"
        font-family="Arial Black, Impact, system-ui, sans-serif"
        font-size="96"
        font-weight="900"
        letter-spacing="4"
        fill="url(#titleGold)"
        stroke="#4c2400"
        stroke-width="8"
        paint-order="stroke fill"
        filter="url(#textShadow)">PRO LAB</text>
    </svg>
  `;
}

async function writePng(name, svg) {
  const outputPath = join(OUTPUT_DIR, name);
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(outputPath);
  return outputPath;
}

await mkdir(OUTPUT_DIR, { recursive: true });

const outputs = [
  await writePng("coins_5_1024.png", coinPile(5)),
  await writePng("coins_20_1024.png", coinPile(20)),
  await writePng("coins_50_1024.png", coinPile(50)),
  await writePng("coins_100_1024.png", coinPile(100)),
  await writePng("pro_lab_pack_lifetime_1024.png", labPack()),
];

for (const output of outputs) {
  console.log(output);
}
