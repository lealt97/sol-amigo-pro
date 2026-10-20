import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { supabase } from '../../lib/supabase';
import { supabaseWorkspaceRepository } from '../../platform/workspace/supabaseRepository';
import { configureWorkspaceRepository, workspace } from '../../platform/workspace/workspace';
import { SaaSLoadingScreen } from '../SaaSLoadingScreen';

export function WorkspaceGate({ children }: { children: ReactNode }) {
  const status = useSyncExternalStore(workspace.subscribe, workspace.getStatus);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    configureWorkspaceRepository(supabaseWorkspaceRepository);
    let active = true;
    setError('');
    void supabase.auth.getUser().then(async ({ data, error: authError }) => {
      if (!active) return;
      if (authError || !data.user) throw new Error('Sua sessão expirou. Entre novamente.');
      await workspace.open(data.user.id);
      if (active) window.dispatchEvent(new Event('solamigo:workspace-ready'));
      if (active && workspace.getStatus().pending) void workspace.flush().catch(() => {});
    }).catch(err => { if (active) setError(err.message); });
    return () => { active = false; workspace.close(); };
  }, [attempt]);

  useEffect(() => {
    const retry = () => { if (workspace.getStatus().ready) void workspace.flush().catch(() => {}); };
    const unload = (event: BeforeUnloadEvent) => { if (workspace.getStatus().pending) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('online', retry); window.addEventListener('beforeunload', unload);
    return () => { window.removeEventListener('online', retry); window.removeEventListener('beforeunload', unload); };
  }, []);

  if (!status.ready && !error) {
    return (
      <SaaSLoadingScreen
        fullScreen
        message="Carregando os dados da sua conta..."
        hint="Sincronizando com o banco de dados..."
      />
    );
  }

  if (error) return (
    <div className="min-h-screen bg-[#0E2337] text-white flex items-center justify-center p-6">
      <div role="alert" className="max-w-md text-center">
        <p className="text-sm font-semibold">{error}</p>
        <div className="mt-4 flex gap-4 justify-center">
            <button
              type="button"
              className="px-3 py-1.5 rounded bg-white text-[#0E2337] text-xs font-bold"
              onClick={() => setAttempt(x => x + 1)}
            >
              Tentar novamente
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white text-xs font-semibold"
              onClick={() => { void supabase.auth.signOut(); }}
            >
              Sair
            </button>
          </div>
      </div>
    </div>
  );

  return (
    <>
      {status.error ? (
        <div
          className="fixed top-2 right-4 z-50 bg-red-900/90 border border-red-700 text-white text-xs px-3 py-2 rounded-lg shadow-lg flex items-center gap-2"
          role="alert"
        >
          <span>{status.error}</span>
          <button
            type="button"
            onClick={() => { void workspace.flush().catch(() => {}); }}
            className="px-2 py-0.5 rounded bg-white/20 text-white text-xs hover:bg-white/30"
          >
            Tentar salvar
          </button>
        </div>
      ) : null}
      {children}
    </>
  );
}
