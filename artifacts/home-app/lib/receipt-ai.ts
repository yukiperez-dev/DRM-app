import { getApiBase } from "./api";

export const RECEIPT_EXTRACTION_CATEGORIES = [
  "Groceries",
  "Rent & Utilities",
  "Dining Out",
  "Transport",
  "Health",
  "Entertainment",
  "Travel",
  "Shopping",
  "Home",
  "Other",
] as const;

export type ReceiptExtractionCategory =
  (typeof RECEIPT_EXTRACTION_CATEGORIES)[number];

export interface ReceiptExtractionResult {
  title: string | null;
  date: string | null;
  amount: number | null;
  category: ReceiptExtractionCategory | null;
}

export async function extractReceiptFields(
  billImageBase64: string
): Promise<ReceiptExtractionResult> {
  const response = await fetch(`${getApiBase()}/expenses/extract-receipt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ billImageBase64 }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      typeof payload?.error === "string"
        ? payload.error
        : "Receipt extraction failed."
    );
  }

  return payload as ReceiptExtractionResult;
}
