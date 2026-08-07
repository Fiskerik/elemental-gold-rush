import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const marketingDirectory = path.join(projectDirectory, "marketing", "tiktok-slideshow");

const width = 1080;
const height = 1920;
const backgroundPath = path.join(marketingDirectory, "pinterest-lab-background.png");
const gameplayPath = path.join(projectDirectory, "screenshots", "store", "iphone_gameplay.png");
const collectionPath = path.join(projectDirectory, "screenshots", "store", "iphone_collection.png");
const powerUpShowcasePath = path.join(marketingDirectory, "powerup-icon-showcase.png");
const iconPath = path.join(projectDirectory, "public", "game-icon.png");
const existingEndCardPath = path.join(projectDirectory, "marketing", "tiktok-end-card.png");

function svg(markup) {
  return Buffer.from(
    `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${markup}</svg>`,
  );
}

function roundedMask(maskWidth, maskHeight, radius = 38) {
  return Buffer.from(
    `<svg width="${maskWidth}" height="${maskHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="${maskWidth}" height="${maskHeight}" rx="${radius}" fill="#ffffff"/></svg>`,
  );
}

async function roundedImage(source, targetWidth, targetHeight, position = "centre") {
  const resized = await sharp(source)
    .resize(targetWidth, targetHeight, { fit: "cover", position })
    .png()
    .toBuffer();

  return sharp(resized)
    .composite([{ input: roundedMask(targetWidth, targetHeight), blend: "dest-in" }])
    .png()
    .toBuffer();
}

function type({ eyebrow, title, body, slide, accent = "#FFD24E", titleSize = 82, titleY = 336 }) {
  const titleLines = title
    .map(
      (line, index) =>
        `<tspan x="540" y="${titleY + index * (titleSize + 8)}">${line}</tspan>`,
    )
    .join("");
  const bodyY = titleY + title.length * (titleSize + 8) + 42;

  return `
    <defs>
      <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#020616" stop-opacity="0.22"/>
        <stop offset="0.44" stop-color="#020616" stop-opacity="0.65"/>
        <stop offset="1" stop-color="#020616" stop-opacity="0.93"/>
      </linearGradient>
      <filter id="text-shadow" x="-25%" y="-25%" width="150%" height="150%">
        <feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#00020B" flood-opacity="0.88"/>
      </filter>
    </defs>
    <rect width="1080" height="1920" fill="url(#shade)"/>
    <rect x="66" y="108" width="142" height="47" rx="23.5" fill="#071630" fill-opacity="0.94" stroke="#7ED3FF" stroke-opacity="0.55"/>
    <text x="137" y="139" text-anchor="middle" fill="#D8F1FF" font-family="Arial, sans-serif" font-size="21" font-weight="800" letter-spacing="1">${slide} / 5</text>
    <text x="540" y="224" text-anchor="middle" fill="${accent}" font-family="Arial, sans-serif" font-size="18" font-weight="900" letter-spacing="3.2">${eyebrow}</text>
    <text text-anchor="middle" fill="#FFFFFF" font-family="Arial Black, Arial, sans-serif" font-size="${titleSize}" font-weight="900" letter-spacing="-2" filter="url(#text-shadow)">${titleLines}</text>
    <text x="540" y="${bodyY}" text-anchor="middle" fill="#D6E7F9" font-family="Arial, sans-serif" font-size="31" font-weight="600">${body}</text>
    <rect x="174" y="${bodyY + 34}" width="732" height="2" rx="1" fill="#7DD5FF" fill-opacity="0.45"/>
  `;
}

function mediaFrame(x, y, frameWidth, frameHeight, accent = "#69C9FF") {
  return `
    <rect x="${x - 14}" y="${y - 14}" width="${frameWidth + 28}" height="${frameHeight + 28}" rx="54" fill="#020617" fill-opacity="0.86" stroke="${accent}" stroke-opacity="0.76" stroke-width="3"/>
    <rect x="${x - 4}" y="${y - 4}" width="${frameWidth + 8}" height="${frameHeight + 8}" rx="43" fill="none" stroke="#FFFFFF" stroke-opacity="0.12" stroke-width="2"/>
  `;
}

