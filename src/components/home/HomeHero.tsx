import React from 'react';
import { ArrowRight, Info, Sparkles } from 'lucide-react';
import { RotatingBackground } from './RotatingBackground';

export const HomeHero: React.FC = () => {
  return (
    <div className="home-hero-container">
      {/* Background Rotating 3D Carousel / Fading Gallery */}
      <RotatingBackground />

      {/* Center Animated Title Card Container */}
      <div className="hero-content-wrapper">
        <div className="hero-glass-card">
          {/* Floating Flying Badges hovering around title card */}
          {/* Badge 1: Canada Flag (top-right) */}
          <div className="floating-badge badge-canada" title="Canadian University Society for Intercollegiate Debate">
            <img
              src="/photos/canada_flag.png"
              alt="Canada Flag"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/images/photos/canada_flag.png';
              }}
            />
          </div>

          {/* Badge 2: Rex Mascot (bottom-left) */}
          <div className="floating-badge badge-rex" title="Rex - UCDS Mascot">
            <img
              src="/photos/rex.png"
              alt="Rex Mascot"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/images/photos/rex.png';
              }}
            />
          </div>

          {/* Badge 3: UCalgary Coat of Arms (top-left) */}
          <div className="floating-badge badge-ucalgary" title="University of Calgary">
            <img
              src="/photos/ucalgary.png"
              alt="University of Calgary Coat of Arms"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/images/photos/ucalgary.png';
              }}
            />
          </div>

          {/* Title Part 1: Smaller text above */}
          <div className="hero-title-part1">
            The University of Calgary
          </div>

          {/* Title Part 2: Large text below */}
          <h1 className="hero-title-part2">
            Debate Society
          </h1>

          {/* Subtitle / Tagline */}
          <p className="hero-tagline">
            Cultivating critical thought, persuasive discourse, and competitive championship excellence in Western Canada since 1966.
          </p>

          {/* Two Main Action Buttons */}
          <div className="hero-buttons-group">
            {/* Highlighted Primary CTA: Join */}
            <a href="/member/register" className="btn-join-primary group">
              <Sparkles className="w-4 h-4 text-[#53afd0] group-hover:rotate-12 transition-transform" />
              <span>Join UCDS</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>

            {/* Less Highlighted Secondary CTA: About */}
            <a href="/about/history" className="btn-about-secondary group">
              <Info className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />
              <span>About Us</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
