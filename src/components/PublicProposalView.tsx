import { useEffect, useState } from 'react';
import { fetchPublicProposal } from '../services/publicProposals';
import type { PublicProposalDocument } from '../utils/publicProposal';
import { ProposalViewerModal } from './ProposalViewerModal';

const noop = () => {};

export function PublicProposalView({ token }: { token: string }) {
  const [document, setDocument] = useState<PublicProposalDocument | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const referrer = window.document.createElement('meta');
    referrer.name = 'referrer';
    referrer.content = 'no-referrer';
    const robots = window.document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex, nofollow';
    window.document.head.append(referrer, robots);
    return () => { referrer.remove(); robots.remove(); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setDocument(null);
    setError('');
    fetchPublicProposal(token, controller.signal).then(setDocument).catch(error => {
      if (!controller.signal.aborted) setError(error.message || 'Não foi possível carregar a proposta.');
    });
    return () => controller.abort();
  }, [token, attempt]);
  if (document) return <ProposalViewerModal proposal={document.proposal} pdfSettings={document.pdfSettings} theme={document.theme} onClose={noop} onShowToast={noop} publicView />;
  return <div role="main" className="min-h-screen flex items-center justify-center bg-slate-100 p-6 text-slate-800">
    <div className="max-w-lg rounded-2xl bg-white p-8 shadow-lg text-center text-slate-800">
      <h1 className="text-xl font-bold">Proposta comercial</h1>
      {error ? <><p role="alert" className="mt-4 text-sm">{error}</p><button onClick={() => setAttempt(value => value + 1)} className="mt-6 rounded-lg bg-blue-600 px-4 py-2 text-white">Tentar novamente</button></> : <p role="status" className="mt-4">Carregando proposta...</p>}
    </div>
  </div>;
}
