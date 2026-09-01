import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const getPageTitle = (pathname: string): string => {
  if (pathname === '/' || pathname === '') return 'HOME';
  if (pathname.startsWith('/connect/social')) return 'SOCIALS';
  if (pathname.startsWith('/connect/contact')) return 'CONTACT';
  if (pathname.startsWith('/member/portal')) return 'PORTAL';
  if (pathname.startsWith('/member/login')) return 'LOGIN';
  if (pathname.startsWith('/member/register')) return 'REGISTER';
  if (pathname.startsWith('/member/unsubscribe')) return 'MAILING';
  if (pathname.startsWith('/executive')) return 'EXECUTIVE';
  if (pathname.startsWith('/about')) return 'ABOUT';
  if (pathname.startsWith('/events')) return 'EVENTS';
  if (pathname.startsWith('/communications')) return 'COMMS';
  if (pathname.startsWith('/resources')) return 'RESOURCES';

  const segment = pathname.split('/').filter(Boolean).pop() || 'UCDS';
  return segment.toUpperCase().replace(/-/g, ' ');
};

export const MiniScrollVisualizer: React.FC = () => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isScrollable, setIsScrollable] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [viewportRatio, setViewportRatio] = useState(0.2);

  const trackRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);
  const location = useLocation();

  const TRACK_HEIGHT = 160; // px

  // High-performance scroll calculation throttled by requestAnimationFrame
  const updateScrollMetrics = useCallback(() => {
    if (rafIdRef.current) return;

    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      const docElem = document.documentElement;
      const scrollHeight = docElem.scrollHeight;
      const clientHeight = window.innerHeight;
      const scrollTop = window.scrollY || docElem.scrollTop;

      const maxScroll = scrollHeight - clientHeight;
      const scrollable = maxScroll > 30;

      setIsScrollable(scrollable);

      if (scrollable) {
        const progress = Math.min(Math.max(scrollTop / maxScroll, 0), 1);
        setScrollProgress(progress);
        setViewportRatio(Math.min(Math.max(clientHeight / scrollHeight, 0.12), 0.5));
      } else {
        setScrollProgress(0);
      }
    });
  }, []);

  useEffect(() => {
    updateScrollMetrics();
    window.addEventListener('scroll', updateScrollMetrics, { passive: true });
    window.addEventListener('resize', updateScrollMetrics, { passive: true });

    return () => {
      window.removeEventListener('scroll', updateScrollMetrics);
      window.removeEventListener('resize', updateScrollMetrics);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [updateScrollMetrics, location.pathname]);

  // Jump to scroll position based on click or drag on the mini track
  const handleScrollToY = useCallback((clientY: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickY = clientY - rect.top;
    const percentage = Math.min(Math.max(clickY / rect.height, 0), 1);

    const docElem = document.documentElement;
    const maxScroll = docElem.scrollHeight - window.innerHeight;
    const targetScroll = percentage * maxScroll;

    window.scrollTo({
      top: targetScroll,
      behavior: 'auto',
    });
  }, []);

  const handleTrackMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    isDraggingRef.current = true;
    handleScrollToY(e.clientY);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      handleScrollToY(moveEvent.clientY);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);
  };

  const scrollToTop = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
  };

  if (!isScrollable) return null;

  // Thumb sizing & positioning
  const thumbHeight = Math.max(TRACK_HEIGHT * viewportRatio, 24);
  const availableTravel = TRACK_HEIGHT - thumbHeight;
  const thumbTop = scrollProgress * availableTravel;
  const pageTitle = getPageTitle(location.pathname);

  return (
    <div
      className={`fixed right-2.5 top-1/2 -translate-y-1/2 z-[99990] flex flex-col items-center gap-1.5 select-none transition-opacity duration-300 ${
        isHovered ? 'opacity-100' : 'opacity-60 hover:opacity-100'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="region"
      aria-label="Mini Scroll Bar Visualizer"
    >
      {/* Monochrome Vertical Characters from Top to Bottom */}
      <div
        className="flex flex-col items-center select-none pointer-events-none mb-1 text-[8.5px] font-sans font-black tracking-widest text-black dark:text-white opacity-90"
        aria-hidden="true"
      >
        {pageTitle.split('').map((char, i) => (
          <span key={i} className="leading-tight uppercase">
            {char}
          </span>
        ))}
      </div>

      {/* Quick Jump to Top Icon Button (Black & White) */}
      <button
        type="button"
        onClick={scrollToTop}
        title="Scroll to top"
        aria-label="Scroll to top"
        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
          isHovered
            ? 'opacity-90 scale-100 bg-white/90 dark:bg-black/90 text-black dark:text-white shadow-sm hover:scale-110 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black'
            : 'opacity-0 scale-75 pointer-events-none'
        }`}
      >
        <ChevronUp className="w-3.5 h-3.5" />
      </button>

      {/* Monochrome Mini Scrollbar Rail & Steady Thumb */}
      <div className="relative flex items-center justify-center">
        {/* Steady Background Glass Track */}
        <div
          ref={trackRef}
          onMouseDown={handleTrackMouseDown}
          style={{ height: `${TRACK_HEIGHT}px` }}
          className="cursor-pointer rounded-full relative w-1.5 bg-black/20 dark:bg-white/20 backdrop-blur-sm"
        >
          {/* Steady Black/White Thumb */}
          <div
            className="absolute left-1/2 -translate-x-1/2 rounded-full shadow-sm bg-black dark:bg-white w-1.5"
            style={{
              top: `${thumbTop}px`,
              height: `${thumbHeight}px`,
            }}
          />
        </div>
      </div>

      {/* Quick Jump to Bottom Icon Button (Black & White) */}
      <button
        type="button"
        onClick={scrollToBottom}
        title="Scroll to bottom"
        aria-label="Scroll to bottom"
        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
          isHovered
            ? 'opacity-90 scale-100 bg-white/90 dark:bg-black/90 text-black dark:text-white shadow-sm hover:scale-110 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black'
            : 'opacity-0 scale-75 pointer-events-none'
        }`}
      >
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
