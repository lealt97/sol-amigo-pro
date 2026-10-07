import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { validatePublicProposalResponse } from '../_shared/publicProposalResponse.ts';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (!['GET', 'POST'].includes(req.method)) return json({ error: 'Método não permitido.' }, 405);
  const token = new URL(req.url).searchParams.get('token') || '';
  if (!/^[a-f0-9]{64}$/.test(token)) return json({ error: 'Link indisponível.' }, 404);
  try {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
    const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const projectUrl = Deno.env.get('SUPABASE_URL');
    if (!key || !projectUrl) return json({ error: 'Serviço indisponível.' }, 503);
    const apiHeaders = { apikey: key, Authorization: `Bearer ${key}` };
    const url = new URL(`${projectUrl}/rest/v1/public_proposal_documents`);
    url.searchParams.set('select', 'id,document,response');
    url.searchParams.set('token_hash', `eq.${hash}`);
    url.searchParams.set('expires_at', `gt.${new Date().toISOString()}`);
    url.searchParams.set('limit', '1');
    const lookup = await fetch(url, { headers: apiHeaders });
    if (!lookup.ok) return json({ error: 'Serviço indisponível.' }, 503);
    const rows = await lookup.json();
    const row = rows[0];
    if (!row?.document) return json({ error: 'Link indisponível.' }, 404);

    // PATCH never accepts a caller-provided document, owner, source ID or price.
    // Only the looked-up, unexpired token can address this immutable snapshot.
    const updateUrl = new URL(`${projectUrl}/rest/v1/public_proposal_documents`);
    updateUrl.searchParams.set('id', `eq.${row.id}`);
    updateUrl.searchParams.set('expires_at', `gt.${new Date().toISOString()}`);
    if (req.method === 'GET') {
      updateUrl.searchParams.set('viewed_at', 'is.null');
      const viewed = await fetch(updateUrl, { method: 'PATCH', headers: { ...apiHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ viewed_at: new Date().toISOString() }) });
      if (!viewed.ok) return json({ error: 'Serviço indisponível.' }, 503);
      return json({ ...row.document, response: row.response });
    }

    if (Number(req.headers.get('content-length') || 0) > 8192) return json({ error: 'Resposta muito longa.' }, 413);
    const text = await req.text();
    if (new TextEncoder().encode(text).length > 8192) return json({ error: 'Resposta muito longa.' }, 413);
    let response;
    try { response = validatePublicProposalResponse(JSON.parse(text), new Date().toISOString()); }
    catch (error) { return json({ error: error instanceof Error ? error.message : 'Resposta inválida.' }, 400); }
    if (row.response) {
      return row.response.status === response.status
        ? json({ response: row.response })
        : json({ error: 'Esta proposta já recebeu uma resposta. Entre em contato com a integradora.' }, 409);
    }
    if (['Aprovada', 'Recusada'].includes(row.document.proposal?.status)) return json({ error: 'Esta proposta já foi concluída. Entre em contato com a integradora.' }, 409);
    updateUrl.searchParams.set('response', 'is.null');
    updateUrl.searchParams.set('select', 'response');
    const saved = await fetch(updateUrl, {
      method: 'PATCH', headers: { ...apiHeaders, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ response, responded_at: response.respondedAt }),
    });
    if (!saved.ok) return json({ error: 'Não foi possível registrar sua resposta.' }, 503);
    const updated = await saved.json();
    if (!updated[0]?.response) return json({ error: 'O link foi desativado ou já recebeu uma resposta. Atualize a página.' }, 409);
    return json({ response: updated[0].response });
  } catch {
    return json({ error: 'Serviço indisponível.' }, 503);
  }
});
