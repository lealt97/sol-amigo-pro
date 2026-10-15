import assert from 'node:assert/strict';
import test from 'node:test';
import { subscriptionAllowsWrite } from '../src/features/billing/access';
const now = new Date('2026-10-14T12:00:00Z');
test('assinatura cancelada mantém período pago e nunca libera por data inválida', () => {
  assert.equal(subscriptionAllowsWrite({ status: 'canceled', currentPeriodEnd: '2026-11-01' }, now), true);
  assert.equal(subscriptionAllowsWrite({ status: 'active', currentPeriodEnd: 'invalid' }, now), false);
  assert.equal(subscriptionAllowsWrite(null, now), false);
});
test('inadimplência respeita tolerância e reembolso/contestação suspendem imediatamente', () => {
  assert.equal(subscriptionAllowsWrite({ status: 'past_due', currentPeriodEnd: '2026-10-01', graceUntil: '2026-10-15' }, now), true);
  assert.equal(subscriptionAllowsWrite({ status: 'past_due', currentPeriodEnd: '2026-10-01', graceUntil: '2026-10-13' }, now), false);
  for (const status of ['refunded','disputed','unpaid'] as const) assert.equal(subscriptionAllowsWrite({ status, currentPeriodEnd: '2027-01-01' }, now), false);
});
