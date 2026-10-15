import { reportOperationError } from '../platform/observability/errors';
import { Component, type ReactNode } from 'react';
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  declare props: { children: ReactNode };
  state = { failed: false };
  componentDidCatch(error: unknown) { reportOperationError('render', error); }
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <div role="alert" className="min-h-screen bg-[#0E2337] text-white p-8"><h1 className="text-xl font-bold">Não foi possível abrir esta tela</h1><p className="my-3">Recarregue para tentar novamente. Alterações pendentes continuam protegidas neste navegador.</p><button className="underline" onClick={() => window.location.reload()}>Recarregar</button></div>;
    return this.props.children;
  }
}
