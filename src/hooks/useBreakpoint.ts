import { useState, useEffect, useCallback } from 'react';

/**
 * Breakpoint definitions matching Tailwind's default breakpoints.
 * These are used for responsive layout decisions.
 */
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof breakpoints;

/**
 * Hook to detect current screen size and active breakpoint.
 * Returns reactive values that update on window resize.
 *
 * @example
 * const { isMobile, isTablet, isDesktop, breakpoint } = useBreakpoint();
 *
 * if (isMobile) {
 *   // Mobile-specific logic
 * }
 */
export function useBreakpoint() {
  const [width, setWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1024,
  );

  useEffect(() => {
    let rafId: number;
    let lastWidth = width;

    const handleResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const newWidth = window.innerWidth;
        if (newWidth !== lastWidth) {
          lastWidth = newWidth;
          setWidth(newWidth);
        }
      });
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const breakpoint: Breakpoint =
    width >= breakpoints['2xl']
      ? '2xl'
      : width >= breakpoints.xl
        ? 'xl'
        : width >= breakpoints.lg
          ? 'lg'
          : width >= breakpoints.md
            ? 'md'
            : 'sm';

  return {
    /** Current viewport width in pixels */
    width,
    /** Current active breakpoint name */
    breakpoint,
    /** True if viewport < 768px (mobile phones) */
    isMobile: width < breakpoints.md,
    /** True if viewport >= 768px and < 1024px (tablets) */
    isTablet: width >= breakpoints.md && width < breakpoints.lg,
    /** True if viewport >= 1024px (desktops) */
    isDesktop: width >= breakpoints.lg,
    /** True if viewport < 1024px (mobile + tablet) */
    isSmallScreen: width < breakpoints.lg,
    /** True if viewport >= 640px */
    isSmUp: width >= breakpoints.sm,
    /** True if viewport >= 768px */
    isMdUp: width >= breakpoints.md,
    /** True if viewport >= 1024px */
    isLgUp: width >= breakpoints.lg,
  };
}

/**
 * Hook to check if a media query matches.
 * Useful for one-off responsive checks.
 *
 * @example
 * const isTouchDevice = useMediaQuery('(pointer: coarse)');
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);

    setMatches(mql.matches);
    mql.addEventListener('change', handler, { passive: true });
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/**
 * Hook to detect touch device capability.
 */
export function useIsTouchDevice(): boolean {
  return useMediaQuery('(pointer: coarse)');
}

/**
 * Hook to detect if user prefers reduced motion.
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

/**
 * Hook to get safe area insets for notched devices.
 */
export function useSafeAreaInsets() {
  const [insets, setInsets] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  useEffect(() => {
    const updateInsets = () => {
      const style = getComputedStyle(document.documentElement);
      setInsets({
        top: parseInt(style.getPropertyValue('env(safe-area-inset-top)')) || 0,
        right: parseInt(style.getPropertyValue('env(safe-area-inset-right)')) || 0,
        bottom: parseInt(style.getPropertyValue('env(safe-area-inset-bottom)')) || 0,
        left: parseInt(style.getPropertyValue('env(safe-area-inset-left)')) || 0,
      });
    };

    updateInsets();
    window.addEventListener('resize', updateInsets, { passive: true });
    return () => window.removeEventListener('resize', updateInsets);
  }, []);

  return insets;
}
