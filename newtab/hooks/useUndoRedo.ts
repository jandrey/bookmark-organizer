/**
 * Undo/Redo Hook for Bookmark Operations
 * 
 * Features:
 * - Tracks bookmark operations for undo/redo
 * - Maintains operation history with timestamps
 * - Supports different operation types
 * - Fast undo/redo operations (<300ms)
 */

import { useState, useCallback } from 'react';
import { chromeBookmarkService } from '../services/chromeBookmarkService';

export interface UndoFrame {
  id: string;
  type: 'reorganize' | 'move' | 'delete' | 'create' | 'update';
  timestamp: Date;
  description: string;
  previousState: any;
  newState: any;
  affectedBookmarks: string[];
}

export interface UseUndoRedoReturn {
  undoStack: UndoFrame[];
  redoStack: UndoFrame[];
  canUndo: boolean;
  canRedo: boolean;
  performUndo: () => Promise<void>;
  performRedo: () => Promise<void>;
  addUndoFrame: (frame: Omit<UndoFrame, 'id' | 'timestamp'>) => void;
  clearHistory: () => void;
  getOperationHistory: () => UndoFrame[];
}

export const useUndoRedo = (): UseUndoRedoReturn => {
  const [undoStack, setUndoStack] = useState<UndoFrame[]>([]);
  const [redoStack, setRedoStack] = useState<UndoFrame[]>([]);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  const generateId = (): string => {
    return `undo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const addUndoFrame = useCallback((frame: Omit<UndoFrame, 'id' | 'timestamp'>) => {
    const newFrame: UndoFrame = {
      ...frame,
      id: generateId(),
      timestamp: new Date(),
    };

    setUndoStack(prev => [newFrame, ...prev.slice(0, 49)]); // Keep last 50 operations
    setRedoStack([]); // Clear redo stack when new operation is added
  }, []);

  const performUndo = useCallback(async (): Promise<void> => {
    if (!canUndo) return;

    const startTime = performance.now();
    
    try {
      const frameToUndo = undoStack[0];
      
      // Apply the previous state
      await applyUndoFrame(frameToUndo);
      
      // Move from undo to redo stack
      setUndoStack(prev => prev.slice(1));
      setRedoStack(prev => [frameToUndo, ...prev]);
      
      const endTime = performance.now();
      console.log(`Undo completed in ${endTime - startTime}ms`);
      
    } catch (error) {
      console.error('Undo operation failed:', error);
    }
  }, [canUndo, undoStack]);

  const performRedo = useCallback(async (): Promise<void> => {
    if (!canRedo) return;

    const startTime = performance.now();
    
    try {
      const frameToRedo = redoStack[0];
      
      // Apply the new state
      await applyRedoFrame(frameToRedo);
      
      // Move from redo to undo stack
      setRedoStack(prev => prev.slice(1));
      setUndoStack(prev => [frameToRedo, ...prev]);
      
      const endTime = performance.now();
      console.log(`Redo completed in ${endTime - startTime}ms`);
      
    } catch (error) {
      console.error('Redo operation failed:', error);
    }
  }, [canRedo, redoStack]);

  const applyUndoFrame = async (frame: UndoFrame): Promise<void> => {
    switch (frame.type) {
      case 'reorganize':
        await applyReorganizeUndo(frame);
        break;
      case 'move':
        await applyMoveUndo(frame);
        break;
      case 'delete':
        await applyDeleteUndo(frame);
        break;
      case 'create':
        await applyCreateUndo(frame);
        break;
      case 'update':
        await applyUpdateUndo(frame);
        break;
      default:
        console.warn('Unknown undo operation type:', frame.type);
    }
  };

  const applyRedoFrame = async (frame: UndoFrame): Promise<void> => {
    switch (frame.type) {
      case 'reorganize':
        await applyReorganizeRedo(frame);
        break;
      case 'move':
        await applyMoveRedo(frame);
        break;
      case 'delete':
        await applyDeleteRedo(frame);
        break;
      case 'create':
        await applyCreateRedo(frame);
        break;
      case 'update':
        await applyUpdateRedo(frame);
        break;
      default:
        console.warn('Unknown redo operation type:', frame.type);
    }
  };

  // Undo operations
  const applyReorganizeUndo = async (frame: UndoFrame): Promise<void> => {
    const { previousState } = frame;
    
    // Restore previous bookmark organization
    for (const bookmarkId of frame.affectedBookmarks) {
      const bookmark = previousState.bookmarks?.find((b: any) => b.id === bookmarkId);
      if (bookmark) {
        await chromeBookmarkService.moveBookmark(bookmarkId, {
          parentId: bookmark.parentId,
          index: bookmark.index
        });
      }
    }
  };

  const applyMoveUndo = async (frame: UndoFrame): Promise<void> => {
    const { previousState } = frame;
    
    for (const bookmarkId of frame.affectedBookmarks) {
      const bookmark = previousState.bookmarks?.find((b: any) => b.id === bookmarkId);
      if (bookmark) {
        await chromeBookmarkService.moveBookmark(bookmarkId, {
          parentId: bookmark.parentId,
          index: bookmark.index
        });
      }
    }
  };

  const applyDeleteUndo = async (frame: UndoFrame): Promise<void> => {
    const { newState } = frame;
    
    // Recreate deleted bookmarks
    for (const bookmark of newState.deletedBookmarks || []) {
      await chromeBookmarkService.createBookmark({
        parentId: bookmark.parentId,
        title: bookmark.title,
        url: bookmark.url,
        index: bookmark.index
      });
    }
  };

  const applyCreateUndo = async (frame: UndoFrame): Promise<void> => {
    const { newState } = frame;
    
    // Delete created bookmarks
    for (const bookmarkId of frame.affectedBookmarks) {
      await chromeBookmarkService.removeBookmark(bookmarkId);
    }
  };

  const applyUpdateUndo = async (frame: UndoFrame): Promise<void> => {
    const { previousState } = frame;
    
    // Restore previous bookmark properties
    for (const bookmark of previousState.bookmarks || []) {
      await chromeBookmarkService.updateBookmark(bookmark.id, {
        title: bookmark.title,
        url: bookmark.url
      });
    }
  };

  // Redo operations
  const applyReorganizeRedo = async (frame: UndoFrame): Promise<void> => {
    const { newState } = frame;
    
    // Apply the reorganization
    for (const bookmarkId of frame.affectedBookmarks) {
      const bookmark = newState.bookmarks?.find((b: any) => b.id === bookmarkId);
      if (bookmark) {
        await chromeBookmarkService.moveBookmark(bookmarkId, {
          parentId: bookmark.parentId,
          index: bookmark.index
        });
      }
    }
  };

  const applyMoveRedo = async (frame: UndoFrame): Promise<void> => {
    const { newState } = frame;
    
    for (const bookmarkId of frame.affectedBookmarks) {
      const bookmark = newState.bookmarks?.find((b: any) => b.id === bookmarkId);
      if (bookmark) {
        await chromeBookmarkService.moveBookmark(bookmarkId, {
          parentId: bookmark.parentId,
          index: bookmark.index
        });
      }
    }
  };

  const applyDeleteRedo = async (frame: UndoFrame): Promise<void> => {
    // Delete bookmarks again
    for (const bookmarkId of frame.affectedBookmarks) {
      await chromeBookmarkService.removeBookmark(bookmarkId);
    }
  };

  const applyCreateRedo = async (frame: UndoFrame): Promise<void> => {
    const { newState } = frame;
    
    // Recreate bookmarks
    for (const bookmark of newState.createdBookmarks || []) {
      await chromeBookmarkService.createBookmark({
        parentId: bookmark.parentId,
        title: bookmark.title,
        url: bookmark.url,
        index: bookmark.index
      });
    }
  };

  const applyUpdateRedo = async (frame: UndoFrame): Promise<void> => {
    const { newState } = frame;
    
    // Apply the updated properties
    for (const bookmark of newState.bookmarks || []) {
      await chromeBookmarkService.updateBookmark(bookmark.id, {
        title: bookmark.title,
        url: bookmark.url
      });
    }
  };

  const clearHistory = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  const getOperationHistory = useCallback((): UndoFrame[] => {
    return [...undoStack, ...redoStack].sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
  }, [undoStack, redoStack]);

  return {
    undoStack,
    redoStack,
    canUndo,
    canRedo,
    performUndo,
    performRedo,
    addUndoFrame,
    clearHistory,
    getOperationHistory,
  };
};
