import type { PdfElementTransform } from '../types';

export interface CoverColorToken {
  source: string;
  normalized: string;
  locked: boolean;
}

export interface CoverPhotoBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CoverLogoSlot extends CoverPhotoBounds {
  background: string;
}

const NAMED_COLORS: Record<string, string> = {
  white: '#FFFFFF',
  black: '#000000',
  grey: '#808080',
  gray: '#808080',
};

export const normalizeSvgColor = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'none' || trimmed.startsWith('url(')) return null;

  const named = NAMED_COLORS[trimmed.toLowerCase()];
  if (named) return named;

  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    return `#${trimmed.slice(1).split('').map((char) => char + char).join('').toUpperCase()}`;
  }

  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed.toUpperCase();
  return null;
};

export const isLockedCoverColor = (value: string): boolean => {
  const normalized = normalizeSvgColor(value);
  if (!normalized) return true;
  if (normalized === '#000000') return false;

  const r = Number.parseInt(normalized.slice(1, 3), 16);
  const g = Number.parseInt(normalized.slice(3, 5), 16);
  const b = Number.parseInt(normalized.slice(5, 7), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const average = (r + g + b) / 3;

  const white = min >= 245;
  const gray = max - min <= 14 && average > 12;
  return white || gray;
};

export const extractCoverColors = (svgText: string): CoverColorToken[] => {
  const values: string[] = [];
  const pattern = /(?:fill|stroke)="([^"]+)"/gi;
  let match: RegExpExecArray | null = null;

  while ((match = pattern.exec(svgText))) {
    const normalized = normalizeSvgColor(match[1]);
    if (!normalized || values.includes(normalized)) continue;
    values.push(normalized);
  }

  return values.map((normalized) => ({
    source: normalized,
    normalized,
    locked: isLockedCoverColor(normalized),
  }));
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const normalizeTransform = (
  transform: Partial<PdfElementTransform> | undefined,
  kind: 'logo' | 'photo'
): PdfElementTransform => ({
  offsetX: Number.isFinite(transform?.offsetX) ? Number(transform?.offsetX) : 0,
  offsetY: Number.isFinite(transform?.offsetY) ? Number(transform?.offsetY) : 0,
  scale: clamp(
    Number.isFinite(transform?.scale) ? Number(transform?.scale) : 1,
    kind === 'photo' ? 1 : 0.2,
    kind === 'photo' ? 4 : 4
  ),
  rotation: clamp(
    Number.isFinite(transform?.rotation) ? Number(transform?.rotation) : 0,
    -180,
    180
  ),
});

export const getSafePhotoScale = (
  bounds: CoverPhotoBounds,
  rotation: number,
  requestedScale: number
): number => {
  if (!bounds.width || !bounds.height) return Math.max(1, requestedScale);
  const radians = Math.abs(rotation % 180) * (Math.PI / 180);
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  const widthRatio = bounds.height / bounds.width;
  const heightRatio = bounds.width / bounds.height;
  const rotationCoverage = Math.max(
    cos + widthRatio * sin,
    cos + heightRatio * sin
  );
  const safetyMargin = sin > 0.0001 ? 0.04 : 0;
  return Math.max(1, requestedScale, rotationCoverage + safetyMargin);
};

export const getPhotoPanLimits = (
  bounds: CoverPhotoBounds,
  transform: PdfElementTransform
): { x: number; y: number } => {
  const safeScale = getSafePhotoScale(bounds, transform.rotation, transform.scale);
  const radians = Math.abs(transform.rotation % 180) * (Math.PI / 180);
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  const rotationCoverage = Math.max(
    cos + (bounds.height / Math.max(1, bounds.width)) * sin,
    cos + (bounds.width / Math.max(1, bounds.height)) * sin
  );
  const extra = Math.max(0, safeScale - rotationCoverage);
  return {
    x: Math.max(0, (extra * bounds.width) / 2),
    y: Math.max(0, (extra * bounds.height) / 2),
  };
};

const createSvgElement = (doc: Document, name: string) =>
  doc.createElementNS('http://www.w3.org/2000/svg', name);

const getNumericAttribute = (element: Element, name: string, fallback: number) => {
  const value = Number.parseFloat(element.getAttribute(name) || '');
  return Number.isFinite(value) ? value : fallback;
};

