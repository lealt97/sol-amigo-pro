import React from 'react';
import { ThemeConfig } from '../types';
import { BrandLogo } from './BrandLogo';

export interface SaaSLoadingScreenProps {
  title?: string;
  message?: string;
  hint?: string;
  fullScreen?: boolean;
  theme?: ThemeConfig;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const SaaSLoadingScreen: React.FC<SaaSLoadingScreenProps> = ({
  title = 'Sol Amigo Pro',
  message = 'Carregando dados...',
  hint = 'Aguarde um instante enquanto conectamos ao servidor.',
  fullScreen = false,
  theme,
  size = 'md',
  className = '',
}) => {
  const accentColor = theme?.secondary || '#0076DD';
  const textColor = theme?.text || '#FFFFFF';
  const mutedColor = theme?.dim || 'rgba(255, 255, 255, 0.65)';
  const bgColor = fullScreen ? (theme?.primary || '#0E2337') : 'transparent';

  const spinnerSize = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-16 h-16' : 'w-12 h-12';
  const logoSize = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6';

  const containerClasses = fullScreen
    ? 'fixed inset-0 z-50 flex flex-col items-center justify-center p-6 select-none animate-in fade-in duration-200'
    : `flex flex-col items-center justify-center py-20 px-6 min-h-[360px] w-full select-none animate-in fade-in duration-200 ${className}`;

  return (
    <div
      role="status"
      aria-live="polite"
      className={containerClasses}
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <div className="flex flex-col items-center text-center max-w-sm mx-auto">
        {/* Glow & Circular Brand Spinner */}
        <div className="relative flex items-center justify-center mb-4">
          {/* Subtle Ambient Glow */}
          <div
            className="absolute rounded-full blur-xl opacity-30"
            style={{
              width: size === 'sm' ? '40px' : size === 'lg' ? '80px' : '60px',
              height: size === 'sm' ? '40px' : size === 'lg' ? '80px' : '60px',
              backgroundColor: accentColor,
            }}
          />

          {/* Background Ring */}
          <div
            className={`${spinnerSize} rounded-full border-2 opacity-20`}
            style={{ borderColor: accentColor }}
          />

          {/* Animated Spinner Ring */}
          <div
            className={`absolute inset-0 ${spinnerSize} rounded-full border-2 border-transparent animate-spin`}
            style={{
              borderTopColor: accentColor,
              borderRightColor: accentColor,
            }}
          />

          {/* Center Brand Icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <BrandLogo
              orientation="vertical"
              backgroundColor={theme?.primary || '#0E2337'}
              className={`${logoSize} object-contain`}
            />
          </div>
        </div>

        {/* Brand Pre-Title */}
        <span
          className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-1"
          style={{ color: accentColor }}
        >
          {title}
        </span>

        {/* Status Message */}
        <p className="text-sm font-bold tracking-tight mb-1" style={{ color: textColor }}>
          {message}
        </p>

        {/* Hint text */}
        {hint && (
          <p className="text-[11px] leading-relaxed max-w-xs opacity-75" style={{ color: mutedColor }}>
            {hint}
          </p>
        )}

        {/* Shimmer Progress Line */}
        <div className="mt-4 w-28 h-1 rounded-full overflow-hidden bg-white/10 relative">
          <div
            className="absolute inset-y-0 w-14 rounded-full animate-pulse"
            style={{
              backgroundColor: accentColor,
              boxShadow: `0 0 8px ${accentColor}`,
            }}
          />
        </div>
      </div>
    </div>
  );
};
