/**
 * Multi-AI Assistant Service
 * Supports Claude, OpenAI (ChatGPT), and Gemini
 */

import { getOpenAIClient } from "../api/openai";
import { getGeminiTextResponse } from "../api/gemini";

export type AIProvider = "claude" | "openai" | "gemini";

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  provider?: AIProvider;
}

const SYSTEM_PROMPT = `You are a helpful AI assistant. You are friendly, conversational, and knowledgeable.

Keep your responses concise but helpful - this is a mobile app.
Be natural and conversational, not robotic.
If you don't know something, say so honestly.
IMPORTANT: Do not use markdown formatting like asterisks, bold, or italic. Just use plain text.`;

/**
 * Strip markdown formatting (asterisks, bold, italic) from text
 */
function stripMarkdown(text: string): string {
  return text
    // Remove bold **text** or __text__
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    // Remove italic *text* or _text_
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    // Remove any remaining standalone asterisks
    .replace(/\*/g, "")
    // Clean up any double spaces
    .replace(/  +/g, " ")
    .trim();
}

/**
 * Send message to Claude
 */
async function sendToClaude(
  userMessage: string,
  conversationHistory: AssistantMessage[]
): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_VIBECODE_ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error("Claude API key not configured");
  }

  const messages = conversationHistory.slice(-10).map((msg) => ({
    role: msg.role as "user" | "assistant",
    content: msg.content,
  }));

  messages.push({ role: "user", content: userMessage });

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: messages,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Claude API request failed");
  }

  const data = await response.json();
  return data.content?.[0]?.text || "I didn't catch that. Could you try again?";
}

/**
 * Send message to OpenAI (ChatGPT)
 */
async function sendToOpenAI(
  userMessage: string,
  conversationHistory: AssistantMessage[]
): Promise<string> {
  const client = getOpenAIClient();

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  conversationHistory.slice(-10).forEach((msg) => {
    messages.push({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    });
  });

  messages.push({ role: "user", content: userMessage });

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: messages,
    max_tokens: 1024,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content || "I didn't catch that. Could you try again?";
}

/**
 * Send message to Gemini
 */
async function sendToGemini(
  userMessage: string,
  conversationHistory: AssistantMessage[]
): Promise<string> {
  const messages = conversationHistory.slice(-10).map((msg) => ({
    role: msg.role as "user" | "assistant",
    content: msg.content,
  }));

  // Add system context as first user message for Gemini
  if (messages.length === 0 || messages[0].content !== SYSTEM_PROMPT) {
    messages.unshift({ role: "user", content: SYSTEM_PROMPT });
    messages.splice(1, 0, { role: "assistant", content: "Understood! I'm ready to help." });
  }

  messages.push({ role: "user", content: userMessage });

  const response = await getGeminiTextResponse(messages);
  return response.content || "I didn't catch that. Could you try again?";
}

/**
 * Send a message to the selected AI provider
 */
export async function sendToAI(
  userMessage: string,
  conversationHistory: AssistantMessage[],
  provider: AIProvider = "claude"
): Promise<AssistantMessage> {
  console.log(`[MultiAI] Sending to ${provider}:`, userMessage.substring(0, 50));

  try {
    let responseContent: string;

    switch (provider) {
      case "claude":
        responseContent = await sendToClaude(userMessage, conversationHistory);
        break;
      case "openai":
        responseContent = await sendToOpenAI(userMessage, conversationHistory);
        break;
      case "gemini":
        responseContent = await sendToGemini(userMessage, conversationHistory);
        break;
      default:
        responseContent = await sendToClaude(userMessage, conversationHistory);
    }

    // Strip any markdown formatting (asterisks, bold, etc.)
    responseContent = stripMarkdown(responseContent);

    console.log(`[MultiAI] Response from ${provider} received`);

    return {
      id: Date.now().toString(),
      role: "assistant",
      content: responseContent,
      timestamp: new Date(),
      provider: provider,
    };
  } catch (error) {
    console.error(`[MultiAI] Error with ${provider}:`, error);
    return {
      id: Date.now().toString(),
      role: "assistant",
      content: `Sorry, I had trouble connecting to ${provider}. Please try again.`,
      timestamp: new Date(),
      provider: provider,
    };
  }
}

/**
 * Get display name for provider
 */
export function getProviderDisplayName(provider: AIProvider): string {
  switch (provider) {
    case "claude":
      return "Claude";
    case "openai":
      return "ChatGPT";
    case "gemini":
      return "Gemini";
    default:
      return "AI";
  }
}

/**
 * Get color for provider
 */
export function getProviderColor(provider: AIProvider): string {
  switch (provider) {
    case "claude":
      return "#D97706"; // Orange/amber for Claude
    case "openai":
      return "#10B981"; // Green for OpenAI
    case "gemini":
      return "#3B82F6"; // Blue for Gemini
    default:
      return "#8B5CF6";
  }
}
