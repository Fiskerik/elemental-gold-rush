import { useEffect, useState, type CSSProperties } from "react";
import { ElementBall } from "./ElementBall";
import { MoleculeVisual } from "./MoleculeVisual";
import { COMPOUNDS } from "./compounds";
import { PowerUpBadge } from "./PowerUpLibrary";
import { useProgress, type AtomSkin } from "./store";
import { t } from "./localization";

export type HowToPlayMode = "normal" | "daily-board" | "compound" | "daily-compound";

interface HowToPlayProps {
  mode: HowToPlayMode;
  atomSkin?: AtomSkin;
  onClose: () => void;
}

type Slide = {
  title: string;
  body: string;
  visual:
    | "target"
    | "merge"
    | "powerups"
    | "add"
    | "select"
    | "discover"
    | "daily-grid"
    | "daily-select"
    | "daily-solve";
};

const SLIDES: Record<HowToPlayMode, Slide[]> = {
  normal: [
    {
      title: "Reach the target atom",
      body: "Shoot atoms onto the board and keep merging upward until you reach the target shown at the top.",
      visual: "target",
    },
    {
      title: "Match two atoms",
      body: "Two atoms of the same tier combine when they touch. The result is one atom from the next tier.",
      visual: "merge",
    },
    {
      title: "Use power-ups later",
      body: "As you progress, power-ups can pull, move, or transform atoms to clear difficult stages faster.",
      visual: "powerups",
    },
  ],
  "daily-board": [
    {
      title: "Match today's target",
      body: "The Daily Board gives you a seeded board and a target atom. Reach the target before the danger line rises.",
      visual: "target",
    },
    {
      title: "Aim for efficient merges",
      body: "Every shot counts toward your daily score. Use the queue and matching atoms to build the target with as few shots as possible.",
      visual: "merge",
    },
    {
      title: "Come back tomorrow",
      body: "The board, score, and leaderboard reset each day. Finish a run to claim the daily reward and record your best attempt.",
      visual: "daily-grid",
    },
  ],
  compound: [
    {
      title: "Build the atoms",
      body: "Shoot atoms onto the board until the atoms needed for the level's molecule are present.",
      visual: "add",
    },
    {
      title: "Select the molecule",
      body: "Press Compound to enter compound mode, then tap the atoms that belong to the molecule.",
      visual: "select",
    },
    {
      title: "Form and discover",
      body: "Form the molecule to remove its atoms, record a discovery, and earn the level's compound bonus.",
      visual: "discover",
    },
  ],
  "daily-compound": [
    {
      title: "Read the clue",
      body: "Use the hint at the top and the atom count to understand what you are looking for.",
      visual: "daily-grid",
    },
    {
      title: "Find a suitable molecule",
      body: "Select a possible answer on the grid. After two wrong guesses, a hint can reveal a correct atom; a second unlocks after four.",
      visual: "daily-select",
    },
    {
      title: "Solve it quickly",
      body: "Find the target molecule in as little time as possible. Fewer wrong guesses and faster solves produce a better score.",
      visual: "daily-solve",
    },
  ],
};

