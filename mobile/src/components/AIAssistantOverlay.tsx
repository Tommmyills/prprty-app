/**
 * AI Assistant Overlay
 * Complete floating assistant with button and panel
 * Add this to any screen to enable the AI assistant
 */

import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { AIAssistantButton } from "./AIAssistantButton";
import { AIAssistantPanel } from "./AIAssistantPanel";
import { useRealtorStore } from "../state/realtorStore";

interface AIAssistantOverlayProps {
  bottomOffset?: number;
}

export function AIAssistantOverlay({ bottomOffset = 24 }: AIAssistantOverlayProps) {
  const insets = useSafeAreaInsets();
  const isAssistantVisible = useRealtorStore((s) => s.isAssistantVisible);
  const setAssistantVisible = useRealtorStore((s) => s.setAssistantVisible);

  return (
    <>
      {/* Floating Button - Fixed Position */}
      {!isAssistantVisible && (
        <Animated.View
          entering={FadeIn.delay(500).duration(300)}
          exiting={FadeOut.duration(200)}
          style={{
            position: "absolute",
            bottom: insets.bottom + bottomOffset,
            right: 20,
            zIndex: 999,
          }}
        >
          <AIAssistantButton
            onPress={() => setAssistantVisible(true)}
            size={60}
          />
        </Animated.View>
      )}

      {/* Assistant Panel */}
      <AIAssistantPanel
        visible={isAssistantVisible}
        onClose={() => setAssistantVisible(false)}
      />
    </>
  );
}
