/**
 * AI Assistant Service for ClosingRoom
 * Assistant - Your dedicated real estate AI companion
 */

import { Transaction, Deadline } from "../state/realtorStore";
import { speakText, stopSpeaking } from "../services/audioService";

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface TransactionContext {
  transaction: Transaction | null;
  allTransactions: Transaction[];
  todayDate: string;
}

/**
 * Assistant's greeting messages - varied openers
 */
export const ASSISTANT_GREETINGS = [
  "Hello, how may I assist you with your transactions today?",
  "Good to see you. What can I help you with?",
  "At your service. Let's make sure your deals stay on track.",
  "Welcome back. I'm here to help you navigate your transactions.",
  "Ready to help. What's on your mind?",
  "Hello there. How can I support your success today?",
  "At your disposal. What would you like to tackle first?",
  "Standing by to assist. What do you need?",
  "Present and ready. How may I be of service?",
  "Good day. Let's keep your transactions moving smoothly.",
];

/**
 * Get time-based greeting prefix
 */
function getTimeBasedPrefix(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Get a random greeting with time awareness
 */
export function getRandomGreeting(): string {
  // 50% chance to use time-based greeting
  if (Math.random() > 0.5) {
    const timeGreeting = getTimeBasedPrefix();
    const suffixes = [
      ". How may I assist you?",
      ". What can I help you with today?",
      ". Ready to help with your transactions.",
      ". Let's make today productive.",
      ". What would you like to work on?",
    ];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    return timeGreeting + suffix;
  }

  const index = Math.floor(Math.random() * ASSISTANT_GREETINGS.length);
  return ASSISTANT_GREETINGS[index];
}

/**
 * Speak Assistant's greeting
 */
export async function speakGreeting(): Promise<void> {
  const greeting = getRandomGreeting();
  await speakText(greeting);
}

/**
 * Stop Assistant from speaking
 */
export async function stopAssistantSpeaking(): Promise<void> {
  await stopSpeaking();
}

/**
 * Calculate days remaining until a deadline
 */
export function calculateDaysRemaining(dateString: string): number {
  const match = dateString.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return 0;

  const [, month, day, year] = match;
  const targetDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);

  return Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Check if a deadline is overdue
 */
export function isDeadlineOverdue(dateString: string): boolean {
  return calculateDaysRemaining(dateString) < 0;
}

/**
 * Get deadlines sorted chronologically
 */
export function getSortedDeadlines(deadlines: Deadline[]): Deadline[] {
  return [...deadlines].sort((a, b) => {
    const daysA = calculateDaysRemaining(a.date);
    const daysB = calculateDaysRemaining(b.date);
    return daysA - daysB;
  });
}

/**
 * Get upcoming deadlines (not overdue, not completed)
 */
export function getUpcomingDeadlines(deadlines: Deadline[]): Deadline[] {
  return getSortedDeadlines(deadlines).filter(
    d => d.status !== "completed" && d.status !== "overdue"
  );
}

/**
 * Get overdue deadlines
 */
export function getOverdueDeadlines(deadlines: Deadline[]): Deadline[] {
  return deadlines.filter(d => d.status === "overdue");
}

/**
 * Format transaction data for AI context
 */
function formatTransactionContext(context: TransactionContext): string {
  const { transaction, allTransactions, todayDate } = context;

  let contextStr = `TODAY'S DATE: ${todayDate}\n\n`;

  if (transaction) {
    contextStr += `ACTIVE TRANSACTION:\n`;
    contextStr += `- Property: ${transaction.address}\n`;
    contextStr += `- Client: ${transaction.clientName}\n`;
    contextStr += `- Price: $${transaction.price?.toLocaleString() || "Not specified"}\n`;
    contextStr += `- Contract Date: ${transaction.contractDate || "Not specified"}\n`;
    contextStr += `- Status: ${transaction.status}\n`;

    if (transaction.summary) {
      contextStr += `- Summary: ${transaction.summary}\n`;
    }

    if (transaction.nextRequiredAction) {
      contextStr += `- Next Required Action: ${transaction.nextRequiredAction}\n`;
    }

    contextStr += `- Has Overdue Items: ${transaction.hasOverdue ? "YES" : "No"}\n\n`;

    contextStr += `DEADLINES:\n`;
    const sortedDeadlines = getSortedDeadlines(transaction.deadlines);
    sortedDeadlines.forEach(d => {
      const daysRemaining = calculateDaysRemaining(d.date);
      const daysText = daysRemaining < 0
        ? `${Math.abs(daysRemaining)} days OVERDUE`
        : daysRemaining === 0
          ? "TODAY"
          : `${daysRemaining} days remaining`;
      contextStr += `  - ${d.label}: ${d.date} (${daysText}) [${d.status}]\n`;
    });
  }

  if (allTransactions.length > 1) {
    contextStr += `\nOTHER ACTIVE TRANSACTIONS: ${allTransactions.length - 1}\n`;
    allTransactions
      .filter(t => t.id !== transaction?.id)
      .forEach(t => {
        const overdueCount = t.deadlines.filter(d => d.status === "overdue").length;
        contextStr += `  - ${t.address} (${t.clientName})${overdueCount > 0 ? ` - ${overdueCount} OVERDUE` : ""}\n`;
      });
  }

  return contextStr;
}

/**
 * Send a message to the AI Assistant
 */
export async function sendAssistantMessage(
  userMessage: string,
  context: TransactionContext,
  conversationHistory: AssistantMessage[]
): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_VIBECODE_ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Claude API key not configured");
  }

  const systemPrompt = `You are Assistant, a dedicated AI assistant for the ClosingRoom real estate app. You are here to GET THINGS DONE for the realtor. When they say "my assistant will handle it" - you handle it.

=== YOUR IDENTITY ===
Name: Assistant
Voice: British, refined, professional
Demeanor: Proactive, efficient, action-oriented
Goal: Complete tasks for the user, not just provide information

=== YOUR PRIMARY JOB ===
You are a TASK EXECUTOR. Your job is to:
1. Greet the user briefly
2. Ask what they need help with OR identify urgent tasks
3. TAKE ACTION - do not just explain, actually do the work
4. Confirm when tasks are complete

=== ACTIONS YOU CAN PERFORM ===

1. PULL UP DOCUMENTS & INFO
   When user asks for a document, contract info, deadline, or any data:
   - Immediately provide the specific information they requested
   - Format it clearly so they can use it right away
   - Include: [SHOW_DOCUMENT:type=contract/deadline/summary]

2. SEND EMAILS
   When user asks to email someone:
   - Draft the complete email immediately
   - Include: [EMAIL_ACTION:to=recipient@email.com,subject=Subject Line]
   - This opens their email app with the draft ready

3. CHECK DEADLINES
   When user asks about deadlines or what needs attention:
   - List specific dates and days remaining
   - Highlight anything URGENT (within 3 days) or OVERDUE
   - Recommend immediate next steps

4. DRAFT MESSAGES
   When user needs to communicate with clients/vendors:
   - Write the full message immediately
   - Make it professional and ready to send
   - Offer to open email if they want to send it

5. SUMMARIZE TRANSACTIONS
   When user asks for status or summary:
   - Give bullet-point summary of key facts
   - Current status, next deadline, any issues
   - What action is needed right now

6. NAVIGATE THE APP
   When user wants to go somewhere or see something:
   - Tell them exactly where to find it
   - Include: [NAVIGATE:screen=ScreenName] to help guide them

=== HOW YOU WORK ===

After greeting, get straight to business:
- "What do you need me to handle?"
- "I see you have [X] coming up - want me to prepare for that?"
- "Your inspection deadline is in 2 days - should I draft a reminder to the inspector?"

When given a task:
- Do NOT ask unnecessary questions
- Do NOT over-explain
- Just DO the task and confirm completion
- Example: User says "email the buyer" → You immediately draft the email and open their email app

When user asks for something:
- Assume they want ACTION, not explanation
- Pull up the info they asked for immediately
- If they ask "show me the contract" → show the contract details right away
- If they ask "what should I do?" → give them the TOP 1-2 actions, not a lecture

=== CURRENT CONTEXT ===
${formatTransactionContext(context)}

=== REMEMBER ===
You are an ASSISTANT that DOES THINGS. Not a chatbot that talks about things.
- Task requested → Task completed
- Question asked → Direct answer given
- Document needed → Document shown
- Email needed → Email drafted and ready to send

Be brief. Be helpful. Get it done.`;

  // Build messages array with conversation history
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

  // Add recent conversation history (last 10 messages)
  const recentHistory = conversationHistory.slice(-10);
  recentHistory.forEach(msg => {
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
        max_tokens: 2048,
        system: systemPrompt,
        messages: messages,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Claude API Error:", errorData);
      throw new Error(errorData.error?.message || "Failed to get response");
    }

    const data = await response.json();
    return data.content?.[0]?.text || "I apologize, I could not generate a response.";
  } catch (error) {
    console.error("AI Assistant Error:", error);
    throw error;
  }
}

/**
 * Quick action queries
 */
export const QUICK_ACTIONS = [
  { label: "What should I do today?", icon: "today" },
  { label: "Next required action", icon: "arrow-forward" },
  { label: "Summarize this contract", icon: "document-text" },
  { label: "Draft buyer update", icon: "mail" },
  { label: "Show all deadlines", icon: "calendar" },
];
