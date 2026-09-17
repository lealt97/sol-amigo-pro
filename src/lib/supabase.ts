import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://tmdhmthlnfotfezxgxlt.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_kZYdfjFcdiKfA1SkNWSaMg_k4vghhZ6';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const validateCurrentPassword = async (email: string, password: string) => {
  // A separate, non-persistent client validates the credential without replacing
  // the active session or lowering an MFA-protected session back to AAL1.
  const verifier = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const { error } = await verifier.auth.signInWithPassword({ email, password });
  await verifier.auth.signOut({ scope: 'local' });
  return error;
};
