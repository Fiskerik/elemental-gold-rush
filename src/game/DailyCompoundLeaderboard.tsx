import { useEffect, useState, type CSSProperties } from "react";
import { Coins } from "lucide-react";
import {
  countryFlag,
  getDailyLeaderboard,
  loadDailyLeaderboard,
  type LeaderboardBoard,
  type LeaderboardEntry,
  type LeaderboardKind,
} from "./leaderboard";
import { formatScore } from "./logic";
import { useIsTabletLayout } from "./responsive";
import { useProgress } from "./store";
import { isGameCenterAvailable, showGameCenterLeaderboards } from "./gameCenter";
import {
  DAILY_LEADERBOARD_REWARDS,
  getDailyLeaderboardReward,
  getDailyLeaderboardRewardKey,
} from "./dailyLeaderboardRewards";
import { getTodayQuestDate } from "./quests";
import { t } from "./localization";

export function Leaderboard({ onBack }: { onBack: () => void }) {
  const isTabletLayout = useIsTabletLayout();
  const [kind, setKind] = useState<LeaderboardKind>("daily-board");
  const scope = "global";
  const [board, setBoard] = useState<LeaderboardBoard>(() => getDailyLeaderboard(kind, scope));
  const [loading, setLoading] = useState(false);
  const [gameCenterBusy, setGameCenterBusy] = useState(false);
  const [gameCenterMessage, setGameCenterMessage] = useState<string | null>(null);
  const recordDailyBoardLeaderboardPlacement = useProgress(
    (s) => s.recordDailyBoardLeaderboardPlacement,
  );
  const dailyLeaderboardRewardClaims = useProgress((s) => s.dailyLeaderboardRewardClaims);
  const appLanguage = useProgress((s) => s.appLanguage);
  const tr = (text: string) => t(text, appLanguage);
  const playerRank = board.player.rank > 0 ? `#${board.player.rank}` : "-";
  const leaderboardLabel = tr(kind === "daily-board" ? "Daily Board" : "Daily Compound");

  useEffect(() => {
    let cancelled = false;
    setBoard(getDailyLeaderboard(kind, scope));
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
  }, [kind]);

  useEffect(() => {
    if (scope !== "global" || board.player.rank <= 0) return;
    if (kind === "daily-board") {
      recordDailyBoardLeaderboardPlacement(board.player.rank, board.totalPlayerCount);
    }
  }, [
    kind,
    scope,
    board.player.rank,
    board.totalPlayerCount,
    recordDailyBoardLeaderboardPlacement,
  ]);

  const currentPrize = getDailyLeaderboardReward(board.player.rank);
  const rewardKey = getDailyLeaderboardRewardKey(kind, getTodayQuestDate());
  const awardedPrize = dailyLeaderboardRewardClaims[rewardKey] ?? 0;

  async function handleOpenGameCenter() {
    if (gameCenterBusy) return;
    if (!isGameCenterAvailable()) {
      setGameCenterMessage(tr("Game Center is available on iOS devices."));
      return;
    }
    setGameCenterBusy(true);
    setGameCenterMessage(null);
    try {
      const shown = await showGameCenterLeaderboards(kind, scope);
      if (!shown) setGameCenterMessage(tr("Game Center did not open."));
    } catch (error) {
      setGameCenterMessage(error instanceof Error ? tr(error.message) : tr("Could not open Game Center."));
    } finally {
      setGameCenterBusy(false);
    }
  }

  return (
    <div
      className="app-shell"
      style={{ padding: isTabletLayout ? 28 : 20, paddingTop: isTabletLayout ? 36 : 32 }}
    >
      <div style={{ position: "relative", zIndex: 1, maxWidth: 620, margin: "0 auto" }}>
        <header style={headerRow}>
          <button type="button" onClick={onBack} style={backButton}>
            {tr("Back")}
          </button>
          <div style={{ minWidth: 0 }}>
            <div style={kicker}>{leaderboardLabel.toUpperCase()}</div>
            <h1 style={title}>{tr("Leaderboard")}</h1>
          </div>
          <PodiumMark />
        </header>

        <section style={summaryPanel}>
          <div>
            <div style={summaryLabel}>{tr("Your Rank")}</div>
            <strong style={summaryValue}>{playerRank}</strong>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={summaryLabel}>{tr(kind === "daily-compound" ? "Time" : "Score")}</div>
            <strong style={summaryValue}>
              {kind === "daily-compound"
                ? formatSeconds(board.player.score)
                : formatScore(board.player.score)}
            </strong>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={summaryLabel}>{tr("Country")}</div>
            <strong style={summaryValue}>
              {countryFlag(board.countryCode)} {board.countryCode}
            </strong>
          </div>
        </section>

        <div style={kindTabRow} role="tablist" aria-label={tr("Leaderboard type")}>
          <SegmentButton active={kind === "daily-board"} onClick={() => setKind("daily-board")}>
            {tr("Daily Board")}
          </SegmentButton>
          <SegmentButton
            active={kind === "daily-compound"}
            onClick={() => setKind("daily-compound")}
          >
            {tr("Daily Compound")}
          </SegmentButton>
        </div>

        <section style={prizePanel} aria-label={tr("Daily leaderboard prizes")}>
          <div>
            <div style={summaryLabel}>Today’s top-three prizes</div>
            <div style={prizeLine}>
              <PrizeReward place={tr("1st")} amount={DAILY_LEADERBOARD_REWARDS[1]} />
              <PrizeReward place={tr("2nd")} amount={DAILY_LEADERBOARD_REWARDS[2]} />
              <PrizeReward place={tr("3rd")} amount={DAILY_LEADERBOARD_REWARDS[3]} />
            </div>
          </div>
          <div style={prizeStatus}>
            {currentPrize > 0 ? (
              <>
                {tr("You are currently entitled to")} <CoinReward amount={currentPrize} />
                {awardedPrize >= currentPrize ? ` (${tr("awarded")})` : ""}.
              </>
            ) : (
              tr("Finish a run to enter today’s leaderboard.")
            )}
          </div>
        </section>

        {isGameCenterAvailable() && (
          <button
            type="button"
            onClick={handleOpenGameCenter}
            disabled={gameCenterBusy}
            style={{
              ...gameCenterButton,
              opacity: gameCenterBusy ? 0.62 : 1,
              cursor: gameCenterBusy ? "not-allowed" : "pointer",
            }}
          >
            {gameCenterBusy ? tr("Opening Game Center...") : tr("Open Game Center")}
          </button>
        )}

        {(loading || board.status || gameCenterMessage) && (
          <div style={statusLine} role="status" aria-live="polite">
            {loading
              ? isGameCenterAvailable()
                ? tr("Loading Game Center...")
                : tr("Loading scores...")
              : (gameCenterMessage ?? board.status)}
          </div>
        )}

        <section style={tablePanel} aria-label={`${leaderboardLabel} ${tr(scope)} ${tr("leaderboard")}`}>
          <div style={{ ...tableHeader, gridTemplateColumns: leaderboardGridColumns(kind) }}>
            <span>{tr("Rank")}</span>
            <span>{tr("Player")}</span>
            <span style={{ textAlign: "right" }}>
              {tr(kind === "daily-compound" ? "Time" : "Score")}
            </span>
            {kind === "daily-board" && <span style={{ textAlign: "right" }}>{tr("Shots")}</span>}
          </div>
          <div style={{ display: "grid", gap: 7 }}>
            {board.entries.length > 0 ? (
              board.entries.map((entry) => (
                <LeaderboardRow key={entry.id} entry={entry} kind={kind} />
              ))
            ) : (
              <div style={emptyRows}>
                {isGameCenterAvailable() ? tr("No Game Center scores yet.") : tr("No scores yet.")}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function LeaderboardRow({ entry, kind }: { entry: LeaderboardEntry; kind: LeaderboardKind }) {
  return (
    <div
      style={{
        ...row,
        gridTemplateColumns: leaderboardGridColumns(kind),
        borderColor: entry.isPlayer
          ? "color-mix(in oklch, var(--accent) 65%, var(--border))"
          : "var(--border)",
        background: entry.isPlayer
          ? "linear-gradient(135deg, color-mix(in oklch, var(--accent) 20%, var(--surface)), var(--surface-elevated))"
          : "var(--surface)",
      }}
    >
      <strong style={rankCell}>
        <span>{entry.rank}</span>
        {getDailyLeaderboardReward(entry.rank) > 0 && (
          <span style={rowPrize}>
            <Coins size={11} strokeWidth={3} aria-hidden="true" />
            <span>+{getDailyLeaderboardReward(entry.rank)}</span>
          </span>
        )}
      </strong>
      <span style={playerCell}>
        <span aria-hidden="true">{entry.flag}</span>
        <span
          style={{
            minWidth: 0,
            flex: 1,
            overflow: "hidden",
            whiteSpace: "nowrap",
            fontSize: leaderboardNameFontSize(entry.name),
            letterSpacing: entry.name.length > 12 ? "-0.2px" : undefined,
          }}
          data-no-localize="true"
        >
          {entry.name}
        </span>
      </span>
      <strong style={scoreCell}>
        {kind === "daily-compound" ? formatSeconds(entry.score) : formatScore(entry.score)}
      </strong>
      {kind === "daily-board" && <span style={shotsCell}>{entry.shots}</span>}
    </div>
  );
}

function PrizeReward({ place, amount }: { place: string; amount: number }) {
  return (
    <span style={prizeReward}>
      <span>{place}</span>
      <CoinReward amount={amount} />
    </span>
  );
}

function CoinReward({ amount }: { amount: number }) {
  return (
    <span style={coinReward}>
      <Coins size={14} strokeWidth={2.8} aria-hidden="true" />
      <strong>+{amount}</strong>
    </span>
  );
}

function leaderboardNameFontSize(name: string): number {
  const length = Array.from(name).length;
  if (length <= 8) return 15;
  if (length <= 12) return 13;
  if (length <= 16) return 11;
  return 9.5;
}

function leaderboardGridColumns(kind: LeaderboardKind): string {
  return kind === "daily-compound" ? "52px minmax(0, 1fr) 92px" : "52px minmax(0, 1fr) 82px 48px";
}

function formatSeconds(seconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
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

const prizePanel: CSSProperties = {
  display: "grid",
  gap: 8,
  marginTop: 10,
  padding: "11px 13px",
  border: "1px solid color-mix(in oklch, var(--accent) 42%, var(--border))",
  borderRadius: 14,
  background: "color-mix(in oklch, var(--accent) 9%, var(--surface))",
};

const prizeLine: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  marginTop: 5,
  color: "var(--foreground)",
  fontSize: 13,
  fontWeight: 850,
};

const prizeReward: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
};

const coinReward: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 3,
  color: "var(--accent)",
  whiteSpace: "nowrap",
};

const prizeStatus: CSSProperties = {
  color: "var(--success, var(--accent))",
  fontSize: 12,
  fontWeight: 850,
};

const statusLine: CSSProperties = {
  marginTop: 10,
  color: "var(--muted-foreground)",
  fontSize: 12,
  fontWeight: 800,
  textAlign: "center",
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

const gameCenterButton: CSSProperties = {
  width: "100%",
  minHeight: 42,
  marginTop: 10,
  border: "1px solid color-mix(in oklch, var(--accent) 55%, var(--border))",
  borderRadius: 12,
  background:
    "linear-gradient(135deg, color-mix(in oklch, var(--accent) 25%, var(--surface)), color-mix(in oklch, var(--primary) 18%, var(--surface)))",
  color: "var(--foreground)",
  fontFamily: "inherit",
  fontSize: 13,
  fontWeight: 950,
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
  display: "grid",
  gap: 1,
  color: "var(--accent)",
  fontSize: 16,
};

const rowPrize: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 2,
  color: "var(--success, var(--accent))",
  fontSize: 9,
  fontWeight: 900,
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
