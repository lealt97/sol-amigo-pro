import { supabase } from '../../lib/supabase';
import { WorkspaceConflict, type WorkspaceDocument, type WorkspaceRepository } from './WorkspaceStore';

export const supabaseWorkspaceRepository: WorkspaceRepository = {
  async list(owner) {
    const { data, error } = await supabase.from('workspace_documents').select('key,value,revision').eq('user_id', owner);
    if (error) throw error;
    return (data || []) as WorkspaceDocument[];
  },
  async write(owner, document) {
    const { key, value, revision } = document;
    if (revision === 0) {
      const { error } = await supabase.from('workspace_documents').insert({ user_id: owner, key, value, revision: 1 });
      if (error?.code === '23505') throw new WorkspaceConflict();
      if (error) throw new Error(error.code === '23514' ? 'O documento é inválido ou excede o limite de tamanho. Exporte uma cópia antes de revisar os anexos.' : error.code === '42501' ? 'Sua conta não tem permissão para gravar. Verifique sua assinatura ou entre novamente.' : 'Não foi possível salvar no servidor. Verifique sua conexão.');
      return 1;
    }
    const { data, error } = await supabase.from('workspace_documents').update({ value, revision: revision + 1 })
      .eq('user_id', owner).eq('key', key).eq('revision', revision).select('revision');
    if (error) throw new Error(error.code === '23514' ? 'O documento é inválido ou excede o limite de tamanho. Exporte uma cópia antes de revisar os anexos.' : error.code === '42501' ? 'Sua conta não tem permissão para gravar. Verifique sua assinatura ou entre novamente.' : 'Não foi possível salvar no servidor. Verifique sua conexão.');
    if (!data?.length) {
      const { data: canWrite, error: accessError } = await supabase.rpc('account_can_write');
      if (!accessError && canWrite === false) throw new Error('Sua conta está em modo de leitura. Verifique sua assinatura.');
      throw new WorkspaceConflict();
    }
    return data[0].revision;
  },
};
