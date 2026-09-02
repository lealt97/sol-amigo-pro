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
  "Cache-Control": isPublicConfig ? "public, max-age=60" : "no-store",
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
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SAFE_CSS_SELECTORS = new Set([
  ".sol-form", ".sol-form__page", ".sol-form__card", ".sol-form__header", ".sol-form__title",
  ".sol-form__subtitle", ".sol-form__field", ".sol-form__label", ".sol-form__input",
  ".sol-form__select", ".sol-form__button", ".sol-form__secondary-button",
  ".sol-form__progress", ".sol-form__consent", ".sol-form__success", ".sol-form__icon",
  ".sol-form__image",
  ".sol-form__powered-by",
]);
const SAFE_CSS_PROPERTIES = new Set([
  "background", "background-color", "border", "border-color", "border-radius",
  "border-style", "border-width", "box-shadow", "color", "font-family", "font-size",
  "font-style", "font-weight", "letter-spacing", "line-height", "margin", "margin-bottom",
  "margin-left", "margin-right", "margin-top", "max-width", "min-height", "padding",
  "padding-bottom", "padding-left", "padding-right", "padding-top", "text-align",
  "text-decoration", "text-transform", "width",
]);
const SELECTOR_ONLY_CSS_PROPERTIES: Record<string, Set<string>> = {
  ".sol-form__icon": new Set(["height"]),
  ".sol-form__image": new Set(["height", "object-fit", "object-position"]),
};

const isSafeCustomCss = (css: string) => {
  if (!css || css.length > 20_000 || /\/\*|@|url\s*\(|expression\s*\(|javascript\s*:|\\|<|>/i.test(css)) return false;
  if (css.replace(/[^{}]+\{[^{}]*\}/g, "").trim()) return false;
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = match[1].split(",").map((item) => item.trim()).filter(Boolean);
    const baseSelectors = selectors.map((selector) => selector.replace(/:(hover|focus|focus-visible)$/i, ""));
    for (const baseSelector of baseSelectors) {
      if (!SAFE_CSS_SELECTORS.has(baseSelector)) return false;
    }
    for (const declaration of match[2].split(";").map((item) => item.trim()).filter(Boolean)) {
      const separator = declaration.indexOf(":");
      if (separator < 1) return false;
      const property = declaration.slice(0, separator).trim().toLowerCase();
      const value = declaration.slice(separator + 1).trim();
      const selectorOnlyPropertyAllowed = baseSelectors.length > 0
        && baseSelectors.every((selector) => SELECTOR_ONLY_CSS_PROPERTIES[selector]?.has(property));
      const iconHeightInvalid = property === "height"
        && baseSelectors.every((selector) => selector === ".sol-form__icon")
        && !/^(?:[2-9]\d|1[0-5]\d|160)px$/i.test(value);
      const imageHeightInvalid = property === "height"
        && baseSelectors.every((selector) => selector === ".sol-form__image")
        && !/^(?:1[6-9]\d|[2-7]\d{2}|800)px$/i.test(value);
      const mixedHeightInvalid = property === "height"
        && !baseSelectors.every((selector) => selector === ".sol-form__icon")
        && !baseSelectors.every((selector) => selector === ".sol-form__image");
      const objectFitInvalid = property === "object-fit" && !/^(cover|contain)$/i.test(value);
      const objectPositionInvalid = property === "object-position"
        && !/^(center|top|bottom|left|right)( (center|top|bottom|left|right))?$/i.test(value);
      if ((!SAFE_CSS_PROPERTIES.has(property) && !selectorOnlyPropertyAllowed)
        || !value
        || iconHeightInvalid
        || imageHeightInvalid
        || mixedHeightInvalid
        || objectFitInvalid
        || objectPositionInvalid
        || /!important|var\s*\(|calc\s*\(|attr\s*\(|data:|https?:/i.test(value)) return false;
    }
  }
  return true;
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
  primary_color: string;
  secondary_color: string;
  headline: string;
  subheadline: string;
  submit_label: string;
  success_message: string;
  privacy_url: string | null;
  show_powered_by: boolean;
  custom_css_enabled: boolean;
  custom_css: string;
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
    if (req.method === "POST") {
      const body = await req.json().catch(() => null);
      if (!body || typeof body !== "object") {
        return json({ error: "Dados inválidos." }, 400, requestOrigin);
      }
      input = body as Record<string, unknown>;

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
      .select("id, user_id, active, widget_enabled, allowed_origins, service_states, widget_mode, company_name, logo_url, side_image_url, side_image_urls, side_image_rotation_enabled, primary_color, secondary_color, headline, subheadline, submit_label, success_message, privacy_url, show_powered_by, custom_css_enabled, custom_css")
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

      const customCssSafe = isSafeCustomCss(form.custom_css ?? "");
      const configuredImages = normalizePublicImageUrls(form.side_image_urls);
      const legacyImages = normalizePublicImageUrls(form.side_image_url ? [form.side_image_url] : []);
      const sideImageUrls = configuredImages.length ? configuredImages : legacyImages;
      return json({
        companyName: form.company_name,
        logoUrl: form.logo_url,
        sideImageUrls,
        sideImageRotationEnabled: form.side_image_rotation_enabled && sideImageUrls.length > 1,
        primaryColor: form.primary_color,
        secondaryColor: form.secondary_color,
        headline: form.headline,
        subheadline: form.subheadline,
        submitLabel: form.submit_label,
        successMessage: form.success_message,
        privacyUrl: form.privacy_url,
        showPoweredBy: form.show_powered_by,
        serviceStates: form.service_states,
        customCssEnabled: form.custom_css_enabled && customCssSafe,
        customCss: customCssSafe ? form.custom_css : "",
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
    const distributor = asOptionalText(input.distributor, 120);
    const installationTimeframe = asOptionalText(input.installationTimeframe, 80);
    const preferredContactTime = asOptionalText(input.preferredContactTime, 80);
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

      return json({ success: true, duplicate: true }, 200, requestOrigin);
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

    const { error: taskError } = await admin.from("lead_tasks").insert({
      user_id: form.user_id,
      lead_id: lead.id,
      title: "Realizar primeiro contato",
      due_at: now,
    });

    if (taskError) throw taskError;
    return json({ success: true }, 201, requestOrigin);
  } catch (error) {
    console.error("capture-lead error", error instanceof Error ? error.message : "unknown");
    return json({ error: "Não foi possível enviar seus dados. Tente novamente." }, 500, requestOrigin);
  }
});