export function HowToPlay({ mode, atomSkin = "classic", onClose }: HowToPlayProps) {
  const [slideIndex, setSlideIndex] = useState(0);
  const appLanguage = useProgress((state) => state.appLanguage);
  const tr = (text: string) => t(text, appLanguage);
  const slides = SLIDES[mode];
  const slide = slides[slideIndex];
  const modeLabel =
    mode === "normal"
        ? tr("Normal game")
      : mode === "daily-board"
        ? tr("Daily Board")
        : mode === "compound"
          ? tr("Compound levels")
          : tr("Daily Compound");

  useEffect(() => {
    setSlideIndex(0);
  }, [mode]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${modeLabel} ${tr("how to play")}`}
      onClick={onClose}
      style={overlayStyle}
    >
      <div className="game-modal-surface" onClick={(event) => event.stopPropagation()} style={cardStyle}>
        <div style={eyebrowStyle}>{tr("HOW TO PLAY")}</div>
        <div style={headingRowStyle}>
          <div>
            <h2 style={headingStyle}>{modeLabel}</h2>
            <div style={stepStyle}>{tr("Step")} {slideIndex + 1} {tr("of")} {slides.length}</div>
          </div>
          <button type="button" onClick={onClose} style={closeButtonStyle} aria-label={tr("Close how to play")}>
            {tr("Close")}
          </button>
        </div>

        <div style={visualFrameStyle} aria-hidden="true">
          <TutorialVisual kind={slide.visual} atomSkin={atomSkin} translate={tr} />
        </div>
        <h3 style={slideTitleStyle}>{tr(slide.title)}</h3>
        <p style={slideBodyStyle}>{tr(slide.body)}</p>

        <div style={dotsStyle} aria-label={`${tr("Slide")} ${slideIndex + 1} ${tr("of")} ${slides.length}`}>
          {slides.map((item, index) => (
            <button
              key={item.title}
              type="button"
              aria-label={`${tr("Go to step")} ${index + 1}`}
              onClick={() => setSlideIndex(index)}
              style={{ ...dotStyle, ...(index === slideIndex ? activeDotStyle : {}) }}
            />
          ))}
        </div>
        <div style={navigationStyle}>
          <button
            type="button"
            onClick={() => setSlideIndex((index) => Math.max(0, index - 1))}
            disabled={slideIndex === 0}
            style={{ ...secondaryButtonStyle, opacity: slideIndex === 0 ? 0.45 : 1 }}
          >
            {tr("Back")}
          </button>
          {slideIndex < slides.length - 1 ? (
            <button type="button" onClick={() => setSlideIndex((index) => index + 1)} style={primaryButtonStyle}>
              {tr("Next")}
            </button>
          ) : (
            <button type="button" onClick={onClose} style={primaryButtonStyle}>
              {tr("Got it")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TutorialVisual({ kind, atomSkin, translate }: { kind: Slide["visual"]; atomSkin: AtomSkin; translate: (text: string) => string }) {
  switch (kind) {
    case "target":
      return (
        <div style={targetVisualStyle}>
          <MiniGoalBar atomSkin={atomSkin} translate={translate} />
          <MiniBoard atomSkin={atomSkin} translate={translate}>
            <MiniAtom atomicNumber={1} left="16%" top="22%" atomSkin={atomSkin} />
            <MiniAtom atomicNumber={6} left="55%" top="34%" atomSkin={atomSkin} />
            <MiniAtom atomicNumber={8} left="31%" top="60%" atomSkin={atomSkin} />
            <div style={aimLineStyle} />
          </MiniBoard>
        </div>
      );
    case "merge":
      return (
        <div style={mergeVisualStyle}>
          <ElementBall atomicNumber={6} size={54} atomSkin={atomSkin} />
          <span style={operatorStyle}>+</span>
          <ElementBall atomicNumber={6} size={54} atomSkin={atomSkin} />
          <span style={operatorStyle}>→</span>
          <ElementBall atomicNumber={7} size={64} glow atomSkin={atomSkin} />
        </div>
      );
    case "powerups":
      return (
        <div style={powerupsVisualStyle}>
          {[
            ["grab", "Grab"],
            ["gravity", "Gravity"],
            ["transmute", "Transmute"],
          ].map(([icon, label]) => (
            <div key={icon} style={powerupItemStyle}>
              <PowerUpBadge icon={icon} size={42} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      );
    case "add":
      return (
          <MiniBoard atomSkin={atomSkin} footer="Required: H₂O" translate={translate}>
          <MiniAtom atomicNumber={1} left="18%" top="25%" atomSkin={atomSkin} />
          <MiniAtom atomicNumber={8} left="52%" top="42%" atomSkin={atomSkin} />
          <MiniAtom atomicNumber={1} left="70%" top="66%" atomSkin={atomSkin} />
          <MiniAtom atomicNumber={6} left="82%" top="22%" atomSkin={atomSkin} />
          <div style={compoundNeedTagStyle}>3 atoms present</div>
        </MiniBoard>
      );
    case "select":
      return (
        <MiniBoard atomSkin={atomSkin} footer="COMPOUND MODE · 2/3 selected" translate={translate}>
          <MiniAtom atomicNumber={1} left="18%" top="27%" selected atomSkin={atomSkin} />
          <MiniAtom atomicNumber={8} left="52%" top="44%" selected atomSkin={atomSkin} />
          <MiniAtom atomicNumber={1} left="72%" top="68%" selected atomSkin={atomSkin} />
          <MiniAtom atomicNumber={6} left="82%" top="22%" atomSkin={atomSkin} />
        </MiniBoard>
      );
    case "discover":
      return (
        <div style={discoverVisualStyle}>
          <div style={moleculePanelStyle}>
            <MoleculeVisual compound={COMPOUNDS[0]} size={82} />
            <div style={{ fontWeight: 900 }}>{COMPOUNDS[0]?.formula ?? "Molecule"}</div>
          </div>
          <div style={discoverArrowStyle}>→</div>
          <div style={rewardPanelStyle}>
            <div style={checkmarkStyle}>✓</div>
            <strong>{translate("Discovery")}</strong>
            <span>{translate("+ bonus points")}</span>
          </div>
        </div>
      );
    case "daily-grid":
      return (
        <div style={dailyVisualStyle}>
          <div style={dailyTopBarStyle}>
            <span>{translate("DAILY COMPOUND")}</span>
            <strong>{translate("0/4 atoms")}</strong>
          </div>
          <div style={clueStyle}>{translate("Hint: a gas used in bright welding torches")}</div>
          <DailyTutorialGrid atomSkin={atomSkin} state="base" translate={translate} />
        </div>
      );
    case "daily-select":
      return (
        <div style={dailyVisualStyle}>
          <DailyTutorialGrid atomSkin={atomSkin} state="selected" translate={translate} />
        </div>
      );
    case "daily-solve":
      return (
        <div style={dailyVisualStyle}>
          <DailyTutorialGrid atomSkin={atomSkin} state="correct" translate={translate} />
        </div>
      );
    default:
      return (
        <MiniBoard atomSkin={atomSkin}>
          <MiniAtom atomicNumber={1} left="50%" top="50%" atomSkin={atomSkin} />
        </MiniBoard>
      );
  }
}

function MiniBoard({
  children,
  atomSkin,
  footer,
  action,
  translate,
}: {
  children: React.ReactNode;
  atomSkin: AtomSkin;
  footer?: string;
  action?: string;
  translate?: (text: string) => string;
}) {
  return (
    <div style={miniBoardStyle}>
      <div style={miniBoardGridStyle}>{children}</div>
      {footer && (
        <div style={miniBoardFooterStyle}>
          {translate
            ? translate(footer.includes("COMPOUND MODE") ? footer.replace("2/3", "3/3") : footer)
            : footer.includes("COMPOUND MODE")
              ? footer.replace("2/3", "3/3")
              : footer}
        </div>
      )}
      {(action || footer?.includes("COMPOUND MODE")) && (
        <div style={miniBoardActionStyle}>{translate ? translate(action ?? "Form H₂O") : action ?? "Form H₂O"}</div>
      )}
    </div>
  );
}

function MiniGoalBar({ atomSkin, translate }: { atomSkin: AtomSkin; translate?: (text: string) => string }) {
  return (
    <div style={miniGoalBarStyle}>
      <ElementBall atomicNumber={6} size={28} atomSkin={atomSkin} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={miniGoalLabelsStyle}>
          <span>{translate ? translate("Highest reached") : "Highest reached"}</span>
          <span style={miniGoalTargetStyle}>
            <span>{translate ? translate("Target:") : "Target:"}</span>
            <ElementBall atomicNumber={10} size={21} glow atomSkin={atomSkin} />
          </span>
        </div>
        <div style={miniGoalTrackStyle}>
          <div style={miniGoalFillStyle} />
        </div>
      </div>
    </div>
  );
}

function MiniAtom({
  atomicNumber,
  left,
  top,
  atomSkin,
  selected = false,
}: {
  atomicNumber: number;
  left: string;
  top: string;
  atomSkin: AtomSkin;
  selected?: boolean;
}) {
  return (
    <div style={{ position: "absolute", left, top, transform: "translate(-50%, -50%)", ...(selected ? selectedAtomStyle : {}) }}>
      <ElementBall atomicNumber={atomicNumber} size={48} glow={selected} atomSkin={atomSkin} />
    </div>
  );
}

type DailyTutorialState = "base" | "selected" | "correct";

const DAILY_TUTORIAL_ATOMS = [
  1, 5, 6, 2, 8, 5, 1, 6,
  5, 6, 6, 1, 1, 5, 2, 8,
  2, 8, 5, 6, 2, 8, 5, 1,
  6, 1, 5, 2, 8, 6, 1, 5,
] as const;
const DAILY_TUTORIAL_TARGET = [9, 10, 11, 12];

function DailyTutorialGrid({
  atomSkin,
  state,
  translate,
}: {
  atomSkin: AtomSkin;
  state: DailyTutorialState;
  translate?: (text: string) => string;
}) {
  const selected = state === "correct" || state === "selected" ? DAILY_TUTORIAL_TARGET : [];
  return (
    <div style={dailyTutorialBoardStyle}>
      <div style={dailyTutorialGridStyle}>
        {DAILY_TUTORIAL_ATOMS.map((atom, index) => {
          const isSelected = selected.includes(index);
          const isTarget = DAILY_TUTORIAL_TARGET.includes(index);
          return (
            <div
              key={`${atom}-${index}`}
              style={{
                ...dailyTutorialCellStyle,
                ...(isSelected
                  ? state === "correct"
                    ? dailyTutorialCorrectCellStyle
                    : dailyTutorialSelectedCellStyle
                  : {}),
              }}
            >
              <ElementBall
                atomicNumber={atom}
                size={25}
                glow={isSelected || (state === "base" && isTarget)}
                atomSkin={atomSkin}
                patternSeed={index}
              />
            </div>
          );
        })}
      </div>
      {state === "selected" && <div style={dailyTutorialSelectedLabelStyle}>{translate ? translate("4/4 atoms selected") : "4/4 atoms selected"}</div>}
      {state === "correct" && <div style={dailyTutorialSolvedStyle}>{translate ? translate("ACETYLENE FOUND - C2H2") : "ACETYLENE FOUND - C2H2"}</div>}
    </div>
  );
}

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1200,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  background: "rgba(2, 4, 18, 0.78)",
  backdropFilter: "blur(7px)",
  boxSizing: "border-box",
};
const cardStyle: CSSProperties = {
  width: "100%",
  maxWidth: 430,
  maxHeight: "calc(100dvh - 28px)",
  overflowY: "auto",
  padding: 20,
  borderRadius: 20,
  border: "1px solid color-mix(in oklch, var(--accent) 65%, var(--border))",
  background: "linear-gradient(160deg, color-mix(in oklch, var(--surface-elevated) 96%, var(--primary)), var(--surface-elevated))",
  boxShadow: "0 24px 70px rgba(0,0,0,.6), 0 0 30px var(--primary-glow)",
  boxSizing: "border-box",
};
const eyebrowStyle: CSSProperties = { color: "var(--accent)", fontSize: 10, letterSpacing: 3, fontWeight: 900 };
const headingRowStyle: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginTop: 4 };
const headingStyle: CSSProperties = { margin: 0, fontSize: 23, lineHeight: 1.1 };
const stepStyle: CSSProperties = { marginTop: 5, color: "var(--muted-foreground)", fontSize: 11, fontWeight: 750 };
const closeButtonStyle: CSSProperties = { border: "1px solid var(--border)", borderRadius: 10, padding: "8px 10px", background: "var(--surface)", color: "var(--foreground)", fontWeight: 800, cursor: "pointer" };
const visualFrameStyle: CSSProperties = { minHeight: 190, marginTop: 16, padding: 12, display: "grid", placeItems: "center", borderRadius: 16, border: "1px solid var(--border)", background: "color-mix(in oklch, var(--background) 70%, var(--surface))", overflow: "hidden" };
const slideTitleStyle: CSSProperties = { margin: "16px 0 5px", fontSize: 19 };
const slideBodyStyle: CSSProperties = { margin: 0, color: "var(--muted-foreground)", fontSize: 14, lineHeight: 1.45 };
const dotsStyle: CSSProperties = { display: "flex", justifyContent: "center", gap: 7, margin: "18px 0 14px" };
const dotStyle: CSSProperties = { width: 8, height: 8, padding: 0, border: "none", borderRadius: 99, background: "var(--surface-high)", cursor: "pointer" };
const activeDotStyle: CSSProperties = { width: 24, background: "var(--accent)" };
const navigationStyle: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 };
const secondaryButtonStyle: CSSProperties = { border: "1px solid var(--border)", borderRadius: 11, padding: "11px 14px", background: "var(--surface)", color: "var(--foreground)", fontWeight: 850, cursor: "pointer" };
const primaryButtonStyle: CSSProperties = { ...secondaryButtonStyle, border: "none", background: "linear-gradient(135deg, var(--primary), var(--accent))", color: "#07101c" };
const miniBoardStyle: CSSProperties = { width: "100%", maxWidth: 330 };
const miniBoardGridStyle: CSSProperties = { position: "relative", height: 150, overflow: "hidden", borderRadius: 14, border: "1px solid var(--game-panel-accent-border, var(--border))", background: "radial-gradient(circle at 50% 30%, color-mix(in oklch, var(--primary) 28%, transparent), transparent 55%), var(--surface)" };
const targetVisualStyle: CSSProperties = { display: "grid", gap: 8, width: "100%", maxWidth: 330 };
const miniBoardFooterStyle: CSSProperties = { marginTop: 7, padding: "7px 10px", borderRadius: 8, color: "var(--accent)", background: "var(--surface)", fontSize: 11, fontWeight: 850, textAlign: "center" };
const miniBoardActionStyle: CSSProperties = { marginTop: 7, padding: "8px 10px", borderRadius: 9, background: "linear-gradient(135deg, var(--primary), var(--accent))", color: "#07101c", fontSize: 11, fontWeight: 900, textAlign: "center", boxShadow: "0 0 16px var(--accent-glow)" };
const miniGoalBarStyle: CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, background: "var(--surface-elevated)", border: "1px solid var(--game-panel-accent-border, var(--border))", boxSizing: "border-box" };
const miniGoalLabelsStyle: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 6, color: "var(--muted-foreground)", fontSize: 8, fontWeight: 800 };
const miniGoalTargetStyle: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 4, color: "var(--foreground)", whiteSpace: "nowrap" };
const miniGoalTrackStyle: CSSProperties = { position: "relative", height: 7, marginTop: 4, borderRadius: 99, background: "var(--surface-high)" };
const miniGoalFillStyle: CSSProperties = { width: "54%", height: "100%", borderRadius: 99, background: "linear-gradient(90deg, var(--primary), var(--accent))" };
const aimLineStyle: CSSProperties = { position: "absolute", left: "50%", bottom: 6, width: 2, height: 60, borderLeft: "2px dashed var(--accent)", opacity: 0.7 };
const mergeVisualStyle: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%" };
const operatorStyle: CSSProperties = { color: "var(--accent)", fontSize: 24, fontWeight: 900 };
const powerupsVisualStyle: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 13, width: "100%" };
const powerupItemStyle: CSSProperties = { display: "grid", justifyItems: "center", gap: 2, color: "var(--muted-foreground)", fontSize: 10, fontWeight: 850 };
const compoundNeedTagStyle: CSSProperties = { position: "absolute", left: 10, top: 9, padding: "5px 7px", borderRadius: 7, color: "var(--success, var(--accent))", background: "var(--surface-elevated)", fontSize: 10, fontWeight: 900 };
const selectedAtomStyle: CSSProperties = { borderRadius: "50%", boxShadow: "0 0 0 3px var(--accent), 0 0 22px var(--accent-glow)" };
const discoverVisualStyle: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%" };
const moleculePanelStyle: CSSProperties = { display: "grid", justifyItems: "center", gap: 3, color: "var(--foreground)", fontSize: 12 };
const discoverArrowStyle: CSSProperties = { color: "var(--accent)", fontSize: 24, fontWeight: 900 };
const rewardPanelStyle: CSSProperties = { display: "grid", justifyItems: "center", gap: 3, color: "var(--success, var(--accent))", fontSize: 12, textAlign: "center" };
const checkmarkStyle: CSSProperties = { display: "grid", placeItems: "center", width: 54, height: 54, borderRadius: "50%", background: "color-mix(in oklch, var(--success, var(--accent)) 22%, var(--surface))", border: "2px solid var(--success, var(--accent))", fontSize: 30, fontWeight: 900 };
const dailyVisualStyle: CSSProperties = { width: "100%", maxWidth: 330 };
const dailyTopBarStyle: CSSProperties = { display: "flex", justifyContent: "space-between", padding: "8px 10px", borderRadius: 8, color: "var(--accent)", background: "var(--surface)", fontSize: 10, fontWeight: 900, letterSpacing: 1 };
const clueStyle: CSSProperties = { margin: "8px 0", padding: "8px 10px", borderRadius: 8, color: "var(--foreground)", background: "var(--surface-elevated)", fontSize: 11, fontWeight: 750 };
const dailyTutorialBoardStyle: CSSProperties = { width: "100%", maxWidth: 330, padding: 8, borderRadius: 12, background: "var(--surface)" };
const dailyTutorialGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(8, minmax(0, 1fr))", gap: 4 };
const dailyTutorialCellStyle: CSSProperties = { display: "grid", placeItems: "center", minWidth: 0, aspectRatio: "1", borderRadius: 6, border: "1px solid color-mix(in oklch, var(--border) 80%, transparent)", background: "color-mix(in oklch, var(--background) 72%, var(--surface))" };
const dailyTutorialSelectedCellStyle: CSSProperties = { border: "2px solid var(--accent)", background: "color-mix(in oklch, var(--accent) 20%, var(--surface))", boxShadow: "0 0 12px var(--accent-glow)" };
const dailyTutorialCorrectCellStyle: CSSProperties = { border: "2px solid var(--success, #51e6a4)", background: "color-mix(in oklch, var(--success, #51e6a4) 20%, var(--surface))", boxShadow: "0 0 12px color-mix(in oklch, var(--success, #51e6a4) 60%, transparent)" };
const dailyTutorialSelectedLabelStyle: CSSProperties = { marginTop: 8, padding: "7px 10px", borderRadius: 8, border: "1px solid var(--accent)", background: "color-mix(in oklch, var(--accent) 20%, var(--surface-elevated))", color: "var(--accent)", textAlign: "center", fontSize: 10, fontWeight: 900, letterSpacing: 1.1, boxShadow: "0 0 14px var(--accent-glow)" };
const dailyTutorialSolvedStyle: CSSProperties = { marginTop: 8, padding: "7px 10px", borderRadius: 8, border: "1px solid var(--success, #51e6a4)", color: "var(--success, #51e6a4)", textAlign: "center", fontSize: 10, fontWeight: 900, letterSpacing: 1 };
