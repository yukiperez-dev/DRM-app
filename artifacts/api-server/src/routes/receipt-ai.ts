import { Router } from "express";

const router = Router();

const GEMINI_RECEIPT_MODEL = "gemini-3.1-flash-lite-preview";
const RECEIPT_CATEGORIES = [
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

type ReceiptCategory = (typeof RECEIPT_CATEGORIES)[number];

interface ReceiptExtractionResponse {
  title: string | null;
  date: string | null;
  amount: number | null;
  category: ReceiptCategory | null;
}

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);

  if (!match) {
    return null;
  }

  const [, mimeType, data] = match;
  return { mimeType, data };
}

function extractGeminiText(payload: any): string | null {
  const parts = payload?.candidates?.[0]?.content?.parts;

  if (!Array.isArray(parts)) {
    return null;
  }

  for (const part of parts) {
    if (typeof part?.text === "string" && part.text.trim()) {
      return part.text;
    }
  }

  return null;
}

function normalizeReceiptExtraction(value: any): ReceiptExtractionResponse {
  const rawTitle = typeof value?.title === "string" ? value.title.trim() : "";
  const rawDate = typeof value?.date === "string" ? value.date.trim() : "";
  const rawAmount =
    typeof value?.amount === "number"
      ? value.amount
      : typeof value?.amount === "string"
        ? Number(value.amount)
        : NaN;
  const rawCategory =
    typeof value?.category === "string" ? value.category.trim() : null;
  const category = RECEIPT_CATEGORIES.includes(rawCategory as ReceiptCategory)
    ? (rawCategory as ReceiptCategory)
    : "Other";

  return {
    title: rawTitle || null,
    date: /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : null,
    amount: Number.isFinite(rawAmount) && rawAmount > 0 ? rawAmount : null,
    category,
  };
}

router.post("/expenses/extract-receipt", async (req, res) => {
  const apiKey = process.env["GEMINI_API_KEY"]?.trim();

  if (!apiKey) {
    return res.status(503).json({
      error:
        "Missing GEMINI_API_KEY on the API server. Add it to the backend environment and try again.",
    });
  }

  const billImageBase64 =
    typeof req.body?.billImageBase64 === "string" ? req.body.billImageBase64 : "";
  const parsedImage = parseDataUrl(billImageBase64);

  if (!parsedImage) {
    return res.status(400).json({
      error: "A receipt image in data URL format is required.",
    });
  }

  try {
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_RECEIPT_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    mimeType: parsedImage.mimeType,
                    data: parsedImage.data,
                  },
                },
                {
                  text: [
                    "Extract the main expense details from this receipt.",
                    "Return the merchant or purchase title as a short title.",
                    "Return the purchase date in YYYY-MM-DD format.",
                    "Return the final total amount charged as a number without currency symbols.",
                    `Choose the category from this list only: ${RECEIPT_CATEGORIES.join(", ")}.`,
                    "If a field is unreadable or missing, return null for that field.",
                    "Do not invent values.",
                  ].join(" "),
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseJsonSchema: {
              type: "object",
              properties: {
                title: {
                  type: ["string", "null"],
                  description:
                    "Short expense title based on the merchant or purchase, for example 'Mercadona groceries'.",
                },
                date: {
                  type: ["string", "null"],
                  format: "date",
                  description: "Receipt purchase date in YYYY-MM-DD format.",
                },
                amount: {
                  type: ["number", "null"],
                  description:
                    "Final total amount charged on the receipt, without currency symbols.",
                },
                category: {
                  type: ["string", "null"],
                  enum: [...RECEIPT_CATEGORIES, null],
                  description: "Best matching category from the allowed list.",
                },
              },
              required: ["title", "date", "amount", "category"],
              additionalProperties: false,
            },
          },
        }),
      }
    );

    const payload: any = await geminiResponse.json();

    if (!geminiResponse.ok) {
      const message =
        payload?.error?.message ??
        payload?.error?.status ??
        "Gemini request failed.";
      return res.status(502).json({ error: message });
    }

    const text = extractGeminiText(payload);

    if (!text) {
      return res
        .status(502)
        .json({ error: "Gemini did not return a structured receipt response." });
    }

    const parsed = JSON.parse(text);
    return res.json(normalizeReceiptExtraction(parsed));
  } catch (error) {
    console.error("Failed to extract receipt fields", error);
    return res.status(500).json({ error: "Failed to extract receipt fields." });
  }
});

export default router;
