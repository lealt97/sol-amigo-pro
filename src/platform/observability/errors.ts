/** Hook for a monitoring adapter. Never emits messages, stack traces, tokens or user payloads. */
export function reportOperationError(operation: string, error: unknown) {
  const candidate = error && typeof error === 'object' ? error as { name?: unknown; code?: unknown } : {};
  const identifier = (value: unknown) => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,60}$/.test(value) ? value : 'unknown';
  const detail = { operation: identifier(operation), name: identifier(candidate.name), code: identifier(candidate.code), at: new Date().toISOString() };
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('solamigo:error', { detail }));
}
