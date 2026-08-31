import React, { useState, useEffect } from 'react';
import { ArrowRight, Info, Sparkles } from 'lucide-react';
import { RotatingBackground } from './RotatingBackground';
import { getAssetUrl } from '@/utils/assetUrl';

export const HomeHero: React.FC = () => {
  // Speech bubbles state for interactive badges
  const [rexSpeech, setRexSpeech] = useState<string | null>(null);
  const [rexIndex, setRexIndex] = useState(0);
  const [rexClickCount, setRexClickCount] = useState(0);
  const [showGnome, setShowGnome] = useState(false);

  const [canadaSpeech, setCanadaSpeech] = useState<string | null>(null);
  const [canadaIndex, setCanadaIndex] = useState(0);

  const [ucalgarySpeech, setUcalgarySpeech] = useState<string | null>(null);
  const [gavelSpeech, setGavelSpeech] = useState<string | null>(null);

  // Auto-hide timers
  useEffect(() => {
    if (!rexSpeech) return;
    const timer = setTimeout(() => setRexSpeech(null), 3000);
    return () => clearTimeout(timer);
  }, [rexSpeech]);

  useEffect(() => {
    if (!canadaSpeech) return;
    const timer = setTimeout(() => setCanadaSpeech(null), 3000);
    return () => clearTimeout(timer);
  }, [canadaSpeech]);

  useEffect(() => {
    if (!ucalgarySpeech) return;
    const timer = setTimeout(() => setUcalgarySpeech(null), 3000);
    return () => clearTimeout(timer);
  }, [ucalgarySpeech]);

  useEffect(() => {
    if (!gavelSpeech) return;
    const timer = setTimeout(() => setGavelSpeech(null), 3000);
    return () => clearTimeout(timer);
  }, [gavelSpeech]);

  // Click handlers
  const handleRexClick = () => {
    const nextCount = rexClickCount + 1;
    if (nextCount >= 10) {
      setRexClickCount(0);
      setShowGnome(true);
      try {
        const audio = new Audio(getAssetUrl('audio/gnome.mp3'));
        audio.currentTime = 0;
        audio.play().catch((err) => {
          console.warn('Audio playback prevented or unsupported:', err);
        });
      } catch (err) {
        console.warn('Audio error:', err);
      }

      // Automatically disappear within 0.4 seconds (400ms)
      setTimeout(() => {
        setShowGnome(false);
      }, 400);
    } else {
      setRexClickCount(nextCount);
    }

    const rexQuotes = ['Grrrr', 'Hey', 'What was that for?'];
    setRexSpeech(rexQuotes[rexIndex % rexQuotes.length]);
    setRexIndex((prev) => prev + 1);
  };

  const handleCanadaClick = () => {
    const canadaQuotes = ['O Canada!', 'True north strong and free', 'Ya like clicking son?'];
    setCanadaSpeech(canadaQuotes[canadaIndex % canadaQuotes.length]);
    setCanadaIndex((prev) => prev + 1);
  };

  const handleUcalgaryClick = () => {
    setUcalgarySpeech('mess with the bull...');
  };

  const handleGavelClick = () => {
    setGavelSpeech('gavel noises');
  };

  return (
    <div className="home-hero-container">
      {/* Background Rotating 3D Concave Panoramic Stage */}
      <RotatingBackground />

      {/* Center Animated Title Card Container */}
      <div className="hero-content-wrapper">
        {/* Main Glass Title Card with Floating Badges (Unblurred & Crisp) */}
        <div className="hero-glass-card">
          {/* Floating & Interactive Badges around title card */}

          {/* Badge 1: Canada Flag (top-right) */}
          <div className="floating-badge-anchor badge-canada" title="Click me!">
            {canadaSpeech && (
              <div className="badge-speech-bubble" role="status">
                {canadaSpeech}
              </div>
            )}
            <div className="floating-badge-scaler" onClick={handleCanadaClick}>
              <img
                src={getAssetUrl('images/photos/canada_flag.png')}
                alt="Canada Flag"
                className="w-full h-full object-contain pointer-events-none"
              />
            </div>
          </div>

          {/* Badge 2: Rex Mascot (bottom-left) */}
          <div className="floating-badge-anchor badge-rex" title="Click me!">
            {/* Rex 10-Click Gnome Easter Egg (Appears directly above Rex for 0.4s) */}
            {showGnome && (
              <div className="rex-gnome-amateur-popup" aria-hidden="true">
                <img
                  src={getAssetUrl('images/photos/gnome.png')}
                  alt="Gnome Easter Egg"
                  className="rex-gnome-amateur-img"
                />
              </div>
            )}

            {rexSpeech && !showGnome && (
              <div className="badge-speech-bubble" role="status">
                {rexSpeech}
              </div>
            )}
            <div className="floating-badge-scaler" onClick={handleRexClick}>
              <img
                src={getAssetUrl('images/photos/rex.png')}
                alt="Rex Mascot"
                className="w-full h-full object-contain pointer-events-none"
              />
            </div>
          </div>

          {/* Badge 3: UCalgary Coat of Arms (top-left) */}
          <div className="floating-badge-anchor badge-ucalgary" title="Click me!">
            {ucalgarySpeech && (
              <div className="badge-speech-bubble" role="status">
                {ucalgarySpeech}
              </div>
            )}
            <div className="floating-badge-scaler" onClick={handleUcalgaryClick}>
              <img
                src={getAssetUrl('images/photos/ucalgary.png')}
                alt="University of Calgary Coat of Arms"
                className="w-full h-full object-contain pointer-events-none"
              />
            </div>
          </div>

          {/* Badge 4: Gavel (bottom-right) */}
          <div className="floating-badge-anchor badge-gavel" title="Click me!">
            {gavelSpeech && (
              <div className="badge-speech-bubble" role="status">
                {gavelSpeech}
              </div>
            )}
            <div className="floating-badge-scaler" onClick={handleGavelClick}>
              <img
                src={getAssetUrl('images/photos/gavel.png')}
                alt="Debate Gavel"
                className="w-full h-full object-contain pointer-events-none"
              />
            </div>
          </div>

          {/* Title Part 1: Rounded rectangle badge with blur and ~50% transparency */}
          <div className="hero-title-badge-container">
            <div className="hero-title-badge">
              <span className="hero-title-part1">The University of Calgary</span>
            </div>
          </div>

          {/* Title Part 2: Large text below */}
          <h1 className="hero-title-part2">
            Debate Society
          </h1>
        </div>

        {/* Separated Action Buttons Group below the Title Card */}
        <div className="hero-buttons-group">
          {/* Highlighted Primary CTA: Join */}
          <a href="/member/register" className="btn-join-primary group">
            <Sparkles className="w-4 h-4 text-[#53afd0] group-hover:rotate-12 transition-transform" />
            <span>Join</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>

          {/* Secondary CTA: About */}
          <a href="/about/history" className="btn-about-secondary group">
            <Info className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />
            <span>About Us</span>
          </a>
        </div>
      </div>
    </div>
  );
};
