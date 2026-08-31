import React, { useState, useEffect } from 'react';
import { getSeasonalLogoInfo } from '@/utils/seasonalLogo';
import { getAssetUrl } from '@/utils/assetUrl';

export interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
  /**
   * Delay in milliseconds before bringing up the full loading screen.
   * Defaults to 500ms so instantaneous operations transition seamlessly,
   * while operations taking > 500ms display the full seasonal loading screen.
   * Pass 0 to display immediately.
   */
  delayMs?: number;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading...',
  fullScreen = true,
  delayMs = 500,
}) => {
  const [isVisible, setIsVisible] = useState(delayMs <= 0);
  const { logoUrl, altText, seasonName } = getSeasonalLogoInfo();

  useEffect(() => {
    if (delayMs <= 0) {
      setIsVisible(true);
      return;
    }

    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [delayMs]);

  // While waiting under the 5-second threshold, render a seamless non-blocking theme backdrop
  // that prevents blank browser screens while keeping fast loads smooth.
  if (!isVisible) {
    return (
      <div
        className={`w-full ${fullScreen ? 'fixed inset-0 z-[9990]' : 'min-h-[160px]'
          } bg-[#F6F6F6] dark:bg-[#15162C] transition-colors duration-300 pointer-events-none opacity-0`}
        aria-hidden="true"
      />
    );
  }

  // Seasonal Aura & Spinner Ring Themes
  const getSeasonalThemeStyles = () => {
    switch (seasonName) {
      case 'Pride Season':
        return {
          glowBg: 'radial-gradient(circle, rgba(244,63,94,0.3) 0%, rgba(245,158,11,0.25) 30%, rgba(16,185,129,0.2) 60%, rgba(59,130,246,0.2) 80%, transparent 100%)',
          spinnerBorder: 'border-t-rose-500 border-r-amber-400 border-b-emerald-400 border-l-sky-500',
          accentText: 'text-rose-600 dark:text-rose-400',
          subtitle: 'Im Literally Gay • UCDS',
        };
      case 'Fall Season':
        return {
          glowBg: 'radial-gradient(circle, rgba(234,88,12,0.35) 0%, rgba(217,119,6,0.25) 45%, rgba(180,83,9,0.15) 70%, transparent 100%)',
          spinnerBorder: 'border-t-amber-500 border-r-orange-500 border-b-yellow-500 border-l-transparent',
          accentText: 'text-amber-700 dark:text-amber-400',
          subtitle: 'Fall Semester • UCDS',
        };
      case 'Winter Season':
        return {
          glowBg: 'radial-gradient(circle, rgba(56,189,248,0.35) 0%, rgba(147,197,253,0.25) 45%, rgba(199,210,254,0.15) 70%, transparent 100%)',
          spinnerBorder: 'border-t-cyan-400 border-r-sky-300 border-b-blue-500 border-l-transparent',
          accentText: 'text-cyan-600 dark:text-cyan-400',
          subtitle: 'Winter Semester • UCDS',
        };
      default:
        return {
          glowBg: 'radial-gradient(circle, rgba(0,117,162,0.35) 0%, rgba(83,175,208,0.25) 45%, rgba(28,36,76,0.15) 70%, transparent 100%)',
          spinnerBorder: 'border-t-[#0075A2] dark:border-t-[#53afd0] border-r-[#53afd0] border-b-transparent border-l-transparent',
          accentText: 'text-[#0075A2] dark:text-[#53afd0]',
          subtitle: 'University of Calgary Debate Society',
        };
    }
  };

  const theme = getSeasonalThemeStyles();

  return (
    <div
      className={`site-loader-overlay ${fullScreen ? 'fixed inset-0 z-[9999]' : 'w-full py-16'
        } flex flex-col items-center justify-center transition-all duration-500 ease-out`}
      aria-label="Loading page"
      role="status"
    >
      <div className="relative flex flex-col items-center animate-loaderFade">
        {/* Dynamic Seasonal Glowing Aura */}
        <div
          className="absolute -inset-10 rounded-full blur-2xl opacity-80 animate-pulse pointer-events-none transition-all duration-700"
          style={{ background: theme.glowBg }}
        />

        {/* Circular Logo Card with Circular Spinner Ring */}
        <div className="loader-logo-card relative w-28 h-28 rounded-full p-4 flex items-center justify-center shadow-2xl">
          {/* Circular Animated Spinner Ring */}
          <div
            className={`loader-spinner-ring absolute -inset-2.5 border-[3.5px] rounded-full animate-spin ${theme.spinnerBorder}`}
          />

          {/* Centered Seasonal UCDS Logo */}
          <img
            src={logoUrl}
            alt={altText}
            className="loader-logo-img w-full h-full object-contain relative z-10 animate-breathe"
            onError={(e) => {
              (e.target as HTMLImageElement).src = getAssetUrl('images/seo/logo_normal.png');
            }}
          />
        </div>

        {/* Loading Message & Seasonal Subtitle */}
        <div className="text-center mt-6 space-y-1 relative z-10">
          <p className="font-title font-black text-xl text-[#101426] dark:text-[#F6F6F6] tracking-tight">
            {message}
          </p>
          <p className={`font-sans text-xs font-extrabold uppercase tracking-widest ${theme.accentText}`}>
            {theme.subtitle}
          </p>
        </div>
      </div>
    </div>
  );
};
