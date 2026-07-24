import { useRef, useCallback, useEffect } from 'react';

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  enabled?: boolean;
}

interface SwipeState {
  startX: number;
  startY: number;
  startTime: number;
}

/**
 * Hook to detect swipe gestures on touch devices.
 * Useful for mobile navigation and drawer interactions.
 *
 * @example
 * const swipeHandlers = useSwipeGesture({
 *   onSwipeLeft: () => closeDrawer(),
 *   onSwipeRight: () => openDrawer(),
 *   threshold: 50,
 * });
 *
 * <div {...swipeHandlers}>Swipeable content</div>
 */
export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  enabled = true,
}: SwipeGestureOptions = {}) {
  const swipeRef = useRef<SwipeState | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return;

      const touch = e.touches[0];
      if (touch) {
        swipeRef.current = {
          startX: touch.clientX,
          startY: touch.clientY,
          startTime: Date.now(),
        };
      }
    },
    [enabled],
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!enabled || !swipeRef.current) return;

      const touch = e.changedTouches[0];
      if (!touch) return;

      const deltaX = touch.clientX - swipeRef.current.startX;
      const deltaY = touch.clientY - swipeRef.current.startY;
      const deltaTime = Date.now() - swipeRef.current.startTime;

      // Only register swipes that are fast enough (< 300ms)
      if (deltaTime > 300) {
        swipeRef.current = null;
        return;
      }

      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      // Determine if horizontal or vertical swipe
      if (absDeltaX > absDeltaY && absDeltaX > threshold) {
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight();
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
      } else if (absDeltaY > absDeltaX && absDeltaY > threshold) {
        if (deltaY > 0 && onSwipeDown) {
          onSwipeDown();
        } else if (deltaY < 0 && onSwipeUp) {
          onSwipeUp();
        }
      }

      swipeRef.current = null;
    },
    [enabled, threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown],
  );

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !enabled) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchEnd]);

  return {
    ref: elementRef,
  };
}

/**
 * Hook to detect pull-to-refresh gesture.
 * Returns handlers to attach to a scrollable container.
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  enabled = true,
}: {
  onRefresh: () => void;
  threshold?: number;
  enabled?: boolean;
}) {
  const startY = useRef(0);
  const isPulling = useRef(false);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return;
      const target = e.currentTarget as HTMLElement;
      if (target.scrollTop === 0) {
        const touch = e.touches[0];
        if (touch) {
          startY.current = touch.clientY;
          isPulling.current = true;
        }
      }
    },
    [enabled],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!enabled || !isPulling.current) return;
      const touch = e.touches[0];
      if (!touch) return;

      const deltaY = touch.clientY - startY.current;
      if (deltaY > threshold) {
        onRefresh();
        isPulling.current = false;
      }
    },
    [enabled, threshold, onRefresh],
  );

  const handleTouchEnd = useCallback(() => {
    isPulling.current = false;
  }, []);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}

/**
 * Hook to prevent accidental double-tap zoom on mobile.
 * Attach to interactive elements that shouldn't zoom.
 */
export function usePreventDoubleTapZoom() {
  const lastTap = useRef(0);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      e.preventDefault();
    }
    lastTap.current = now;
  }, []);

  return {
    onTouchEnd: handleTouchEnd,
  };
}
