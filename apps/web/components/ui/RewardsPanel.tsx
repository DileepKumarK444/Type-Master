export interface RewardsView {
  xpAwarded: number;
  level: number;
  leveledUp: boolean;
  newBadges: { id: string; title: string; emoji: string }[];
}

/** "+30 XP", level-up and newly unlocked badges. Renders nothing when there is nothing to celebrate. */
export function RewardsPanel({ rewards }: { rewards?: RewardsView | null }) {
  if (!rewards || (rewards.xpAwarded === 0 && rewards.newBadges.length === 0 && !rewards.leveledUp)) return null;
  return (
    <div className="space-y-2 rounded-token border border-line bg-surface p-4 text-left" role="status" data-testid="rewards">
      <div className="flex flex-wrap items-center gap-2">
        {rewards.xpAwarded > 0 && <span className="rounded-full bg-accent-soft px-3 py-1 text-sm font-bold text-accent">+{rewards.xpAwarded} XP</span>}
        {rewards.leveledUp && <span className="rounded-full bg-warn/15 px-3 py-1 text-sm font-bold text-warn" data-testid="level-up">⬆ Level {rewards.level}!</span>}
      </div>
      {rewards.newBadges.map((b) => (
        <div key={b.id} className="flex items-center gap-3" data-testid="new-badge">
          <span className="text-3xl" aria-hidden="true">{b.emoji}</span>
          <div><div className="text-xs text-muted">Badge unlocked</div><div className="font-bold">{b.title}</div></div>
        </div>
      ))}
    </div>
  );
}
