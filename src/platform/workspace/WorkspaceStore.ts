import { reportOperationError } from '../observability/errors';
export interface WorkspaceDocument { key: string; value: string | null; revision: number }
export interface WorkspaceRepository {
  list(owner: string): Promise<WorkspaceDocument[]>;
  write(owner: string, document: WorkspaceDocument): Promise<number>;
}
export interface WorkspaceStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
export class WorkspaceConflict extends Error {
  constructor() { super('Há alterações de outro dispositivo. Exporte suas alterações antes de recarregar.'); }
}
export type WorkspaceStatus = { owner: string | null; ready: boolean; pending: number; error: string; conflict: boolean };

/** Owner-scoped cache with server revisions. Legacy keys are never read implicitly. */
export class WorkspaceStore {
  private owner: string | null = null;
  private documents = new Map<string, WorkspaceDocument>();
  private pending = new Map<string, string | null>();
  private listeners = new Set<() => void>();
  private running: Promise<void> | null = null;
  private generation = 0;
  private status: WorkspaceStatus = { owner: null, ready: false, pending: 0, error: '', conflict: false };
  constructor(private repository: WorkspaceRepository, private storage?: WorkspaceStorage) {}
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getStatus = () => this.status;
  private emit(update: Partial<WorkspaceStatus> = {}) {
    this.status = { ...this.status, ...update, owner: this.owner, pending: this.pending.size };
    this.listeners.forEach(listener => listener());
  }
  private cacheKey(owner: string) { return `solamigo.workspace.v1:${owner}`; }
  private backup() {
    if (!this.owner || !this.storage) return;
    // A failed cache write must not pretend the pending changes are protected locally.
    try { this.storage.setItem(this.cacheKey(this.owner), JSON.stringify({ pending: [...this.pending], documents: [...this.pending.keys()].map(key => ({ key, value: null, revision: this.documents.get(key)?.revision || 0 })) })); }
    catch { this.emit({ error: 'Não foi possível proteger as alterações neste navegador. Exporte uma cópia e mantenha esta janela aberta.' }); }
  }
  async open(owner: string) {
    const generation = ++this.generation;
    this.owner = owner; this.documents.clear(); this.pending.clear(); this.running = null;
    this.emit({ ready: false, error: '', conflict: false });
    try {
      const rows = await this.repository.list(owner);
      if (generation !== this.generation) return;
      this.documents = new Map(rows.map(row => [row.key, row]));
      const raw = this.storage?.getItem(this.cacheKey(owner));
      if (raw) {
        const cached = JSON.parse(raw) as { pending?: [string, string | null][]; documents?: WorkspaceDocument[] };
        for (const [key, value] of cached.pending || []) {
          const old = cached.documents?.find(document => document.key === key);
          const remote = this.documents.get(key);
          if (remote && remote.value === value) continue;
          if ((old?.revision || 0) !== (remote?.revision || 0) && remote?.value !== value) {
            this.emit({ conflict: true, error: new WorkspaceConflict().message });
          }
          // Keep the old expected revision: never overwrite a newer remote revision.
          this.documents.set(key, old || { key, value: null, revision: 0 });
          this.pending.set(key, value);
        }
      }
      this.emit({ ready: true });
      this.backup();
    } catch (error) {
      reportOperationError('workspace_load', error);
      if (generation === this.generation) this.emit({ ready: false, error: 'Não foi possível carregar seus dados do servidor. Verifique a conexão e tente novamente.' });
      throw new Error('Não foi possível carregar os dados da conta.');
    }
  }
  close() {
    this.backup(); ++this.generation; this.owner = null; this.documents.clear(); this.pending.clear(); this.running = null;
    this.emit({ ready: false, error: '', conflict: false });
  }
  getItem(key: string) { return this.pending.has(key) ? this.pending.get(key)! : this.documents.get(key)?.value ?? null; }
  setItem(key: string, value: string) { this.change(key, value); }
  removeItem(key: string) { this.change(key, null); }
  keys() { return [...new Set([...this.documents.keys(), ...this.pending.keys()])].filter(key => this.getItem(key) !== null); }
  private change(key: string, value: string | null) {
    if (!this.owner || !this.status.ready) throw new Error('A conta ainda não foi carregada.');
    if (this.getItem(key) === value) return;
    this.pending.set(key, value); this.backup(); this.emit();
  }
  exportPending() { return JSON.stringify({ owner: this.owner, exportedAt: new Date().toISOString(), documents: this.keys().map(key => ({ key, value: this.getItem(key) })), pending: [...this.pending] }, null, 2); }
  flush(): Promise<void> {
    if (this.running) return this.running;
    const generation = this.generation;
    const owner = this.owner;
    if (!owner || !this.status.ready) return Promise.reject(new Error('Entre na conta para salvar.'));
    if (this.status.conflict) return Promise.reject(new WorkspaceConflict());
    const work = async () => {
      this.emit({ error: '' });
      while (this.pending.size && generation === this.generation) {
        const [key, value] = this.pending.entries().next().value!;
        const revision = this.documents.get(key)?.revision || 0;
        try {
          const savedRevision = await this.repository.write(owner, { key, value, revision });
          if (generation !== this.generation) return;
          this.documents.set(key, { key, value, revision: savedRevision });
          if (this.pending.get(key) === value) this.pending.delete(key);
          this.backup(); this.emit();
        } catch (error) {
          reportOperationError('workspace_save', error);
          if (generation === this.generation) this.emit({ conflict: error instanceof WorkspaceConflict, error: error instanceof Error ? error.message : 'Não foi possível salvar no servidor. Suas alterações continuam pendentes.' });
          throw error;
        }
      }
    };
    this.running = work().finally(() => { if (generation === this.generation) this.running = null; });
    return this.running;
  }
}
