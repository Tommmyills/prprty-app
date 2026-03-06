/**
 * Speaker Audio Service
 * Plays audio through the speaker (not earpiece) using expo-av
 * Supports ElevenLabs TTS and text-to-speech
 */

import { Audio } from "expo-av";

/**
 * Sanitize text for natural speech output
 * Removes markdown formatting, decorative symbols, and other non-verbal characters
 * while preserving the readable text content
 */
export function sanitizeTextForSpeech(text: string): string {
  let sanitized = text;

  // Remove code blocks (```code```)
  sanitized = sanitized.replace(/```[\s\S]*?```/g, "");

  // Remove inline code (`code`)
  sanitized = sanitized.replace(/`[^`]*`/g, "");

  // Remove bold/italic markers (**, __, *, _)
  sanitized = sanitized.replace(/\*\*\*([^*]+)\*\*\*/g, "$1"); // ***bold italic***
  sanitized = sanitized.replace(/\*\*([^*]+)\*\*/g, "$1"); // **bold**
  sanitized = sanitized.replace(/\*([^*]+)\*/g, "$1"); // *italic*
  sanitized = sanitized.replace(/___([^_]+)___/g, "$1"); // ___bold italic___
  sanitized = sanitized.replace(/__([^_]+)__/g, "$1"); // __bold__
  sanitized = sanitized.replace(/_([^_]+)_/g, "$1"); // _italic_

  // Remove strikethrough (~~text~~)
  sanitized = sanitized.replace(/~~([^~]+)~~/g, "$1");

  // Remove markdown headers (# ## ### etc.)
  sanitized = sanitized.replace(/^#{1,6}\s+/gm, "");

  // Remove markdown bullet points and numbered lists, but keep the content
  sanitized = sanitized.replace(/^[\s]*[-*+]\s+/gm, "");
  sanitized = sanitized.replace(/^[\s]*\d+\.\s+/gm, "");

  // Remove blockquotes (>)
  sanitized = sanitized.replace(/^>\s+/gm, "");

  // Remove horizontal rules (---, ***, ___)
  sanitized = sanitized.replace(/^[-*_]{3,}\s*$/gm, "");

  // Remove markdown links [text](url) - keep just the text
  sanitized = sanitized.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Remove markdown images ![alt](url)
  sanitized = sanitized.replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1");

  // Remove HTML tags
  sanitized = sanitized.replace(/<[^>]+>/g, "");

  // Remove decorative characters that shouldn't be spoken
  sanitized = sanitized.replace(/[•◦▪▫●○■□►▶◄◀★☆✓✗✔✘→←↑↓⇒⇐⇑⇓]/g, "");

  // Remove multiple consecutive newlines/spaces
  sanitized = sanitized.replace(/\n{3,}/g, "\n\n");
  sanitized = sanitized.replace(/[ \t]{2,}/g, " ");

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

let currentSound: Audio.Sound | null = null;

/**
 * Set audio mode for speaker playback
 * MUST be called before playing any audio
 */
async function setAudioModeForSpeaker(): Promise<void> {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: false,
    playThroughEarpieceAndroid: false,
  });
}

/**
 * Reset audio mode to allow recording after playback
 * This ensures the app can record again after speaking
 */
export async function resetAudioModeForRecording(): Promise<void> {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
}

/**
 * Stop any currently playing audio
 */
export async function stopSpeakerAudio(): Promise<void> {
  // Stop expo-speech if playing
  try {
    const Speech = require("expo-speech");
    await Speech.stop();
  } catch (error) {
    console.error("[SpeakerAudio] Error stopping speech:", error);
  }

  // Stop expo-av sound if playing
  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
    } catch (error) {
      console.error("[SpeakerAudio] Error stopping sound:", error);
    }
    currentSound = null;
  }
}

/**
 * Fetch with timeout wrapper
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = 10000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Speak text using ElevenLabs TTS through the speaker
 */
export async function speakWithElevenLabs(text: string): Promise<void> {
  const apiKey = process.env.EXPO_PUBLIC_VIBECODE_ELEVENLABS_API_KEY;

  // Sanitize text for natural speech - strip formatting
  const cleanText = sanitizeTextForSpeech(text);

  if (!cleanText) {
    console.log("[SpeakerAudio] No text to speak after sanitization");
    return;
  }

  if (!apiKey) {
    console.log("[SpeakerAudio] No ElevenLabs API key, using device TTS");
    await speakWithDeviceTTS(text);
    return;
  }

  try {
    // Stop any current playback
    await stopSpeakerAudio();

    console.log("[SpeakerAudio] Generating speech with ElevenLabs...");

    // ElevenLabs voice ID - Chris (professional male voice for realtor)
    const voiceId = "iP95p4xoKVk53GoZ742B";

    const response = await fetchWithTimeout(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      },
      15000 // 15 second timeout
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.log(`[SpeakerAudio] ElevenLabs API returned ${response.status}: ${errorText}`);
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    // Get audio as array buffer and convert to base64
    const arrayBuffer = await response.arrayBuffer();
    const base64Audio = arrayBufferToBase64(arrayBuffer);
    const audioUri = `data:audio/mpeg;base64,${base64Audio}`;

    console.log("[SpeakerAudio] Playing through speaker...");

    // Set audio mode for speaker BEFORE playing
    await setAudioModeForSpeaker();

    // Force speaker route by playing a tiny silent sound first
    // This ensures iOS routes audio to speaker after a recording session
    try {
      const silentBase64 = "SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYNzmBIAAAAAAAAAAAAAAAAAAAA//tQZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//tQZB4P8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV";
      const { sound: silentSound } = await Audio.Sound.createAsync(
        { uri: `data:audio/mp3;base64,${silentBase64}` },
        { shouldPlay: true, volume: 0 }
      );
      await new Promise(resolve => setTimeout(resolve, 50));
      await silentSound.unloadAsync();
    } catch (e) {
      console.log("[SpeakerAudio] Silent sound trick failed, continuing");
    }

    // Create and play sound
    const { sound } = await Audio.Sound.createAsync(
      { uri: audioUri },
      { shouldPlay: true, volume: 1.0 }
    );

    currentSound = sound;

    // Clean up when done and reset audio mode for recording
    sound.setOnPlaybackStatusUpdate(async (status) => {
      if (status.isLoaded && status.didJustFinish) {
        await sound.unloadAsync();
        currentSound = null;
        // Reset audio mode to allow recording again
        await resetAudioModeForRecording();
      }
    });
  } catch (error: unknown) {
    // Check if it's an abort error (timeout)
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isAbortError = error instanceof Error && error.name === "AbortError";

    if (isAbortError) {
      console.log("[SpeakerAudio] ElevenLabs request timed out, using device TTS");
    } else {
      console.log("[SpeakerAudio] ElevenLabs unavailable, using device TTS:", errorMessage);
    }

    // Fallback to device TTS
    await speakWithDeviceTTS(text);
  }
}

/**
 * Speak text using device TTS through the speaker
 * Uses expo-av to ensure speaker output
 */
export async function speakWithDeviceTTS(text: string): Promise<void> {
  // Sanitize text for natural speech - strip formatting
  const cleanText = sanitizeTextForSpeech(text);

  if (!cleanText) {
    console.log("[SpeakerAudio] No text to speak after sanitization");
    return;
  }

  try {
    // Stop any current playback
    await stopSpeakerAudio();

    // Set audio mode for speaker FIRST
    await setAudioModeForSpeaker();

    // Force speaker route by playing a tiny silent sound through expo-av first
    // This tricks iOS into using the speaker for subsequent audio
    try {
      const silentBase64 = "SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYNzmBIAAAAAAAAAAAAAAAAAAAA//tQZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//tQZB4P8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV";
      const { sound: silentSound } = await Audio.Sound.createAsync(
        { uri: `data:audio/mp3;base64,${silentBase64}` },
        { shouldPlay: true, volume: 0 }
      );
      // Wait briefly then unload
      await new Promise(resolve => setTimeout(resolve, 100));
      await silentSound.unloadAsync();
    } catch (e) {
      // Silent sound failed, continue anyway
      console.log("[SpeakerAudio] Silent sound trick failed, continuing");
    }

    // Use expo-speech
    const Speech = require("expo-speech");

    Speech.speak(cleanText, {
      language: "en-GB",
      voice: "com.apple.voice.enhanced.en-GB.Oliver",
      rate: 0.95,
      pitch: 1.0,
      onDone: async () => {
        // Reset audio mode to allow recording again after speech finishes
        await resetAudioModeForRecording();
      },
      onError: async () => {
        // Reset audio mode even on error
        await resetAudioModeForRecording();
      },
    });
  } catch (error) {
    console.error("[SpeakerAudio] Device TTS error:", error);
    // Reset audio mode on error
    await resetAudioModeForRecording();
  }
}

/**
 * Main speak function - uses ElevenLabs for reliable speaker output
 */
export async function speakThroughSpeaker(text: string): Promise<void> {
  // Use ElevenLabs - it plays through expo-av which properly routes to speaker
  await speakWithElevenLabs(text);
}

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
