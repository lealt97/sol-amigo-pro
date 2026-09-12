import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const preflightHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
};

const responseHeaders = (origin: string | null = null) => ({
  "Access-Control-Allow-Origin": origin || "*",
  "Access-Control-Allow-Headers": preflightHeaders["Access-Control-Allow-Headers"],
  "Access-Control-Allow-Methods": preflightHeaders["Access-Control-Allow-Methods"],
  Vary: "Origin",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
});

const json = (
  body: Record<string, unknown>,
  status = 200,
  origin: string | null = null,
  extraHeaders: Record<string, string> = {},
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...responseHeaders(origin), ...extraHeaders },
  });

const asText = (value: unknown, maxLength: number) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: preflightHeaders });
  }

  const origin = req.headers.get("origin") || "*";

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "Configuração do servidor ausente." }, 500, origin);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const requestUrl = new URL(req.url);
    let token = asText(requestUrl.searchParams.get("token"), 64);
    let action = asText(requestUrl.searchParams.get("action"), 32) || "get";
    let inputBody: Record<string, unknown> = {};

    if (req.method === "POST") {
      const body = await req.json().catch(() => null);
      if (body && typeof body === "object") {
        inputBody = body as Record<string, unknown>;
        if (!token && inputBody.token) token = asText(inputBody.token, 64);
        if (inputBody.action) action = asText(inputBody.action, 32);
      }
    }

    if (!token || !UUID_PATTERN.test(token)) {
      return json({ error: "Token de proposta inválido ou ausente." }, 400, origin);
    }

    // Buscar proposta pelo token público
    const { data: proposal, error: propErr } = await admin
      .from("proposals")
      .select(`
        id,
        user_id,
        lead_id,
        code,
        public_token,
        status,
        current_version_number,
        total_value,
        valid_until,
        sent_at,
        viewed_at,
        decided_at,
        decision_notes,
        created_at
      `)
      .eq("public_token", token)
      .maybeSingle();

    if (propErr || !proposal) {
      return json({ error: "Proposta não encontrada ou link expirado." }, 404, origin);
    }

    // Buscar a versão atual
    const { data: version, error: verErr } = await admin
      .from("proposal_versions")
      .select("*")
      .eq("proposal_id", proposal.id)
      .eq("version_number", proposal.current_version_number)
      .maybeSingle();

    if (verErr || !version) {
      return json({ error: "Versão da proposta não encontrada." }, 404, origin);
    }

    // Buscar dados do lead (interessado)
    const { data: lead } = await admin
      .from("leads")
      .select("id, name, city, state, property_type, distributor, average_consumption_kwh, average_monthly_bill")
      .eq("id", proposal.lead_id)
      .maybeSingle();

    // Ação GET: Visualização segura da proposta
    if (action === "get" || req.method === "GET") {
      // Registrar primeira visualização
      const isFirstView = !proposal.viewed_at;
      const nowIso = new Date().toISOString();

      if (isFirstView) {
        await admin
          .from("proposals")
          .update({
            viewed_at: nowIso,
            status: proposal.status === "enviada" ? "visualizada" : proposal.status,
          })
          .eq("id", proposal.id);

        await admin
          .from("proposal_versions")
          .update({
            viewed_at: nowIso,
            status: version.status === "enviada" ? "visualizada" : version.status,
          })
          .eq("id", version.id);

        // Inserir atividade no histórico do lead
        await admin.from("lead_activities").insert({
          user_id: proposal.user_id,
          lead_id: proposal.lead_id,
          activity_type: "proposta_visualizada",
          title: "Proposta visualizada pelo cliente",
          description: `O link da proposta ${proposal.code} (v${proposal.current_version_number}) foi aberto pelo interessado.`,
          metadata: {
            proposal_id: proposal.id,
            version_number: proposal.current_version_number,
            code: proposal.code,
            viewed_at: nowIso,
          },
        });
      }

      // Filtrar apenas campos públicos seguros (SEM custos, lucro, margem ou comissão!)
      const sizing = version.sizing_snapshot || {};
      const rawEquipment = Array.isArray(version.equipment_snapshot) ? version.equipment_snapshot : [];
      const safeEquipment = rawEquipment.map((eq: Record<string, unknown>) => ({
        description: asText(eq.description, 160),
        category: asText(eq.category, 60),
        quantity: Number(eq.quantity) || 1,
      }));

      const safePayload = {
        code: proposal.code,
        version: proposal.current_version_number,
        status: proposal.status,
        validUntil: version.valid_until || proposal.valid_until,
        totalValue: Number(version.total_value) || Number(proposal.total_value) || 0,
        lead: {
          name: lead?.name || "Interessado",
          city: lead?.city || "",
          state: lead?.state || "",
          propertyType: lead?.property_type || "Residencial",
          distributor: lead?.distributor || "",
          averageConsumptionKWh: lead?.average_consumption_kwh || 0,
          averageMonthlyBill: lead?.average_monthly_bill || 0,
        },
        system: {
          installedPowerKWp: Number(sizing.installedPowerKWp) || 0,
          modulesCount: Number(sizing.modulesCount) || 0,
          modulePowerW: Number(sizing.modulePowerW) || 0,
          inverterPowerKW: Number(sizing.inverterPowerKW) || 0,
          inverterCount: Number(sizing.inverterCount) || 1,
          estimatedMonthlyGenerationKWh: Number(sizing.estimatedMonthlyGenerationKWh) || 0,
          estimatedAnnualGenerationKWh: Number(sizing.estimatedAnnualGenerationKWh) || 0,
          estimatedCoveragePercent: Number(sizing.estimatedCoveragePercent) || 0,
          estimatedAreaM2: Number(sizing.estimatedAreaM2) || 0,
          monthlyGenerationKWh: Array.isArray(sizing.monthlyGenerationKWh) ? sizing.monthlyGenerationKWh : [],
        },
        equipment: safeEquipment,
        commercialConditions: version.commercial_conditions || {},
        pdfSettings: version.pdf_settings_snapshot || {},
        customNotes: version.custom_notes || "",
        createdAt: version.created_at,
        viewedAt: proposal.viewed_at || nowIso,
      };

      return json(safePayload, 200, origin);
    }

    // Ação DECIDE: Aprovar ou Recusar proposta pelo cliente
    if (action === "decide") {
      const decision = asText(inputBody.decision, 20);
      const reason = asText(inputBody.reason, 500);

      if (!["aprovada", "recusada"].includes(decision)) {
        return json({ error: "Decisão inválida. Escolha entre 'aprovada' ou 'recusada'." }, 400, origin);
      }

      if (decision === "recusada" && (!reason || reason.length < 3)) {
        return json({ error: "Por favor, informe o motivo da recusa." }, 400, origin);
      }

      if (proposal.status === "aprovada" || proposal.status === "recusada") {
        return json({ error: "Esta proposta já foi finalizada anteriormente." }, 400, origin);
      }

      const nowIso = new Date().toISOString();

      if (decision === "aprovada") {
        // Atualizar proposta e versão
        await admin
          .from("proposals")
          .update({
            status: "aprovada",
            decided_at: nowIso,
            decision_notes: reason || "Proposta aprovada pelo cliente através do link público.",
          })
          .eq("id", proposal.id);

        await admin
          .from("proposal_versions")
          .update({
            status: "aprovada",
            approved_at: nowIso,
          })
          .eq("id", version.id);

        // Atualizar lead para 'ganho'
        await admin
          .from("leads")
          .update({
            status: "ganho",
            updated_at: nowIso,
          })
          .eq("id", proposal.lead_id);

        // Registrar atividade
        await admin.from("lead_activities").insert({
          user_id: proposal.user_id,
          lead_id: proposal.lead_id,
          activity_type: "proposta_aprovada",
          title: "Venda Ganha! Proposta aprovada pelo cliente",
          description: `A proposta ${proposal.code} foi formalmente aceita pelo cliente via página pública.`,
          metadata: {
            proposal_id: proposal.id,
            code: proposal.code,
            approved_at: nowIso,
            total_value: proposal.total_value,
          },
        });

        return json({ success: true, message: "Proposta aprovada com sucesso! Parabéns pela parceria." }, 200, origin);
      }

      if (decision === "recusada") {
        // Atualizar proposta e versão
        await admin
          .from("proposals")
          .update({
            status: "recusada",
            decided_at: nowIso,
            decision_notes: reason,
          })
          .eq("id", proposal.id);

        await admin
          .from("proposal_versions")
          .update({
            status: "recusada",
            rejected_at: nowIso,
            rejection_reason: reason,
          })
          .eq("id", version.id);

        // Atualizar lead para 'perdido' com motivo
        await admin
          .from("leads")
          .update({
            status: "perdido",
            lost_at: nowIso,
            lost_reason: `Recusa da proposta: ${reason}`,
            updated_at: nowIso,
          })
          .eq("id", proposal.lead_id);

        // Registrar atividade
        await admin.from("lead_activities").insert({
          user_id: proposal.user_id,
          lead_id: proposal.lead_id,
          activity_type: "proposta_recusada",
          title: "Proposta recusada pelo interessado",
          description: `Motivo informado pelo cliente: ${reason}`,
          metadata: {
            proposal_id: proposal.id,
            code: proposal.code,
            rejected_at: nowIso,
            reason,
          },
        });

        return json({ success: true, message: "Agradecemos pelo retorno. Suas considerações foram registradas." }, 200, origin);
      }
    }

    return json({ error: "Ação não suportada." }, 400, origin);
  } catch (err: any) {
    return json({ error: err?.message || "Erro interno do servidor." }, 500, origin);
  }
});
