export interface OperationError { operation: string; name: string; code: string; at: string }
const recentErrors: OperationError[] = [];
const identifier = (value: unknown) => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,60}$/.test(value) ? value : 'unknown';

/** Bounded, in-memory diagnostics. Never collects messages, stacks, URLs or user payloads. */
export function reportOperationError(operation: string, error: unknown) {
  let name: unknown; let code: unknown;
  // Third-party errors can contain throwing getters; diagnostics must not break recovery.
  try {
    if (error && typeof error === 'object') {
      name = (error as { name?: unknown }).name;
      code = (error as { code?: unknown }).code;
    }
  } catch { /* Keep unknown identifiers. */ }
  const detail: OperationError = { operation: identifier(operation), name: identifier(name), code: identifier(code), at: new Date().toISOString() };
  recentErrors.push(detail);
  if (recentErrors.length > 50) recentErrors.shift();
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('solamigo:error', { detail: { ...detail } }));
}
export function exportDiagnostics() {
  return JSON.stringify({ format: 'solamigo-diagnostics', version: 1, exportedAt: new Date().toISOString(), errors: recentErrors }, null, 2);
}