function atomDiagram() {
  return `
    <g filter="url(#text-shadow)">
      <circle cx="294" cy="1015" r="99" fill="#64C7F4" stroke="#C3F2FF" stroke-width="6"/>
      <circle cx="488" cy="1015" r="99" fill="#64C7F4" stroke="#C3F2FF" stroke-width="6"/>
      <circle cx="783" cy="1015" r="117" fill="#F9B5D2" stroke="#FFE0EE" stroke-width="7"/>
      <text x="294" y="994" text-anchor="middle" fill="#071327" font-family="Arial, sans-serif" font-size="34" font-weight="900">1</text>
      <text x="294" y="1049" text-anchor="middle" fill="#071327" font-family="Arial Black, Arial, sans-serif" font-size="63" font-weight="900">H</text>
      <text x="488" y="994" text-anchor="middle" fill="#071327" font-family="Arial, sans-serif" font-size="34" font-weight="900">1</text>
      <text x="488" y="1049" text-anchor="middle" fill="#071327" font-family="Arial Black, Arial, sans-serif" font-size="63" font-weight="900">H</text>
      <text x="783" y="985" text-anchor="middle" fill="#321120" font-family="Arial, sans-serif" font-size="34" font-weight="900">2</text>
      <text x="783" y="1050" text-anchor="middle" fill="#321120" font-family="Arial Black, Arial, sans-serif" font-size="76" font-weight="900">He</text>
      <text x="613" y="1047" text-anchor="middle" fill="#FFD24E" font-family="Arial Black, Arial, sans-serif" font-size="83" font-weight="900">→</text>
    </g>
    <text x="540" y="1197" text-anchor="middle" fill="#F6F0DF" font-family="Arial, sans-serif" font-size="28" font-weight="700">tiny science fact. huge brain-itch payoff.</text>
  `;
}

function gameAtomDiagram() {
  return `
    <defs>
      <!-- Classic AtomBall colours and radial lighting from ElementBall.tsx. -->
      <radialGradient id="hydrogen-ball" cx="30%" cy="28%" r="74%" fx="30%" fy="28%">
        <stop offset="0" stop-color="#BBDEFB"/>
        <stop offset="0.65" stop-color="#64B5F6"/>
        <stop offset="1" stop-color="#0A1830"/>
      </radialGradient>
      <radialGradient id="helium-ball" cx="30%" cy="28%" r="74%" fx="30%" fy="28%">
        <stop offset="0" stop-color="#FCE4EC"/>
        <stop offset="0.65" stop-color="#F48FB1"/>
        <stop offset="1" stop-color="#321321"/>
      </radialGradient>
      <radialGradient id="ball-sheen" cx="34%" cy="14%" r="70%" fx="34%" fy="14%">
        <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.42"/>
        <stop offset="0.32" stop-color="#FFFFFF" stop-opacity="0.08"/>
        <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <g filter="url(#text-shadow)">
      <circle cx="286" cy="1042" r="108" fill="url(#hydrogen-ball)" stroke="#D7F3FF" stroke-width="4"/>
      <circle cx="286" cy="1042" r="103" fill="url(#ball-sheen)"/>
      <circle cx="493" cy="1042" r="108" fill="url(#hydrogen-ball)" stroke="#D7F3FF" stroke-width="4"/>
      <circle cx="493" cy="1042" r="103" fill="url(#ball-sheen)"/>
      <circle cx="790" cy="1042" r="126" fill="url(#helium-ball)" stroke="#FFF0F5" stroke-width="4"/>
      <circle cx="790" cy="1042" r="121" fill="url(#ball-sheen)"/>
      <ellipse cx="248" cy="1004" rx="28" ry="15" fill="#FFFFFF" fill-opacity="0.22" transform="rotate(-31 248 1004)"/>
      <ellipse cx="455" cy="1004" rx="28" ry="15" fill="#FFFFFF" fill-opacity="0.22" transform="rotate(-31 455 1004)"/>
      <ellipse cx="746" cy="998" rx="32" ry="17" fill="#FFFFFF" fill-opacity="0.22" transform="rotate(-31 746 998)"/>
      <text x="286" y="1016" text-anchor="middle" fill="#0A0A1A" font-family="Arial, sans-serif" font-size="34" font-weight="900">1</text>
      <text x="286" y="1075" text-anchor="middle" fill="#0A0A1A" font-family="Arial Black, Arial, sans-serif" font-size="68" font-weight="900">H</text>
      <text x="493" y="1016" text-anchor="middle" fill="#0A0A1A" font-family="Arial, sans-serif" font-size="34" font-weight="900">1</text>
      <text x="493" y="1075" text-anchor="middle" fill="#0A0A1A" font-family="Arial Black, Arial, sans-serif" font-size="68" font-weight="900">H</text>
      <text x="790" y="1008" text-anchor="middle" fill="#0A0A1A" font-family="Arial, sans-serif" font-size="36" font-weight="900">2</text>
      <text x="790" y="1078" text-anchor="middle" fill="#0A0A1A" font-family="Arial Black, Arial, sans-serif" font-size="79" font-weight="900">He</text>
      <text x="634" y="1072" text-anchor="middle" fill="#FFD24E" font-family="Arial Black, Arial, sans-serif" font-size="83" font-weight="900">&#8594;</text>
    </g>
    <text x="540" y="1230" text-anchor="middle" fill="#F6F0DF" font-family="Arial, sans-serif" font-size="28" font-weight="700">tiny science fact. huge brain-itch payoff.</text>
  `;
}