export const extractCoverPhotoBounds = (svgText: string): CoverPhotoBounds | null => {
  if (typeof DOMParser === 'undefined') return null;
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const mask = doc.querySelector('mask');
  if (!mask) return null;
  return {
    x: getNumericAttribute(mask, 'x', 0),
    y: getNumericAttribute(mask, 'y', 0),
    width: getNumericAttribute(mask, 'width', 595),
    height: getNumericAttribute(mask, 'height', 842),
  };
};

export interface BuildCoverSvgOptions {
  colorOverrides?: Record<string, string>;
  photoUrl?: string;
  photoTransform?: Partial<PdfElementTransform>;
  logoUrl?: string;
  logoTransform?: Partial<PdfElementTransform>;
  logoSlot?: CoverLogoSlot;
  scopeId?: string;
}

export const stripLogoPlaceholderMarkup = (svgText: string): string =>
  svgText
    .replace(
      /<path\b(?=[^>]*data-solamigo-logo-placeholder=["']true["'])[^>]*\/>/gi,
      ''
    )
    .replace(
      /<g\b(?=[^>]*data-solamigo-logo-placeholder=["']true["'])[^>]*>[\s\S]*?<\/g>/gi,
      ''
    );

export const buildCoverSvg = (svgText: string, options: BuildCoverSvgOptions): string => {
  const sourceSvg = options.logoUrl ? stripLogoPlaceholderMarkup(svgText) : svgText;
  if (typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') return sourceSvg;

  const doc = new DOMParser().parseFromString(sourceSvg, 'image/svg+xml');
  const svg = doc.documentElement;
  if (svg.nodeName.toLowerCase() !== 'svg') return svgText;

  const rawScope = options.scopeId || ('cv_' + Math.random().toString(36).slice(2, 8));
  const scopeId = rawScope.replace(/[^a-zA-Z0-9_-]/g, '_');

  // Prefixa todos os IDs internos do SVG (masks, clipPaths, gradients) para isolar completamente
  // cada SVG no documento e evitar que a edição de uma capa altere as miniaturas dos outros cards.
  const idMap = new Map<string, string>();
  doc.querySelectorAll('[id]').forEach((element) => {
    const oldId = element.getAttribute('id');
    if (oldId && !oldId.startsWith(scopeId + '_')) {
      const newId = `${scopeId}_${oldId}`;
      idMap.set(oldId, newId);
      element.setAttribute('id', newId);
    }
  });

  if (idMap.size > 0) {
    const attributesToUpdate = [
      'clip-path',
      'mask',
      'fill',
      'stroke',
      'filter',
      'href',
      'xlink:href',
      'style',
    ] as const;

    doc.querySelectorAll('*').forEach((element) => {
      attributesToUpdate.forEach((attr) => {
        const val = element.getAttribute(attr);
        if (val) {
          let updatedVal = val;
          idMap.forEach((newId, oldId) => {
            if (updatedVal.includes(`url(#${oldId})`)) {
              updatedVal = updatedVal.split(`url(#${oldId})`).join(`url(#${newId})`);
            }
            if (updatedVal.includes(`url('#${oldId}')`)) {
              updatedVal = updatedVal.split(`url('#${oldId}')`).join(`url('#${newId}')`);
            }
            if (updatedVal.includes(`url("#${oldId}")`)) {
              updatedVal = updatedVal.split(`url("#${oldId}")`).join(`url("#${newId}")`);
            }
            if (updatedVal === `#${oldId}`) {
              updatedVal = `#${newId}`;
            }
          });
          if (updatedVal !== val) {
            element.setAttribute(attr, updatedVal);
          }
        }
      });

      // Também verifica xlink:href com namespace explícito
      const xlinkHref = element.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
      if (xlinkHref) {
        let updatedXlink = xlinkHref;
        idMap.forEach((newId, oldId) => {
          if (updatedXlink === `#${oldId}`) {
            updatedXlink = `#${newId}`;
          }
        });
        if (updatedXlink !== xlinkHref) {
          element.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', updatedXlink);
        }
      }
    });
  }

  const colorOverrides = options.colorOverrides ?? {};
  doc.querySelectorAll('[fill],[stroke]').forEach((element) => {
    (['fill', 'stroke'] as const).forEach((attribute) => {
      const current = element.getAttribute(attribute);
      if (!current) return;
      const normalized = normalizeSvgColor(current);
      if (!normalized || isLockedCoverColor(normalized)) return;
      const replacement = colorOverrides[normalized] || colorOverrides[current];
      const normalizedReplacement = replacement ? normalizeSvgColor(replacement) : null;
      if (normalizedReplacement) element.setAttribute(attribute, normalizedReplacement);
    });
  });

  if (options.photoUrl) {
    const mask = doc.querySelector('mask');
    const maskPath = mask?.querySelector('path[d]');
    const maskId = mask?.getAttribute('id');
    const targetGroup = maskId
      ? Array.from(doc.querySelectorAll('g')).find((group) => group.getAttribute('mask') === `url(#${maskId})`)
      : undefined;

    if (mask && maskPath && targetGroup) {
      let defs = svg.querySelector('defs');
      if (!defs) {
        defs = createSvgElement(doc, 'defs') as SVGDefsElement;
        svg.insertBefore(defs, svg.firstChild);
      }

      const clipId = `solamigo_photo_clip_${scopeId}`;
      const existingClip = doc.getElementById(clipId);
      existingClip?.remove();

      const clipPath = createSvgElement(doc, 'clipPath');
      clipPath.setAttribute('id', clipId);
      const clipShape = maskPath.cloneNode(true) as Element;
      clipShape.setAttribute('fill', '#000000');
      clipShape.removeAttribute('stroke');
      clipPath.appendChild(clipShape);
      defs.appendChild(clipPath);

      const bounds: CoverPhotoBounds = {
        x: getNumericAttribute(mask, 'x', 0),
        y: getNumericAttribute(mask, 'y', 0),
        width: getNumericAttribute(mask, 'width', 595),
        height: getNumericAttribute(mask, 'height', 842),
      };
      const transform = normalizeTransform(options.photoTransform, 'photo');
      const scale = getSafePhotoScale(bounds, transform.rotation, transform.scale);
      const limits = getPhotoPanLimits(bounds, { ...transform, scale });
      const offsetX = clamp(transform.offsetX, -limits.x, limits.x);
      const offsetY = clamp(transform.offsetY, -limits.y, limits.y);
      const cx = bounds.x + bounds.width / 2;
      const cy = bounds.y + bounds.height / 2;

      const image = createSvgElement(doc, 'image');
      image.setAttribute('href', options.photoUrl);
      image.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', options.photoUrl);
      image.setAttribute('x', String(bounds.x));
      image.setAttribute('y', String(bounds.y));
      image.setAttribute('width', String(bounds.width));
      image.setAttribute('height', String(bounds.height));
      image.setAttribute('preserveAspectRatio', 'xMidYMid slice');
      image.setAttribute(
        'transform',
        `translate(${offsetX} ${offsetY}) translate(${cx} ${cy}) rotate(${transform.rotation}) scale(${scale}) translate(${-cx} ${-cy})`
      );

      targetGroup.replaceChildren(image);
      targetGroup.removeAttribute('mask');
      targetGroup.setAttribute('clip-path', `url(#${clipId})`);
    }
  }

  if (options.logoUrl && options.logoSlot) {
    const slot = options.logoSlot;
    const transform = normalizeTransform(options.logoTransform, 'logo');
    const cx = slot.x + slot.width / 2;
    const cy = slot.y + slot.height / 2;

    // O placeholder "Seu logo aqui" é removido do markup antes do SVG ser
    // renderizado. Assim ele não existe atrás da logo e nenhuma faixa sólida
    // precisa ser desenhada para escondê-lo.
    const logo = createSvgElement(doc, 'image');
    logo.setAttribute('href', options.logoUrl);
    logo.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', options.logoUrl);
    logo.setAttribute('x', String(slot.x));
    logo.setAttribute('y', String(slot.y));
    logo.setAttribute('width', String(slot.width));
    logo.setAttribute('height', String(slot.height));
    logo.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    logo.setAttribute(
      'transform',
      `translate(${transform.offsetX} ${transform.offsetY}) translate(${cx} ${cy}) rotate(${transform.rotation}) scale(${transform.scale}) translate(${-cx} ${-cy})`
    );
    logo.setAttribute('data-solamigo-cover-logo', 'true');
    svg.appendChild(logo);
  }

  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('style', 'display:block;width:100%;height:100%;');

  return new XMLSerializer().serializeToString(svg);
};
