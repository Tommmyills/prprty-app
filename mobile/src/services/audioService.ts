/**
 * Audio Service
 * Handles audio recording permissions and recording functionality
 */

import { Audio } from "expo-av";
import { sanitizeTextForSpeech } from "./speakerAudio";

export interface RecordingResult {
  uri: string;
  duration: number;
}

/**
 * Request audio recording permissions
 */
export async function requestAudioPermissions(): Promise<boolean> {
  try {
    const { status } = await Audio.requestPermissionsAsync();
    return status === "granted";
  } catch (error) {
    console.error("[Audio Service] Permission request failed:", error);
    return false;
  }
}

/**
 * Start audio recording
 */
export async function startRecording(): Promise<Audio.Recording | null> {
  try {
    // Request permissions if not already granted
    const hasPermission = await requestAudioPermissions();
    if (!hasPermission) {
      console.error("[Audio Service] Recording permission denied");
      return null;
    }

    // Configure audio mode for recording
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    // Create and start recording
    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    await recording.startAsync();

    console.log("[Audio Service] Recording started");
    return recording;
  } catch (error) {
    console.error("[Audio Service] Failed to start recording:", error);
    return null;
  }
}

/**
 * Stop audio recording and return file URI
 */
export async function stopRecording(
  recording: Audio.Recording
): Promise<RecordingResult | null> {
  try {
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    const status = await recording.getStatusAsync();

    if (!uri) {
      console.error("[Audio Service] No recording URI available");
      return null;
    }

    console.log("[Audio Service] Recording stopped:", uri);

    return {
      uri,
      duration: status.durationMillis / 1000,
    };
  } catch (error) {
    console.error("[Audio Service] Failed to stop recording:", error);
    return null;
  }
}

/**
 * Play audio from URI using Text-to-Speech or recorded audio
 */
export async function playAudio(uri: string): Promise<void> {
  try {
    const { sound } = await Audio.Sound.createAsync({ uri });
    await sound.playAsync();
    console.log("[Audio Service] Playing audio:", uri);
  } catch (error) {
    console.error("[Audio Service] Failed to play audio:", error);
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
 * Speak text using ElevenLabs TTS - forces speaker output via expo-av
 */
export async function speakText(text: string): Promise<void> {
  const apiKey = process.env.EXPO_PUBLIC_VIBECODE_ELEVENLABS_API_KEY;

  // Sanitize text for natural speech - strip formatting
  const cleanText = sanitizeTextForSpeech(text);

  if (!cleanText) {
    console.log("[Audio Service] No text to speak after sanitization");
    return;
  }

  if (!apiKey) {
    console.log("[Audio Service] No ElevenLabs API key, using device TTS");
    // Fallback to device TTS
    try {
      const Speech = await import("expo-speech");
      await Speech.stop();
      Speech.speak(cleanText, {
        language: "en-GB",
        pitch: 1.0,
        rate: 0.95,
        voice: "com.apple.voice.enhanced.en-GB.Oliver",
      });
    } catch (error) {
      console.log("[Audio Service] Device TTS error:", error);
    }
    return;
  }

  try {
    console.log("[Audio Service] Generating speech with ElevenLabs...");

    // ElevenLabs voice ID - Chris (professional male voice)
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
      console.log(`[Audio Service] ElevenLabs API returned ${response.status}: ${errorText}`);
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    // Get audio as array buffer and convert to base64
    const arrayBuffer = await response.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(arrayBuffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Audio = btoa(binary);
    const audioUri = `data:audio/mpeg;base64,${base64Audio}`;

    // Set audio mode for speaker BEFORE playing
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });

    // Create and play sound through speaker
    const { sound } = await Audio.Sound.createAsync(
      { uri: audioUri },
      { shouldPlay: true, volume: 1.0 }
    );

    console.log("[Audio Service] Playing through speaker with ElevenLabs");

    // Clean up when done
    sound.setOnPlaybackStatusUpdate(async (status) => {
      if (status.isLoaded && status.didJustFinish) {
        await sound.unloadAsync();
      }
    });
  } catch (error: unknown) {
    // Check if it's an abort error (timeout)
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isAbortError = error instanceof Error && error.name === "AbortError";

    if (isAbortError) {
      console.log("[Audio Service] ElevenLabs request timed out, using device TTS");
    } else {
      console.log("[Audio Service] ElevenLabs unavailable, using device TTS:", errorMessage);
    }

    // Fallback to device TTS
    try {
      const Speech = await import("expo-speech");
      await Speech.stop();
      Speech.speak(cleanText, {
        language: "en-GB",
        pitch: 1.0,
        rate: 0.95,
        voice: "com.apple.voice.enhanced.en-GB.Oliver",
      });
    } catch (ttsError) {
      console.log("[Audio Service] Device TTS fallback error:", ttsError);
    }
  }
}

/**
 * Stop any ongoing speech
 */
export async function stopSpeaking(): Promise<void> {
  try {
    const Speech = await import("expo-speech");
    await Speech.stop();
    console.log("[Audio Service] Stopped speaking");
  } catch (error) {
    console.error("[Audio Service] Failed to stop speaking:", error);
  }
}