async function base() {
  return sharp(backgroundPath)
    .resize(width, height, { fit: "cover", position: "centre" })
    .modulate({ brightness: 0.72, saturation: 0.9 })
    .png()
    .toBuffer();
}

async function writeSlide(filename, overlay, media = []) {
  const background = await base();
  const composite = [{ input: svg(overlay), top: 0, left: 0 }];

  for (const item of media) {
    composite.push({ input: item.input, top: item.top, left: item.left });
  }

  await sharp(background)
    .composite(composite)
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(path.join(marketingDirectory, filename));
}

async function writeContactSheet(files) {
  const thumbWidth = 324;
  const thumbHeight = 576;
  const canvasWidth = 1080;
  const canvasHeight = 1395;
  const background = Buffer.from(
    `<svg width="${canvasWidth}" height="${canvasHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#061028"/><text x="54" y="78" fill="#FFD24E" font-family="Arial, sans-serif" font-size="28" font-weight="800" letter-spacing="3">ATOMIC FUSION RUSH</text><text x="54" y="123" fill="#FFFFFF" font-family="Arial Black, Arial, sans-serif" font-size="42">TikTok carousel preview</text></svg>`,
  );
  const placements = [
    [54, 170],
    [378, 170],
    [702, 170],
    [216, 765],
    [540, 765],
  ];
  const thumbnails = await Promise.all(
    files.map((file) => sharp(path.join(marketingDirectory, file)).resize(thumbWidth, thumbHeight).png().toBuffer()),
  );

  await sharp(background)
    .composite(
      thumbnails.map((input, index) => ({
        input,
        left: placements[index][0],
        top: placements[index][1],
      })),
    )
    .png({ compressionLevel: 9 })
    .toFile(path.join(marketingDirectory, "carousel-preview.png"));
}

await fs.mkdir(marketingDirectory, { recursive: true });

const gameplayFull = await roundedImage(gameplayPath, 570, 1237, "centre");
const powerUpShowcase = await roundedImage(powerUpShowcasePath, 760, 620, "centre");
const collection = await roundedImage(collectionPath, 794, 870, "north");
const icon = await roundedImage(iconPath, 184, 184, "centre");

