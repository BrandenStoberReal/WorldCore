import type { ReactNode } from 'react';
import { useBreakpoint, type Breakpoint } from '@/hooks/useBreakpoint';

// ---------------------------------------------------------------------------
// ResponsiveSlot — declarative mobile/desktop component swap
// ---------------------------------------------------------------------------

interface ResponsiveSlotProps {
  /** Rendered when viewport < md (768px) */
  mobile: ReactNode;
  /** Rendered when viewport >= md (768px) */
  desktop: ReactNode;
  /** Optional: rendered when viewport >= md and < lg (768–1023px) */
  tablet?: ReactNode;
}

/**
 * Swap entire UI sections between mobile and desktop.
 *
 * @example
 * <ResponsiveSlot
 *   mobile={<CompactHeader />}
 *   desktop={<FullHeader />}
 * />
 */
export function ResponsiveSlot({ mobile, desktop, tablet }: ResponsiveSlotProps) {
  const { isMobile, isTablet } = useBreakpoint();

  if (isMobile) return <>{mobile}</>;
  if (isTablet && tablet) return <>{tablet}</>;
  return <>{desktop}</>;
}

// ---------------------------------------------------------------------------
// DeviceGuard — conditionally render children by device class
// ---------------------------------------------------------------------------

interface DeviceGuardProps {
  children: ReactNode;
  /** Render when viewport < 768px */
  mobile?: boolean;
  /** Render when viewport >= 768px and < 1024px */
  tablet?: boolean;
  /** Render when viewport >= 1024px */
  desktop?: boolean;
  /** Render when viewport < 1024px (mobile + tablet) */
  smallScreen?: boolean;
  /** Render when viewport >= 1024px — alias for desktop */
  largeScreen?: boolean;
}

/**
 * Conditionally render children based on device breakpoint.
 * Multiple flags are OR'd (any matching flag renders the children).
 *
 * @example
 * <DeviceGuard mobile>
 *   <BottomNav />
 * </DeviceGuard>
 *
 * <DeviceGuard mobile={false} desktop>
 *   <Sidebar />
 * </DeviceGuard>
 */
export function DeviceGuard({
  children,
  mobile,
  tablet,
  desktop,
  smallScreen,
  largeScreen,
}: DeviceGuardProps) {
  const bp = useBreakpoint();

  const shouldRender =
    (mobile && bp.isMobile) ||
    (tablet && bp.isTablet) ||
    (desktop && bp.isDesktop) ||
    (smallScreen && bp.isSmallScreen) ||
    (largeScreen && bp.isDesktop);

  return shouldRender ? <>{children}</> : null;
}

// ---------------------------------------------------------------------------
// useResponsiveValue — pick a value by breakpoint
// ---------------------------------------------------------------------------

interface ResponsiveValues<T> {
  mobile: T;
  desktop: T;
  tablet?: T;
}

/**
 * Return a value based on current breakpoint. Useful for non-JSX contexts
 * (e.g. config objects, callback arguments).
 *
 * @example
 * const gap = useResponsiveValue({ mobile: 4, desktop: 8 });
 */
export function useResponsiveValue<T>({ mobile, desktop, tablet }: ResponsiveValues<T>): T {
  const { isMobile, isTablet } = useBreakpoint();

  if (isMobile) return mobile;
  if (isTablet && tablet !== undefined) return tablet;
  return desktop;
}
