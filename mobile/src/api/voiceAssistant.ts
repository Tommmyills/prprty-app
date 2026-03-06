/**
 * Voice Assistant API
 * Conversational AI responses using Claude with transaction context
 */

import { Transaction, Deadline } from "../state/realtorStore";
import { VoiceIntent } from "./voiceIntentService";

export interface VoiceAssistantResponse {
  text: string;
  shouldSpeak: boolean;
  suggestedActions: string[];
}

/**
 * Calculate days remaining until a deadline
 */
function calculateDaysRemaining(deadlineDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadline = new Date(deadlineDate);
  deadline.setHours(0, 0, 0, 0);

  const diffTime = deadline.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Format transaction context for Claude
 */
function formatTransactionContext(
  transaction: Transaction | undefined,
  allTransactions: Transaction[]
): string {
  if (!transaction) {
    // Provide overview of all transactions
    return allTransactions
      .map((t) => {
        const overdueCount = t.deadlines.filter((d) => d.status === "overdue").length;
        const upcomingCount = t.deadlines.filter(
          (d) => d.status === "upcoming" || d.status === "current"
        ).length;

        return `- ${t.address} (${t.clientName}): ${overdueCount} overdue, ${upcomingCount} upcoming deadlines`;
      })
      .join("\n");
  }

  // Format specific transaction details
  const deadlinesList = transaction.deadlines
    .map((d) => {
      const daysRemaining = calculateDaysRemaining(d.date);
      const urgency =
        d.status === "overdue"
          ? "OVERDUE"
          : daysRemaining <= 3
          ? `${daysRemaining} days remaining`
          : d.date;

      return `  • ${d.label} - ${urgency} (${d.type})`;
    })
    .join("\n");

  return `
TRANSACTION: ${transaction.address}
CLIENT: ${transaction.clientName}
PRICE: $${transaction.price.toLocaleString()}
STATUS: ${transaction.status}
CONTRACT DATE: ${transaction.contractDate}

SUMMARY:
${transaction.summary || "No summary available"}

NEXT ACTION REQUIRED:
${transaction.nextRequiredAction || "No action specified"}

DEADLINES:
${deadlinesList}
`;
}

/**
 * Get AI response for voice query
 */
export async function getVoiceAssistantResponse(
  transcription: string,
  intent: VoiceIntent,
  transaction: Transaction | undefined,
  allTransactions: Transaction[]
): Promise<VoiceAssistantResponse> {
  try {
    const apiKey = process.env.EXPO_PUBLIC_VIBECODE_ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("Claude API key not found");
    }

    const transactionContext = formatTransactionContext(transaction, allTransactions);

    const systemPrompt = `You are a helpful real estate transaction assistant. Provide conversational, natural responses to user queries about their transactions and deadlines.

CONTEXT:
${transactionContext}

GUIDELINES:
- Be concise and conversational (2-3 sentences max for voice responses)
- Use natural language, not robotic
- For deadlines, mention the most urgent ones first
- If asked about overdue items, be direct but helpful
- For client messages, draft professional but friendly text
- Suggest relevant next actions when appropriate

Respond with JSON only:
{
  "text": "your conversational response here",
  "shouldSpeak": true/false (true for quick answers, false for long drafts),
  "suggestedActions": ["action 1", "action 2"] (relevant follow-up actions)
}`;

    const userMessage = `USER QUERY (Intent: ${intent}): "${transcription}"`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userMessage,
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

    const result: VoiceAssistantResponse = JSON.parse(jsonMatch[0]);

    console.log("[Voice Assistant] Response generated");
    return result;
  } catch (error) {
    console.error("[Voice Assistant] Failed to generate response:", error);

    // Return fallback response
    return {
      text: "I'm sorry, I'm having trouble processing your request right now. Please try again.",
      shouldSpeak: true,
      suggestedActions: ["Try again", "Check connection"],
    };
  }
}

/**
 * Handle specific error scenarios with helpful messages
 */
export function getErrorResponse(errorType: string): VoiceAssistantResponse {
  const responses: Record<string, VoiceAssistantResponse> = {
    no_speech: {
      text: "I didn't catch that. Could you please try again?",
      shouldSpeak: true,
      suggestedActions: ["Try recording again"],
    },
    unclear_intent: {
      text: "I'm not sure I understood. Could you rephrase your question?",
      shouldSpeak: true,
      suggestedActions: ["Try asking differently"],
    },
    no_transaction: {
      text: "I couldn't find that transaction. Which property are you asking about?",
      shouldSpeak: true,
      suggestedActions: ["List all transactions"],
    },
    api_error: {
      text: "I'm experiencing technical difficulties. Please try again in a moment.",
      shouldSpeak: true,
      suggestedActions: ["Retry", "Check logs"],
    },
  };

  return (
    responses[errorType] || {
      text: "Something went wrong. Please try again.",
      shouldSpeak: true,
      suggestedActions: ["Retry"],
    }
  );
}
