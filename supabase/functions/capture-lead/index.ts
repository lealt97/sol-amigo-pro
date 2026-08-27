import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
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

const PROPERTY_TYPES = new Set(["Residencial", "Comercial", "Rural", "Industrial"]);
const PROPERTY_STATUSES = new Set(["Próprio", "Alugado", "Em construção", "Outro"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "Dados inválidos." }, 400);

    const input = body as Record<string, unknown>;

    // Campo-isca: navegadores reais não o preenchem; bots genéricos costumam preencher.
    if (asText(input.website, 200)) return json({ success: true }, 202);

    const formToken = asText(input.formToken, 64);
    const name = asText(input.name, 120);
    const phone = asText(input.phone, 30);
    const phoneNormalized = phone.replace(/\D/g, "");
    const email = asOptionalText(input.email, 160)?.toLowerCase() ?? null;
    const city = asText(input.city, 120);
    const state = asText(input.state, 2).toUpperCase();
    const propertyType = asText(input.propertyType, 30);
    const propertyStatus = asOptionalText(input.propertyStatus, 30);
    const consent = input.consent === true;

    if (!UUID_PATTERN.test(formToken)) return json({ error: "Formulário indisponível." }, 404);
    if (name.length < 2) return json({ error: "Informe seu nome." }, 400);
    if (phoneNormalized.length < 10 || phoneNormalized.length > 13) {
      return json({ error: "Informe um WhatsApp válido com DDD." }, 400);
    }
    if (email && !EMAIL_PATTERN.test(email)) return json({ error: "Informe um e-mail válido." }, 400);
    if (city.length < 2 || !/^[A-Z]{2}$/.test(state)) {
      return json({ error: "Informe a cidade e o estado." }, 400);
    }
    if (!PROPERTY_TYPES.has(propertyType)) return json({ error: "Selecione o tipo do imóvel." }, 400);
    if (propertyStatus && !PROPERTY_STATUSES.has(propertyStatus)) {
      return json({ error: "Situação do imóvel inválida." }, 400);
    }
    if (!consent) return json({ error: "É necessário autorizar o contato." }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Configuração do servidor indisponível.");

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: form, error: formError } = await admin
      .from("lead_capture_forms")
      .select("id, user_id")
      .eq("public_token", formToken)
      .eq("active", true)
      .maybeSingle();

    if (formError) throw formError;
    if (!form) return json({ error: "Formulário indisponível." }, 404);

    const duplicateCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: phoneMatch, error: phoneMatchError } = await admin
      .from("leads")
      .select("id")
      .eq("user_id", form.user_id)
      .eq("phone_normalized", phoneNormalized)
      .gte("created_at", duplicateCutoff)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (phoneMatchError) throw phoneMatchError;

    let duplicate = phoneMatch;
    if (!duplicate && email) {
      const { data: emailMatch, error: emailMatchError } = await admin
        .from("leads")
        .select("id")
        .eq("user_id", form.user_id)
        .ilike("email", email)
        .gte("created_at", duplicateCutoff)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (emailMatchError) throw emailMatchError;
      duplicate = emailMatch;
    }

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

      return json({ success: true, duplicate: true }, 200);
    }

    const averageMonthlyBill = asOptionalNumber(input.averageMonthlyBill);
    const averageConsumptionKWh = asOptionalNumber(input.averageConsumptionKWh);

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
        distributor: asOptionalText(input.distributor, 120),
        property_status: propertyStatus,
        installation_timeframe: asOptionalText(input.installationTimeframe, 80),
        preferred_contact_time: asOptionalText(input.preferredContactTime, 80),
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

    return json({ success: true }, 201);
  } catch (error) {
    console.error("capture-lead error", error);
    return json({ error: "Não foi possível enviar seus dados. Tente novamente." }, 500);
  }
});
