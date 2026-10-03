import { CATEGORIES, DEPARTMENTS, keywordClassify, type Category } from "./civic";

type Classification = ReturnType<typeof keywordClassify> | {
  category: Category; severity: number; reason: string; department: string; source: "ai";
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["category", "severity", "reason"],
  properties: {
    category: { type: "string", enum: [...CATEGORIES] },
    severity: { type: "integer", minimum: 1, maximum: 5 },
    reason: { type: "string" },
  },
};

// Classify with the AI gateway (streamed), fall back to keyword rules on any failure.
export async function classifyIssue(description: string): Promise<Classification> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return keywordClassify(description);
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        instructions:
          "You triage civic complaints in Nagpur, India. Text may be English, Hindi or Marathi. Categories: pothole (any road damage), streetlight (lights/poles/electric), garbage (waste/sanitation), other. Severity 1-5 (5 = immediate danger to life, near schools/hospitals, accidents). Reason: one short English sentence under 15 words.",
        input: description.slice(0, 1500),
        text: { format: { type: "json_schema", name: "classification", strict: true, schema: SCHEMA } },
      }),
    });
    if (!res.ok || !res.body) {
      console.error("AI classify failed", res.status, await res.text().catch(() => ""));
      return keywordClassify(description);
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let out = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        try {
          const ev = JSON.parse(data);
          if (ev.type === "response.output_text.delta") out += ev.delta;
        } catch { /* ignore */ }
      }
    }
    const parsed = JSON.parse(out) as { category: Category; severity: number; reason: string };
    if (!CATEGORIES.includes(parsed.category)) throw new Error("bad category");
    const severity = Math.min(5, Math.max(1, Math.round(parsed.severity)));
    return { category: parsed.category, severity, reason: parsed.reason, department: DEPARTMENTS[parsed.category], source: "ai" };
  } catch (e) {
    console.error("AI classify error", e);
    return keywordClassify(description);
  }
}
