import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const getPageTitle = (pathname: string): string => {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  if (normalized === '/' || normalized === '/home') return 'HOME';
  if (normalized.startsWith('/connect/social')) return 'SOCIALS';
  if (normalized.startsWith('/connect/contact')) return 'CONTACT';
  if (normalized.startsWith('/member/portal')) return 'PORTAL';
  if (normalized.startsWith('/member/login')) return 'LOGIN';
  if (normalized.startsWith('/member/register')) return 'REGISTER';
  if (normalized.startsWith('/member/unsubscribe')) return 'MAILING';
  if (normalized.startsWith('/executive')) return 'EXECUTIVE';
  if (normalized.startsWith('/about')) return 'ABOUT';
  if (normalized.startsWith('/events')) return 'EVENTS';
  if (normalized.startsWith('/communications')) return 'COMMS';
  if (normalized.startsWith('/resources')) return 'RESOURCES';

  const segment = normalized.split('/').filter(Boolean).pop() || 'UCDS';
  return segment.toUpperCase().replace(/-/g, ' ');
};

export const MiniScrollVisualizer: React.FC = () => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isScrollable, setIsScrollable] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [viewportRatio, setViewportRatio] = useState(0.2);

  const trackRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const location = useLocation();

  const TRACK_HEIGHT = 160; // px
  const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';
  const isHomePage = normalizedPath === '/' || normalizedPath === '/home';

  // Robust, cross-browser scroll calculation
  const updateScrollMetrics = useCallback(() => {
    if (isHomePage) {
      setIsScrollable(false);
      return;
    }

    const docElem = document.documentElement;
    const body = document.body;
    const scrollHeight = Math.max(
      docElem.scrollHeight,
      body ? body.scrollHeight : 0,
      docElem.offsetHeight,
      body ? body.offsetHeight : 0
    );
    const clientHeight = window.innerHeight || docElem.clientHeight;
    const scrollTop = window.scrollY || window.pageYOffset || docElem.scrollTop || (body ? body.scrollTop : 0);

    const maxScroll = Math.max(scrollHeight - clientHeight, 0);
    const scrollable = maxScroll > 15;

    setIsScrollable(scrollable);

    if (scrollable) {
      const progress = Math.min(Math.max(scrollTop / maxScroll, 0), 1);
      setScrollProgress(progress);
      setViewportRatio(Math.min(Math.max(clientHeight / scrollHeight, 0.15), 0.55));
    } else {
      setScrollProgress(0);
    }
  }, [isHomePage]);

  useEffect(() => {
    if (isHomePage) {
      setIsScrollable(false);
      return;
    }

    // Execute immediately and across subsequent animation frames / load events
    updateScrollMetrics();

    const t1 = setTimeout(updateScrollMetrics, 30);
    const t2 = setTimeout(updateScrollMetrics, 100);
    const t3 = setTimeout(updateScrollMetrics, 300);
    const t4 = setTimeout(updateScrollMetrics, 600);
    const t5 = setTimeout(updateScrollMetrics, 1200);

    const handleScroll = () => {
      requestAnimationFrame(updateScrollMetrics);
    };

    const handleResize = () => {
      requestAnimationFrame(updateScrollMetrics);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updateScrollMetrics();
      });
      if (document.body) resizeObserver.observe(document.body);
      if (document.documentElement) resizeObserver.observe(document.documentElement);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [updateScrollMetrics, location.pathname, isHomePage]);

  // Jump to scroll position based on click or drag on the mini track
  const handleScrollToY = useCallback((clientY: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickY = clientY - rect.top;
    const percentage = Math.min(Math.max(clickY / rect.height, 0), 1);

    const docElem = document.documentElement;
    const body = document.body;
    const scrollHeight = Math.max(docElem.scrollHeight, body ? body.scrollHeight : 0);
    const maxScroll = Math.max(scrollHeight - window.innerHeight, 0);
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
    const docElem = document.documentElement;
    const body = document.body;
    const scrollHeight = Math.max(docElem.scrollHeight, body ? body.scrollHeight : 0);
    window.scrollTo({ top: scrollHeight, behavior: 'smooth' });
  };

  // Permanently hidden on homepage
  if (isHomePage) return null;

  // Thumb sizing & positioning
  const thumbHeight = Math.max(TRACK_HEIGHT * viewportRatio, 24);
  const availableTravel = TRACK_HEIGHT - thumbHeight;
  const thumbTop = scrollProgress * availableTravel;
  const pageTitle = getPageTitle(location.pathname);

  return (
    <div
      className={`fixed right-3 top-1/2 -translate-y-1/2 z-[99990] flex flex-col items-center gap-1.5 select-none transition-all duration-300 ${
        isScrollable
          ? isHovered
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-80 hover:opacity-100 scale-100 pointer-events-auto'
          : 'opacity-0 scale-90 pointer-events-none'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="region"
      aria-label="Mini Scroll Bar Visualizer"
    >
      {/* Monochrome Vertical Characters from Top to Bottom */}
      <div
        className="flex flex-col items-center select-none pointer-events-none mb-1 text-[9px] font-sans font-black tracking-widest text-[#1C244C] dark:text-[#F6F6F6] drop-shadow-sm"
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
        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
          isHovered
            ? 'opacity-100 scale-100 bg-white dark:bg-black text-black dark:text-white shadow-md hover:scale-110 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black border border-black/15 dark:border-white/20'
            : 'opacity-0 scale-75 pointer-events-none'
        }`}
      >
        <ChevronUp className="w-3.5 h-3.5" />
      </button>

      {/* Monochrome Mini Scrollbar Rail & Steady Thumb */}
      <div className="relative flex items-center justify-center p-0.5">
        {/* Steady Background Glass Track */}
        <div
          ref={trackRef}
          onMouseDown={handleTrackMouseDown}
          style={{ height: `${TRACK_HEIGHT}px` }}
          className="cursor-pointer rounded-full relative w-2 bg-black/25 dark:bg-white/25 border border-black/10 dark:border-white/15 backdrop-blur-md shadow-inner"
        >
          {/* Steady High-Contrast Black/White Thumb */}
          <div
            className="absolute left-1/2 -translate-x-1/2 rounded-full shadow-md bg-black dark:bg-white w-2"
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
        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
          isHovered
            ? 'opacity-100 scale-100 bg-white dark:bg-black text-black dark:text-white shadow-md hover:scale-110 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black border border-black/15 dark:border-white/20'
            : 'opacity-0 scale-75 pointer-events-none'
        }`}
      >
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
