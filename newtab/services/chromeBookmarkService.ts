/**
 * Chrome Bookmark Service
 * 
 * Provides a comprehensive interface for Chrome bookmark operations
 * with proper error handling and type safety.
 */

export interface ChromeBookmark {
  id: string;
  parentId?: string;
  index?: number;
  url?: string;
  title: string;
  dateAdded?: number;
  dateGroupModified?: number;
  children?: ChromeBookmark[];
}

export interface BookmarkTreeNode {
  id: string;
  parentId?: string;
  index?: number;
  url?: string;
  title: string;
  dateAdded?: number;
  dateGroupModified?: number;
  children?: BookmarkTreeNode[];
}

export interface BookmarkSearchResult {
  bookmarks: ChromeBookmark[];
  totalCount: number;
  searchTime: number;
}

export interface BookmarkStats {
  totalBookmarks: number;
  totalFolders: number;
  totalUrls: number;
  averageDepth: number;
  lastModified: Date;
}

export class ChromeBookmarkService {
  private static instance: ChromeBookmarkService;
  
  public static getInstance(): ChromeBookmarkService {
    if (!ChromeBookmarkService.instance) {
      ChromeBookmarkService.instance = new ChromeBookmarkService();
    }
    return ChromeBookmarkService.instance;
  }

  /**
   * Get all bookmarks in a tree structure
   */
  async getBookmarkTree(): Promise<BookmarkTreeNode[]> {
    try {
      const tree = await chrome.bookmarks.getTree();
      return tree;
    } catch (error) {
      console.error('Failed to get bookmark tree:', error);
      throw new Error('Unable to retrieve bookmarks');
    }
  }

  /**
   * Get a subtree starting at the specified node ID
   */
  async getSubTree(id: string): Promise<BookmarkTreeNode[]> {
    try {
      const subtree = await chrome.bookmarks.getSubTree(id);
      return subtree;
    } catch (error) {
      console.error('Failed to get bookmark subtree:', error);
      throw new Error('Unable to retrieve bookmark subtree');
    }
  }

  /**
   * Get direct children for a specified parent ID
   */
  async getChildren(parentId: string): Promise<BookmarkTreeNode[]> {
    try {
      const children = await chrome.bookmarks.getChildren(parentId);
      return children;
    } catch (error) {
      console.error('Failed to get bookmark children:', error);
      throw new Error('Unable to retrieve bookmark children');
    }
  }

  /**
   * Get all bookmarks as a flat array
   */
  async getAllBookmarks(): Promise<ChromeBookmark[]> {
    try {
      const tree = await this.getBookmarkTree();
      return this.flattenBookmarkTree(tree);
    } catch (error) {
      console.error('Failed to get all bookmarks:', error);
      throw new Error('Unable to retrieve bookmarks');
    }
  }

  /**
   * Search bookmarks by query
   */
  async searchBookmarks(query: string): Promise<BookmarkSearchResult> {
    const startTime = performance.now();
    
    try {
      const results = await chrome.bookmarks.search(query);
      const searchTime = performance.now() - startTime;
      
      return {
        bookmarks: results,
        totalCount: results.length,
        searchTime
      };
    } catch (error) {
      console.error('Failed to search bookmarks:', error);
      throw new Error('Unable to search bookmarks');
    }
  }

  /**
   * Create a new bookmark
   */
  async createBookmark(bookmark: {
    parentId?: string;
    title: string;
    url?: string;
    index?: number;
  }): Promise<ChromeBookmark> {
    try {
      const created = await chrome.bookmarks.create(bookmark);
      return created;
    } catch (error) {
      console.error('Failed to create bookmark:', error);
      throw new Error('Unable to create bookmark');
    }
  }

  /**
   * Update an existing bookmark
   */
  async updateBookmark(id: string, changes: {
    title?: string;
    url?: string;
  }): Promise<ChromeBookmark> {
    try {
      const updated = await chrome.bookmarks.update(id, changes);
      return updated;
    } catch (error) {
      console.error('Failed to update bookmark:', error);
      throw new Error('Unable to update bookmark');
    }
  }

  /**
   * Move a bookmark to a new location
   */
  async moveBookmark(id: string, destination: {
    parentId?: string;
    index?: number;
  }): Promise<ChromeBookmark> {
    try {
      const moved = await chrome.bookmarks.move(id, destination);
      return moved;
    } catch (error) {
      console.error('Failed to move bookmark:', error);
      throw new Error('Unable to move bookmark');
    }
  }

  /**
   * Remove a bookmark
   */
  async removeBookmark(id: string): Promise<void> {
    try {
      await chrome.bookmarks.remove(id);
    } catch (error) {
      console.error('Failed to remove bookmark:', error);
      throw new Error('Unable to remove bookmark');
    }
  }

  /**
   * Remove a bookmark folder and all its children
   */
  async removeBookmarkTree(id: string): Promise<void> {
    try {
      await chrome.bookmarks.removeTree(id);
    } catch (error) {
      console.error('Failed to remove bookmark tree:', error);
      throw new Error('Unable to remove bookmark folder');
    }
  }

  /**
   * Get bookmark statistics
   */
  async getBookmarkStats(): Promise<BookmarkStats> {
    try {
      const allBookmarks = await this.getAllBookmarks();
      const folders = allBookmarks.filter(b => !b.url);
      const urls = allBookmarks.filter(b => b.url);
      
      const depths = this.calculateDepths(allBookmarks);
      const averageDepth = depths.length > 0 
        ? depths.reduce((a, b) => a + b, 0) / depths.length 
        : 0;

      const lastModified = new Date(Math.max(
        ...allBookmarks.map(b => b.dateGroupModified || 0)
      ));

      return {
        totalBookmarks: allBookmarks.length,
        totalFolders: folders.length,
        totalUrls: urls.length,
        averageDepth,
        lastModified
      };
    } catch (error) {
      console.error('Failed to get bookmark stats:', error);
      throw new Error('Unable to calculate bookmark statistics');
    }
  }

