import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { downloadJson as download } from '../../platform/files/download';
import { exportDiagnostics } from '../../platform/observability/errors';
import { supabase } from '../../lib/supabase';
import { supabaseWorkspaceRepository } from '../../platform/workspace/supabaseRepository';
import { configureWorkspaceRepository, workspace } from '../../platform/workspace/workspace';
import { canImportInto, inspectLegacy } from '../../platform/workspace/legacy';

export function WorkspaceGate({ children }: { children: ReactNode }) {
  const status = useSyncExternalStore(workspace.subscribe, workspace.getStatus);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [legacyOpen, setLegacyOpen] = useState(false);
  const [selection, setSelection] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
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
  if (!status.ready || error) return <div className="min-h-screen bg-[#0E2337] text-white flex items-center justify-center p-6"><div role={error ? 'alert' : 'status'}>
    <p>{error || 'Carregando os dados da sua conta...'}</p>
    {error && <><button className="underline mr-4" onClick={() => download(exportDiagnostics(), 'sol-amigo-diagnostico.json')}>Baixar diagnóstico técnico</button><button className="underline mt-3 mr-4" onClick={() => setAttempt(x => x + 1)}>Tentar novamente</button><button className="underline" onClick={() => { void supabase.auth.signOut(); }}>Sair</button></>}
  </div></div>;
  const legacy = inspectLegacy(localStorage, status.owner!);
  const importSelected = async () => {
    if (!confirmed || !selection.length) return;
    setBusy(true); setError('');
    try {
      const chosen = legacy.filter(item => selection.includes(item.key) && canImportInto(workspace.getItem(item.key)));
      download(JSON.stringify({ ownerConfirmedByUser: status.owner, exportedAt: new Date().toISOString(), documents: chosen }, null, 2), 'sol-amigo-backup-antes-da-importacao.json');
      for (const item of chosen) workspace.setItem(item.key, item.value);
      await workspace.flush();
      setLegacyOpen(false); setSelection([]); setConfirmed(false);
      window.location.reload();
    } catch { /* Pending data remains backed up and visible in the synchronization banner. */ }
    finally { setBusy(false); }
  };
  return <>
    <div className="bg-[#183956] text-white text-xs px-4 py-2 flex flex-wrap gap-3 items-center" role={status.error ? 'alert' : 'status'}>
      <span>{status.error || (status.pending ? `${status.pending} alteração(ões) aguardando confirmação do servidor.` : 'Dados da conta sincronizados.')}</span>
      {(status.pending > 0 || status.error) && <>
        <button className="underline" disabled={busy} onClick={() => { void workspace.flush().catch(() => {}); }}>Tentar salvar</button>
        <button className="underline" onClick={() => download(workspace.exportPending(), 'sol-amigo-alteracoes-pendentes.json')}>Exportar cópia</button>
        {status.conflict && <button className="underline" onClick={() => {
          download(workspace.exportPending(), 'sol-amigo-conflito-backup.json');
          // Retain the old pending changes in a separate durable backup before discarding the queue.
          const backup = workspace.exportPending();
          try {
            localStorage.setItem(`solamigo.conflict-backup:${status.owner}:${Date.now()}`, backup);
            localStorage.removeItem(`solamigo.workspace.v1:${status.owner}`);
            setAttempt(x => x + 1);
          } catch { /* Keep the conflict and its pending changes if backup failed. */ }
        }}>Exportar alterações e recarregar do servidor</button>}
      </>}
      <button className="underline" title="Inclui os documentos carregados e alterações pendentes. Não inclui anexos e todos os registros do CRM." onClick={() => download(workspace.exportPending(), 'sol-amigo-workspace.json')}>Exportar dados do workspace</button>
      <button className="underline" title="Somente códigos técnicos desta sessão, sem dados dos clientes." onClick={() => download(exportDiagnostics(), 'sol-amigo-diagnostico.json')}>Baixar diagnóstico técnico</button>
      {legacy.length > 0 && <button className="underline ml-auto" onClick={() => setLegacyOpen(true)}>Revisar dados antigos deste navegador</button>}
    </div>
    {children}
    {legacyOpen && <div role="dialog" aria-modal="true" aria-labelledby="legacy-title" className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white text-slate-900 rounded-2xl p-6 w-full max-w-xl max-h-[90vh] overflow-auto">
        <h2 id="legacy-title" className="font-bold text-lg">Importar dados antigos</h2>
        <p className="text-sm my-3">Estes dados estão neste navegador e podem pertencer a outra pessoa. Confira sua origem antes de importar. Os arquivos originais serão preservados. Dados já existentes no servidor não serão substituídos.</p>
        {legacy.map(item => <label key={item.key} className="flex gap-2 py-2"><input type="checkbox" checked={selection.includes(item.key)} disabled={!canImportInto(workspace.getItem(item.key)) || busy} onChange={event => setSelection(current => event.target.checked ? [...current, item.key] : current.filter(key => key !== item.key))}/><span>{item.label}: {item.count} registro(s){!canImportInto(workspace.getItem(item.key)) ? ' — já existe nesta conta' : ''}</span></label>)}
        <label className="flex gap-2 text-sm mt-4"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)}/>Confirmo que os dados selecionados pertencem à minha conta.</label>
        <div className="flex gap-4 mt-5 justify-end"><button disabled={busy} onClick={() => setLegacyOpen(false)}>Cancelar</button><button className="bg-blue-700 text-white rounded-lg px-4 py-2" disabled={busy || !confirmed || !selection.length} onClick={() => { void importSelected(); }}>{busy ? 'Importando...' : 'Exportar backup e importar'}</button></div>
      </div>
    </div>}
  </>;
}
