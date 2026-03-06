/**
 * Voice Intent Service
 * Classifies user voice requests and extracts relevant context
 */

import { Transaction } from "../state/realtorStore";

export type VoiceIntent =
  | "contract_summary"
  | "upcoming_deadlines"
  | "overdue_deadlines"
  | "next_required_action"
  | "transaction_lookup"
  | "client_message"
  | "general_question";

export interface IntentResult {
  intent: VoiceIntent;
  confidence: number;
  transactionId?: string;
  transactionAddress?: string;
  clientName?: string;
  additionalContext?: string;
}

/**
 * Detect intent from user transcription
 */
export async function detectIntent(
  transcription: string,
  availableTransactions: Transaction[]
): Promise<IntentResult> {
  try {
    const apiKey = process.env.EXPO_PUBLIC_VIBECODE_ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("Claude API key not found");
    }

    // Create transaction context for Claude
    const transactionList = availableTransactions
      .map(
        (t, idx) =>
          `${idx + 1}. ${t.address} (Client: ${t.clientName}, Status: ${t.status})`
      )
      .join("\n");

    const prompt = `You are an intent classification system for a real estate transaction assistant. Analyze the user's request and classify it.

USER REQUEST: "${transcription}"

AVAILABLE TRANSACTIONS:
${transactionList}

INTENT CATEGORIES:
- contract_summary: User wants a summary of a contract or transaction
- upcoming_deadlines: User asks about upcoming deadlines (not overdue)
- overdue_deadlines: User asks about missed/overdue deadlines
- next_required_action: User asks what they need to do next
- transaction_lookup: User wants details about a specific transaction
- client_message: User wants to draft a message to a client
- general_question: General real estate or app-related questions

TASK: Respond with JSON only:
{
  "intent": "the_intent_category",
  "confidence": 0.0-1.0,
  "transactionId": "if mentioned, the transaction ID from the list above",
  "transactionAddress": "if mentioned, the exact address",
  "clientName": "if mentioned, the client name",
  "additionalContext": "any other relevant details"
}

If a transaction is mentioned by address or client name, match it to the list above and include the ID.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content[0];

    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    // Parse JSON response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in Claude response");
    }

    const result: IntentResult = JSON.parse(jsonMatch[0]);

    // If transaction was mentioned, try to find it
    if (result.transactionAddress || result.clientName) {
      const matchedTransaction = availableTransactions.find((t) => {
        const addressMatch =
          result.transactionAddress &&
          t.address.toLowerCase().includes(result.transactionAddress.toLowerCase());
        const clientMatch =
          result.clientName &&
          t.clientName.toLowerCase().includes(result.clientName.toLowerCase());
        return addressMatch || clientMatch;
      });

      if (matchedTransaction) {
        result.transactionId = matchedTransaction.id;
        result.transactionAddress = matchedTransaction.address;
        result.clientName = matchedTransaction.clientName;
      }
    }

    console.log("[Voice Intent] Detected:", result);
    return result;
  } catch (error) {
    console.error("[Voice Intent] Detection failed:", error);

    // Default to general_question on error
    return {
      intent: "general_question",
      confidence: 0.5,
      additionalContext: transcription,
    };
  }
}

/**
 * Get a user-friendly description of the detected intent
 */
export function getIntentDescription(intent: VoiceIntent): string {
  const descriptions: Record<VoiceIntent, string> = {
    contract_summary: "Getting contract summary",
    upcoming_deadlines: "Checking upcoming deadlines",
    overdue_deadlines: "Checking overdue deadlines",
    next_required_action: "Finding next action required",
    transaction_lookup: "Looking up transaction details",
    client_message: "Drafting client message",
    general_question: "Processing question",
  };

  return descriptions[intent];
}
