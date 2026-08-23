import React from 'react';

type LogoOrientation = 'horizontal' | 'vertical';

interface BrandLogoProps {
  orientation?: LogoOrientation;
  backgroundColor: string;
  className?: string;
  alt?: string;
}

function isDarkBackground(hex: string): boolean {
  const clean = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return true;

  const toLinear = (value: number) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };

  const r = toLinear(parseInt(clean.slice(0, 2), 16));
  const g = toLinear(parseInt(clean.slice(2, 4), 16));
  const b = toLinear(parseInt(clean.slice(4, 6), 16));
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  return luminance < 0.42;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  orientation = 'horizontal',
  backgroundColor,
  className = '',
  alt = 'Sol Amigo Pro',
}) => {
  const background = isDarkBackground(backgroundColor) ? 'escuro' : 'claro';
  const fileName = `SA_pro_bg_${background}_${orientation}.svg`;
  const src = `${import.meta.env.BASE_URL}brand/${fileName}`;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      draggable={false}
    />
  );
};
