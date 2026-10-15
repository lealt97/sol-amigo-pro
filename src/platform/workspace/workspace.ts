import { WorkspaceStore, type WorkspaceRepository } from './WorkspaceStore';
let delegate: WorkspaceRepository | undefined;
export function configureWorkspaceRepository(repository: WorkspaceRepository) { delegate = repository; }
const repository: WorkspaceRepository = {
  list: owner => delegate ? delegate.list(owner) : Promise.reject(new Error('Persistência não configurada.')),
  write: (owner, document) => delegate ? delegate.write(owner, document) : Promise.reject(new Error('Persistência não configurada.')),
};
export const workspace = new WorkspaceStore(repository, typeof window !== 'undefined' ? window.localStorage : undefined);
let timer: ReturnType<typeof setTimeout> | undefined;
const schedule = () => {
  clearTimeout(timer);
  timer = setTimeout(() => { void workspace.flush().catch(() => {}); }, 300);
};
/** Same string API used by existing modules; data belongs to the loaded account. */
export const accountStorage = {
  getItem: (key: string) => workspace.getItem(key),
  setItem(key: string, value: string) { workspace.setItem(key, value); schedule(); },
  removeItem(key: string) { workspace.removeItem(key); schedule(); },
  key: (index: number) => workspace.keys()[index] || null,
  get length() { return workspace.keys().length; },
};
export const saveWorkspace = () => workspace.flush();
