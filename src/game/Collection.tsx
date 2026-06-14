import { useState, type CSSProperties } from "react";
import { ELEMENTS } from "./elements";
import { useProgress } from "./store";
import { ElementBall } from "./ElementBall";
import { BADGES, BADGE_GROUPS } from "./badges";
import { COMPOUNDS, getCompoundHint, type CompoundDefinition } from "./compounds";
import { MoleculeVisual } from "./MoleculeVisual";
import { useIsTabletLayout } from "./responsive";
import { getElementCollectionDetails } from "./elementDetails";

export function Collection({ onBack }: { onBack: () => void }) {
  const isTabletLayout = useIsTabletLayout();
  const { discoveredElements, discoveredCompounds, compoundCounts, earnedBadges } = useProgress();
  const [selected, setSelected] = useState<number | null>(null);
  const [selectedCompound, setSelectedCompound] = useState<CompoundDefinition | null>(null);
  const found = new Set(discoveredElements);
  const foundCompounds = new Set(discoveredCompounds);
  const earned = new Set(earnedBadges);
  const el = selected ? ELEMENTS[selected - 1] : null;
  const elementDetails = el ? getElementCollectionDetails(el) : null;

  return (
    <div className="app-shell" style={{ padding: isTabletLayout ? 24 : 16, paddingBottom: isTabletLayout ? 40 : 32 }}>
      <div style={{ position: "relative", zIndex: 1, maxWidth: isTabletLayout ? 980 : 600, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 16, gap: 12 }}>
          <button
            onClick={onBack}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
              borderRadius: 10,
              padding: "6px 12px",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            ← Back
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 22, margin: 0, fontWeight: 800 }}>Collection</h1>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
              {`${discoveredElements.length} / 118 elements discovered`}
            </div>
          </div>
        </div>

        {/* Real periodic-table layout: 18 columns × 7 periods + lanthanide/actinide rows */}
        <div style={{ paddingBottom: 8 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(18, minmax(0, 1fr))",
              gridAutoRows: "1fr",
              gap: 2,
              width: "100%",
            }}
          >
            {ELEMENTS.map((e) => {
              const isFound = found.has(e.atomicNumber);
              // Place lanthanides (57–71) and actinides (89–103) in their own rows below.
              let row: number;
              let col: number;
              if (e.atomicNumber >= 57 && e.atomicNumber <= 71) {
                row = 9; // lanthanide row
                col = 3 + (e.atomicNumber - 57); // cols 3..17
              } else if (e.atomicNumber >= 89 && e.atomicNumber <= 103) {
                row = 10; // actinide row
                col = 3 + (e.atomicNumber - 89);
              } else {
                row = e.period;
                col = e.group ?? 1;
              }
              return (
                <button
                  key={e.atomicNumber}
                  onClick={() => setSelected(e.atomicNumber)}
                  style={{
                    gridColumn: col,
                    gridRow: row,
                    aspectRatio: "1 / 1",
                    border: `1px solid ${isFound ? e.color : "var(--border)"}`,
                    borderRadius: 4,
                    background: isFound ? `${e.color}33` : "var(--surface)",
                    color: isFound ? "var(--foreground)" : "var(--muted-foreground)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    padding: 0,
                    minWidth: 0,
                  }}
                >
                  <div style={{ fontSize: 7, opacity: 0.7, lineHeight: 1 }}>{e.atomicNumber}</div>
                  <div style={{ fontSize: 10, fontWeight: 800, lineHeight: 1.1 }}>
                    {isFound ? e.symbol : "?"}
                  </div>
                </button>
              );
            })}
            {/* Placeholder markers in main table for lanthanide/actinide series */}
            <div
              style={{
                gridColumn: 3,
                gridRow: 6,
                aspectRatio: "1 / 1",
                border: "1px dashed var(--border)",
                borderRadius: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 8,
                color: "var(--muted-foreground)",
              }}
            >
              57–71
            </div>
            <div
              style={{
                gridColumn: 3,
                gridRow: 7,
                aspectRatio: "1 / 1",
                border: "1px dashed var(--border)",
                borderRadius: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 8,
                color: "var(--muted-foreground)",
              }}
            >
              89–103
            </div>
          </div>
        </div>

        <section style={{ marginTop: 18 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: 1.5,
              color: "var(--muted-foreground)",
              marginBottom: 8,
            }}
          >
            COMPOUNDS
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(auto-fit, minmax(${isTabletLayout ? 220 : 150}px, 1fr))`,
              gap: isTabletLayout ? 12 : 8,
            }}
          >
            {COMPOUNDS.map((compound) => {
              const unlocked = foundCompounds.has(compound.id);
              const foundCount = compoundCounts[compound.id] ?? (unlocked ? 1 : 0);
              return (
                <button
                  key={compound.id}
                  type="button"
                  onClick={() => setSelectedCompound(compound)}
                  style={{
                    display: "flex",
                    gap: 9,
                    alignItems: "center",
                    padding: 10,
                    borderRadius: 12,
                    border: `1px solid ${unlocked ? "var(--accent)" : "var(--border)"}`,
                    background: unlocked
                      ? "color-mix(in oklch, var(--accent) 14%, var(--surface))"
                      : "var(--surface)",
                    color: "var(--foreground)",
                    opacity: unlocked ? 1 : 0.56,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <MoleculeVisual compound={compound} locked={!unlocked} size={44} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 12, fontWeight: 900 }}>
                      {unlocked ? compound.name : "Unknown"}
                    </span>
                    <span style={{ display: "block", fontSize: 11, color: "var(--muted-foreground)" }}>
                      {unlocked ? compound.formula : getCompoundHint(compound)}
                    </span>
                    {unlocked && (
                      <span style={{ display: "block", fontSize: 10, color: "var(--accent)", marginTop: 2 }}>
                        {`Found x${foundCount}`}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Badges */}
        <div style={{ marginTop: 20 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: 1.5,
              color: "var(--muted-foreground)",
              marginBottom: 8,
            }}
          >
            BADGES
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {BADGE_GROUPS.map((group) => {
              const groupBadges = BADGES.filter((badge) => badge.group === group.id);
              const unlockedCount = groupBadges.filter((badge) => earned.has(badge.id)).length;
              return (
                <section
                  key={group.id}
                  style={{
                    padding: 10,
                    borderRadius: 14,
                    border: "1px solid var(--border)",
                    background: "color-mix(in oklch, var(--surface) 82%, transparent)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      marginBottom: 8,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 900 }}>{group.title}</div>
                      <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
                        {group.description}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 800 }}>
                      {unlockedCount}/{groupBadges.length}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: `repeat(auto-fit, minmax(${isTabletLayout ? 220 : 150}px, 1fr))`,
                      gap: isTabletLayout ? 12 : 8,
                    }}
                  >
                    {groupBadges.map((badge) => {
                      const unlocked = earned.has(badge.id);
                      const progress = badge.requiredAtomicNumbers.filter((atomicNumber) =>
                        found.has(atomicNumber),
                      ).length;
                      return (
                        <div
                          key={badge.id}
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                            padding: 10,
                            borderRadius: 12,
                            border: `1px solid ${unlocked ? "var(--accent)" : "var(--border)"}`,
                            background: unlocked
                              ? "color-mix(in oklch, var(--accent) 15%, var(--surface))"
                              : "var(--surface)",
                            opacity: unlocked ? 1 : 0.65,
                          }}
                        >
                          <div
                            style={{ fontSize: 22, filter: unlocked ? undefined : "grayscale(1)" }}
                          >
                            {badge.iconLucide ? (
                              <badge.iconLucide
                                size={22}
                                strokeWidth={2}
                                aria-hidden="true"
                                color={unlocked ? "var(--accent)" : "var(--muted-foreground)"}
                              />
                            ) : (
                              badge.icon
                            )}
                          </div>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 800 }}>{badge.name}</div>
                            <div
                              style={{
                                fontSize: 10,
                                color: "var(--muted-foreground)",
                                lineHeight: 1.35,
                              }}
                            >
                              {badge.description}
                            </div>
                            <div
                              style={{
                                fontSize: 10,
                                color: unlocked ? "var(--accent)" : "var(--muted-foreground)",
                                marginTop: 2,
                              }}
                            >
                              {unlocked
                                ? "Unlocked"
                                : `${progress}/${badge.requiredAtomicNumbers.length}`}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>

      </div>

      {el && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            zIndex: 100,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--surface-elevated)",
              border: "1px solid var(--border)",
              borderRadius: 18,
              padding: 24,
              maxWidth: isTabletLayout ? 560 : 380,
              width: "100%",
              animation: "pop-in 240ms ease-out",
            }}
          >
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
              <ElementBall
                atomicNumber={el.atomicNumber}
                size={96}
                glow={found.has(el.atomicNumber)}
              />
            </div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: 2,
                color: "var(--muted-foreground)",
                textAlign: "center",
              }}
            >
              {el.category.toUpperCase().replace("-", " ")}
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, textAlign: "center", marginTop: 4 }}>
              {el.name}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--muted-foreground)",
                textAlign: "center",
                marginBottom: 14,
              }}
            >
              {el.symbol} • #{el.atomicNumber} • {el.atomicMass}
            </div>
            {found.has(el.atomicNumber) && elementDetails ? (
              <div style={{ display: "grid", gap: 12 }}>
                <div style={elementSampleCard}>
                  <div
                    style={{
                      ...elementSampleSwatch,
                      background: `radial-gradient(circle at 34% 26%, ${el.glowColor}, ${el.color} 55%, color-mix(in oklch, ${el.color}, black 35%))`,
                    }}
                  />
                  <div>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 800 }}>
                      MATERIAL SAMPLE
                    </div>
                    <div style={{ fontSize: 12, lineHeight: 1.45 }}>{elementDetails.sample}</div>
                  </div>
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.55, margin: 0 }}>{el.fact}</p>
                <div style={elementPropertyGrid}>
                  <ElementProperty label="Molar mass" value={elementDetails.molarMass} />
                  <ElementProperty label="Phase" value={elementDetails.phase} />
                  <ElementProperty label="Melting point" value={elementDetails.meltingPoint ?? "Varies / not listed"} />
                  <ElementProperty label="Boiling point" value={elementDetails.boilingPoint ?? "Varies / not listed"} />
                  <ElementProperty label="Density" value={elementDetails.density ?? "Data not listed"} />
                  <ElementProperty label="Period / group" value={`${el.period} / ${el.group ?? "-"}`} />
                </div>
                <div style={elementInfoBlock}>
                  <strong>Uses</strong>
                  <span>{elementDetails.uses.join(", ")}</span>
                </div>
                {elementDetails.compounds.length > 0 && (
                  <div style={elementInfoBlock}>
                    <strong>Known compounds</strong>
                    <span>{elementDetails.compounds.join(", ")}</span>
                  </div>
                )}
                <div style={elementInfoBlock}>
                  <strong>Extra trivia</strong>
                  <span>{elementDetails.trivia}</span>
                </div>
              </div>
            ) : (
              <p
                style={{
                  fontSize: 13,
                  lineHeight: 1.55,
                  margin: 0,
                  color: "var(--muted-foreground)",
                  fontStyle: "italic",
                }}
              >
                Locked. Discover this element through fusion to unlock its facts.
              </p>
            )}
          </div>
        </div>
      )}

      {selectedCompound && (
        <div
          onClick={() => setSelectedCompound(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            zIndex: 100,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--surface-elevated)",
              border: "1px solid var(--border)",
              borderRadius: 18,
              padding: 24,
              maxWidth: isTabletLayout ? 560 : 380,
              width: "100%",
              animation: "pop-in 240ms ease-out",
            }}
          >
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
              <MoleculeVisual compound={selectedCompound} size={104} locked={!foundCompounds.has(selectedCompound.id)} />
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, textAlign: "center" }}>
              {foundCompounds.has(selectedCompound.id) ? selectedCompound.name : "Unknown Compound"}
            </div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "var(--accent)", textAlign: "center", marginBottom: 12 }}>
              {foundCompounds.has(selectedCompound.id) ? selectedCompound.formula : "???"}
            </div>
            {foundCompounds.has(selectedCompound.id) && (
              <div style={{ fontSize: 12, color: "var(--accent)", textAlign: "center", marginBottom: 10 }}>
                {`Found ${compoundCounts[selectedCompound.id] ?? 1} time${
                  (compoundCounts[selectedCompound.id] ?? 1) === 1 ? "" : "s"
                }`}
              </div>
            )}
            <p style={{ fontSize: 13, lineHeight: 1.55, margin: 0, color: "var(--foreground)" }}>
              {foundCompounds.has(selectedCompound.id)
                ? selectedCompound.fact
                : getCompoundHint(selectedCompound)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function ElementProperty({ label, value }: { label: string; value: string }) {
  return (
    <div style={elementPropertyCard}>
      <span style={{ color: "var(--muted-foreground)", fontSize: 10, fontWeight: 800 }}>
        {label}
      </span>
      <strong style={{ fontSize: 12 }}>{value}</strong>
    </div>
  );
}

const elementSampleCard: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "54px 1fr",
  gap: 10,
  alignItems: "center",
  padding: 10,
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--surface)",
};

const elementSampleSwatch: CSSProperties = {
  width: 54,
  height: 54,
  borderRadius: 14,
  border: "1px solid color-mix(in oklch, var(--border), white 16%)",
  boxShadow: "inset 0 -8px 14px rgba(0,0,0,0.28), 0 0 16px var(--accent-glow)",
};

const elementPropertyGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 8,
};

const elementPropertyCard: CSSProperties = {
  display: "grid",
  gap: 3,
  padding: "8px 9px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--surface)",
};

const elementInfoBlock: CSSProperties = {
  display: "grid",
  gap: 4,
  fontSize: 12,
  lineHeight: 1.45,
  padding: "9px 10px",
  borderRadius: 10,
  background: "color-mix(in oklch, var(--accent) 8%, var(--surface))",
  border: "1px solid color-mix(in oklch, var(--accent) 24%, var(--border))",
};
