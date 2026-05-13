import { useEffect, useMemo, useRef, useState } from "react";
import { ELEMENTS } from "./elements";
import { LEVELS, getLevelById, getNextLevel } from "./levels";
import {
  Grid,
  createEmptyGrid,
  findPlacementRow,
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

export function GameBoard({ levelId, onExit, onWin }: Props) {
  const level = getLevelById(levelId) ?? LEVELS[0];
  const { recordDiscovery, addScore, setHighestElement, unlockLevel, soundEnabled, hapticsEnabled, discoveredElements } =
    useProgress();

  const [grid, setGrid] = useState<Grid>(() => createEmptyGrid(level.gridRows, level.gridCols));
  const [queue, setQueue] = useState<number[]>(() => generateInitialQueue(level.maxQueueElement, QUEUE_SIZE));
  const [score, setScore] = useState(0);
  const [highest, setHighest] = useState(1);
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const [popups, setPopups] = useState<{ id: number; text: string; x: number; y: number }[]>([]);
  const [busy, setBusy] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [discoveryEl, setDiscoveryEl] = useState<number | null>(null);
  const [highlightCell, setHighlightCell] = useState<{ r: number; c: number } | null>(null);
  const popupId = useRef(0);

  const target = level.targetElement;
  const targetEl = ELEMENTS[target - 1];
  const current = queue[0];

  const sfx = (fn: () => void) => { if (soundEnabled) fn(); };
  const haptic = (ms: number | number[]) => { if (hapticsEnabled) vibrate(ms); };

  useEffect(() => {
    // Reset on level change
    setGrid(createEmptyGrid(level.gridRows, level.gridCols));
    setQueue(generateInitialQueue(level.maxQueueElement, QUEUE_SIZE));
    setScore(0);
    setHighest(1);
    setGameOver(false);
    setWon(false);
    setDiscoveryEl(null);
    setHighlightCell(null);
  }, [levelId, level.gridRows, level.gridCols, level.maxQueueElement]);

  function spawnPopup(text: string) {
    const id = ++popupId.current;
    setPopups((p) => [...p, { id, text, x: 50 + (Math.random() * 20 - 10), y: 30 }]);
    setTimeout(() => setPopups((p) => p.filter((x) => x.id !== id)), 900);
  }

  function handleColumn(col: number) {
    if (busy || gameOver || won) return;
    const row = findPlacementRow(grid, col);
    if (row < 0) return; // column full
    setBusy(true);
    sfx(playShootSound);
    haptic(15);

    const result = placeAndMerge(grid, row, col, current, target, 118);

    // record any newly discovered elements (from merges)
    const newAtoms = new Set<number>([current]);
    result.merges.forEach((m) => newAtoms.add(m.resultAtomicNumber));
    const undiscovered = Array.from(newAtoms).filter((n) => !discoveredElements.includes(n));
    if (undiscovered.length > 0) {
      recordDiscovery(undiscovered);
    }

    // Animate by stepping through merges visually
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

    // Show first-discovery popup for the highest new atom
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
      // advance queue
      const nextQueue = [...queue.slice(1), generateQueueElement(level.maxQueueElement)];
      setQueue(nextQueue);
      // game over check
      if (checkGameOver(result.grid)) {
        setGameOver(true);
        haptic([50, 80, 50, 80, 200]);
      }
      setBusy(false);
    }, 200 + result.merges.length * 120);
  }

  // === sizing ===
  const boardRef = useRef<HTMLDivElement>(null);
  const [boardW, setBoardW] = useState(360);
  useEffect(() => {
    const update = () => {
      const w = boardRef.current?.clientWidth ?? 360;
      setBoardW(w);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const cellSize = useMemo(() => Math.floor((boardW - 8) / level.gridCols), [boardW, level.gridCols]);
  const ballSize = Math.floor(cellSize * 0.86);

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
          style={{
            position: "relative",
            background: "linear-gradient(180deg, oklch(0.18 0.05 275), oklch(0.13 0.04 275))",
            borderRadius: 16,
            border: "1px solid var(--border)",
            padding: 4,
            flex: 1,
            boxShadow: "inset 0 0 30px rgba(79, 195, 247, 0.08)",
            display: "flex",
            flexDirection: "column",
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
          }}>
            {grid.map((row, r) =>
              row.map((cell, c) => (
                <div key={`${r}-${c}`}
                  style={{
                    width: cellSize, height: cellSize,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: hoverCol === c ? "rgba(79, 195, 247, 0.06)" : "transparent",
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

          {/* COLUMN TAP TARGETS */}
          <div style={{
            position: "absolute", inset: 4, display: "grid",
            gridTemplateColumns: `repeat(${level.gridCols}, 1fr)`, gap: 0,
            zIndex: 2,
          }}>
            {Array.from({ length: level.gridCols }).map((_, c) => (
              <div
                key={c}
                onPointerEnter={() => setHoverCol(c)}
                onPointerLeave={() => setHoverCol((h) => (h === c ? null : h))}
                onClick={() => handleColumn(c)}
                style={{ cursor: "pointer" }}
              />
            ))}
          </div>

          {/* HOVER TRAJECTORY */}
          {hoverCol !== null && !busy && !gameOver && !won && (
            <div style={{
              position: "absolute",
              top: 4,
              left: 4 + hoverCol * cellSize,
              width: cellSize,
              bottom: 4,
              background: "linear-gradient(180deg, transparent, rgba(79, 195, 247, 0.15))",
              borderLeft: "1px solid var(--primary)",
              borderRight: "1px solid var(--primary)",
              pointerEvents: "none",
              zIndex: 1,
            }} />
          )}

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

        {/* SHOOTER / QUEUE */}
        <div style={{ marginTop: 10, padding: 10, background: "var(--surface)", borderRadius: 14, border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ position: "relative" }}>
            <div style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--muted-foreground)", textAlign: "center", marginBottom: 4 }}>SHOOTER</div>
            <ElementBall atomicNumber={current} size={56} glow />
          </div>
          <div style={{ width: 1, height: 50, background: "var(--border)" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--muted-foreground)", marginBottom: 4 }}>NEXT</div>
            <div style={{ display: "flex", gap: 6 }}>
              {queue.slice(1).map((n, i) => (
                <ElementBall key={i} atomicNumber={n} size={32 - i * 3} />
              ))}
            </div>
          </div>
        </div>

        {/* DISCOVERY MODAL */}
        {discoveryEl !== null && (
          <DiscoveryModal atomicNumber={discoveryEl} onClose={() => setDiscoveryEl(null)} />
        )}

        {/* WIN MODAL */}
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
        {/* GAME OVER */}
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