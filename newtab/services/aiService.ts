/**
 * AI Service for Bookmark Organization
 * 
 * This service provides AI-powered functionality for:
 * - Bookmark categorization and tagging
 * - Smart bookmark suggestions
 * - Duplicate detection
 * - Content analysis and organization
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

export interface BookmarkAnalysis {
  category: string;
  tags: string[];
  priority: 'high' | 'medium' | 'low';
  duplicate?: boolean;
  summary?: string;
  suggestedFolder?: string;
}

export interface AIConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
}

export class AIService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(config: AIConfig) {
    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE
      }
    ];
    this.genAI = new GoogleGenerativeAI(config.apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: config.model || 'gemini-pro',
      safetySettings,
      generationConfig: {
        temperature: config.temperature || 0.7,
        topK: 40,
        topP: 0.95,
      }
    });
  }

  // Attempts to extract a JSON object from a model response by:
  // 1) removing code fences, 2) stripping trailing commas, 3) slicing to outermost { ... }
  private extractJsonObject(text: string): string | null {
    if (!text) return null;
    // Remove common code fences
    let cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    // If the response still contains fences, try to capture the first fenced block
    const fencedMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fencedMatch && fencedMatch[1]) {
      cleaned = fencedMatch[1].trim();
    }

    // If it looks like JSON already, try parse directly (after removing trailing commas)
    const stripTrailingCommas = (s: string) => s.replace(/,\s*([}\]])/g, '$1');
    const tryParse = (s: string): any => {
      try {
        return JSON.parse(stripTrailingCommas(s));
      } catch {
        return undefined;
      }
    };

    if (cleaned.startsWith('{') && cleaned.includes('}')) {
      const parsed = tryParse(cleaned);
      if (parsed) return JSON.stringify(parsed);
    }

    // Fallback: slice from first { to last }
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const candidate = cleaned.slice(firstBrace, lastBrace + 1);
      const parsed = tryParse(candidate);
      if (parsed) return JSON.stringify(parsed);
    }

    // As a last resort, find the largest balanced braces region (shallow scan)
    const stack: number[] = [];
    let bestStart = -1;
    let bestEnd = -1;
    for (let i = 0; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (ch === '{') {
        stack.push(i);
        if (stack.length === 1 && bestStart === -1) bestStart = i;
      } else if (ch === '}') {
        if (stack.length) {
          stack.pop();
          if (stack.length === 0) {
            bestEnd = i;
          }
        }
      }
    }
    if (bestStart !== -1 && bestEnd !== -1) {
      const candidate = cleaned.slice(bestStart, bestEnd + 1);
      const parsed = tryParse(candidate);
      if (parsed) return JSON.stringify(parsed);
    }

    return null;
  }

  // Ensures every input bookmark appears exactly once in the output.
  // Adds any missing bookmarks into the "Other" category.
  private normalizeCategorizationOutput(
    output: unknown,
    bookmarks: Array<{ title: string; url: string }>
  ): Record<string, Record<string, string>> {
    const result: Record<string, Record<string, string>> = {};

    // Accept only shape: { Category: { Title: URL } }
    if (output && typeof output === 'object' && !Array.isArray(output)) {
      Object.entries(output as Record<string, unknown>).forEach(([category, mapping]) => {
        if (mapping && typeof mapping === 'object' && !Array.isArray(mapping)) {
          const validMap = Object.entries(mapping as Record<string, unknown>)
            .filter(([title, url]) => typeof title === 'string' && typeof url === 'string')
            .reduce<Record<string, string>>((acc, [title, url]) => {
              acc[title] = url as string;
              return acc;
            }, {});
          if (Object.keys(validMap).length > 0) {
            result[category] = validMap;
          }
        }
      });
    }

    // Ensure Other bucket exists
    if (!result['Other']) result['Other'] = {};

    // Track presence by URL (more robust than title) and fallback to title
    const presentByUrl = new Set<string>();
    const presentByTitle = new Set<string>();
    for (const mapping of Object.values(result)) {
      for (const [title, url] of Object.entries(mapping)) {
        if (url) presentByUrl.add(url);
        if (title) presentByTitle.add(title);
      }
    }

    // Add any missing bookmarks to Other
    for (const b of bookmarks) {
      if (!presentByUrl.has(b.url) && !presentByTitle.has(b.title)) {
        result['Other'][b.title] = b.url;
      }
    }

    return result;
  }

  /**
   * Analyze a bookmark and provide categorization and metadata
   */
  async analyzeBookmark(bookmark: { title: string; url: string }): Promise<BookmarkAnalysis> {
    try {
      const prompt = `
        Analyze this bookmark and provide:
        1. Category (e.g., "Development", "News", "Entertainment", "Education", "Shopping", "Social Media")
        2. 3-5 relevant tags
        3. Priority level (high/medium/low) based on importance and relevance
        4. Brief summary of what this bookmark is about
        5. Suggested folder name for organization
        
        Bookmark: "${bookmark.title}" - ${bookmark.url}
        
        Respond in JSON format:
        {
          "category": "string",
          "tags": ["tag1", "tag2", "tag3"],
          "priority": "high|medium|low",
          "summary": "brief description",
          "suggestedFolder": "folder name"
        }
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse JSON response
      const analysis = JSON.parse(text);
      return analysis as BookmarkAnalysis;
    } catch (error) {
      console.error('Error analyzing bookmark:', error);
      return {
        category: 'Uncategorized',
        tags: [],
        priority: 'medium',
        summary: 'Unable to analyze',
        suggestedFolder: 'General'
      };
    }
  }

  /**
   * Detect potential duplicate bookmarks
   */
  async detectDuplicates(bookmarks: Array<{ title: string; url: string }>): Promise<Array<{ index: number; duplicates: number[] }>> {
    try {
      const prompt = `
        Analyze these bookmarks and identify potential duplicates based on:
        1. Similar URLs (same domain/path)
        2. Similar titles
        3. Same content but different URLs
        
        Bookmarks:
        ${bookmarks.map((b, i) => `${i}: "${b.title}" - ${b.url}`).join('\n')}
        
        Return JSON array of duplicate groups:
        [{"index": 0, "duplicates": [1, 2]}]
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return JSON.parse(text);
    } catch (error) {
      console.error('Error detecting duplicates:', error);
      return [];
    }
  }

  /**
   * Generate smart bookmark suggestions based on existing bookmarks
   */
  async generateSuggestions(existingBookmarks: Array<{ title: string; url: string }>): Promise<string[]> {
    try {
      const prompt = `
        Based on these existing bookmarks, suggest 5-10 related bookmarks that might be useful:
        
        Existing bookmarks:
        ${existingBookmarks.map(b => `- "${b.title}" (${b.url})`).join('\n')}
        
        Return JSON array of suggested bookmark titles:
        ["suggestion 1", "suggestion 2", ...]
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return JSON.parse(text);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      return [];
    }
  }

  /**
   * Organize bookmarks into smart folders
   */
  async organizeBookmarks(bookmarks: Array<{ title: string; url: string }>): Promise<Record<string, number[]>> {
    try {
      const prompt = `
        Organize these bookmarks into logical folders. Group related bookmarks together.
        
        Bookmarks:
        ${bookmarks.map((b, i) => `${i}: "${b.title}" - ${b.url}`).join('\n')}
        
        Return JSON object with folder names as keys and arrays of bookmark indices as values:
        {
          "Development": [0, 2, 5],
          "News": [1, 3],
          "Entertainment": [4, 6]
        }
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return JSON.parse(text);
    } catch (error) {
      console.error('Error organizing bookmarks:', error);
      return { 'General': bookmarks.map((_, i) => i) };
    }
  }

  /**
   * Search bookmarks using natural language
   */
  async searchBookmarks(query: string, bookmarks: Array<{ title: string; url: string }>): Promise<number[]> {
    try {
      const prompt = `
        Find bookmarks that match this search query: "${query}"
        
        Bookmarks to search:
        ${bookmarks.map((b, i) => `${i}: "${b.title}" - ${b.url}`).join('\n')}
        
        Return JSON array of matching bookmark indices:
        [0, 2, 5]
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return JSON.parse(text);
    } catch (error) {
      console.error('Error searching bookmarks:', error);
      return [];
    }
  }

  /**
   * Categorize bookmarks into thematic folders using the specified format
   */
  async categorizeBookmarks(bookmarks: Array<{ title: string; url: string }>): Promise<Record<string, Record<string, string>>> {
    try {
      const inputJson = JSON.stringify(bookmarks, null, 2);
      const prompt = `
        You are an intelligent bookmark organizer.
        Classify EACH of the following bookmarks into a thematic folder based on domain and/or keywords.
        If a bookmark does not fit any clear category, put it under "Other".

        Strict rules:
        - Use clear categories like: "News", "Music", "Entertainment", "Programming", "AI", "Search", "Games", "Education", "Business", "Technology", "Health", "Shopping", etc.
        - If domain is AI-related (openai, chatgpt, perplexity, huggingface), use "AI".
        - If it's music related (spotify, letras.mus.br, youtube-music), use "Music".
        - If it's a game site (dofus, tibia, steam, minecraft), use "Games".
        - If it's a search engine (google, bing, yahoo), use "Search".
        - Include EVERY input bookmark exactly once in the output.
        - Use the EXACT title strings provided in the input as object keys.
        - Return ONLY a JSON object. Do NOT include any explanation or markdown fences.
        - Do NOT use trailing commas.

        Input bookmarks (JSON array):
        ${inputJson}

        Output JSON shape:
        {
          "Category": {
            "Exact Input Title": "URL"
          },
          "Other": {
            "...": "..."
          }
        }

        Answer only with valid JSON. Do not include explanations or any extra text.
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Extract/clean JSON and parse
      const jsonCandidate = this.extractJsonObject(text);
      if (!jsonCandidate) {
        throw new Error('Model did not return valid JSON');
      }
      const parsed = JSON.parse(jsonCandidate) as unknown;

      // Normalize and ensure all bookmarks are present
      return this.normalizeCategorizationOutput(parsed, bookmarks);
    } catch (error) {
      console.error('Error categorizing bookmarks:', error);
      // Return all bookmarks in "Other" category as fallback
      const fallback: Record<string, Record<string, string>> = {
        "Other": {}
      };
      bookmarks.forEach(bookmark => {
        fallback["Other"][bookmark.title] = bookmark.url;
      });
      return fallback;
    }
  }
}

// Singleton instance
let aiServiceInstance: AIService | null = null;

export const getAIService = (config?: AIConfig): AIService => {
  if (!aiServiceInstance && config) {
    aiServiceInstance = new AIService(config);
  }
  
  if (!aiServiceInstance) {
    throw new Error('AI Service not initialized. Please provide configuration.');
  }
  
  return aiServiceInstance;
};

export const initializeAI = (config: AIConfig): AIService => {
  aiServiceInstance = new AIService(config);
  return aiServiceInstance;
};
