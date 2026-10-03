import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Layers, Lock, LogOut } from "lucide-react";
import { adminListReports, adminLogin, adminUpdateStatus } from "@/lib/civic.functions";
import { CATEGORIES, CATEGORY_LABEL, OPEN_STATUSES, STATUSES, type ReportRow, type Status } from "@/lib/civic";
import { CivicMap } from "@/components/CivicMap";
import { CategoryChip, SeverityDots, StatusBadge, STATUS_PIN, timeAgo } from "@/components/civic-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Authority dashboard — CivicPulse" },
      { name: "description", content: "Priority-sorted civic issues for city departments: verify, assign, resolve and close complaints." },
      { property: "og:title", content: "Authority dashboard — CivicPulse" },
      { property: "og:description", content: "Manage and close civic issues by priority." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

const KEY = "civic-admin-pw";

function AdminPage() {
  const [pw, setPw] = useState<string | null>(null);
  useEffect(() => setPw(sessionStorage.getItem(KEY)), []);
  if (!pw) return <Login onOk={(p) => { sessionStorage.setItem(KEY, p); setPw(p); }} />;
  return <Dashboard pw={pw} onLogout={() => { sessionStorage.removeItem(KEY); setPw(null); }} />;
}

function Login({ onOk }: { onOk: (p: string) => void }) {
  const login = useServerFn(adminLogin);
  const [p, setP] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="mx-auto max-w-sm px-4 py-20">
      <form
        className="rounded-2xl border bg-card p-6 shadow-card"
        onSubmit={async (e) => {
          e.preventDefault(); setBusy(true);
          try { await login({ data: { password: p } }); onOk(p); } catch { toast.error("Wrong password"); } finally { setBusy(false); }
        }}
      >
        <Lock className="h-8 w-8 text-primary" />
        <h1 className="mt-3 text-2xl font-bold">Authority login</h1>
        <p className="mt-1 text-sm text-muted-foreground">For municipal staff only.</p>
        <Input type="password" className="mt-4" value={p} onChange={(e) => setP(e.target.value)} placeholder="Admin password" />
        <Button className="mt-3 w-full" disabled={busy}>Sign in</Button>
      </form>
    </main>
  );
}

function Dashboard({ pw, onLogout }: { pw: string; onLogout: () => void }) {
  const list = useServerFn(adminListReports);
  const update = useServerFn(adminUpdateStatus);
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ["admin", pw], queryFn: () => list({ data: { password: pw } }), refetchInterval: 10000 });
  const [cat, setCat] = useState<string>("all");
  const [status, setStatus] = useState<string>("open");
  const [editing, setEditing] = useState<{ r: ReportRow; to: Status } | null>(null);
  const [note, setNote] = useState("");

  const rows = useMemo(
    () => data.filter((r) => (cat === "all" || r.category === cat) && (status === "all" || (status === "open" ? OPEN_STATUSES.includes(r.status) : r.status === status))),
    [data, cat, status],
  );
  const byCat = CATEGORIES.map((c) => ({ name: CATEGORY_LABEL[c], value: data.filter((r) => r.category === c).length }));
  const openN = data.filter((r) => OPEN_STATUSES.includes(r.status)).length;
  const pie = [
    { name: "Open", value: openN, fill: "var(--primary)" },
    { name: "Resolved", value: data.filter((r) => r.status === "Resolved").length, fill: "var(--success)" },
    { name: "Rejected", value: data.filter((r) => r.status === "Rejected").length, fill: "var(--destructive)" },
  ];
  const markers = useMemo(() => rows.map((r) => ({ id: r.id, lat: r.latitude, lng: r.longitude, color: STATUS_PIN[r.status], popup: `<b>${r.tracking_id}</b> · P${r.priority_score}<br/>${r.description.slice(0, 60)}` })), [rows]);

  async function apply() {
    if (!editing) return;
    try {
      await update({ data: { password: pw, id: editing.r.id, status: editing.to, note: note || undefined } });
      toast.success(`${editing.r.tracking_id} → ${editing.to}`);
      setEditing(null); setNote("");
      qc.invalidateQueries({ queryKey: ["admin"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Update failed"); }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Authority dashboard</h1>
          <p className="text-sm text-muted-foreground">Sorted by priority = severity×10 + duplicates×5 + days open×2</p>
        </div>
        <Button variant="outline" onClick={onLogout}><LogOut /> Log out</Button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4 shadow-card">
          <h3 className="text-sm font-semibold text-muted-foreground">Issues by category</h3>
          <div className="h-44"><ResponsiveContainer><BarChart data={byCat}><XAxis dataKey="name" fontSize={12} /><YAxis allowDecimals={false} fontSize={12} width={24} /><Tooltip /><Bar dataKey="value" fill="var(--primary)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-card">
          <h3 className="text-sm font-semibold text-muted-foreground">Open vs resolved</h3>
          <div className="flex h-44 items-center">
            <ResponsiveContainer width="60%"><PieChart><Pie data={pie} dataKey="value" innerRadius={40} outerRadius={70}>{pie.map((p) => <Cell key={p.name} fill={p.fill} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
            <ul className="space-y-1 text-sm">{pie.map((p) => <li key={p.name} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: p.fill }} />{p.name}: <b>{p.value}</b></li>)}</ul>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border shadow-card"><CivicMap markers={markers} className="h-full min-h-52" zoom={12} /></div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <select className="h-9 rounded-md border bg-card px-3 text-sm" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
        </select>
        <select className="h-9 rounded-md border bg-card px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="open">Open only</option><option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="self-center text-sm text-muted-foreground">{rows.length} issues</span>
      </div>

      <div className="mt-3 overflow-x-auto rounded-2xl border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr><th className="p-3">Priority</th><th className="p-3">Issue</th><th className="p-3">Dept</th><th className="p-3">Severity</th><th className="p-3">Status</th><th className="p-3">Action</th></tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="border-t align-top">
                <td className="p-3"><span className="rounded bg-ink px-2 py-1 font-bold text-ink-foreground">{r.priority_score}</span></td>
                <td className="max-w-sm p-3">
                  <div className="flex items-center gap-2"><span className="font-mono text-xs font-semibold text-primary">{r.tracking_id}</span><CategoryChip category={r.category} />{r.duplicate_count > 0 && <span className="flex items-center gap-0.5 text-xs font-semibold"><Layers className="h-3 w-3" />+{r.duplicate_count}</span>}</div>
                  <div className="mt-1 font-medium">{r.description}</div>
                  <div className="text-xs text-muted-foreground">{r.address ?? ""} · {timeAgo(r.created_at)} · by {r.reporter_name ?? "—"}</div>
                  {r.photo_url && <a href={r.photo_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">View photo</a>}
                </td>
                <td className="p-3">{r.department}</td>
                <td className="p-3"><SeverityDots value={r.severity} /></td>
                <td className="p-3"><StatusBadge status={r.status} /></td>
                <td className="p-3">
                  <select className="h-8 rounded-md border bg-background px-2 text-xs" value="" onChange={(e) => e.target.value && setEditing({ r, to: e.target.value as Status })}>
                    <option value="">Change…</option>
                    {STATUSES.filter((s) => s !== r.status).map((s) => <option key={s} value={s}>{s === "Rejected" ? "Reject (fake)" : s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.r.tracking_id} → {editing?.to}</DialogTitle></DialogHeader>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Note for the citizen (e.g. Assigned to Ward 12 road crew)" />
          <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={apply}>Update status</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
