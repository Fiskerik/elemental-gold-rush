import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { ELEMENTS } from "./elements";
import { LEVELS, getLevelById, getNextLevel } from "./levels";
import {
  Grid,
  createEmptyGrid,
  placeAndMerge,
  generateInitialQueue,
  generateQueueElement,
  checkGameOver,
  formatScore,
} from "./logic";
import { ElementBall } from "./ElementBall";
import { useProgress } from "./store";
import { playMergeSound, playShootSound, playWinSound, vibrate } from "./audio";

interface Props {
  levelId: number;
  onExit: () => void;
  onWin: (nextId: number | null) => void;
}

const QUEUE_SIZE = 4;
const MAX_AIM_DEG = 75;

export function GameBoard({ levelId, onExit, onWin }: Props) {
  const level = getLevelById(levelId) ?? LEVELS[0];
  const { recordDiscovery, addScore, setHighestElement, unlockLevel, soundEnabled, hapticsEnabled, discoveredElements } =
    useProgress();

  const [grid, setGrid] = useState<Grid>(() => createEmptyGrid(level.gridRows, level.gridCols));
  const [queue, setQueue] = useState<number[]>(() => generateInitialQueue(level.maxQueueElement, QUEUE_SIZE));
  const [score, setScore] = useState(0);
  const [highest, setHighest] = useState(1);
  const [aimDeg, setAimDeg] = useState(0); // 0 = straight up, negative = left
  const [popups, setPopups] = useState<{ id: number; text: string; x: number; y: number }[]>([]);
  const [busy, setBusy] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [discoveryEl, setDiscoveryEl] = useState<number | null>(null);
  const [highlightCell, setHighlightCell] = useState<{ r: number; c: number } | null>(null);
  const [projectile, setProjectile] = useState<{ x: number; y: number } | null>(null);
  const popupId = useRef(0);

  const target = level.targetElement;
  const targetEl = ELEMENTS[target - 1];
  const current = queue[0];

  const sfx = (fn: () => void) => { if (soundEnabled) fn(); };
  const haptic = (ms: number | number[]) => { if (hapticsEnabled) vibrate(ms); };

  useEffect(() => {
    setGrid(createEmptyGrid(level.gridRows, level.gridCols));
    setQueue(generateInitialQueue(level.maxQueueElement, QUEUE_SIZE));
    setScore(0);
    setHighest(1);
    setGameOver(false);
    setWon(false);
    setDiscoveryEl(null);
    setHighlightCell(null);
    setProjectile(null);
    setBusy(false);
    setAimDeg(0);
  }, [levelId, level.gridRows, level.gridCols, level.maxQueueElement]);

  function spawnPopup(text: string) {
    const id = ++popupId.current;
    setPopups((p) => [...p, { id, text, x: 50 + (Math.random() * 20 - 10), y: 30 }]);
    setTimeout(() => setPopups((p) => p.filter((x) => x.id !== id)), 900);
  }

  // === sizing ===
  const boardRef = useRef<HTMLDivElement>(null);
  const [boardW, setBoardW] = useState(360);
  const [boardH, setBoardH] = useState(480);
  useEffect(() => {
    const update = () => {
      setBoardW(boardRef.current?.clientWidth ?? 360);
      setBoardH(boardRef.current?.clientHeight ?? 480);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const cellSize = useMemo(() => Math.floor((boardW - 8) / level.gridCols), [boardW, level.gridCols]);
  const ballSize = Math.floor(cellSize * 0.86);
  const gridPxW = cellSize * level.gridCols;
  const gridPxH = cellSize * level.gridRows;
  const gridLeft = (boardW - gridPxW) / 2; // x offset of grid inside board
  const launcherX = boardW / 2;
  const launcherY = boardH - 8; // near bottom of board

  /**
   * Ray-cast the projectile from launcher through the grid at the given aim angle.
   * Returns the cell where it lands, or null if it misses.
   * Bounces off left/right walls.
   */
  function castRay(angleDeg: number): { row: number; col: number; path: { x: number; y: number }[] } | null {
    const rad = (angleDeg * Math.PI) / 180;
    let dx = Math.sin(rad);
    let dy = -Math.cos(rad);
    let x = launcherX;
    let y = launcherY;
    const step = Math.max(2, Math.floor(cellSize / 8));
    const path: { x: number; y: number }[] = [{ x, y }];
    let lastCell: { row: number; col: number } | null = null;
    const maxIter = 4000;
    for (let i = 0; i < maxIter; i++) {
      x += dx * step;
      y += dy * step;
      // bounce off left/right of grid area
      if (x < gridLeft) { x = gridLeft + (gridLeft - x); dx = -dx; }
      if (x > gridLeft + gridPxW) { x = gridLeft + gridPxW - (x - (gridLeft + gridPxW)); dx = -dx; }
      // out the bottom (shouldn't happen since we shoot up)
      if (y > boardH) return null;
      // hit ceiling
      if (y < 4) {
        // land in row 0 of current column
        const col = Math.max(0, Math.min(level.gridCols - 1, Math.floor((x - gridLeft) / cellSize)));
        if (grid[0][col] !== null) {
          // ceiling column already full at top — try to find row of last empty
          for (let r = 0; r < level.gridRows; r++) {
            if (grid[r][col] === null) return { row: r, col, path };
          }
          return null;
        }
        return { row: 0, col, path };
      }
      // determine cell
      const col = Math.floor((x - gridLeft) / cellSize);
      const rowFromTop = Math.floor((y - 4) / cellSize);
      if (col < 0 || col >= level.gridCols) continue;
      if (rowFromTop < 0 || rowFromTop >= level.gridRows) continue;
      path.push({ x, y });
      // collision with existing ball
      if (grid[rowFromTop][col] !== null) {
        // place in lastCell (the cell we were just in before entering this one)
        if (lastCell && grid[lastCell.row][lastCell.col] === null) {
          return { row: lastCell.row, col: lastCell.col, path };
        }
        // fallback: try cell directly adjacent (one row toward launcher)
        if (rowFromTop + 1 < level.gridRows && grid[rowFromTop + 1][col] === null) {
          return { row: rowFromTop + 1, col, path };
        }
        return null;
      }
      lastCell = { row: rowFromTop, col };
    }
    return null;
  }

  function shoot() {
    if (busy || gameOver || won) return;
    const hit = castRay(aimDeg);
    if (!hit) return;
    setBusy(true);
    sfx(playShootSound);
    haptic(15);

    // animate projectile along path
    const path = hit.path;
    const totalMs = Math.min(360, 60 + path.length * 4);
    const stepMs = totalMs / path.length;
    let i = 0;
    setProjectile(path[0]);
    const interval = setInterval(() => {
      i++;
      if (i >= path.length) {
        clearInterval(interval);
        setProjectile(null);
        finalizePlacement(hit.row, hit.col);
      } else {
        setProjectile(path[i]);
      }
    }, stepMs);
  }

  function finalizePlacement(row: number, col: number) {
    const result = placeAndMerge(grid, row, col, current, target, 118);

    const newAtoms = new Set<number>([current]);
    result.merges.forEach((m) => newAtoms.add(m.resultAtomicNumber));
    const undiscovered = Array.from(newAtoms).filter((n) => !discoveredElements.includes(n));
    if (undiscovered.length > 0) recordDiscovery(undiscovered);

    setGrid(result.grid);
    setHighlightCell({ r: result.finalRow, c: result.finalCol });
    if (result.merges.length > 0) {
      result.merges.forEach((m, i) => {
        setTimeout(() => {
          sfx(() => playMergeSound(m.chainDepth));
          haptic([10, 20, 10]);
          spawnPopup(`+${ELEMENTS[m.resultAtomicNumber - 1]?.symbol ?? "?"}`);
        }, 80 + i * 120);
      });
    }

    const nextHighest = Math.max(highest, result.highestElement);
    setHighest(nextHighest);
    setHighestElement(nextHighest);
    const gained = Math.floor(result.scoreGained * level.scoreMultiplier);
    setScore((s) => s + gained);
    addScore(gained);

    const firstDiscovery = undiscovered.sort((a, b) => b - a)[0];

    setTimeout(() => {
      setHighlightCell(null);
      if (result.levelComplete) {
        setWon(true);
        sfx(playWinSound);
        haptic([30, 60, 30, 60, 80]);
        unlockLevel(levelId + 1);
        return;
      }
      if (firstDiscovery && firstDiscovery > 1) {
        setDiscoveryEl(firstDiscovery);
      }
      // Advance queue (functional update — guarantees fresh state)
      setQueue((q) => [...q.slice(1), generateQueueElement(level.maxQueueElement)]);
      if (checkGameOver(result.grid)) {
        setGameOver(true);
        haptic([50, 80, 50, 80, 200]);
      }
      setBusy(false);
    }, 200 + result.merges.length * 120);
  }

  // === aim handling ===
  const updateAimFromPointer = useCallback((clientX: number, clientY: number) => {
    if (!boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const dx = px - launcherX;
    const dy = py - launcherY;
    if (dy >= -2) return; // pointer below launcher — ignore
    const angle = Math.atan2(dx, -dy) * 180 / Math.PI;
    const clamped = Math.max(-MAX_AIM_DEG, Math.min(MAX_AIM_DEG, angle));
    setAimDeg(clamped);
  }, [launcherX, launcherY]);

  // preview trajectory (recomputed every render based on aimDeg)
  const previewPath = useMemo(() => {
    if (busy || gameOver || won) return [];
    const r = castRay(aimDeg);
    return r?.path ?? [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aimDeg, grid, busy, gameOver, won, boardW, boardH, cellSize]);

  const progressPct = Math.min(100, (highest / target) * 100);

  return (
    <div className="app-shell" style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", padding: 12 }}>
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1, maxWidth: 480, margin: "0 auto", width: "100%" }}>
        {/* HEADER */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <button onClick={onExit} style={iconBtn}>← Menu</button>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--muted-foreground)" }}>LEVEL {level.id}</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{level.name}</div>
          </div>
          <div style={{ ...iconBtn, cursor: "default", minWidth: 64, textAlign: "right" }}>
            <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>SCORE</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--accent)" }}>{formatScore(score)}</div>
          </div>
        </div>

        {/* TARGET PROGRESS */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--surface)", borderRadius: 12, border: "1px solid var(--border)", marginBottom: 10 }}>
          <ElementBall atomicNumber={highest} size={36} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted-foreground)" }}>
              <span>Highest reached</span>
              <span>Target: {targetEl?.symbol} (#{target})</span>
            </div>
            <div style={{ height: 6, background: "var(--surface-high)", borderRadius: 3, marginTop: 6, overflow: "hidden" }}>
              <div style={{
                width: `${progressPct}%`,
                height: "100%",
                background: "linear-gradient(90deg, var(--primary), var(--accent))",
                transition: "width 0.4s ease",
              }} />
            </div>
          </div>
          <ElementBall atomicNumber={target} size={36} glow />
        </div>

        {/* BOARD */}
        <div
          ref={boardRef}
          onPointerDown={(e) => {
            (e.target as Element).setPointerCapture?.(e.pointerId);
            updateAimFromPointer(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (e.buttons === 0 && e.pointerType === "mouse") {
              // hover-aim with mouse
              updateAimFromPointer(e.clientX, e.clientY);
              return;
            }
            updateAimFromPointer(e.clientX, e.clientY);
          }}
          onPointerUp={(e) => {
            updateAimFromPointer(e.clientX, e.clientY);
            shoot();
          }}
          style={{
            position: "relative",
            background: "linear-gradient(180deg, oklch(0.18 0.05 275), oklch(0.13 0.04 275))",
            borderRadius: 16,
            border: "1px solid var(--border)",
            padding: 4,
            flex: 1,
            minHeight: 360,
            boxShadow: "inset 0 0 30px rgba(79, 195, 247, 0.08)",
            display: "flex",
            flexDirection: "column",
            touchAction: "none",
            cursor: "crosshair",
            userSelect: "none",
          }}
        >
          {/* danger zone shading at top */}
          <div style={{
            position: "absolute", top: 4, left: 4, right: 4, height: cellSize * 1.5,
            background: "linear-gradient(180deg, var(--danger-glow), transparent)",
            borderRadius: 12, pointerEvents: "none",
          }} />

          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${level.gridCols}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${level.gridRows}, ${cellSize}px)`,
            justifyContent: "center",
            position: "relative",
            zIndex: 1,
            pointerEvents: "none",
          }}>
            {grid.map((row, r) =>
              row.map((cell, c) => (
                <div key={`${r}-${c}`}
                  style={{
                    width: cellSize, height: cellSize,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    borderLeft: c === 0 ? "1px dashed var(--grid-line)" : undefined,
                    borderRight: "1px dashed var(--grid-line)",
                    borderBottom: r === level.gridRows - 1 ? "1px dashed var(--grid-line)" : undefined,
                  }}
                >
                  {cell !== null && (
                    <ElementBall
                      atomicNumber={cell}
                      size={ballSize}
                      highlight={highlightCell?.r === r && highlightCell?.c === c}
                    />
                  )}
                </div>
              ))
            )}
          </div>

          {/* AIM TRAJECTORY (dotted line) */}
          {!busy && !gameOver && !won && previewPath.length > 1 && (
            <svg
              style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 3 }}
              width={boardW}
              height={boardH}
            >
              <polyline
                points={previewPath.map(p => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke="var(--primary)"
                strokeWidth={2}
                strokeDasharray="4 6"
                opacity={0.6}
              />
              {/* landing target marker */}
              {(() => {
                const last = previewPath[previewPath.length - 1];
                return (
                  <circle cx={last.x} cy={last.y} r={ballSize / 2.4} fill="none" stroke="var(--accent)" strokeWidth={2} opacity={0.7} />
                );
              })()}
            </svg>
          )}

          {/* PROJECTILE */}
          {projectile && (
            <div style={{
              position: "absolute",
              left: projectile.x - ballSize / 2,
              top: projectile.y - ballSize / 2,
              pointerEvents: "none",
              zIndex: 4,
            }}>
              <ElementBall atomicNumber={current} size={ballSize} glow />
            </div>
          )}

          {/* LAUNCHER */}
          <div style={{
            position: "absolute",
            left: launcherX - ballSize / 2,
            top: launcherY - ballSize / 2,
            zIndex: 2,
            pointerEvents: "none",
            transform: `rotate(${aimDeg}deg)`,
            transformOrigin: "center center",
          }}>
            {!projectile && <ElementBall atomicNumber={current} size={ballSize} glow />}
          </div>

          {/* SCORE POPUPS */}
          {popups.map((p) => (
            <div key={p.id}
              style={{
                position: "absolute",
                left: `${p.x}%`, top: `${p.y}%`,
                color: "var(--accent)",
                fontWeight: 800, fontSize: 18,
                animation: "float-up 900ms ease-out forwards",
                pointerEvents: "none",
                textShadow: "0 0 8px var(--accent-glow)",
                zIndex: 10,
              }}
            >{p.text}</div>
          ))}
        </div>

        {/* QUEUE BAR */}
        <div style={{ marginTop: 10, padding: 10, background: "var(--surface)", borderRadius: 14, border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--muted-foreground)" }}>NEXT →</div>
          <div style={{ display: "flex", gap: 6, flex: 1 }}>
            {queue.slice(1).map((n, i) => (
              <ElementBall key={i} atomicNumber={n} size={32 - i * 3} />
            ))}
          </div>
          <div style={{ fontSize: 10, color: "var(--muted-foreground)", textAlign: "right", lineHeight: 1.3 }}>
            Drag to aim<br/>Tap to shoot
          </div>
        </div>

        {discoveryEl !== null && (
          <DiscoveryModal atomicNumber={discoveryEl} onClose={() => setDiscoveryEl(null)} />
        )}
        {won && (
          <ResultModal
            title="LEVEL COMPLETE"
            accent="var(--success)"
            score={score}
            level={level}
            onMain={onExit}
            onNext={() => onWin(getNextLevel(levelId)?.id ?? null)}
          />
        )}
        {gameOver && !won && (
          <ResultModal
            title="GAME OVER"
            accent="var(--destructive)"
            score={score}
            level={level}
            onMain={onExit}
            onNext={() => onWin(levelId)}
            nextLabel="Retry"
          />
        )}
      </div>
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  color: "var(--foreground)",
  borderRadius: 10,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  minWidth: 64,
};

function DiscoveryModal({ atomicNumber, onClose }: { atomicNumber: number; onClose: () => void }) {
  const el = ELEMENTS[atomicNumber - 1];
  if (!el) return null;
  return (
    <Modal>
      <div style={{ fontSize: 11, letterSpacing: 2, color: "var(--accent)", marginBottom: 8 }}>NEW DISCOVERY</div>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
        <ElementBall atomicNumber={atomicNumber} size={96} glow />
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{el.name}</div>
      <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 12 }}>
        {el.symbol} • Atomic #{el.atomicNumber} • Mass {el.atomicMass}
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.55, color: "var(--foreground)", margin: 0 }}>{el.fact}</p>
      <button onClick={onClose} style={modalBtn}>Continue</button>
    </Modal>
  );
}

function ResultModal({
  title, accent, score, level, onMain, onNext, nextLabel,
}: {
  title: string; accent: string; score: number; level: typeof LEVELS[0]; onMain: () => void; onNext: () => void; nextLabel?: string;
}) {
  return (
    <Modal>
      <div style={{ fontSize: 12, letterSpacing: 3, color: accent, fontWeight: 800, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>{level.name}</div>
      {level.milestoneFact && (
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.5, margin: "0 0 14px" }}>
          {level.milestoneFact}
        </p>
      )}
      <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--muted-foreground)" }}>SCORE</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--accent)" }}>{formatScore(score)}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--muted-foreground)" }}>TARGET</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--primary)" }}>
            {ELEMENTS[level.targetElement - 1]?.symbol}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onMain} style={{ ...modalBtn, background: "var(--surface-high)", color: "var(--foreground)" }}>Menu</button>
        <button onClick={onNext} style={modalBtn}>{nextLabel ?? "Next"}</button>
      </div>
    </Modal>
  );
}

function Modal({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100, padding: 24, backdropFilter: "blur(4px)",
    }}>
      <div style={{
        background: "var(--surface-elevated)",
        border: "1px solid var(--border)",
        borderRadius: 18,
        padding: 24,
        maxWidth: 360,
        width: "100%",
        boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 40px var(--primary-glow)",
        animation: "pop-in 280ms ease-out",
      }}>{children}</div>
    </div>
  );
}

const modalBtn: React.CSSProperties = {
  flex: 1,
  marginTop: 14,
  padding: "12px 16px",
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(135deg, var(--primary), oklch(0.55 0.15 230))",
  color: "var(--primary-foreground)",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
  boxShadow: "0 4px 16px var(--primary-glow)",
};
