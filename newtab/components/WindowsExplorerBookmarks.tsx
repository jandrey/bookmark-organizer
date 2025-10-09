// Windows Explorer-style Bookmark Tree Component

import React, { useState, useEffect, useCallback } from 'react';
import type { BookmarkNode } from '../types';
import { chromeBookmarkService } from '../services/chromeBookmarkService';

interface WindowsExplorerBookmarksProps {
  className?: string;
}

interface BookmarkTreeNode {
  id: string;
  title: string;
  url?: string;
  children: BookmarkTreeNode[];
  isExpanded: boolean;
  level: number;
  isFolder: boolean;
}

export const WindowsExplorerBookmarks: React.FC<WindowsExplorerBookmarksProps> = ({
  className = ''
}) => {
  const [treeNodes, setTreeNodes] = useState<BookmarkTreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build tree structure from Chrome bookmarks
  const buildTreeStructure = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Building Windows Explorer-style bookmark tree...');
      const bookmarkTree = await chromeBookmarkService.getBookmarkTree();
      const nodes: BookmarkTreeNode[] = [];

      const processNode = (node: BookmarkNode, level: number = 0): BookmarkTreeNode => {
        const treeNode: BookmarkTreeNode = {
          id: node.id,
          title: node.title,
          url: node.url,
          children: [],
          isExpanded: false,
          level,
          isFolder: !node.url && !!(node.children && node.children.length > 0)
        };

        // Process children recursively
        if (node.children && node.children.length > 0) {
          for (const child of node.children) {
            const childNode = processNode(child, level + 1);
            treeNode.children.push(childNode);
          }
        }

        return treeNode;
      };

      // Process the bookmark tree
      for (const rootNode of bookmarkTree) {
        if (rootNode.children) {
          for (const child of rootNode.children) {
            const childNode = processNode(child, 0);
            nodes.push(childNode);
          }
        }
      }

      setTreeNodes(nodes);
      console.log(`Successfully built tree with ${nodes.length} root nodes`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load bookmarks';
      setError(errorMessage);
      console.error('Error building tree structure:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Toggle node expansion
  const toggleNode = useCallback((nodeId: string): void => {
    setTreeNodes(prevNodes => {
      const updateNodes = (nodes: BookmarkTreeNode[]): BookmarkTreeNode[] => {
        return nodes.map(node => {
          if (node.id === nodeId) {
            return { ...node, isExpanded: !node.isExpanded };
          }
          if (node.children && node.children.length > 0) {
            return { ...node, children: updateNodes(node.children) };
          }
          return node;
        });
      };
      return updateNodes(prevNodes);
    });
  }, []);

  // Handle bookmark click
  const handleBookmarkClick = useCallback((url: string): void => {
    if (url) {
      chrome.tabs.create({ url });
    }
  }, []);

  // Render tree node
  const renderTreeNode = (node: BookmarkTreeNode): React.ReactNode => {
    const hasChildren = node.children.length > 0;
    const indentStyle = { paddingLeft: `${node.level * 20 + 8}px` };

    return (
      <div key={node.id} className="tree-node">
        <div 
          className={`tree-node-content ${hasChildren ? 'has-children' : ''} ${node.url ? 'bookmark-link' : ''}`}
          style={indentStyle}
          onClick={hasChildren ? () => toggleNode(node.id) : (node.url ? () => handleBookmarkClick(node.url!) : undefined)}
        >
          <div className="tree-node-header">
            {hasChildren && (
              <span className="tree-expand-icon">
                {node.isExpanded ? '▼' : '▶'}
              </span>
            )}
            {!hasChildren && <span className="tree-spacer"></span>}
            
            <span className={`tree-icon ${node.isFolder ? 'folder' : 'bookmark'}`}>
              {node.isFolder ? '📁' : '🔗'}
            </span>
            
            <span className="tree-title">{node.title}</span>
            
            {node.url && (
              <span className="tree-url">{node.url}</span>
            )}
          </div>
        </div>

        {node.isExpanded && hasChildren && (
          <div className="tree-children">
            {node.children.map(child => renderTreeNode(child))}
          </div>
        )}
      </div>
    );
  };

  // Load tree on mount
  useEffect(() => {
    buildTreeStructure();
  }, [buildTreeStructure]);

  if (isLoading) {
    return (
      <div className={`windows-explorer-bookmarks ${className}`}>
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Generating tree...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`windows-explorer-bookmarks ${className}`}>
        <div className="error-state">
          <p>Error: {error}</p>
          <button onClick={() => buildTreeStructure()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`windows-explorer-bookmarks ${className}`}>
      <div className="tree-container">
        {treeNodes.length > 0 ? (
          treeNodes.map(node => renderTreeNode(node))
        ) : (
          <div className="no-results">
            <p>No bookmarks found</p>
          </div>
        )}
      </div>
    </div>
  );
};
