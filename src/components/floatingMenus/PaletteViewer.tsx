import { useTranslation } from '@/hooks/useTranslation';
import { useImageProcessor } from '@/hooks/useImageProcessor';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ColorEditor from '@/components/floatingMenus/ColorEditor';
import { type Color } from '@/lib/colorQuantization';
import { PaletteType } from '@/components/tabMenus/ChangePalette';
import getDefaultPalette, { SimpleColor } from '@/lib/defaultPalettes';
import { Eye, Palette, GripVertical, Lock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';
import { FIXED_KEYS } from '@/lib/fixedPalettes';
// pngAnalyzer functions are imported dynamically where needed to keep bundle size small
// pngAnalyzer functions are imported dynamically where needed to keep bundle size small

interface PaletteColor {
  r: number;
  g: number;
  b: number;
  transparent?: boolean;
}

  interface PaletteViewerProps {
  selectedPalette: string;
  imageData: ImageData | null;
  // Accept optional metadata for updates (e.g. single-color replace)
  onPaletteUpdate: (colors: Color[], meta?: any) => void;
  originalImageSource?: File | string | null;
  externalPalette?: Color[];
  onImageUpdate?: (imageData: ImageData) => void;
  // When true, the ImagePreview is showing the original image
  showOriginal?: boolean;
}

// default palettes now live in src/lib/defaultPalettes.ts

export const PaletteViewer = ({ selectedPalette, imageData, onPaletteUpdate, originalImageSource, externalPalette, onImageUpdate, showOriginal, paletteDepth, toolbarMode, toolbarRowsMode }: PaletteViewerProps & { paletteDepth?: { r: number; g: number; b: number }, toolbarMode?: boolean, toolbarRowsMode?: boolean }) => {
  const { t } = useTranslation();
  const lastSentPaletteRef = useRef<string | null>(null);

  // Canonical fixed palettes — imported from shared `fixedPalettes` module.
  // Palette colors state must be declared before any effects that read its length
  const [paletteColors, setPaletteColors] = useState<PaletteColor[]>(() =>
    // initialize with known defaults for the selected palette (may be empty)
    (getDefaultPalette(selectedPalette) as PaletteColor[])
  );

  // Columns/Rows behavior:
  // - Default mode: responsive (16 or 8) columns
  // - Toolbar columns mode: 2/4/8 columns (<=16, 17..64, >64)
  // - Toolbar rows mode: 2/4/8 rows (<=16, 17..64, >64) with grid auto-flow by column
  const [columns, setColumns] = useState<number>(toolbarMode ? 2 : 16);
  const [rows, setRows] = useState<number>(toolbarRowsMode ? 2 : 0);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [cellSize, setCellSize] = useState<number | null>(null);

  useEffect(() => {
    if (toolbarMode) {
      // Toolbar columns: <=16 -> 2 cols, 17..64 -> 4 cols, >64 -> 8 cols
      const count = (paletteColors?.length || 0);
      const cols = count > 64 ? 8 : (count > 16 ? 4 : 2);
      setColumns(cols);
      return; // no listeners needed in toolbar mode
    }
    if (toolbarRowsMode) {
      // Toolbar rows: <=16 -> 2 rows, 17..64 -> 4 rows, >64 -> 8 rows
      const count = (paletteColors?.length || 0);
      const r = count > 64 ? 8 : (count > 16 ? 4 : 2);
      setRows(r);
      return; // no listeners needed in toolbar rows mode
    }
    const updateColumns = () => {
      const isSmall = window.innerWidth <= 900;
      setColumns(isSmall ? 8 : 16);
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, [toolbarMode, toolbarRowsMode, paletteColors?.length]);

  // Calculate cell size to fit width nicely:
  // - toolbarRowsMode: compute size from container width, target rows, and gaps
  // - toolbarMode: fixed sizes (32/16/8)
  // - default: compute to fit columns
  useEffect(() => {
    const updateCellSize = () => {
      const gridEl = gridRef.current;
      if (!gridEl) {
        setCellSize(null);
        return;
      }
      if (toolbarRowsMode) {
        // In rows mode, width is auto (1fr columns) and height fixed; no explicit cell size
        setCellSize(null);
        return;
      }
      if (toolbarMode) {
        const count = (paletteColors?.length || 0);
        const size = count > 64 ? 8 : (count > 16 ? 16 : 32);
        setCellSize(size);
        return;
      }
      const gridW = gridEl.clientWidth;
      const gapPx = 8; // Tailwind gap-2 => 8px at root 16px
      const available = Math.max(0, gridW - gapPx * (columns - 1));
      const size = Math.floor(available / columns);
      setCellSize(size > 24 ? size : 24);
    };

    updateCellSize();
    const ro = new ResizeObserver(() => updateCellSize());
    if (gridRef.current) ro.observe(gridRef.current);
    window.addEventListener('resize', updateCellSize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateCellSize);
    };
  }, [columns, rows, toolbarMode, toolbarRowsMode, paletteColors?.length]);

  const emitPaletteUpdate = useCallback((colors: any, meta?: any) => {
    try {
      const arr = (colors || []).map((c: any) => `${c.r},${c.g},${c.b}`);
      const serialized = arr.join('|');
      if (lastSentPaletteRef.current === serialized) return;
      lastSentPaletteRef.current = serialized;
      onPaletteUpdate?.(colors as Color[], meta);
    } catch (err) {
      onPaletteUpdate?.(colors as Color[], meta);
    }
  }, [onPaletteUpdate]);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isOriginalPNG, setIsOriginalPNG] = useState<boolean>(false);
  const [blockedIndex, setBlockedIndex] = useState<number | null>(null);
  const blockedTimerRef = useRef<number | null>(null);
  const imageProcessor = useImageProcessor();

  // External palette handling: if provided, it is the source of truth.
  // Distinguish between undefined (use default) and [] (show empty, no default)
  const hasExternalPalette = Array.isArray(externalPalette);
  const externalPaletteKey = useMemo(
    () => (hasExternalPalette ? (externalPalette || []).map(c => `${c.r},${c.g},${c.b}`).join('|') : ''),
    [hasExternalPalette, externalPalette]
  );

  const handleDragStart = useCallback((index: number) => {
    // Prevent starting a drag on locked palettes (fixed palettes or original image)
    const isFixed = FIXED_KEYS.has(selectedPalette as any);
    const isOriginalPalette = selectedPalette === 'original';

    if (isFixed || (isOriginalPalette && showOriginal)) {
      setBlockedIndex(index);
      if (blockedTimerRef.current) window.clearTimeout(blockedTimerRef.current);
      blockedTimerRef.current = window.setTimeout(() => {
        setBlockedIndex(null);
        blockedTimerRef.current = null;
      }, 1000) as unknown as number;

      // Toast rules:
      // - If interacting with the original palette while viewing the original -> show dontModifyOriginalPalette
      // - If interacting with a fixed palette while viewing the processed image -> show dontModifyFixedPalette
      // - Otherwise do not show a toast
      try {
        if (showOriginal) {
          // When viewing the original image, always inform to modify the processed palette instead
          toast.info(t('dontModifyOriginalPalette'));
        } else if (isFixed && !showOriginal) {
          // When viewing the processed image, only fixed palettes are blocked
          toast.info(t('dontModifyFixedPalette'));
        }
      } catch (e) { /* ignore */ }

      return;
    }

    setDraggedIndex(index);
  }, [selectedPalette, showOriginal, t]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((targetIndex: number) => {
    if (draggedIndex === null) return;

    const isFixed = FIXED_KEYS.has(selectedPalette as any);
    const isOriginalPalette = selectedPalette === 'original';

    // Block dropping into a locked palette with toast rules as requested
    if (isFixed || (isOriginalPalette && showOriginal)) {
      setBlockedIndex(targetIndex);
      if (blockedTimerRef.current) window.clearTimeout(blockedTimerRef.current);
      blockedTimerRef.current = window.setTimeout(() => {
        setBlockedIndex(null);
        blockedTimerRef.current = null;
      }, 1000) as unknown as number;

      try {
        if (showOriginal) {
          // Viewing original -> always show original-specific toast
          toast.info(t('dontModifyOriginalPalette'));
        } else if (isFixed && !showOriginal) {
          // Viewing processed and target is fixed -> show fixed-specific toast
          toast.info(t('dontModifyFixedPalette'));
        }
      } catch (e) { /* ignore */ }

      setDraggedIndex(null);
      return;
    }

    const newColors = [...paletteColors];
    const [draggedColor] = newColors.splice(draggedIndex, 1);
    newColors.splice(targetIndex, 0, draggedColor);

    setPaletteColors(newColors);
    emitPaletteUpdate(newColors);
    setDraggedIndex(null);
  }, [draggedIndex, paletteColors, onPaletteUpdate, selectedPalette, showOriginal, t]);

  const selectNewColor = useCallback((index: number, currentPalette: PaletteType) => {
    // If this is a canonical fixed palette, block edits.
    // Show toast only when viewing the processed image (showOriginal === false).
    if (FIXED_KEYS.has(currentPalette)) {
      setBlockedIndex(index);
      if (blockedTimerRef.current) window.clearTimeout(blockedTimerRef.current);
      blockedTimerRef.current = window.setTimeout(() => {
        setBlockedIndex(null);
        blockedTimerRef.current = null;
      }, 1000) as unknown as number;
      try {
        // If viewing original, inform to modify processed palette instead
        if (showOriginal) {
          toast.info(t('dontModifyOriginalPalette'));
        } else {
          // Viewing processed: fixed palettes are blocked and show fixed-specific toast
          toast.info(t('dontModifyFixedPalette'));
        }
      } catch (e) { /* ignore */ }
      return;
    }

    // If this is the 'original' palette and the preview is showing the original,
    // block editing and show a temporary lock overlay and the original-specific toast.
    if (currentPalette === 'original' && typeof showOriginal !== 'undefined' && showOriginal) {
      setBlockedIndex(index);
      if (blockedTimerRef.current) window.clearTimeout(blockedTimerRef.current);
      blockedTimerRef.current = window.setTimeout(() => {
        setBlockedIndex(null);
        blockedTimerRef.current = null;
      }, 1000) as unknown as number;
      try { toast.info(t('dontModifyOriginalPalette')); } catch (e) { /* ignore */ }
      return;
    }

    // Open custom color editor instead of native input
    openEditor(index, currentPalette);
  }, [paletteColors, onPaletteUpdate, onImageUpdate, showOriginal]);

  const [editorState, setEditorState] = useState<{ 
    open: boolean; 
    index: number | null; 
    depth: { r: number; g: number; b: number } | null;
    position?: { x: number; y: number };
    width?: number;
    fixed?: boolean;
  }>({ open: false, index: null, depth: null });

  const openEditor = (index: number, currentPalette: PaletteType) => {
    // Prefer an explicit paletteDepth prop (provided by parent for original/processed views),
    // otherwise fall back to palette-specific defaults (megaDrive16 -> 3-3-3, else 8-8-8).
  const depth = paletteDepth ?? ((currentPalette === 'megaDrive16' || currentPalette === 'megaDrive61') ? { r: 3, g: 3, b: 3 } : { r: 8, g: 8, b: 8 });

  // First open the editor without position to measure its height
  setEditorState({ open: true, index, depth, position: undefined, fixed: toolbarMode ? true : undefined });

    // Use setTimeout to calculate position after editor is rendered
    setTimeout(() => {
  const selectedElement = document.querySelector(`[data-palette-index="${index}"]`) as HTMLElement;
  // Be robust across modes: look for our explicit root, then fall back
  const paletteContainer = (selectedElement?.closest('.palette-viewer-root') as HTMLElement) || (gridRef.current?.parentElement as HTMLElement);
  const editorElement = document.querySelector('[role="dialog"][aria-label="Color editor"]') as HTMLElement;
      
      let position: { x: number; y: number } | undefined;
      
      if (selectedElement && editorElement) {
        const selectedRect = selectedElement.getBoundingClientRect();
        const editorRect = editorElement.getBoundingClientRect();

        const editorWidth = editorRect.width || 340;
        const editorHeight = editorRect.height || 320;

        if (toolbarRowsMode) {
          // Horizontal toolbar mode: position ColorEditor below the toolbar
          const toolbarEl = selectedElement.closest('header') as HTMLElement | null;
          const toolbarRect = toolbarEl ? toolbarEl.getBoundingClientRect() : selectedRect;
          
          const editorWidthPx = editorRect.width || 340;
          const editorHeightPx = editorRect.height || 320;
          
          const containerEl = paletteContainer as HTMLElement | null;
          const containerRect = containerEl ? containerEl.getBoundingClientRect() : { left: 0, top: 0 } as DOMRect;
          
          // Position below the toolbar: toolbar bottom minus container top
          let localY = Math.round(toolbarRect.bottom - containerRect.top);
          
          // Center horizontally on the selected color block
          let localX = Math.round((selectedRect.left - containerRect.left) + (selectedRect.width / 2) - (editorWidthPx / 2));
          
          // Clamp to viewport bounds
          const margin = 8;
          const vw = window.innerWidth || document.documentElement.clientWidth;
          const vh = window.innerHeight || document.documentElement.clientHeight;
          
          // Horizontal clamping
          localX = Math.max(margin, Math.min(vw - editorWidthPx - margin, localX));
          
          // Vertical clamping (ensure it doesn't go off bottom of viewport)
          const viewportTop = (window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0);
          const maxY = Math.round(viewportTop - containerRect.top + vh - editorHeightPx - margin);
          localY = Math.min(maxY, localY);
          
          position = { x: Math.round(localX), y: Math.round(localY) };
          setEditorState({ open: true, index, depth, position, width: Math.round(editorWidthPx), fixed: false });
        } else if (toolbarMode) {
          // Vertical toolbar mode: align editor so its left edge touches the toolbar's right edge and
          // vertically center it to the toolbar's central block. Compute page
          // coordinates (client + scroll) so the editor uses absolute
          // positioning and moves together with the page scroll.
          const toolbarEl = selectedElement.closest('aside') as HTMLElement | null;
          const centerEl = toolbarEl ? (toolbarEl.querySelector('[data-toolbar-center]') as HTMLElement | null) : null;
          const toolbarRect = toolbarEl ? toolbarEl.getBoundingClientRect() : selectedRect;
          const centerRect = centerEl ? centerEl.getBoundingClientRect() : toolbarRect;
          // Alignment reference: the WHOLE toolbar, not only the center block
          const alignRect = toolbarRect;

          const editorWidthPx = editorRect.width || 340;
          const editorHeightPx = editorRect.height || 320;

          // Because the PaletteViewer root is positioned (relative), the
          // ColorEditor will be absolutely positioned relative to that root.
          // Compute coordinates local to the palette container so the left/top
          // we set match the desired document placement and the editor will
          // scroll together with the page.
          const containerEl = paletteContainer as HTMLElement | null;
          const containerRect = containerEl ? containerEl.getBoundingClientRect() : { left: 0, top: 0 } as DOMRect;

          // Left edge local: toolbar right (viewport) minus container left (viewport)
          let localX = Math.round(toolbarRect.right - containerRect.left);
          // Vertical center local: align to the toolbar's center, not only the middle block
          let localY = Math.round((alignRect.top - containerRect.top) + (alignRect.height / 2) - (editorHeightPx / 2));

          // Clamp within container viewport area to keep it visible
          const margin = 8;
          const vw = window.innerWidth || document.documentElement.clientWidth;
          if (localX + editorWidthPx > vw - margin) {
            // Try to place to the left of the toolbar inside the same container
            localX = Math.max(margin, Math.round(toolbarRect.left - containerRect.left - editorWidthPx));
          }
          // Clamp using viewport bounds transformed to container-local coords
          const viewportTop = (window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0);
          const viewportH = (window.innerHeight || document.documentElement.clientHeight);
          const minY = Math.round(viewportTop - containerRect.top + margin);
          const maxY = Math.round(viewportTop - containerRect.top + viewportH - editorHeightPx - margin);
          localY = Math.max(minY, Math.min(maxY, localY));

          position = { x: Math.round(localX), y: Math.round(localY) };
          // Use absolute positioning (fixed: false) so editor scrolls with the page
          setEditorState({ open: true, index, depth, position, width: Math.round(editorWidthPx), fixed: false });

          // Re-measure after layout and adjust local Y if the height changes,
          // keeping alignment to the toolbar's vertical center.
          setTimeout(() => {
            const re = document.querySelector('[role="dialog"][aria-label="Color editor"]') as HTMLElement | null;
            if (!re || !containerEl) return;
            const newRect = re.getBoundingClientRect();
            const newEditorH = newRect.height || editorHeightPx;
            const vpTop = (window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0);
            const vpH = (window.innerHeight || document.documentElement.clientHeight);
            const minY2 = Math.round(vpTop - containerRect.top + margin);
            const maxY2 = Math.round(vpTop - containerRect.top + vpH - newEditorH - margin);
            const newLocalY = Math.round((alignRect.top - containerRect.top) + (alignRect.height / 2) - (newEditorH / 2));
            const clampedY = Math.max(minY2, Math.min(maxY2, newLocalY));
            if (Math.abs(clampedY - position.y) > 1) {
              setEditorState(prev => ({ ...prev, position: { x: position.x, y: Math.round(clampedY) }, width: Math.round(newRect.width || editorWidthPx) }));
            }
          }, 50);
        } else if (paletteContainer) {
          // Existing behavior: compute relative to the palette viewer container
          const containerRect = paletteContainer.getBoundingClientRect();

          // Find all palette color blocks to determine boundaries
          const allColorBlocks = Array.from(paletteContainer.querySelectorAll('[data-palette-index]')) as HTMLElement[];
          const colorBlockRects = allColorBlocks.map(block => block.getBoundingClientRect());
          const leftMost = Math.min(...colorBlockRects.map(rect => rect.left));
          const rightMost = Math.max(...colorBlockRects.map(rect => rect.right));

          const relativeSelectedLeft = selectedRect.left - containerRect.left;
          const relativeSelectedTop = selectedRect.top - containerRect.top;
          const relativeSelectedWidth = selectedRect.width;
          const relativeLeftMost = leftMost - containerRect.left;
          const relativeRightMost = rightMost - containerRect.left;

          let x = relativeSelectedLeft + (relativeSelectedWidth / 2) - (editorWidth / 2);
          const minX = relativeLeftMost;
          const maxX = relativeRightMost - editorWidth;
          const availableWidth = relativeRightMost - relativeLeftMost;
          const effectiveWidth = Math.max(100, Math.min(editorWidth, availableWidth));
          x = Math.max(minX, Math.min(maxX, x));
          const y = relativeSelectedTop - editorHeight - 20;
          position = { x: Math.round(x), y: Math.round(y) };
          setEditorState({ open: true, index, depth, position, width: Math.round(effectiveWidth) });
        }
      }
    }, 10); // Small delay to ensure editor is rendered
  };

  const closeEditor = () => setEditorState({ open: false, index: null, depth: null, position: undefined });

  const applyEditorColor = (c: PaletteColor) => {
    if (editorState.index === null) return;

    // Update the palette UI first so the change is visible immediately
    const newColors = [...paletteColors];
    const oldColor = newColors[editorState.index];
    newColors[editorState.index] = { ...newColors[editorState.index], r: c.r, g: c.g, b: c.b };
    setPaletteColors(newColors);

    // If we have a processed raster, perform exact per-pixel replacement of
    // the old color with the new color so we don't rely on nearest-neighbor
    // quantization. This ensures the user's explicit edit replaces exact
    // pixels rather than remapping to the closest palette entry.
    try {
      if (imageData && typeof oldColor !== 'undefined' && oldColor !== null) {
        const cloned = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
        const data = cloned.data;
        const or = oldColor.r;
        const og = oldColor.g;
        const ob = oldColor.b;
        const nr = c.r;
        const ng = c.g;
        const nb = c.b;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i] === or && data[i + 1] === og && data[i + 2] === ob) {
            data[i] = nr;
            data[i + 1] = ng;
            data[i + 2] = nb;
            // keep alpha as-is
          }
        }
        // Notify parent with the updated processed raster first so it can
        // persist the ImageData before we emit the palette change metadata.
        try { onImageUpdate?.(cloned); } catch (e) { /* ignore */ }
        // Emit palette update with metadata describing the single-color replace
        // Include the cloned ImageData in the meta to ensure the parent can
        // atomically persist the edited raster even if events arrive out of order.
        emitPaletteUpdate(newColors, {
          kind: 'replace',
          index: editorState.index,
          oldColor: { r: or, g: og, b: ob },
          newColor: { r: nr, g: ng, b: nb },
          imageData: cloned
        });
        // Close editor after notifications
        closeEditor();
        return;
      }
    } catch (e) {
      // Fall back to emitting palette update only
    }

    // Default behavior: emit palette update (no raster available)
    emitPaletteUpdate(newColors);

    // Then update the processed image pixels (if available) and notify parent
    // Let the parent handle applying the palette to the processed raster
    // and persisting the ordered palette via the onPaletteUpdate callback.
    // Doing both onImageUpdate and onPaletteUpdate from the viewer created
    // duplicated flows that could cause feedback loops.

    // Close editor after all notifications
    closeEditor();
  };

  // RGB333 conversion helper
  const toRGB333 = (r: number, g: number, b: number) => {
    const r3 = Math.round((r / 255) * 7);
    const g3 = Math.round((g / 255) * 7);
    const b3 = Math.round((b / 255) * 7);
    
    return {
      r: Math.round((r3 / 7) * 255),
      g: Math.round((g3 / 7) * 255),
      b: Math.round((b3 / 7) * 255)
    };
  };

  const extractColorsFromImage = useCallback(async () => {
    if (!imageData && !originalImageSource) return;
    
    // First try to extract from PNG PLTE chunk if it's an indexed PNG
    if (originalImageSource) {
      try {
        const module = await import('@/lib/pngAnalyzer');
        const pngPalette = await module.extractPNGPalette(originalImageSource as File | string);
        if (pngPalette && pngPalette.length > 0) {
          const colors = pngPalette.slice(0, paletteColors.length || 256);
          setPaletteColors(colors);
          try { lastSentPaletteRef.current = (colors || []).map((c: any) => `${c.r},${c.g},${c.b}`).join('|'); } catch (e) { /* ignore */ }
          return;
        }
      } catch (error) {
        console.log('Could not extract PNG palette, falling back to image analysis');
      }
    }
    
    // Fallback to analyzing processed image data
    if (!imageData) return;
    
    // Extract actual colors from the processed image
    const colors = new Map<string, number>();
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const colorKey = `${r},${g},${b}`;
      colors.set(colorKey, (colors.get(colorKey) || 0) + 1);
    }
    
    // Sort by frequency and take the most common colors
    const sortedColors = Array.from(colors.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, paletteColors.length)
      .map(([color]) => {
        const [r, g, b] = color.split(',').map(Number);
        return { r, g, b };
      });
    
    // Do not create black placeholder colors when the image has fewer
    // unique colors than the UI palette slots. Leave the palette as-is
    // (shorter) and let the parent decide how to handle missing slots
    // (for example by initializing defaults). This prevents emitting
    // misleading all-black placeholder palettes.
    setPaletteColors(sortedColors);
    if (sortedColors.length > 0) {
      emitPaletteUpdate(sortedColors);
    }
  }, [imageData, originalImageSource, paletteColors.length, onPaletteUpdate]);

  // Keep palette in sync with external palette when present
  useEffect(() => {
    if (hasExternalPalette) {
      // Use external palette verbatim (preserve order/count). Do NOT emit.
      const mapped = (externalPalette || []).map(c => ({ r: c.r, g: c.g, b: c.b }));
      setPaletteColors(mapped);
      try { lastSentPaletteRef.current = (mapped || []).map((c: any) => `${c.r},${c.g},${c.b}`).join('|'); } catch (e) { /* ignore */ }
    }
  }, [hasExternalPalette, externalPaletteKey]);

  // Extract unique colors or initialize defaults when no external palette
  useEffect(() => {
    if (hasExternalPalette) return; // external palette is authoritative
    const extractColors = async () => {
      // No external palette: proceed with extraction/initialization

      // First try to extract from PNG PLTE chunk if it's an indexed PNG
      if (originalImageSource && selectedPalette === 'original') {
        try {
          const module = await import('@/lib/pngAnalyzer');
          const pngPalette = await module.extractPNGPalette(originalImageSource as File | string);
          if (pngPalette && pngPalette.length > 0) {
            setIsOriginalPNG(true);
            setPaletteColors(pngPalette); // Keep original order
            try { lastSentPaletteRef.current = (pngPalette || []).map((c: any) => `${c.r},${c.g},${c.b}`).join('|'); } catch (e) { /* ignore */ }
            return;
          }
        } catch (error) {
          console.log('Could not extract PNG palette, falling back to image analysis');
        }
      }
      
      setIsOriginalPNG(false);

      // For retro palettes, show the default palette in the viewer but
      // DO NOT emit onPaletteUpdate here. Emitting at selection time was
      // treated as a manual edit by the parent (triggering manual override)
      // and could bypass the proper processing path, especially for
      // Game Boy variants on indexed images.
      if (selectedPalette !== 'original') {
        const defaultPalette = getDefaultPalette(selectedPalette);
        if (defaultPalette && defaultPalette.length > 0) {
          setPaletteColors(defaultPalette);
          // Record the last-sent value so genuine user edits still emit later
          try { lastSentPaletteRef.current = (defaultPalette || []).map((c: any) => `${c.r},${c.g},${c.b}`).join('|'); } catch (e) { /* ignore */ }
        } else {
          // No built-in default: do not emit placeholder black colors.
          setPaletteColors([]);
          try { lastSentPaletteRef.current = ''; } catch (e) { /* ignore */ }
        }
        return;
      }

      // Priority 1: Handle 'original' palette - only extract from indexed images
      if (selectedPalette === 'original') {
        if (originalImageSource) {
          try {
            const module = await import('@/lib/pngAnalyzer');
            const formatInfo = await module.analyzePNGFile(originalImageSource as File | string);
            if (formatInfo.isIndexed) {
              // Try to extract palette from PNG PLTE chunk
              const extractedPalette = await module.extractPNGPalette(originalImageSource as File | string);
              if (extractedPalette && extractedPalette.length > 0) {
                setPaletteColors(extractedPalette);
                emitPaletteUpdate(extractedPalette);
                return;
              }
            } else {
              // Non-indexed image - clear palette
                setPaletteColors([]);
                try { lastSentPaletteRef.current = ''; } catch (e) { /* ignore */ }
                return;
            }
          } catch (error) {
            // If analysis fails, assume non-indexed and clear palette
            setPaletteColors([]);
            try { lastSentPaletteRef.current = ''; } catch (e) { /* ignore */ }
            return;
          }
        }
        
  // If no original image source or extraction failed, clear palette for 'original' mode
  setPaletteColors([]);
  try { lastSentPaletteRef.current = ''; } catch (e) { /* ignore */ }
  return;
      }

  // Priority 3: Use default retro palettes (non-original) — do not emit here
  // to avoid flagging a manual override on selection.
  const defaultPalette = getDefaultPalette(selectedPalette);
  setPaletteColors(defaultPalette);
  try { lastSentPaletteRef.current = (defaultPalette || []).map((c: any) => `${c.r},${c.g},${c.b}`).join('|'); } catch (e) { /* ignore */ }
    };

    extractColors();
  }, [imageData, selectedPalette, originalImageSource, onPaletteUpdate, hasExternalPalette]);

  const applyPaletteToImage = useCallback(async () => {
    if (!imageData || paletteColors.length === 0) return;

    const processedImageData = await imageProcessor.applyPalette(imageData, paletteColors);
    if (processedImageData && onImageUpdate) {
      onImageUpdate(processedImageData);
    }
  }, [imageData, paletteColors, imageProcessor, onImageUpdate]);

  const handleApplyPalette = () => {
    applyPaletteToImage();
  };

  if (selectedPalette === 'original' && !isOriginalPNG) {
    // If an external palette is provided (e.g., after processing), allow showing the viewer
    if (!externalPalette || externalPalette.length === 0) return null;
  }

  
  // Prepare the detailed palette label with depth placeholders replaced
  const detailedCountLabel = paletteColors.length > 0 ? (() => {
    // Prefer explicit paletteDepth prop (passed from parent) over editorState.depth
    const depth = paletteDepth || editorState.depth || { r: 8, g: 8, b: 8 };
    const bits = (depth.r || 0) + (depth.g || 0) + (depth.b || 0);
    return t('paletteWithDetailedCount')
      .replace('{count}', paletteColors.length.toString())
      .replace('{depthR}', String(depth.r))
      .replace('{depthG}', String(depth.g))
      .replace('{depthB}', String(depth.b))
      .replace('{depthBits}', String(bits));
  })() : null;

  // Detect whether the selected palette is one of the fixed, non-editable palettes
  const isFixedPalette = (!!selectedPalette && FIXED_KEYS.has(selectedPalette as any));

  // Compute palette block padding: aim for even, crisp edges (avoid subpixel values)
  const paletteBlockPadding = (() => {
    if (toolbarRowsMode) {
      // Top toolbar rows mode uses a 2px vertical gap; use 1px padding all around
      return 1;
    }
    if (toolbarMode) {
      const cols = columns || 2;
      // Use integer pixels to avoid uneven rendering; 2 cols => 2px, 4/8 cols => 1px
      return cols >= 4 ? 1 : 2;
    }
    return 0;
  })();

  return (
    <div className={((toolbarMode || toolbarRowsMode) ? "relative p-0 m-0 min-w-0" : "relative space-y-4 p-4 border border-elegant-border color-bg-highlight rounded-lg") + " palette-viewer-root"}>
      <div className={toolbarMode ? "" : "space-y-4"}>
        <div className="w-full flex justify-center">
          <div
            className={
              (() => {
                // Build grid gap classes with per-axis control when in toolbarRowsMode (top toolbar)
                if (toolbarRowsMode) {
                  const r = rows || 2;
                  // Horizontal gap scales by rows; vertical gap is halved and set via style
                  const gapX = r >= 8 ? 'gap-x-px' : (r >= 4 ? 'gap-x-0.5' : 'gap-x-1');
                  const gapY = 'gap-y-0.5';
                  return `grid ${gapX} ${gapY} w-full`;
                }
                // In toolbar columns mode (vertical toolbar), per-axis: vertical gap is set via style
                if (toolbarMode) {
                  const cols = columns || 2;
                  // Halve horizontal gap for the left (vertical) toolbar where possible.
                  // Original mapping used gap-x-1 / gap-x-0.5 / gap-x-px; shifting
                  // down one step halves the spacing (1 -> 0.5, 0.5 -> px).
                  const gapX = cols >= 8 ? 'gap-x-px' : (cols >= 4 ? 'gap-x-px' : 'gap-x-0.5');
                  return `grid ${gapX} w-full`;
                }
                // Default viewer mode
                return 'grid gap-2 w-full';
              })()
            }
            ref={gridRef}
            style={
              toolbarRowsMode
                ? {
                    gridAutoFlow: 'column',
                    gridAutoColumns: '1fr',
                    gridTemplateRows: `repeat(${rows || 2}, 32px)`,
                    // Gray background only for the palette block in toolbars
                    backgroundColor: '#808080',
                    rowGap: '2px', // halved vertical gap in rows mode
                    padding: `${paletteBlockPadding}px`,
                    // Match swatch corner radius exactly (absolute px) rather than
                    // scaling with container size. Tailwind `rounded` equals 0.25rem
                    // => typically 4px at 16px root. Use explicit pixels so all
                    // corners match swatch rounding.
                    borderRadius: '4px',
                    boxSizing: 'border-box',
                    overflow: 'hidden'
                  }
                : (toolbarMode
                    ? {
                        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                        backgroundColor: '#808080',
                        // 2 cols => 2px, 4 cols => 1px, 8 cols => 0.5px
                        rowGap: `${(columns || 2) >= 8 ? 0.5 : ((columns || 2) >= 4 ? 1 : 2)}px`,
                        padding: `${paletteBlockPadding}px`,
                        // Keep swatch corners identical to the container (absolute px)
                        borderRadius: '4px',
                        boxSizing: 'border-box',
                        overflow: 'hidden'
                      }
                    : { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }
                  )
            }
          >
            {paletteColors.map((color, index) => {
              const hexColor = `#${color.r.toString(16).padStart(2, '0')}${color.g.toString(16).padStart(2, '0')}${color.b.toString(16).padStart(2, '0')}`.toUpperCase();
              const alpha = color.transparent ? 0 : 100;
              
              return (
                  <div
                  key={index}
                  draggable
                  onDragStart={(e) => {
                    handleDragStart(index);
                    // Improve mobile drag support
                    if (e.dataTransfer) {
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', index.toString());
                    }
                  }}
                  onDragOver={handleDragOver}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDrop(index);
                  }}
                  onTouchStart={() => handleDragStart(index)}
                  onTouchMove={(e) => {
                    e.preventDefault();
                    // Handle touch drag for mobile
                  }}
                  onTouchEnd={(e) => {
                    // Handle touch drop for mobile
                    const touch = e.changedTouches[0];
                    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
                    const targetElement = elementBelow?.closest('[data-palette-index]');
                    if (targetElement) {
                      const targetIndex = parseInt(targetElement.getAttribute('data-palette-index') || '0');
                      handleDrop(targetIndex);
                    }
                    setDraggedIndex(null);
                  }}
                  onClick={() => selectNewColor(index, selectedPalette)}
                  data-palette-index={index}
                  className={(toolbarMode || toolbarRowsMode) ? "relative group cursor-pointer rounded p-0 transition-all touch-manipulation" : "relative group cursor-pointer border border-elegant-border rounded-lg p-0.5 hover:shadow-lg transition-all touch-manipulation color-bg-highlight"}
                >
                  <div className="w-full">
                    {/* Tooltip: wrap the color block and grip icon so hovering the whole area shows details */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="relative">
                            <div
                              className={(toolbarMode || toolbarRowsMode) ? "rounded cursor-pointer transition-all" : "w-full aspect-square border border-elegant-border rounded cursor-pointer transition-all hover:scale-105"}
                              style={{
                                backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
                                opacity: color.transparent ? 0.5 : 1,
                                ...(
                                  toolbarRowsMode
                                    ? { width: `100%`, height: `32px` }
                                    : (toolbarMode
                                        ? { width: `100%`, height: `${cellSize || 32}px` }
                                        : (columns === 8 && cellSize ? { width: `${cellSize}px`, height: `${cellSize}px` } : {}))
                                )
                              }}
                            >
                              {blockedIndex !== null && ((selectedPalette === 'original' && showOriginal) || FIXED_KEYS.has(selectedPalette)) && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                  <Lock className="h-4 w-4 text-white" />
                                </div>
                              )}
                              {color.transparent && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-3 h-3 bg-white rounded-full opacity-75" />
                                </div>
                              )}
                            </div>
                            {!(toolbarMode || toolbarRowsMode) && <GripVertical className="absolute -top-1 -right-1 h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="font-mono text-xs text-muted-foreground text-left">
                          <div>{t('paletteColorPosition').replace('{count}', String(index))}</div>
                          <div className="font-semibold text-foreground">{hexColor}</div>
                          <div>R {color.r}</div>
                          <div>G {color.g}</div>
                          <div>B {color.b}</div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              );
            })}
            {/* Footer texts moved to ImagePreview footer; omit toolbar-mode info cell */}
            </div>
          </div>
        </div>
        {/* Footer texts moved to ImagePreview footer; omit inline viewer info block */}

        {editorState.open && editorState.index !== null && (
          <ColorEditor
            initial={paletteColors[editorState.index]}
            depth={editorState.depth || { r: 8, g: 8, b: 8 }}
            onAccept={(c) => applyEditorColor(c)}
            onCancel={() => closeEditor()}
            position={editorState.position}
            width={editorState.width}
            suppressInitialCenter={true}
            positioning={editorState.fixed ? 'fixed' : 'absolute'}
          />
        )}
    </div>
  );
};