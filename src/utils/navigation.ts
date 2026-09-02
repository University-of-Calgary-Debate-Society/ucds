import { useNavigate, NavigateOptions } from 'react-router-dom';
import { useCallback } from 'react';

/**
 * Custom hook providing seamless, GPU-accelerated page transitions
 * using the native View Transitions API (document.startViewTransition)
 * with graceful fallback for all browsers and reduced-motion preferences.
 */
export function useSmoothNavigate() {
  const navigate = useNavigate();

  return useCallback(
    (to: string, options?: NavigateOptions) => {
      // If external URL, navigate via standard window.location
      if (to.startsWith('http://') || to.startsWith('https://') || to.startsWith('mailto:')) {
        window.location.href = to;
        return;
      }

      // Check for native View Transitions support and user motion preference
      if (
        typeof document !== 'undefined' &&
        'startViewTransition' in document &&
        typeof (document as unknown as { startViewTransition?: (cb: () => void) => void }).startViewTransition === 'function' &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        (document as unknown as { startViewTransition: (cb: () => void) => void }).startViewTransition(() => {
          navigate(to, options);
        });
      } else {
        navigate(to, options);
      }
    },
    [navigate]
  );
}
