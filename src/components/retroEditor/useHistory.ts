import { useState, useCallback } from 'react';

/**
 * History state snapshot containing image data and palette selection.
 * Used for undo/redo functionality.
 */
export type HistoryState = {
  imageData: ImageData;
  palette: string;
};

/**
 * Hook return type providing history state, actions, and computed values.
 */
export type UseHistoryReturn = {
  history: HistoryState[];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  saveToHistory: (state: HistoryState) => void;
  undo: (onRestore: (state: HistoryState) => void) => void;
  redo: (onRestore: (state: HistoryState) => void) => void;
  clearHistory: () => void;
  setHistory: (history: HistoryState[]) => void;
  setHistoryIndex: (index: number) => void;
};

/**
 * useHistory - Manages undo/redo history for image editing operations.
 * 
 * This hook provides a complete history stack with the following features:
 * - Automatic truncation when saving to middle of history
 * - Boundary checking for undo/redo operations
 * - Computed canUndo/canRedo flags for UI state
 * - Memory management with explicit clear function
 * 
 * @returns History state and actions
 * 
 * @example
 * const { saveToHistory, undo, redo, canUndo, canRedo } = useHistory();
 * 
 * // Save a new state
 * saveToHistory({ imageData, palette: 'gameboy' });
 * 
 * // Undo with callback to restore state
 * undo((prevState) => {
 *   setProcessedImageData(prevState.imageData);
 *   setSelectedPalette(prevState.palette);
 * });
 */
export function useHistory(): UseHistoryReturn {
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  /**
   * Save a new state to history. Truncates any forward history
   * if we're not at the end of the stack.
   */
  const saveToHistory = useCallback((state: HistoryState) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(state);
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  /**
   * Undo to the previous history state.
   * @param onRestore - Callback to apply the restored state to the UI
   */
  const undo = useCallback((onRestore: (state: HistoryState) => void) => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      onRestore(prevState);
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex]);

  /**
   * Redo to the next history state.
   * @param onRestore - Callback to apply the restored state to the UI
   */
  const redo = useCallback((onRestore: (state: HistoryState) => void) => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      onRestore(nextState);
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex]);

  /**
   * Clear all history and reset index. Used when loading a new image
   * or resetting the editor to free memory.
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
    setHistoryIndex(-1);
  }, []);

  // Computed flags for UI state
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return {
    history,
    historyIndex,
    canUndo,
    canRedo,
    saveToHistory,
    undo,
    redo,
    clearHistory,
    setHistory,
    setHistoryIndex,
  };
}

export default useHistory;
