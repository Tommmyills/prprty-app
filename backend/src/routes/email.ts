import { Hono } from "hono";
import { z } from "zod";

const emailRouter = new Hono();

const EMAIL_TYPES = [
  "inspection_scheduling",
  "appraisal_request",
  "lender_followup",
  "client_update",
  "offer_response",
  "closing_reminder",
] as const;

const TONE_OPTIONS = ["professional", "friendly", "urgent"] as const;

// Request body schema
const EmailGenerateRequestSchema = z.object({
  emailType: z.enum(EMAIL_TYPES),
  tone: z.enum(TONE_OPTIONS),
  context: z.object({
    clientName: z.string().min(1, "clientName is required"),
    propertyAddress: z.string().min(1, "propertyAddress is required"),
    realtorName: z.string().min(1, "realtorName is required"),
    details: z.string().optional(),
  }),
});

// Response schema
const EmailResponseSchema = z.object({
  subject: z.string(),
  body: z.string(),
});

export type EmailGenerateRequest = z.infer<typeof EmailGenerateRequestSchema>;
export type EmailResponse = z.infer<typeof EmailResponseSchema>;

const EMAIL_TYPE_LABELS: Record<(typeof EMAIL_TYPES)[number], string> = {
  inspection_scheduling: "property inspection scheduling",
  appraisal_request: "appraisal request",
  lender_followup: "lender follow-up",
  client_update: "client status update",
  offer_response: "offer response",
  closing_reminder: "closing reminder",
};

const TONE_INSTRUCTIONS: Record<(typeof TONE_OPTIONS)[number], string> = {
  professional:
    "Use a formal, professional tone. Keep language precise and business-appropriate.",
  friendly:
    "Use a warm, approachable tone. Be personable while remaining professional.",
  urgent:
    "Use a direct, time-sensitive tone. Convey urgency clearly without being alarmist.",
};

function buildSystemPrompt(): string {
  return `You are an expert real estate agent assistant specializing in writing clear, effective emails.
Generate real estate emails that are concise, action-oriented, and appropriate for the situation.
Always respond ONLY with valid JSON in this exact format: {"subject": "...", "body": "..."}
- "subject": a concise, relevant email subject line
- "body": the full email body including greeting and sign-off, using plain text with line breaks (\\n)
Do not include markdown, code fences, or any text outside the JSON object.`;
}

function buildUserPrompt(data: EmailGenerateRequest): string {
  const { emailType, tone, context } = data;
  const typeLabel = EMAIL_TYPE_LABELS[emailType];
  const toneInstruction = TONE_INSTRUCTIONS[tone];

  let prompt = `Write a real estate email for the following situation:

Email type: ${typeLabel}
Tone: ${tone} - ${toneInstruction}
Client name: ${context.clientName}
Property address: ${context.propertyAddress}
Realtor name: ${context.realtorName}`;

  if (context.details) {
    prompt += `\nAdditional details: ${context.details}`;
  }

  prompt += `\n\nGenerate the subject line and email body. Sign the email from ${context.realtorName}.`;

  return prompt;
}

// POST /api/email/generate
emailRouter.post("/generate", async (c) => {
  // Parse and validate request body
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parseResult = EmailGenerateRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json(
      {
        error: "Validation failed",
        issues: parseResult.error.issues,
      },
      400
    );
  }

  const requestData = parseResult.data;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return c.json({ error: "ANTHROPIC_API_KEY is not configured" }, 500);
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
        max_tokens: 1000,
        stream: false,
        system: buildSystemPrompt(),
        messages: [
          {
            role: "user",
            content: buildUserPrompt(requestData),
          },
        ],
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

  // Parse the JSON email from Claude's response
  let rawEmail: unknown;
  const rawText: string = textBlock.text.trim();

  try {
    rawEmail = JSON.parse(rawText);
  } catch {
    // Try to strip markdown code fences if present
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        rawEmail = JSON.parse((jsonMatch[1] ?? "").trim());
      } catch {
        return c.json(
          { error: "Claude returned non-JSON response", raw: rawText },
          502
        );
      }
    } else {
      return c.json(
        { error: "Claude returned non-JSON response", raw: rawText },
        502
      );
    }
  }

  const emailParseResult = EmailResponseSchema.safeParse(rawEmail);
  if (!emailParseResult.success) {
    return c.json(
      {
        error: "Claude response did not match expected schema",
        issues: emailParseResult.error.issues,
        raw: rawEmail,
      },
      502
    );
  }

  return c.json(emailParseResult.data);
});

export { emailRouter };
