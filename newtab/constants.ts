/**
 * Application Constants
 * 
 * Centralized configuration for the Bookmark Organizer application
 */

// AI Configuration
export const AI_CONFIG = {
  // Default AI model configuration
  DEFAULT_MODEL: 'gemini-2.5-pro',
  DEFAULT_TEMPERATURE: 1,
  
  // API Key configuration
  // In production, this should be set via environment variables
  API_KEY_ENV_VAR: 'GOOGLE_AI_API_KEY',
  
  // Fallback API key (for development only)
  // WARNING: Never commit real API keys to version control
  FALLBACK_API_KEY: 'AIzaSyCRdGHZxIoboGZXwwxMXlQsxPAnz_RJTik',
} as const;

// Application Settings
export const APP_CONFIG = {
  // Maximum number of bookmarks to analyze at once
  MAX_BOOKMARKS_ANALYSIS: 100,
  
  // Maximum number of search results to display
  MAX_SEARCH_RESULTS: 50,
  
  // Cache settings
  ANALYSIS_CACHE_SIZE: 1000,
  CACHE_EXPIRY_HOURS: 24,
} as const;

// UI Configuration
export const UI_CONFIG = {
  // Animation durations (in milliseconds)
  ANIMATION_DURATION: 200,
  LOADING_DELAY: 500,
  
  // Responsive breakpoints
  MOBILE_BREAKPOINT: 684,
  TABLET_BREAKPOINT: 1024,
} as const;