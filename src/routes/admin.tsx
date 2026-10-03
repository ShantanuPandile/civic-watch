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
import { isSamplePhoto, reportPhoto } from "@/lib/report-photos";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Authority dashboard — CivicPulse" },
      { name: "description", content: "Priority-sorted civic issues for city departments: verify, assign, resolve and close complaints." },
      { property: "og:title", content: "Authority dashboard — CivicPulse" },
      { property: "og:description", content: "Manage and close civic issues by priority." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

const KEY = "civic-authority-session";
type AuthorityCredentials = { id: string; password: string };

function AdminPage() {
  const [credentials, setCredentials] = useState<AuthorityCredentials | null>(null);
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.id === "string" && typeof parsed.password === "string") setCredentials(parsed);
      }
    } catch { sessionStorage.removeItem(KEY); }
  }, []);
  if (!credentials) return <Login onOk={(value) => { sessionStorage.setItem(KEY, JSON.stringify(value)); setCredentials(value); }} />;
  return <Dashboard credentials={credentials} onLogout={() => { sessionStorage.removeItem(KEY); setCredentials(null); }} />;
}

function Login({ onOk }: { onOk: (credentials: AuthorityCredentials) => void }) {
  const login = useServerFn(adminLogin);
  const [id, setId] = useState("");
  const [p, setP] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="mx-auto max-w-sm px-4 py-20">
      <form
        className="rounded-md border bg-card p-6 shadow-card"
        onSubmit={async (e) => {
          e.preventDefault(); setBusy(true);
          try { await login({ data: { id, password: p } }); onOk({ id, password: p }); } catch { toast.error("Invalid authority ID or password"); } finally { setBusy(false); }
        }}
      >
        <Lock className="h-8 w-8 text-primary" />
        <h1 className="mt-3 text-2xl font-bold">NMC authority desk</h1>
        <p className="mt-1 text-sm text-muted-foreground">Municipal staff demo access.</p>
        <label htmlFor="authority-id" className="mt-5 block text-sm font-medium">Authority ID</label>
        <Input id="authority-id" autoComplete="username" required className="mt-1" value={id} onChange={(e) => setId(e.target.value)} placeholder="Enter authority ID" />
        <label htmlFor="authority-password" className="mt-4 block text-sm font-medium">Password</label>
        <Input id="authority-password" type="password" autoComplete="current-password" required className="mt-1" value={p} onChange={(e) => setP(e.target.value)} placeholder="Enter password" />
        <Button className="mt-3 w-full" disabled={busy}>Sign in</Button>
        <p className="mt-4 text-xs text-muted-foreground">Demo only · ID: NMC-DEMO · Password: nagpur-admin</p>
      </form>
    </main>
  );
}

function Dashboard({ credentials, onLogout }: { credentials: AuthorityCredentials; onLogout: () => void }) {
  const list = useServerFn(adminListReports);
  const update = useServerFn(adminUpdateStatus);
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ["admin", credentials.id], queryFn: () => list({ data: credentials }), refetchInterval: 10000 });
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
      await update({ data: { authorityId: credentials.id, password: credentials.password, id: editing.r.id, status: editing.to, note: note || undefined } });
      toast.success(`${editing.r.tracking_id} → ${editing.to}`);
      setEditing(null); setNote("");
      qc.invalidateQueries({ queryKey: ["admin"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Update failed"); }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">NMC authority desk</h1>
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
                  {reportPhoto(r.tracking_id, r.photo_url) && <div className="mt-2 flex items-center gap-2"><img src={reportPhoto(r.tracking_id, r.photo_url) ?? ""} alt={`Issue at ${r.address ?? "Nagpur"}`} width={1024} height={768} className="h-16 w-20 rounded object-cover" />{isSamplePhoto(r.tracking_id, r.photo_url) && <span className="text-xs text-muted-foreground">Illustrative demo photo</span>}</div>}
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
