// Core merge logic — adapted from provided codesnippets.txt
// Bubble-shooter style: balls stick to the CEILING (row 0) and stack downward.
// Game over when the stack reaches the danger line near the launcher (bottom).

export type Grid = (number | null)[][];

export function createEmptyGrid(rows: number, cols: number): Grid {
  return Array.from({ length: rows }, () => Array(cols).fill(null));
}

/**
 * Find the row where a newly dropped element lands in column `col`.
 * Bottom-up gravity: row = rows-1 is the floor.
 * Returns -1 if the column is full.
 */
export function findPlacementRow(grid: Grid, col: number): number {
  // Top-down: first empty row from the ceiling.
  for (let row = 0; row < grid.length; row++) {
    if (grid[row][col] === null) return row;
  }
  return -1;
}

export interface MergeEvent {
  absorbedRow: number;
  absorbedCol: number;
  survivorRow: number;
  survivorCol: number;
  resultAtomicNumber: number;
  chainDepth: number;
}

export interface MergeResult {
  grid: Grid;
  merges: MergeEvent[];
  highestElement: number;
  scoreGained: number;
  levelComplete: boolean;
  targetElement: number;
  finalRow: number;
  finalCol: number;
  finalAtom: number;
}

function getNeighbors(grid: Grid, row: number, col: number): [number, number][] {
  const rows = grid.length;
  const cols = grid[0].length;
  const result: [number, number][] = [];
  // 8-directional adjacency: horizontal, vertical, and diagonal.
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < rows && c >= 0 && c < cols) result.push([r, c]);
    }
  }
  return result;
}

/**
 * Apply ceiling gravity: floating cells stick UP toward row 0.
 */
function applyGravity(grid: Grid): Grid {
  const rows = grid.length;
  const cols = grid[0].length;
  const next = grid.map((r) => [...r]);
  for (let c = 0; c < cols; c++) {
    const stack: number[] = [];
    for (let r = 0; r < rows; r++) {
      if (next[r][c] !== null) stack.push(next[r][c] as number);
    }
    for (let r = 0; r < rows; r++) {
      next[r][c] = stack[r] ?? null;
    }
  }
  return next;
}

