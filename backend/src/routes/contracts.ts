import { Hono } from "hono";
import { z } from "zod";

const contractsRouter = new Hono();

// Request body schema
const ExtractRequestSchema = z.object({
  fileBase64: z.string().min(1, "fileBase64 is required"),
  fileName: z.string().min(1, "fileName is required"),
});

// Deadline item schema
const DeadlineSchema = z.object({
  label: z.string(),
  date: z.string(),
  type: z.enum([
    "inspection",
    "appraisal",
    "loan",
    "closing",
    "earnest_money",
    "other",
  ]),
  notes: z.string(),
});

// Full extraction result schema
const ExtractionResultSchema = z.object({
  propertyAddress: z.string(),
  clientName: z.string(),
  purchasePrice: z.number().nullable(),
  deadlines: z.array(DeadlineSchema),
  summary: z.string(),
  nextRequiredAction: z.string(),
});

export type ExtractRequest = z.infer<typeof ExtractRequestSchema>;
export type Deadline = z.infer<typeof DeadlineSchema>;
export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

const EXTRACTION_PROMPT = `Extract all key dates and deadlines from this real estate contract. Return JSON only with this structure:
{
  "propertyAddress": string,
  "clientName": string,
  "purchasePrice": number | null,
  "deadlines": [
    {
      "label": string,
      "date": string,
      "type": "inspection" | "appraisal" | "loan" | "closing" | "earnest_money" | "other",
      "notes": string
    }
  ],
  "summary": string (2-3 sentences describing the contract),
  "nextRequiredAction": string (the single most urgent next action required)
}
Return ONLY the JSON object with no additional text or markdown formatting.`;

// POST /api/contracts/extract
contractsRouter.post("/extract", async (c) => {
  // Parse and validate request body
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parseResult = ExtractRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json(
      {
        error: "Validation failed",
        issues: parseResult.error.issues,
      },
      400
    );
  }

  const { fileBase64 } = parseResult.data;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return c.json({ error: "ANTHROPIC_API_KEY is not configured" }, 500);
  }

  // Call Anthropic API with document support
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
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: fileBase64,
                },
              },
              {
                type: "text",
                text: EXTRACTION_PROMPT,
              },
            ],
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

  // Parse the JSON extraction result from Claude's response
  let rawResult: unknown;
  const rawText: string = textBlock.text.trim();

  try {
    rawResult = JSON.parse(rawText);
  } catch {
    // Try to strip markdown code fences if present
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        rawResult = JSON.parse((jsonMatch[1] ?? "").trim());
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

  const resultParseResult = ExtractionResultSchema.safeParse(rawResult);
  if (!resultParseResult.success) {
    return c.json(
      {
        error: "Claude response did not match expected schema",
        issues: resultParseResult.error.issues,
        raw: rawResult,
      },
      502
    );
  }

  return c.json(resultParseResult.data);
});

export { contractsRouter };
