import React from 'react';
import { SolarProposal, ThemeConfig, PageKey } from '../types';

interface DashboardViewProps {
  proposals: SolarProposal[];
  theme: ThemeConfig;
  onNavigate: (page: PageKey) => void;
  onOpenNewProposal: () => void;
  onViewProposal: (prop: SolarProposal) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = () => {
  return <div id="dashboard-view" />;
};
