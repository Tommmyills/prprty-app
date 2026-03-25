import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const app = new Hono();

// CORS
const allowed = [
    /^http:\/\/localhost(:\d+)?$/,
    /^http:\/\/127\.0\.0\.1(:\d+)?$/,
    /^https:\/\/[a-z0-9-]+\.vercel\.app$/,
    /^https:\/\/[a-z0-9-]+\.vibecode\.run$/,
    /^https:\/\/[a-z0-9-]+\.vibecodeapp\.com$/,
    /^https:\/\/prprty-app\.vercel\.app$/,
  ];
app.use("*", cors({
    origin: (origin) => origin && allowed.some((re) => re.test(origin)) ? origin : null,
    credentials: true,
}));

// ── Health ──────────────────────────────────────────────
app.get("/health", (c) => c.json({ status: "ok" }));
app.get("/", (c) => c.text("PRPRTY API is running 🚀"));

// ── Coach Route ─────────────────────────────────────────
app.post("/api/coach", async (c) => {
    try {
          const apiKey = process.env.ANTHROPIC_API_KEY;
          if (!apiKey) return c.json({ error: "ANTHROPIC_API_KEY is not configured" }, 500);
          const body = await c.req.json();
          const { transcript, context } = body;
          if (!transcript) return c.json({ error: "transcript is required" }, 400);
          let userMessage = transcript;
          if (context) {
                  const parts: string[] = [];
                  if (context.sessionType) parts.push(`Session type: ${context.sessionType}`);
                  if (context.clientName) parts.push(`Client: ${context.clientName}`);
                  if (context.dealAddress) parts.push(`Property: ${context.dealAddress}`);
                  if (parts.length > 0) userMessage = `Context:\n${parts.join("\n")}\n\nTranscript:\n${transcript}`;
          }
          const SYSTEM_PROMPT = `You are a senior real estate negotiation coach. Analyze the conversation and give ONE concise coaching tip (max 2 sentences). Be direct and actionable. Focus on negotiation strategy, objection handling, or closing techniques.`;
          const response = await fetch("https://api.anthropic.com/v1/messages", {
                  method: "POST",
                  headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
                  body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 300, stream: false, system: SYSTEM_PROMPT, messages: [{ role: "user", content: userMessage }] }),
          });
          if (!response.ok) {
                  const err = await response.text();
                  return c.json({ error: `Anthropic API error: ${response.status}`, details: err }, 500);
          }
          const data = await response.json() as any;
          const tip = data.content?.[0]?.text || "";
          const tipType = tip.toLowerCase().includes("deadline") ? "deadline"
                  : tip.toLowerCase().includes("object") ? "objection"
                  : tip.toLowerCase().includes("rapport") ? "rapport" : "negotiation";
          const urgency = tip.toLowerCase().includes("immediately") || tip.toLowerCase().includes("now") ? "high"
                  : tip.toLowerCase().includes("consider") ? "low" : "medium";
          return c.json({ tip, type: tipType, urgency });
    } catch (err: any) {
    return c.json({ error: err?.message || "Internal server error" }, 500);
    }
});

