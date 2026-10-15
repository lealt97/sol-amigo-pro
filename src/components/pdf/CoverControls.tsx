import React, { useEffect, useMemo, useState } from 'react';
import type { PdfCoverModel, ThemeConfig } from '../../types';
import { getPdfCoverTemplate, getPdfCoverAssetUrl } from '../../data/pdfCoverTemplates';
import { buildCoverSvg } from '../../utils/pdfCoverEditor';

export const ModelThumbnail: React.FC<{ model: PdfCoverModel }> = ({ model }) => {
  const [svg, setSvg] = useState('');
  const template = getPdfCoverTemplate(model.sourceTemplateId);

  useEffect(() => {
    let mounted = true;
    fetch(getPdfCoverAssetUrl(template.file))
      .then((response) => response.ok ? response.text() : Promise.reject())
      .then((content) => {
        if (mounted) setSvg(content);
      })
      .catch(() => {
        if (mounted) setSvg('');
      });

    return () => {
      mounted = false;
    };
  }, [template.file]);

  const rendered = useMemo(() => {
    if (!svg) return '';
    return buildCoverSvg(svg, {
      colorOverrides: model.settings.coverColors,
      photoUrl: model.settings.showCoverPhoto ? model.settings.customCoverUrl : undefined,
      photoTransform: model.settings.coverPhotoTransform,
      logoUrl: model.settings.showLogo ? model.settings.customLogoUrl : undefined,
      logoTransform: model.settings.coverLogoTransform,
      logoSlot: template.logoSlot,
      scopeId: `thumb_${model.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
    });
  }, [
    svg,
    model.settings.coverColors,
    model.settings.customCoverUrl,
    model.settings.customLogoUrl,
    model.settings.coverLogoTransform,
    model.settings.coverPhotoTransform,
    model.settings.showCoverPhoto,
    model.settings.showLogo,
    template.logoSlot,
  ]);

  if (!rendered) {
    return (
      <img
        src={getPdfCoverAssetUrl(template.file)}
        alt={model.name}
        className="h-full w-full object-contain"
        draggable={false}
      />
    );
  }

  return (
    <div
      className="h-full w-full"
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
};

interface TransformControlsProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  formatted: string;
  onChange: (value: number) => void;
  theme: ThemeConfig;
}

export const TransformControls: React.FC<TransformControlsProps> = ({
  label,
  value,
  min,
  max,
  step,
  formatted,
  onChange,
  theme,
}) => (
  <label className="block">
    <div className="mb-2 flex items-center justify-between gap-3">
      <span className="text-xs font-bold">{label}</span>
      <span className="font-mono text-[10px] opacity-55">{formatted}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="w-full accent-[var(--secondary)]"
      style={{ accentColor: theme.secondary }}
    />
  </label>
);
