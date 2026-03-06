/*
IMPORTANT NOTICE: DO NOT REMOVE
This is a custom client for the Google Gemini API.

Valid model names:
gemini-2.0-flash
gemini-1.5-pro
gemini-1.5-flash
*/

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export interface GeminiMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

export interface GeminiResponse {
  content: string;
}

/**
 * Get a text response from Gemini
 */
export const getGeminiTextResponse = async (
  messages: { role: "user" | "assistant"; content: string }[],
  options?: { model?: string; temperature?: number; maxTokens?: number }
): Promise<GeminiResponse> => {
  const apiKey = process.env.EXPO_PUBLIC_VIBECODE_GEMINI_API_KEY;

  if (!apiKey) {
    console.warn("Gemini API key not found in environment variables");
    throw new Error("Gemini API key not configured");
  }

  const model = options?.model || "gemini-2.0-flash";

  // Convert messages to Gemini format
  const geminiMessages: GeminiMessage[] = messages.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  try {
    const response = await fetch(
      `${GEMINI_API_URL}/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: geminiMessages,
          generationConfig: {
            temperature: options?.temperature ?? 0.7,
            maxOutputTokens: options?.maxTokens || 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API Error:", errorData);
      throw new Error(errorData.error?.message || "Gemini API request failed");
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return { content };
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

/**
 * Get a simple chat response from Gemini
 */
export const getGeminiChatResponse = async (prompt: string): Promise<GeminiResponse> => {
  return await getGeminiTextResponse([{ role: "user", content: prompt }]);
};