  /**
   * Get bookmarks from open tabs
   */
  async getOpenTabs(): Promise<ChromeBookmark[]> {
    try {
      const tabs = await chrome.tabs.query({});

      
      // return only tabs with url that starts with http
      return tabs.filter(tab => tab.url?.startsWith('http')).map(tab => ({
        id: `tab_${tab.id}`,
        parentId: `tab_${tab.id}`,
        syncing: false,
        title: tab.title || 'Untitled',
        url: tab.url,
        dateAdded: Date.now()
      }));
    } catch (error) {
      console.error('Failed to get open tabs:', error);
      throw new Error('Unable to retrieve open tabs');
    }
  }

  /**
   * Create bookmark from current tab
   */
  async bookmarkCurrentTab(): Promise<ChromeBookmark> {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0) {
        throw new Error('No active tab found');
      }

      const tab = tabs[0];
      if (!tab.url || tab.url.startsWith('chrome://')) {
        throw new Error('Cannot bookmark this page');
      }

      return await this.createBookmark({
        title: tab.title || 'Untitled',
        url: tab.url
      });
    } catch (error) {
      console.error('Failed to bookmark current tab:', error);
      throw new Error('Unable to bookmark current tab');
    }
  }

  /**
   * Check if a URL is accessible (not a dead link)
   */
  async checkUrlHealth(url: string): Promise<{
    isAccessible: boolean;
    statusCode?: number;
    error?: string;
  }> {
    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        mode: 'no-cors'
      });
      
      return {
        isAccessible: true,
        statusCode: response.status
      };
    } catch (error) {
      return {
        isAccessible: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Find potential duplicate bookmarks
   */
  async findDuplicates(): Promise<Array<{
    group: ChromeBookmark[];
    similarity: number;
  }>> {
    try {
      const allBookmarks = await this.getAllBookmarks();
      const urlBookmarks = allBookmarks.filter(b => b.url);
      
      const duplicates: Array<{
        group: ChromeBookmark[];
        similarity: number;
      }> = [];

      for (let i = 0; i < urlBookmarks.length; i++) {
        for (let j = i + 1; j < urlBookmarks.length; j++) {
          const bookmark1 = urlBookmarks[i];
          const bookmark2 = urlBookmarks[j];
          
          const similarity = this.calculateSimilarity(bookmark1, bookmark2);
          
          if (similarity > 0.8) { // 80% similarity threshold
            const existingGroup = duplicates.find(d => 
              d.group.some(b => b.id === bookmark1.id || b.id === bookmark2.id)
            );
            
            if (existingGroup) {
              if (!existingGroup.group.some(b => b.id === bookmark1.id)) {
                existingGroup.group.push(bookmark1);
              }
              if (!existingGroup.group.some(b => b.id === bookmark2.id)) {
                existingGroup.group.push(bookmark2);
              }
            } else {
              duplicates.push({
                group: [bookmark1, bookmark2],
                similarity
              });
            }
          }
        }
      }

      return duplicates;
    } catch (error) {
      console.error('Failed to find duplicates:', error);
      throw new Error('Unable to find duplicate bookmarks');
    }
  }

  /**
   * Flatten bookmark tree to array
   */
  private flattenBookmarkTree(tree: BookmarkTreeNode[]): ChromeBookmark[] {
    const result: ChromeBookmark[] = [];
    
    const flatten = (nodes: BookmarkTreeNode[]) => {
      for (const node of nodes) {
        result.push(node);
        if (node.children) {
          flatten(node.children);
        }
      }
    };
    
    flatten(tree);
    return result;
  }

  /**
   * Calculate bookmark depths
   */
  private calculateDepths(bookmarks: ChromeBookmark[]): number[] {
    const depths: number[] = [];
    
    const calculateDepth = (bookmark: ChromeBookmark, depth: number = 0) => {
      depths.push(depth);
      if (bookmark.children) {
        for (const child of bookmark.children) {
          calculateDepth(child, depth + 1);
        }
      }
    };
    
    for (const bookmark of bookmarks) {
      calculateDepth(bookmark);
    }
    
    return depths;
  }

  /**
   * Calculate similarity between two bookmarks
   */
  private calculateSimilarity(bookmark1: ChromeBookmark, bookmark2: ChromeBookmark): number {
    if (!bookmark1.url || !bookmark2.url) return 0;
    
    // URL similarity
    const url1 = bookmark1.url.toLowerCase();
    const url2 = bookmark2.url.toLowerCase();
    const urlSimilarity = this.calculateStringSimilarity(url1, url2);
    
    // Title similarity
    const title1 = bookmark1.title.toLowerCase();
    const title2 = bookmark2.title.toLowerCase();
    const titleSimilarity = this.calculateStringSimilarity(title1, title2);
    
    // Weighted average (URL is more important)
    return (urlSimilarity * 0.7) + (titleSimilarity * 0.3);
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1;
    
    const distance = this.levenshteinDistance(str1, str2);
    return 1 - (distance / maxLength);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(null)
    );
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + cost
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}

// Export singleton instance
export const chromeBookmarkService = ChromeBookmarkService.getInstance();
