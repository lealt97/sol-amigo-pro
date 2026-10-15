export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'unpaid' | 'canceled' | 'refunded' | 'disputed';
export interface AccountSubscription { status: SubscriptionStatus; currentPeriodEnd: string; graceUntil?: string | null }
/** Cancellation of renewal keeps a paid period; refunds/disputes suspend immediately. */
export function subscriptionAllowsWrite(subscription: AccountSubscription | null, now = new Date()): boolean {
  if (!subscription || !Number.isFinite(now.getTime())) return false;
  if (['unpaid', 'refunded', 'disputed'].includes(subscription.status)) return false;
  const periodEnd = Date.parse(subscription.currentPeriodEnd);
  if (['active', 'trialing', 'canceled'].includes(subscription.status)) return periodEnd > now.getTime();
  return subscription.status === 'past_due' && Math.max(periodEnd || 0, Date.parse(subscription.graceUntil || '') || 0) > now.getTime();
}
