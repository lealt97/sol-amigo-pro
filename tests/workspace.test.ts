import assert from 'node:assert/strict';
import test from 'node:test';
import { WorkspaceStore, WorkspaceConflict, type WorkspaceDocument, type WorkspaceRepository } from '../src/platform/workspace/WorkspaceStore';
import { canImportInto, inspectLegacy } from '../src/platform/workspace/legacy';
class MemoryRepository implements WorkspaceRepository {
  rows = new Map<string, WorkspaceDocument>();
  offline = false;
  async list(owner: string) { if (this.offline) throw Error('offline'); return [...this.rows].filter(([key]) => key.startsWith(owner + ':')).map(([, value]) => ({ ...value })); }
  async write(owner: string, document: WorkspaceDocument) {
    if (this.offline) throw Error('offline');
    const id = `${owner}:${document.key}`;
    if ((this.rows.get(id)?.revision || 0) !== document.revision) throw new WorkspaceConflict();
    this.rows.set(id, { ...document, revision: document.revision + 1 }); return document.revision + 1;
  }
}
function storage() { const data = new Map<string, string>(); return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } }; }
test('dados legados não entram automaticamente e contas não compartilham cache', async () => {
  const db = new MemoryRepository(); const cache = storage(); cache.setItem('solamigo.clients.v2', '[{"name":"Antigo"}]');
  const store = new WorkspaceStore(db, cache); await store.open('A'); assert.equal(store.getItem('solamigo.clients.v2'), null);
  store.setItem('clients', '["A"]'); await store.flush(); store.close(); await store.open('B'); assert.equal(store.getItem('clients'), null);
  store.close(); await store.open('A'); assert.equal(store.getItem('clients'), '["A"]');
  assert.equal(cache.getItem('solamigo.clients.v2'), '[{"name":"Antigo"}]');
});
test('edições simultâneas não substituem alterações de outro dispositivo', async () => {
  const db = new MemoryRepository(); const a = new WorkspaceStore(db); const b = new WorkspaceStore(db);
  await a.open('A'); await b.open('A'); a.setItem('notes', 'first'); await a.flush(); b.setItem('notes', 'second');
  await assert.rejects(b.flush(), WorkspaceConflict); assert.equal(b.getStatus().conflict, true); assert.equal(b.getItem('notes'), 'second');
  assert.equal(db.rows.get('A:notes')?.value, 'first'); assert.ok(b.exportPending().includes('second'));
});
test('falha de rede preserva fila e restaura alterações pendentes após recarregar', async () => {
  const db = new MemoryRepository(); const cache = storage(); const a = new WorkspaceStore(db, cache); await a.open('A');
  a.setItem('notes', 'pending'); db.offline = true; await assert.rejects(a.flush()); assert.equal(a.getStatus().pending, 1);
  a.close(); db.offline = false; const b = new WorkspaceStore(db, cache); await b.open('A'); assert.equal(b.getItem('notes'), 'pending'); await b.flush();
  assert.equal(b.getStatus().pending, 0); const c = new WorkspaceStore(db); await c.open('A'); assert.equal(c.getItem('notes'), 'pending');
});
test('remoção é uma revisão e não ressuscita dados de cache antigo', async () => {
  const db = new MemoryRepository(); const a = new WorkspaceStore(db); await a.open('A'); a.setItem('notes', 'first'); await a.flush();
  a.removeItem('notes'); await a.flush(); const b = new WorkspaceStore(db); await b.open('A'); assert.equal(b.getItem('notes'), null); assert.equal(db.rows.get('A:notes')?.revision, 2);
});
test('falha ao carregar servidor não libera uma conta vazia', async () => {
  const db = new MemoryRepository(); db.offline = true; const a = new WorkspaceStore(db); await assert.rejects(a.open('A'));
  assert.equal(a.getStatus().ready, false); assert.throws(() => a.setItem('notes', 'wrong'));
});
test('resposta atrasada de outra conta não contamina o workspace ativo', async () => {
  const db = new MemoryRepository(); let finish: ((value: WorkspaceDocument[]) => void) | undefined;
  const a = new WorkspaceStore({ ...db, write: db.write.bind(db), list: owner => owner === 'A' ? new Promise(resolve => { finish = resolve; }) : db.list(owner) });
  const pending = a.open('A'); a.close(); await a.open('B'); finish!([{ key: 'clients', value: 'private A', revision: 1 }]); await pending;
  assert.equal(a.getStatus().owner, 'B'); assert.equal(a.getItem('clients'), null);
});
test('inspeção de migração valida JSON e só oferece capas da conta atual', () => {
  const cache = storage(); cache.setItem('solamigo.clients.v2', 'invalid'); cache.setItem('solamigo.pdf-cover-models.v1.A', '[{"id":"a"}]');
  assert.equal(inspectLegacy(cache, 'B').length, 0); assert.equal(inspectLegacy(cache, 'A')[0].count, 1);
});

test('cache vazio inicial não bloqueia importação, mas dados existentes não são substituídos', () => {
  assert.equal(canImportInto(null), true); assert.equal(canImportInto('[]'), true); assert.equal(canImportInto('{}'), true); assert.equal(canImportInto('[{"id":"real"}]'), false); assert.equal(canImportInto('invalid'), false);
});
