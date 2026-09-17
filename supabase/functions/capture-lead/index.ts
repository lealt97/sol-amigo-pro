import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const OFFICIAL_ORIGINS = new Set([
  "https://lealt97.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

const preflightHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
};

const responseHeaders = (origin: string | null, isPublicConfig = false) => ({
  "Access-Control-Allow-Origin": isPublicConfig ? "*" : origin ?? "null",
  "Access-Control-Allow-Headers": preflightHeaders["Access-Control-Allow-Headers"],
  "Access-Control-Allow-Methods": preflightHeaders["Access-Control-Allow-Methods"],
  Vary: "Origin",
  "Content-Type": "application/json; charset=utf-8",
  // As configurações do widget precisam refletir alterações de identidade visual
  // imediatamente após o usuário salvar, inclusive em sites já instalados.
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
});

const json = (
  body: Record<string, unknown>,
  status = 200,
  origin: string | null = null,
  isPublicConfig = false,
  extraHeaders: Record<string, string> = {},
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...responseHeaders(origin, isPublicConfig), ...extraHeaders },
  });

const asText = (value: unknown, maxLength: number) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const asOptionalText = (value: unknown, maxLength: number) => {
  const normalized = asText(value, maxLength);
  return normalized || null;
};

const asOptionalNumber = (value: unknown) => {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const normalizeOrigin = (value: unknown): string | null => {
  const raw = asText(value, 300);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
};

const normalizePublicImageUrls = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const raw = asText(item, 700);
    if (!raw) return [];
    try {
      const url = new URL(raw);
      return url.protocol === "https:" ? [url.toString()] : [];
    } catch {
      return [];
    }
  }).slice(0, 3);
};

const sha256 = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const getClientAddress = (req: Request) => {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return req.headers.get("cf-connecting-ip")?.trim()
    || forwarded
    || req.headers.get("x-real-ip")?.trim()
    || "unknown";
};

const PROPERTY_TYPES = new Set(["Residencial", "Comercial", "Rural", "Industrial"]);
const PROPERTY_STATUSES = new Set(["Próprio", "Alugado", "Em construção", "Outro"]);
const ACCIDENTAL_DUPLICATE_WINDOW_MS = 10 * 60 * 1000;
const ENERGY_BILL_BUCKET = "lead-energy-bills";
const MAX_ENERGY_BILL_BYTES = 8 * 1024 * 1024;
const MAX_MULTIPART_BODY_BYTES = 9 * 1024 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const DEFAULT_FORM_BORDER_RADIUS = 12;
const THEME_COLOR_KEYS = [
  "pageBackground", "cardBackground", "headerBackground", "headerText",
  "headerMutedText", "bodyText", "mutedText", "inputBackground", "inputBorder",
  "inputText", "primaryButtonBackground", "primaryButtonText",
  "primaryButtonHover", "primaryButtonHoverText",
  "secondaryButtonBackground", "secondaryButtonText", "progressActive",
  "progressInactive", "consentBackground", "successBackground", "successAccent",
  "errorBackground", "errorAccent",
] as const;

const normalizeThemeColors = (value: unknown) => {
  const candidate = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const colors: Record<string, unknown> = Object.fromEntries(THEME_COLOR_KEYS.flatMap((key) => {
    const color = asText(candidate[key], 7).toUpperCase();
    return HEX_COLOR_PATTERN.test(color) ? [[key, color]] : [];
  }));
  if (typeof candidate._floatingButtonLogoUrl === 'string') {
    colors._floatingButtonLogoUrl = candidate._floatingButtonLogoUrl.slice(0, 500);
  }
  if (typeof candidate._widgetMode === 'string') {
    colors._widgetMode = candidate._widgetMode;
  }
  colors._borderRadiusMode = candidate._borderRadiusMode === 'manual' ? 'manual' : 'automatic';
  const radius = Number(candidate._borderRadius);
  colors._borderRadius = Number.isFinite(radius)
    ? Math.round(Math.min(24, Math.max(0, radius)))
    : DEFAULT_FORM_BORDER_RADIUS;
  return colors;
};

type EnergyBillUpload = {
  bytes: Uint8Array;
  contentSha256: string;
  extension: "pdf" | "jpg" | "png";
  mimeType: "application/pdf" | "image/jpeg" | "image/png";
  originalName: string;
  sizeBytes: number;
};

class InputError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "InputError";
    this.status = status;
  }
}

