// Custom hook for optimized image processing with Web Workers
import { useState, useCallback, useRef, useEffect } from 'react';
import type { ProcessingMessage, ProcessingResponse } from '@/workers/imageProcessingWorker';
import type { Color } from '@/lib/colorQuantization';

interface ProcessingState {
  isProcessing: boolean;
  progress: number;
  error: string | null;
}

interface ProcessingOptions {
  operation: string;
  options?: Record<string, unknown>;
  onProgress?: (progress: number) => void;
}

export const useImageProcessor = () => {
  const [state, setState] = useState<ProcessingState>({
    isProcessing: false,
    progress: 0,
    error: null
  });
  
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const pendingRequests = useRef(new Map<string, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    onProgress?: (progress: number) => void;
  }>());

  // Initialize worker
  useEffect(() => {
    // Create worker from URL (Vite will handle the worker import)
    workerRef.current = new Worker(
      new URL('../workers/imageProcessingWorker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (event: MessageEvent<ProcessingResponse>) => {
      const { type, data, id, progress } = event.data;
      let payload: any = data;

      // Helper: if payload contains a packaged ImageData (width/height/buffer)
      // or an object with imageData:{width,height,buffer}, reconstruct
      // actual ImageData instances so callers can pass them to canvas APIs.
      const tryReconstructImageData = (obj: any): any => {
        if (!obj || typeof obj !== 'object') return obj;

        // Case: response is an object with top-level width/height/buffer
        if (typeof obj.width === 'number' && typeof obj.height === 'number' && obj.buffer) {
          try {
            const buf = obj.buffer as ArrayBuffer;
            const arr = new Uint8ClampedArray(buf);
            return new ImageData(arr, obj.width, obj.height);
          } catch (e) {
            // Reconstruction failed, return original
            return obj;
          }
        }

        // Case: object contains imageData property packaged
        if (obj.imageData && typeof obj.imageData === 'object') {
          const idata = obj.imageData as any;
          if (typeof idata.width === 'number' && typeof idata.height === 'number' && idata.buffer) {
            try {
              const buf = idata.buffer as ArrayBuffer;
              const arr = new Uint8ClampedArray(buf);
              // Replace the packaged imageData with a real ImageData instance
              const reconstructed = new ImageData(arr, idata.width, idata.height);
              const copy = { ...obj, imageData: reconstructed };
              return copy;
            } catch (e) {
              return obj;
            }
          }
        }

        // If it's an object, try to recursively reconstruct nested fields
        const out: any = Array.isArray(obj) ? [] : {};
        let changed = false;
        for (const k of Object.keys(obj)) {
          const v = obj[k];
          const r = tryReconstructImageData(v);
          out[k] = r;
          if (r !== v) changed = true;
        }
        return changed ? out : obj;
      };

      try {
        payload = tryReconstructImageData(payload);
      } catch (e) {
        // If reconstruction throws for unexpected reasons, keep original payload
        payload = data;
      }
      const request = pendingRequests.current.get(id);

      if (!request) return;

      switch (type) {
        case 'PROCESSING_COMPLETE':
          request.resolve(payload);
          pendingRequests.current.delete(id);
          setState(prev => ({ ...prev, isProcessing: false, progress: 100 }));
          break;

        case 'PROCESSING_ERROR':
          {
            const maybeMsg = (payload as Record<string, unknown>)['message'];
            const msg = typeof maybeMsg === 'string' ? maybeMsg : String(payload);
            request.reject(new Error(msg));
            pendingRequests.current.delete(id);
            setState(prev => ({ ...prev, isProcessing: false, error: msg }));
          }
          break;

        case 'PROCESSING_PROGRESS':
          if (progress !== undefined) {
            setState(prev => ({ ...prev, progress }));
            request.onProgress?.(progress);
          }
          break;
      }
    };

    workerRef.current.onerror = (error) => {
      console.error('Image processing worker error:', error);
      setState(prev => ({ ...prev, error: 'Worker error occurred', isProcessing: false }));
    };

    // Snapshot refs used in cleanup to avoid stale-ref warnings from ESLint
    const workerSnapshot = workerRef.current;
    const pendingSnapshot = pendingRequests.current;

    return () => {
      if (workerSnapshot) {
        workerSnapshot.terminate();
      }
      pendingSnapshot.clear();
    };
  }, []);

  // Process image data with worker
  const processImage = useCallback((
    imageData: ImageData,
    options: ProcessingOptions
  ): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const id = `req_${++requestIdRef.current}`;
      
      pendingRequests.current.set(id, {
        resolve,
        reject,
        onProgress: options.onProgress
      });

      setState(prev => ({ 
        ...prev, 
        isProcessing: true, 
        progress: 0, 
        error: null 
      }));

      // To avoid structured-clone of large ImageData (which can cause
      // DataCloneError / OOM), serialize the pixel buffer into a fresh
      // ArrayBuffer and transfer it to the worker. The worker will
      // reconstruct an ImageData instance from the buffer.
      const transferables: Transferable[] = [];

      const imagePayload: Record<string, unknown> = {
        operation: options.operation,
        options: options.options
      };

      if (imageData) {
        // Make a copy of the pixels to own a non-shared ArrayBuffer
        const pixels = new Uint8ClampedArray(imageData.data);
        imagePayload['imageData'] = {
          width: imageData.width,
          height: imageData.height,
          buffer: pixels.buffer
        };
        transferables.push(pixels.buffer);
      }

      const message: ProcessingMessage = {
        type: 'PROCESS_IMAGE',
        data: imagePayload as Record<string, unknown>,
        id
      };

      workerRef.current.postMessage(message, transferables);
    });
  }, []);

  // Broadcast quantization config to worker (no-op if worker ignores it)
  const setQuantizationConfig = useCallback((cfg: any) => {
    if (!workerRef.current) return;
    const id = `cfg_${++requestIdRef.current}`;
    const message: ProcessingMessage = {
      type: 'SET_QUANT_CONFIG' as any,
      data: { cfg } as any,
      id
    };
    try { workerRef.current.postMessage(message); } catch {}
  }, []);

  // Process Mega Drive image
  const processMegaDriveImage = useCallback((
    imageData: ImageData,
    originalPalette?: Color[],
    onProgress?: (progress: number) => void
  ): Promise<{ imageData: ImageData; palette: Color[] }> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const id = `megadrive_${++requestIdRef.current}`;
      
      pendingRequests.current.set(id, {
        resolve,
        reject,
        onProgress
      });

      setState(prev => ({ 
        ...prev, 
        isProcessing: true, 
        progress: 0, 
        error: null 
      }));

      const message: ProcessingMessage = {
        type: 'MEGA_DRIVE_PROCESS',
        data: {
          imageData,
          originalPalette
        } as Record<string, unknown>,
        id
      };
      // Serialize imageData for transfer to the worker
      const transferables: Transferable[] = [];
      const payload: Record<string, unknown> = { originalPalette };
      if (imageData) {
        const pixels = new Uint8ClampedArray(imageData.data);
        payload['imageData'] = {
          width: imageData.width,
          height: imageData.height,
          buffer: pixels.buffer
        };
        transferables.push(pixels.buffer);
      }

      const wrapped: ProcessingMessage = {
        type: 'MEGA_DRIVE_PROCESS',
        data: payload,
        id
      };

      workerRef.current.postMessage(wrapped, transferables);
    });
  }, []);

  // Extract colors from image
  const extractColors = useCallback((
    imageData: ImageData,
    onProgress?: (progress: number) => void
  ): Promise<Color[]> => {
    return processImage(imageData, {
      operation: 'EXTRACT_COLORS',
      onProgress
    }) as Promise<Color[]>;
  }, [processImage]);

  // Quantize colors
  const quantizeColors = useCallback((
    colors: Color[],
    targetCount: number,
    onProgress?: (progress: number) => void
  ): Promise<Color[]> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const id = `quantize_${++requestIdRef.current}`;
      
      pendingRequests.current.set(id, {
        resolve,
        reject,
        onProgress
      });

      setState(prev => ({ 
        ...prev, 
        isProcessing: true, 
        progress: 0, 
        error: null 
      }));

      const message: ProcessingMessage = {
        type: 'QUANTIZE_COLORS',
        data: {
          colors,
          targetCount
        } as Record<string, unknown>,
        id
      };

      workerRef.current.postMessage(message);
    });
  }, []);

  // Apply palette to image
  const applyPalette = useCallback((
    imageData: ImageData,
    palette: Color[],
    onProgress?: (progress: number) => void
  ): Promise<ImageData> => {
    return processImage(imageData, {
      operation: 'APPLY_PALETTE',
      options: { palette },
      onProgress
    }) as Promise<ImageData>;
  }, [processImage]);

  // Cancel current processing
  const cancelProcessing = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      
      // Recreate worker
      workerRef.current = new Worker(
        new URL('../workers/imageProcessingWorker.ts', import.meta.url),
        { type: 'module' }
      );
    }
    
    pendingRequests.current.clear();
    setState({
      isProcessing: false,
      progress: 0,
      error: null
    });
  }, []);

  return {
    ...state,
    processImage,
    processMegaDriveImage,
    extractColors,
    quantizeColors,
    applyPalette,
    cancelProcessing,
    setQuantizationConfig
  };
};