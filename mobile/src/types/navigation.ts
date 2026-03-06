export type NegotiationMode = "on-call" | "in-person" | "writing";

export type RootStackParamList = {
  NegotiationHome: undefined;
  Dashboard: undefined;
  TransactionDetail: { transactionId: string };
  EmailGenerator: undefined;
  WeeklySummary: undefined;
  ContractUpload: undefined;
  CoachingScript: undefined;
  DailyDigest: undefined;
  Settings: undefined;
  ModeSelection: undefined;
  LiveCoaching: { mode: NegotiationMode };
  LiveDealGuidance: undefined;
  DealContextMemory: { contextId?: string } | undefined;
  SavedDeals: undefined;
  Assistant: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
