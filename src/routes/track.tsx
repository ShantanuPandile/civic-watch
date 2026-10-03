import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Layers, Radio, Search } from "lucide-react";
import { trackReport } from "@/lib/civic.functions";
import { STATUSES } from "@/lib/civic";
import { CivicMap } from "@/components/CivicMap";
import { CategoryChip, SeverityDots, StatusBadge, STATUS_PIN } from "@/components/civic-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/track")({
  validateSearch: z.object({ id: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Track your report — CivicPulse" },
      { name: "description", content: "Enter your tracking ID to see live status updates and the full timeline of your civic complaint." },
      { property: "og:title", content: "Track your report — CivicPulse" },
      { property: "og:description", content: "Live status timeline for every civic complaint." },
    ],
  }),
  component: TrackPage,
});

const FLOW = STATUSES.filter((s) => s !== "Rejected");

function TrackPage() {
  const { id } = Route.useSearch();
  const navigate = useNavigate({ from: "/track" });
  const [input, setInput] = useState(id ?? "");
  useEffect(() => setInput(id ?? ""), [id]);
  const fetchTrack = useServerFn(trackReport);
  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["track", id],
    queryFn: () => fetchTrack({ data: { tracking_id: id! } }),
    enabled: !!id,
    refetchInterval: 5000, // live updates
  });

  const r = data?.report;
  const currentIdx = r ? FLOW.indexOf(r.status as (typeof FLOW)[number]) : -1;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold">Track your report</h1>
      <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); navigate({ search: { id: input.trim().toUpperCase() } }); }}>
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="CIV-1001" className="max-w-xs font-mono uppercase" />
        <Button type="submit"><Search /> Track</Button>
      </form>

      {id && isLoading && <div className="mt-8 h-64 animate-pulse rounded-2xl bg-muted" />}
      {id && !isLoading && data === null && <p className="mt-8 rounded-xl border bg-card p-6 text-muted-foreground">No report found for <b>{id}</b>. Try CIV-1001.</p>}

      {r && data && (
        <div className="mt-8 space-y-6">
          {data.mergedInto && (
            <div className="flex items-center gap-2 rounded-xl border border-accent/50 bg-accent/10 p-4 text-sm">
              <Layers className="h-4 w-4" /> Your report <b>{data.ownTrackingId}</b> was merged with issue <b>{data.mergedInto}</b>. You'll see its live progress below.
            </div>
          )}
          <div className="rounded-2xl border bg-card p-6 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-mono text-sm font-semibold text-primary">{r.tracking_id}</div>
                <h2 className="mt-1 text-xl font-bold">{r.description}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  <CategoryChip category={r.category} /> <StatusBadge status={r.status} />
                  <SeverityDots value={r.severity} />
                  <span className="text-muted-foreground">· {r.department}</span>
                  {r.duplicate_count > 0 && <span className="text-muted-foreground">· {r.duplicate_count + 1} citizens reported this</span>}
                </div>
                {r.ai_reason && <p className="mt-2 text-sm text-muted-foreground">{r.ai_reason}</p>}
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success">
                <Radio className="h-3 w-3 animate-pulse" /> Live · {new Date(dataUpdatedAt).toLocaleTimeString()}
              </span>
            </div>

            {r.status === "Rejected" ? (
              <div className="mt-6 rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive">This report was marked as invalid by the authority.</div>
            ) : (
              <div className="mt-6 grid grid-cols-5 gap-1">
                {FLOW.map((s, i) => (
                  <div key={s} className="text-center">
                    <div className={cn("h-2 rounded-full", i <= currentIdx ? "bg-primary" : "bg-border")} />
                    <div className={cn("mt-1.5 text-[11px] font-medium sm:text-xs", i <= currentIdx ? "text-foreground" : "text-muted-foreground")}>{s}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border bg-card p-6 shadow-card">
              <h3 className="font-bold">Timeline</h3>
              <ol className="mt-4 space-y-4 border-l-2 pl-5">
                {[...data.history].reverse().map((h) => (
                  <li key={h.id} className="relative">
                    <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-card bg-primary" />
                    <div className="flex items-center gap-2"><StatusBadge status={h.status as any} /><span className="text-xs text-muted-foreground">{new Date(h.changed_at).toLocaleString()}</span></div>
                    {h.note && <p className="mt-1 text-sm">{h.note}</p>}
                  </li>
                ))}
              </ol>
            </div>
            <div className="space-y-4">
              {r.photo_url && <img src={r.photo_url} alt="Reported issue" className="h-48 w-full rounded-2xl object-cover" />}
              <div className="overflow-hidden rounded-2xl border">
                <CivicMap key={r.id} picked={null} markers={[{ id: r.id, lat: r.latitude, lng: r.longitude, color: STATUS_PIN[r.status] }]} className="h-56" zoom={15} />
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