const sha256Bytes = async (bytes: Uint8Array) => {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const safeOriginalFileName = (value: string, extension: EnergyBillUpload["extension"]) => {
  const normalized = value
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[\\/]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
  return normalized || `conta-de-luz.${extension}`;
};

const validateEnergyBill = async (file: File): Promise<EnergyBillUpload> => {
  if (file.size < 1) throw new InputError("O arquivo da conta de luz está vazio.");
  if (file.size > MAX_ENERGY_BILL_BYTES) {
    throw new InputError("A conta de luz deve ter no máximo 8 MB.", 413);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const isPdf = bytes.length >= 5
    && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44
    && bytes[3] === 0x46 && bytes[4] === 0x2d;
  const isJpeg = bytes.length >= 3
    && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes.length >= 8
    && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e
    && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a
    && bytes[6] === 0x1a && bytes[7] === 0x0a;

  let extension: EnergyBillUpload["extension"];
  let mimeType: EnergyBillUpload["mimeType"];
  if (isPdf) {
    extension = "pdf";
    mimeType = "application/pdf";
  } else if (isJpeg) {
    extension = "jpg";
    mimeType = "image/jpeg";
  } else if (isPng) {
    extension = "png";
    mimeType = "image/png";
  } else {
    throw new InputError("Envie a conta de luz em PDF, JPG ou PNG.");
  }

  return {
    bytes,
    contentSha256: await sha256Bytes(bytes),
    extension,
    mimeType,
    originalName: safeOriginalFileName(file.name, extension),
    sizeBytes: bytes.byteLength,
  };
};

type CaptureForm = {
  id: string;
  user_id: string;
  active: boolean;
  widget_enabled: boolean;
  allowed_origins: string[];
  service_states: string[];
  widget_mode: "inline" | "modal";
  company_name: string;
  logo_url: string | null;
  side_image_url: string | null;
  side_image_urls: string[];
  side_image_rotation_enabled: boolean;
  color_mode: "automatic" | "detailed";
  primary_color: string;
  secondary_color: string;
  surface_color: string;
  theme_colors: Record<string, unknown>;
  headline: string;
  subheadline: string;
  submit_label: string;
  success_message: string;
  privacy_url: string | null;
  show_powered_by: boolean;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: preflightHeaders });
  }

  const requestOrigin = normalizeOrigin(req.headers.get("origin"));
  if (req.method !== "GET" && req.method !== "POST") {
    return json({ error: "Método não permitido." }, 405, requestOrigin);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing server configuration");

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let input: Record<string, unknown> = {};
    let energyBillFile: File | null = null;
    if (req.method === "POST") {
      const contentType = req.headers.get("content-type")?.toLowerCase() ?? "";
      const contentLength = Number(req.headers.get("content-length") ?? 0);
      if (contentLength > MAX_MULTIPART_BODY_BYTES) {
        return json({ error: "A conta de luz deve ter no máximo 8 MB." }, 413, requestOrigin);
      }

      if (contentType.includes("multipart/form-data")) {
        const body = await req.formData().catch(() => null);
        const rawPayload = body?.get("payload");
        if (!body || typeof rawPayload !== "string") {
          return json({ error: "Dados inválidos." }, 400, requestOrigin);
        }
        const parsedPayload = (() => {
          try {
            return JSON.parse(rawPayload);
          } catch {
            return null;
          }
        })();
        if (!parsedPayload || typeof parsedPayload !== "object") {
          return json({ error: "Dados inválidos." }, 400, requestOrigin);
        }
        input = parsedPayload as Record<string, unknown>;
        const candidateFile = body.get("energyBill");
        energyBillFile = candidateFile instanceof File && candidateFile.size > 0
          ? candidateFile
          : null;
      } else {
        const body = await req.json().catch(() => null);
        if (!body || typeof body !== "object") {
          return json({ error: "Dados inválidos." }, 400, requestOrigin);
        }
        input = body as Record<string, unknown>;
      }

      // Campo-isca com nome incomum para evitar preenchimento automático por navegadores.
      if (asText(input.companyFax, 200)) return json({ success: true }, 202, requestOrigin);
    }

    const requestUrl = new URL(req.url);
    const formToken = asText(
      req.method === "GET" ? requestUrl.searchParams.get("formToken") : input.formToken,
      64,
    );

    if (!UUID_PATTERN.test(formToken)) {
      return json({ error: "Formulário indisponível." }, 404, requestOrigin, req.method === "GET");
    }

    const { data: formData, error: formError } = await admin
      .from("lead_capture_forms")
      .select("id, user_id, active, widget_enabled, allowed_origins, service_states, widget_mode, company_name, logo_url, side_image_url, side_image_urls, side_image_rotation_enabled, color_mode, primary_color, secondary_color, surface_color, theme_colors, headline, subheadline, submit_label, success_message, privacy_url, show_powered_by")
      .eq("public_token", formToken)
      .maybeSingle();

    if (formError) throw formError;
    const form = formData as CaptureForm | null;
    if (!form?.active) {
      return json({ error: "Formulário indisponível." }, 404, requestOrigin, req.method === "GET");
    }

    const allowedOrigins = (form.allowed_origins ?? [])
      .map(normalizeOrigin)
      .filter((origin): origin is string => Boolean(origin));

    if (req.method === "GET") {
      const siteOriginRaw = requestUrl.searchParams.get("siteOrigin");
      const siteOrigin = normalizeOrigin(siteOriginRaw);
      if (siteOriginRaw && (!siteOrigin || !form.widget_enabled || !allowedOrigins.includes(siteOrigin))) {
        return json({ error: "Este domínio não está autorizado para usar o formulário." }, 403, requestOrigin, true);
      }

      const configuredImages = normalizePublicImageUrls(form.side_image_urls);
      const legacyImages = normalizePublicImageUrls(form.side_image_url ? [form.side_image_url] : []);
      const sideImageUrls = configuredImages.length ? configuredImages : legacyImages;
      const floatingButtonLogo = typeof form.theme_colors?._floatingButtonLogoUrl === 'string' && form.theme_colors._floatingButtonLogoUrl.trim()
        ? form.theme_colors._floatingButtonLogoUrl.trim()
        : form.logo_url;
      const normalizedThemeColors = normalizeThemeColors(form.theme_colors);
      return json({
        companyName: form.company_name,
        logoUrl: form.logo_url,
        floatingButtonLogoUrl: floatingButtonLogo,
        sideImageUrls,
        sideImageRotationEnabled: form.side_image_rotation_enabled && sideImageUrls.length > 1,
        colorMode: form.color_mode === "detailed" ? "detailed" : "automatic",
        primaryColor: form.primary_color,
        secondaryColor: form.secondary_color,
        surfaceColor: form.surface_color,
        themeColors: normalizedThemeColors,
        borderRadiusMode: normalizedThemeColors._borderRadiusMode,
        borderRadius: normalizedThemeColors._borderRadius,
        headline: form.headline,
        subheadline: form.subheadline,
        submitLabel: form.submit_label,
        successMessage: form.success_message,
        privacyUrl: form.privacy_url,
        showPoweredBy: form.show_powered_by,
        serviceStates: form.service_states,
        widgetMode: form.widget_mode,
      }, 200, requestOrigin, true);
    }

    if (!requestOrigin) {
      return json({ error: "Origem da solicitação ausente." }, 403, null);
    }

    const isOfficialOrigin = OFFICIAL_ORIGINS.has(requestOrigin);
    const claimedSiteOrigin = normalizeOrigin(input.siteOrigin);
    const isAllowedWidgetOrigin = form.widget_enabled
      && allowedOrigins.includes(requestOrigin)
      && claimedSiteOrigin === requestOrigin;

    if (!isOfficialOrigin && !isAllowedWidgetOrigin) {
      return json({ error: "Este domínio não está autorizado para enviar o formulário." }, 403, requestOrigin);
    }

    const rateLimitSalt = Deno.env.get("RATE_LIMIT_SALT") || serviceRoleKey;
    const ipHash = await sha256(`${rateLimitSalt}:ip:${getClientAddress(req)}`);
    const globalHash = await sha256(`${rateLimitSalt}:form:${form.id}`);

    const [{ data: ipAllowed, error: ipLimitError }, { data: formAllowed, error: formLimitError }] = await Promise.all([
      admin.rpc("consume_lead_capture_rate_limit", {
        p_form_id: form.id,
        p_key_hash: ipHash,
        p_max_requests: 8,
        p_window_seconds: 600,
      }),
      admin.rpc("consume_lead_capture_rate_limit", {
        p_form_id: form.id,
        p_key_hash: globalHash,
        p_max_requests: 120,
        p_window_seconds: 3600,
      }),
    ]);

    if (ipLimitError || formLimitError) throw ipLimitError || formLimitError;
    if (!ipAllowed || !formAllowed) {
      return json(
        { error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." },
        429,
        requestOrigin,
        false,
        { "Retry-After": "600" },
      );
    }

    const name = asText(input.name, 120);
    const phone = asText(input.phone, 30);
    const phoneNormalized = phone.replace(/\D/g, "");
    const email = asOptionalText(input.email, 160)?.toLowerCase() ?? null;
    const city = asText(input.city, 120);
    const state = asText(input.state, 2).toUpperCase();
    const propertyType = asText(input.propertyType, 30);
    const propertyStatus = asOptionalText(input.propertyStatus, 30);
    const consent = input.consent === true;

    if (name.length < 2) return json({ error: "Informe seu nome." }, 400, requestOrigin);
    if (phoneNormalized.length < 10 || phoneNormalized.length > 13) {
      return json({ error: "Informe um WhatsApp válido com DDD." }, 400, requestOrigin);
    }
    if (email && !EMAIL_PATTERN.test(email)) {
      return json({ error: "Informe um e-mail válido." }, 400, requestOrigin);
    }
    if (city.length < 2 || !/^[A-Z]{2}$/.test(state)) {
      return json({ error: "Informe a cidade e o estado." }, 400, requestOrigin);
    }
    if (!(form.service_states ?? []).includes(state)) {
      return json({ error: "Este integrador ainda não atende o estado selecionado." }, 422, requestOrigin);
    }
    if (!PROPERTY_TYPES.has(propertyType)) {
      return json({ error: "Selecione o tipo do imóvel." }, 400, requestOrigin);
    }
    if (propertyStatus && !PROPERTY_STATUSES.has(propertyStatus)) {
      return json({ error: "Situação do imóvel inválida." }, 400, requestOrigin);
    }
    if (!consent) {
      return json({ error: "É necessário autorizar o contato." }, 400, requestOrigin);
    }

    const averageMonthlyBill = asOptionalNumber(input.averageMonthlyBill);
    const averageConsumptionKWh = asOptionalNumber(input.averageConsumptionKWh);
    if (averageMonthlyBill === null && averageConsumptionKWh === null) {
      return json({ error: "Informe o valor médio da conta ou o consumo em kWh." }, 400, requestOrigin);
    }
    const distributor = asOptionalText(input.distributor, 120);
    const installationTimeframe = asOptionalText(input.installationTimeframe, 80);
    const preferredContactTime = asOptionalText(input.preferredContactTime, 80);
    const energyBill = energyBillFile ? await validateEnergyBill(energyBillFile) : null;
    const submissionFingerprint = await sha256(JSON.stringify([
      form.id,
      name.toLowerCase(),
      phoneNormalized,
      email,
      city.toLowerCase(),
      state,
      propertyType,
      propertyStatus,
      averageMonthlyBill,
      averageConsumptionKWh,
      distributor?.toLowerCase() ?? null,
      installationTimeframe?.toLowerCase() ?? null,
      preferredContactTime?.toLowerCase() ?? null,
    ]));

    const persistEnergyBill = async (leadId: string) => {
      if (!energyBill) return false;

      const { data: existingDocument, error: existingDocumentError } = await admin
        .from("lead_documents")
        .select("id")
        .eq("lead_id", leadId)
        .eq("document_type", "energy_bill")
        .eq("content_sha256", energyBill.contentSha256)
        .maybeSingle();
      if (existingDocumentError) throw existingDocumentError;
      if (existingDocument) return false;

      const objectPath = `${form.user_id}/${leadId}/${crypto.randomUUID()}.${energyBill.extension}`;
      const { error: uploadError } = await admin.storage
        .from(ENERGY_BILL_BUCKET)
        .upload(objectPath, energyBill.bytes, {
          cacheControl: "0",
          contentType: energyBill.mimeType,
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const { error: documentError } = await admin.from("lead_documents").insert({
        user_id: form.user_id,
        lead_id: leadId,
        document_type: "energy_bill",
        bucket_id: ENERGY_BILL_BUCKET,
        object_path: objectPath,
        original_name: energyBill.originalName,
        mime_type: energyBill.mimeType,
        size_bytes: energyBill.sizeBytes,
        content_sha256: energyBill.contentSha256,
        uploaded_via: "public_form",
      });

      if (documentError) {
        await admin.storage.from(ENERGY_BILL_BUCKET).remove([objectPath]);
        if (documentError.code === "23505") return false;
        throw documentError;
      }

      const { error: activityError } = await admin.from("lead_activities").insert({
        user_id: form.user_id,
        lead_id: leadId,
        activity_type: "documento_recebido",
        title: "Conta de luz recebida",
        description: "O interessado enviou uma conta de luz pelo formulário do site.",
        metadata: {
          document_type: "energy_bill",
          mime_type: energyBill.mimeType,
          size_bytes: energyBill.sizeBytes,
        },
      });

      if (activityError) {
        await admin.from("lead_documents").delete().eq("object_path", objectPath);
        await admin.storage.from(ENERGY_BILL_BUCKET).remove([objectPath]);
        throw activityError;
      }
      return true;
    };

    const duplicateCutoff = new Date(Date.now() - ACCIDENTAL_DUPLICATE_WINDOW_MS).toISOString();
    const { data: duplicate, error: duplicateError } = await admin
      .from("leads")
      .select("id")
      .eq("user_id", form.user_id)
      .eq("submission_fingerprint", submissionFingerprint)
      .gte("created_at", duplicateCutoff)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (duplicateError) throw duplicateError;

    const now = new Date().toISOString();
    if (duplicate) {
      const documentUploaded = await persistEnergyBill(duplicate.id);
      const { error: updateError } = await admin
        .from("leads")
        .update({ last_submission_at: now, next_activity_at: now })
        .eq("id", duplicate.id)
        .eq("user_id", form.user_id);

      if (updateError) throw updateError;

      const { data: pendingTask, error: pendingTaskError } = await admin
        .from("lead_tasks")
        .select("id")
        .eq("lead_id", duplicate.id)
        .eq("status", "pendente")
        .limit(1)
        .maybeSingle();

      if (pendingTaskError) throw pendingTaskError;
      if (!pendingTask) {
        const { error: taskError } = await admin.from("lead_tasks").insert({
          user_id: form.user_id,
          lead_id: duplicate.id,
          title: "Retornar novo contato do site",
          due_at: now,
        });
        if (taskError) throw taskError;
      }

      return json({ success: true, duplicate: true, documentUploaded }, 200, requestOrigin);
    }

    const { data: lead, error: leadError } = await admin
      .from("leads")
      .insert({
        user_id: form.user_id,
        capture_form_id: form.id,
        name,
        phone,
        phone_normalized: phoneNormalized,
        email,
        city,
        state,
        property_type: propertyType,
        average_monthly_bill: averageMonthlyBill,
        average_consumption_kwh: averageConsumptionKWh,
        distributor,
        property_status: propertyStatus,
        installation_timeframe: installationTimeframe,
        preferred_contact_time: preferredContactTime,
        submission_fingerprint: submissionFingerprint,
        source: asOptionalText(input.source, 120) ?? "Formulário do site",
        landing_page: asOptionalText(input.landingPage, 500),
        utm_source: asOptionalText(input.utmSource, 160),
        utm_medium: asOptionalText(input.utmMedium, 160),
        utm_campaign: asOptionalText(input.utmCampaign, 160),
        utm_content: asOptionalText(input.utmContent, 160),
        utm_term: asOptionalText(input.utmTerm, 160),
        consent_at: now,
        next_activity_at: now,
      })
      .select("id")
      .single();

    if (leadError) throw leadError;
    let documentUploaded = false;
    try {
      documentUploaded = await persistEnergyBill(lead.id);

      const { error: taskError } = await admin.from("lead_tasks").insert({
        user_id: form.user_id,
        lead_id: lead.id,
        title: "Realizar primeiro contato",
        due_at: now,
      });
      if (taskError) throw taskError;
    } catch (operationError) {
      const { data: storedDocuments } = await admin
        .from("lead_documents")
        .select("bucket_id, object_path")
        .eq("lead_id", lead.id);
      for (const document of storedDocuments ?? []) {
        await admin.storage.from(document.bucket_id).remove([document.object_path]);
      }
      await admin.from("leads").delete().eq("id", lead.id).eq("user_id", form.user_id);
      throw operationError;
    }
    return json({ success: true, documentUploaded }, 201, requestOrigin);
  } catch (error) {
    if (error instanceof InputError) {
      return json({ error: error.message }, error.status, requestOrigin);
    }
    console.error("capture-lead error", error instanceof Error ? error.message : "unknown");
    return json({ error: "Não foi possível enviar seus dados. Tente novamente." }, 500, requestOrigin);
  }
});
