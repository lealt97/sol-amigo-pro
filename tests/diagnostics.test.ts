import assert from 'node:assert/strict';
import test from 'node:test';
import { reportOperationError, exportDiagnostics } from '../src/platform/observability/errors';

test('diagnóstico não inclui mensagens, tokens, URLs ou conteúdo arbitrário e limita histórico', () => {
  for (let i = 0; i < 80; i++) reportOperationError('workspace_save', { name: 'NetworkError', code: '503', message: 'CLIENTE_PRIVADO', token: 'TOKEN_PRIVADO', url: 'https://private.example' });
  reportOperationError('email@cliente.example', { name: 'Nome com dados pessoais', code: 'token/sigiloso' });
  const raw = exportDiagnostics(); const data = JSON.parse(raw);
  assert.equal(data.errors.length, 50);
  assert.deepEqual(Object.keys(data.errors[0]).sort(), ['at', 'code', 'name', 'operation']);
  assert.deepEqual(data.errors.at(-1), { operation: 'unknown', name: 'unknown', code: 'unknown', at: data.errors.at(-1).at });
  for (const secret of ['CLIENTE_PRIVADO', 'TOKEN_PRIVADO', 'private.example', 'cliente.example', 'sigiloso']) assert.equal(raw.includes(secret), false);
  assert.doesNotThrow(() => reportOperationError('render', Object.defineProperty({}, 'name', { get() { throw Error('secret'); } })));
});
