import { useEffect, useState, type CSSProperties } from "react";
import {
  countryFlag,
  getDailyLeaderboard,
  loadDailyLeaderboard,
  type LeaderboardBoard,
  type LeaderboardEntry,
  type LeaderboardKind,
  type LeaderboardScope,
} from "./leaderboard";
import { DAILY_BOARD_LEADERBOARD_ACHIEVEMENTS } from "./leaderboardAchievements";
import { formatScore } from "./logic";
import { useIsTabletLayout } from "./responsive";
import { useProgress } from "./store";

export function Leaderboard({ onBack }: { onBack: () => void }) {
  const isTabletLayout = useIsTabletLayout();
  const [kind, setKind] = useState<LeaderboardKind>("daily-board");
  const [scope, setScope] = useState<LeaderboardScope>("global");
  const [board, setBoard] = useState<LeaderboardBoard>(() => getDailyLeaderboard(kind, scope));
  const [loading, setLoading] = useState(false);
  const achievementCounts = useProgress((s) => s.dailyBoardLeaderboardAchievementCounts);
  const recordDailyBoardLeaderboardPlacement = useProgress(
    (s) => s.recordDailyBoardLeaderboardPlacement,
  );
  const playerRank = board.player.rank > 0 ? `#${board.player.rank}` : "-";
  const leaderboardLabel = kind === "daily-board" ? "Daily Board" : "Daily Compound";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void loadDailyLeaderboard(kind, scope)
      .then((nextBoard) => {
        if (!cancelled) setBoard(nextBoard);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [kind, scope]);

  useEffect(() => {
    if (kind !== "daily-board" || scope !== "global") return;
    recordDailyBoardLeaderboardPlacement(board.player.rank, board.totalPlayerCount);
  }, [
    kind,
    scope,
    board.player.rank,
    board.totalPlayerCount,
    recordDailyBoardLeaderboardPlacement,
  ]);

  return (
    <div
      className="app-shell"
      style={{ padding: isTabletLayout ? 28 : 20, paddingTop: isTabletLayout ? 36 : 32 }}
    >
      <div style={{ position: "relative", zIndex: 1, maxWidth: 620, margin: "0 auto" }}>
        <header style={headerRow}>
          <button type="button" onClick={onBack} style={backButton}>
            Back
          </button>
          <div style={{ minWidth: 0 }}>
            <div style={kicker}>{leaderboardLabel.toUpperCase()}</div>
            <h1 style={title}>Leaderboard</h1>
          </div>
          <PodiumMark />
        </header>

        <section style={summaryPanel}>
          <div>
            <div style={summaryLabel}>Your Rank</div>
            <strong style={summaryValue}>{playerRank}</strong>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={summaryLabel}>Score</div>
            <strong style={summaryValue}>{formatScore(board.player.score)}</strong>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={summaryLabel}>Country</div>
            <strong style={summaryValue}>
              {countryFlag(board.countryCode)} {board.countryCode}
            </strong>
          </div>
        </section>

        <div style={kindTabRow} role="tablist" aria-label="Leaderboard type">
          <SegmentButton active={kind === "daily-board"} onClick={() => setKind("daily-board")}>
            Daily Board
          </SegmentButton>
          <SegmentButton
            active={kind === "daily-compound"}
            onClick={() => setKind("daily-compound")}
          >
            Daily Compound
          </SegmentButton>
        </div>

        <div style={tabRow} role="tablist" aria-label="Leaderboard scope">
          <SegmentButton active={scope === "global"} onClick={() => setScope("global")}>
            Global
          </SegmentButton>
          <SegmentButton active={scope === "local"} onClick={() => setScope("local")}>
            Local
          </SegmentButton>
        </div>

        {kind === "daily-board" && (
          <section style={achievementPanel} aria-label="Daily Board achievements">
            <div style={achievementHeader}>
              <div>
                <div style={summaryLabel}>Daily Board Badges</div>
                <strong style={achievementTitle}>Placement counters</strong>
              </div>
              <span style={achievementScope}>Global</span>
            </div>
            <div style={achievementGrid}>
              {DAILY_BOARD_LEADERBOARD_ACHIEVEMENTS.map((achievement) => (
                <div key={achievement.id} style={achievementCard} title={achievement.description}>
                  <span style={achievementIcon}>{achievement.icon}</span>
                  <span style={{ minWidth: 0 }}>
                    <strong style={achievementName}>{achievement.name}</strong>
                    <small style={achievementCount}>
                      {achievementCounts[achievement.id] ?? 0}x earned
                    </small>
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {(loading || board.status) && (
          <div style={statusLine} role="status" aria-live="polite">
            {loading ? "Loading Game Center..." : board.status}
          </div>
        )}

        <section style={tablePanel} aria-label={`${leaderboardLabel} ${scope} leaderboard`}>
          <div style={tableHeader}>
            <span>Rank</span>
            <span>Player</span>
            <span style={{ textAlign: "right" }}>Score</span>
            <span style={{ textAlign: "right" }}>Shots</span>
          </div>
          <div style={{ display: "grid", gap: 7 }}>
            {board.entries.length > 0 ? (
              board.entries.map((entry) => <LeaderboardRow key={entry.id} entry={entry} />)
            ) : (
              <div style={emptyRows}>No Game Center scores yet.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <div
      style={{
        ...row,
        borderColor: entry.isPlayer
          ? "color-mix(in oklch, var(--accent) 65%, var(--border))"
          : "var(--border)",
        background: entry.isPlayer
          ? "linear-gradient(135deg, color-mix(in oklch, var(--accent) 20%, var(--surface)), var(--surface-elevated))"
          : "var(--surface)",
      }}
    >
      <strong style={rankCell}>{entry.rank}</strong>
      <span style={playerCell}>
        <span aria-hidden="true">{entry.flag}</span>
        <span
          style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          data-no-localize="true"
        >
          {entry.name}
        </span>
      </span>
      <strong style={scoreCell}>{formatScore(entry.score)}</strong>
      <span style={shotsCell}>{entry.shots}</span>
    </div>
  );
}

function SegmentButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{
        ...segmentButton,
        background: active
          ? "linear-gradient(135deg, var(--accent), var(--primary))"
          : "var(--surface)",
        color: active ? "var(--primary-foreground)" : "var(--foreground)",
        borderColor: active ? "transparent" : "var(--border)",
      }}
    >
      {children}
    </button>
  );
}

export function PodiumMark({ size = 34 }: { size?: number }) {
  return (
    <span style={{ ...podiumMark, width: size, height: size }} aria-hidden="true">
      <span style={podiumBase} />
      <span style={{ ...podiumStep, height: "58%", left: "34%", zIndex: 3 }}>1</span>
      <span style={{ ...podiumStep, height: "43%", left: "6%", zIndex: 2 }}>2</span>
      <span style={{ ...podiumStep, height: "34%", left: "64%", zIndex: 1 }}>3</span>
    </span>
  );
}

const headerRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 12,
  marginBottom: 16,
};

const backButton: CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "9px 12px",
  background: "var(--surface)",
  color: "var(--foreground)",
  fontWeight: 850,
  cursor: "pointer",
};

const kicker: CSSProperties = {
  color: "var(--accent)",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: 1.7,
};

const title: CSSProperties = {
  margin: "2px 0 0",
  fontSize: 28,
  lineHeight: 1.05,
  fontWeight: 950,
};

const summaryPanel: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 8,
  border: "1px solid color-mix(in oklch, var(--primary) 38%, var(--border))",
  borderRadius: 16,
  padding: 14,
  background:
    "linear-gradient(135deg, color-mix(in oklch, var(--primary) 18%, var(--surface-elevated)), var(--surface))",
  boxShadow: "0 14px 34px rgba(0,0,0,0.28)",
};

const summaryLabel: CSSProperties = {
  color: "var(--muted-foreground)",
  fontSize: 10,
  fontWeight: 850,
  letterSpacing: 1.1,
  textTransform: "uppercase",
};

const summaryValue: CSSProperties = {
  display: "block",
  marginTop: 4,
  fontSize: 16,
  fontWeight: 950,
};

const tabRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 8,
  marginTop: 12,
};

const kindTabRow: CSSProperties = {
  ...tabRow,
  marginTop: 14,
};

const statusLine: CSSProperties = {
  marginTop: 10,
  color: "var(--muted-foreground)",
  fontSize: 12,
  fontWeight: 800,
  textAlign: "center",
};

const achievementPanel: CSSProperties = {
  marginTop: 12,
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: 12,
  background: "var(--surface)",
};

const achievementHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  marginBottom: 10,
};

