// Free-position bubble-shooter logic.
// Balls live at any (x, y) pixel position — they don't snap to columns.
// They stack from the ceiling down. Game over when any ball passes the
// danger line just above the launcher.

export interface Ball {
  id: number;
  x: number;
  y: number;
  atom: number;
  /** Visual+collision radius in px (matches the rendered ball edge). */
  r: number;
  /** When set, this ball is a Stone obstacle — never merges. */
  stoneHp?: number;
  stoneMaxHp?: number;
  /** Unstable isotope countdown. It stabilizes when merged, or decays at 0. */
  unstableShots?: number;
  /** Permanent shimmer marker that survives on-board until this atom is merged. */
  shimmer?: boolean;
  /** One-shot score multiplier consumed the next time this atom participates in a merge. */
  scoreMultiplier?: number;
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
export function nextBallId(): number {
  return ++_ballId;
}

export function createEmptyBoard(): Board {
  return [];
}

/** Two balls touch (or nearly touch) when centers are within ~sum of radii. */
const ADJ_FACTOR = 1.15;

function withinAdj(a: Ball, b: Ball, adjacencyFactor = ADJ_FACTOR): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) <= (a.r + b.r) * adjacencyFactor;
}

export interface MergeEvent {
  resultAtomicNumber: number;
  sourceAtomicNumber: number;
  chainDepth: number;
  x: number;
  y: number;
  stabilizedIsotope?: boolean;
  shimmerFusion?: boolean;
  scoreGained: number;
}

export interface MergeResult {
  balls: Board;
  merges: MergeEvent[];
  highestElement: number;
  scoreGained: number;
  levelComplete: boolean;
  finalBallId: number | null;
}

