/**
 * Coaching Webhook API
 * Sends realtor coaching data to Make.com webhook
 */

export interface CoachingRequestData {
  name: string;
  phone: string;
  scriptRequest: string;
  notes: string;
  timestamp: string;
}

/**
 * Send coaching script request to Make.com webhook
 * @param data - The coaching request data
 * @returns Promise with the response
 */
export async function sendCoachingRequest(data: CoachingRequestData): Promise<{ success: boolean; error?: string }> {
  const WEBHOOK_URL = "https://hook.us2.make.com/tlhkemq71jt51sgfigcwrmjth3v7u5uk";

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Webhook error:", errorText);
      return { success: false, error: `Request failed: ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    console.error("Coaching webhook error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error occurred" };
  }
}
