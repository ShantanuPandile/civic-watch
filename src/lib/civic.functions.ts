import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { OPEN_STATUSES, STATUSES, haversineMeters, priorityScore, type ReportRow } from "./civic";

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function checkAdmin(password: string) {
  const expected = process.env["ADMIN_PASSWORD"] || "nagpur-admin";
  if (password !== expected) throw new Error("Wrong admin password");
}

async function addCredits(userId: string | null, reportId: string | null, points: number, reason: string) {
  if (!userId) return;
  const sb = await db();
  await sb.from("credit_log").insert({ user_id: userId, report_id: reportId, points, reason });
  const { data } = await sb.from("citizens").select("credits").eq("id", userId).single();
  await sb.from("citizens").update({ credits: (data?.credits ?? 0) + points }).eq("id", userId);
}

async function withPhotos(rows: ReportRow[]) {
  const sb = await db();
  const paths = rows.map((r) => r.photo_url).filter(Boolean) as string[];
  if (!paths.length) return rows;
  const { data } = await sb.storage.from("report-photos").createSignedUrls(paths, 3600);
  const map = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  return rows.map((r) => ({ ...r, photo_url: r.photo_url ? map.get(r.photo_url) ?? null : null }));
}

function livePriority(rows: ReportRow[]) {
  return rows.map((r) => ({
    ...r,
    priority_score: OPEN_STATUSES.includes(r.status) ? priorityScore(r.severity, r.duplicate_count, r.created_at) : r.priority_score,
  }));
}

const SELECT = "*, citizens(name)";
function flatten(rows: any[]): ReportRow[] {
  return rows.map(({ citizens, ...r }) => ({ ...r, reporter_name: citizens?.name ?? null }));
}

// ---------- Citizen: submit report ----------
export const submitReport = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      name: z.string().trim().min(1).max(80),
      phone: z.string().trim().regex(/^[0-9+ ]{8,15}$/),
      description: z.string().trim().min(5).max(1500),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      address: z.string().max(200).optional(),
      photo: z.string().max(2_900_000).optional(), // data URL, ~2 MB
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const sb = await db();
    const { classifyIssue } = await import("./civic.server");

    // citizen upsert by phone
    let { data: citizen } = await sb.from("citizens").select("id").eq("phone", data.phone).maybeSingle();
    if (!citizen) {
      const ins = await sb.from("citizens").insert({ name: data.name, phone: data.phone }).select("id").single();
      if (ins.error) throw new Error(ins.error.message);
      citizen = ins.data;
    }

    const ai = await classifyIssue(data.description);
    const tracking_id = "CIV-" + Math.random().toString(36).slice(2, 8).toUpperCase();

    // photo
    let photo_path: string | null = null;
    if (data.photo) {
      const m = data.photo.match(/^data:(image\/[a-z]+);base64,(.+)$/);
      if (m && m[1] && m[2]) {
        const mime = m[1];
        const bytes = Buffer.from(m[2], "base64");
        if (bytes.length > 2 * 1024 * 1024) throw new Error("Photo must be under 2 MB");
        photo_path = `${tracking_id}.${mime.split("/")[1]}`;
        const up = await sb.storage.from("report-photos").upload(photo_path, bytes, { contentType: mime });
        if (up.error) photo_path = null;
      }
    }

    // duplicate check: same category, open, < 7 days, within 50 m
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const { data: candidates } = await sb
      .from("reports")
      .select("*")
      .eq("category", ai.category)
      .is("parent_id", null)
      .in("status", OPEN_STATUSES)
      .gte("created_at", since);
    const original = (candidates ?? []).find(
      (c) => haversineMeters(c.latitude, c.longitude, data.latitude, data.longitude) <= 50,
    );

    const base = {
      tracking_id,
      user_id: citizen.id,
      description: data.description,
      category: ai.category,
      severity: ai.severity,
      ai_reason: `${ai.source === "ai" ? "AI" : "Rules"}: ${ai.reason}`,
      department: ai.department,
      latitude: data.latitude,
      longitude: data.longitude,
      address: data.address ?? null,
      photo_url: photo_path,
    };

    if (original) {
      const dup = original.duplicate_count + 1;
      const severity = Math.max(original.severity, ai.severity);
      await sb.from("reports").update({
        duplicate_count: dup,
        severity,
        priority_score: priorityScore(severity, dup, original.created_at),
        updated_at: new Date().toISOString(),
      }).eq("id", original.id);
      const child = await sb.from("reports").insert({
        ...base, parent_id: original.id, status: original.status, priority_score: 0,
      }).select("id").single();
      if (child.error) throw new Error(child.error.message);
      await sb.from("status_history").insert({ report_id: original.id, status: original.status, note: `Duplicate report ${tracking_id} merged (now ${dup + 1} reports)` });
      await addCredits(citizen.id, child.data.id, 3, "Report merged into existing issue");
      return { tracking_id, merged: true, original_tracking_id: original.tracking_id, ...ai };
    }

    const ins = await sb.from("reports").insert({
      ...base, status: "Reported", priority_score: priorityScore(ai.severity, 0, new Date().toISOString()),
    }).select("id").single();
    if (ins.error) throw new Error(ins.error.message);
    await sb.from("status_history").insert({ report_id: ins.data.id, status: "Reported", note: "Report received" });
    await addCredits(citizen.id, ins.data.id, 5, "New report submitted");
    return { tracking_id, merged: false, original_tracking_id: null, ...ai };
  });

