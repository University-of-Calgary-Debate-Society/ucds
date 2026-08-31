import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionWrapperProps {
  children: React.ReactNode;
}

/**
 * Manages smooth, flicker-free fade-out and fade-in transitions between pages.
 * Fades out the outgoing page and fades in the incoming page with longer, luxurious easing,
 * guaranteeing the user is never exposed to a blank browser screen during navigation.
 */
export const PageTransitionWrapper: React.FC<PageTransitionWrapperProps> = ({ children }) => {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionState, setTransitionState] = useState<'visible' | 'fading-out' | 'fading-in'>('visible');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // If route location has changed
    if (
      location.pathname !== displayLocation.pathname ||
      location.search !== displayLocation.search
    ) {
      // Check if reduced motion is preferred
      const isReducedMotion =
        document.documentElement.classList.contains('reduce-motion') ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (isReducedMotion) {
        setDisplayLocation(location);
        setTransitionState('visible');
        window.scrollTo({ top: 0, behavior: 'instant' });
        return;
      }

      // Step 1: Smoothly fade out the outgoing page (320ms)
      setTransitionState('fading-out');

      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      timeoutRef.current = setTimeout(() => {
        // Step 2: Swap the route content while completely transparent
        setDisplayLocation(location);
        window.scrollTo({ top: 0, behavior: 'instant' });

        // Step 3: Trigger smooth fade-in for the new page (400ms)
        // Two animation frames ensure browser has painted the DOM before triggering transition
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTransitionState('fading-in');

            timeoutRef.current = setTimeout(() => {
              setTransitionState('visible');
            }, 450);
          });
        });
      }, 300); // 300ms fade-out duration
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [location, displayLocation]);

  return (
    <div
      className={`page-transition-wrapper ${
        transitionState === 'fading-out'
          ? 'page-transition-fading-out'
          : transitionState === 'fading-in'
          ? 'page-transition-fading-in'
          : 'page-transition-visible'
      }`}
    >
      {React.isValidElement(children)
        ? React.cloneElement(
            children as React.ReactElement<{ location?: typeof displayLocation }>,
            {
              location: displayLocation,
            }
          )
        : children}
    </div>
  );
};
