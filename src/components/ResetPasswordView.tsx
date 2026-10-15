import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
export function ResetPasswordView() {
  const [password, setPassword] = useState(''); const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    if (password.length < 12) { setError('Use uma senha com pelo menos 12 caracteres.'); return; }
    if (password !== confirmation) { setError('As senhas não coincidem.'); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut({ scope: 'global' });
      window.history.replaceState(null, '', window.location.pathname);
      window.location.reload();
    } catch { setError('Não foi possível alterar a senha. Verifique o link de recuperação e tente novamente.'); }
    finally { setBusy(false); }
  };
  return <div className="min-h-screen bg-[#0E2337] text-white flex items-center justify-center p-6"><form onSubmit={save} className="w-full max-w-sm space-y-4"><h1 className="text-xl font-bold">Definir nova senha</h1>{error && <p role="alert">{error}</p>}<label className="block">Nova senha<input className="block w-full mt-1 p-2 bg-slate-800 rounded" type="password" autoComplete="new-password" required minLength={12} value={password} onChange={event => setPassword(event.target.value)}/></label><label className="block">Confirme a nova senha<input className="block w-full mt-1 p-2 bg-slate-800 rounded" type="password" autoComplete="new-password" required value={confirmation} onChange={event => setConfirmation(event.target.value)}/></label><button disabled={busy} className="bg-blue-700 rounded px-4 py-2">{busy ? 'Salvando...' : 'Salvar e entrar novamente'}</button></form></div>;
}
