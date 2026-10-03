// Shared, browser-safe civic helpers (no secrets here).

export const CATEGORIES = ["pothole", "streetlight", "garbage", "other"] as const;
export type Category = (typeof CATEGORIES)[number];

export const STATUSES = ["Reported", "Verified", "Assigned", "In Progress", "Resolved", "Rejected"] as const;
export type Status = (typeof STATUSES)[number];
export const OPEN_STATUSES: Status[] = ["Reported", "Verified", "Assigned", "In Progress"];

export const DEPARTMENTS: Record<Category, string> = {
  pothole: "Roads",
  streetlight: "Electricity",
  garbage: "Sanitation",
  other: "Roads",
};

export const CATEGORY_LABEL: Record<Category, string> = {
  pothole: "Pothole",
  streetlight: "Streetlight",
  garbage: "Garbage",
  other: "Other",
};

export const NAGPUR = { lat: 21.1458, lng: 79.0882 };

export type ReportRow = {
  id: string;
  tracking_id: string;
  description: string;
  category: Category;
  severity: number;
  ai_reason: string | null;
  department: string | null;
  priority_score: number;
  latitude: number;
  longitude: number;
  address: string | null;
  photo_url: string | null;
  status: Status;
  duplicate_count: number;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  reporter_name?: string | null;
};

export function daysOpen(createdAt: string, now = Date.now()) {
  return Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 86_400_000));
}

// Priority = severity*10 + duplicates*5 + days_open*2
export function priorityScore(severity: number, duplicates: number, createdAt: string) {
  return severity * 10 + duplicates * 5 + daysOpen(createdAt) * 2;
}

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function levelFor(credits: number) {
  if (credits >= 150) return { name: "Gold Civic Hero", next: null as number | null, tone: "gold" as const };
  if (credits >= 50) return { name: "Silver", next: 150, tone: "silver" as const };
  return { name: "Bronze", next: 50, tone: "bronze" as const };
}

// Keyword fallback (English, Hindi, Marathi)
const KEYWORDS: Record<Exclude<Category, "other">, string[]> = {
  pothole: ["pothole", "road", "crack", "hole", "गड्ढा", "सड़क", "खड्डा", "रस्ता", "रस्त्यावर", "gaddha", "khadda"],
  streetlight: ["streetlight", "street light", "light", "lamp", "pole", "dark", "बत्ती", "लाइट", "अंधेरा", "दिवा", "अंधार", "batti"],
  garbage: ["garbage", "trash", "waste", "dustbin", "dump", "smell", "कचरा", "कूड़ा", "बदबू", "कचरापेटी", "घाण", "kachra"],
};
const SEVERE = ["accident", "danger", "spark", "school", "hospital", "injur", "fell", "falling", "huge", "deep", "खतरा", "दुर्घटना", "मोठा", "बड़ा", "धोका"];

export function keywordClassify(text: string) {
  const t = text.toLowerCase();
  let category: Category = "other";
  let best = 0;
  for (const [cat, words] of Object.entries(KEYWORDS) as [Category, string[]][]) {
    const hits = words.filter((w) => t.includes(w.toLowerCase())).length;
    if (hits > best) {
      best = hits;
      category = cat;
    }
  }
  const severe = SEVERE.filter((w) => t.includes(w.toLowerCase())).length;
  const severity = Math.min(5, (category === "other" ? 2 : 3) + severe);
  return {
    category,
    severity,
    reason: category === "other" ? "Keyword match: general civic issue" : `Keyword match: looks like a ${CATEGORY_LABEL[category].toLowerCase()} problem`,
    department: DEPARTMENTS[category],
    source: "keywords" as const,
  };
}
