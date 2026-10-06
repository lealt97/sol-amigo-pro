import React, { useEffect, useState } from 'react';
import type { PdfSettingsConfig, SolarProposal } from '../types';
import { getPdfCoverAssetUrl, getPdfCoverTemplate } from '../data/pdfCoverTemplates';
import { buildCoverSvg } from '../utils/pdfCoverEditor';
import { fillPdfCoverFields } from '../utils/pdfCoverFields';

export function ProposalCoverPage({ proposal, settings, onReady }: {
  proposal: SolarProposal; settings: PdfSettingsConfig; onReady: (ready: boolean) => void;
}) {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    onReady(false);
    setSvg('');
    setError('');
    const template = getPdfCoverTemplate(settings.template);
    fetch(getPdfCoverAssetUrl(template.file)).then(response => {
      if (!response.ok) throw new Error('Não foi possível carregar a capa.');
      return response.text();
    }).then(source => {
      if (!active) return;
      const edited = buildCoverSvg(source, {
        colorOverrides: settings.coverColors,
        photoUrl: settings.showCoverPhoto ? settings.customCoverUrl : undefined,
        photoTransform: settings.coverPhotoTransform,
        logoUrl: settings.showLogo ? settings.customLogoUrl : undefined,
        logoTransform: settings.coverLogoTransform,
        logoSlot: template.logoSlot,
        scopeId: 'proposal-cover',
      });
      setSvg(fillPdfCoverFields(edited, proposal, settings));
      onReady(true);
    }).catch(() => { if (active) setError('Não foi possível carregar a capa. Feche e abra a proposta para tentar novamente.'); });
    return () => { active = false; };
  }, [proposal, settings, onReady]);
  return <section className="proposal-cover-page proposal-svg-cover" aria-label="Capa da proposta">
    {error ? <p role="alert">{error}</p> : svg ? <div className="proposal-cover-art" dangerouslySetInnerHTML={{ __html: svg }} /> : <p>Carregando capa...</p>}
  </section>;
}
