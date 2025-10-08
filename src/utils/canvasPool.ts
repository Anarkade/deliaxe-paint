// Canvas pooling system for memory optimization
// Reuses canvas elements to prevent constant allocation/deallocation

interface CanvasPoolEntry {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  inUse: boolean;
  lastUsed: number;
  width: number;
  height: number;
}

class CanvasPool {
  private pool: CanvasPoolEntry[] = [];
  private maxPoolSize = 10;
  private maxIdleTime = 60000; // 1 minute
  private cleanupInterval: number | null = null;

  constructor() {
    this.startCleanup();
  }

  // Get a canvas from the pool or create a new one
  getCanvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    // Try to find a suitable canvas in the pool
    const suitable = this.pool.find(entry => 
      !entry.inUse && 
      entry.width >= width && 
      entry.height >= height &&
      entry.width <= width * 1.5 && // Don't use oversized canvases
      entry.height <= height * 1.5
    );

    if (suitable) {
      suitable.inUse = true;
      suitable.lastUsed = Date.now();
      
      // Resize if needed
      if (suitable.width !== width || suitable.height !== height) {
        suitable.canvas.width = width;
        suitable.canvas.height = height;
        suitable.width = width;
        suitable.height = height;
      }
      
      // Clear the canvas
      suitable.ctx.clearRect(0, 0, width, height);
      
      return {
        canvas: suitable.canvas,
        ctx: suitable.ctx
      };
    }

    // Create new canvas if pool is not full
    if (this.pool.length < this.maxPoolSize) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get 2D context');
      }

      const entry: CanvasPoolEntry = {
        canvas,
        ctx,
        inUse: true,
        lastUsed: Date.now(),
        width,
        height
      };

      this.pool.push(entry);
      return { canvas, ctx };
    }

    // Pool is full, create temporary canvas (not pooled)
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }

    return { canvas, ctx };
  }

  // Return a canvas to the pool
  returnCanvas(canvas: HTMLCanvasElement): void {
    const entry = this.pool.find(e => e.canvas === canvas);
    if (entry) {
      entry.inUse = false;
      entry.lastUsed = Date.now();
      
      // Clear the canvas for next use
      entry.ctx.clearRect(0, 0, entry.width, entry.height);
    }
    // If not in pool, it was a temporary canvas - just let it be garbage collected
  }

  // Get canvas usage statistics
  getStats(): { total: number; inUse: number; available: number } {
    const inUse = this.pool.filter(e => e.inUse).length;
    return {
      total: this.pool.length,
      inUse,
      available: this.pool.length - inUse
    };
  }

  // Force cleanup of idle canvases
  cleanup(): void {
    const now = Date.now();
    const before = this.pool.length;
    
    this.pool = this.pool.filter(entry => {
      if (entry.inUse) return true;
      
      const idleTime = now - entry.lastUsed;
      return idleTime < this.maxIdleTime;
    });

    const removed = before - this.pool.length;
    if (removed > 0) {
      console.log(`Canvas pool cleanup: removed ${removed} idle canvases`);
    }
  }

  // Start automatic cleanup
  private startCleanup(): void {
    if (typeof window !== 'undefined') {
      this.cleanupInterval = window.setInterval(() => {
        this.cleanup();
      }, 30000); // Cleanup every 30 seconds
    }
  }

  // Stop automatic cleanup
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  // Clear all canvases (for testing or reset)
  clear(): void {
    this.pool.length = 0;
  }

  // Destroy the pool
  destroy(): void {
    this.stopCleanup();
    this.clear();
  }
}

// Global canvas pool instance
export const canvasPool = new CanvasPool();

// Utility functions for easy canvas management
export const getPooledCanvas = (width: number, height: number) => {
  return canvasPool.getCanvas(width, height);
};

export const returnPooledCanvas = (canvas: HTMLCanvasElement) => {
  canvasPool.returnCanvas(canvas);
};

// Hook for React components
export const useCanvasPool = () => {
  return {
    getCanvas: getPooledCanvas,
    returnCanvas: returnPooledCanvas,
    getStats: () => canvasPool.getStats(),
    cleanup: () => canvasPool.cleanup()
  };
};