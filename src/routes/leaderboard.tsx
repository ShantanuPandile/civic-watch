import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Award, Trophy } from "lucide-react";
import { getLeaderboard, getMyCredits } from "@/lib/civic.functions";
import { levelFor } from "@/lib/civic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Civic Credits leaderboard — CivicPulse" },
      { name: "description", content: "Earn Civic Credits for every genuine report. See your level and the top 10 civic heroes of Nagpur." },
      { property: "og:title", content: "Civic Credits leaderboard — CivicPulse" },
      { property: "og:description", content: "Bronze, Silver, Gold Civic Hero — see who's fixing the city." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LeaderboardPage,
});

const TONE = { gold: "bg-gold text-ink", silver: "bg-silver text-ink", bronze: "bg-bronze text-ink-foreground" };

function LeaderboardPage() {
  const fetchBoard = useServerFn(getLeaderboard);
  const fetchMine = useServerFn(getMyCredits);
  const { data: board = [] } = useQuery({ queryKey: ["board"], queryFn: () => fetchBoard() });
  const [phone, setPhone] = useState("");
  const [lookup, setLookup] = useState<string | null>(null);
  const { data: mine, isFetching } = useQuery({
    queryKey: ["mine", lookup],
    queryFn: () => fetchMine({ data: { phone: lookup! } }),
    enabled: !!lookup,
  });

  return (
    <main className="mx-auto grid max-w-5xl gap-6 px-4 py-10 md:grid-cols-[1fr_1.2fr]">
      <section className="rounded-2xl border bg-card p-6 shadow-card">
        <h1 className="text-2xl font-bold">My Civic Credits</h1>
        <p className="mt-1 text-sm text-muted-foreground">+5 report · +10 verified · +20 resolved · +3 merged · −10 fake</p>
        <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); setLookup(phone.trim()); }}>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Your phone number" inputMode="tel" />
          <Button type="submit" disabled={isFetching}>Check</Button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">Demo: try 9822000001</p>
        {lookup && mine === null && <p className="mt-4 text-sm text-muted-foreground">No citizen with that phone yet. Submit a report to start earning!</p>}
        {mine && (() => {
          const lvl = levelFor(mine.credits);
          const pct = lvl.next ? Math.min(100, (mine.credits / lvl.next) * 100) : 100;
          return (
            <div className="mt-6">
              <div className="flex items-center gap-4">
                <div className={cn("grid h-16 w-16 place-items-center rounded-2xl", TONE[lvl.tone])}><Award className="h-8 w-8" /></div>
                <div>
                  <div className="text-sm text-muted-foreground">{mine.name}</div>
                  <div className="font-display text-3xl font-bold">{mine.credits} pts</div>
                  <div className="text-sm font-semibold">{lvl.name}</div>
                </div>
              </div>
              <Progress value={pct} className="mt-4" />
              <p className="mt-1 text-xs text-muted-foreground">{lvl.next ? `${lvl.next - mine.credits} pts to next level` : "Top level reached 🎉"}</p>
              <ul className="mt-5 divide-y text-sm">
                {mine.log.map((l, i) => (
                  <li key={i} className="flex justify-between py-2">
                    <span>{l.reason}</span>
                    <span className={cn("font-semibold", l.points < 0 ? "text-destructive" : "text-success")}>{l.points > 0 ? "+" : ""}{l.points}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })()}
      </section>

      <section className="rounded-2xl border bg-card p-6 shadow-card">
        <h2 className="flex items-center gap-2 text-2xl font-bold"><Trophy className="h-6 w-6 text-gold" /> Top 10 Civic Heroes</h2>
        <ol className="mt-4 space-y-2">
          {board.map((c, i) => {
            const lvl = levelFor(c.credits);
            return (
              <li key={i} className={cn("flex items-center gap-3 rounded-xl border p-3", i === 0 && "border-gold bg-gold/10")}>
                <span className="w-6 text-center font-display text-lg font-bold text-muted-foreground">{i + 1}</span>
                <span className="flex-1 font-medium">{c.name}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", TONE[lvl.tone])}>{lvl.name}</span>
                <span className="w-16 text-right font-bold">{c.credits}</span>
              </li>
            );
          })}
        </ol>
      </section>
    </main>
  );
}
