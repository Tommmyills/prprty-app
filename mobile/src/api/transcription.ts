/**
 * Transcription API
 * Speech-to-text using OpenAI Whisper via existing transcribeAudio service
 */

import { transcribeAudio } from "./transcribe-audio";

export interface TranscriptionResult {
  text: string;
  duration: number;
  language?: string;
}

/**
 * Transcribe audio file to text using OpenAI Whisper
 */
export async function transcribeAudioFile(
  audioUri: string,
  duration: number
): Promise<TranscriptionResult | null> {
  try {
    console.log("[Transcription] Starting transcription for:", audioUri);

    // Use the existing transcribeAudio service
    const transcription = await transcribeAudio(audioUri);

    if (!transcription || !transcription.trim()) {
      console.error("[Transcription] No speech detected in audio");
      return null;
    }

    console.log("[Transcription] Success:", transcription);

    return {
      text: transcription.trim(),
      duration,
      language: "en", // Whisper auto-detects but we default to English
    };
  } catch (error) {
    console.error("[Transcription] Failed:", error);
    return null;
  }
}

/**
 * Validate if transcription contains meaningful speech
 */
export function isValidTranscription(transcription: TranscriptionResult | null): boolean {
  if (!transcription || !transcription.text) {
    return false;
  }

  // Check if transcription has at least 2 words
  const words = transcription.text.trim().split(/\s+/);
  return words.length >= 2;
}