const achievementTitle: CSSProperties = {
  display: "block",
  marginTop: 2,
  fontSize: 14,
  fontWeight: 950,
};

const achievementScope: CSSProperties = {
  border: "1px solid color-mix(in oklch, var(--accent) 45%, var(--border))",
  borderRadius: 999,
  padding: "5px 8px",
  color: "var(--accent)",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: 1,
  textTransform: "uppercase",
};

const achievementGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 8,
};

const achievementCard: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
  minHeight: 52,
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 9,
  background: "var(--surface-elevated)",
};

const achievementIcon: CSSProperties = {
  display: "grid",
  placeItems: "center",
  flex: "0 0 auto",
  width: 32,
  height: 32,
  borderRadius: 10,
  background: "linear-gradient(135deg, var(--accent), var(--primary))",
  color: "var(--primary-foreground)",
  fontSize: 12,
  fontWeight: 950,
};

const achievementName: CSSProperties = {
  display: "block",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: 12,
  fontWeight: 900,
};

const achievementCount: CSSProperties = {
  display: "block",
  marginTop: 2,
  color: "var(--muted-foreground)",
  fontSize: 10,
  fontWeight: 800,
};

const segmentButton: CSSProperties = {
  minHeight: 40,
  border: "1px solid var(--border)",
  borderRadius: 12,
  fontFamily: "inherit",
  fontSize: 13,
  fontWeight: 950,
  cursor: "pointer",
};

