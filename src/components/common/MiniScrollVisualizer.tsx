import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useLocation } from 'react-router-dom';

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
  const isHistoryPage = normalizedPath.startsWith('/about/history') || normalizedPath === '/about';
  const shouldHideVisualizer = isHomePage || isHistoryPage;

  // Robust, cross-browser scroll calculation
  const updateScrollMetrics = useCallback(() => {
    if (shouldHideVisualizer) {
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
  }, [shouldHideVisualizer]);

  useEffect(() => {
    if (shouldHideVisualizer) {
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
  }, [updateScrollMetrics, location.pathname, shouldHideVisualizer]);

  // Thumb sizing & positioning
  const thumbHeight = Math.max(TRACK_HEIGHT * viewportRatio, 24);
  const availableTravel = Math.max(TRACK_HEIGHT - thumbHeight, 1);
  const thumbTop = scrollProgress * availableTravel;

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

  // Permanently hidden on homepage and history page (which features its own interactive timeline rail)
  if (shouldHideVisualizer) return null;

  return (
    <div
      className={`fixed right-3 top-1/2 -translate-y-1/2 z-[99990] hidden md:flex flex-col items-center gap-1.5 select-none transition-all duration-300 ${
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
      {/* Quick Jump to Top Button */}
      <button
        type="button"
        onClick={scrollToTop}
        title="Scroll to top"
        aria-label="Scroll to top"
        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
          isHovered || isDragging
            ? 'opacity-100 scale-100 bg-white dark:bg-[#15162C] text-[#0075A2] dark:text-[#53afd0] shadow-md hover:scale-110 hover:bg-[#0075A2] hover:text-white dark:hover:bg-[#53afd0] dark:hover:text-[#15162C] border border-[#0075A2]/25 dark:border-[#53afd0]/30'
            : 'opacity-0 scale-75 pointer-events-none'
        }`}
      >
        <ChevronUp className="w-3.5 h-3.5" />
      </button>

      {/* Mini Scrollbar Rail & Draggable Purely-Linear Thumb (OurStoryHistory Theme) */}
      <div className="relative flex items-center justify-center p-0.5">
        {/* Expanded Hit Box Rail */}
        <div
          ref={trackRef}
          onClick={handleTrackClick}
          style={{ height: `${TRACK_HEIGHT}px` }}
          className="relative w-6 flex items-center justify-center cursor-pointer group"
          title="Drag or click to navigate page"
        >
          {/* Visual Track (Slender Hairline Bar matching OurStoryHistory) */}
          <div className="rounded-full w-2 h-full bg-[#1C244C]/14 dark:bg-[#53afd0]/18 border border-[#1C244C]/10 dark:border-[#53afd0]/20 backdrop-blur-md shadow-inner transition-colors duration-200 group-hover:bg-[#1C244C]/25 dark:group-hover:bg-[#53afd0]/30" />

          {/* Draggable Luminous Gradient Thumb (Pure Linear Movement) */}
          <div
            onMouseDown={handleThumbMouseDown}
            onTouchStart={handleThumbTouchStart}
            className={`absolute left-1/2 -translate-x-1/2 rounded-full cursor-grab transition-[width,box-shadow] duration-150 ${
              isDragging
                ? 'w-3.5 cursor-grabbing ring-2 ring-[#0075A2]/30 dark:ring-[#53afd0]/40'
                : 'w-2.5 hover:w-3.5'
            }`}
            style={{
              top: `${thumbTop}px`,
              height: `${thumbHeight}px`,
              background: 'linear-gradient(to bottom, #0075A2 0%, #53afd0 85%, #FFFFFF 100%)',
              boxShadow: isDragging
                ? '0 0 14px rgba(83, 175, 208, 0.95), 0 0 6px rgba(0, 117, 162, 0.8)'
                : '0 0 10px rgba(83, 175, 208, 0.7)',
            }}
          >
            {/* Expanded invisible hit padding around thumb */}
            <div className="absolute -inset-x-2 -inset-y-1" />
          </div>
        </div>
      </div>

      {/* Quick Jump to Bottom Button */}
      <button
        type="button"
        onClick={scrollToBottom}
        title="Scroll to bottom"
        aria-label="Scroll to bottom"
        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
          isHovered || isDragging
            ? 'opacity-100 scale-100 bg-white dark:bg-[#15162C] text-[#0075A2] dark:text-[#53afd0] shadow-md hover:scale-110 hover:bg-[#0075A2] hover:text-white dark:hover:bg-[#53afd0] dark:hover:text-[#15162C] border border-[#0075A2]/25 dark:border-[#53afd0]/30'
            : 'opacity-0 scale-75 pointer-events-none'
        }`}
      >
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default MiniScrollVisualizer;
