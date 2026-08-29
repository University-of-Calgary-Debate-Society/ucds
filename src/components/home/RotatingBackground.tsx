import React, { useEffect, useState } from 'react';
import { useAppSettings } from '@/contexts/AppSettingsContext';

const CAROUSEL_IMAGES = [
  { id: '1o-7m2dDYDkIOnEviUFPIPhL1fpt42XLH', src: '/photos/carousel/photo-1.jpg', fallback: 'https://lh3.googleusercontent.com/d/1o-7m2dDYDkIOnEviUFPIPhL1fpt42XLH', alt: 'Debate Tournament Round' },
  { id: '1bmHotcAA4qGjYbNTF6CYhnv6aqnWtX2i', src: '/photos/carousel/photo-2.jpg', fallback: 'https://lh3.googleusercontent.com/d/1bmHotcAA4qGjYbNTF6CYhnv6aqnWtX2i', alt: 'UCDS Delegation' },
  { id: '1hQKgGVBRV3Ox6CbFVlm0u8vL8I76jGkK', src: '/photos/carousel/photo-3.jpg', fallback: 'https://lh3.googleusercontent.com/d/1hQKgGVBRV3Ox6CbFVlm0u8vL8I76jGkK', alt: 'Championship Trophy Celebration' },
  { id: '1PPRd2aWWxcliqtFik9IKXrKU2YI0ZRIV', src: '/photos/carousel/photo-4.png', fallback: 'https://lh3.googleusercontent.com/d/1PPRd2aWWxcliqtFik9IKXrKU2YI0ZRIV', alt: 'Debate Society Members' },
  { id: '12GPylvbZSD70rxruV_PdGDRBPsXoNsjy', src: '/photos/carousel/photo-5.jpg', fallback: 'https://lh3.googleusercontent.com/d/12GPylvbZSD70rxruV_PdGDRBPsXoNsjy', alt: 'University Debate Practice' },
  { id: '1l8BHdHqXbxsUpK6wbHqglzmDd-zIyN9N', src: '/photos/carousel/photo-6.jpg', fallback: 'https://lh3.googleusercontent.com/d/1l8BHdHqXbxsUpK6wbHqglzmDd-zIyN9N', alt: 'Debate Adjudication & Awards' },
  { id: '1GHvFfiVShcchIiYfSKFLQpoPtNDUKg17', src: '/photos/carousel/photo-7.jpg', fallback: 'https://lh3.googleusercontent.com/d/1GHvFfiVShcchIiYfSKFLQpoPtNDUKg17', alt: 'UCDS Team at Nationals' },
  { id: '1PDaecBATPPJaoGK_I9DaVFnPo3ZqR_uh', src: '/photos/carousel/photo-8.jpg', fallback: 'https://lh3.googleusercontent.com/d/1PDaecBATPPJaoGK_I9DaVFnPo3ZqR_uh', alt: 'Debate Society Social' },
  { id: '19NS8you3ejOmo2DhkcBOYqmNXtFjWWdZ', src: '/photos/carousel/photo-9.jpg', fallback: 'https://lh3.googleusercontent.com/d/19NS8you3ejOmo2DhkcBOYqmNXtFjWWdZ', alt: 'Competitive Speech and Discourse' },
];

export const RotatingBackground: React.FC = () => {
  const { animationsEnabled } = useAppSettings();
  const [activeFadeIndex, setActiveFadeIndex] = useState(0);

  // Fade mode timer when animations are disabled
  useEffect(() => {
    if (animationsEnabled) return;
    const interval = setInterval(() => {
      setActiveFadeIndex((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [animationsEnabled]);

  const totalCards = CAROUSEL_IMAGES.length;
  // Radius of 3D cylinder
  const radius = 580;

  return (
    <>
      {/* 3D Depth Rotating Carousel (Active Motion Mode) */}
      {animationsEnabled && (
        <div className="carousel-stage" aria-hidden="true">
          <div className="carousel-cylinder">
            {CAROUSEL_IMAGES.map((img, index) => {
              const angle = (360 / totalCards) * index;
              return (
                <div
                  key={img.id}
                  className="carousel-card"
                  style={{
                    transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
                  }}
                >
                  <img
                    src={img.src}
                    alt={img.alt}
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = img.fallback;
                    }}
                  />
                  <div className="carousel-overlay-card" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Gentle Fading Gallery (Disabled Animations Mode) */}
      {!animationsEnabled && (
        <div className="static-fade-gallery" aria-hidden="true">
          {CAROUSEL_IMAGES.map((img, idx) => (
            <div
              key={img.id}
              className={`static-fade-slide ${idx === activeFadeIndex ? 'active' : ''}`}
            >
              <img
                src={img.src}
                alt={img.alt}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = img.fallback;
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Radial Depth Vignette Layer for optimal readability & depth */}
      <div className="hero-depth-overlay" aria-hidden="true" />
    </>
  );
};
