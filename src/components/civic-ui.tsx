import { Link } from "@tanstack/react-router";
import nmcLogo from "@/assets/nmc-logo-concept-a.png";
import { CATEGORY_LABEL, type Category, type Status } from "@/lib/civic";
import { cn } from "@/lib/utils";

export const STATUS_STYLE: Record<Status, string> = {
  Reported: "bg-secondary text-secondary-foreground",
  Verified: "bg-info/15 text-info",
  Assigned: "bg-warning/20 text-accent-foreground",
  "In Progress": "bg-primary/12 text-primary",
  Resolved: "bg-success/15 text-success",
  Rejected: "bg-destructive/12 text-destructive",
};

// CSS var colors for map pins
export const STATUS_PIN: Record<Status, string> = {
  Reported: "var(--muted-foreground)",
  Verified: "var(--info)",
  Assigned: "var(--warning)",
  "In Progress": "var(--primary)",
  Resolved: "var(--success)",
  Rejected: "var(--destructive)",
};

export const CATEGORY_EMOJI: Record<Category, string> = { pothole: "🕳️", streetlight: "💡", garbage: "🗑️", other: "📍" };

export function StatusBadge({ status }: { status: Status }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_STYLE[status])}>{status}</span>;
}

export function CategoryChip({ category }: { category: Category }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
      {CATEGORY_EMOJI[category]} {CATEGORY_LABEL[category]}
    </span>
  );
}

export function SeverityDots({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5" title={`Severity ${value}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={cn("h-2 w-2 rounded-full", i <= value ? (value >= 4 ? "bg-destructive" : "bg-warning") : "bg-border")} />
      ))}
    </span>
  );
}

const NAV = [
  { to: "/", label: "Issues" },
  { to: "/report", label: "Report" },
  { to: "/track", label: "Track" },
  { to: "/leaderboard", label: "Credits" },
  { to: "/admin", label: "NMC desk" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 sm:flex-nowrap sm:py-3">
        <Link to="/" className="flex shrink-0 items-center gap-2.5 text-foreground">
          <img src={nmcLogo} alt="CivicPulse city hall logo" width={48} height={48} className="h-10 w-10 object-contain" />
          <span className="flex flex-col leading-tight"><span className="font-display text-base font-bold sm:text-lg">CivicPulse <span className="text-primary">Nagpur</span></span><span className="text-[10px] font-semibold uppercase text-muted-foreground sm:text-xs">NMC-inspired civic reporting · demo</span></span>
        </Link>
        <nav className="flex w-full items-center gap-1 overflow-x-auto text-sm sm:w-auto">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: true }} className="rounded-md px-3 py-1.5 font-medium text-muted-foreground hover:bg-muted hover:text-foreground" activeProps={{ className: "bg-secondary text-primary" }}>
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
