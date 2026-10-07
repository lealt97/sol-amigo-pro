import type { ClientProposal } from '../services/proposals';
import type { PublicProposalSignal } from '../services/publicProposals';

export function mergePublicProposalSignals(proposals: ClientProposal[], signals: PublicProposalSignal[]): ClientProposal[] {
  return proposals.map(proposal => {
    const ownSignals = signals.filter(signal => signal.source_id === proposal.id);
    const latest = ownSignals.filter(signal => signal.response && signal.responded_at)
      .sort((a, b) => Date.parse(b.responded_at!) - Date.parse(a.responded_at!))[0];
    const firstView = ownSignals.filter(signal => signal.viewed_at)
      .sort((a, b) => Date.parse(a.viewed_at!) - Date.parse(b.viewed_at!))[0]?.viewed_at;
    const details = proposal.approvalDetails || {};
    const previousDecision = Math.max(Date.parse(details.approvedAt || '') || 0, Date.parse(details.refusedAt || '') || 0);
    if (latest && Date.parse(latest.responded_at!) > previousDecision) {
      const response = latest.response!;
      return { ...proposal, status: response.status, approvalDetails: {
        ...details, viewedAt: details.viewedAt || firstView || undefined,
        ...(response.status === 'Aprovada'
          ? { approvedBy: response.name, approvedAt: response.respondedAt, approvalDocument: response.document, approvalNotes: response.notes }
          : { refusedAt: response.respondedAt, refusalReason: response.reason, refusalNotes: response.notes }),
      } };
    }
    if (firstView && !details.viewedAt) return { ...proposal,
      status: ['Enviada', 'Pendente'].includes(proposal.status) ? 'Visualizada' : proposal.status,
      approvalDetails: { ...details, viewedAt: firstView },
    };
    return proposal;
  });
}
