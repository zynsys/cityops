import { AzureOpenAI } from "openai";
import { prisma } from "@/lib/prisma";
import type { ReportStatus, AiValidationOutcome } from "@/generated/prisma/enums";
import { awardPoints } from "@/lib/rewards";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AiOutcome = AiValidationOutcome;

interface ParsedAiResponse {
  outcome: AiOutcome;
  confidenceScore: number;
  reasonCodes: string[];
  reasonText: string;
}

interface AiValidationConfig {
  enabled: boolean;
  confidenceThreshold: number;
  autoRejectInvalid: boolean;
}

// ---------------------------------------------------------------------------
// Azure OpenAI client (lazy singleton — instantiated on first call)
// ---------------------------------------------------------------------------

let _client: AzureOpenAI | null = null;

function getClient(): AzureOpenAI {
  if (_client) return _client;

  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;

  if (!endpoint || !apiKey || !deployment) {
    throw new Error(
      "[AI Validation] Missing required env vars: AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, AZURE_OPENAI_DEPLOYMENT"
    );
  }

  _client = new AzureOpenAI({
    endpoint,
    apiKey,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? "2024-02-01",
    deployment,
  });

  return _client;
}

// ---------------------------------------------------------------------------
// Tenant config helpers
// ---------------------------------------------------------------------------

const CONFIG_DEFAULTS: AiValidationConfig = {
  enabled: true,
  confidenceThreshold: 0.65,
  autoRejectInvalid: true,
};

async function getAiConfig(tenantId: string): Promise<AiValidationConfig> {
  const row = await prisma.tenantConfig.findUnique({
    where: { tenantId_namespace: { tenantId, namespace: "ai_validation" } },
    select: { config: true },
  });

  if (!row) return CONFIG_DEFAULTS;

  const raw = row.config as Record<string, unknown>;
  return {
    enabled: typeof raw.enabled === "boolean" ? raw.enabled : CONFIG_DEFAULTS.enabled,
    confidenceThreshold:
      typeof raw.confidenceThreshold === "number"
        ? raw.confidenceThreshold
        : CONFIG_DEFAULTS.confidenceThreshold,
    autoRejectInvalid:
      typeof raw.autoRejectInvalid === "boolean"
        ? raw.autoRejectInvalid
        : CONFIG_DEFAULTS.autoRejectInvalid,
  };
}

// ---------------------------------------------------------------------------
// Outcome → Report status mapping
// ---------------------------------------------------------------------------

function outcomeToStatus(outcome: AiOutcome): ReportStatus {
  switch (outcome) {
    case "valid":
      return "validated";
    case "review_required":
      return "under_validation";
    case "invalid":
      return "invalid";
  }
}

