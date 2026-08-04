import { useState, type CSSProperties } from "react";
import { ELEMENTS } from "./elements";
import { useProgress } from "./store";
import { ElementBall } from "./ElementBall";
import { BADGES, BADGE_GROUPS } from "./badges";
import { COMPOUNDS, getCompoundHint, type CompoundDefinition } from "./compounds";
import { getCompoundCollectionDetails } from "./compoundDetails";
import { MoleculeVisual } from "./MoleculeVisual";
import { useIsTabletLayout } from "./responsive";
import { getElementCollectionDetails } from "./elementDetails";
import { t } from "./localization";

const BADGE_TONES = [
  "oklch(0.9 0.18 88)",
  "oklch(0.82 0.18 35)",
  "oklch(0.82 0.16 205)",
  "oklch(0.8 0.18 145)",
  "oklch(0.82 0.14 285)",
  "oklch(0.86 0.16 330)",
];

function badgeTone(id: string): string {
  const value = Array.from(id).reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return BADGE_TONES[value % BADGE_TONES.length] ?? BADGE_TONES[0];
}

export function Collection({ onBack }: { onBack: () => void }) {
  const isTabletLayout = useIsTabletLayout();
  const {
    discoveredElements,
    discoveredCompounds,
    viewedElementDiscoveries,
    viewedCompoundDiscoveries,
    compoundCounts,
    earnedBadges,
    shopSpendCents,
    appLanguage,
    goldCoins,
    unlockLockedElementsForCoins,
    unlockLockedCompoundsForCoins,
    markElementDiscoveryViewed,
    markCompoundDiscoveryViewed,
  } = useProgress();
  const tr = (text: string) => t(text, appLanguage);
  const [selected, setSelected] = useState<number | null>(null);
  const [selectedCompound, setSelectedCompound] = useState<CompoundDefinition | null>(null);
  const [purchaseMessage, setPurchaseMessage] = useState("");
  const [showUndiscoveredCompounds, setShowUndiscoveredCompounds] = useState(false);
  const [expandedBadgeGroups, setExpandedBadgeGroups] = useState<Record<string, boolean>>({});
  const found = new Set(discoveredElements);
  const foundCompounds = new Set(discoveredCompounds);
  const viewedElements = new Set(viewedElementDiscoveries);
  const viewedCompounds = new Set(viewedCompoundDiscoveries);
  const earned = new Set(earnedBadges);
  const el = selected ? ELEMENTS[selected - 1] : null;
  const elementDetails = el ? getElementCollectionDetails(el) : null;
  const selectedCompoundUnlocked = selectedCompound
    ? foundCompounds.has(selectedCompound.id)
    : false;
  const selectedCompoundDetails = selectedCompound
    ? getCompoundCollectionDetails(selectedCompound)
    : null;
  const lockedElementCount = ELEMENTS.length - discoveredElements.length;
  const lockedCompoundCount = COMPOUNDS.length - discoveredCompounds.length;
  const visibleCompounds = showUndiscoveredCompounds
    ? COMPOUNDS
    : COMPOUNDS.filter((compound) => foundCompounds.has(compound.id));

  function handleUnlockElements() {
    setPurchaseMessage(
      lockedElementCount > 0
        ? tr("Select one locked element in the periodic table to unlock it for 50 gold coins.")
        : tr("No locked elements remain."),
    );
  }

  function handleUnlockCompounds() {
    setShowUndiscoveredCompounds(true);
    setPurchaseMessage(
      lockedCompoundCount > 0
        ? tr("Select one undiscovered compound to unlock it for 100 gold coins.")
        : tr("No locked compounds remain."),
    );
  }

  function toggleBadgeGroup(groupId: string) {
    setExpandedBadgeGroups((current) => ({ ...current, [groupId]: !current[groupId] }));
  }

  function openElement(atomicNumber: number) {
    setSelected(atomicNumber);
    if (found.has(atomicNumber)) markElementDiscoveryViewed(atomicNumber);
  }

  function openCompound(compound: CompoundDefinition) {
    setSelectedCompound(compound);
    if (foundCompounds.has(compound.id)) markCompoundDiscoveryViewed(compound.id);
  }

  return (
    <div
      className="app-shell"
      style={{ padding: isTabletLayout ? 24 : 16, paddingBottom: isTabletLayout ? 40 : 32 }}
    >
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: isTabletLayout ? 980 : 600,
          margin: "0 auto",
        }}
      >
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
            ← {tr("Back")}
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 22, margin: 0, fontWeight: 800 }}>{tr("Collection")}</h1>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
              {`${discoveredElements.length} / 118 ${tr("elements discovered")}`}
            </div>
          </div>
          <div style={collectionWalletPill}>{goldCoins} {tr("gold")}</div>
        </div>

        <section style={collectionUnlockPanel}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 900 }}>{tr("Unlock collection entries")}</div>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>
              {tr("Spend gold to reveal locked collection facts immediately.")}
            </div>
          </div>
          <div style={collectionUnlockActions}>
            <button
              type="button"
              onClick={handleUnlockElements}
              disabled={lockedElementCount <= 0 || goldCoins < 50}
              style={{
                ...collectionUnlockBtn,
                opacity: lockedElementCount > 0 && goldCoins >= 50 ? 1 : 0.55,
              }}
            >
              {tr("Locked elements")} - 50
            </button>
            <button
              type="button"
              onClick={handleUnlockCompounds}
              disabled={lockedCompoundCount <= 0 || goldCoins < 100}
              style={{
                ...collectionUnlockBtn,
                opacity: lockedCompoundCount > 0 && goldCoins >= 100 ? 1 : 0.55,
              }}
            >
              {tr("Locked compounds")} - 100
            </button>
          </div>
          {purchaseMessage && <div style={collectionPurchaseMessage}>{purchaseMessage}</div>}
        </section>

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
              const isNewDiscovery = isFound && !viewedElements.has(e.atomicNumber);
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
                  onClick={() => openElement(e.atomicNumber)}
                  className={isNewDiscovery ? "collection-discovery-new" : undefined}
                  aria-label={isNewDiscovery ? `${e.name}, newly discovered` : e.name}
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
            {tr("COMPOUNDS")}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(auto-fit, minmax(${isTabletLayout ? 220 : 150}px, 1fr))`,
              gap: isTabletLayout ? 12 : 8,
            }}
          >
            {visibleCompounds.map((compound) => {
              const unlocked = foundCompounds.has(compound.id);
              const isNewDiscovery = unlocked && !viewedCompounds.has(compound.id);
              const foundCount = compoundCounts[compound.id] ?? (unlocked ? 1 : 0);
              return (
                <button
                  key={compound.id}
                  type="button"
                  onClick={() => openCompound(compound)}
                  className={isNewDiscovery ? "collection-discovery-new" : undefined}
                  aria-label={isNewDiscovery ? `${compound.name}, newly discovered` : compound.name}
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
                      {unlocked ? tr(compound.name) : tr("Unknown")}
                    </span>
                    <span
                      style={{ display: "block", fontSize: 11, color: "var(--muted-foreground)" }}
                    >
                      {unlocked ? compound.formula : getCompoundHint(compound)}
                    </span>
                    {unlocked && (
                      <span
                        style={{
                          display: "block",
                          fontSize: 10,
                          color: "var(--accent)",
                          marginTop: 2,
                        }}
                      >
                        {`${tr("Found")} x${foundCount}`}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          {lockedCompoundCount > 0 && (
            <button
              type="button"
              onClick={() => setShowUndiscoveredCompounds((current) => !current)}
              style={collectionExpandBtn}
            >
              {showUndiscoveredCompounds
                ? tr("Hide undiscovered")
                : `${tr("Show undiscovered")} (${lockedCompoundCount})`}
            </button>
          )}
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
            {tr("BADGES")}
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {BADGE_GROUPS.map((group) => {
              const groupBadges = BADGES.filter((badge) => badge.group === group.id);
              const unlockedCount = groupBadges.filter((badge) => earned.has(badge.id)).length;
              const showUndiscovered = expandedBadgeGroups[group.id] ?? false;
              const visibleBadges = showUndiscovered
                ? groupBadges
                : groupBadges.filter((badge) => earned.has(badge.id));
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
                      <div style={{ fontSize: 13, fontWeight: 900 }}>{tr(group.title)}</div>
                      <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
                        {tr(group.description)}
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
                    {visibleBadges.map((badge) => {
                      const unlocked = earned.has(badge.id);
                      const tone = badgeTone(badge.id);
                      const progress = badge.requiredAtomicNumbers.filter((atomicNumber) =>
                        found.has(atomicNumber),
                      ).length;
                      const shopProgress = badge.requiredShopSpendCents
                        ? `$${(shopSpendCents / 100).toFixed(2)} / $${(badge.requiredShopSpendCents / 100).toFixed(2)}`
                        : `${progress}/${badge.requiredAtomicNumbers.length}`;
                      return (
                        <div
                          key={badge.id}
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                            padding: 10,
                            borderRadius: 12,
                            border: `1px solid ${unlocked ? tone : "var(--border)"}`,
                            background: unlocked
                              ? `color-mix(in oklch, ${tone} 15%, var(--surface))`
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
                                color={unlocked ? tone : "var(--muted-foreground)"}
                              />
                            ) : (
                              badge.icon
                            )}
                          </div>
                          <div>
                          <div style={{ fontSize: 12, fontWeight: 800 }}>{tr(badge.name)}</div>
                            <div
                              style={{
                                fontSize: 10,
                                color: "var(--muted-foreground)",
                                lineHeight: 1.35,
                              }}
                            >
                              {tr(badge.description)}
                            </div>
                            <div
                              style={{
                                fontSize: 10,
                                color: unlocked ? tone : "var(--muted-foreground)",
                                marginTop: 2,
                              }}
                            >
                              {unlocked
                                ? tr("Unlocked")
                                : shopProgress}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {unlockedCount < groupBadges.length && (
                    <button
                      type="button"
                      onClick={() => toggleBadgeGroup(group.id)}
                      style={collectionExpandBtn}
                    >
                      {showUndiscovered
                        ? tr("Hide undiscovered")
                        : `${tr("Show undiscovered")} (${groupBadges.length - unlockedCount})`}
                    </button>
                  )}
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
              position: "relative",
              maxHeight: "calc(100vh - 48px)",
              overflowY: "auto",
            }}
          >
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label={tr("Close")}
              style={collectionModalCloseBtn}
            >
              {tr("Close")}
            </button>
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
              {tr(el.category.toUpperCase().replace("-", " "))}
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, textAlign: "center", marginTop: 4 }}>
              {tr(el.name)}
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
                    <div
                      style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 800 }}
                    >
                      {tr("MATERIAL SAMPLE")}
                    </div>
                    <div style={{ fontSize: 12, lineHeight: 1.45 }}>
                      {tr(elementDetails.sample)}
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.55, margin: 0 }}>{tr(el.fact)}</p>
                <div style={elementPropertyGrid}>
                  <ElementProperty label={tr("Molar mass")} value={elementDetails.molarMass} />
                  <ElementProperty label={tr("Phase")} value={tr(elementDetails.phase)} />
                  <ElementProperty
                    label={tr("Melting point")}
                    value={elementDetails.meltingPoint ?? tr("Varies / not listed")}
                  />
                  <ElementProperty
                    label={tr("Boiling point")}
                    value={elementDetails.boilingPoint ?? tr("Varies / not listed")}
                  />
                  <ElementProperty
                    label={tr("Density")}
                    value={elementDetails.density ?? tr("Data not listed")}
                  />
                  <ElementProperty
                    label={tr("Period / group")}
                    value={`${el.period} / ${el.group ?? "-"}`}
                  />
                </div>
                <div style={elementInfoBlock}>
                  <strong>{tr("Uses")}</strong>
                  <span>{elementDetails.uses.map(tr).join(", ")}</span>
                </div>
                {elementDetails.compounds.length > 0 && (
                  <div style={elementInfoBlock}>
                    <strong>{tr("Known compounds")}</strong>
                    <span>{elementDetails.compounds.join(", ")}</span>
                  </div>
                )}
                <div style={elementInfoBlock}>
                  <strong>{tr("Extra trivia")}</strong>
                  <span>{tr(elementDetails.trivia)}</span>
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                <p
                  style={{
                    fontSize: 13,
                    lineHeight: 1.55,
                    margin: 0,
                    color: "var(--muted-foreground)",
                    fontStyle: "italic",
                  }}
                >
                  {tr("Locked. Discover this element through fusion to unlock its facts.")}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const unlocked = unlockLockedElementsForCoins(el.atomicNumber, 50);
                    setPurchaseMessage(
                      unlocked
                        ? tr("Element unlocked.")
                        : tr("Need 50 gold coins to unlock this element."),
                    );
                  }}
                  disabled={goldCoins < 50}
                  style={{ ...collectionUnlockBtn, opacity: goldCoins >= 50 ? 1 : 0.55 }}
                >
                  {tr("Unlock this element")} - 50
                </button>
              </div>
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
              position: "relative",
            }}
          >
            <button
              type="button"
              onClick={() => setSelectedCompound(null)}
              aria-label={tr("Close")}
              style={collectionModalCloseBtn}
            >
              {tr("Close")}
            </button>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
              <MoleculeVisual
                compound={selectedCompound}
                size={104}
                locked={!selectedCompoundUnlocked}
              />
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, textAlign: "center" }}>
              {selectedCompoundUnlocked ? tr(selectedCompound.name) : tr("Unknown Compound")}
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 900,
                color: "var(--accent)",
                textAlign: "center",
                marginBottom: 12,
              }}
            >
              {selectedCompoundUnlocked ? selectedCompound.formula : "???"}
            </div>
            {selectedCompoundUnlocked && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--accent)",
                  textAlign: "center",
                  marginBottom: 10,
                }}
              >
                  {`${tr("Found")} ${compoundCounts[selectedCompound.id] ?? 1} ${tr(
                    (compoundCounts[selectedCompound.id] ?? 1) === 1 ? "time" : "times",
                  )}`}
              </div>
            )}
            {selectedCompoundUnlocked && selectedCompoundDetails ? (
              <div style={{ display: "grid", gap: 12 }}>
                <p
                  style={{ fontSize: 13, lineHeight: 1.55, margin: 0, color: "var(--foreground)" }}
                >
                  {tr(selectedCompound.fact)}
                </p>
                <div style={elementPropertyGrid}>
                  <ElementProperty
                    label={tr("Molar mass")}
                    value={selectedCompoundDetails.molarMass}
                  />
                  <ElementProperty label={tr("Atoms")} value={selectedCompoundDetails.atomCount} />
                  <ElementProperty label={tr("Rarity")} value={tr(selectedCompound.rarity)} />
                  <ElementProperty
                    label={tr("Bonus score")}
                    value={selectedCompound.bonusScore.toLocaleString()}
                  />
                </div>
                <div style={elementInfoBlock}>
                  <strong>{tr("Composition")}</strong>
                  <span>{selectedCompoundDetails.composition}</span>
                </div>
                <div style={elementInfoBlock}>
                  <strong>{tr("Element types")}</strong>
                  <span>{selectedCompoundDetails.elementTypes}</span>
                </div>
                <div style={elementInfoBlock}>
                  <strong>{tr("Use case")}</strong>
                  <span>{tr(selectedCompoundDetails.useCase)}</span>
                </div>
                <div style={elementInfoBlock}>
                  <strong>{tr("Chemistry note")}</strong>
                  <span>{tr(selectedCompoundDetails.chemistryNote)}</span>
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                <p style={{ fontSize: 13, lineHeight: 1.55, margin: 0, color: "var(--foreground)" }}>
                  {getCompoundHint(selectedCompound)}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const unlocked = unlockLockedCompoundsForCoins(selectedCompound.id, 100);
                    setPurchaseMessage(
                      unlocked
                        ? tr("Compound unlocked.")
                        : tr("Need 100 gold coins to unlock this compound."),
                    );
                  }}
                  disabled={goldCoins < 100}
                  style={{ ...collectionUnlockBtn, opacity: goldCoins >= 100 ? 1 : 0.55 }}
                >
                  {tr("Unlock this compound")} - 100
                </button>
              </div>
            )}
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

const collectionWalletPill: CSSProperties = {
  flex: "0 0 auto",
  padding: "7px 10px",
  borderRadius: 999,
  border: "1px solid var(--border)",
  background: "var(--surface-high)",
  color: "var(--accent)",
  fontSize: 12,
  fontWeight: 900,
};

const collectionUnlockPanel: CSSProperties = {
  display: "grid",
  gap: 10,
  marginBottom: 16,
  padding: 12,
  borderRadius: 14,
  border: "1px solid color-mix(in oklch, var(--accent) 32%, var(--border))",
  background: "color-mix(in oklch, var(--accent) 8%, var(--surface))",
};

const collectionUnlockActions: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 8,
};

const collectionUnlockBtn: CSSProperties = {
  border: "none",
  borderRadius: 10,
  padding: "9px 10px",
  background: "linear-gradient(135deg, var(--accent), var(--primary))",
  color: "var(--primary-foreground)",
  fontSize: 12,
  fontWeight: 900,
  cursor: "pointer",
};

const collectionPurchaseMessage: CSSProperties = {
  color: "var(--muted-foreground)",
  fontSize: 11,
  fontWeight: 800,
};

const collectionExpandBtn: CSSProperties = {
  marginTop: 10,
  border: "1px solid var(--border)",
  borderRadius: 999,
  padding: "7px 11px",
  background: "var(--surface)",
  color: "var(--accent)",
  fontSize: 11,
  fontWeight: 900,
  cursor: "pointer",
};

const collectionModalCloseBtn: CSSProperties = {
  position: "absolute",
  top: 12,
  right: 12,
  width: 32,
  height: 32,
  borderRadius: 999,
  border: "1px solid var(--border)",
  background: "var(--surface-high)",
  color: "var(--foreground)",
  fontSize: 13,
  fontWeight: 950,
  cursor: "pointer",
};

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
