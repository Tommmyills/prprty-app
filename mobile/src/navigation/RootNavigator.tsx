import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation";
import { NegotiationHomeScreen } from "../screens/NegotiationHomeScreen";
import { DashboardScreen } from "../screens/DashboardScreen";
import { TransactionDetailScreen } from "../screens/TransactionDetailScreen";
import { EmailGeneratorScreen } from "../screens/EmailGeneratorScreen";
import { WeeklySummaryScreen } from "../screens/WeeklySummaryScreen";
import { ContractUploadScreen } from "../screens/ContractUploadScreen";
import { CoachingScriptScreen } from "../screens/CoachingScriptScreen";
import { DailyDigestScreen } from "../screens/DailyDigestScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { ModeSelectionScreen } from "../screens/ModeSelectionScreen";
import { LiveCoachingScreen } from "../screens/LiveCoachingScreen";
import { LiveDealGuidanceScreen } from "../screens/LiveDealGuidanceScreen";
import { DealContextMemoryScreen } from "../screens/DealContextMemoryScreen";
import { SavedDealsScreen } from "../screens/SavedDealsScreen";
import AssistantScreen from "../screens/AssistantScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#0A0A0F" },
        animation: "slide_from_right",
      }}
      initialRouteName="Dashboard"
    >
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="NegotiationHome" component={NegotiationHomeScreen} />
      <Stack.Screen
        name="TransactionDetail"
        component={TransactionDetailScreen}
        options={{
          animation: "slide_from_bottom",
          gestureEnabled: true,
          gestureDirection: "vertical",
        }}
      />
      <Stack.Screen
        name="EmailGenerator"
        component={EmailGeneratorScreen}
        options={{
          animation: "slide_from_bottom",
          gestureEnabled: true,
          gestureDirection: "vertical",
        }}
      />
      <Stack.Screen
        name="WeeklySummary"
        component={WeeklySummaryScreen}
        options={{
          animation: "slide_from_bottom",
          gestureEnabled: true,
          gestureDirection: "vertical",
        }}
      />
      <Stack.Screen
        name="ContractUpload"
        component={ContractUploadScreen}
        options={{
          animation: "slide_from_bottom",
          gestureEnabled: true,
          gestureDirection: "vertical",
        }}
      />
      <Stack.Screen
        name="CoachingScript"
        component={CoachingScriptScreen}
        options={{
          animation: "slide_from_bottom",
          gestureEnabled: true,
          gestureDirection: "vertical",
        }}
      />
      <Stack.Screen name="DailyDigest" component={DailyDigestScreen} />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          animation: "slide_from_bottom",
          gestureEnabled: true,
          gestureDirection: "vertical",
        }}
      />
      <Stack.Screen name="ModeSelection" component={ModeSelectionScreen} />
      <Stack.Screen name="LiveCoaching" component={LiveCoachingScreen} />
      <Stack.Screen
        name="LiveDealGuidance"
        component={LiveDealGuidanceScreen}
        options={{
          animation: "slide_from_bottom",
          gestureEnabled: true,
          gestureDirection: "vertical",
        }}
      />
      <Stack.Screen
        name="DealContextMemory"
        component={DealContextMemoryScreen}
        options={{
          animation: "slide_from_bottom",
          gestureEnabled: true,
          gestureDirection: "vertical",
        }}
      />
      <Stack.Screen
        name="SavedDeals"
        component={SavedDealsScreen}
        options={{
          animation: "slide_from_bottom",
          gestureEnabled: true,
          gestureDirection: "vertical",
        }}
      />
      <Stack.Screen
        name="Assistant"
        component={AssistantScreen}
        options={{
          animation: "slide_from_bottom",
          gestureEnabled: true,
          gestureDirection: "vertical",
        }}
      />
    </Stack.Navigator>
  );
}
