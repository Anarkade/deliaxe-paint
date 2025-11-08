import { type Color, processMegaDriveImage, buildRetroConsolePaletteBruteForce } from '@/lib/colorQuantization';
import { type PaletteType } from '@/components/tabMenus/ChangePalette';
import FIXED_PALETTES from '@/lib/fixedPalettes';
import { applyFixedPalette } from './processing';
import { mergePreservePalette } from './paletteUtils';
import type { EditorRefs } from './useRetroEditorState';

/**
 * Apply palette conversion to an ImageData based on the selected palette type.
 * 
 * This function handles all palette conversion logic including:
 * - Game Boy variants (gameboy, gameboyBg, gameboyRealistic)
 * - Retro consoles (megadrive, gameGear, masterSystem)
 * - Fixed canonical palettes (CGA, NES, C64, Spectrum, etc.)
 * - Original palette preservation
 * 
 * @param imageData - The source image data to convert
 * @param palette - The target palette type
 * @param customColors - Optional custom color array (used for some palette types)
 * @param deps - Dependencies object containing required functions and refs
 * @returns Promise resolving to the converted ImageData
 */
export async function applyPaletteConversion(
  imageData: ImageData,
  palette: PaletteType,
  customColors: Color[] | undefined,
  deps: {
    imageProcessor: any;
    editorRefs: EditorRefs;
    writeOrderedPalette: (colors: Color[], source: string) => void;
    setProcessingProgress: (progress: number) => void;
    originalPaletteColors?: Color[]; // Original indexed palette from loaded image
  }
): Promise<ImageData> {
  const { imageProcessor, editorRefs, writeOrderedPalette, setProcessingProgress, originalPaletteColors } = deps;
  
  const resultImageData = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );
  const resultData = resultImageData.data;

  const toTriplets = (colors: Color[]): number[][] => colors.map(({ r, g, b }) => [r, g, b]);
  const toColorObjects = (triplets: number[][]): Color[] => triplets.map(([r, g, b]) => ({ r, g, b }));
  const paletteFromCustomOrDefault = (fallback: number[][]): number[][] => {
    if (customColors && customColors.length > 0) {
      return toTriplets(customColors);
    }
    return fallback;
  };

  // Helper to map pixels to 4 Game Boy shades based on perceived brightness
  // using the same thresholds as the 'gameboy' palette. This is shared so
  // 'gameboyBg' behaves identically but with its own 4 colors.
  const applyGbBrightnessMapping = (data: Uint8ClampedArray, colors4: number[][]) => {
    const pickShade = (r: number, g: number, b: number) => {
      const pixelBrightness = 0.299 * r + 0.587 * g + 0.114 * b;
      const brightnessPercent = (pixelBrightness / 255) * 100;
      if (brightnessPercent <= 24) return colors4[0];
      if (brightnessPercent <= 49) return colors4[1];
      if (brightnessPercent <= 74) return colors4[2];
      return colors4[3];
    };
    for (let i = 0; i < data.length; i += 4) {
      const chosen = pickShade(data[i], data[i + 1], data[i + 2]);
      data[i] = chosen[0];
      data[i + 1] = chosen[1];
      data[i + 2] = chosen[2];
    }
  };

  switch (palette) {
    case 'original': {
      setProcessingProgress(50);
      await new Promise(resolve => setTimeout(resolve, 10));
      if (customColors && customColors.length > 0) {
        // customColors are explicit from caller (user selection) so always
        // respect them and update ordered palette.
        writeOrderedPalette(customColors.map(({ r, g, b }) => ({ r, g, b })), 'applyPaletteConversion-custom');
      }
      setProcessingProgress(100);
      return resultImageData;
    }

    case 'gameboy': {
      setProcessingProgress(40);
      const gbColors = paletteFromCustomOrDefault([
        [7, 24, 33],
        [134, 192, 108],
        [224, 248, 207],
        [101, 255, 0]
      ]);

      await new Promise(resolve => setTimeout(resolve, 10));
      setProcessingProgress(70);
      applyGbBrightnessMapping(resultData, gbColors);

      await new Promise(resolve => setTimeout(resolve, 10));
      setProcessingProgress(90);
      if (!editorRefs.manualPaletteOverrideRef.current) {
        writeOrderedPalette(toColorObjects(gbColors), 'applyPaletteConversion-gb');
      }
      setProcessingProgress(100);
      return resultImageData;
    }

    case 'gameboyBg': {
      setProcessingProgress(40);
      const gbBgColors = paletteFromCustomOrDefault([
        [7, 24, 33],
        [48, 104, 80],
        [134, 192, 108],
        [224, 248, 207]
      ]);

      await new Promise(resolve => setTimeout(resolve, 10));
      setProcessingProgress(70);
      // Apply the exact same brightness-based mapping as 'gameboy',
      // only using the Game Boy BG 4-color set.
      applyGbBrightnessMapping(resultData, gbBgColors);

      await new Promise(resolve => setTimeout(resolve, 10));
      setProcessingProgress(90);
      if (!editorRefs.manualPaletteOverrideRef.current) {
        writeOrderedPalette(toColorObjects(gbBgColors), 'applyPaletteConversion-gbBg');
      }
      // Align with other fixed palette paths: clear any pending converted palette
      editorRefs.pendingConvertedPaletteRef.current = null;
      setProcessingProgress(100);
      return resultImageData;
    }

    case 'gameboyRealistic': {
      setProcessingProgress(40);
      const gbRealColors = paletteFromCustomOrDefault([
        [56, 72, 40],
        [96, 112, 40],
        [160, 168, 48],
        [208, 224, 64]
      ]);

      await new Promise(resolve => setTimeout(resolve, 10));
      setProcessingProgress(70);
      // Use the exact same brightness-based mapping thresholds as other GB palettes
      applyGbBrightnessMapping(resultData, gbRealColors);

      await new Promise(resolve => setTimeout(resolve, 10));
      setProcessingProgress(90);
      if (!editorRefs.manualPaletteOverrideRef.current) {
        writeOrderedPalette(toColorObjects(gbRealColors), 'applyPaletteConversion-gbRealistic');
      }
      // Align with fixed palette behavior
      editorRefs.pendingConvertedPaletteRef.current = null;
      setProcessingProgress(100);
      return resultImageData;
    }

    case 'megadrive': {
      try {
        console.log('[MegaDrive] START - pendingConverted:', editorRefs.pendingConvertedPaletteRef.current?.length || 0);
        // If we have a preserved-order palette (from switching from original indexed),
        // apply it directly without recalculating/merging. This becomes the processed palette.
        if (editorRefs.pendingConvertedPaletteRef.current && editorRefs.pendingConvertedPaletteRef.current.length > 0) {
          console.log('[MegaDrive] Using CACHED pending palette');
          const preserved = editorRefs.pendingConvertedPaletteRef.current.slice();
          const applied = await imageProcessor.applyPalette(
            resultImageData,
            preserved as any,
            (progress: number) => setProcessingProgress(progress)
          );
          if (!editorRefs.manualPaletteOverrideRef.current) {
            writeOrderedPalette(preserved, 'applyPaletteConversion-mega-preserved');
          }
          editorRefs.pendingConvertedPaletteRef.current = null;
          // Prevent any subsequent automatic processing pass from overwriting
          // the preserved-order palette; this fulfills the strict requirement
          // to keep order/count exactly as in the original palette.
          editorRefs.manualPaletteOverrideRef.current = true;
          return applied;
        }
        // Pass originalPaletteColors ONLY if it's truly an indexed palette
        // This allows the algorithm to preserve indexed palettes while still
        // quantizing RGB images properly. Never pass as fallback to customColors.
        const paletteToUse = (originalPaletteColors && originalPaletteColors.length > 0 && originalPaletteColors.length <= 16)
          ? originalPaletteColors
          : undefined;

        console.log('[MegaDrive] originalPaletteColors:', originalPaletteColors?.length, 'paletteToUse:', paletteToUse ? 'worker' : 'brute-force');

        // If we cannot preserve an indexed palette (no palette or palette has >16 colors),
        // use the new brute-force diversity algorithm per request.
        const megaDriveResult = !paletteToUse
          ? await buildRetroConsolePaletteBruteForce(resultImageData, 16, 'RGB333', setProcessingProgress)
          : await imageProcessor.processMegaDriveImage(
              resultImageData,
              paletteToUse,
              (progress: number) => setProcessingProgress(progress)
            );
        if (!editorRefs.manualPaletteOverrideRef.current) {
          const resultPalette = megaDriveResult.palette.map(({ r, g, b }) => ({ r, g, b }));
          if (editorRefs.pendingConvertedPaletteRef.current && editorRefs.pendingConvertedPaletteRef.current.length > 0) {
            const merged = mergePreservePalette(
              editorRefs.pendingConvertedPaletteRef.current,
              resultPalette,
              16
            );
            writeOrderedPalette(merged, 'applyPaletteConversion-mega-merged');
            editorRefs.pendingConvertedPaletteRef.current = null;
          } else {
            writeOrderedPalette(resultPalette, 'applyPaletteConversion-mega');
          }
        }
        // Report 100% after palette UI update completes
        setProcessingProgress(100);
        return megaDriveResult.imageData;
      } catch (error) {
        console.error('Mega Drive processing error:', error);
        // If worker path fails and we still have a preserved palette, use it directly
        if (editorRefs.pendingConvertedPaletteRef.current && editorRefs.pendingConvertedPaletteRef.current.length > 0) {
          try {
            const preserved = editorRefs.pendingConvertedPaletteRef.current.slice();
            const applied = await imageProcessor.applyPalette(resultImageData, preserved as any);
            if (!editorRefs.manualPaletteOverrideRef.current) {
              writeOrderedPalette(preserved, 'applyPaletteConversion-mega-preserved-fallback');
            }
            editorRefs.pendingConvertedPaletteRef.current = null;
            editorRefs.manualPaletteOverrideRef.current = true;
            return applied;
          } catch (e2) {
            /* continue to library fallback */
          }
        }
        // Pass originalPaletteColors ONLY if it's truly an indexed palette
        const paletteToUseFallback = (originalPaletteColors && originalPaletteColors.length > 0 && originalPaletteColors.length <= 16)
          ? originalPaletteColors
          : undefined;

        const fallback = !paletteToUseFallback
          ? await buildRetroConsolePaletteBruteForce(resultImageData, 16, 'RGB333', setProcessingProgress)
          : processMegaDriveImage(resultImageData, paletteToUseFallback);
        if (!editorRefs.manualPaletteOverrideRef.current) {
          const resultPalette = fallback.palette.map(({ r, g, b }) => ({ r, g, b }));
          writeOrderedPalette(resultPalette, 'applyPaletteConversion-mega-fallback');
        }
        return fallback.imageData;
      }
    }

    case 'gameGear': {
      try {
        // Prefer imageProcessor implementation if provided (keeps heavy work off main thread)
        if (editorRefs.pendingConvertedPaletteRef.current && editorRefs.pendingConvertedPaletteRef.current.length > 0) {
          const preserved = editorRefs.pendingConvertedPaletteRef.current.slice();
          const applied = await imageProcessor.applyPalette(
            resultImageData,
            preserved as any,
            (progress: number) => setProcessingProgress(progress)
          );
          if (!editorRefs.manualPaletteOverrideRef.current) {
            writeOrderedPalette(preserved, 'applyPaletteConversion-gamegear-preserved');
          }
          editorRefs.pendingConvertedPaletteRef.current = null;
          editorRefs.manualPaletteOverrideRef.current = true;
          return applied;
        }
        if (imageProcessor && typeof (imageProcessor as any).processGameGearImage === 'function') {
          // Pass originalPaletteColors ONLY if it's truly an indexed palette with ≤32 colors
          const paletteToUseGG = (originalPaletteColors && originalPaletteColors.length > 0 && originalPaletteColors.length <= 32)
            ? originalPaletteColors
            : undefined;

          // Use brute-force path when we cannot preserve an indexed palette
          const ggResult: any = !paletteToUseGG
            ? await buildRetroConsolePaletteBruteForce(resultImageData, 32, 'RGB444', setProcessingProgress)
            : await (imageProcessor as any).processGameGearImage(
                resultImageData,
                paletteToUseGG,
                (progress: number) => setProcessingProgress(progress)
              );
          if (!editorRefs.manualPaletteOverrideRef.current) {
            const resultPalette = ggResult.palette.map(({ r, g, b }: any) => ({ r, g, b }));
            writeOrderedPalette(resultPalette, 'applyPaletteConversion-gamegear');
          }
          setProcessingProgress(100);
          return ggResult.imageData;
        }
        // Fallback to local synchronous implementation
        const { processGameGearImage } = await import('@/lib/colorQuantization');
        if (editorRefs.pendingConvertedPaletteRef.current && editorRefs.pendingConvertedPaletteRef.current.length > 0) {
          try {
            const preserved = editorRefs.pendingConvertedPaletteRef.current.slice();
            const applied = await imageProcessor.applyPalette(resultImageData, preserved as any);
            if (!editorRefs.manualPaletteOverrideRef.current) {
              writeOrderedPalette(preserved, 'applyPaletteConversion-gamegear-preserved-fallback');
            }
            editorRefs.pendingConvertedPaletteRef.current = null;
            editorRefs.manualPaletteOverrideRef.current = true;
            return applied;
          } catch (e2) {
            /* continue to library fallback */
          }
        }
        // Pass originalPaletteColors ONLY if it's truly an indexed palette with ≤32 colors
        const paletteToUseGGFallback = (originalPaletteColors && originalPaletteColors.length > 0 && originalPaletteColors.length <= 32)
          ? originalPaletteColors
          : undefined;

        const ggFallback = !paletteToUseGGFallback
          ? await buildRetroConsolePaletteBruteForce(resultImageData, 32, 'RGB444', setProcessingProgress)
          : processGameGearImage(resultImageData, paletteToUseGGFallback);
        if (!editorRefs.manualPaletteOverrideRef.current) {
          const resultPalette = ggFallback.palette.map(({ r, g, b }) => ({ r, g, b }));
          writeOrderedPalette(resultPalette, 'applyPaletteConversion-gamegear-fallback');
        }
        return ggFallback.imageData;
      } catch (err) {
        console.error('Game Gear processing error:', err);
        // If something fails, fall back to applying a fixed palette if available
        const preset = FIXED_PALETTES['gameGear'];
        if (preset && preset.length > 0) {
          const remapped = await applyFixedPalette(resultImageData, preset);
          if (!editorRefs.manualPaletteOverrideRef.current) {
            writeOrderedPalette(preset.map(([r, g, b]) => ({ r, g, b })), 'applyPaletteConversion-gamegear-fixed');
          }
          return remapped;
        }
        return resultImageData;
      }
    }

    case 'masterSystem': {
      try {
        if (editorRefs.pendingConvertedPaletteRef.current && editorRefs.pendingConvertedPaletteRef.current.length > 0) {
          const preserved = editorRefs.pendingConvertedPaletteRef.current.slice();
          const applied = await imageProcessor.applyPalette(
            resultImageData,
            preserved as any,
            (progress: number) => setProcessingProgress(progress)
          );
          if (!editorRefs.manualPaletteOverrideRef.current) {
            writeOrderedPalette(preserved, 'applyPaletteConversion-master-preserved');
          }
          editorRefs.pendingConvertedPaletteRef.current = null;
          editorRefs.manualPaletteOverrideRef.current = true;
          return applied;
        }
        if (imageProcessor && typeof (imageProcessor as any).processMasterSystemImage === 'function') {
          // Pass originalPaletteColors ONLY if it's truly an indexed palette with ≤16 colors
          const paletteToUseMS = (originalPaletteColors && originalPaletteColors.length > 0 && originalPaletteColors.length <= 16)
            ? originalPaletteColors
            : undefined;

          // Use brute-force path when we cannot preserve an indexed palette
          const msResult: any = !paletteToUseMS
            ? await buildRetroConsolePaletteBruteForce(resultImageData, 16, 'RGB222', setProcessingProgress)
            : await (imageProcessor as any).processMasterSystemImage(
                resultImageData,
                paletteToUseMS,
                (progress: number) => setProcessingProgress(progress)
              );
          if (!editorRefs.manualPaletteOverrideRef.current) {
            const resultPalette = msResult.palette.map(({ r, g, b }: any) => ({ r, g, b }));
            writeOrderedPalette(resultPalette, 'applyPaletteConversion-master');
          }
          setProcessingProgress(100);
          return msResult.imageData;
        }
        const { processMasterSystemImage } = await import('@/lib/colorQuantization');
        if (editorRefs.pendingConvertedPaletteRef.current && editorRefs.pendingConvertedPaletteRef.current.length > 0) {
          try {
            const preserved = editorRefs.pendingConvertedPaletteRef.current.slice();
            const applied = await imageProcessor.applyPalette(resultImageData, preserved as any);
            if (!editorRefs.manualPaletteOverrideRef.current) {
              writeOrderedPalette(preserved, 'applyPaletteConversion-master-preserved-fallback');
            }
            editorRefs.pendingConvertedPaletteRef.current = null;
            editorRefs.manualPaletteOverrideRef.current = true;
            return applied;
          } catch (e2) {
            /* continue to library fallback */
          }
        }
        // Pass originalPaletteColors ONLY if it's truly an indexed palette with ≤16 colors
        const paletteToUseMSFallback = (originalPaletteColors && originalPaletteColors.length > 0 && originalPaletteColors.length <= 16)
          ? originalPaletteColors
          : undefined;

        const msFallback = !paletteToUseMSFallback
          ? await buildRetroConsolePaletteBruteForce(resultImageData, 16, 'RGB222', setProcessingProgress)
          : processMasterSystemImage(resultImageData, paletteToUseMSFallback);
        if (!editorRefs.manualPaletteOverrideRef.current) {
          const resultPalette = msFallback.palette.map(({ r, g, b }) => ({ r, g, b }));
          writeOrderedPalette(resultPalette, 'applyPaletteConversion-master-fallback');
        }
        return msFallback.imageData;
      } catch (err) {
        console.error('Master System processing error:', err);
        const preset = FIXED_PALETTES['masterSystem'];
        if (preset && preset.length > 0) {
          const remapped = await applyFixedPalette(resultImageData, preset);
          if (!editorRefs.manualPaletteOverrideRef.current) {
            writeOrderedPalette(preset.map(([r, g, b]) => ({ r, g, b })), 'applyPaletteConversion-master-fixed');
          }
          return remapped;
        }
        return resultImageData;
      }
    }

    default: {
      const preset = FIXED_PALETTES[palette];
      if (preset && preset.length > 0) {
        setProcessingProgress(40);
        await new Promise(resolve => setTimeout(resolve, 10));
        // For fixed, canonical palettes (CGA, NES, GameBoy variants, C64, Spectrum, Amstrad)
        // we must apply the palette exactly as defined by the preset. Always
        // apply the canonical palette to the image raster and update the
        // ordered palette to the preset regardless of whether the source
        // image had an indexed palette or a customColors array was provided.
        // This ensures selecting a canonical palette from the UI always
        // remaps pixels to the canonical set.
        const paletteToApply = preset; // ignore customColors for fixed palettes
        setProcessingProgress(60);
        await new Promise(resolve => setTimeout(resolve, 10));
        const remapped = await applyFixedPalette(resultImageData, paletteToApply);
        setProcessingProgress(90);
        await new Promise(resolve => setTimeout(resolve, 10));
        if (!editorRefs.manualPaletteOverrideRef.current) {
          const resultPalette = toColorObjects(paletteToApply as number[][]);
          writeOrderedPalette(resultPalette, 'applyPaletteConversion-fixed');
        }
        // Clear any pending converted palette since it is not applicable here
        editorRefs.pendingConvertedPaletteRef.current = null;
        setProcessingProgress(100);
        return remapped;
      }
      return resultImageData;
    }
  }
}

