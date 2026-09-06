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
  const [isDragging, setIsDragging] = useState(false);
  const [viewportRatio, setViewportRatio] = useState(0.2);

  const trackRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragInitialScrollTopRef = useRef(0);
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

  // Thumb sizing & positioning
  const thumbHeight = Math.max(TRACK_HEIGHT * viewportRatio, 24);
  const availableTravel = Math.max(TRACK_HEIGHT - thumbHeight, 1);
  const thumbTop = scrollProgress * availableTravel;
  const pageTitle = getPageTitle(location.pathname);

  // Smooth click-to-jump on the background rail outside the thumb
  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) return;
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickY = e.clientY - rect.top;

    // Center thumb around click position
    const targetThumbTop = Math.min(Math.max(clickY - thumbHeight / 2, 0), availableTravel);
    const percentage = targetThumbTop / availableTravel;

    const docElem = document.documentElement;
    const body = document.body;
    const scrollHeight = Math.max(docElem.scrollHeight, body ? body.scrollHeight : 0);
    const maxScroll = Math.max(scrollHeight - window.innerHeight, 0);

    window.scrollTo({
      top: percentage * maxScroll,
      behavior: 'smooth',
    });
  };

  // Drag handling with synchronous delta calculation
  const startDragging = (clientY: number) => {
    isDraggingRef.current = true;
    setIsDragging(true);
    dragStartYRef.current = clientY;
    dragInitialScrollTopRef.current =
      window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';

    const onMove = (moveY: number) => {
      if (!isDraggingRef.current) return;
      const deltaY = moveY - dragStartYRef.current;

      const docElem = document.documentElement;
      const body = document.body;
      const scrollHeight = Math.max(docElem.scrollHeight, body ? body.scrollHeight : 0);
      const maxScroll = Math.max(scrollHeight - window.innerHeight, 0);

      const ratio = availableTravel > 0 ? maxScroll / availableTravel : 1;
      const targetScroll = Math.min(
        Math.max(dragInitialScrollTopRef.current + deltaY * ratio, 0),
        maxScroll
      );

      window.scrollTo({ top: targetScroll, behavior: 'auto' });
    };

    const handleMouseMove = (e: MouseEvent) => {
      onMove(e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        onMove(e.touches[0].clientY);
      }
    };

    const stopDragging = () => {
      isDraggingRef.current = false;
      setIsDragging(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopDragging);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', stopDragging);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: false });
    window.addEventListener('mouseup', stopDragging);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', stopDragging);
  };

  const handleThumbMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startDragging(e.clientY);
  };

  const handleThumbTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (e.touches.length > 0) {
      startDragging(e.touches[0].clientY);
    }
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

  return (
    <div
      className={`fixed right-3 top-1/2 -translate-y-1/2 z-[99990] flex flex-col items-center gap-1.5 select-none transition-all duration-300 ${
        isScrollable
          ? isHovered || isDragging
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-80 hover:opacity-100 scale-100 pointer-events-auto'
          : 'opacity-0 scale-90 pointer-events-none'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => !isDragging && setIsHovered(false)}
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
          isHovered || isDragging
            ? 'opacity-100 scale-100 bg-white dark:bg-black text-black dark:text-white shadow-md hover:scale-110 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black border border-black/15 dark:border-white/20'
            : 'opacity-0 scale-75 pointer-events-none'
        }`}
      >
        <ChevronUp className="w-3.5 h-3.5" />
      </button>

      {/* Monochrome Mini Scrollbar Rail & Draggable Steady Thumb */}
      <div className="relative flex items-center justify-center p-0.5">
        {/* Expanded Hit Box Rail */}
        <div
          ref={trackRef}
          onClick={handleTrackClick}
          style={{ height: `${TRACK_HEIGHT}px` }}
          className="relative w-6 flex items-center justify-center cursor-pointer group"
          title="Drag or click to navigate page"
        >
          {/* Visual Track (Sleek Glass Bar) */}
          <div className="rounded-full w-2 h-full bg-black/25 dark:bg-white/25 border border-black/10 dark:border-white/15 backdrop-blur-md shadow-inner transition-colors duration-200 group-hover:bg-black/35 dark:group-hover:bg-white/35" />

          {/* Draggable High-Contrast Black/White Thumb */}
          <div
            onMouseDown={handleThumbMouseDown}
            onTouchStart={handleThumbTouchStart}
            className={`absolute left-1/2 -translate-x-1/2 rounded-full shadow-md bg-black dark:bg-white transition-all duration-100 ${
              isDragging
                ? 'w-3.5 scale-105 cursor-grabbing ring-2 ring-black/20 dark:ring-white/30'
                : 'w-2.5 hover:w-3.5 hover:scale-105 cursor-grab'
            }`}
            style={{
              top: `${thumbTop}px`,
              height: `${thumbHeight}px`,
            }}
          >
            {/* Expanded invisible hit padding around thumb */}
            <div className="absolute -inset-x-2 -inset-y-1" />
          </div>
        </div>
      </div>

      {/* Quick Jump to Bottom Icon Button (Black & White) */}
      <button
        type="button"
        onClick={scrollToBottom}
        title="Scroll to bottom"
        aria-label="Scroll to bottom"
        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
          isHovered || isDragging
            ? 'opacity-100 scale-100 bg-white dark:bg-black text-black dark:text-white shadow-md hover:scale-110 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black border border-black/15 dark:border-white/20'
            : 'opacity-0 scale-75 pointer-events-none'
        }`}
      >
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
