// @ts-nocheck
import { invokeLLM } from "../_core/llm";

/**
 * DeepSeek OCR Service
 * Uses DeepSeek's vision capabilities to extract structured data from C of O documents
 */

export interface CofOExtractionResult {
  success: boolean;
  data?: {
    cofONumber: string;
    state: string;
    lga?: string;
    propertyAddress?: string;
    ownerName?: string;
    issueDate?: string;
    expiryDate?: string;
    landSize?: string;
    plotNumber?: string;
    registrationNumber?: string;
    purpose?: string;
    additionalInfo?: Record<string, string>;
  };
  confidence: number; // 0-100
  rawText?: string;
  error?: string;
}

export class DeepSeekOCRService {
  /**
   * Extract C of O data from document image
   * @param imageUrl - Public URL or base64 data URL of the C of O document
   * @returns Structured extraction result
   */
  async extractCofOData(imageUrl: string): Promise<CofOExtractionResult> {
    try {
      // Use DeepSeek's vision model to analyze the document
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are an expert OCR system specialized in extracting data from Nigerian Certificate of Occupancy (C of O) documents. 

Your task is to:
1. Carefully read and extract all text from the document
2. Identify and extract key fields with high accuracy
3. Return structured JSON data
4. Provide a confidence score based on document quality and clarity

Key fields to extract:
- cofONumber: The certificate number (often labeled as "Certificate No.", "C of O No.", etc.)
- state: The state where the property is located
- lga: Local Government Area
- propertyAddress: Full property address
- ownerName: Name of the certificate holder/owner
- issueDate: Date the certificate was issued
- expiryDate: Expiry date (if applicable)
- landSize: Size of the land (e.g., "500 sqm", "2 hectares")
- plotNumber: Plot number
- registrationNumber: Registration number at the land registry
- purpose: Purpose of the certificate (residential, commercial, etc.)

Return ONLY valid JSON in this exact format:
{
  "cofONumber": "string",
  "state": "string",
  "lga": "string or null",
  "propertyAddress": "string or null",
  "ownerName": "string or null",
  "issueDate": "string or null",
  "expiryDate": "string or null",
  "landSize": "string or null",
  "plotNumber": "string or null",
  "registrationNumber": "string or null",
  "purpose": "string or null",
  "confidence": number (0-100),
  "additionalInfo": {} or null
}

If you cannot extract a field, set it to null. The confidence score should reflect the overall quality and clarity of the document.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please extract all information from this Certificate of Occupancy document. Return the data in the specified JSON format.",
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                  detail: "high", // Request high-resolution analysis
                },
              },
            ],
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "cofo_extraction",
            strict: true,
            schema: {
              type: "object",
              properties: {
                cofONumber: { type: "string" },
                state: { type: "string" },
                lga: { type: ["string", "null"] },
                propertyAddress: { type: ["string", "null"] },
                ownerName: { type: ["string", "null"] },
                issueDate: { type: ["string", "null"] },
                expiryDate: { type: ["string", "null"] },
                landSize: { type: ["string", "null"] },
                plotNumber: { type: ["string", "null"] },
                registrationNumber: { type: ["string", "null"] },
                purpose: { type: ["string", "null"] },
                confidence: { type: "number" },
                additionalInfo: {
                  type: ["object", "null"],
                  additionalProperties: { type: "string" },
                },
              },
              required: ["cofONumber", "state", "confidence"],
              additionalProperties: false,
            },
          },
        },
      });

      // Parse the response
      const content = response.choices[0]?.message?.content;
      if (!content) {
        return {
          success: false,
          confidence: 0,
          error: "No response from OCR service",
        };
      }

      const extractedData = JSON.parse(content);

      // Validate required fields
      if (!extractedData.cofONumber || !extractedData.state) {
        return {
          success: false,
          confidence: extractedData.confidence || 0,
          error: "Missing required fields (cofONumber or state)",
          data: extractedData,
        };
      }

      return {
        success: true,
        data: {
          cofONumber: extractedData.cofONumber,
          state: extractedData.state,
          lga: extractedData.lga || undefined,
          propertyAddress: extractedData.propertyAddress || undefined,
          ownerName: extractedData.ownerName || undefined,
          issueDate: extractedData.issueDate || undefined,
          expiryDate: extractedData.expiryDate || undefined,
          landSize: extractedData.landSize || undefined,
          plotNumber: extractedData.plotNumber || undefined,
          registrationNumber: extractedData.registrationNumber || undefined,
          purpose: extractedData.purpose || undefined,
          additionalInfo: extractedData.additionalInfo || undefined,
        },
        confidence: extractedData.confidence || 0,
      };
    } catch (error: any) {
      console.error("[DeepSeekOCR] Extraction failed:", error);
      return {
        success: false,
        confidence: 0,
        error: error.message || "OCR extraction failed",
      };
    }
  }

  /**
   * Extract raw text from document (fallback method)
   * @param imageUrl - Public URL or base64 data URL of the document
   * @returns Raw extracted text
   */
  async extractRawText(imageUrl: string): Promise<string> {
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "You are an OCR system. Extract all text from the image exactly as it appears, preserving line breaks and formatting as much as possible.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please extract all text from this document.",
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                  detail: "high",
                },
              },
            ],
          },
        ],
      });

      return response.choices[0]?.message?.content || "";
    } catch (error: any) {
      console.error("[DeepSeekOCR] Raw text extraction failed:", error);
      return "";
    }
  }

  /**
   * Validate C of O document authenticity using visual analysis
   * @param imageUrl - Public URL or base64 data URL of the document
   * @returns Validation result with authenticity indicators
   */
  async validateDocumentAuthenticity(imageUrl: string): Promise<{
    isLikelyAuthentic: boolean;
    confidence: number;
    indicators: {
      hasWatermark: boolean;
      hasOfficialSeal: boolean;
      hasSignatures: boolean;
      documentQuality: "high" | "medium" | "low";
      suspiciousElements: string[];
    };
    reasoning: string;
  }> {
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a document authenticity expert specializing in Nigerian government documents. 

Analyze this Certificate of Occupancy document for authenticity indicators:
1. Presence of official watermarks
2. Government seals or stamps
3. Signatures and official markings
4. Document quality and printing
5. Any suspicious or altered elements

Return your analysis in JSON format:
{
  "isLikelyAuthentic": boolean,
  "confidence": number (0-100),
  "indicators": {
    "hasWatermark": boolean,
    "hasOfficialSeal": boolean,
    "hasSignatures": boolean,
    "documentQuality": "high" | "medium" | "low",
    "suspiciousElements": ["list of suspicious elements if any"]
  },
  "reasoning": "brief explanation of your assessment"
}`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please analyze this C of O document for authenticity. Look for official markings, seals, watermarks, and any signs of tampering or forgery.",
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                  detail: "high",
                },
              },
            ],
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "authenticity_validation",
            strict: true,
            schema: {
              type: "object",
              properties: {
                isLikelyAuthentic: { type: "boolean" },
                confidence: { type: "number" },
                indicators: {
                  type: "object",
                  properties: {
                    hasWatermark: { type: "boolean" },
                    hasOfficialSeal: { type: "boolean" },
                    hasSignatures: { type: "boolean" },
                    documentQuality: {
                      type: "string",
                      enum: ["high", "medium", "low"],
                    },
                    suspiciousElements: {
                      type: "array",
                      items: { type: "string" },
                    },
                  },
                  required: [
                    "hasWatermark",
                    "hasOfficialSeal",
                    "hasSignatures",
                    "documentQuality",
                    "suspiciousElements",
                  ],
                  additionalProperties: false,
                },
                reasoning: { type: "string" },
              },
              required: ["isLikelyAuthentic", "confidence", "indicators", "reasoning"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from validation service");
      }

      return JSON.parse(content);
    } catch (error: any) {
      console.error("[DeepSeekOCR] Authenticity validation failed:", error);
      return {
        isLikelyAuthentic: false,
        confidence: 0,
        indicators: {
          hasWatermark: false,
          hasOfficialSeal: false,
          hasSignatures: false,
          documentQuality: "low",
          suspiciousElements: ["Analysis failed"],
        },
        reasoning: `Validation failed: ${error.message}`,
      };
    }
  }

  /**
   * Compare two C of O documents for similarity
   * @param imageUrl1 - First document URL
   * @param imageUrl2 - Second document URL
   * @returns Similarity analysis
   */
  async compareDocuments(
    imageUrl1: string,
    imageUrl2: string
  ): Promise<{
    areSimilar: boolean;
    similarityScore: number; // 0-100
    differences: string[];
    reasoning: string;
  }> {
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a document comparison expert. Compare these two Certificate of Occupancy documents and identify:
1. Overall similarity
2. Key differences in content, layout, or formatting
3. Whether they appear to be from the same authority

Return JSON:
{
  "areSimilar": boolean,
  "similarityScore": number (0-100),
  "differences": ["list of differences"],
  "reasoning": "explanation"
}`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Compare these two C of O documents. Document 1:",
              },
              {
                type: "image_url",
                image_url: { url: imageUrl1, detail: "high" },
              },
              {
                type: "text",
                text: "Document 2:",
              },
              {
                type: "image_url",
                image_url: { url: imageUrl2, detail: "high" },
              },
            ],
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "document_comparison",
            strict: true,
            schema: {
              type: "object",
              properties: {
                areSimilar: { type: "boolean" },
                similarityScore: { type: "number" },
                differences: {
                  type: "array",
                  items: { type: "string" },
                },
                reasoning: { type: "string" },
              },
              required: ["areSimilar", "similarityScore", "differences", "reasoning"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from comparison service");
      }

      return JSON.parse(content);
    } catch (error: any) {
      console.error("[DeepSeekOCR] Document comparison failed:", error);
      return {
        areSimilar: false,
        similarityScore: 0,
        differences: ["Comparison failed"],
        reasoning: `Comparison failed: ${error.message}`,
      };
    }
  }
}

export const deepseekOCRService = new DeepSeekOCRService();
