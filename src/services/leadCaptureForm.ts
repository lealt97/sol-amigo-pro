import type { LeadCaptureForm } from '../types';
import { supabase } from '../lib/supabase';

const fromRow = (row: any): LeadCaptureForm => ({
  id: row.id,
  publicToken: row.public_token,
  name: row.name,
  active: row.active,
});

export const ensureLeadCaptureForm = async (): Promise<LeadCaptureForm> => {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw authError ?? new Error('Sessão inválida.');
  const query = () => supabase.from('lead_capture_forms').select('id,public_token,name,active').eq('user_id', auth.user.id);
  const { data: existing, error: selectError } = await query().limit(1).maybeSingle();
  if (selectError) throw selectError;
  if (existing) return fromRow(existing);
  const { data, error } = await supabase.from('lead_capture_forms').insert({ user_id: auth.user.id, name: 'Formulário principal' }).select('id,public_token,name,active').single();
  if (!error) return fromRow(data);
  if (error.code !== '23505') throw error;
  const { data: concurrent, error: concurrentError } = await query().single();
  if (concurrentError) throw concurrentError;
  return fromRow(concurrent);
};
