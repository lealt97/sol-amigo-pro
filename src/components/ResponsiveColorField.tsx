import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pipette, X } from 'lucide-react';

type EyeDropperConstructor = new () => {
  open: () => Promise<{ sRGBHex: string }>;
};

type ResponsiveColorFieldProps = {
  label: string;
  value: string;
  borderColor: string;
  accentColor: string;
  onChange: (color: string) => void;
};

type HsvColor = {
  hue: number;
  saturation: number;
  value: number;
};

const HEX_COLOR_PATTERN = /^#[0-9A-F]{6}$/i;
const DEFAULT_COLOR = '#0076DD';
const FORM_COLOR_PRESETS = ['#B4BF8A', '#64B0F3', '#0076DD', '#FACB5C', '#DEC488', '#0E2337', '#183956', '#FFFFFF', '#000000'];

const clamp = (number: number, minimum: number, maximum: number) => Math.min(Math.max(number, minimum), maximum);

const rgbToHex = (red: number, green: number, blue: number) => `#${[red, green, blue]
  .map((channel) => Math.round(channel).toString(16).padStart(2, '0'))
  .join('')}`.toUpperCase();

const hexToRgb = (hex: string) => {
  const normalized = HEX_COLOR_PATTERN.test(hex) ? hex.slice(1) : DEFAULT_COLOR.slice(1);
  return {
    red: Number.parseInt(normalized.slice(0, 2), 16),
    green: Number.parseInt(normalized.slice(2, 4), 16),
    blue: Number.parseInt(normalized.slice(4, 6), 16),
  };
};

const rgbToHsv = (red: number, green: number, blue: number): HsvColor => {
  const normalizedRed = red / 255;
  const normalizedGreen = green / 255;
  const normalizedBlue = blue / 255;
  const maximum = Math.max(normalizedRed, normalizedGreen, normalizedBlue);
  const minimum = Math.min(normalizedRed, normalizedGreen, normalizedBlue);
  const difference = maximum - minimum;
  let hue = 0;

  if (difference) {
    if (maximum === normalizedRed) hue = 60 * (((normalizedGreen - normalizedBlue) / difference) % 6);
    else if (maximum === normalizedGreen) hue = 60 * (((normalizedBlue - normalizedRed) / difference) + 2);
    else hue = 60 * (((normalizedRed - normalizedGreen) / difference) + 4);
  }

  if (hue < 0) hue += 360;
  return {
    hue,
    saturation: maximum ? (difference / maximum) * 100 : 0,
    value: maximum * 100,
  };
};

const hsvToHex = ({ hue, saturation, value }: HsvColor) => {
  const normalizedSaturation = saturation / 100;
  const normalizedValue = value / 100;
  const chroma = normalizedValue * normalizedSaturation;
  const hueSection = hue / 60;
  const secondary = chroma * (1 - Math.abs((hueSection % 2) - 1));
  const match = normalizedValue - chroma;
  let red = 0;
  let green = 0;
  let blue = 0;

  if (hueSection < 1) [red, green, blue] = [chroma, secondary, 0];
  else if (hueSection < 2) [red, green, blue] = [secondary, chroma, 0];
  else if (hueSection < 3) [red, green, blue] = [0, chroma, secondary];
  else if (hueSection < 4) [red, green, blue] = [0, secondary, chroma];
  else if (hueSection < 5) [red, green, blue] = [secondary, 0, chroma];
  else [red, green, blue] = [chroma, 0, secondary];

  return rgbToHex((red + match) * 255, (green + match) * 255, (blue + match) * 255);
};

const colorToHsv = (color: string) => {
  const { red, green, blue } = hexToRgb(color);
  return rgbToHsv(red, green, blue);
};

