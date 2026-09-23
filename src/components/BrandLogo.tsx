import React from 'react';
import { isDarkBackground } from '../utils/themeEngine';

type LogoOrientation = 'horizontal' | 'vertical';

interface BrandLogoProps {
  orientation?: LogoOrientation;
  backgroundColor: string;
  className?: string;
  alt?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  orientation = 'horizontal',
  backgroundColor,
  className = '',
  alt = 'Sol Amigo Pro',
}) => {
  const background = isDarkBackground(backgroundColor) ? 'escuro' : 'claro';
  const fileName =
    orientation === 'vertical'
      ? `SA_PRO_icon_bg_${background}.svg`
      : `SA_pro_bg_${background}_horizontal.svg`;
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
