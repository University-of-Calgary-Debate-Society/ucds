import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionWrapperProps {
  children: React.ReactNode;
}

/**
 * Manages seamless, zero-flicker transitions between pages.
 * Instantly mounts incoming page content with a buttery-smooth fade-in entrance,
 * eliminating any blank screen flash or delay during navigation.
 */
export const PageTransitionWrapper: React.FC<PageTransitionWrapperProps> = ({ children }) => {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  const isExecutive = location.pathname.startsWith('/executive');
  // Avoid remounting or re-animating the outer container when navigating between executive subpages
  const transitionKey = isExecutive ? '/executive' : location.pathname;

  return (
    <div
      key={transitionKey}
      className={`page-transition-wrapper ${isExecutive ? '' : 'animate-pageEnter'}`}
    >
      {children}
    </div>
  );
};