// ---------- Public list ----------
export const listReports = createServerFn({ method: "GET" }).handler(async () => {
  const sb = await db();
  const { data, error } = await sb.from("reports").select(SELECT).is("parent_id", null).order("created_at", { ascending: false }).limit(200);
  if (error) throw new Error(error.message);
  return withPhotos(livePriority(flatten(data ?? [])));
});

// ---------- Tracking ----------
export const trackReport = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ tracking_id: z.string().trim().min(3).max(20) }).parse(d))
  .handler(async ({ data }) => {
    const sb = await db();
    const { data: rep } = await sb.from("reports").select(SELECT).eq("tracking_id", data.tracking_id.toUpperCase()).maybeSingle();
    if (!rep) return null;
    let main = flatten([rep])[0]!;
    let mergedInto: string | null = null;
    if (main.parent_id) {
      const { data: parent } = await sb.from("reports").select(SELECT).eq("id", main.parent_id).single();
      if (parent) { mergedInto = parent.tracking_id; main = flatten([parent])[0]!; }
    }
    const { data: history } = await sb.from("status_history").select("*").eq("report_id", main.id).order("changed_at");
    const [withPhoto] = await withPhotos(livePriority([main]));
    return { report: withPhoto, history: history ?? [], mergedInto, ownTrackingId: data.tracking_id.toUpperCase() };
  });

// ---------- Credits ----------
export const getLeaderboard = createServerFn({ method: "GET" }).handler(async () => {
  const sb = await db();
  const { data } = await sb.from("citizens").select("name, credits").order("credits", { ascending: false }).limit(10);
  return data ?? [];
});

export const getMyCredits = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ phone: z.string().trim().min(8).max(15) }).parse(d))
  .handler(async ({ data }) => {
    const sb = await db();
    const { data: c } = await sb.from("citizens").select("id, name, credits").eq("phone", data.phone).maybeSingle();
    if (!c) return null;
    const { data: log } = await sb.from("credit_log").select("points, reason, created_at").eq("user_id", c.id).order("created_at", { ascending: false }).limit(20);
    return { name: c.name, credits: c.credits, log: log ?? [] };
  });

// ---------- Admin ----------
export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string().max(200) }).parse(d))
  .handler(async ({ data }) => { checkAdmin(data.password); return { ok: true }; });

export const adminListReports = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string().max(200) }).parse(d))
  .handler(async ({ data }) => {
    checkAdmin(data.password);
    const sb = await db();
    const { data: rows, error } = await sb.from("reports").select(SELECT).is("parent_id", null).limit(500);
    if (error) throw new Error(error.message);
    const list = await withPhotos(livePriority(flatten(rows ?? [])));
    return list.sort((a, b) => b.priority_score - a.priority_score);
  });

export const adminUpdateStatus = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      password: z.string().max(200),
      id: z.string().uuid(),
      status: z.enum(STATUSES),
      note: z.string().trim().max(300).optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    checkAdmin(data.password);
    const sb = await db();
    const { data: rep } = await sb.from("reports").select("*").eq("id", data.id).single();
    if (!rep) throw new Error("Report not found");
    if (rep.status === data.status) return { ok: true };
    const now = new Date().toISOString();
    const isOpen = OPEN_STATUSES.includes(data.status);
    await sb.from("reports").update({
      status: data.status,
      updated_at: now,
      priority_score: isOpen ? priorityScore(rep.severity, rep.duplicate_count, rep.created_at) : rep.priority_score,
    }).eq("id", rep.id);
    // merged child reports follow the original
    await sb.from("reports").update({ status: data.status, updated_at: now }).eq("parent_id", rep.id);
    await sb.from("status_history").insert({ report_id: rep.id, status: data.status, note: data.note || `Marked ${data.status}` });

    if (data.status === "Verified") await addCredits(rep.user_id, rep.id, 10, "Report verified");
    if (data.status === "Resolved") await addCredits(rep.user_id, rep.id, 20, "Issue resolved");
    if (data.status === "Rejected") await addCredits(rep.user_id, rep.id, -10, "Report marked fake");
    return { ok: true };
  });
