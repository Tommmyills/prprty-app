/**
 * useVoiceRecording Hook
 * Handles audio recording for voice input using expo-av
 */

import { useState, useRef, useCallback } from "react";
import { Audio } from "expo-av";
import { transcribeAudio } from "../api/transcribe-audio";

interface UseVoiceRecordingReturn {
  isRecording: boolean;
  isTranscribing: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  cancelRecording: () => Promise<void>;
}

export function useVoiceRecording(): UseVoiceRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  /**
   * Request microphone permissions and configure audio
   */
  const setupAudio = useCallback(async (): Promise<boolean> => {
    try {
      console.log("[VoiceRecording] Requesting permissions...");
      const { status } = await Audio.requestPermissionsAsync();

      if (status !== "granted") {
        console.log("[VoiceRecording] Permission denied");
        return false;
      }

      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log("[VoiceRecording] Audio configured successfully");
      return true;
    } catch (error) {
      console.error("[VoiceRecording] Setup error:", error);
      return false;
    }
  }, []);

  /**
   * Start recording audio
   */
  const startRecording = useCallback(async (): Promise<void> => {
    try {
      // Setup audio first
      const ready = await setupAudio();
      if (!ready) {
        console.log("[VoiceRecording] Audio not ready, cannot record");
        return;
      }

      console.log("[VoiceRecording] Starting recording...");

      // Create and prepare recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setIsRecording(true);

      console.log("[VoiceRecording] Recording started");
    } catch (error) {
      console.error("[VoiceRecording] Failed to start recording:", error);
      setIsRecording(false);
    }
  }, [setupAudio]);

  /**
   * Stop recording and transcribe
   */
  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (!recordingRef.current) {
      console.log("[VoiceRecording] No active recording");
      return null;
    }

    try {
      console.log("[VoiceRecording] Stopping recording...");
      setIsRecording(false);
      setIsTranscribing(true);

      // Stop the recording
      await recordingRef.current.stopAndUnloadAsync();

      // Reset audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      // Get the recording URI
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        console.log("[VoiceRecording] No recording URI");
        setIsTranscribing(false);
        return null;
      }

      console.log("[VoiceRecording] Recording saved to:", uri);
      console.log("[VoiceRecording] Transcribing...");

      // Transcribe the audio
      const transcription = await transcribeAudio(uri);

      console.log("[VoiceRecording] Transcription:", transcription);
      setIsTranscribing(false);

      return transcription;
    } catch (error) {
      console.error("[VoiceRecording] Stop/transcribe error:", error);
      setIsRecording(false);
      setIsTranscribing(false);
      recordingRef.current = null;
      return null;
    }
  }, []);

  /**
   * Cancel recording without transcribing
   */
  const cancelRecording = useCallback(async (): Promise<void> => {
    if (!recordingRef.current) {
      return;
    }

    try {
      console.log("[VoiceRecording] Canceling recording...");
      await recordingRef.current.stopAndUnloadAsync();

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      recordingRef.current = null;
      setIsRecording(false);
      setIsTranscribing(false);
    } catch (error) {
      console.error("[VoiceRecording] Cancel error:", error);
      recordingRef.current = null;
      setIsRecording(false);
      setIsTranscribing(false);
    }
  }, []);

  return {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