// ── Contracts Route ─────────────────────────────────────
app.post("/api/contracts/extract", async (c) => {
    try {
          const apiKey = process.env.ANTHROPIC_API_KEY;
          if (!apiKey) return c.json({ error: "ANTHROPIC_API_KEY is not configured" }, 500);
          const body = await c.req.json();
          const { fileBase64, fileName } = body;
          if (!fileBase64 || !fileName) return c.json({ error: "fileBase64 and fileName are required" }, 400);
          const lowerFileName = fileName.toLowerCase();
          let mediaType = "image/jpeg";
          if (lowerFileName.endsWith(".pdf")) mediaType = "application/pdf";
          else if (lowerFileName.endsWith(".png")) mediaType = "image/png";
          const isPdf = mediaType === "application/pdf";
          const prompt = `You are an expert real estate transaction coordinator. Extract ALL critical dates and deadlines from this contract. Return ONLY valid JSON in this format:
          {
            "propertyAddress": "string or null",
              "clientName": "string or null",
                "purchasePrice": number or null,
                  "contractDate": "YYYY-MM-DD or null",
                    "summary": "2-3 sentence summary",
                      "nextRequiredAction": "string describing the most urgent action",
                        "nextRequiredActionDate": "YYYY-MM-DD or null",
                          "deadlines": [{"label": "string", "date": "YYYY-MM-DD", "type": "inspection|appraisal|loan|closing|earnest_money|other", "notes": "string"}]
                          }`;
          const content = isPdf
            ? [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: fileBase64 } }, { type: "text", text: prompt }]
                  : [{ type: "image", source: { type: "base64", media_type: mediaType, data: fileBase64 } }, { type: "text", text: prompt }];
          const response = await fetch("https://api.anthropic.com/v1/messages", {
                  method: "POST",
                  headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
                  body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 2000, messages: [{ role: "user", content }] }),
          });
          if (!response.ok) {
                  const err = await response.text();
                  return c.json({ error: `Anthropic API error: ${response.status}`, details: err }, 500);
          }
          const data = await response.json() as any;
          const text = data.content?.[0]?.text || "{}";
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          const extracted = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
          return c.json(extracted);
    } catch (err: any) {
    return c.json({ error: err?.message || "Internal server error" }, 500);
    }
});

// ── Email Route ─────────────────────────────────────────
app.post("/api/email/generate", async (c) => {
    try {
          const apiKey = process.env.ANTHROPIC_API_KEY;
          if (!apiKey) return c.json({ error: "ANTHROPIC_API_KEY is not configured" }, 500);
          const body = await c.req.json();
          const { emailType, tone, context } = body;
          if (!emailType || !tone || !context) return c.json({ error: "emailType, tone, and context are required" }, 400);
          const { clientName, propertyAddress, realtorName, details } = context;
          if (!clientName || !propertyAddress || !realtorName) return c.json({ error: "clientName, propertyAddress, realtorName are required" }, 400);
          const systemPrompt = `You are a professional real estate agent assistant. Write emails that are ${tone}, professional, and specific to real estate transactions.`;
          const userPrompt = `Write a ${tone} ${emailType.replace(/_/g, " ")} email for:
          Client: ${clientName}
          Property: ${propertyAddress}
          Agent: ${realtorName}
          ${details ? `Additional context: ${details}` : ""}
          Return JSON: {"subject": "email subject", "body": "full email body"}`;
          const response = await fetch("https://api.anthropic.com/v1/messages", {
                  method: "POST",
                  headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
                  body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 1000, system: systemPrompt, messages: [{ role: "user", content: userPrompt }] }),
          });
          if (!response.ok) {
                  const err = await response.text();
                  return c.json({ error: `Anthropic API error: ${response.status}`, details: err }, 500);
          }
          const data = await response.json() as any;
          const text = data.content?.[0]?.text || "{}";
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { subject: "Email", body: text };
          return c.json(result);
    } catch (err: any) {
    return c.json({ error: err?.message || "Internal server error" }, 500);
    }
});

// ── Sample Route ────────────────────────────────────────
app.get("/api/sample", (c) => c.json({ message: "Sample route working", timestamp: new Date().toISOString() }));

// ── Vercel Handler ───────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
          const url = new URL(req.url || "/", `https://${req.headers.host}`);
          const request = new Request(url.toString(), {
                  method: req.method,
                  headers: req.headers as HeadersInit,
                  body: req.method !== "GET" && req.method !== "HEAD" ? JSON.stringify(req.body) : undefined,
          });
          const response = await app.fetch(request);
          const text = await response.text();
          response.headers.forEach((value, key) => { res.setHeader(key, value); });
          res.status(response.status).send(text);
    } catch (err) {
          console.error("Handler error:", err);
          res.status(500).json({ error: "Internal Server Error" });
    }
}