function resolveAdjacentMerges(
  source: Board,
  targetElement: number,
  maxElement: number,
  initialScore: number,
  initialHighest: number,
  initialLevelComplete: boolean,
  initialSurvivorId: number | null,
  adjacencyFactor = ADJ_FACTOR,
  fusionJump = false,
  survivorRadiusBonus = 0,
  options: {
    fusionJumpStep?: number;
    unstableScoreMultiplier?: number;
    chainShimmer?: boolean;
    mergeScoreMultiplier?: number;
  } = {},
): MergeResult {
  const list: Ball[] = source.map((b) => ({ ...b }));
  const merges: MergeEvent[] = [];
  let highest = initialHighest;
  let score = initialScore;
  let levelComplete = initialLevelComplete;
  let chainDepth = 0;
  let survivorId: number | null = initialSurvivorId;
  let jumpAvailable = fusionJump;

  let changed = true;
  while (changed) {
    changed = false;
    let best: { s: number; a: number } | null = null;
    for (let i = 0; i < list.length; i++) {
      if (list[i].stoneHp != null) continue;
      if (list[i].atom >= maxElement) continue;
      for (let j = i + 1; j < list.length; j++) {
        if (list[j].stoneHp != null) continue;
        if (list[j].atom !== list[i].atom) continue;
        const survivorInPair = survivorId != null && (list[i].id === survivorId || list[j].id === survivorId);
        const reachBonus = survivorInPair ? survivorRadiusBonus : 0;
        const closeEnough =
          Math.hypot(list[i].x - list[j].x, list[i].y - list[j].y) <=
          (list[i].r + list[j].r) * adjacencyFactor + reachBonus;
        if (!closeEnough) continue;
        let s = i,
          a = j;
        if (list[j].y < list[i].y || (list[j].y === list[i].y && list[j].x < list[i].x)) {
          s = j;
          a = i;
        }
        if (
          !best ||
          list[s].y < list[best.s].y ||
          (list[s].y === list[best.s].y && list[s].x < list[best.s].x)
        ) {
          best = { s, a };
        }
      }
    }
    if (best) {
      const { s, a } = best;
      const mergeStep = jumpAvailable ? Math.max(2, Math.floor(options.fusionJumpStep ?? 2)) : 1;
      const sourceAtomicNumber = list[s].atom;
      const participantMultiplier = Math.max(1, list[s].scoreMultiplier ?? 1, list[a].scoreMultiplier ?? 1);
      const stabilizedIsotope =
        (list[s].unstableShots ?? 0) > 0 || (list[a].unstableShots ?? 0) > 0;
      const next = Math.min(maxElement, sourceAtomicNumber + mergeStep);
      jumpAvailable = false;
      const shimmerFusion = Boolean(list[s].shimmer || list[a].shimmer);
      const survivor = {
        ...list[s],
        atom: next,
        unstableShots: undefined,
        shimmer: options.chainShimmer && shimmerFusion && chainDepth >= 1 ? true : undefined,
        scoreMultiplier: undefined,
      };
      list[s] = survivor;
      list.splice(a, 1);
      const newS = a < s ? s - 1 : s;
      const baseScore = next * 10 * Math.pow(2, chainDepth);
      const isotopeMultiplier = stabilizedIsotope ? (options.unstableScoreMultiplier ?? 2) : 1;
      const mergeScore = Math.floor(
        baseScore * isotopeMultiplier * participantMultiplier * (options.mergeScoreMultiplier ?? 1),
      );
      merges.push({
        resultAtomicNumber: next,
        sourceAtomicNumber,
        chainDepth,
        x: list[newS].x,
        y: list[newS].y,
        stabilizedIsotope,
        shimmerFusion,
        scoreGained: mergeScore,
      });
      score += mergeScore;
      highest = Math.max(highest, next);
      if (next >= targetElement) levelComplete = true;
      chainDepth++;
      survivorId = list[newS].id;
      changed = true;
    }
  }

  return {
    balls: list,
    merges,
    highestElement: highest,
    scoreGained: score - initialScore,
    levelComplete,
    finalBallId: survivorId,
  };
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
  adjacencyFactor = ADJ_FACTOR,
  fusionJump = false,
  survivorRadiusBonus = 0,
  options?: Parameters<typeof resolveAdjacentMerges>[10],
): MergeResult {
  return resolveAdjacentMerges(
    [...balls, { ...newBall }],
    targetElement,
    maxElement,
    newBall.atom * 10,
    newBall.atom,
    newBall.atom >= targetElement,
    newBall.id,
    adjacencyFactor,
    fusionJump,
    survivorRadiusBonus,
    options,
  );
}

/** Run cascading merges on an already-positioned board. */
export function mergeSettledBoard(
  balls: Board,
  geo: Geo,
  targetElement: number,
  maxElement: number = 118,
  adjacencyFactor = ADJ_FACTOR,
  fusionJump = false,
  survivorRadiusBonus = 0,
  options?: Parameters<typeof resolveAdjacentMerges>[10],
): MergeResult {
  void geo;
  return resolveAdjacentMerges(
    balls,
    targetElement,
    maxElement,
    0,
    getHighestOnBoard(balls),
    false,
    null,
    adjacencyFactor,
    fusionJump,
    survivorRadiusBonus,
    options,
  );
}

export const DANGER_ROWS_FROM_BOTTOM = 1;

export function checkGameOver(balls: Board, geo: Geo): boolean {
  for (const b of balls) {
    if (b.y + b.r >= geo.dangerY) return true;
  }
  return false;
}

export function generateQueueElement(maxElement: number, decay: number = 0.65, rng: () => number = Math.random): number {
  const weights: number[] = [];
  let totalWeight = 0;
  for (let n = 1; n <= maxElement; n++) {
    const w = Math.pow(decay, n - 1);
    weights.push(w);
    totalWeight += w;
  }
  let rand = rng() * totalWeight;
  for (let i = 0; i < weights.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return i + 1;
  }
  return 1;
}

export function generateInitialQueue(
  maxElement: number,
  count = 3,
  decay: number = 0.65,
  rng: () => number = Math.random,
): number[] {
  return Array.from({ length: count }, () => generateQueueElement(maxElement, decay, rng));
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
