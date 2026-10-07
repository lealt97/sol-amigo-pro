import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'GET') return json({ error: 'Método não permitido.' }, 405);
  const token = new URL(req.url).searchParams.get('token') || '';
  if (!/^[a-f0-9]{64}$/.test(token)) return json({ error: 'Link indisponível.' }, 404);
  try {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
    const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const projectUrl = Deno.env.get('SUPABASE_URL');
    if (!key || !projectUrl) return json({ error: 'Serviço indisponível.' }, 503);
    const url = new URL(`${projectUrl}/rest/v1/public_proposal_documents`);
    url.searchParams.set('select', 'document');
    url.searchParams.set('token_hash', `eq.${hash}`);
    url.searchParams.set('expires_at', `gt.${new Date().toISOString()}`);
    url.searchParams.set('limit', '1');
    const response = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    if (!response.ok) return json({ error: 'Serviço indisponível.' }, 503);
    const rows = await response.json();
    if (!rows[0]?.document) return json({ error: 'Link indisponível.' }, 404);
    return json(rows[0].document);
  } catch {
    return json({ error: 'Serviço indisponível.' }, 503);
  }
});