const tablePanel: CSSProperties = {
  marginTop: 14,
  border: "1px solid var(--border)",
  borderRadius: 16,
  background: "var(--surface-elevated)",
  padding: 10,
};

const tableHeader: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "52px minmax(0, 1fr) 82px 48px",
  gap: 8,
  color: "var(--muted-foreground)",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: 1.1,
  padding: "2px 8px 8px",
  textTransform: "uppercase",
};

const row: CSSProperties = {
  minHeight: 48,
  display: "grid",
  gridTemplateColumns: "52px minmax(0, 1fr) 82px 48px",
  alignItems: "center",
  gap: 8,
  border: "1px solid var(--border)",
  borderRadius: 11,
  padding: "0 8px",
};

const emptyRows: CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 11,
  color: "var(--muted-foreground)",
  fontSize: 13,
  fontWeight: 800,
  padding: 14,
  textAlign: "center",
};

const rankCell: CSSProperties = {
  color: "var(--accent)",
  fontSize: 16,
};

const playerCell: CSSProperties = {
  minWidth: 0,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontWeight: 850,
};

const scoreCell: CSSProperties = {
  textAlign: "right",
  fontSize: 13,
};

const shotsCell: CSSProperties = {
  color: "var(--muted-foreground)",
  fontSize: 13,
  fontWeight: 850,
  textAlign: "right",
};

const podiumMark: CSSProperties = {
  position: "relative",
  display: "inline-block",
  flex: "0 0 auto",
  filter: "drop-shadow(0 8px 12px rgba(0, 0, 0, 0.34))",
};

const podiumBase: CSSProperties = {
  position: "absolute",
  left: "2%",
  right: "2%",
  bottom: 0,
  height: "13%",
  borderRadius: "3px",
  background: "color-mix(in oklch, var(--primary) 44%, var(--surface-high))",
  border: "1px solid color-mix(in oklch, var(--accent) 28%, var(--border))",
};

const podiumStep: CSSProperties = {
  position: "absolute",
  bottom: "11%",
  width: "30%",
  border: "1px solid color-mix(in oklch, var(--accent) 54%, var(--border))",
  borderRadius: "4px 4px 2px 2px",
  background:
    "linear-gradient(180deg, color-mix(in oklch, white 24%, var(--accent)), color-mix(in oklch, var(--primary) 54%, var(--accent)))",
  color: "var(--primary-foreground)",
  display: "grid",
  placeItems: "center",
  fontSize: 10,
  fontWeight: 1000,
  boxShadow: "inset 0 -8px 10px rgba(0, 0, 0, 0.16), 0 0 8px var(--accent-glow)",
};
