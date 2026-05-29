import { COMPOUNDS } from "./compounds";
import { ELEMENTS } from "./elements";

export interface StageShareCardData {
  levelId: number;
  levelName: string;
  score: number;
  shots: number;
  stars: number;
  newDiscoveries: number[];
  formedCompounds: string[];
}

export interface StageShareCardResult {
  blob: Blob;
  url: string;
  summary: string;
}

const CARD_WIDTH = 1242;
const CARD_HEIGHT = 2208;

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !current) {
      current = next;
      continue;
    }
    lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  return lines;
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillStyle: string,
  strokeStyle?: string,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawMetric(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
  accent: string,
) {
  drawRoundRect(ctx, x, y, width, 170, 30, "rgba(12, 18, 44, 0.92)", "rgba(128, 146, 255, 0.18)");
  ctx.fillStyle = "rgba(196, 205, 244, 0.78)";
  ctx.font = "700 28px Arial";
  ctx.fillText(label.toUpperCase(), x + 30, y + 48);
  ctx.fillStyle = accent;
  ctx.font = "900 54px Arial";
  ctx.fillText(value, x + 30, y + 114);
}

function drawChip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  label: string,
  tone: "gold" | "blue",
) {
  const fill =
    tone === "gold"
      ? "rgba(70, 54, 12, 0.96)"
      : "rgba(17, 30, 68, 0.96)";
  const stroke =
    tone === "gold"
      ? "rgba(255, 214, 84, 0.36)"
      : "rgba(115, 189, 255, 0.34)";
  drawRoundRect(ctx, x, y, width, 74, 22, fill, stroke);
  ctx.fillStyle = tone === "gold" ? "#ffe17a" : "#8dd9ff";
  ctx.font = "800 28px Arial";
  ctx.fillText(label, x + 22, y + 46);
}

async function loadLogo(): Promise<HTMLImageElement | null> {
  if (typeof window === "undefined") return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = "/game-icon.png";
  });
}

export function buildStageShareSummary(data: StageShareCardData): string {
  const stars = `${"★".repeat(data.stars)}${"☆".repeat(Math.max(0, 3 - data.stars))}`;
  const discoveredElements = data.newDiscoveries
    .map((atomicNumber) => ELEMENTS[atomicNumber - 1]?.name)
    .filter(Boolean)
    .join(", ");
  const discoveredCompounds = data.formedCompounds
    .map((compoundId) => COMPOUNDS.find((compound) => compound.id === compoundId)?.formula)
    .filter(Boolean)
    .join(", ");
  const parts = [
    `I cleared ${data.levelName} in Atomic Fusion Rush.`,
    `Score ${data.score.toLocaleString()}, ${data.shots} shots, ${stars}.`,
  ];
  if (discoveredElements) {
    parts.push(`New elements: ${discoveredElements}.`);
  }
  if (discoveredCompounds) {
    parts.push(`Compounds formed: ${discoveredCompounds}.`);
  }
  return parts.join(" ");
}

