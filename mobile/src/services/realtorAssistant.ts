/**
 * Realtor AI Assistant Service
 * A veteran realtor mentor who is calm, precise, and helpful
 */

import { speakText, stopSpeaking } from "./audioService";

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  type?: "guidance" | "warning" | "deadline" | "reassurance" | "general";
}

export interface ConversationContext {
  transactionAddress?: string;
  clientName?: string;
  currentDeadlines?: string[];
  todayDate: string;
}

const SYSTEM_PROMPT = `You are a senior real estate mentor with 25+ years of experience helping realtors succeed. You work inside the ClosingRoom app, a premium transaction management tool.

=== YOUR PERSONALITY ===
- Calm, professional, reassuring
- Patient and understanding
- Speaks clearly to non-experts
- Never condescending, always supportive
- Like a trusted mentor who has seen it all

=== YOUR EXPERTISE ===
- Contract timelines and deadlines
- Client communication strategies
- Negotiation tactics
- Transaction coordination
- Problem-solving when deals get complicated
- Keeping realtors calm under pressure

=== HOW YOU COMMUNICATE ===
1. Keep responses concise but complete
2. Use simple language, avoid jargon
3. When explaining processes, break into clear steps
4. Acknowledge the realtor's stress when appropriate
5. Always end with actionable next steps or reassurance

=== MESSAGE TYPES (use these prefixes internally) ===
- [GUIDANCE] - When providing how-to advice or process explanation
- [WARNING] - When alerting about potential issues or risks
- [DEADLINE] - When discussing time-sensitive matters
- [REASSURANCE] - When calming concerns or confirming things are okay

=== IMPORTANT RULES ===
1. NEVER give legal advice - always recommend consulting an attorney for legal questions
2. DO explain processes, timelines, and best practices
3. DO help draft communications (emails, texts to clients)
4. DO provide reassurance when appropriate
5. DO prioritize urgent matters
6. Keep responses SHORT - this is a mobile app, not an essay

=== CONVERSATION STYLE ===
Start conversations naturally. If the user just says "hi" or opens the chat, greet them warmly and ask how you can help. Be conversational, not robotic.

Example opening: "Hey there! What's going on with your transaction today?"

Remember: You're their trusted mentor, not a corporate chatbot.`;

/**
 * Detect message type from content
 */
function detectMessageType(content: string): AssistantMessage["type"] {
  const lowerContent = content.toLowerCase();

  if (content.includes("[DEADLINE]") || lowerContent.includes("deadline") || lowerContent.includes("expires") || lowerContent.includes("due today") || lowerContent.includes("overdue")) {
    return "deadline";
  }
  if (content.includes("[WARNING]") || lowerContent.includes("warning") || lowerContent.includes("careful") || lowerContent.includes("risk") || lowerContent.includes("issue")) {
    return "warning";
  }
  if (content.includes("[REASSURANCE]") || lowerContent.includes("don't worry") || lowerContent.includes("you're doing great") || lowerContent.includes("normal") || lowerContent.includes("common")) {
    return "reassurance";
  }
  if (content.includes("[GUIDANCE]") || lowerContent.includes("here's how") || lowerContent.includes("step") || lowerContent.includes("recommend") || lowerContent.includes("suggest")) {
    return "guidance";
  }
  return "general";
}

/**
 * Clean message content (remove type prefixes)
 */
function cleanMessageContent(content: string): string {
  return content
    .replace(/\[GUIDANCE\]/g, "")
    .replace(/\[WARNING\]/g, "")
    .replace(/\[DEADLINE\]/g, "")
    .replace(/\[REASSURANCE\]/g, "")
    .trim();
}

/**
 * Send a message to the assistant and get a response
 */
export async function sendToAssistant(
  userMessage: string,
  conversationHistory: AssistantMessage[],
  context?: ConversationContext
): Promise<AssistantMessage> {
  const apiKey = process.env.EXPO_PUBLIC_VIBECODE_ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error("[RealtorAssistant] No API key configured");
    return {
      id: Date.now().toString(),
      role: "assistant",
      content: "I'm having trouble connecting right now. Please try again in a moment.",
      timestamp: new Date(),
      type: "general",
    };
  }

  // Build context string
  let contextString = `\n\nCURRENT CONTEXT:\n- Today: ${context?.todayDate || new Date().toLocaleDateString()}`;
  if (context?.transactionAddress) {
    contextString += `\n- Active Transaction: ${context.transactionAddress}`;
  }
  if (context?.clientName) {
    contextString += `\n- Client: ${context.clientName}`;
  }
  if (context?.currentDeadlines && context.currentDeadlines.length > 0) {
    contextString += `\n- Upcoming Deadlines: ${context.currentDeadlines.join(", ")}`;
  }

  // Build messages array
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

  // Add recent conversation history (last 10 messages)
  const recentHistory = conversationHistory.slice(-10);
  recentHistory.forEach((msg) => {
    messages.push({
      role: msg.role,
      content: msg.content,
    });
  });

  // Add current user message
  messages.push({
    role: "user",
    content: userMessage,
  });

  console.log("[RealtorAssistant] Sending message:", userMessage.substring(0, 50));

  try {
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
        system: SYSTEM_PROMPT + contextString,
        messages: messages,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("[RealtorAssistant] API Error:", errorData);
      throw new Error(errorData.error?.message || "Failed to get response");
    }

    const data = await response.json();
    const rawContent = data.content?.[0]?.text || "I didn't quite catch that. Could you try again?";

    const messageType = detectMessageType(rawContent);
    const cleanContent = cleanMessageContent(rawContent);

    console.log("[RealtorAssistant] Response received, type:", messageType);

    return {
      id: Date.now().toString(),
      role: "assistant",
      content: cleanContent,
      timestamp: new Date(),
      type: messageType,
    };
  } catch (error) {
    console.error("[RealtorAssistant] Error:", error);
    return {
      id: Date.now().toString(),
      role: "assistant",
      content: "Sorry, I had trouble processing that. Let's try again - what do you need help with?",
      timestamp: new Date(),
      type: "general",
    };
  }
}

/**
 * Speak the assistant's message
 */
export async function speakAssistantMessage(message: string): Promise<void> {
  console.log("[RealtorAssistant] Speaking message");
  await speakText(message);
}

/**
 * Stop the assistant from speaking
 */
export async function stopAssistantSpeech(): Promise<void> {
  console.log("[RealtorAssistant] Stopping speech");
  await stopSpeaking();
}

/**
 * Get a random greeting for when the assistant panel opens
 */
export function getAssistantGreeting(): string {
  const hour = new Date().getHours();
  let timeGreeting = "Hey there!";

  if (hour < 12) {
    timeGreeting = "Good morning!";
  } else if (hour < 17) {
    timeGreeting = "Good afternoon!";
  } else {
    timeGreeting = "Good evening!";
  }

  const greetings = [
    `${timeGreeting} What's going on with your transaction today?`,
    `${timeGreeting} How can I help you out?`,
    `${timeGreeting} What do you need help with?`,
    `${timeGreeting} Ready to tackle something together?`,
    `${timeGreeting} What's on your mind?`,
  ];

  return greetings[Math.floor(Math.random() * greetings.length)];
}
