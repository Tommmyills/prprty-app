import { Hono } from "hono";
import { z } from "zod";

const coachRouter = new Hono();

// Request body schema
const CoachRequestSchema = z.object({
  transcript: z.string().min(1, "transcript is required"),
  context: z
    .object({
      sessionType: z.string().optional(),
      clientName: z.string().optional(),
      dealAddress: z.string().optional(),
    })
    .optional(),
});

// Response schema for the tip returned by Claude
const CoachTipSchema = z.object({
  tip: z.string().nullable(),
  type: z
    .enum(["negotiation", "deadline", "objection", "rapport", "general"])
    .optional(),
  urgency: z.enum(["low", "medium", "high"]).optional(),
});

export type CoachRequest = z.infer<typeof CoachRequestSchema>;
export type CoachTip = z.infer<typeof CoachTipSchema>;

const SYSTEM_PROMPT = `You are a senior real estate negotiation coach listening live to a realtor's call.
Analyze the conversation and give ONE concise, immediately actionable coaching tip.
Respond ONLY with valid JSON in this exact format: {"tip": "...", "type": "negotiation|deadline|objection|rapport|general", "urgency": "low|medium|high"}
- "tip": under 2 sentences, specific and actionable
- "type": negotiation (price/terms), deadline (dates/timing), objection (handling buyer/seller pushback), rapport (relationship building), general
- "urgency": high if action needed now, medium if soon, low if background advice
If nothing notable was said or transcript is too short, respond with: {"tip": null}
Keep tips practical. Focus on what the realtor should say or do RIGHT NOW.`;

// POST /api/coach
coachRouter.post("/", async (c) => {
  // Parse and validate request body
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parseResult = CoachRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json(
      {
        error: "Validation failed",
        issues: parseResult.error.issues,
      },
      400
    );
  }

  const { transcript, context } = parseResult.data;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return c.json({ error: "ANTHROPIC_API_KEY is not configured" }, 500);
  }

  // Build user message with optional context
  let userMessage = transcript;
  if (context) {
    const contextParts: string[] = [];
    if (context.sessionType) contextParts.push(`Session type: ${context.sessionType}`);
    if (context.clientName) contextParts.push(`Client: ${context.clientName}`);
    if (context.dealAddress) contextParts.push(`Property: ${context.dealAddress}`);
    if (contextParts.length > 0) {
      userMessage = `Context:\n${contextParts.join("\n")}\n\nTranscript:\n${transcript}`;
    }
  }

  // Call Anthropic API
  let anthropicResponse: Response;
  try {
    anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 300,
        stream: false,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown network error";
    return c.json({ error: `Failed to reach Anthropic API: ${message}` }, 502);
  }

  if (!anthropicResponse.ok) {
    const errorText = await anthropicResponse.text();
    return c.json(
      {
        error: "Anthropic API error",
        status: anthropicResponse.status,
        detail: errorText,
      },
      502
    );
  }

  let anthropicData: unknown;
  try {
    anthropicData = await anthropicResponse.json();
  } catch {
    return c.json({ error: "Failed to parse Anthropic API response" }, 502);
  }

  // Extract text content from Anthropic response
  const responseContent = (anthropicData as any)?.content;
  if (!Array.isArray(responseContent) || responseContent.length === 0) {
    return c.json({ error: "Unexpected Anthropic API response structure" }, 502);
  }

  const textBlock = responseContent.find(
    (block: any) => block.type === "text"
  );
  if (!textBlock || typeof textBlock.text !== "string") {
    return c.json({ error: "No text content in Anthropic API response" }, 502);
  }

  // Parse the JSON coaching tip from Claude's response
  let rawTip: unknown;
  try {
    rawTip = JSON.parse(textBlock.text.trim());
  } catch {
    // Claude may have wrapped the JSON in markdown code fences
    const jsonMatch = textBlock.text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        rawTip = JSON.parse(jsonMatch[1].trim());
      } catch {
        return c.json(
          { error: "Claude returned non-JSON response", raw: textBlock.text },
          502
        );
      }
    } else {
      return c.json(
        { error: "Claude returned non-JSON response", raw: textBlock.text },
        502
      );
    }
  }

  const tipParseResult = CoachTipSchema.safeParse(rawTip);
  if (!tipParseResult.success) {
    return c.json(
      {
        error: "Claude response did not match expected schema",
        issues: tipParseResult.error.issues,
        raw: rawTip,
      },
      502
    );
  }

  const tip = tipParseResult.data;

  // If Claude returned a null tip (transcript too short or nothing notable)
  if (tip.tip === null) {
    return c.json({ tip: null });
  }

  return c.json(tip);
});

export { coachRouter };
