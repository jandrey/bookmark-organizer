/**
 * Queue Tab Component
 * 
 * Features:
 * - Displays prioritized list of unread/saved bookmarks
 * - Each entry shows: title, tags, time added, urgency
 * - Actions: Open, Snooze, Archive
 * - Local re-ranking by relevance and recency
 */

import React, { useState, useMemo } from 'react';
import type { QueueItem } from '../types';

interface QueueTabProps {
  items: QueueItem[];
  onUpdateItems: (items: QueueItem[]) => void;
}

export const QueueTab: React.FC<QueueTabProps> = ({
  items,
  onUpdateItems,
}) => {
  const [sortBy, setSortBy] = useState<'priority' | 'time' | 'urgency'>('priority');
  const [filterBy, setFilterBy] = useState<'all' | 'unread' | 'archived'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Sort and filter items
  const sortedItems = useMemo(() => {
    let filtered = items;

    // Apply filters
    if (filterBy === 'unread') {
      filtered = filtered.filter(item => !item.isRead);
    } else if (filterBy === 'archived') {
      filtered = filtered.filter(item => item.isArchived);
    }

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          return b.priority - a.priority;
        case 'time':
          return b.timeAdded.getTime() - a.timeAdded.getTime();
        case 'urgency':
          const urgencyOrder = { high: 3, medium: 2, low: 1 };
          return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
        default:
          return 0;
      }
    });
  }, [items, sortBy, filterBy, searchQuery]);

  const handleOpenBookmark = (item: QueueItem) => {
    // Open bookmark in new tab
    chrome.tabs.create({ url: item.url });
    
    // Mark as read
    const updatedItems = items.map(i =>
      i.id === item.id ? { ...i, isRead: true } : i
    );
    onUpdateItems(updatedItems);
  };

  const handleSnoozeBookmark = (item: QueueItem, hours: number) => {
    const snoozeUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
    
    // In a real implementation, this would set a reminder
    console.log(`Snoozing ${item.title} until ${snoozeUntil}`);
    
    // Update priority (lower priority for snoozed items)
    const updatedItems = items.map(i =>
      i.id === item.id ? { ...i, priority: Math.max(1, i.priority - 2) } : i
    );
    onUpdateItems(updatedItems);
  };

  const handleArchiveBookmark = (item: QueueItem) => {
    const updatedItems = items.map(i =>
      i.id === item.id ? { ...i, isArchived: true, isRead: true } : i
    );
    onUpdateItems(updatedItems);
  };

  const handleReRank = () => {
    // Simulate AI re-ranking
    const reRankedItems = items.map(item => ({
      ...item,
      priority: Math.floor(Math.random() * 10) + 1, // Mock new priority
    }));
    onUpdateItems(reRankedItems);
  };

  const getUrgencyColor = (urgency: QueueItem['urgency']) => {
    switch (urgency) {
      case 'high': return '#ff4444';
      case 'medium': return '#ffaa00';
      case 'low': return '#44aa44';
      default: return '#888';
    }
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return 'Just now';
  };

  return (
    <div className="queue-tab">
      <div className="queue-tab__header">
        <h3>📋 Queue</h3>
        <p>Prioritized list of your bookmarks to review</p>
      </div>

      <div className="queue-tab__controls">
        <div className="queue-controls__row">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search bookmarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="queue-search-input"
            />
          </div>
          
          <div className="filter-controls">
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as any)}
              className="queue-filter-select"
            >
              <option value="all">All Items</option>
              <option value="unread">Unread Only</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <div className="queue-controls__row">
          <div className="sort-controls">
            <label>Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="queue-sort-select"
            >
              <option value="priority">Priority</option>
              <option value="time">Time Added</option>
              <option value="urgency">Urgency</option>
            </select>
          </div>
          
          <button
            onClick={handleReRank}
            className="queue-rerank-btn"
          >
            🔄 Re-rank
          </button>
        </div>
      </div>

      <div className="queue-tab__stats">
        <div className="queue-stat">
          <span className="stat-number">{sortedItems.length}</span>
          <span className="stat-label">Total Items</span>
        </div>
        <div className="queue-stat">
          <span className="stat-number">
            {sortedItems.filter(i => !i.isRead).length}
          </span>
          <span className="stat-label">Unread</span>
        </div>
        <div className="queue-stat">
          <span className="stat-number">
            {sortedItems.filter(i => i.urgency === 'high').length}
          </span>
          <span className="stat-label">High Priority</span>
        </div>
      </div>

      <div className="queue-tab__list">
        {sortedItems.length === 0 ? (
          <div className="queue-empty">
            <p>No bookmarks in queue</p>
            <p>Add bookmarks to see them here</p>
          </div>
        ) : (
          sortedItems.map(item => (
            <div
              key={item.id}
              className={`queue-item ${item.isRead ? 'read' : ''} ${item.isArchived ? 'archived' : ''}`}
            >
              <div className="queue-item__main">
                <div className="queue-item__header">
                  <h4 className="queue-item__title">{item.title}</h4>
                  <div className="queue-item__meta">
                    <span
                      className="urgency-badge"
                      style={{ backgroundColor: getUrgencyColor(item.urgency) }}
                    >
                      {item.urgency}
                    </span>
                    <span className="priority-badge">
                      P{item.priority}
                    </span>
                    <span className="time-added">
                      {getTimeAgo(item.timeAdded)}
                    </span>
                  </div>
                </div>
                
                <div className="queue-item__url">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="queue-item__link"
                  >
                    {item.url}
                  </a>
                </div>
                
                <div className="queue-item__tags">
                  {item.tags.map(tag => (
                    <span key={tag} className="queue-tag">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="queue-item__actions">
                <button
                  onClick={() => handleOpenBookmark(item)}
                  className="queue-action-btn queue-action-btn--primary"
                  title="Open bookmark"
                >
                  🔗 Open
                </button>
                
                <div className="queue-action-dropdown">
                  <button className="queue-action-btn queue-action-btn--secondary">
                    ⏰ Snooze
                  </button>
                  <div className="snooze-menu">
                    <button onClick={() => handleSnoozeBookmark(item, 1)}>
                      1 hour
                    </button>
                    <button onClick={() => handleSnoozeBookmark(item, 4)}>
                      4 hours
                    </button>
                    <button onClick={() => handleSnoozeBookmark(item, 24)}>
                      1 day
                    </button>
                  </div>
                </div>
                
                <button
                  onClick={() => handleArchiveBookmark(item)}
                  className="queue-action-btn queue-action-btn--secondary"
                  title="Archive bookmark"
                >
                  📁 Archive
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default QueueTab;