// ---------------------------------------------------------------------------
// Prompt helpers
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a civic report moderation assistant. Evaluate the citizen-submitted report below for relevance, quality, and legitimacy.
Return ONLY a JSON object — no explanation, no markdown.
Schema: { "outcome": "valid"|"review_required"|"invalid", "confidenceScore": 0.00-1.00, "reasonCodes": string[], "reasonText": string }
Valid reasonCodes: category_mismatch, image_irrelevant, image_unusable, spam, abusive_content, duplicate_suspected.
Use reasonCodes only when they apply. outcome "valid" should have empty reasonCodes.
If "Nearby open reports" are provided and one or more is clearly the same issue at the same location, include "duplicate_suspected" in reasonCodes and set outcome to "review_required".`;

// Only pass URLs that look publicly accessible (http/https, not local paths)
function isPublicUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

// ---------------------------------------------------------------------------
// Response parsing
// ---------------------------------------------------------------------------

const VALID_OUTCOMES = new Set<string>(["valid", "review_required", "invalid"]);

function parseAiResponse(raw: string): ParsedAiResponse {
  // Strip any accidental markdown code fence the model may have added
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return {
      outcome: "review_required",
      confidenceScore: 0,
      reasonCodes: [],
      reasonText: `AI response parsing failed. Raw: ${raw.slice(0, 200)}`,
    };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return {
      outcome: "review_required",
      confidenceScore: 0,
      reasonCodes: [],
      reasonText: "AI returned non-object JSON.",
    };
  }

  const obj = parsed as Record<string, unknown>;

  const outcome = VALID_OUTCOMES.has(String(obj.outcome))
    ? (obj.outcome as AiOutcome)
    : "review_required";

  const confidenceScore =
    typeof obj.confidenceScore === "number"
      ? Math.min(1, Math.max(0, obj.confidenceScore))
      : 0;

  const reasonCodes = Array.isArray(obj.reasonCodes)
    ? obj.reasonCodes.filter((c): c is string => typeof c === "string")
    : [];

  const reasonText =
    typeof obj.reasonText === "string" ? obj.reasonText : "";

  return { outcome, confidenceScore, reasonCodes, reasonText };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function validateReportWithAI(reportId: number): Promise<void> {
  // 1. Load report + attachments
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: {
      id: true,
      tenantId: true,
      reporterUserId: true,
      title: true,
      description: true,
      locationText: true,
      category: { select: { name: true } },
      attachments: {
        select: { storagePath: true },
        orderBy: { createdAt: "asc" },
        take: 3,
      },
    },
  });

  if (!report) {
    console.error(`[AI Validation] Report ${reportId} not found.`);
    return;
  }

  // 2a. Fetch coordinates + nearby open reports in one go
  interface NearbyRow { id: number; title: string; status: string }
  interface CoordsRow { latitude: number; longitude: number }
  let nearbyReports: NearbyRow[] = [];
  let coords: CoordsRow | null = null;
  try {
    const [coordRows, nearby] = await Promise.all([
      prisma.$queryRaw<CoordsRow[]>`
        SELECT
          ST_Y(location_point::geometry) AS latitude,
          ST_X(location_point::geometry) AS longitude
        FROM report
        WHERE id = ${reportId}
          AND location_point IS NOT NULL
      `,
      prisma.$queryRaw<NearbyRow[]>`
        SELECT r.id, r.title, r.status::text
        FROM report r
        WHERE r.id != ${reportId}
          AND r.tenant_id = ${report.tenantId}::uuid
          AND r.category_id = (SELECT category_id FROM report WHERE id = ${reportId})
          AND r.deleted_at IS NULL
          AND r.status NOT IN ('closed', 'invalid')
          AND r.location_point IS NOT NULL
          AND ST_DWithin(
            r.location_point,
            (SELECT location_point FROM report WHERE id = ${reportId}),
            200
          )
        ORDER BY r.created_at DESC
        LIMIT 5
      `,
    ]);
    coords = coordRows[0] ?? null;
    nearbyReports = nearby;
  } catch {
    // PostGIS unavailable or no location — proceed without location context
  }

  // 2. Check tenant config — bypass if AI is disabled
  const config = await getAiConfig(report.tenantId);

  if (!config.enabled) {
    console.warn(`[AI Validation] AI disabled for tenant — routing report ${reportId} to staff review.`);
    await prisma.report.update({
      where: { id: reportId },
      data: { status: "under_validation" },
    });
    return;
  }

  const isServiceConfigured =
    !!process.env.AZURE_OPENAI_ENDPOINT &&
    !!process.env.AZURE_OPENAI_API_KEY &&
    !!process.env.AZURE_OPENAI_DEPLOYMENT;

  if (!isServiceConfigured) {
    console.warn(`[AI Validation] Azure OpenAI not configured — routing report ${reportId} to staff review.`);
    await prisma.report.update({
      where: { id: reportId },
      data: { status: "under_validation" },
    });
    return;
  }

  const modelVersion = process.env.AI_MODEL_VERSION ?? "v1";

  // 3. Build prompt content parts
  const publicImageUrls = report.attachments
    .map((a) => a.storagePath)
    .filter(isPublicUrl);

  type ContentPart =
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } };

  const locationSection = [
    report.locationText ? `Location: ${report.locationText}` : null,
    coords ? `Coordinates: ${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const nearbySection =
    nearbyReports.length > 0
      ? `\n\nNearby open reports (same category, within 200 m):\n` +
        nearbyReports
          .map((r) => `- [#${r.id}] "${r.title}" (status: ${r.status})`)
          .join("\n")
      : "";

  const userContent: ContentPart[] = [
    {
      type: "text",
      text: [
        `Category: ${report.category.name}`,
        `Title: ${report.title}`,
        `Description: ${report.description}`,
        locationSection,
      ]
        .filter(Boolean)
        .join("\n") + nearbySection,
    },
    ...publicImageUrls.map(
      (url): ContentPart => ({ type: "image_url", image_url: { url } })
    ),
  ];

  // 4. Call Azure OpenAI
  let parsed: ParsedAiResponse;
  let rawResponse: unknown = null;

  try {
    const client = getClient();
    const response = await client.chat.completions.create(
      {
        model: process.env.AZURE_OPENAI_DEPLOYMENT!,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        temperature: 0,
        max_tokens: 300,
      },
      { timeout: 30_000 } // 30 second timeout
    );

    rawResponse = response;
    const content = response.choices[0]?.message?.content ?? "";
    console.log(`[AI Validation] Got response for report ${reportId}:`, content.slice(0, 100));
    parsed = parseAiResponse(content);
  } catch (err) {
    console.error(`[AI Validation] API call failed for report ${reportId}:`, err);
    parsed = {
      outcome: "review_required",
      confidenceScore: 0,
      reasonCodes: [],
      reasonText: `AI service error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // 5. Apply confidence threshold
  if (
    parsed.outcome === "valid" &&
    parsed.confidenceScore < config.confidenceThreshold
  ) {
    parsed.outcome = "review_required";
    parsed.reasonText =
      parsed.reasonText ||
      `Confidence ${parsed.confidenceScore} below threshold ${config.confidenceThreshold}.`;
  }

  // 6. Apply autoRejectInvalid override
  if (!config.autoRejectInvalid && parsed.outcome === "invalid") {
    parsed.outcome = "review_required";
  }

  const newStatus = outcomeToStatus(parsed.outcome);

  // 7. Persist result + status transition + activity in one transaction
  await prisma.$transaction(async (tx) => {
    const aiResult = await tx.aiValidationResult.create({
      data: {
        tenantId: report.tenantId,
        reportId: report.id,
        outcome: parsed.outcome,
        confidenceScore: parsed.confidenceScore,
        reasonCodes: parsed.reasonCodes,
        reasonText: parsed.reasonText || null,
        modelVersion,
        rawResponse: rawResponse ?? undefined,
      },
      select: { id: true },
    });

    await tx.report.update({
      where: { id: reportId },
      data: { status: newStatus },
    });

    await tx.reportActivity.create({
      data: {
        tenantId: report.tenantId,
        reportId: report.id,
        userId: null,
        action: "validation_completed",
        newValue: parsed.outcome,
        metadata: {
          aiResultId: aiResult.id,
          confidenceScore: parsed.confidenceScore,
        },
      },
    });
  });

  console.log(`[AI Validation] Completed for report ${reportId}: outcome=${parsed.outcome}, confidence=${parsed.confidenceScore}, status=${newStatus}`);

  // Award points to the reporter — only for valid reports
  if (parsed.outcome === "valid") {
    void awardPoints({
      tenantId: report.tenantId,
      userId: report.reporterUserId,
      points: 15,
      reason: "report_validated",
      referenceType: "report",
      referenceId: String(reportId),
    });
  }
}
