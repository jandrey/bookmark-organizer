/**
 * AI Hooks for Bookmark Organization
 * 
 * Custom React hooks that provide AI functionality integration
 * with proper state management and error handling.
 */

import { useState, useCallback, useEffect } from 'react';
import { AIService } from '../services/aiService';
import type { BookmarkAnalysis, AIConfig } from '../services/aiService';

export interface UseAIState {
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
}

export interface UseAIActions {
  analyzeBookmark: (bookmark: { title: string; url: string }) => Promise<BookmarkAnalysis>;
  detectDuplicates: (bookmarks: Array<{ title: string; url: string }>) => Promise<Array<{ index: number; duplicates: number[] }>>;
  generateSuggestions: (bookmarks: Array<{ title: string; url: string }>) => Promise<string[]>;
  organizeBookmarks: (bookmarks: Array<{ title: string; url: string }>) => Promise<Record<string, number[]>>;
  searchBookmarks: (query: string, bookmarks: Array<{ title: string; url: string }>) => Promise<number[]>;
  categorizeBookmarks: (bookmarks: Array<{ title: string; url: string }>) => Promise<Record<string, Record<string, string>>>;
  initialize: (config: AIConfig) => Promise<void>;
}

/**
 * Main AI hook that provides AI functionality for bookmark management
 */
export const useAI = (): UseAIState & UseAIActions => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [aiService, setAiService] = useState<AIService | null>(null);

  const initialize = useCallback(async (config: AIConfig) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const service = new AIService(config);
      setAiService(service);
      setIsInitialized(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize AI service');
      setIsInitialized(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const analyzeBookmark = useCallback(async (bookmark: { title: string; url: string }): Promise<BookmarkAnalysis> => {
    if (!aiService) {
      throw new Error('AI service not initialized');
    }

    try {
      setIsLoading(true);
      setError(null);
      return await aiService.analyzeBookmark(bookmark);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze bookmark';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [aiService]);

  const detectDuplicates = useCallback(async (bookmarks: Array<{ title: string; url: string }>) => {
    if (!aiService) {
      throw new Error('AI service not initialized');
    }

    try {
      setIsLoading(true);
      setError(null);
      return await aiService.detectDuplicates(bookmarks);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to detect duplicates';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [aiService]);

  const generateSuggestions = useCallback(async (bookmarks: Array<{ title: string; url: string }>) => {
    if (!aiService) {
      throw new Error('AI service not initialized');
    }

    try {
      setIsLoading(true);
      setError(null);
      return await aiService.generateSuggestions(bookmarks);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate suggestions';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [aiService]);

  const organizeBookmarks = useCallback(async (bookmarks: Array<{ title: string; url: string }>) => {
    if (!aiService) {
      throw new Error('AI service not initialized');
    }

    try {
      setIsLoading(true);
      setError(null);
      return await aiService.organizeBookmarks(bookmarks);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to organize bookmarks';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [aiService]);

  const searchBookmarks = useCallback(async (query: string, bookmarks: Array<{ title: string; url: string }>) => {
    if (!aiService) {
      throw new Error('AI service not initialized');
    }

    try {
      setIsLoading(true);
      setError(null);
      return await aiService.searchBookmarks(query, bookmarks);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search bookmarks';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [aiService]);

  const categorizeBookmarks = useCallback(async (bookmarks: Array<{ title: string; url: string }>) => {
    if (!aiService) {
      throw new Error('AI service not initialized');
    }
    try {
      setIsLoading(true);
      setError(null);
      return await aiService.categorizeBookmarks(bookmarks);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to categorize bookmarks';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [aiService]);

  return {
    isLoading,
    error,
    isInitialized,
    analyzeBookmark,
    detectDuplicates,
    generateSuggestions,
    organizeBookmarks,
    searchBookmarks,
    categorizeBookmarks,
    initialize,
  };
};

/**
 * Hook for bookmark analysis with caching
 */
export const useBookmarkAnalysis = () => {
  const [analysisCache, setAnalysisCache] = useState<Map<string, BookmarkAnalysis>>(new Map());
  const { analyzeBookmark, isLoading, error } = useAI();

  const getAnalysis = useCallback(async (bookmark: { title: string; url: string }) => {
    const cacheKey = `${bookmark.title}-${bookmark.url}`;
    
    if (analysisCache.has(cacheKey)) {
      return analysisCache.get(cacheKey)!;
    }

    const analysis = await analyzeBookmark(bookmark);
    setAnalysisCache(prev => new Map(prev).set(cacheKey, analysis));
    return analysis;
  }, [analyzeBookmark, analysisCache]);

  const clearCache = useCallback(() => {
    setAnalysisCache(new Map());
  }, []);

  return {
    getAnalysis,
    clearCache,
    isLoading,
    error,
  };
};

/**
 * Hook for AI-powered bookmark search
 */
export const useAISearch = () => {
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { searchBookmarks, isLoading, error } = useAI();

  const performSearch = useCallback(async (query: string, bookmarks: Array<{ title: string; url: string }>) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchQuery(query);
    const results = await searchBookmarks(query, bookmarks);
    setSearchResults(results);
  }, [searchBookmarks]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  return {
    searchResults,
    searchQuery,
    performSearch,
    clearSearch,
    isLoading,
    error,
  };
};

/**
 * Hook for AI-powered bookmark organization
 */
export const useAIOrganization = () => {
  const [organizedFolders, setOrganizedFolders] = useState<Record<string, number[]>>({});
  const { organizeBookmarks, isLoading, error } = useAI();

  const organize = useCallback(async (bookmarks: Array<{ title: string; url: string }>) => {
    const folders = await organizeBookmarks(bookmarks);
    setOrganizedFolders(folders);
    return folders;
  }, [organizeBookmarks]);

  const clearOrganization = useCallback(() => {
    setOrganizedFolders({});
  }, []);

  return {
    organizedFolders,
    organize,
    clearOrganization,
    isLoading,
    error,
  };
};
