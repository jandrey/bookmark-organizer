/**
 * Sessions Tab Component
 * 
 * Features:
 * - Scan My Library: Scans bookmarks + open tabs
 * - AI-powered clustering and summarization
 * - Preview Changes: Modal view of proposed reorganization
 * - Apply Changes: Moves bookmarks via Chrome API
 * - Current Bookmarks: Windows Explorer-style bookmark tree
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { BookmarkCluster, BookmarkNode } from '../types';
import { initializeAI } from '../services/aiService';
import { AI_CONFIG } from '../constants';

interface SessionsTabProps {
  clusters: BookmarkCluster[];
  isScanning: boolean;
  onScanLibrary: () => Promise<void>;
  onApplyChanges: (clusters: BookmarkCluster[]) => Promise<void>;
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

export const SessionsTab: React.FC<SessionsTabProps> = ({
  clusters,
  isScanning,
  onScanLibrary,
  onApplyChanges,
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const [selectedClusters, setSelectedClusters] = useState<string[]>([]);
  const [scanResults, setScanResults] = useState<{
    totalBookmarks: number;
    totalTabs: number;
    clustersFound: number;
    processingTime: number;
  } | null>(null);
  
  // Bookmark tree state
  const [treeNodes, setTreeNodes] = useState<BookmarkTreeNode[]>([]);
  const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(false);
  const [bookmarkError, setBookmarkError] = useState<string | null>(null);
  const [showCurrentBookmarks, setShowCurrentBookmarks] = useState(false);
  
  // AI categorization state
  const [aiCategorizedBookmarks, setAiCategorizedBookmarks] = useState<Record<string, Record<string, string>> | null>(null);
  // Editable structure used by Preview modal (client can rearrange before applying)
  const [previewCategories, setPreviewCategories] = useState<Record<string, Record<string, string>> | null>(null);
  // Expanded/collapsed state for preview categories
  const [previewExpanded, setPreviewExpanded] = useState<Record<string, boolean>>({});
  const [originalBookmarks, setOriginalBookmarks] = useState<Array<{ title: string; url: string }>>([]);
  const [isAICategorizing, setIsAICategorizing] = useState(false);
  
  // Undo functionality
  type SavedNode = { title: string; url?: string; children?: SavedNode[] };
  const [bookmarkBackup, setBookmarkBackup] = useState<{ bar: SavedNode[]; other: SavedNode[] } | null>(null);
  const [hasAppliedChanges, setHasAppliedChanges] = useState(false);
  
  // AI service state
  const [aiService, setAiService] = useState<any>(null);
  // Drag & Drop state for preview modal
  const [dragItem, setDragItem] = useState<{ category: string; title: string; url: string } | null>(null);
  const previewBodyRef = React.useRef<HTMLDivElement | null>(null);
  
  const mockBookmarks = [
    {
      "children": [
        {
          "children": [
            {
              "dateAdded": 1759964000000,
              "id": "1",
              "index": 0,
              "parentId": "0",
              "syncing": false,
              "title": "Spotify",
              "url": "https://www.spotify.com/"
            },
            {
              "children": [
                {
                  "dateAdded": 1759964010000,
                  "id": "2",
                  "index": 0,
                  "parentId": "10",
                  "syncing": false,
                  "title": "Minecraft News",
                  "url": "https://www.minecraft.net/en-us/article/minecraft-news"
                },
                {
                  "dateAdded": 1759964020000,
                  "id": "3",
                  "index": 1,
                  "parentId": "10",
                  "syncing": false,
                  "title": "Tibia Forum",
                  "url": "https://forum.tibia.com/"
                }
              ],
              "dateAdded": 1759964030000,
              "dateGroupModified": 1759964040000,
              "id": "10",
              "index": 1,
              "parentId": "0",
              "syncing": false,
              "title": "Trabalho"
            },
            {
              "children": [
                {
                  "dateAdded": 1759964050000,
                  "id": "4",
                  "index": 0,
                  "parentId": "11",
                  "syncing": false,
                  "title": "FreeCodeCamp",
                  "url": "https://www.freecodecamp.org/"
                },
                {
                  "dateAdded": 1759964060000,
                  "id": "5",
                  "index": 1,
                  "parentId": "11",
                  "syncing": false,
                  "title": "MDN Docs",
                  "url": "https://developer.mozilla.org/"
                }
              ],
              "dateAdded": 1759964070000,
              "dateGroupModified": 1759964080000,
              "id": "11",
              "index": 2,
              "parentId": "0",
              "syncing": false,
              "title": "Games"
            },
            {
              "children": [
                {
                  "dateAdded": 1759964090000,
                  "id": "6",
                  "index": 0,
                  "parentId": "12",
                  "syncing": false,
                  "title": "YouTube",
                  "url": "https://www.youtube.com/"
                },
                {
                  "dateAdded": 1759964100000,
                  "id": "7",
                  "index": 1,
                  "parentId": "12",
                  "syncing": false,
                  "title": "Twitch",
                  "url": "https://www.twitch.tv/"
                },
                {
                  "dateAdded": 1759964110000,
                  "id": "8",
                  "index": 2,
                  "parentId": "12",
                  "syncing": false,
                  "title": "TechCrunch",
                  "url": "https://techcrunch.com/"
                }
              ],
              "dateAdded": 1759964120000,
              "dateGroupModified": 1759964130000,
              "id": "12",
              "index": 3,
              "parentId": "0",
              "syncing": false,
              "title": "Músicas"
            },
            {
              "children": [
                {
                  "dateAdded": 1759964140000,
                  "id": "9",
                  "index": 0,
                  "parentId": "13",
                  "syncing": false,
                  "title": "Hugging Face",
                  "url": "https://huggingface.co/"
                },
                {
                  "dateAdded": 1759964150000,
                  "id": "14",
                  "index": 1,
                  "parentId": "13",
                  "syncing": false,
                  "title": "OpenAI",
                  "url": "https://openai.com/"
                }
              ],
              "dateAdded": 1759964160000,
              "dateGroupModified": 1759964170000,
              "id": "13",
              "index": 4,
              "parentId": "0",
              "syncing": false,
              "title": "Pesquisa"
            }
          ],
          "dateAdded": 1759964180000,
          "id": "0",
          "syncing": false,
          "title": "Barra de favoritos"
        },
        {
          "children": [
            {
              "children": [
                { "dateAdded": 1759964190000, "id": "15", "index": 0, "parentId": "20", "syncing": false, "title": "LOL News", "url": "https://www.leagueoflegends.com/" },
                { "dateAdded": 1759964200000, "id": "16", "index": 1, "parentId": "20", "syncing": false, "title": "Steam", "url": "https://store.steampowered.com/" },
                { "dateAdded": 1759964210000, "id": "17", "index": 2, "parentId": "20", "syncing": false, "title": "Epic Games", "url": "https://www.epicgames.com/store/en-US/" }
              ],
              "dateAdded": 1759964220000,
              "dateGroupModified": 1759964230000,
              "id": "20",
              "index": 0,
              "parentId": "2",
              "syncing": false,
              "title": "Jogos"
            },
            {
              "children": [
                { "dateAdded": 1759964240000, "id": "18", "index": 0, "parentId": "21", "syncing": false, "title": "Netflix", "url": "https://www.netflix.com/" },
                { "dateAdded": 1759964250000, "id": "19", "index": 1, "parentId": "21", "syncing": false, "title": "Crunchyroll", "url": "https://www.crunchyroll.com/" },
                { "dateAdded": 1759964260000, "id": "20", "index": 2, "parentId": "21", "syncing": false, "title": "Disney+", "url": "https://www.disneyplus.com/" }
              ],
              "dateAdded": 1759964270000,
              "dateGroupModified": 1759964280000,
              "id": "21",
              "index": 1,
              "parentId": "2",
              "syncing": false,
              "title": "Entretenimento"
            },
            {
              "children": [
                { "dateAdded": 1759964290000, "id": "22", "index": 0, "parentId": "22", "syncing": false, "title": "JavaScript Docs", "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript" },
                { "dateAdded": 1759964300000, "id": "23", "index": 1, "parentId": "22", "syncing": false, "title": "Python Docs", "url": "https://docs.python.org/3/" },
                { "dateAdded": 1759964310000, "id": "24", "index": 2, "parentId": "22", "syncing": false, "title": "C# Docs", "url": "https://learn.microsoft.com/en-us/dotnet/csharp/" }
              ],
              "dateAdded": 1759964320000,
              "dateGroupModified": 1759964330000,
              "id": "22",
              "index": 2,
              "parentId": "2",
              "syncing": false,
              "title": "Trabalho"
            },
            {
              "children": [
                { "dateAdded": 1759964340000, "id": "25", "index": 0, "parentId": "23", "syncing": false, "title": "Tibia", "url": "https://www.tibia.com/" },
                { "dateAdded": 1759964350000, "id": "26", "index": 1, "parentId": "23", "syncing": false, "title": "Runescape", "url": "https://www.runescape.com/" },
                { "dateAdded": 1759964360000, "id": "27", "index": 2, "parentId": "23", "syncing": false, "title": "Roblox", "url": "https://www.roblox.com/" }
              ],
              "dateAdded": 1759964370000,
              "dateGroupModified": 1759964380000,
              "id": "23",
              "index": 3,
              "parentId": "2",
              "syncing": false,
              "title": "Games"
            },
            {
              "children": [
                { "dateAdded": 1759964390000, "id": "28", "index": 0, "parentId": "24", "syncing": false, "title": "BBC News", "url": "https://www.bbc.com/news" },
                { "dateAdded": 1759964400000, "id": "29", "index": 1, "parentId": "24", "syncing": false, "title": "CNN", "url": "https://edition.cnn.com/" },
                { "dateAdded": 1759964410000, "id": "30", "index": 2, "parentId": "24", "syncing": false, "title": "G1", "url": "https://g1.globo.com/" }
              ],
              "dateAdded": 1759964420000,
              "dateGroupModified": 1759964430000,
              "id": "24",
              "index": 4,
              "parentId": "2",
              "syncing": false,
              "title": "Notícias"
            },
            {
              "children": [
                { "dateAdded": 1759964440000, "id": "31", "index": 0, "parentId": "25", "syncing": false, "title": "Khan Academy", "url": "https://www.khanacademy.org/" },
                { "dateAdded": 1759964450000, "id": "32", "index": 1, "parentId": "25", "syncing": false, "title": "Coursera", "url": "https://www.coursera.org/" },
                { "dateAdded": 1759964460000, "id": "33", "index": 2, "parentId": "25", "syncing": false, "title": "Udemy", "url": "https://www.udemy.com/" }
              ],
              "dateAdded": 1759964470000,
              "dateGroupModified": 1759964480000,
              "id": "25",
              "index": 5,
              "parentId": "2",
              "syncing": false,
              "title": "Aprendizado"
            },
            {
              "children": [
                { "dateAdded": 1759964490000, "id": "34", "index": 0, "parentId": "26", "syncing": false, "title": "Reddit", "url": "https://www.reddit.com/" },
                { "dateAdded": 1759964500000, "id": "35", "index": 1, "parentId": "26", "syncing": false, "title": "Hacker News", "url": "https://news.ycombinator.com/" },
                { "dateAdded": 1759964510000, "id": "36", "index": 2, "parentId": "26", "syncing": false, "title": "Medium", "url": "https://medium.com/" }
              ],
              "dateAdded": 1759964520000,
              "dateGroupModified": 1759964530000,
              "id": "26",
              "index": 6,
              "parentId": "2",
              "syncing": false,
              "title": "Redes"
            },
            {
              "children": [
                { "dateAdded": 1759964540000, "id": "37", "index": 0, "parentId": "27", "syncing": false, "title": "YouTube Music", "url": "https://music.youtube.com/" },
                { "dateAdded": 1759964550000, "id": "38", "index": 1, "parentId": "27", "syncing": false, "title": "SoundCloud", "url": "https://soundcloud.com/" },
                { "dateAdded": 1759964560000, "id": "39", "index": 2, "parentId": "27", "syncing": false, "title": "Bandcamp", "url": "https://bandcamp.com/" },
                { "dateAdded": 1759964570000, "id": "40", "index": 3, "parentId": "27", "syncing": false, "title": "Last.fm", "url": "https://www.last.fm/" }
              ],
              "dateAdded": 1759964580000,
              "dateGroupModified": 1759964590000,
              "id": "27",
              "index": 7,
              "parentId": "2",
              "syncing": false,
              "title": "Música"
            }
          ],
          "dateAdded": 1759964600000,
          "id": "2",
          "syncing": false,
          "title": "Outros favoritos"
        }
      ],
      "dateAdded": 1759964610000,
      "id": "0",
      "syncing": false,
      "title": ""
    }
  ]

  const handleScanLibrary = async () => {
    try {
      setIsAICategorizing(true);
      
      // Get current bookmarks from Chrome
      // const bookmarkTree = await chrome.bookmarks.getTree();
      
      const bookmarkTree = mockBookmarks
      const bookmarks: Array<{ title: string; url: string }> = [];
      
      const extractBookmarks = (node: BookmarkNode) => {
        if (node.url) {
          bookmarks.push({ title: node.title, url: node.url });
        }
        if (node.children) {
          node.children.forEach(extractBookmarks);
        }
      };
      
      bookmarkTree.forEach(rootNode => {
        if (rootNode.children) {
          rootNode.children.forEach(extractBookmarks);
        }
      });
      
      setOriginalBookmarks(bookmarks);
      
      // Send to AI for categorization
      if (!aiService) {
        throw new Error('AI service not initialized. Please check your API key.');
      }

      const categorizedBookmarks = await aiService.categorizeBookmarks(bookmarks);
      setAiCategorizedBookmarks(categorizedBookmarks);
      
      // Update scan results
      setScanResults({
        totalBookmarks: bookmarks.length,
        totalTabs: 0, // We're not scanning tabs in this implementation
        clustersFound: Object.keys(categorizedBookmarks).length,
        processingTime: 2.3
      });
      
      console.log('AI Categorized Bookmarks:', categorizedBookmarks);
      
    } catch (error) {
      console.error('Error scanning library:', error);
      setBookmarkError('Failed to scan bookmarks and categorize with AI');
    } finally {
      setIsAICategorizing(false);
    }
  };

  const handlePreviewChanges = () => {
    if (!aiCategorizedBookmarks) return;
    // Deep copy to allow in-modal edits via drag & drop
    const copy: Record<string, Record<string, string>> = {};
    Object.entries(aiCategorizedBookmarks).forEach(([cat, items]) => {
      copy[cat] = { ...items };
    });
    setPreviewCategories(copy);
    // Expand all categories by default
    const expanded: Record<string, boolean> = {};
    Object.keys(copy).forEach(cat => { expanded[cat] = true; });
    setPreviewExpanded(expanded);
    setShowPreview(true);
  };

  const handleApplyChanges = async () => {
    if (!aiCategorizedBookmarks && !previewCategories) return;
    
    try {
      const structure = previewCategories || aiCategorizedBookmarks!;
      // Helpers: snapshot, delete, and restore full folder contents under roots
      const snapshotNode = (node: BookmarkNode): SavedNode => ({
        title: node.title,
        url: node.url,
        children: (node.children || []).map(snapshotNode)
      });

      const snapshotChildren = async (rootId: string): Promise<SavedNode[]> => {
        const subtree = await chrome.bookmarks.getSubTree(rootId);
        const root = subtree && subtree.length > 0 ? subtree[0] as unknown as BookmarkNode : null;
        const children = root && root.children ? root.children : [];
        return children.map(snapshotNode);
      };

      const deleteAllChildren = async (rootId: string): Promise<void> => {
        const children = await chrome.bookmarks.getChildren(rootId);
        for (const child of children) {
          await chrome.bookmarks.removeTree(child.id);
        }
      };

      const restoreChildren = async (parentId: string, nodes: SavedNode[]): Promise<void> => {
        for (const n of nodes) {
          if (n.url) {
            await chrome.bookmarks.create({ parentId, title: n.title, url: n.url });
          } else {
            const folder = await chrome.bookmarks.create({ parentId, title: n.title });
            if (n.children && n.children.length > 0) {
              await restoreChildren(folder.id, n.children);
            }
          }
        }
      };

      // 1) Backup current contents of Bookmarks Bar ('1') and Other Bookmarks ('2')
      const [barBackup, otherBackup] = await Promise.all([
        snapshotChildren('1'),
        snapshotChildren('2')
      ]);
      setBookmarkBackup({ bar: barBackup, other: otherBackup });

      // 2) Destructively clear both roots
      await Promise.all([
        deleteAllChildren('1'),
        deleteAllChildren('2')
      ]);

      // 3) Recreate new structure under Bookmarks Bar ('1')
      for (const [category, bookmarks] of Object.entries(structure)) {
        const folder = await chrome.bookmarks.create({ title: category, parentId: '1' });
        for (const [title, url] of Object.entries(bookmarks)) {
          await chrome.bookmarks.create({ title, url, parentId: folder.id });
        }
      }
      
      setHasAppliedChanges(true);
      setShowPreview(false);
      
      // Refresh bookmark tree
      await buildTreeStructure();
      
      console.log('Successfully applied AI categorization changes');
      
    } catch (error) {
      console.error('Error applying changes:', error);
      setBookmarkError('Failed to apply bookmark reorganization');
    }
  };

  // ---------- Preview Drag & Drop handlers ----------
  const handleBookmarkDragStart = (category: string, title: string, url: string) => {
    setDragItem({ category, title, url });
  };

  const handleCategoryDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDropOnCategory = (targetCategory: string) => {
    if (!previewCategories || !dragItem) return;
    const { category: fromCategory, title, url } = dragItem;
    if (fromCategory === targetCategory) return;

    const next: Record<string, Record<string, string>> = {};
    Object.entries(previewCategories).forEach(([cat, items]) => {
      next[cat] = { ...items };
    });

    // Remove from source
    if (next[fromCategory]) {
      delete next[fromCategory][title];
      if (Object.keys(next[fromCategory]).length === 0) {
        delete next[fromCategory];
      }
    }
    // Ensure target exists and add item
    if (!next[targetCategory]) next[targetCategory] = {} as Record<string, string>;
    next[targetCategory][title] = url;

    setPreviewCategories(next);
    setDragItem(null);
  };

  const togglePreviewCategory = (category: string) => {
    setPreviewExpanded(prev => ({ ...prev, [category]: !(prev[category] ?? true) }));
  };

  const handlePreviewDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    // Enable dropping and auto-scroll the container when near edges
    e.preventDefault();
    const container = previewBodyRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const edgeThreshold = 40; // px from top/bottom to trigger scroll
    const scrollSpeed = 12; // px per event
    if (e.clientY < rect.top + edgeThreshold) {
      container.scrollTop = Math.max(0, container.scrollTop - scrollSpeed);
    } else if (e.clientY > rect.bottom - edgeThreshold) {
      container.scrollTop = container.scrollTop + scrollSpeed;
    }
  };

  const handleUndoChanges = async () => {
    if (!bookmarkBackup) return;
    
    try {
      // Clear current contents and restore from backup
      const deleteAllChildren = async (rootId: string): Promise<void> => {
        const children = await chrome.bookmarks.getChildren(rootId);
        for (const child of children) {
          await chrome.bookmarks.removeTree(child.id);
        }
      };

      const restoreChildren = async (parentId: string, nodes: SavedNode[]): Promise<void> => {
        for (const n of nodes) {
          if (n.url) {
            await chrome.bookmarks.create({ parentId, title: n.title, url: n.url });
          } else {
            const folder = await chrome.bookmarks.create({ parentId, title: n.title });
            if (n.children && n.children.length > 0) {
              await restoreChildren(folder.id, n.children);
            }
          }
        }
      };

      await Promise.all([
        deleteAllChildren('1'),
        deleteAllChildren('2')
      ]);

      await restoreChildren('1', bookmarkBackup.bar);
      await restoreChildren('2', bookmarkBackup.other);

      setHasAppliedChanges(false);
      setBookmarkBackup(null);
      await buildTreeStructure();
      
    } catch (error) {
      console.error('Error undoing changes:', error);
    }
  };

  const toggleClusterSelection = (clusterId: string) => {
    setSelectedClusters(prev => 
      prev.includes(clusterId)
        ? prev.filter(id => id !== clusterId)
        : [...prev, clusterId]
    );
  };

  const selectAllClusters = () => {
    setSelectedClusters(clusters.map(c => c.id));
  };

  const deselectAllClusters = () => {
    setSelectedClusters([]);
  };

  // Build tree structure from Chrome bookmarks (similar to WindowsExplorerBookmarks)
  const buildTreeStructure = useCallback(async (): Promise<void> => {
    try {
      setIsLoadingBookmarks(true);
      setBookmarkError(null);
      
      console.log('Building bookmark tree for Sessions tab...');
      const bookmarkTree = await chrome.bookmarks.getTree();
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
      setBookmarkError(errorMessage);
      console.error('Error building tree structure:', err);
    } finally {
      setIsLoadingBookmarks(false);
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

  // Initialize AI service on mount
  useEffect(() => {
    const initializeAIService = async () => {
      try {
        const aiServiceInstance = initializeAI({
          apiKey: AI_CONFIG.FALLBACK_API_KEY,
          model: AI_CONFIG.DEFAULT_MODEL,
          temperature: AI_CONFIG.DEFAULT_TEMPERATURE
        });
        setAiService(aiServiceInstance);
        setBookmarkError(null);
        console.log('AI Service initialized successfully with fallback API key');
      } catch (error) {
        console.error('Failed to initialize AI service:', error);
        setBookmarkError('AI service initialization failed. Please check your API key configuration.');
      }
    };
    
    initializeAIService();
  }, []);

  // Load bookmarks on mount
  useEffect(() => {
    buildTreeStructure();
  }, [buildTreeStructure]);

  // Render tree node (similar to WindowsExplorerBookmarks)
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


  return (
    <div className="sessions-tab">
      <div className="sessions-tab__header">
        <h3>📚 Sessions</h3>
        <p>Organize your bookmarks with AI-powered clustering</p>
        
        <div className="sessions-tab__controls">
          <button
            onClick={() => setShowCurrentBookmarks(!showCurrentBookmarks)}
            className="sessions-tab__toggle-bookmarks"
          >
            {showCurrentBookmarks ? '📁 Hide Current Bookmarks' : '📁 Show Current Bookmarks'}
          </button>
        </div>
      </div>

      <div className="sessions-tab__actions">
        <button
          onClick={handleScanLibrary}
          disabled={isScanning || isAICategorizing || !aiService}
          className="sessions-tab__scan-btn"
        >
          {isScanning || isAICategorizing ? (
            <>
              <div className="spinner"></div>
              {isAICategorizing ? 'AI Categorizing Bookmarks...' : 'Scanning Library...'}
            </>
          ) : !aiService ? (
            <>
              ⏳ Initializing AI...
            </>
          ) : (
            <>
              🔍 Scan My Library
            </>
          )}
        </button>

        {/* {scanResults && (
          <div className="sessions-tab__results">
            <div className="scan-summary">
              <div className="scan-stat">
                <span className="stat-number">{scanResults.totalBookmarks}</span>
                <span className="stat-label">Bookmarks</span>
              </div>
              <div className="scan-stat">
                <span className="stat-number">{scanResults.totalTabs}</span>
                <span className="stat-label">Open Tabs</span>
              </div>
              <div className="scan-stat">
                <span className="stat-number">{scanResults.clustersFound}</span>
                <span className="stat-label">Clusters</span>
              </div>
              <div className="scan-stat">
                <span className="stat-number">{scanResults.processingTime}s</span>
                <span className="stat-label">Processing</span>
              </div>
            </div>
          </div>
        )} */}
      </div>

      {/* Current Bookmarks Section */}
      {showCurrentBookmarks && (
        <div className="sessions-tab__current-bookmarks">
          <div className="current-bookmarks-header">
            <h4>📁 Current Bookmarks</h4>
            <button
              onClick={buildTreeStructure}
              disabled={isLoadingBookmarks}
              className="refresh-bookmarks-btn"
            >
              {isLoadingBookmarks ? '🔄' : '🔄'} Refresh
            </button>
          </div>

          {isLoadingBookmarks ? (
            <div className="bookmarks-loading">
              <div className="spinner"></div>
              <p>Loading bookmarks...</p>
            </div>
          ) : bookmarkError ? (
            <div className="bookmarks-error">
              <p>Error: {bookmarkError}</p>
              <button onClick={buildTreeStructure}>Retry</button>
            </div>
          ) : (
            <div className="bookmarks-tree-container">
              {treeNodes.length > 0 ? (
                <div className="tree-container">
                  {treeNodes.map(node => renderTreeNode(node))}
                </div>
              ) : (
                <div className="no-bookmarks">
                  <p>No bookmarks found</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* <div className="sessions-tab__clusters">
        <div className="clusters-header">
          <h4>AI-Generated Clusters</h4>
          <div className="cluster-controls">
            <button onClick={selectAllClusters} className="cluster-control-btn">
              Select All
            </button>
            <button onClick={deselectAllClusters} className="cluster-control-btn">
              Deselect All
            </button>
          </div>
        </div>

        <div className="clusters-grid">
          {clusters.map(cluster => (
            <div
              key={cluster.id}
              className={`cluster-card ${selectedClusters.includes(cluster.id) ? 'selected' : ''}`}
              onClick={() => toggleClusterSelection(cluster.id)}
            >
              <div className="cluster-card__header">
                <input
                  type="checkbox"
                  checked={selectedClusters.includes(cluster.id)}
                  onChange={() => toggleClusterSelection(cluster.id)}
                  className="cluster-checkbox"
                />
                <h5 className="cluster-title">{cluster.title}</h5>
                <span className="cluster-confidence">
                  {Math.round(cluster.confidence * 100)}%
                </span>
              </div>
              
              <p className="cluster-description">{cluster.description}</p>
              
              <div className="cluster-stats">
                <span className="cluster-count">
                  {cluster.itemCount} items
                </span>
                <span className="cluster-confidence-badge">
                  {cluster.confidence > 0.9 ? 'High' : cluster.confidence > 0.8 ? 'Medium' : 'Low'} Confidence
                </span>
              </div>
            </div>
          ))}
        </div>
      </div> */}

      <div className="sessions-tab__footer">
        {!hasAppliedChanges ? (
          <>
            <button
              onClick={handlePreviewChanges}
              disabled={!aiCategorizedBookmarks}
              className="sessions-tab__preview-btn"
            >
              👁️ Preview Changes
            </button>
            
            <button
              onClick={handleApplyChanges}
              disabled={!aiCategorizedBookmarks}
              className="sessions-tab__apply-btn"
            >
              ✅ Apply Changes
            </button>
          </>
        ) : (
          <button
            onClick={handleUndoChanges}
            className="sessions-tab__undo-btn"
          >
            ↩️ Undo Changes
          </button>
        )}
      </div>

      {showPreview && (
        <div className="preview-modal">
          <div className="preview-modal__content">
            <div className="preview-modal__header">
              <h4>Preview Changes</h4>
              <button
                onClick={() => setShowPreview(false)}
                className="preview-modal__close"
              >
                ×
              </button>
            </div>
            
            <div className="preview-modal__body" ref={previewBodyRef} onDragOver={handlePreviewDragOver}>
              <div className="windows-explorer-bookmarks">
                <div className="tree-container">
                  {previewCategories ? (
                    Object.entries(previewCategories).map(([category, bookmarks]) => (
                      <div key={category} className="tree-node">
                        <div
                          className="tree-node-content has-children"
                          onDragOver={handleCategoryDragOver}
                          onDrop={() => handleDropOnCategory(category)}
                          onClick={() => togglePreviewCategory(category)}
                          style={{ paddingLeft: '8px' }}
                        >
                          <div className="tree-node-header">
                            <span className="tree-expand-icon">{previewExpanded[category] === false ? '▶' : '▼'}</span>
                            <span className={`tree-icon folder`}>📁</span>
                            <span className="tree-title">{category}</span>
                          </div>
                        </div>
                        {previewExpanded[category] === false ? null : (
                          <div className="tree-children">
                            {Object.entries(bookmarks).map(([title, url]) => (
                              <div key={title} className="tree-node">
                                <div
                                  className={`tree-node-content bookmark-link`}
                                  style={{ paddingLeft: '28px' }}
                                  draggable
                                  onDragStart={() => handleBookmarkDragStart(category, title, url)}
                                >
                                  <div className="tree-node-header">
                                    <span className="tree-spacer"></span>
                                    <span className={`tree-icon bookmark`}>🔗</span>
                                    <span className="tree-title">{title}</span>
                                    <span className="tree-url">{url}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : aiCategorizedBookmarks ? (
                    Object.entries(aiCategorizedBookmarks).map(([category, bookmarks]) => (
                      <div key={category} className="tree-node">
                        <div className="tree-node-content has-children" style={{ paddingLeft: '8px' }}>
                          <div className="tree-node-header">
                            <span className="tree-expand-icon">▼</span>
                            <span className={`tree-icon folder`}>📁</span>
                            <span className="tree-title">{category}</span>
                          </div>
                        </div>
                        <div className="tree-children">
                          {Object.entries(bookmarks).map(([title, url]) => (
                            <div key={title} className="tree-node">
                              <div className={`tree-node-content bookmark-link`} style={{ paddingLeft: '28px' }}>
                                <div className="tree-node-header">
                                  <span className="tree-spacer"></span>
                                  <span className={`tree-icon bookmark`}>🔗</span>
                                  <span className="tree-title">{title}</span>
                                  <span className="tree-url">{url}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-results">
                      <p>No categorized bookmarks available. Please scan your library first.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="preview-modal__footer">
              <button
                onClick={() => setShowPreview(false)}
                className="preview-modal__cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyChanges}
                className="preview-modal__confirm"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionsTab;
