// Custom hook for monitoring and optimizing performance
import { useState, useCallback, useRef, useEffect } from 'react';

interface PerformanceMetrics {
  processingTime: number;
  memoryUsage: number;
  imageDimensions: { width: number; height: number };
  operationType: string;
  timestamp: number;
}

interface PerformanceState {
  metrics: PerformanceMetrics[];
  currentOperation: string | null;
  estimatedTime: number;
  memoryWarning: boolean;
  shouldOptimize: boolean;
}

export const usePerformanceMonitor = () => {
  const [state, setState] = useState<PerformanceState>({
    metrics: [],
    currentOperation: null,
    estimatedTime: 0,
    memoryWarning: false,
    shouldOptimize: false
  });

  const startTimeRef = useRef<number>(0);
  const maxMetrics = 50; // Keep only recent metrics

  // Monitor memory usage
  const checkMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMemory = memory.usedJSHeapSize / (1024 * 1024); // MB
      const totalMemory = memory.totalJSHeapSize / (1024 * 1024); // MB
      
      const memoryRatio = usedMemory / totalMemory;
      
      setState(prev => ({
        ...prev,
        memoryWarning: memoryRatio > 0.8, // Warn at 80% memory usage
        shouldOptimize: memoryRatio > 0.6  // Suggest optimization at 60%
      }));
      
      return usedMemory;
    }
    return 0;
  }, []);

  // Start performance measurement
  const startMeasurement = useCallback((operationType: string) => {
    startTimeRef.current = performance.now();
    setState(prev => ({
      ...prev,
      currentOperation: operationType
    }));
  }, []);

  // End performance measurement and record metrics
  const endMeasurement = useCallback((
    imageDimensions: { width: number; height: number }
  ) => {
    if (startTimeRef.current === 0) return;

    const processingTime = performance.now() - startTimeRef.current;
    const memoryUsage = checkMemoryUsage();

    const newMetric: PerformanceMetrics = {
      processingTime,
      memoryUsage,
      imageDimensions,
      operationType: state.currentOperation || 'unknown',
      timestamp: Date.now()
    };

    setState(prev => {
      const updatedMetrics = [...prev.metrics, newMetric];
      
      // Keep only recent metrics
      if (updatedMetrics.length > maxMetrics) {
        updatedMetrics.splice(0, updatedMetrics.length - maxMetrics);
      }

      return {
        ...prev,
        metrics: updatedMetrics,
        currentOperation: null
      };
    });

    startTimeRef.current = 0;
  }, [state.currentOperation, checkMemoryUsage]);

  // Estimate processing time based on historical data
  const estimateProcessingTime = useCallback((
    operationType: string,
    imageDimensions: { width: number; height: number }
  ): number => {
    const relevantMetrics = state.metrics.filter(
      m => m.operationType === operationType
    );

    if (relevantMetrics.length === 0) {
      // Default estimates based on image size
      const pixelCount = imageDimensions.width * imageDimensions.height;
      
      if (pixelCount > 4000000) return 3000; // 3 seconds for very large images
      if (pixelCount > 1000000) return 1500; // 1.5 seconds for large images
      if (pixelCount > 250000) return 500;   // 0.5 seconds for medium images
      return 200; // 0.2 seconds for small images
    }

    // Calculate weighted average based on image size similarity
    const targetPixels = imageDimensions.width * imageDimensions.height;
    
    let totalWeight = 0;
    let weightedTime = 0;

    relevantMetrics.forEach(metric => {
      const metricPixels = metric.imageDimensions.width * metric.imageDimensions.height;
      const sizeRatio = Math.min(targetPixels, metricPixels) / Math.max(targetPixels, metricPixels);
      const weight = sizeRatio; // Higher weight for similar-sized images
      
      totalWeight += weight;
      weightedTime += metric.processingTime * weight;
    });

    const estimate = totalWeight > 0 ? weightedTime / totalWeight : 1000;
    
    setState(prev => ({
      ...prev,
      estimatedTime: estimate
    }));

    return estimate;
  }, [state.metrics]);

  // Get optimization recommendations
  const getOptimizationRecommendations = useCallback((
    imageDimensions: { width: number; height: number }
  ) => {
    const pixelCount = imageDimensions.width * imageDimensions.height;
    const recommendations: string[] = [];

    // Size-based recommendations
    if (pixelCount > 4000000) {
      recommendations.push('Consider resizing image before processing');
      recommendations.push('Use Web Workers for heavy operations');
      recommendations.push('Enable progressive processing');
    }

    if (pixelCount > 1000000) {
      recommendations.push('Use optimized sampling for color analysis');
      recommendations.push('Consider chunked processing');
    }

    // Memory-based recommendations
    if (state.memoryWarning) {
      recommendations.push('Clear unused canvases and ImageData');
      recommendations.push('Process image in smaller chunks');
      recommendations.push('Consider reducing image quality temporarily');
    }

    // Performance history-based recommendations
    const recentMetrics = state.metrics.slice(-10);
    const avgProcessingTime = recentMetrics.reduce((sum, m) => sum + m.processingTime, 0) / recentMetrics.length;

    if (avgProcessingTime > 2000) {
      recommendations.push('Enable faster processing modes');
      recommendations.push('Use lower quality settings for preview');
      recommendations.push('Consider using OffscreenCanvas');
    }

    return recommendations;
  }, [state.memoryWarning, state.metrics]);

  // Determine if processing should be optimized
  const shouldOptimizeProcessing = useCallback((
    imageDimensions: { width: number; height: number }
  ): boolean => {
    const pixelCount = imageDimensions.width * imageDimensions.height;
    const estimatedTime = estimateProcessingTime('default', imageDimensions);

    return (
      pixelCount > 2000000 || // Large image
      estimatedTime > 1500 || // Estimated long processing time
      state.memoryWarning ||   // Memory pressure
      state.shouldOptimize     // General optimization flag
    );
  }, [estimateProcessingTime, state.memoryWarning, state.shouldOptimize]);

  // Clean up old metrics periodically
  useEffect(() => {
    const cleanup = setInterval(() => {
      const cutoffTime = Date.now() - (60 * 60 * 1000); // 1 hour ago
      
      setState(prev => ({
        ...prev,
        metrics: prev.metrics.filter(m => m.timestamp > cutoffTime)
      }));
    }, 5 * 60 * 1000); // Clean up every 5 minutes

    return () => clearInterval(cleanup);
  }, []);

  // Monitor memory usage periodically
  useEffect(() => {
    const monitor = setInterval(checkMemoryUsage, 10000); // Check every 10 seconds
    return () => clearInterval(monitor);
  }, [checkMemoryUsage]);

  return {
    ...state,
    startMeasurement,
    endMeasurement,
    estimateProcessingTime,
    getOptimizationRecommendations,
    shouldOptimizeProcessing,
    checkMemoryUsage
  };
};
