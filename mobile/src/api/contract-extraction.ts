/**
 * AI-Powered Contract Extraction Service
 * Uses Claude API with native PDF support to extract real estate deadlines
 */

import * as FileSystem from "expo-file-system";
import { Deadline } from "../state/realtorStore";

export interface ExtractedContractData {
  deadlines: Deadline[];
  summary: string;
  nextRequiredAction: string;
  hasOverdue: boolean;
  propertyAddress?: string;
  clientName?: string;
  purchasePrice?: number;
  contractDate?: string;
}

/**
 * Extract text and deadlines from a contract using Claude API
 * Supports both PDFs (native) and images
 */
export async function extractContractDeadlines(
  fileUri: string,
  fileName: string
): Promise<ExtractedContractData> {
  try {
    // Get API key from environment
    const apiKey = process.env.EXPO_PUBLIC_VIBECODE_ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("Claude API key not configured. Please add it in the ENV tab.");
    }

    // Read file as base64
    const base64Data = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Determine MIME type
    const lowerFileName = fileName.toLowerCase();
    let mimeType = "image/jpeg"; // default for images

    if (lowerFileName.endsWith(".pdf")) {
      mimeType = "application/pdf";
    } else if (lowerFileName.endsWith(".png")) {
      mimeType = "image/png";
    } else if (lowerFileName.endsWith(".gif")) {
      mimeType = "image/gif";
    } else if (lowerFileName.endsWith(".webp")) {
      mimeType = "image/webp";
    }

    const isPdf = mimeType === "application/pdf";

    // Prepare the prompt for extraction
    const prompt = `You are an expert real estate transaction coordinator. Analyze this contract document and extract ALL critical deadlines with extreme precision.

EXTRACT THE FOLLOWING:

1. **ALL DEADLINES** - Find every single date mentioned:
   - Earnest money deposit due date
   - Inspection period end date
   - Due diligence period end
   - Appraisal deadline
   - Loan/financing commitment date
   - Closing/settlement date
   - Repair request deadline
   - Repair completion deadline
   - HOA document review deadline
   - Title commitment deadline
   - Survey deadline
   - Contingency removal dates
   - Seller disclosure deadlines
   - Seller response deadlines
   - Possession date
   - Final walkthrough date
   - Any other date-specific obligations

2. **Property Details:**
   - Full property address
   - Buyer name(s)
   - Seller name(s)
   - Purchase price
   - Contract execution/signing date

3. **Key Contract Terms:**
   - Earnest money amount
   - Down payment amount
   - Loan type and terms
   - Special conditions or contingencies

Return your response as a JSON object with this EXACT structure:
{
  "propertyAddress": "full property address or null",
  "clientName": "buyer name(s) or null",
  "purchasePrice": number or null,
  "contractDate": "YYYY-MM-DD or null",
  "deadlines": [
    {
      "label": "descriptive label (e.g., 'Earnest Money Due')",
      "date": "MM/DD/YYYY",
      "type": "inspection" | "appraisal" | "loan" | "closing" | "other"
    }
  ],
  "summary": "A comprehensive 2-3 sentence summary of the contract including purchase price, key terms, and most critical deadlines",
  "nextRequiredAction": "The single most urgent action needed right now with specific deadline"
}

CRITICAL INSTRUCTIONS:
- Extract EVERY date you find - missing one could cost thousands
- Use MM/DD/YYYY format for all dates
- If a deadline says "within X days of contract" calculate the actual date
- Classify each deadline type accurately
- For the summary, include the purchase price and most important terms
- For nextRequiredAction, identify what needs attention FIRST
- If information is not found, use null

Respond ONLY with the JSON object, no other text.`;

    // Build the content array based on file type
    const contentArray: any[] = [];

    if (isPdf) {
      // Use Claude's native PDF support with document type
      contentArray.push({
        type: "document",
        source: {
          type: "base64",
          media_type: mimeType,
          data: base64Data,
        },
      });
    } else {
      // Use image type for images
      contentArray.push({
        type: "image",
        source: {
          type: "base64",
          media_type: mimeType,
          data: base64Data,
        },
      });
    }

    contentArray.push({
      type: "text",
      text: prompt,
    });

    // Call Claude API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        messages: [
          {
            role: "user",
            content: contentArray,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Claude API Error:", errorData);
      throw new Error(errorData.error?.message || `Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || "{}";

    // Parse the JSON response
    let parsed;
    try {
      // Extract JSON from response (in case Claude added extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch (parseError) {
      console.error("Failed to parse Claude response:", content);
      throw new Error("Failed to parse AI response");
    }

    // Transform the response into our format
    const deadlines: Deadline[] = (parsed.deadlines || []).map(
      (d: any, index: number) => {
        const deadlineDate = parseDate(d.date);
        const status = determineDeadlineStatus(deadlineDate);

        return {
          id: `deadline-${Date.now()}-${index}`,
          label: d.label || "Unknown Deadline",
          date: d.date || "TBD",
          status,
          type: d.type || "other",
        };
      }
    );

    // Sort deadlines chronologically
    deadlines.sort((a, b) => {
      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);
      return dateA.getTime() - dateB.getTime();
    });

    // Check if any deadlines are overdue
    const hasOverdue = deadlines.some((d) => d.status === "overdue");

    return {
      deadlines,
      summary: parsed.summary || "Contract uploaded successfully.",
      nextRequiredAction:
        parsed.nextRequiredAction ||
        deadlines.find((d) => d.status === "current" || d.status === "upcoming")
          ?.label ||
        "Review contract details",
      hasOverdue,
      propertyAddress: parsed.propertyAddress || undefined,
      clientName: parsed.clientName || undefined,
      purchasePrice: parsed.purchasePrice || undefined,
      contractDate: parsed.contractDate || undefined,
    };
  } catch (error) {
    console.error("Contract extraction error:", error);
    throw error;
  }
}

/**
 * Parse a date string in MM/DD/YYYY format
 */
function parseDate(dateString: string): Date {
  // Handle MM/DD/YYYY format
  const match = dateString.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const [, month, day, year] = match;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  // Fallback to native Date parsing
  const parsed = new Date(dateString);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Determine deadline status based on date
 */
function determineDeadlineStatus(
  date: Date
): "completed" | "current" | "upcoming" | "overdue" {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  const daysUntil = Math.floor(
    (targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntil < 0) {
    return "overdue";
  } else if (daysUntil === 0 || daysUntil === 1) {
    return "current";
  } else if (daysUntil <= 7) {
    return "current";
  } else {
    return "upcoming";
  }
}

/**
 * Calculate days remaining until a deadline
 */
export function calculateDaysRemaining(dateString: string): number {
  const targetDate = parseDate(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate()
  );

  return Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Check if a deadline is overdue
 */
export function isDeadlineOverdue(dateString: string): boolean {
  return calculateDaysRemaining(dateString) < 0;
}

/**
 * Get the next upcoming deadline from a list
 */
export function getNextDeadline(deadlines: Deadline[]): Deadline | null {
  const upcoming = deadlines
    .filter((d) => d.status === "current" || d.status === "upcoming")
    .sort((a, b) => {
      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);
      return dateA.getTime() - dateB.getTime();
    });

  return upcoming[0] || null;
}
