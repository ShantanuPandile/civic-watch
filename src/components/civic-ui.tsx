import { Link } from "@tanstack/react-router";
import { Megaphone } from "lucide-react";
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
  { to: "/admin", label: "Authority" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground"><Megaphone className="h-4 w-4" /></span>
          <span className="hidden sm:inline">CivicPulse</span>
        </Link>
        <nav className="flex items-center gap-1 overflow-x-auto text-sm">
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
