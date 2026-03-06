import { useState } from "react";
import { Deadline } from "../state/realtorStore";
import {
  extractContractDeadlines,
  ExtractedContractData,
} from "../api/contract-extraction";

/**
 * Custom hook for AI-powered contract extraction
 * Uses Claude API to extract real estate deadlines from PDF contracts
 */

interface ExtractionResult extends ExtractedContractData {
  confidence?: number;
}

export function useContractExtraction() {
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Extract deadlines from a contract using Claude API
   */
  const extractDeadlines = async (
    fileUri: string,
    fileName: string
  ): Promise<ExtractedContractData> => {
    setIsExtracting(true);
    setError(null);

    try {
      // Use Claude API to extract contract deadlines
      const extractedData = await extractContractDeadlines(fileUri, fileName);

      setIsExtracting(false);
      return extractedData;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Extraction failed";
      setError(errorMessage);
      setIsExtracting(false);
      throw err;
    }
  };

  return {
    extractDeadlines,
    isExtracting,
    error,
  };
}
