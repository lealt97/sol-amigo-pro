import React from 'react';
import type { ThemeConfig } from '../types';

interface ClientesViewProps {
  theme: ThemeConfig;
}

export const ClientesView: React.FC<ClientesViewProps> = () => (
  <div id="clientes-page" />
);
