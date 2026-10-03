import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Camera, CheckCircle2, Crosshair, Layers, Loader2, Sparkles } from "lucide-react";
import { submitReport } from "@/lib/civic.functions";
import { CATEGORY_LABEL, NAGPUR } from "@/lib/civic";
import { CivicMap } from "@/components/CivicMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SeverityDots } from "@/components/civic-ui";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Report an issue — CivicPulse" },
      { name: "description", content: "Report a pothole, streetlight or garbage problem with photo and GPS location in English, Hindi or Marathi." },
      { property: "og:title", content: "Report a civic issue — CivicPulse" },
      { property: "og:description", content: "Pin the spot, add a photo, and AI sorts your complaint instantly." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportPage,
});

type Result = Awaited<ReturnType<typeof submitReport>>;

function ReportPage() {
  const submit = useServerFn(submitReport);
  const [form, setForm] = useState({ name: "", phone: "", description: "", address: "" });
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  function useGps() {
    if (!navigator.geolocation) { toast.error("GPS not available on this device"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setPos({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocating(false); },
      () => { setLocating(false); toast.error("Couldn't get GPS. Tap the map instead."); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function onPhoto(f?: File) {
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { toast.error("Photo must be under 2 MB"); return; }
    const r = new FileReader();
    r.onload = () => setPhoto(r.result as string);
    r.readAsDataURL(f);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pos) { toast.error("Pick the location using GPS or by tapping the map"); return; }
    setBusy(true);
    try {
      const res = await submit({ data: { ...form, address: form.address || undefined, latitude: pos.lat, longitude: pos.lng, photo: photo ?? undefined } });
      setResult(res);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit report");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <main className="mx-auto max-w-xl px-4 py-14">
        <div className="rounded-2xl border bg-card p-8 text-center shadow-card">
          {result.merged ? <Layers className="mx-auto h-12 w-12 text-accent" /> : <CheckCircle2 className="mx-auto h-12 w-12 text-success" />}
          <h1 className="mt-4 text-3xl font-bold">{result.merged ? "Merged with existing issue" : "Report submitted!"}</h1>
          <p className="mt-2 text-muted-foreground">
            {result.merged
              ? `Someone already reported this nearby (${result.original_tracking_id}). Your report boosts its priority. +3 credits`
              : "Your complaint is now in the queue. +5 credits"}
          </p>
          <div className="mx-auto mt-6 w-fit rounded-xl bg-secondary px-6 py-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Your tracking ID</div>
            <div className="font-mono text-2xl font-bold text-primary">{result.tracking_id}</div>
          </div>
          <div className="mt-6 rounded-xl border p-4 text-left text-sm">
            <div className="mb-2 flex items-center gap-1.5 font-semibold"><Sparkles className="h-4 w-4 text-primary" /> {result.source === "ai" ? "AI analysis" : "Auto analysis"}</div>
            <div className="grid grid-cols-2 gap-y-1.5">
              <span className="text-muted-foreground">Category</span><span className="font-medium">{CATEGORY_LABEL[result.category]}</span>
              <span className="text-muted-foreground">Severity</span><span><SeverityDots value={result.severity} /> {result.severity}/5</span>
              <span className="text-muted-foreground">Department</span><span className="font-medium">{result.department}</span>
            </div>
            <p className="mt-2 text-muted-foreground">{result.reason}</p>
          </div>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild><Link to="/track" search={{ id: result.tracking_id }}>Track live</Link></Button>
            <Button variant="outline" onClick={() => { setResult(null); setForm({ ...form, description: "", address: "" }); setPhoto(null); setPos(null); }}>Report another</Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">Report an issue</h1>
      <p className="mt-1 text-muted-foreground">Write in English, हिंदी or मराठी. We'll figure out the rest.</p>

      <form onSubmit={onSubmit} className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border bg-card p-6 shadow-card">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="name">Your name</Label><Input id="name" required maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="phone">Phone</Label><Input id="phone" required inputMode="tel" pattern="[0-9+ ]{8,15}" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="98xxxxxxxx" /></div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc">What's the problem?</Label>
            <Textarea id="desc" required minLength={5} maxLength={1500} rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Big pothole near the bus stop, two bikes fell yesterday" />
          </div>
          <div className="space-y-1.5"><Label htmlFor="addr">Landmark / area (optional)</Label><Input id="addr" maxLength={200} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Sitabuldi, near Variety Square" /></div>
          <div className="space-y-1.5">
            <Label>Photo (max 2 MB)</Label>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed p-4 hover:bg-muted">
              {photo ? <img src={photo} alt="Preview" className="h-20 w-20 rounded-lg object-cover" /> : <Camera className="h-8 w-8 text-muted-foreground" />}
              <span className="text-sm text-muted-foreground">{photo ? "Tap to change photo" : "Tap to add a photo"}</span>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between gap-2">
            <Label>Location</Label>
            <Button type="button" variant="secondary" size="sm" onClick={useGps} disabled={locating}>
              {locating ? <Loader2 className="animate-spin" /> : <Crosshair />} Use my GPS
            </Button>
          </div>
          <div className="overflow-hidden rounded-xl border">
            <CivicMap picked={pos} onPick={setPos} className="h-80" zoom={13} />
          </div>
          <p className="text-sm text-muted-foreground">
            {pos ? `📍 ${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}` : "Tap the map to drop a pin, or use GPS."}
          </p>
          {!pos && (
            <button type="button" className="w-fit text-xs text-primary underline" onClick={() => setPos({ lat: NAGPUR.lat + (Math.random() - 0.5) * 0.02, lng: NAGPUR.lng + (Math.random() - 0.5) * 0.02 })}>
              Demo: drop a random pin in Nagpur
            </button>
          )}
          <Button type="submit" size="lg" className="mt-auto" disabled={busy}>
            {busy ? <><Loader2 className="animate-spin" /> AI is analysing…</> : "Submit report"}
          </Button>
        </div>
      </form>
    </main>
  );
}
