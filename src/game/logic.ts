// Core merge logic — adapted from provided codesnippets.txt
// Gravity is BOTTOM-UP: balls stack from the bottom row upward.

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
  const rows = grid.length;
  for (let row = rows - 1; row >= 0; row--) {
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
  if (row > 0) result.push([row - 1, col]);
  if (row < rows - 1) result.push([row + 1, col]);
  if (col > 0) result.push([row, col - 1]);
  if (col < cols - 1) result.push([row, col + 1]);
  return result;
}

/**
 * Apply gravity: in each column, let floating cells fall to the bottom.
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
      const fromBottom = rows - 1 - r;
      next[fromBottom][c] = stack[stack.length - 1 - r] ?? null;
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
        // Simpler: re-locate by searching for our atom near the previous position.
        outer: for (let r = newGrid.length - 1; r >= 0; r--) {
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

export function checkGameOver(grid: Grid): boolean {
  // Game over when any column's TOP cell is filled (stack reached the ceiling)
  return grid[0].some((cell) => cell !== null);
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