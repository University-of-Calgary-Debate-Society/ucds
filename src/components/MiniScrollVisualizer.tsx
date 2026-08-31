import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export const MiniScrollVisualizer: React.FC = () => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isScrollable, setIsScrollable] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isRecentlyScrolled, setIsRecentlyScrolled] = useState(false);
  const [viewportRatio, setViewportRatio] = useState(0.2); // ratio of viewport to total content

  const trackRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const location = useLocation();

  const TRACK_HEIGHT = 160; // px

  // Calculate current scroll metrics
  const updateScrollMetrics = useCallback(() => {
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

      // Wake up active indicator on scroll
      setIsRecentlyScrolled(true);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = setTimeout(() => {
        setIsRecentlyScrolled(false);
      }, 1500);
    } else {
      setScrollProgress(0);
    }
  }, []);

  // Listen to window scroll & resize events
  useEffect(() => {
    updateScrollMetrics();
    window.addEventListener('scroll', updateScrollMetrics, { passive: true });
    window.addEventListener('resize', updateScrollMetrics, { passive: true });

    // Re-check after route transitions or dynamic content expansions
    const interval = setInterval(updateScrollMetrics, 1000);

    return () => {
      window.removeEventListener('scroll', updateScrollMetrics);
      window.removeEventListener('resize', updateScrollMetrics);
      clearInterval(interval);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
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
    setIsDragging(true);
    handleScrollToY(e.clientY);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      handleScrollToY(moveEvent.clientY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
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
  const percentDisplay = Math.round(scrollProgress * 100);

  return (
    <>
      {/* 1. Ultra-thin Top Progress Line */}
      <div
        className="fixed top-0 left-0 right-0 h-[2.5px] z-[99999] pointer-events-none"
        aria-hidden="true"
      >
        <div
          className="h-full bg-gradient-to-r from-[#1C244C] via-[#0075A2] to-[#53afd0] transition-all duration-75 origin-left"
          style={{ width: `${percentDisplay}%` }}
        />
      </div>

      {/* 2. Mini Floating Scroll Visualizer Rail */}
      <div
        className={`fixed right-2.5 top-1/2 -translate-y-1/2 z-[99990] flex flex-col items-center gap-1.5 transition-all duration-300 select-none ${
          isHovered || isDragging || isRecentlyScrolled
            ? 'opacity-100 translate-x-0'
            : 'opacity-40 hover:opacity-100 translate-x-0.5'
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        role="region"
        aria-label="Mini Scroll Bar Visualizer"
      >
        {/* Quick Jump to Top Icon Button */}
        <button
          type="button"
          onClick={scrollToTop}
          title="Scroll to top"
          aria-label="Scroll to top"
          className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
            isHovered
              ? 'opacity-90 scale-100 bg-white/80 dark:bg-[#1C244C]/80 text-[#0075A2] dark:text-[#53afd0] shadow-sm hover:scale-110 hover:bg-[#0075A2] hover:text-white dark:hover:bg-[#53afd0] dark:hover:text-[#15162C]'
              : 'opacity-0 scale-75 pointer-events-none'
          }`}
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>

        {/* Mini Scrollbar Rail & Interactive Thumb */}
        <div className="relative flex items-center justify-center">
          {/* Scroll percentage tooltip pill on hover/drag */}
          {(isHovered || isDragging) && (
            <div
              className="absolute right-full mr-2.5 px-2 py-1 rounded-md text-[10px] font-mono font-black tracking-tight bg-[#101426]/90 dark:bg-[#F6F6F6]/95 text-white dark:text-[#101426] shadow-lg whitespace-nowrap pointer-events-none transition-all duration-75"
              style={{
                top: `${thumbTop + thumbHeight / 2}px`,
                transform: 'translateY(-50%)',
              }}
            >
              {percentDisplay}%
            </div>
          )}

          {/* Background Glass Track */}
          <div
            ref={trackRef}
            onMouseDown={handleTrackMouseDown}
            style={{ height: `${TRACK_HEIGHT}px` }}
            className={`cursor-pointer rounded-full transition-all duration-200 relative ${
              isHovered || isDragging
                ? 'w-3.5 bg-black/10 dark:bg-white/10 backdrop-blur-md border border-[#0075A2]/30 dark:border-[#53afd0]/30 shadow-sm'
                : 'w-1.5 bg-black/15 dark:bg-white/15 backdrop-blur-sm'
            }`}
          >
            {/* Active Luminous Thumb */}
            <div
              className={`absolute left-1/2 -translate-x-1/2 rounded-full transition-all duration-75 shadow-sm ${
                isDragging
                  ? 'bg-gradient-to-b from-[#0075A2] to-[#53afd0] shadow-[0_0_10px_rgba(0,117,162,0.8)]'
                  : isHovered
                    ? 'bg-[#0075A2] dark:bg-[#53afd0] shadow-[0_0_8px_rgba(0,117,162,0.5)]'
                    : 'bg-[#1C244C]/70 dark:bg-[#F6F6F6]/70'
              }`}
              style={{
                top: `${thumbTop}px`,
                height: `${thumbHeight}px`,
                width: isHovered || isDragging ? '8px' : '4px',
              }}
            />
          </div>
        </div>

        {/* Quick Jump to Bottom Icon Button */}
        <button
          type="button"
          onClick={scrollToBottom}
          title="Scroll to bottom"
          aria-label="Scroll to bottom"
          className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
            isHovered
              ? 'opacity-90 scale-100 bg-white/80 dark:bg-[#1C244C]/80 text-[#0075A2] dark:text-[#53afd0] shadow-sm hover:scale-110 hover:bg-[#0075A2] hover:text-white dark:hover:bg-[#53afd0] dark:hover:text-[#15162C]'
              : 'opacity-0 scale-75 pointer-events-none'
          }`}
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
    </>
  );
};
