import { useEffect, type RefObject } from 'react';

/** Safari's keyboard resizes the visual viewport, not always the layout viewport. */
export function useVisualViewport(frame: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    let animation: number | undefined;
    const update = () => {
      window.cancelAnimationFrame(animation ?? 0);
      animation = window.requestAnimationFrame(() => {
        const offset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
        const editing =
          document.activeElement instanceof HTMLInputElement ||
          document.activeElement instanceof HTMLTextAreaElement;
        const keyboard = editing && viewport.scale === 1 && offset > 120;
        frame.current?.style.setProperty('--keyboard-offset', `${keyboard ? offset : 0}px`);
        if (frame.current) frame.current.dataset.keyboardOpen = String(keyboard);
      });
    };
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    update();
    return () => {
      window.cancelAnimationFrame(animation ?? 0);
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
    };
  }, [frame]);
}
