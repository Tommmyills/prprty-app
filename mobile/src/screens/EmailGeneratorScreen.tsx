import React, { useState } from "react";
import { View, Text, ScrollView, Keyboard, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeOut,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { GlassCard, GlowButton, NeonDropdown } from "../components";
import { useRealtorStore } from "../state/realtorStore";

const EMAIL_TYPES = [
  { label: "Inspection Scheduling", value: "inspection", icon: "search" as const, subject: "Property Inspection Request" },
  { label: "Appraisal Request", value: "appraisal", icon: "calculator" as const, subject: "Appraisal Request for Property" },
  { label: "Lender Follow-up", value: "lender", icon: "cash" as const, subject: "Loan Application Status Update" },
  { label: "Title Update", value: "title", icon: "document-text" as const, subject: "Title Work Status Request" },
  { label: "Client Update", value: "client_update", icon: "people" as const, subject: "Transaction Update" },
];

const TONE_OPTIONS = [
  { label: "Professional", value: "professional", icon: "briefcase" as const },
  { label: "Friendly", value: "friendly", icon: "happy" as const },
  { label: "Urgent", value: "urgent", icon: "flash" as const },
];

const EMAIL_TEMPLATES: Record<string, Record<string, string>> = {
  inspection: {
    professional:
      "Dear Inspector,\n\nI am writing to schedule a home inspection for the property at [ADDRESS]. The inspection contingency deadline is approaching, and we would like to arrange this at your earliest convenience.\n\nPlease let me know your available time slots for the coming week.\n\nBest regards,\n[YOUR NAME]",
    friendly:
      "Hi there!\n\nHope you are doing well! I wanted to reach out about scheduling an inspection for [ADDRESS]. My clients are excited about this property and we would love to get this scheduled soon.\n\nWhat times work best for you this week?\n\nThanks so much!\n[YOUR NAME]",
    urgent:
      "URGENT: Inspection Needed\n\nWe have a time-sensitive inspection requirement for [ADDRESS]. Our contingency deadline is rapidly approaching and we need to schedule immediately.\n\nPlease respond ASAP with your earliest availability.\n\nThank you,\n[YOUR NAME]",
  },
  appraisal: {
    professional:
      "Dear Appraiser,\n\nI am requesting an appraisal for the property located at [ADDRESS]. The purchase price is $[PRICE] and we need this completed within the next 10 business days.\n\nPlease confirm receipt and provide an estimated completion date.\n\nRegards,\n[YOUR NAME]",
    friendly:
      "Hello!\n\nI hope this message finds you well. We have a great property at [ADDRESS] that needs an appraisal. Would you be able to take this on?\n\nLet me know what information you need from us!\n\nBest,\n[YOUR NAME]",
    urgent:
      "URGENT: Rush Appraisal Request\n\nWe require an expedited appraisal for [ADDRESS]. The closing timeline is tight and we need this prioritized.\n\nPlease contact me immediately to discuss.\n\n[YOUR NAME]",
  },
  lender: {
    professional:
      "Dear [LENDER NAME],\n\nI am following up on the loan application for [CLIENT NAME] regarding the property at [ADDRESS]. Could you please provide an update on the underwriting status?\n\nThank you for your attention to this matter.\n\nBest regards,\n[YOUR NAME]",
    friendly:
      "Hi [LENDER NAME]!\n\nJust checking in on how things are going with [CLIENT NAME]s loan for [ADDRESS]. Any updates you can share?\n\nThanks for all your help!\n[YOUR NAME]",
    urgent:
      "URGENT: Loan Status Update Required\n\nWe need an immediate update on the loan application for [ADDRESS]. The closing date is approaching and we need to ensure everything is on track.\n\nPlease respond today.\n\n[YOUR NAME]",
  },
  title: {
    professional:
      "Dear Title Company,\n\nI am writing to request a status update on the title work for [ADDRESS].\n\nBuyer: [CLIENT NAME]\nPurchase Price: $[PRICE]\n\nPlease confirm:\n1. Title commitment status\n2. Any outstanding liens or encumbrances\n3. Estimated clear-to-close date\n\nThank you for your prompt attention.\n\nBest regards,\n[YOUR NAME]",
    friendly:
      "Hi there!\n\nHope everything is going well! Just checking in on the title work for [ADDRESS] - we have [CLIENT NAME] as the buyer.\n\nCan you give us a quick update on where things stand? Any issues we should know about?\n\nThanks!\n[YOUR NAME]",
    urgent:
      "URGENT: Title Status Required\n\nWe need an immediate update on the title status for [ADDRESS]. Our closing is approaching and we need to confirm clear title ASAP.\n\nPlease respond with current status and any outstanding items requiring attention.\n\nThank you,\n[YOUR NAME]",
  },
  client_update: {
    professional:
      "Dear [CLIENT NAME],\n\nI wanted to provide you with an update on your transaction for [ADDRESS].\n\nCurrent Status:\n- [STATUS ITEM 1]\n- [STATUS ITEM 2]\n\nNext Steps:\n- [NEXT STEP 1]\n- [NEXT STEP 2]\n\nPlease feel free to reach out if you have any questions.\n\nBest regards,\n[YOUR NAME]",
    friendly:
      "Hi [CLIENT NAME]!\n\nGreat news! Things are moving along nicely with [ADDRESS]. Here is what is happening:\n\n- [UPDATE 1]\n- [UPDATE 2]\n\nEverything is on track and I will keep you posted as we progress. Let me know if you have any questions!\n\nBest,\n[YOUR NAME]",
    urgent:
      "IMPORTANT UPDATE: [ADDRESS]\n\nDear [CLIENT NAME],\n\nI need to bring something to your attention regarding your transaction.\n\n[URGENT MATTER]\n\nPlease contact me as soon as possible to discuss.\n\nThank you,\n[YOUR NAME]",
  },
};

export function EmailGeneratorScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [emailType, setEmailType] = useState("inspection");
  const [tone, setTone] = useState("professional");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generatedEmail = useRealtorStore((s) => s.generatedEmail);
  const setGeneratedEmail = useRealtorStore((s) => s.setGeneratedEmail);
  const transactions = useRealtorStore((s) => s.transactions);
  const activeTransactionId = useRealtorStore((s) => s.activeTransactionId);

  const activeTransaction = transactions.find(
    (t) => t.id === activeTransactionId
  );

  // Get current subject line based on email type
  const currentSubject = EMAIL_TYPES.find((type) => type.value === emailType)?.subject || "Email Subject";

  const handleGenerate = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Keyboard.dismiss();
    setIsGenerating(true);

    // Simulate AI generation delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    let email = EMAIL_TEMPLATES[emailType]?.[tone] || "";

    // Replace placeholders with actual data
    if (activeTransaction) {
      email = email
        .replace(/\[ADDRESS\]/g, activeTransaction.address)
        .replace(/\[CLIENT NAME\]/g, activeTransaction.clientName)
        .replace(
          /\[PRICE\]/g,
          (activeTransaction.price / 1000000).toFixed(2) + "M"
        );
    }

    setGeneratedEmail(email);
    setIsGenerating(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(generatedEmail);
    setCopied(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#050510" }}>
      {/* Midnight Glass Obsidian gradient */}
      <LinearGradient
        colors={["#050510", "#0F0F1A"]}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back Button */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <Ionicons name="chevron-down" size={24} color="#FFFFFF" />
        </Pressable>

        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <View className="flex-row items-center mb-2">
            <Ionicons name="sparkles" size={20} color="#FFB800" />
            <Text
              style={{ color: "#FFB800", letterSpacing: 1 }}
              className="text-sm ml-2 uppercase font-semibold"
            >
              AI-Powered
            </Text>
          </View>
          <Text className="text-white text-2xl font-bold">Email Assistant</Text>
          {activeTransaction && (
            <Text style={{ color: "#FFB800" }} className="text-base mt-2">
              For: {activeTransaction.address}
            </Text>
          )}
        </Animated.View>

        {/* Email Type Selector */}
        <Animated.View
          entering={FadeInDown.delay(200).springify()}
          className="mt-6"
        >
          <NeonDropdown
            label="Email Type"
            options={EMAIL_TYPES}
            selectedValue={emailType}
            onSelect={setEmailType}
            glowColor="#10B981"
          />

          {/* Subject Line Preview */}
          <View className="mt-2 px-4 py-3 rounded-xl" style={{
            backgroundColor: "rgba(16, 185, 129, 0.08)",
            borderWidth: 1,
            borderColor: "rgba(16, 185, 129, 0.2)",
          }}>
            <Text style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: 11 }} className="uppercase tracking-wide mb-1">
              Subject Line
            </Text>
            <Text style={{ color: "#10B981" }} className="text-base font-medium">
              {currentSubject}
            </Text>
          </View>
        </Animated.View>

        {/* Tone Selector */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <NeonDropdown
            label="Tone"
            options={TONE_OPTIONS}
            selectedValue={tone}
            onSelect={setTone}
            glowColor="#FFB800"
          />
        </Animated.View>

        {/* Generate Button */}
        <Animated.View
          entering={FadeInDown.delay(400).springify()}
          className="mt-6"
        >
          <GlowButton
            title={isGenerating ? "Generating..." : "Generate Email"}
            onPress={handleGenerate}
            variant="primary"
            icon={isGenerating ? "sync" : "sparkles"}
            loading={isGenerating}
            size="lg"
          />
        </Animated.View>

        {/* Generated Output */}
        {generatedEmail && (
          <Animated.View
            entering={FadeInUp.springify()}
            className="mt-8"
          >
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-white opacity-70 text-sm uppercase tracking-wide">
                Generated Email
              </Text>
              <Pressable
                onPress={handleCopy}
                style={{
                  backgroundColor: copied
                    ? "rgba(16, 185, 129, 0.2)"
                    : "rgba(255,255,255,0.05)",
                  borderWidth: 1,
                  borderColor: copied ? "#10B981" : "rgba(255,255,255,0.1)",
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Ionicons
                  name={copied ? "checkmark" : "copy"}
                  size={16}
                  color={copied ? "#10B981" : "#9CA3AF"}
                />
                <Text
                  style={{ color: copied ? "#10B981" : "#9CA3AF" }}
                  className="ml-2 text-sm font-medium"
                >
                  {copied ? "Copied!" : "Copy"}
                </Text>
              </Pressable>
            </View>

            <GlassCard glowColor="#10B981" intensity="medium" animated={false}>
              <Text className="text-white text-base leading-6">
                {generatedEmail}
              </Text>
            </GlassCard>

            {/* Regenerate Button */}
            <View className="mt-4">
              <GlowButton
                title="Regenerate Email"
                onPress={handleGenerate}
                variant="secondary"
                icon="refresh"
                size="md"
                loading={isGenerating}
              />
            </View>
          </Animated.View>
        )}

        {/* Success Toast for Copy */}
        {copied && (
          <Animated.View
            entering={FadeInUp.springify()}
            exiting={FadeOut}
            style={{
              position: "absolute",
              bottom: 100,
              left: 20,
              right: 20,
              backgroundColor: "rgba(16, 185, 129, 0.95)",
              borderRadius: 12,
              paddingVertical: 14,
              paddingHorizontal: 16,
              flexDirection: "row",
              alignItems: "center",
              shadowColor: "#10B981",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.5,
              shadowRadius: 12,
            }}
          >
            <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF" }} className="ml-3 font-semibold text-base">
              Email copied to clipboard!
            </Text>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}
