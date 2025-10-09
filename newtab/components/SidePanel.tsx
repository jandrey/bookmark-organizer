/**
 * Side Panel Component for Bookmark Management
 * 
 * Features:
 * - Three main tabs: Sessions, Queue, Health
 * - AI-powered bookmark organization
 * - Smart queue management
 * - Health monitoring and fixes
 * - Undo/redo functionality
 */

import React, { useState, useEffect } from 'react';
import SessionsTab from './SessionsTab';
import QueueTab from './QueueTab';
import HealthTab from './HealthTab';
import { useUndoRedo } from '../hooks/useUndoRedo';
import type { BookmarkCluster, QueueItem, HealthIssue } from '../types';
import { chromeBookmarkService } from '../services/chromeBookmarkService';
// Force recompilation


export interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SidePanel: React.FC<SidePanelProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'sessions' | 'queue' | 'health'>('sessions');
  const [clusters, setClusters] = useState<BookmarkCluster[]>([]);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [healthIssues, setHealthIssues] = useState<HealthIssue[]>([]);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Handle navigation events from child components (e.g., SessionsTab)
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ tab: 'sessions' | 'queue' | 'health' }>;
      if (custom && custom.detail && custom.detail.tab) {
        setActiveTab(custom.detail.tab);
      }
    };
    window.addEventListener('bookmarkOrganizer:navigate', handler as EventListener);
    return () => window.removeEventListener('bookmarkOrganizer:navigate', handler as EventListener);
  }, []);

  const loadInitialData = async () => {
    try {
      // Load bookmarks from Chrome API via service
      const bookmarks = await chromeBookmarkService.getBookmarkTree();
      console.log('Loaded bookmarks:', bookmarks);
      
      // Initialize with mock data for demo
      initializeMockData();
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
      initializeMockData();
    }
  };

  const initializeMockData = () => {
    // Mock clusters for demo
    setClusters([
      {
        id: '1',
        title: 'Development Resources',
        description: 'React, TypeScript, and web development tutorials',
        itemCount: 12,
        bookmarks: [],
        confidence: 0.95
      },
      {
        id: '2',
        title: 'News & Articles',
        description: 'Tech news, programming articles, and industry updates',
        itemCount: 8,
        bookmarks: [],
        confidence: 0.88
      },
      {
        id: '3',
        title: 'Design Tools',
        description: 'UI/UX design resources and inspiration',
        itemCount: 6,
        bookmarks: [],
        confidence: 0.92
      }
    ]);

    // Mock queue items
    setQueueItems([
      {
        id: 'q1',
        title: 'React 18 New Features',
        url: 'https://react.dev/blog/2022/03/29/react-v18',
        tags: ['react', 'javascript', 'frontend'],
        timeAdded: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        urgency: 'high',
        isRead: false,
        isArchived: false,
        priority: 9
      },
      {
        id: 'q2',
        title: 'TypeScript Best Practices',
        url: 'https://typescriptlang.org/docs/',
        tags: ['typescript', 'javascript', 'best-practices'],
        timeAdded: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
        urgency: 'medium',
        isRead: false,
        isArchived: false,
        priority: 7
      }
    ]);

    // Mock health issues
    setHealthIssues([
      {
        id: 'h1',
        type: 'duplicate',
        severity: 'critical',
        title: 'Duplicate Bookmarks Found',
        description: '3 duplicate bookmarks detected',
        affectedBookmarks: ['b1', 'b2', 'b3'],
        fixAction: 'Merge'
      },
      {
        id: 'h2',
        type: 'dead_link',
        severity: 'warning',
        title: 'Dead Links Detected',
        description: '2 bookmarks have broken URLs',
        affectedBookmarks: ['b4', 'b5'],
        fixAction: 'Fix'
      }
    ]);
  };



  if (!isOpen) return null;

  return (
    <div className="side-panel">
      <div className="side-panel__header">
        <h2>Bookmark Manager</h2>
        <button 
          className="side-panel__close"
          onClick={onClose}
          aria-label="Close panel"
        >
          ×
        </button>
      </div>

      <div className="side-panel__tabs">
        <button
          className={`side-panel__tab ${activeTab === 'sessions' ? 'active' : ''}`}
          onClick={() => setActiveTab('sessions')}
        >
          📚 Sessions
        </button>
        <button
          className={`side-panel__tab ${activeTab === 'queue' ? 'active' : ''}`}
          onClick={() => setActiveTab('queue')}
        >
          📋 Queue
        </button>
        <button
          className={`side-panel__tab ${activeTab === 'health' ? 'active' : ''}`}
          onClick={() => setActiveTab('health')}
        >
          🔍 Health
        </button>
      </div>

      <div className="side-panel__content">
        {activeTab === 'sessions' && (
          <SessionsTab/>
        )}
        
        {activeTab === 'queue' && (
          <QueueTab
            items={queueItems}
            onUpdateItems={setQueueItems}
          />
        )}
        
        {activeTab === 'health' && (
          <HealthTab
            issues={healthIssues}
            onUpdateIssues={setHealthIssues}
          />
        )}
      </div>
    </div>
  );
};

export default SidePanel;
