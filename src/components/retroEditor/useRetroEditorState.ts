import { useCallback, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { type Color } from '@/lib/colorQuantization';

type Depth = { r: number; g: number; b: number };

/**
 * Refs exposed by the editor hook. Documenting each ref here makes it
 * easier to understand cross-cutting state the UI relies on.
 *
 * - canvasRef: reference to a pooled canvas element used for offscreen work
 * - imageRef: reference to the current HTMLImageElement (if any)
 * - manualPaletteOverrideRef: true when the user manually edited the palette
 *   and automatic processing should avoid overwriting it
 * - pendingConvertedPaletteRef: temporary buffer holding a preserved-order
 *   palette awaiting application (used when switching indexed -> retro palettes)
 * - lastManualProcessedRef: last processed ImageData produced by a manual
 *   palette/image edit; restored when toggling processed preview
 * - lastWrittenPaletteRef: serialization key of the last palette written so
 *   duplicate writes can be avoided
 * - manualPaletteTimeoutRef: timeout id used to clear the manual-override
 *   flag after a scheduled delay (keeps the override transient when desired)
 */
export type EditorRefs = {
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  imageRef: MutableRefObject<HTMLImageElement | null>;
  manualPaletteOverrideRef: MutableRefObject<boolean>;
  pendingConvertedPaletteRef: MutableRefObject<Color[] | null>;
  lastManualProcessedRef: MutableRefObject<ImageData | null>;
  lastWrittenPaletteRef: MutableRefObject<string | null>;
  manualPaletteTimeoutRef: MutableRefObject<number | null>;
};

// Minimal, easily-extensible hook that centralizes editor state and actions.
// This file intentionally keeps logic lightweight — we'll migrate more
// responsibilities here incrementally (processing scheduling, history,
// image refs) as part of the ongoing refactor.

export type RGB = [number, number, number];

/**
 * Lightweight slice of state exposed to UI consumers.
 *
 * - palette: ordered RGB triplets used for processing/preview (or null)
 * - isProcessing: whether a background processing operation is active
 * - zoom: UI zoom percent (number representation used by ImagePreview)
 * - selectedTool: identifier of the currently selected UI tool (if any)
 */
export type EditorState = {
  palette: RGB[] | null;
  isProcessing: boolean;
  zoom: number;
  selectedTool: string | null;
};

/**
 * Actions mutate the editor state. They are returned stable (memoized)
 * so callers can use them in dependency arrays without causing extra renders.
 */
export type EditorActions = {
  setPalette: (p: RGB[] | null) => void;
  setIsProcessing: (v: boolean) => void;
  setZoom: (z: number) => void;
  setSelectedTool: (t: string | null) => void;
};

export function useRetroEditorState(initial?: Partial<EditorState>) {
  const [palette, setPalette] = useState<RGB[] | null>(initial?.palette ?? null);
  const [isProcessing, setIsProcessing] = useState<boolean>(initial?.isProcessing ?? false);
  const [zoom, setZoom] = useState<number>(initial?.zoom ?? 1);
  const [selectedTool, setSelectedTool] = useState<string | null>(initial?.selectedTool ?? null);

  // Palette-related state
  const [originalPaletteColors, setOriginalPaletteColors] = useState<Color[]>([]);
  const [orderedPaletteColors, setOrderedPaletteColors] = useState<Color[]>([]);
  const [isOriginalPNG8Indexed, setIsOriginalPNG8Indexed] = useState<boolean>(false);
  const [paletteDepthOriginal, setPaletteDepthOriginal] = useState<Depth>({ r: 8, g: 8, b: 8 });
  const [paletteDepthProcessed, setPaletteDepthProcessed] = useState<Depth>({ r: 8, g: 8, b: 8 });
  // Foreground / background colors used by drawing tools and toolbar swatches
  const [colorForeground, setColorForeground] = useState<Color>({ r: 0, g: 0, b: 0 });
  const [colorBackground, setColorBackground] = useState<Color>({ r: 255, g: 255, b: 255 });

  // Refs for cross-cutting flags and temporary buffers
  const manualPaletteOverrideRef = useRef<boolean>(false);
  const pendingConvertedPaletteRef = useRef<Color[] | null>(null);
  const lastManualProcessedRef = useRef<ImageData | null>(null);
  const lastWrittenPaletteRef = useRef<string | null>(null);
  // Timeout ref used when scheduling/manual palette resets
  const manualPaletteTimeoutRef = useRef<number | null>(null);

  // Some refs that other parts of the editor may want to access
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const actions = useMemo<EditorActions>(() => ({
    setPalette,
    setIsProcessing,
    setZoom,
    setSelectedTool,
  }), []);

  const extendedActions = useMemo(() => ({
    setOriginalPaletteColors,
    setOrderedPaletteColors,
    setIsOriginalPNG8Indexed,
    setPaletteDepthOriginal,
    setPaletteDepthProcessed,
    setColorForeground,
    setColorBackground,
  }), []);

  // Lightweight helpers
  const reset = useCallback(() => {
    setPalette(null);
    setIsProcessing(false);
    setZoom(1);
    setSelectedTool(null);
  }, []);

  // Reset helper should also clear the FG/BG to defaults when invoked
  const resetFull = useCallback(() => {
    reset();
    setColorForeground({ r: 0, g: 0, b: 0 });
    setColorBackground({ r: 255, g: 255, b: 255 });
  }, [reset]);


  /**
   * Returned shape description:
   *
   * - state: read-only snapshot of editor values the UI may render (palette,
   *   processing, zoom, tool) plus palette-related metadata (original/ordered
   *   palettes and depths).
   * - actions: stable setter functions for updating the state above; includes
   *   extended setters for palette metadata migrated from the original component.
   * - refs: low-level mutable references (canvas/image/ref flags) used for
   *   scheduling or storing transient buffers without triggering renders.
   * - helpers: small utility functions such as `reset` to restore defaults.
   */

  // Package refs into a single object and annotate with EditorRefs so callers
  // have clear, typed access to the shape/purpose of each ref.
  const refs = {
    canvasRef,
    imageRef,
    manualPaletteOverrideRef,
    pendingConvertedPaletteRef,
    lastManualProcessedRef,
    lastWrittenPaletteRef,
    manualPaletteTimeoutRef,
  } as EditorRefs;

  return {
    state: { palette, isProcessing, zoom, selectedTool,
      originalPaletteColors, orderedPaletteColors, isOriginalPNG8Indexed, paletteDepthOriginal, paletteDepthProcessed,
      colorForeground, colorBackground },
    actions: { ...actions, ...extendedActions },
    refs,
    helpers: { reset: resetFull },
  } as const;
}

export default useRetroEditorState;
