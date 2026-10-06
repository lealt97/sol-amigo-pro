import type { PdfSettingsConfig, SolarProposal } from '../types';
import { getPdfCoverTemplate } from '../data/pdfCoverTemplates';

const NS = 'http://www.w3.org/2000/svg';
const date = (value?: string) => {
  if (!value) return 'Não informada';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

/** Replace explicitly marked outline placeholders without changing decorative SVG artwork. */
export function fillPdfCoverFields(svgText: string, proposal: SolarProposal, settings: PdfSettingsConfig): string {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const svg = doc.documentElement;
  if (svg.localName !== 'svg') throw new Error('Capa SVG inválida.');
  svg.setAttribute("data-cover-template", getPdfCoverTemplate(settings.template).id);
  const values: Record<string, string> = {
    client: proposal.clientName,
    location: [proposal.clientCity, proposal.clientState].filter(Boolean).join(' / '),
    power: new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(proposal.systemPowerKWp) + ' kWp',
    date: date(proposal.createdAt),
    validity: 'Validade: ' + date(proposal.validUntil),
  };
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  const addText = (group: Element, value: string, x: number, y: number, width: number, fontSize: number) => {
    const text = doc.createElementNS(NS, 'text');
    text.setAttribute('x', String(x));
    text.setAttribute('y', String(y));
    text.setAttribute('font-family', settings.font + ', Arial, sans-serif');
    text.setAttribute('font-weight', '600');
    let size = fontSize;
    if (context) {
      context.font = '600 ' + size + 'px ' + settings.font;
      const measured = context.measureText(value).width;
      if (measured > width) size = Math.max(8, size * width / measured);
    }
    text.setAttribute('font-size', String(size));
    if (context) {
      context.font = '600 ' + size + 'px ' + settings.font;
      if (context.measureText(value).width > width) {
        let shortened = value;
        while (shortened.length && context.measureText(shortened + '…').width > width) shortened = shortened.slice(0, -1);
        text.textContent = shortened + '…';
      } else text.textContent = value;
    } else text.textContent = value;
    const title = doc.createElementNS(NS, 'title');
    title.textContent = value;
    group.replaceChildren(title, text);
  };
  const contrastColor = (background: string) => {
    const hex = background.replace('#', '');
    if (!/^[0-9a-f]{6}$/i.test(hex)) return '#183956';
    const [r, g, b] = [0, 2, 4].map(offset => parseInt(hex.slice(offset, offset + 2), 16));
    return (r * 299 + g * 587 + b * 114) / 1000 < 150 ? '#FFFFFF' : '#183956';
  };
  doc.querySelectorAll('[data-solamigo-field]').forEach(group => {
    const field = group.getAttribute('data-solamigo-field')!;
    const template = getPdfCoverTemplate(settings.template).id;
    if (template === 'a4-12') {
      const background = field === 'power' ? '#F8B51F' : '#142637';
      group.setAttribute('fill', contrastColor(settings.coverColors?.[background] || background));
    } else if (template === 'a4-03' && field === 'power') {
      group.setAttribute('fill', contrastColor(settings.coverColors?.['#0051F0'] || '#0051F0'));
    } else if (template === 'a4-08' || template === 'a4-09') {
      group.setAttribute('fill', '#183956');
    }
    addText(group, values[field] || 'Não informado', Number(group.getAttribute('data-field-x')),
      Number(group.getAttribute('data-field-y')), Number(group.getAttribute('data-field-width')),
      Number(group.getAttribute('data-field-font-size')));
  });
  if (!settings.showLogo || !settings.customLogoUrl) {
    const placeholders = Array.from(doc.querySelectorAll('[data-solamigo-logo-placeholder]'));
    const color = placeholders[0]?.getAttribute('fill') || '#183956';
    placeholders.forEach(element => element.remove());
    const slot = getPdfCoverTemplate(settings.template).logoSlot;
    const company = doc.createElementNS(NS, 'g');
    company.setAttribute('data-solamigo-field', 'company');
    company.setAttribute('fill', color);
    addText(company, proposal.companyInfo?.name || proposal.companyInfo?.representative || 'Integradora',
      slot.x, slot.y + slot.height / 2 + 5, slot.width, 14);
    svg.appendChild(company);
  }
  return new XMLSerializer().serializeToString(svg);
}