await writeSlide(
  "slide-01-hook.png",
  `${type({
    eyebrow: "SATISFYING SCIENCE GAME",
    title: ["2 HYDROGENS", "MAKE HELIUM."],
    body: "I found a puzzle game that makes the periodic table addictive.",
    slide: "01",
    titleSize: 84,
  })}${gameAtomDiagram()}
    <text x="540" y="1510" text-anchor="middle" fill="#A7DFFF" font-family="Arial, sans-serif" font-size="24" font-weight="800" letter-spacing="2">SWIPE → IT GETS TENSE</text>`,
);

await writeSlide(
  "slide-02-merge.png",
  `${type({
    eyebrow: "HOW THE GAME WORKS",
    title: ["MATCH ATOMS.", "MAKE ELEMENTS."],
    body: "Aim, fuse matching atoms, and chase the target at the top.",
    slide: "02",
    titleSize: 78,
  })}${mediaFrame(255, 650, 570, 1237)}
    <text x="540" y="1815" text-anchor="middle" fill="#FFD24E" font-family="Arial, sans-serif" font-size="28" font-weight="900">H → He → Li → Be → …</text>`,
  [{ input: gameplayFull, left: 255, top: 650 }],
);

await writeSlide(
  "slide-03-danger-line.png",
  `${type({
    eyebrow: "WHEN THE BOARD GETS CROWDED",
    title: ["USE POWERUPS", "TO CLEAR", "YOUR WAY."],
    body: "Move, pull, and transform atoms when the board gets crowded.",
    slide: "03",
    titleSize: 71,
    accent: "#FFD24E",
  })}${mediaFrame(160, 760, 760, 620, "#FFD24E")}
    <text x="540" y="1505" text-anchor="middle" fill="#F8E9C8" font-family="Arial, sans-serif" font-size="29" font-weight="700">Pick the right tool and keep the run alive.</text>`,
  [{ input: powerUpShowcase, left: 160, top: 760 }],
);

await writeSlide(
  "slide-04-collect.png",
  `${type({
    eyebrow: "THE COLLECTION LOOP",
    title: ["EVERY WIN", "UNLOCKS", "SOMETHING NEW."],
    body: "Discover elements, real compounds, and your next collection goal.",
    slide: "04",
    titleSize: 73,
  })}${mediaFrame(143, 815, 794, 870, "#FFD24E")}
    <rect x="250" y="1746" width="580" height="57" rx="28.5" fill="#082B45" stroke="#FFD24E" stroke-opacity="0.85" stroke-width="2"/>
    <text x="540" y="1784" text-anchor="middle" fill="#FFE598" font-family="Arial, sans-serif" font-size="24" font-weight="900" letter-spacing="1">118 ELEMENTS TO COLLECT</text>`,
  [{ input: collection, left: 143, top: 815 }],
);

await writeSlide(
  "slide-05-search.png",
  `${type({
    eyebrow: "YOUR NEXT BRAIN BREAK",
    title: ["COULD YOU", "FUSE YOUR WAY", "TO GOLD?"],
    body: "Atomic Fusion Rush",
    slide: "05",
    titleSize: 77,
    accent: "#FFD24E",
  })}
    <rect x="214" y="1122" width="652" height="124" rx="62" fill="#FFD24E" stroke="#FFF3AF" stroke-opacity="0.88" stroke-width="3"/>
    <text x="540" y="1202" text-anchor="middle" fill="#07162C" font-family="Arial Black, Arial, sans-serif" font-size="40" font-weight="900">Now on App Store</text>
    <text x="540" y="1660" text-anchor="middle" fill="#FFD24E" font-family="Arial, sans-serif" font-size="23" font-weight="900" letter-spacing="4">MERGE ATOMS • DISCOVER GOLD</text>`,
  [{ input: icon, left: 448, top: 846 }],
);

const slideFiles = [
  "slide-01-hook.png",
  "slide-02-merge.png",
  "slide-03-danger-line.png",
  "slide-04-collect.png",
  "slide-05-search.png",
];

await writeContactSheet(slideFiles);
await fs.copyFile(existingEndCardPath, path.join(marketingDirectory, "slide-05-live-store-card.png"));

console.log(`Generated ${slideFiles.length} TikTok slides in ${marketingDirectory}`);
