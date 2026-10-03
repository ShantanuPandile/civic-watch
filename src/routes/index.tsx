import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { ArrowRight, Layers, MapPin, Search } from "lucide-react";
import { listReports } from "@/lib/civic.functions";
import { CATEGORIES, CATEGORY_LABEL, OPEN_STATUSES, type Category } from "@/lib/civic";
import { CivicMap } from "@/components/CivicMap";
import { CategoryChip, SeverityDots, StatusBadge, STATUS_PIN, timeAgo } from "@/components/civic-ui";
import { Button } from "@/components/ui/button";
import { isSamplePhoto, reportPhoto } from "@/lib/report-photos";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CivicPulse — Report & track city issues in Nagpur" },
      { name: "description", content: "Report potholes, broken streetlights and garbage. AI sorts and prioritises every complaint, merges duplicates and tracks it until fixed." },
      { property: "og:title", content: "CivicPulse — Report & track city issues" },
      { property: "og:description", content: "Public Nagpur civic reports with photos, comments and status tracking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const fetchReports = useServerFn(listReports);
  const { data = [], isLoading } = useQuery({ queryKey: ["reports"], queryFn: () => fetchReports(), refetchInterval: 15000 });
  const [cat, setCat] = useState<Category | "all">("all");

  const filtered = useMemo(() => data.filter((r) => cat === "all" || r.category === cat), [data, cat]);
  const open = data.filter((r) => OPEN_STATUSES.includes(r.status)).length;
  const resolved = data.filter((r) => r.status === "Resolved").length;
  const merged = data.reduce((a, r) => a + r.duplicate_count, 0);

  const markers = useMemo(
    () => filtered.map((r) => ({ id: r.id, lat: r.latitude, lng: r.longitude, color: STATUS_PIN[r.status], popup: `<b>${r.tracking_id}</b><br/>${CATEGORY_LABEL[r.category]} · ${r.status}` })),
    [filtered],
  );

  return (
    <main>
      <section className="relative overflow-hidden bg-hero text-ink-foreground">
        <div className="absolute inset-0 grid-lines" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-[1.2fr_1fr] md:py-20">
          <div>
             <span className="inline-flex items-center gap-2 rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold text-accent">● Nagpur civic service demo · NMC-inspired</span>
             <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] md:text-6xl">CivicPulse Nagpur</h1>
             <p className="mt-4 max-w-lg text-lg opacity-80">See the city's reported problems, add a photo and location to your complaint, and follow its progress from report to resolution.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90"><Link to="/report">Report an issue <ArrowRight /></Link></Button>
              <Button asChild size="lg" variant="outline" className="border-ink-foreground/30 bg-transparent text-ink-foreground hover:bg-ink-foreground/10 hover:text-ink-foreground"><Link to="/track"><Search /> Track my report</Link></Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 self-end">
            {[
              ["Open issues", open],
              ["Resolved", resolved],
              ["Duplicates merged", merged],
              ["Total issues", data.length],
            ].map(([l, v]) => (
              <div key={l as string} className="rounded-xl border border-ink-foreground/15 bg-ink-foreground/5 p-4 backdrop-blur">
                <div className="font-display text-3xl font-bold">{isLoading ? "–" : v}</div>
                <div className="text-sm opacity-70">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">City issues</h2>
             <p className="text-sm text-muted-foreground">All public reports and citizen comments, including merged reports. Sample photos are illustrative.</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(["all", ...CATEGORIES] as const).map((c) => (
               <Button key={c} size="sm" variant={cat === c ? "default" : "outline"} onClick={() => setCat(c)} className="rounded-full">
                {c === "all" ? "All" : CATEGORY_LABEL[c]}
               </Button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card shadow-card">
          <CivicMap markers={markers} className="h-72" zoom={12} />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading && Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />)}
          {filtered.map((r) => (
            <Link key={r.id} to="/track" search={{ id: r.tracking_id }} className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-card transition hover:-translate-y-0.5 hover:border-primary/40">
               {reportPhoto(r.tracking_id, r.photo_url) && <div className="relative"><img src={reportPhoto(r.tracking_id, r.photo_url) ?? ""} alt={`Issue reported near ${r.address ?? "Nagpur"}`} width={1024} height={768} className="h-44 w-full object-cover" loading="lazy" />{isSamplePhoto(r.tracking_id, r.photo_url) && <span className="absolute bottom-2 left-2 rounded bg-card/90 px-2 py-1 text-[10px] font-semibold text-foreground">Illustrative demo photo</span>}</div>}
              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <CategoryChip category={r.category} />
                  <StatusBadge status={r.status} />
                </div>
                <p className="line-clamp-2 font-medium">{r.description}</p>
                 <p className="text-xs text-muted-foreground">Reported by {r.reporter_name ?? "Citizen"}</p>
                 {r.parent_id && <p className="text-xs font-medium text-primary">Merged with an existing issue · follow updates</p>}
                {r.ai_reason && <p className="line-clamp-1 text-xs text-muted-foreground">{r.ai_reason}</p>}
                <div className="mt-auto flex items-center justify-between pt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{r.address || `${r.latitude.toFixed(3)}, ${r.longitude.toFixed(3)}`}</span>
                  <span>{timeAgo(r.created_at)}</span>
                </div>
                <div className="flex items-center justify-between border-t pt-2 text-xs">
                  <span className="font-mono font-semibold text-primary">{r.tracking_id}</span>
                  <span className="flex items-center gap-3">
                    {r.duplicate_count > 0 && <span className="flex items-center gap-1 font-semibold text-accent-foreground"><Layers className="h-3 w-3" />+{r.duplicate_count}</span>}
                    <SeverityDots value={r.severity} />
                    <span className="rounded bg-ink px-1.5 py-0.5 font-bold text-ink-foreground">P{r.priority_score}</span>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
