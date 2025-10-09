/**
 * Shared Types for Bookmark Organizer
 * 
 * Centralized type definitions to avoid circular dependencies
 */

export interface BookmarkNode {
  id: string;
  title: string;
  url?: string;
  children?: BookmarkNode[];
  parentId?: string;
  index?: number;
  dateAdded?: number;
  dateGroupModified?: number;
}

export interface BookmarkCluster {
  id: string;
  title: string;
  description: string;
  itemCount: number;
  bookmarks: Array<{ id: string; title: string; url: string }>;
  confidence: number;
}

export interface QueueItem {
  id: string;
  title: string;
  url: string;
  tags: string[];
  timeAdded: Date;
  urgency: 'high' | 'medium' | 'low';
  isRead: boolean;
  isArchived: boolean;
  priority: number;
}

export interface HealthIssue {
  id: string;
  type: 'duplicate' | 'dead_link' | 'bad_title' | 'missing_tags';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  affectedBookmarks: string[];
  fixAction?: string;
}