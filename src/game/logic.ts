// Free-position bubble-shooter logic.
// Balls live at any (x, y) pixel position — they don't snap to columns.
// They stack from the ceiling down. Game over when any ball passes the
// danger line just above the launcher.

export interface Ball {
  id: number;
  x: number;
  y: number;
  atom: number;
}
export type Board = Ball[];

export interface Geo {
  width: number;
  height: number;
  radius: number;
  leftPad: number;
  rightPad: number;
  topPad: number;
  dangerY: number;
}

let _ballId = 0;
export function nextBallId(): number { return ++_ballId; }

export function createEmptyBoard(): Board { return []; }

/** Two balls are considered adjacent (mergeable) when centers are within ~2R. */
const ADJ_FACTOR = 1.15;

function withinAdj(a: Ball, b: Ball, R: number): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) <= 2 * R * ADJ_FACTOR;
}

export interface MergeEvent {
  resultAtomicNumber: number;
  chainDepth: number;
  x: number;
  y: number;
}

export interface MergeResult {
  balls: Board;
  merges: MergeEvent[];
  highestElement: number;
  scoreGained: number;
  levelComplete: boolean;
  finalBallId: number | null;
}

/**
 * Place a new ball into the board and run cascading merges.
 * Adjacency is by circle distance — no row/column quantization.
 */
export function placeAndMerge(
  balls: Board,
  newBall: Ball,
  geo: Geo,
  targetElement: number,
  maxElement: number = 118,
): MergeResult {
  const list: Ball[] = [...balls, { ...newBall }];
  const merges: MergeEvent[] = [];
  let highest = newBall.atom;
  let score = newBall.atom * 10;
  let levelComplete = newBall.atom >= targetElement;
  let chainDepth = 0;
  let survivorId: number | null = newBall.id;

  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < list.length && !changed; i++) {
      if (list[i].atom >= maxElement) continue;
      for (let j = i + 1; j < list.length && !changed; j++) {
        if (list[j].atom !== list[i].atom) continue;
        if (!withinAdj(list[i], list[j], geo.radius)) continue;
        // Survivor: always the upper ball (smaller y); tiebreak smaller x.
        let s = i, a = j;
        if (list[j].y < list[i].y || (list[j].y === list[i].y && list[j].x < list[i].x)) {
          s = j; a = i;
        }
        const next = list[s].atom + 1;
        const survivor = { ...list[s], atom: next };
        list[s] = survivor;
        list.splice(a, 1);
        // After splice, survivor index shifts if a < s
        const newS = a < s ? s - 1 : s;
        merges.push({ resultAtomicNumber: next, chainDepth, x: list[newS].x, y: list[newS].y });
        score += next * 10 * Math.pow(2, chainDepth);
        highest = Math.max(highest, next);
        if (next >= targetElement) levelComplete = true;
        chainDepth++;
        survivorId = list[newS].id;
        changed = true;
      }
    }
  }

  return {
    balls: list,
    merges,
    highestElement: highest,
    scoreGained: score,
    levelComplete,
    finalBallId: survivorId,
  };
}

export const DANGER_ROWS_FROM_BOTTOM = 1;

export function checkGameOver(balls: Board, geo: Geo): boolean {
  for (const b of balls) {
    if (b.y + geo.radius >= geo.dangerY) return true;
  }
  return false;
}

export function generateQueueElement(maxElement: number): number {
  const weights: number[] = [];
  let totalWeight = 0;
  for (let n = 1; n <= maxElement; n++) {
    const w = Math.pow(0.65, n - 1);
    weights.push(w);
    totalWeight += w;
  }
  let rand = Math.random() * totalWeight;
  for (let i = 0; i < weights.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return i + 1;
  }
  return 1;
}

export function generateInitialQueue(maxElement: number, count = 3): number[] {
  return Array.from({ length: count }, () => generateQueueElement(maxElement));
}

export function formatScore(score: number): string {
  if (score >= 1_000_000) return `${(score / 1_000_000).toFixed(1)}M`;
  if (score >= 1_000) return `${(score / 1_000).toFixed(1)}K`;
  return Math.floor(score).toString();
}

export function countElements(balls: Board): number {
  return balls.length;
}

export function getHighestOnBoard(balls: Board): number {
  return balls.reduce((m, b) => Math.max(m, b.atom), 0);
}