export async function createStageShareCard(data: StageShareCardData): Promise<StageShareCardResult> {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas context is not available.");
  }

  const background = ctx.createLinearGradient(0, 0, 0, CARD_HEIGHT);
  background.addColorStop(0, "#060a1c");
  background.addColorStop(0.6, "#0a1030");
  background.addColorStop(1, "#111740");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  ctx.save();
  ctx.strokeStyle = "rgba(121, 145, 255, 0.10)";
  ctx.lineWidth = 1;
  for (let x = 70; x <= CARD_WIDTH; x += 74) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CARD_HEIGHT);
    ctx.stroke();
  }
  for (let y = 140; y <= CARD_HEIGHT; y += 74) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CARD_WIDTH, y);
    ctx.stroke();
  }
  ctx.restore();

  const logo = await loadLogo();
  if (logo) {
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.36)";
    ctx.shadowBlur = 28;
    drawRoundRect(ctx, 96, 108, 112, 112, 28, "rgba(255,255,255,0.06)");
    ctx.drawImage(logo, 96, 108, 112, 112);
    ctx.restore();
  }

  ctx.fillStyle = "#ffe17a";
  ctx.font = "900 36px Arial";
  ctx.fillText("ATOMIC FUSION RUSH", 236, 156);

  ctx.fillStyle = "#f5f7ff";
  ctx.font = "900 82px Arial";
  ctx.fillText(data.levelName, 96, 322);

  ctx.fillStyle = "rgba(205, 214, 245, 0.86)";
  ctx.font = "700 40px Arial";
  ctx.fillText(`Level ${data.levelId} cleared`, 96, 382);

  drawMetric(ctx, 96, 456, 330, "Score", data.score.toLocaleString(), "#ffe17a");
  drawMetric(ctx, 456, 456, 280, "Shots", `${data.shots}`, "#8de6ff");
  drawMetric(ctx, 766, 456, 380, "Stars", `${"★".repeat(data.stars)}${"☆".repeat(Math.max(0, 3 - data.stars))}`, "#ffcf5e");

  drawRoundRect(ctx, 96, 678, CARD_WIDTH - 192, 262, 34, "rgba(10, 17, 42, 0.94)", "rgba(128, 146, 255, 0.18)");
  ctx.fillStyle = "#ffe17a";
  ctx.font = "900 30px Arial";
  ctx.fillText("MISSION REPORT", 132, 734);
  ctx.fillStyle = "#f5f7ff";
  ctx.font = "900 68px Arial";
  ctx.fillText("Run complete", 132, 822);
  ctx.fillStyle = "rgba(205, 214, 245, 0.84)";
  ctx.font = "700 34px Arial";
  for (const [index, line] of wrapText(ctx, "Every cleared stage pushes your lab closer to the full periodic table. Share the scorecard and keep the chain reaction going.", CARD_WIDTH - 264).entries()) {
    ctx.fillText(line, 132, 884 + index * 42);
  }

  const discoveryLabels = data.newDiscoveries
    .slice(0, 8)
    .map((atomicNumber) => {
      const element = ELEMENTS[atomicNumber - 1];
      return element ? `${element.symbol} ${element.name}` : `#${atomicNumber}`;
    });
  const compoundLabels = data.formedCompounds
    .slice(0, 5)
    .map((compoundId) => COMPOUNDS.find((compound) => compound.id === compoundId))
    .filter(Boolean)
    .map((compound) => `${compound!.formula} ${compound!.name}`);

  drawRoundRect(ctx, 96, 1002, CARD_WIDTH - 192, 450, 34, "rgba(10, 17, 42, 0.94)", "rgba(128, 146, 255, 0.18)");
  ctx.fillStyle = "#8de6ff";
  ctx.font = "900 28px Arial";
  ctx.fillText("NEW DISCOVERIES", 132, 1058);

  if (discoveryLabels.length === 0) {
    ctx.fillStyle = "rgba(205, 214, 245, 0.78)";
    ctx.font = "700 32px Arial";
    ctx.fillText("No new atoms this time — the score still counts.", 132, 1128);
  } else {
    let chipX = 132;
    let chipY = 1092;
    for (const label of discoveryLabels) {
      ctx.font = "800 28px Arial";
      const width = Math.min(380, Math.max(170, ctx.measureText(label).width + 42));
      if (chipX + width > CARD_WIDTH - 132) {
        chipX = 132;
        chipY += 92;
      }
      drawChip(ctx, chipX, chipY, width, label, "blue");
      chipX += width + 18;
    }
  }

  ctx.fillStyle = "#ffe17a";
  ctx.font = "900 28px Arial";
  ctx.fillText("COMPOUNDS FORMED", 132, 1298);

  if (compoundLabels.length === 0) {
    ctx.fillStyle = "rgba(205, 214, 245, 0.78)";
    ctx.font = "700 32px Arial";
    ctx.fillText("No compound discoveries were recorded on this run.", 132, 1368);
  } else {
    let chipX = 132;
    let chipY = 1328;
    for (const label of compoundLabels) {
      ctx.font = "800 28px Arial";
      const width = Math.min(420, Math.max(190, ctx.measureText(label).width + 42));
      if (chipX + width > CARD_WIDTH - 132) {
        chipX = 132;
        chipY += 92;
      }
      drawChip(ctx, chipX, chipY, width, label, "gold");
      chipX += width + 18;
    }
  }

  drawRoundRect(ctx, 96, 1534, CARD_WIDTH - 192, 270, 34, "rgba(16, 23, 54, 0.96)", "rgba(255, 214, 84, 0.18)");
  ctx.fillStyle = "#ffe17a";
  ctx.font = "900 30px Arial";
  ctx.fillText("KEEP BUILDING THE PERIODIC TABLE", 132, 1590);
  ctx.fillStyle = "#f5f7ff";
  ctx.font = "900 56px Arial";
  ctx.fillText("Share your lab progress", 132, 1682);
  ctx.fillStyle = "rgba(205, 214, 245, 0.84)";
  ctx.font = "700 32px Arial";
  for (const [index, line] of wrapText(ctx, "Cleared in Atomic Fusion Rush. App Store link can be added after the listing goes live.", CARD_WIDTH - 264).entries()) {
    ctx.fillText(line, 132, 1742 + index * 38);
  }

  const summary = buildStageShareSummary(data);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error("Could not generate share card image."));
    }, "image/png");
  });

  return {
    blob,
    url: URL.createObjectURL(blob),
    summary,
  };
}