export function placeAndMerge(
  grid: Grid,
  row: number,
  col: number,
  atomicNumber: number,
  targetElement: number,
  maxElement: number = 118,
): MergeResult {
  let newGrid: Grid = grid.map((r) => [...r]);
  newGrid[row][col] = atomicNumber;

  const merges: MergeEvent[] = [];
  let highestElement = atomicNumber;
  let scoreGained = atomicNumber * 10;
  let levelComplete = atomicNumber >= targetElement;

  let currentRow = row;
  let currentCol = col;
  let currentAtom = atomicNumber;
  let chainDepth = 0;
  let didMerge = true;

  while (didMerge && currentAtom < maxElement) {
    didMerge = false;
    const neighbors = getNeighbors(newGrid, currentRow, currentCol);
    for (const [nRow, nCol] of neighbors) {
      if (newGrid[nRow][nCol] === currentAtom) {
        const nextAtom = currentAtom + 1;
        merges.push({
          absorbedRow: nRow,
          absorbedCol: nCol,
          survivorRow: currentRow,
          survivorCol: currentCol,
          resultAtomicNumber: nextAtom,
          chainDepth,
        });
        newGrid[nRow][nCol] = null;
        newGrid[currentRow][currentCol] = nextAtom;
        currentAtom = nextAtom;
        scoreGained += nextAtom * 10 * Math.pow(2, chainDepth);
        highestElement = Math.max(highestElement, nextAtom);
        if (nextAtom >= targetElement) levelComplete = true;
        didMerge = true;
        chainDepth++;
        // After consuming a neighbor, apply gravity so floating cells settle,
        // then update our position (the survivor falls too).
        newGrid = applyGravity(newGrid);
        // Find where our atom ended up — scan the column from bottom up.
        const cols = newGrid[0].length;
        let found = false;
        for (let c = 0; c < cols && !found; c++) {
          for (let r = newGrid.length - 1; r >= 0; r--) {
            if (newGrid[r][c] === currentAtom) {
              // Pick the highest-atom occurrence in same column area
            }
          }
        }
        // Re-locate our atom (search from the ceiling down — survivor floats up).
        outer: for (let r = 0; r < newGrid.length; r++) {
          for (let c = 0; c < cols; c++) {
            if (newGrid[r][c] === currentAtom) {
              currentRow = r;
              currentCol = c;
              break outer;
            }
          }
        }
        break;
      }
    }
  }

  // Apply ceiling gravity so the placed ball (and any survivors) settle upward.
  newGrid = applyGravity(newGrid);

  // Cascading global pass: any two 8-adjacent same atoms anywhere on the board
  // auto-merge. Repeat until stable.
  let changed = true;
  while (changed) {
    changed = false;
    outer: for (let r = 0; r < newGrid.length; r++) {
      for (let c = 0; c < newGrid[0].length; c++) {
        const v = newGrid[r][c];
        if (v === null || v >= maxElement) continue;
        const nbrs = getNeighbors(newGrid, r, c);
        for (const [nr, nc] of nbrs) {
          if (newGrid[nr][nc] === v) {
            const nextAtom = v + 1;
            // Survivor: the upper-most cell (closest to ceiling), tiebreak by left column.
            let sr = r, sc = c, ar = nr, ac = nc;
            if (nr < sr || (nr === sr && nc < sc)) {
              sr = nr; sc = nc; ar = r; ac = c;
            }
            newGrid[ar][ac] = null;
            newGrid[sr][sc] = nextAtom;
            merges.push({
              absorbedRow: ar, absorbedCol: ac,
              survivorRow: sr, survivorCol: sc,
              resultAtomicNumber: nextAtom,
              chainDepth,
            });
            scoreGained += nextAtom * 10 * Math.pow(2, chainDepth);
            highestElement = Math.max(highestElement, nextAtom);
            if (nextAtom >= targetElement) levelComplete = true;
            chainDepth++;
            newGrid = applyGravity(newGrid);
            // Track final position for the survivor.
            currentAtom = nextAtom;
            // Re-locate the survivor (it may have floated up).
            relocate: for (let rr = 0; rr < newGrid.length; rr++) {
              for (let cc = 0; cc < newGrid[0].length; cc++) {
                if (newGrid[rr][cc] === nextAtom) {
                  currentRow = rr; currentCol = cc;
                  break relocate;
                }
              }
            }
            changed = true;
            break outer;
          }
        }
      }
    }
  }

  return {
    grid: newGrid,
    merges,
    highestElement,
    scoreGained,
    levelComplete,
    targetElement,
    finalRow: currentRow,
    finalCol: currentCol,
    finalAtom: currentAtom,
  };
}

/** Rows from the bottom (inclusive) treated as the danger zone near the launcher. */
export const DANGER_ROWS_FROM_BOTTOM = 1;

export function getDangerRow(grid: Grid): number {
  return grid.length - DANGER_ROWS_FROM_BOTTOM;
}

export function checkGameOver(grid: Grid): boolean {
  // Game over when the stack has grown down to the danger line just above the launcher.
  const dangerRow = getDangerRow(grid);
  for (let r = dangerRow; r < grid.length; r++) {
    if (grid[r].some((cell) => cell !== null)) return true;
  }
  return false;
}

export function isColumnFull(grid: Grid, col: number): boolean {
  return findPlacementRow(grid, col) < 0;
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

export function countElements(grid: Grid): number {
  return grid.flat().filter((c) => c !== null).length;
}

export function getHighestOnGrid(grid: Grid): number {
  return Math.max(0, ...grid.flat().filter((c): c is number => c !== null));
}