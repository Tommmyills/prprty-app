/**
 * ContactPickerSheet - Unified contact picker for calls, video, and messaging
 *
 * Features:
 * - Access device contacts with search
 * - Manual number/email entry
 * - Recent contacts from deal contexts
 * - Multiple action types: call, video, text, email
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  FlatList,
  ActivityIndicator,
  Linking,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import * as Contacts from "expo-contacts";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDealContextStore } from "../state/dealContextStore";

export type ContactActionType = "call" | "video" | "text" | "email";

interface ContactPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  actionType: ContactActionType;
  onActionComplete?: () => void;
}

interface ContactItem {
  id: string;
  name: string;
  phoneNumber?: string;
  email?: string;
  source: "device" | "deal" | "manual";
}

const ACTION_CONFIG: Record<ContactActionType, {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  buttonText: string;
}> = {
  call: {
    title: "Make a Call",
    subtitle: "Select a contact or enter a number",
    icon: "call",
    color: "#22C55E",
    buttonText: "Call",
  },
  video: {
    title: "FaceTime Video",
    subtitle: "Select a contact for video call",
    icon: "videocam",
    color: "#10B981",
    buttonText: "FaceTime",
  },
  text: {
    title: "Send a Message",
    subtitle: "Select a contact to text",
    icon: "chatbubble",
    color: "#3B82F6",
    buttonText: "Message",
  },
  email: {
    title: "Send Email",
    subtitle: "Select a contact to email",
    icon: "mail",
    color: "#A855F7",
    buttonText: "Email",
  },
};

export function ContactPickerSheet({
  visible,
  onClose,
  actionType,
  onActionComplete,
}: ContactPickerSheetProps) {
  const insets = useSafeAreaInsets();
  const config = ACTION_CONFIG[actionType];

  // State
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<ContactItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [manualInput, setManualInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);

  // Deal contacts
  const dealContexts = useDealContextStore((s) => s.dealContexts);

  // Load contacts on mount
  useEffect(() => {
    if (visible) {
      loadContacts();
    }
  }, [visible]);

  // Filter contacts when search changes
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredContacts(contacts);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.phoneNumber?.includes(query) ||
          c.email?.toLowerCase().includes(query)
      );
      setFilteredContacts(filtered);
    }
  }, [searchQuery, contacts]);

  const loadContacts = async () => {
    setLoading(true);

    try {
      // Request permission
      const { status } = await Contacts.requestPermissionsAsync();
      setPermissionStatus(status);

      if (status !== "granted") {
        setLoading(false);
        return;
      }

      // Get device contacts
      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.Name,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Emails,
        ],
        sort: Contacts.SortTypes.FirstName,
      });

      // Transform to our format
      const deviceContacts: ContactItem[] = data
        .filter((c) => c.name && (c.phoneNumbers?.length || c.emails?.length))
        .map((c) => ({
          id: c.id || Math.random().toString(),
          name: c.name || "Unknown",
          phoneNumber: c.phoneNumbers?.[0]?.number,
          email: c.emails?.[0]?.email,
          source: "device" as const,
        }));

      // Add deal contacts at the top (deals with phone numbers)
      const dealContacts: ContactItem[] = dealContexts
        .filter((d) => d.clientPhone)
        .map((d) => ({
          id: `deal-${d.id}`,
          name: d.dealName,
          phoneNumber: d.clientPhone,
          email: undefined,
          source: "deal" as const,
        }));

      setContacts([...dealContacts, ...deviceContacts]);
      setFilteredContacts([...dealContacts, ...deviceContacts]);
    } catch (error) {
      console.log("[ContactPicker] Error loading contacts:", error);
    }

    setLoading(false);
  };

  const handleSelectContact = async (contact: ContactItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const phoneNumber = contact.phoneNumber?.replace(/[^\d+]/g, "");
    const email = contact.email?.trim();

    try {
      switch (actionType) {
        case "call":
          if (phoneNumber) {
            await Linking.openURL(`tel:${phoneNumber}`);
          }
          break;

        case "video":
          // FaceTime works with both phone and email
          const facetimeContact = email || phoneNumber;
          if (facetimeContact) {
            await Linking.openURL(`facetime:${facetimeContact}`);
          }
          break;

        case "text":
          if (phoneNumber) {
            await Linking.openURL(`sms:${phoneNumber}`);
          }
          break;

        case "email":
          if (email) {
            await Linking.openURL(`mailto:${email}`);
          }
          break;
      }

      onClose();
      onActionComplete?.();
    } catch (error) {
      console.log("[ContactPicker] Action error:", error);
    }
  };

  const handleManualAction = async () => {
    const input = manualInput.trim();
    if (!input) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const isEmail = input.includes("@");
    const cleanedPhone = input.replace(/[^\d+]/g, "");

    try {
      switch (actionType) {
        case "call":
          if (cleanedPhone.length >= 10) {
            await Linking.openURL(`tel:${cleanedPhone}`);
          }
          break;

        case "video":
          // FaceTime can use email or phone
          const facetimeTarget = isEmail ? input : cleanedPhone;
          if (facetimeTarget) {
            await Linking.openURL(`facetime:${facetimeTarget}`);
          }
          break;

        case "text":
          if (cleanedPhone.length >= 10) {
            await Linking.openURL(`sms:${cleanedPhone}`);
          }
          break;

        case "email":
          if (isEmail) {
            await Linking.openURL(`mailto:${input}`);
          }
          break;
      }

      onClose();
      setManualInput("");
      setShowManualEntry(false);
      onActionComplete?.();
    } catch (error) {
      console.log("[ContactPicker] Manual action error:", error);
    }
  };

  const isValidManualInput = () => {
    const input = manualInput.trim();
    if (!input) return false;

    const isEmail = input.includes("@") && input.includes(".");
    const isPhone = input.replace(/[^\d]/g, "").length >= 10;

    switch (actionType) {
      case "call":
      case "text":
        return isPhone;
      case "video":
        return isEmail || isPhone;
      case "email":
        return isEmail;
      default:
        return false;
    }
  };

  const getPlaceholder = () => {
    switch (actionType) {
      case "call":
      case "text":
        return "Enter phone number";
      case "video":
        return "Enter phone or email";
      case "email":
        return "Enter email address";
      default:
        return "Enter contact";
    }
  };

  const getKeyboardType = () => {
    switch (actionType) {
      case "call":
      case "text":
        return "phone-pad" as const;
      case "email":
        return "email-address" as const;
      case "video":
        return "email-address" as const;
      default:
        return "default" as const;
    }
  };

  const renderContact = useCallback(
    ({ item }: { item: ContactItem }) => {
      const hasValidData =
        (actionType === "email" && item.email) ||
        (actionType !== "email" && item.phoneNumber);

      if (!hasValidData && actionType !== "video") return null;

      // For video, we need either phone or email
      if (actionType === "video" && !item.phoneNumber && !item.email) return null;

      return (
        <Pressable
          onPress={() => handleSelectContact(item)}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 14,
            paddingHorizontal: 16,
            backgroundColor: pressed ? "rgba(255, 255, 255, 0.05)" : "transparent",
            borderBottomWidth: 1,
            borderBottomColor: "rgba(255, 255, 255, 0.06)",
          })}
        >
          {/* Avatar */}
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor:
                item.source === "deal"
                  ? "rgba(245, 158, 11, 0.2)"
                  : "rgba(255, 255, 255, 0.1)",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            {item.source === "deal" ? (
              <Ionicons name="briefcase" size={20} color="#F59E0B" />
            ) : (
              <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>

          {/* Info */}
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "500" }}>
              {item.name}
            </Text>
            <Text style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: 13, marginTop: 2 }}>
              {actionType === "email" ? item.email : item.phoneNumber}
            </Text>
          </View>

          {/* Action indicator */}
          <Ionicons name={config.icon} size={20} color={config.color} />
        </Pressable>
      );
    },
    [actionType, config]
  );

  const renderPermissionRequest = () => (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        <Ionicons name="people" size={36} color="rgba(255, 255, 255, 0.5)" />
      </View>
      <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "600", textAlign: "center" }}>
        Contacts Access Required
      </Text>
      <Text
        style={{
          color: "rgba(255, 255, 255, 0.5)",
          fontSize: 14,
          textAlign: "center",
          marginTop: 8,
          marginBottom: 24,
        }}
      >
        Allow access to your contacts to quickly select who to {actionType === "call" ? "call" : actionType === "video" ? "video call" : actionType === "text" ? "message" : "email"}.
      </Text>
      <Pressable
        onPress={() => Linking.openSettings()}
        style={{
          backgroundColor: config.color,
          paddingHorizontal: 24,
          paddingVertical: 14,
          borderRadius: 12,
        }}
      >
        <Text style={{ color: "#000000", fontSize: 16, fontWeight: "600" }}>
          Open Settings
        </Text>
      </Pressable>
      <Pressable
        onPress={() => setShowManualEntry(true)}
        style={{ marginTop: 16 }}
      >
        <Text style={{ color: config.color, fontSize: 14 }}>
          Or enter manually
        </Text>
      </Pressable>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)" }}>
        <Pressable style={{ flex: 0.15 }} onPress={onClose} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 0.85 }}
        >
          <BlurView
            intensity={90}
            tint="dark"
            style={{
              flex: 1,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(20, 20, 30, 0.95)",
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
              }}
            >
              {/* Handle */}
              <View style={{ alignItems: "center", paddingTop: 10, paddingBottom: 4 }}>
                <View
                  style={{
                    width: 36,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                  }}
                />
              </View>

              {/* Header */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 20,
                  paddingVertical: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: "rgba(255, 255, 255, 0.08)",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: `${config.color}20`,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <Ionicons name={config.icon} size={22} color={config.color} />
                  </View>
                  <View>
                    <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "600" }}>
                      {config.title}
                    </Text>
                    <Text style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: 13, marginTop: 2 }}>
                      {config.subtitle}
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={onClose}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="close" size={20} color="rgba(255, 255, 255, 0.7)" />
                </Pressable>
              </View>

              {/* Search Bar */}
              <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                    borderRadius: 12,
                    paddingHorizontal: 12,
                  }}
                >
                  <Ionicons name="search" size={18} color="rgba(255, 255, 255, 0.4)" />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search contacts..."
                    placeholderTextColor="rgba(255, 255, 255, 0.3)"
                    style={{
                      flex: 1,
                      color: "#FFFFFF",
                      fontSize: 16,
                      paddingVertical: 12,
                      paddingHorizontal: 10,
                    }}
                  />
                  {searchQuery.length > 0 && (
                    <Pressable onPress={() => setSearchQuery("")}>
                      <Ionicons name="close-circle" size={18} color="rgba(255, 255, 255, 0.4)" />
                    </Pressable>
                  )}
                </View>
              </View>

              {/* Manual Entry Toggle */}
              <Pressable
                onPress={() => setShowManualEntry(!showManualEntry)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginHorizontal: 16,
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  backgroundColor: showManualEntry ? `${config.color}15` : "rgba(255, 255, 255, 0.05)",
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: showManualEntry ? `${config.color}40` : "rgba(255, 255, 255, 0.08)",
                  marginBottom: 8,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons
                    name="keypad"
                    size={20}
                    color={showManualEntry ? config.color : "rgba(255, 255, 255, 0.6)"}
                  />
                  <Text
                    style={{
                      color: showManualEntry ? config.color : "rgba(255, 255, 255, 0.8)",
                      fontSize: 15,
                      marginLeft: 10,
                      fontWeight: "500",
                    }}
                  >
                    Enter manually
                  </Text>
                </View>
                <Ionicons
                  name={showManualEntry ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={showManualEntry ? config.color : "rgba(255, 255, 255, 0.4)"}
                />
              </Pressable>

              {/* Manual Entry Input */}
              {showManualEntry && (
                <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <TextInput
                      value={manualInput}
                      onChangeText={setManualInput}
                      placeholder={getPlaceholder()}
                      placeholderTextColor="rgba(255, 255, 255, 0.3)"
                      keyboardType={getKeyboardType()}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={{
                        flex: 1,
                        backgroundColor: "rgba(255, 255, 255, 0.08)",
                        borderRadius: 12,
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        fontSize: 16,
                        color: "#FFFFFF",
                        borderWidth: 1,
                        borderColor: "rgba(255, 255, 255, 0.1)",
                      }}
                    />
                    <Pressable
                      onPress={handleManualAction}
                      disabled={!isValidManualInput()}
                      style={{
                        backgroundColor: isValidManualInput() ? config.color : "rgba(255, 255, 255, 0.1)",
                        paddingHorizontal: 20,
                        borderRadius: 12,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons
                        name={config.icon}
                        size={22}
                        color={isValidManualInput() ? "#000000" : "rgba(255, 255, 255, 0.3)"}
                      />
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Contacts List */}
              {loading ? (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                  <ActivityIndicator color={config.color} size="large" />
                  <Text style={{ color: "rgba(255, 255, 255, 0.5)", marginTop: 12 }}>
                    Loading contacts...
                  </Text>
                </View>
              ) : permissionStatus !== "granted" && !showManualEntry ? (
                renderPermissionRequest()
              ) : (
                <FlatList
                  data={filteredContacts}
                  keyExtractor={(item) => item.id}
                  renderItem={renderContact}
                  contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
                  showsVerticalScrollIndicator={false}
                  keyboardDismissMode="on-drag"
                  ListEmptyComponent={
                    <View style={{ alignItems: "center", paddingVertical: 40 }}>
                      <Ionicons name="people-outline" size={48} color="rgba(255, 255, 255, 0.2)" />
                      <Text style={{ color: "rgba(255, 255, 255, 0.4)", marginTop: 12 }}>
                        {searchQuery ? "No contacts found" : "No contacts available"}
                      </Text>
                    </View>
                  }
                  ListHeaderComponent={
                    filteredContacts.some((c) => c.source === "deal") ? (
                      <View
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          backgroundColor: "rgba(245, 158, 11, 0.1)",
                        }}
                      >
                        <Text style={{ color: "#F59E0B", fontSize: 12, fontWeight: "600" }}>
                          DEAL CONTACTS
                        </Text>
                      </View>
                    ) : null
                  }
                />
              )}
            </View>
          </BlurView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
