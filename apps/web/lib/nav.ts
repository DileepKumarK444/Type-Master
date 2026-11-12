export type NavItem = { href: string; label: string; icon: string };

/** Desktop sidebar items (see docs/04-information-architecture.md). */
export const SIDEBAR: NavItem[] = [
  { href: "/app", label: "Dashboard", icon: "home" },
  { href: "/app/learn", label: "Learn", icon: "book" },
  { href: "/app/practice", label: "Practice", icon: "keyboard" },
  { href: "/app/games", label: "Games", icon: "game" },
  { href: "/app/progress", label: "Progress", icon: "chart" },
  { href: "/app/achievements", label: "Achievements", icon: "trophy" },
];

/** Mobile bottom tabs: 5 max. "More" collects the rest. */
export const TABS: NavItem[] = [
  { href: "/app", label: "Home", icon: "home" },
  { href: "/app/learn", label: "Learn", icon: "book" },
  { href: "/app/practice", label: "Practice", icon: "keyboard" },
  { href: "/app/games", label: "Games", icon: "game" },
  { href: "/app/more", label: "More", icon: "more" },
];
