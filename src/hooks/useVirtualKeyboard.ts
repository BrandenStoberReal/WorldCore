import { useState, useEffect, useRef } from 'react';

interface VirtualKeyboardState {
  isVisible: boolean;
  height: number;
}

export function useVirtualKeyboard(): VirtualKeyboardState {
  const [state, setState] = useState<VirtualKeyboardState>({
    isVisible: false,
    height: 0,
  });

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const handleResize = () => {
      const height = window.innerHeight - viewport.height;
      const isVisible = height > 150;
      setState({ isVisible, height });
    };

    viewport.addEventListener('resize', handleResize);
    viewport.addEventListener('scroll', handleResize);

    return () => {
      viewport.removeEventListener('resize', handleResize);
      viewport.removeEventListener('scroll', handleResize);
    };
  }, []);

  return state;
}

export function useScrollInputIntoView(ref: React.RefObject<HTMLTextAreaElement | null>) {
  const keyboard = useVirtualKeyboard();

  useEffect(() => {
    if (keyboard.isVisible && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [keyboard.isVisible, ref]);

  return keyboard;
}
