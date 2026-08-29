import React, { useEffect, useRef } from 'react';
import { X, Sun, Moon, Sparkles, EyeOff, ShieldCheck, Check } from 'lucide-react';
import { useAppSettings } from '@/contexts/AppSettingsContext';

export const SettingsModal: React.FC = () => {
  const {
    theme,
    toggleTheme,
    animationsEnabled,
    toggleAnimations,
    isSettingsOpen,
    setIsSettingsOpen,
  } = useAppSettings();

  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSettingsOpen) {
        setIsSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen, setIsSettingsOpen]);

  if (!isSettingsOpen) return null;

  return (
    <div
      className="settings-modal-backdrop"
      onClick={(e) => {
        if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
          setIsSettingsOpen(false);
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div ref={cardRef} className="settings-modal-card">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1C244C]/15 dark:border-[#53afd0]/20 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0075A2]/10 dark:bg-[#53afd0]/20 text-[#0075A2] dark:text-[#53afd0] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="settings-modal-title" className="font-bold text-lg text-[#1C244C] dark:text-[#F6F6F6]">
                Site Settings
              </h2>
              <p className="text-xs text-[#0075A2] dark:text-[#53afd0]">
                Preferences & Accessibility
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsSettingsOpen(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#1C244C]/60 dark:text-[#F6F6F6]/60 hover:text-[#1C244C] dark:hover:text-[#F6F6F6] hover:bg-[#1C244C]/10 dark:hover:bg-[#53afd0]/20 transition"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Setting 1: Theme Mode Switch */}
        <div className="mb-5">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#1C244C]/70 dark:text-[#cbd5e1] mb-2">
            Appearance Theme
          </label>
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-[#1C244C]/50 border border-[#1C244C]/12 dark:border-[#53afd0]/20 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#0075A2]/10 dark:bg-[#53afd0]/20 text-[#0075A2] dark:text-[#53afd0]">
                {theme === 'dark' ? (
                  <Moon className="w-4 h-4" />
                ) : (
                  <Sun className="w-4 h-4" />
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-[#1C244C] dark:text-[#F6F6F6]">
                  {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                </p>
                <p className="text-xs text-[#0075A2] dark:text-[#cbd5e1] mt-0.5">
                  {theme === 'dark'
                    ? 'Dark blue high-contrast palette active'
                    : 'Clean light off-white palette active'}
                </p>
              </div>
            </div>

            <button
              onClick={toggleTheme}
              role="switch"
              aria-checked={theme === 'dark'}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                theme === 'dark' ? 'bg-[#0075A2]' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Setting 2: Animations / Reduced Motion Switch */}
        <div className="mb-6">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#1C244C]/70 dark:text-[#cbd5e1] mb-2">
            Visual Motion & Effects
          </label>
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-[#1C244C]/50 border border-[#1C244C]/12 dark:border-[#53afd0]/20 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#0075A2]/10 dark:bg-[#53afd0]/20 text-[#0075A2] dark:text-[#53afd0]">
                {animationsEnabled ? (
                  <Sparkles className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-[#1C244C] dark:text-[#F6F6F6]">
                  {animationsEnabled ? 'Active 3D Animations' : 'Reduced Motion (Fading)'}
                </p>
                <p className="text-xs text-[#0075A2] dark:text-[#cbd5e1] mt-0.5">
                  {animationsEnabled
                    ? '3D carousel rotation and floating physics enabled'
                    : 'Carousel gently fades between photos'}
                </p>
              </div>
            </div>

            <button
              onClick={toggleAnimations}
              role="switch"
              aria-checked={animationsEnabled}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                animationsEnabled ? 'bg-[#0075A2]' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  animationsEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Modal Footer with Checkmark Button */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#1C244C] text-[#F6F6F6] dark:bg-[#53afd0] dark:text-[#15162C] hover:opacity-90 transition shadow-md shadow-[#0075A2]/20"
            title="Save and Close"
            aria-label="Save and Close"
          >
            <Check className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
