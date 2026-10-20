import { useEffect, useRef } from 'react';
import { BRAZIL_STATE_HSP } from '../../data/initialKits';
import type { ProposalTargetSelection } from './buildProposal';

// Contact defaults are initial values, not overrides for an edited proposal.
export function useProposalTargetDefaults(
  target: ProposalTargetSelection | null,
  setConsumption: (value: number) => void,
  setDistributor: (value: string) => void,
  setHsp: (value: number) => void,
) {
  const initializedTarget = useRef<string | null>(null);
  useEffect(() => {
    const identity = target ? `${target.type}:${target.id}` : null;
    if (!target) {
      initializedTarget.current = null;
      return;
    }
    if (initializedTarget.current === identity) return;
    initializedTarget.current = identity;
    if (target.monthlyConsumptionKWh && target.monthlyConsumptionKWh > 0) {
      setConsumption(target.monthlyConsumptionKWh);
    }
    if (target.concessionaria) setDistributor(target.concessionaria);
    const hsp = BRAZIL_STATE_HSP[(target.state || '').toUpperCase().trim()];
    if (hsp) setHsp(hsp);
  }, [target, setConsumption, setDistributor, setHsp]);
}