export const ResponsiveColorField: React.FC<ResponsiveColorFieldProps> = ({
  label,
  value,
  borderColor,
  accentColor,
  onChange,
}) => {
  const safeValue = HEX_COLOR_PATTERN.test(value) ? value.toUpperCase() : DEFAULT_COLOR;
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [nativePicking, setNativePicking] = useState(false);
  const [hsv, setHsv] = useState<HsvColor>(() => colorToHsv(safeValue));
  const [draftHex, setDraftHex] = useState(safeValue);
  const saturationDragging = useRef(false);
  const hueDragging = useRef(false);

  const hueColor = useMemo(() => `hsl(${Math.round(hsv.hue)} 100% 50%)`, [hsv.hue]);

  useEffect(() => {
    if (!paletteOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [paletteOpen]);

  const updateHsv = (nextColor: HsvColor) => {
    const normalized = {
      hue: ((nextColor.hue % 360) + 360) % 360,
      saturation: clamp(nextColor.saturation, 0, 100),
      value: clamp(nextColor.value, 0, 100),
    };
    setHsv(normalized);
    setDraftHex(hsvToHex(normalized));
  };

  const applyHexToPalette = (hex: string) => {
    const normalized = hex.toUpperCase();
    setDraftHex(normalized);
    if (HEX_COLOR_PATTERN.test(normalized)) setHsv(colorToHsv(normalized));
  };

  const openPalette = () => {
    setHsv(colorToHsv(safeValue));
    setDraftHex(safeValue);
    setPaletteOpen(true);
  };

  const openColorTool = async () => {
    const hasTouchPointer = window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
    const EyeDropper = (window as Window & { EyeDropper?: EyeDropperConstructor }).EyeDropper;

    if (hasTouchPointer || !EyeDropper) {
      openPalette();
      return;
    }

    setNativePicking(true);
    try {
      const result = await new EyeDropper().open();
      onChange(result.sRGBHex.toUpperCase());
    } catch (dropperError) {
      if (!(dropperError instanceof DOMException) || dropperError.name !== 'AbortError') openPalette();
    } finally {
      setNativePicking(false);
    }
  };

  const updateSaturationValue = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const saturation = ((event.clientX - bounds.left) / bounds.width) * 100;
    const brightness = (1 - ((event.clientY - bounds.top) / bounds.height)) * 100;
    updateHsv({ ...hsv, saturation, value: brightness });
  };

  const updateHue = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const hue = ((event.clientX - bounds.left) / bounds.width) * 360;
    updateHsv({ ...hsv, hue: clamp(hue, 0, 359.999) });
  };

  const confirmColor = () => {
    if (!HEX_COLOR_PATTERN.test(draftHex)) return;
    onChange(draftHex.toUpperCase());
    setPaletteOpen(false);
  };

  const dialogTitleId = `touch-color-palette-${label.replaceAll(' ', '-').toLowerCase()}`;

  return (
    <div>
      <span className="mb-1.5 block text-xs font-bold">{label}</span>
      <div className="flex gap-2">
        <input
          type="color"
          value={safeValue}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="h-[42px] w-12 shrink-0 rounded-lg border bg-transparent p-1"
          style={{ borderColor }}
          aria-label={`Selecionar ${label.toLowerCase()}`}
        />
        <input
          className="crm-input min-w-0 flex-1 font-mono"
          value={value}
          maxLength={7}
          inputMode="text"
          autoCapitalize="characters"
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          aria-label={`${label} em hexadecimal`}
        />
        <button
          type="button"
          onClick={openColorTool}
          disabled={nativePicking}
          className="btn-outline inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-lg border"
          style={{ borderColor }}
          aria-label={`Abrir seletor completo para ${label.toLowerCase()}`}
          title="Abrir seletor de cores"
        >
          <Pipette className={`h-4 w-4 ${nativePicking ? 'animate-pulse' : ''}`} />
        </button>
      </div>

      {paletteOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-2xl border bg-[#0E2337] p-4 text-white shadow-2xl sm:p-5"
            style={{ borderColor }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id={dialogTitleId} className="font-extrabold">Escolher {label.toLowerCase()}</h3>
                <p className="mt-1 text-xs leading-5 text-white/65">Mova o dedo pela paleta e ajuste a tonalidade abaixo.</p>
              </div>
              <button type="button" onClick={() => setPaletteOpen(false)} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/20" aria-label="Fechar seletor de cores"><X className="h-4 w-4" /></button>
            </div>

            <div
              role="slider"
              tabIndex={0}
              aria-label="Saturação e luminosidade"
              aria-valuetext={draftHex}
              className="relative mt-5 h-56 w-full touch-none overflow-hidden rounded-xl border border-white/20 shadow-inner sm:h-64"
              style={{
                background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), ${hueColor}`,
              }}
              onPointerDown={(event) => {
                saturationDragging.current = true;
                event.currentTarget.setPointerCapture(event.pointerId);
                updateSaturationValue(event);
              }}
              onPointerMove={(event) => {
                if (saturationDragging.current) updateSaturationValue(event);
              }}
              onPointerUp={(event) => {
                saturationDragging.current = false;
                event.currentTarget.releasePointerCapture(event.pointerId);
              }}
              onPointerCancel={() => { saturationDragging.current = false; }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowLeft') updateHsv({ ...hsv, saturation: hsv.saturation - 1 });
                if (event.key === 'ArrowRight') updateHsv({ ...hsv, saturation: hsv.saturation + 1 });
                if (event.key === 'ArrowUp') updateHsv({ ...hsv, value: hsv.value + 1 });
                if (event.key === 'ArrowDown') updateHsv({ ...hsv, value: hsv.value - 1 });
              }}
            >
              <span
                className="pointer-events-none absolute h-7 w-7 -translate-x-1/2 translate-y-1/2 rounded-full border-4 border-white shadow-[0_0_0_2px_rgba(0,0,0,.55)]"
                style={{ left: `${hsv.saturation}%`, bottom: `${hsv.value}%`, backgroundColor: draftHex }}
              />
            </div>

            <div
              role="slider"
              tabIndex={0}
              aria-label="Tonalidade"
              aria-valuemin={0}
              aria-valuemax={359}
              aria-valuenow={Math.round(hsv.hue)}
              className="relative mt-4 h-8 w-full touch-none rounded-full border border-white/20"
              style={{ background: 'linear-gradient(to right, #FF0000, #FFFF00, #00FF00, #00FFFF, #0000FF, #FF00FF, #FF0000)' }}
              onPointerDown={(event) => {
                hueDragging.current = true;
                event.currentTarget.setPointerCapture(event.pointerId);
                updateHue(event);
              }}
              onPointerMove={(event) => {
                if (hueDragging.current) updateHue(event);
              }}
              onPointerUp={(event) => {
                hueDragging.current = false;
                event.currentTarget.releasePointerCapture(event.pointerId);
              }}
              onPointerCancel={() => { hueDragging.current = false; }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') updateHsv({ ...hsv, hue: hsv.hue - 1 });
                if (event.key === 'ArrowRight' || event.key === 'ArrowUp') updateHsv({ ...hsv, hue: hsv.hue + 1 });
              }}
            >
              <span className="pointer-events-none absolute top-1/2 h-10 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-transparent shadow-[0_0_0_2px_rgba(0,0,0,.45)]" style={{ left: `${(hsv.hue / 360) * 100}%` }} />
            </div>

            <div className="mt-5 flex items-center gap-3">
              <span className="h-11 w-11 shrink-0 rounded-xl border border-white/25" style={{ backgroundColor: HEX_COLOR_PATTERN.test(draftHex) ? draftHex : safeValue }} />
              <label className="min-w-0 flex-1"><span className="mb-1 block text-[10px] font-bold uppercase tracking-[.1em] text-white/50">Código hexadecimal</span><input value={draftHex} maxLength={7} onChange={(event) => applyHexToPalette(event.target.value)} className="h-11 w-full rounded-lg border border-white/20 bg-white/5 px-3 font-mono text-sm uppercase outline-none focus:border-white/50" /></label>
            </div>

            <div className="mt-4 grid grid-cols-9 gap-2" aria-label="Cores da marca e cores básicas">
              {FORM_COLOR_PRESETS.map((preset) => (
                <button key={preset} type="button" onClick={() => applyHexToPalette(preset)} className="aspect-square rounded-full border border-white/20 p-1" aria-label={`Selecionar ${preset}`} title={preset}><span className="block h-full w-full rounded-full" style={{ backgroundColor: preset }} /></button>
              ))}
            </div>

            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setPaletteOpen(false)} className="btn-outline h-11 flex-1 rounded-lg border border-white/20 text-xs font-bold">Cancelar</button>
              <button type="button" onClick={confirmColor} disabled={!HEX_COLOR_PATTERN.test(draftHex)} className="btn-filled h-11 flex-1 rounded-lg text-xs font-extrabold" style={{ backgroundColor: accentColor, color: '#0E2337' }}>Usar esta cor</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