// handlePaletteUpdateFromViewer processes manual palette edits from the
// PaletteViewer UI. It prevents automatic reprocessing from overwriting
// manual edits and saves history snapshots for undo/redo.
export interface HandlePaletteUpdateFromViewerDependencies {
  // State
  processedImageData: ImageData | null;
  
  // Refs
  suppressNextProcessRef: React.MutableRefObject<boolean>;
  lastReceivedPaletteRef: React.MutableRefObject<string | null>;
  editorRefs: {
    manualPaletteOverrideRef: React.MutableRefObject<boolean>;
    manualPaletteTimeoutRef: React.MutableRefObject<number | null>;
  };
  
  // Functions
  imageProcessor: {
    applyPalette: (imageData: ImageData, palette: Color[]) => ImageData;
  };
  writeOrderedPalette: (colors: Color[], source: string) => void;
  saveToHistory: (state: { imageData: ImageData; palette: string }) => void;
  paletteKey: (colors: Color[]) => string;
  
  // Setters
  setProcessedImageData: (data: ImageData) => void;
  setAutoFitKey: (key: string) => void;
  
  // Constants
  selectedPalette: string;
}

export async function handlePaletteUpdateFromViewer(
  colors: Color[],
  deps: HandlePaletteUpdateFromViewerDependencies,
  meta?: any
): Promise<void> {
  // Deduplicate identical palette updates (compare canonical r,g,b representation)
  try {
    const incomingKey = deps.paletteKey(colors);
    if (deps.lastReceivedPaletteRef.current === incomingKey) return;
    deps.lastReceivedPaletteRef.current = incomingKey;
  } catch (e) {
    // If serialization fails, continue (best-effort)
  }
  
  // When the user edits the palette in the viewer we need to ensure the
  // in-memory processed image reflects that change and is persisted so
  // toggling between original/processed will restore the edited state.
  try {
    // Prevent automatic reprocessing from overwriting the manual change
    deps.suppressNextProcessRef.current = true;
    // Mark that the user manually edited the palette so automated
    // processing doesn't overwrite it. Persist the manual override until
    // the user explicitly selects a new palette or resets the editor.
    deps.editorRefs.manualPaletteOverrideRef.current = true;
    if (deps.editorRefs.manualPaletteTimeoutRef.current) {
      window.clearTimeout(deps.editorRefs.manualPaletteTimeoutRef.current);
      deps.editorRefs.manualPaletteTimeoutRef.current = null;
    }

    // If this update includes a 'replace' meta (single-color exact replace)
    // then prefer the provided ImageData (meta.imageData) if present so the
    // parent can atomically persist the edited raster. Otherwise perform
    // exact pixel replacement on the current processed raster if available
    // to avoid nearest-neighbor remapping.
    let newProcessed: ImageData | null = null;
    if (meta && meta.kind === 'replace') {
      if (meta.imageData && meta.imageData instanceof ImageData) {
        try {
          // clone to avoid keeping references to caller-owned buffers
          newProcessed = new ImageData(
            new Uint8ClampedArray(meta.imageData.data),
            meta.imageData.width,
            meta.imageData.height
          );
        } catch (e) {
          newProcessed = null;
        }
      } else if (deps.processedImageData) {
        try {
          const { oldColor, newColor } = meta;
          const cloned = new ImageData(
            new Uint8ClampedArray(deps.processedImageData.data),
            deps.processedImageData.width,
            deps.processedImageData.height
          );
          const data = cloned.data;
          for (let i = 0; i < data.length; i += 4) {
            if (data[i] === oldColor.r && data[i + 1] === oldColor.g && data[i + 2] === oldColor.b) {
              data[i] = newColor.r;
              data[i + 1] = newColor.g;
              data[i + 2] = newColor.b;
            }
          }
          newProcessed = cloned;
        } catch (e) {
          console.warn('Exact replace failed, falling back to applyPalette', e);
          newProcessed = null;
        }
      }
    }

    if (!newProcessed && deps.processedImageData) {
      try {
        // imageProcessor.applyPalette returns ImageData
        newProcessed = deps.imageProcessor.applyPalette(deps.processedImageData, colors);
      } catch (e) {
        console.error('applyPalette failed in handlePaletteUpdateFromViewer', e);
        newProcessed = null;
      }
    }

    if (newProcessed) {
      deps.setProcessedImageData(newProcessed);
      deps.writeOrderedPalette(colors, 'manual');
      deps.saveToHistory({ imageData: newProcessed, palette: deps.selectedPalette });
      deps.setAutoFitKey(String(Date.now()));
    }
  } catch (err) {
    console.error('handlePaletteUpdateFromViewer failed:', err);
  }
}

export default applyPaletteConversion;
