/**
 * Realtor Agent Service
 * The Closing Room Agent - Your expert mentor from the Realtorverse
 */

import { AIMessage } from "../types/ai";
import { getOpenAITextResponse } from "./chat-service";
import {
  SYSTEM_PROMPT,
  NEGOTIATION_SCRIPTS,
  OBJECTION_HANDLERS,
  CLIENT_COMMUNICATION,
  TRANSACTION_KNOWLEDGE,
  getRandomPowerPhrase
} from "../data/realtorKnowledgeBase";

// Build comprehensive system context with knowledge base
const buildSystemPrompt = (context?: AgentContext): string => {
  let prompt = SYSTEM_PROMPT;

  // Add relevant context if available
  if (context?.currentTransaction) {
    prompt += `\n\n## CURRENT TRANSACTION CONTEXT
- Property: ${context.currentTransaction.address}
- Client: ${context.currentTransaction.clientName}
- Price: $${context.currentTransaction.price?.toLocaleString()}
- Status: ${context.currentTransaction.status}
- Role: ${context.currentTransaction.clientType || "Buyer"}`;
  }

  // Add condensed knowledge for context
  prompt += `\n\n## QUICK REFERENCE - NEGOTIATION TACTICS
You have deep knowledge of:
- Multiple offer strategies
- Price reduction conversations
- Lowball offer handling
- Inspection negotiations
- All common buyer/seller objections
- Client emotional management
- Contract contingencies and timelines

When relevant, provide SPECIFIC scripts and word-for-word responses the agent can use.`;

  return prompt;
};

export interface AgentContext {
  currentTransaction?: {
    address: string;
    clientName: string;
    price?: number;
    status?: string;
    clientType?: "Buyer" | "Seller";
  };
  agentName?: string;
  marketConditions?: "hot" | "balanced" | "slow";
}

export interface RealtorAgentResponse {
  content: string;
  suggestedActions?: string[];
  relatedScripts?: string[];
}

/**
 * Get a response from the Realtor Agent
 */
export const getRealtorAgentResponse = async (
  userMessage: string,
  conversationHistory: AIMessage[] = [],
  context?: AgentContext
): Promise<RealtorAgentResponse> => {
  try {
    const systemPrompt = buildSystemPrompt(context);

    const messages: AIMessage[] = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: userMessage },
    ];

    const response = await getOpenAITextResponse(messages, {
      temperature: 0.8, // Slightly higher for more personality
      maxTokens: 1500,
    });

    // Extract suggested actions if the response contains them
    const suggestedActions = extractSuggestedActions(response.content);

    return {
      content: response.content,
      suggestedActions,
    };
  } catch (error) {
    console.error("Realtor Agent Error:", error);
    throw error;
  }
};

/**
 * Get a quick response for common scenarios
 */
export const getQuickCoachingResponse = async (
  scenario: QuickScenario,
  details?: string
): Promise<RealtorAgentResponse> => {
  const scenarioPrompts: Record<QuickScenario, string> = {
    "multiple-offers": `I'm in a multiple offer situation. ${details || "How do I help my buyer win?"}`,
    "price-objection": `My client thinks the price is too high. ${details || "How do I handle this?"}`,
    "lowball-offer": `I just received a lowball offer. ${details || "What should I tell my seller?"}`,
    "inspection-issues": `The inspection found problems. ${details || "How do I navigate this?"}`,
    "cold-feet": `My client is getting cold feet before closing. ${details || "How do I help them through this?"}`,
    "commission-objection": `The client is objecting to my commission. ${details || "What's the best response?"}`,
    "fsbo-competition": `My client wants to try FSBO first. ${details || "How do I handle this?"}`,
    "appraisal-gap": `The appraisal came in low. ${details || "What are our options?"}`,
  };

  const prompt = scenarioPrompts[scenario] || details || "I need help with a situation.";

  return getRealtorAgentResponse(prompt);
};

export type QuickScenario =
  | "multiple-offers"
  | "price-objection"
  | "lowball-offer"
  | "inspection-issues"
  | "cold-feet"
  | "commission-objection"
  | "fsbo-competition"
  | "appraisal-gap";

/**
 * Get a negotiation script for a specific situation
 */
export const getNegotiationScript = (
  category: keyof typeof NEGOTIATION_SCRIPTS,
  situationIndex: number = 0
): { script: string; tips: string[] } | null => {
  const categoryData = NEGOTIATION_SCRIPTS[category];
  if (!categoryData?.scenarios?.[situationIndex]) return null;

  const scenario = categoryData.scenarios[situationIndex];
  return {
    script: scenario.script,
    tips: scenario.tips,
  };
};

/**
 * Get objection handler for buyer or seller objections
 */
export const getObjectionHandler = (
  type: "buyer" | "seller",
  objectionKeyword: string
): { objection: string; response: string; followUp: string } | null => {
  const handlers = OBJECTION_HANDLERS[type];

  // Find matching objection (case-insensitive partial match)
  const handler = handlers.find(h =>
    h.objection.toLowerCase().includes(objectionKeyword.toLowerCase())
  );

  return handler || null;
};

/**
 * Get communication template for difficult situations
 */
export const getCommunicationTemplate = (
  situation: "lowAppraisal" | "failedInspection" | "lostBidding"
): { script: string; tips: string[] } | null => {
  const template = CLIENT_COMMUNICATION.delivering_bad_news[situation];
  return template || null;
};

/**
 * Get timeline milestone information
 */
export const getTimelineMilestone = (day: number): string | null => {
  const milestone = TRANSACTION_KNOWLEDGE.timeline_milestones.find(m => m.day === day);
  return milestone?.milestone || null;
};

/**
 * Get contingency information
 */
export const getContingencyInfo = (
  contingency: keyof typeof TRANSACTION_KNOWLEDGE.contingencies
) => {
  return TRANSACTION_KNOWLEDGE.contingencies[contingency] || null;
};

// Helper to extract action items from response
const extractSuggestedActions = (content: string): string[] => {
  const actions: string[] = [];

  // Look for numbered lists or bullet points
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.match(/^(\d+[\.\):]|[-•*])\s+/)) {
      const action = trimmed.replace(/^(\d+[\.\):]|[-•*])\s+/, "").trim();
      if (action.length > 10 && action.length < 200) {
        actions.push(action);
      }
    }
  }

  return actions.slice(0, 5); // Max 5 actions
};

/**
 * Quick greeting when agent starts
 */
export const getAgentGreeting = (agentName?: string): string => {
  const greetings = [
    `Welcome to the Closing Room${agentName ? `, ${agentName}` : ""}! I'm your expert mentor from the Realtorverse. Whether you need negotiation tactics, client scripts, or just someone to strategize with - I've got you covered. What are we working on today?`,
    `${agentName ? `${agentName}, ` : ""}Ready to close some deals? I'm The Closing Room Agent - your secret weapon for any real estate challenge. Drop your situation on me and let's figure out the winning play.`,
    `Hey${agentName ? ` ${agentName}` : ""}! You've got the Realtorverse's top closing expert in your corner. Negotiations, objections, client conversations - bring it all. What's on your plate today?`,
  ];

  return greetings[Math.floor(Math.random() * greetings.length)];
};
