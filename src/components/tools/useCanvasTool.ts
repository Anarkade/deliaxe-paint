import { useEffect, useRef } from 'react';

type CanvasRef = React.RefObject<HTMLCanvasElement | null>;

export default function useCanvasTool(
  canvasRef: CanvasRef,
  active: boolean,
  onPaint: (ev: PointerEvent | MouseEvent, x: number, y: number) => void,
  cursor?: string,
  onPaintingChange?: (isPainting: boolean) => void,
) {
  const onPaintingChangeRef = useRef<((isPainting: boolean) => void) | undefined>(undefined);
  // Keep latest onPaintingChange in a ref so listeners see current value
  // The hook consumer may pass this as the last argument to the hook.
  const pointerDownRef = useRef(false);
  const lastMoveTime = useRef<number>(0);
  const MOVE_THROTTLE_MS = 8; // allow up to ~120fps but throttle a bit
  const onPaintRef = useRef(onPaint);

  // Keep latest onPaint in a ref so listeners don't need to be reattached
  onPaintRef.current = onPaint;
  // Keep latest onPaintingChange in a ref so listeners see current value
  onPaintingChangeRef.current = onPaintingChange;
  // set current painting notifier if provided as extra arg
  // NOTE: we can't read arguments directly here; callers pass the notifier
  // as the 5th parameter to this hook and it will be captured via closure
  // in the module scope — assign from the outer scope by reading the
  // optional last parameter from the function arguments via arguments.
  // A simpler approach: capture via the caller passing it in and updating
  // this ref directly. We check for the value at runtime below.

  useEffect(() => {
    const canvas = canvasRef?.current;
    if (!canvas || !active) return;

    const prevCursor = canvas.style.cursor || '';
    if (cursor) canvas.style.cursor = cursor;

    const sampleAndPaint = (ev: PointerEvent | MouseEvent) => {
      try {
        const rect = canvas.getBoundingClientRect();
        const cw = canvas.width || 1;
        const ch = canvas.height || 1;
        const cssW = rect.width || 1;
        const cssH = rect.height || 1;
        const cx = ('clientX' in ev) ? (ev as any).clientX : (ev as MouseEvent).clientX;
        const cy = ('clientY' in ev) ? (ev as any).clientY : (ev as MouseEvent).clientY;
        const localX = cx - rect.left;
        const localY = cy - rect.top;
        const sx = localX * (cw / cssW);
        const sy = localY * (ch / cssH);
        const x = Math.floor(Math.max(0, Math.min(cw - 1, sx)));
        const y = Math.floor(Math.max(0, Math.min(ch - 1, sy)));
        try { onPaintRef.current?.(ev as PointerEvent, x, y); } catch { /* ignore */ }
      } catch { /* ignore */ }
    };

    const handlePointerMove = (ev: PointerEvent) => {
      try {
        if (!pointerDownRef.current) return;
        const now = Date.now();
        if (now - lastMoveTime.current < MOVE_THROTTLE_MS) return;
        lastMoveTime.current = now;
        sampleAndPaint(ev);
      } catch { /* ignore */ }
    };

    const handlePointerUp = (ev: PointerEvent) => {
      try { if (pointerDownRef.current) sampleAndPaint(ev); } catch { /* ignore */ }
      pointerDownRef.current = false;
      try { if (typeof onPaintingChangeRef.current === 'function') onPaintingChangeRef.current(false); } catch { /* ignore */ }
      try {
        window.removeEventListener('pointermove', handlePointerMove as any);
        window.removeEventListener('pointerup', handlePointerUp as any);
        window.removeEventListener('pointercancel', handlePointerUp as any);
      } catch { /* ignore */ }
    };

    const handlePointerDown = (ev: PointerEvent) => {
      try {
        pointerDownRef.current = true;
        lastMoveTime.current = 0;
        // Notify parent we're starting a paint BEFORE delivering the first sample
        // so parent can guard programmatic UI updates (e.g., auto-fit) during the stroke.
        try { if (typeof onPaintingChangeRef.current === 'function') onPaintingChangeRef.current(true); } catch { /* ignore */ }
        sampleAndPaint(ev);
        window.addEventListener('pointermove', handlePointerMove as any, { passive: false });
        window.addEventListener('pointerup', handlePointerUp as any);
        window.addEventListener('pointercancel', handlePointerUp as any);
      } catch { /* ignore */ }
    };

    canvas.addEventListener('pointerdown', handlePointerDown);

    const onWindowPointerDownOutside = (ev: PointerEvent) => {
      try {
        const tgt = ev.target as Node | null;
        if (!tgt) return;
        if (canvas && !canvas.contains(tgt)) {
          pointerDownRef.current = false;
          try {
            window.removeEventListener('pointermove', handlePointerMove as any);
            window.removeEventListener('pointerup', handlePointerUp as any);
            window.removeEventListener('pointercancel', handlePointerUp as any);
          } catch { /* ignore */ }
          try { if (typeof onPaintingChangeRef.current === 'function') onPaintingChangeRef.current(false); } catch { /* ignore */ }
        }
      } catch { /* ignore */ }
    };
    window.addEventListener('pointerdown', onWindowPointerDownOutside as EventListener, { capture: true });

    return () => {
      try { canvas.removeEventListener('pointerdown', handlePointerDown); } catch { /* ignore */ }
      try { window.removeEventListener('pointermove', handlePointerMove as any); } catch { /* ignore */ }
      try { window.removeEventListener('pointerup', handlePointerUp as any); } catch { /* ignore */ }
      try { window.removeEventListener('pointercancel', handlePointerUp as any); } catch { /* ignore */ }
      try { window.removeEventListener('pointerdown', onWindowPointerDownOutside as EventListener, { capture: true } as any); } catch { try { window.removeEventListener('pointerdown', onWindowPointerDownOutside as EventListener); } catch { /* ignore */ } }
      try { if (cursor) canvas.style.cursor = prevCursor; } catch { /* ignore */ }
      try { if (typeof onPaintingChangeRef.current === 'function') onPaintingChangeRef.current(false); } catch { /* ignore */ }
    };
    // Note: intentionally NOT depending on onPaint to avoid tearing down
    // listeners during active drags; onPaintRef keeps callback up-to-date.
  }, [canvasRef, active, cursor]);
}
