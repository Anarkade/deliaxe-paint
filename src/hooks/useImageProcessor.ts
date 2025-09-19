// Custom hook for optimized image processing with Web Workers
import { useState, useCallback, useRef, useEffect } from 'react';
import type { ProcessingMessage, ProcessingResponse } from '../workers/imageProcessingWorker';
import type { Color } from '../lib/colorQuantization';

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
      const payload: unknown = data;
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

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      pendingRequests.current.clear();
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

      const message: ProcessingMessage = {
        type: 'PROCESS_IMAGE',
        data: {
          imageData,
          operation: options.operation,
          options: options.options
        } as Record<string, unknown>,
        id
      };

      workerRef.current.postMessage(message);
    });
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

      workerRef.current.postMessage(message);
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
    cancelProcessing
  };
};