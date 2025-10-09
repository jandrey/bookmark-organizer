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
import { AI_CONFIG } from '../constants';
import { chromeBookmarkService } from '../services/chromeBookmarkService';
import { useAI } from '../hooks/useAI';
import { useChromeBookmarks } from '../hooks/useChromeBookmarks';

interface SessionsTabProps {}

interface BookmarkTreeNode {
  id: string;
  title: string;
  url?: string;
  children: BookmarkTreeNode[];
  isExpanded: boolean;
  level: number;
  isFolder: boolean;
}

export const SessionsTab: React.FC<SessionsTabProps> = () => {
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
  
  // AI categorization state
  const [aiCategorizedBookmarks, setAiCategorizedBookmarks] = useState<Record<string, Record<string, string>> | null>(null);
  // Editable structure used by Preview modal (client can rearrange before applying)
  const [previewCategories, setPreviewCategories] = useState<Record<string, Record<string, string>> | null>(null);
  // Expanded/collapsed state for preview categories
  const [previewExpanded, setPreviewExpanded] = useState<Record<string, boolean>>({});
  const [resultsExpanded, setResultsExpanded] = useState<Record<string, boolean>>({});
  const [originalBookmarks, setOriginalBookmarks] = useState<Array<{ title: string; url: string }>>([]);
  const [isAICategorizing, setIsAICategorizing] = useState(false);
  const [scanProgress, setScanProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [scanEntireSession, setScanEntireSession] = useState(false);
  const [openTabsPreview, setOpenTabsPreview] = useState<Array<{ title: string; url: string }>>([]);
  
  // Undo functionality
  type SavedNode = { title: string; url?: string; children?: SavedNode[] };
  const [bookmarkBackup, setBookmarkBackup] = useState<{ bar: SavedNode[]; other: SavedNode[] } | null>(null);
  const [hasAppliedChanges, setHasAppliedChanges] = useState(false);
  
  // AI hook
  const { isLoading: aiLoading, error: aiError, isInitialized, initialize, categorizeBookmarks } = useAI();

  // Chrome bookmarks hook
  const { getOpenTabs, getBookmarkTree } = useChromeBookmarks();

  // Drag & Drop state for preview modal
  const [dragItem, setDragItem] = useState<{ category: string; title: string; url: string } | null>(null);
  const previewBodyRef = React.useRef<HTMLDivElement | null>(null);
  const progressTimerRef = React.useRef<number | null>(null);
  
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
      setScanProgress({ current: 0, total: 0 });
      
      // Get current bookmarks (try real API, fallback to mock)
      let bookmarkTree: any[] = [];
      try {
        // bookmarkTree = await getBookmarkTree();
        bookmarkTree = mockBookmarks
      } catch {
        bookmarkTree = mockBookmarks as any[];
      }

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

      // Optionally include open tabs when scanning entire session
      const baseCount = bookmarks.length;
      let tabsCount = 0;
      console.log('bookmarks just → ', bookmarks)
      if (scanEntireSession) {
        try {
          const openTabs = await getOpenTabs();
          for (const tab of openTabs) {
            if (tab.url) {
              bookmarks.push({ title: tab.title, url: tab.url });
            }
          }
          tabsCount = openTabs.filter(t => !!t.url).length;
          console.log('bookmarks with tabs → ', bookmarks)
        } catch (e) {
          console.warn('Could not fetch open tabs, proceeding with bookmarks only.', e);
        }
      }
      setOriginalBookmarks(bookmarks);


      const totalToProcess = baseCount + tabsCount;
      setScanProgress({ current: 0, total: totalToProcess });
      if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = window.setInterval(() => {
        setScanProgress(prev => {
          if (prev.total === 0) return prev;
          const step = Math.max(1, Math.ceil(prev.total * 0.03));
          const next = Math.min(prev.total - 1, prev.current + step);
          return { current: next, total: prev.total };
        });
      }, 200);
      
      // Send to AI for categorization
      if (!isInitialized) {
        throw new Error('AI not initialized. Please check your API key.');
      }

      // tabs already merged above when scanEntireSession is true
      const categorizedBookmarks = await categorizeBookmarks(bookmarks);
      setAiCategorizedBookmarks(categorizedBookmarks);
      setScanProgress(prev => ({ current: prev.total, total: prev.total }));
      
      // Update scan results
      setScanResults({
        totalBookmarks: baseCount,
        totalTabs: tabsCount,
        clustersFound: Object.keys(categorizedBookmarks).length,
        processingTime: 2.3
      });
      
      console.log('AI Categorized Bookmarks:', categorizedBookmarks);
      
    } catch (error) {
      console.error('Error scanning library:', error);
      setBookmarkError('Failed to scan bookmarks and categorize with AI');
    } finally {
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
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

  // Expand all result categories by default when new results arrive
  useEffect(() => {
    if (aiCategorizedBookmarks) {
      const expanded: Record<string, boolean> = {};
      Object.keys(aiCategorizedBookmarks).forEach(cat => { expanded[cat] = true; });
      setResultsExpanded(expanded);
    }
  }, [aiCategorizedBookmarks]);

  const toggleResultCategory = (category: string) => {
    setResultsExpanded(prev => ({ ...prev, [category]: !(prev[category] ?? true) }));
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
        const subtree = await chromeBookmarkService.getSubTree(rootId);
        const root = subtree && subtree.length > 0 ? subtree[0] as unknown as BookmarkNode : null;
        const children = root && root.children ? root.children : [];
        return children.map(snapshotNode);
      };

      const deleteAllChildren = async (rootId: string): Promise<void> => {
        const children = await chromeBookmarkService.getChildren(rootId);
        for (const child of children) {
          await chromeBookmarkService.removeBookmarkTree(child.id);
        }
      };

      const restoreChildren = async (parentId: string, nodes: SavedNode[]): Promise<void> => {
        for (const n of nodes) {
          if (n.url) {
            await chromeBookmarkService.createBookmark({ parentId, title: n.title, url: n.url });
          } else {
            const folder = await chromeBookmarkService.createBookmark({ parentId, title: n.title });
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
        const folder = await chromeBookmarkService.createBookmark({ title: category, parentId: '1' });
        for (const [title, url] of Object.entries(bookmarks)) {
          await chromeBookmarkService.createBookmark({ title, url, parentId: folder.id });
        }
      }
      
      setHasAppliedChanges(true);
      setShowPreview(false);
      
      // Refresh bookmark tree
      await buildTreeStructure();
      
      console.log('Successfully applied AI categorization changes');
      // Signal applied state for success card rendering
      // (hasAppliedChanges already true). Optionally navigate prompt could occur here.
      
    } catch (error) {
      console.error('Error applying changes:', error);
      setBookmarkError('Failed to apply bookmark reorganization');
    }
  };

  const handleNewScan = () => {
    setAiCategorizedBookmarks(null);
    setPreviewCategories(null);
    setPreviewExpanded({});
    setScanResults(null);
    setShowPreview(false);
    setBookmarkError(null);
    setSelectedClusters([]);
    setScanProgress({ current: 0, total: 0 });
    setOpenTabsPreview([]);
  };

  const handleNavigateQueue = () => {
    window.dispatchEvent(new CustomEvent('bookmarkOrganizer:navigate', { detail: { tab: 'queue' } }));
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
        const children = await chromeBookmarkService.getChildren(rootId);
        for (const child of children) {
          await chromeBookmarkService.removeBookmarkTree(child.id);
        }
      };

      const restoreChildren = async (parentId: string, nodes: SavedNode[]): Promise<void> => {
        for (const n of nodes) {
          if (n.url) {
            await chromeBookmarkService.createBookmark({ parentId, title: n.title, url: n.url });
          } else {
            const folder = await chromeBookmarkService.createBookmark({ parentId, title: n.title });
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


  // Build tree structure from Chrome bookmarks (similar to WindowsExplorerBookmarks)
  const buildTreeStructure = useCallback(async (): Promise<void> => {
    try {
      setIsLoadingBookmarks(true);
      setBookmarkError(null);
      
      console.log('Building bookmark tree for Sessions tab...');
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

  // Initialize AI service on mount via hook
  useEffect(() => {
    const doInit = async () => {
      try {
        await initialize({
          apiKey: AI_CONFIG.FALLBACK_API_KEY,
          model: AI_CONFIG.DEFAULT_MODEL,
          temperature: AI_CONFIG.DEFAULT_TEMPERATURE
        });
        setBookmarkError(null);
        console.log('AI initialized via hook successfully');
      } catch (error) {
        console.error('Failed to initialize AI via hook:', error);
        setBookmarkError('AI initialization failed. Please check your API key configuration.');
      }
    };
    doInit();
  }, [initialize]);

  // Load bookmarks on mount
  useEffect(() => {
    buildTreeStructure();
  }, [buildTreeStructure]);

  // Load open tabs preview when scanning entire session is enabled
  useEffect(() => {
    const loadTabs = async () => {
      if (!scanEntireSession) {
        setOpenTabsPreview([]);
        return;
      }
      try {
        const tabs = await getOpenTabs();
        const items = tabs
          .filter(t => !!t.url)
          .map(t => ({ title: t.title, url: t.url as string }));
        setOpenTabsPreview(items);
      } catch {
        setOpenTabsPreview([]);
      }
    };
    loadTabs();
  }, [scanEntireSession, getOpenTabs]);

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


  const foldersCount = aiCategorizedBookmarks ? Object.keys(aiCategorizedBookmarks).length : 0;

  return (
    <div className="sessions-tab">
      <div className="sessions-card">
        {isAICategorizing ? (
          <>
            <div className="sessions-scan__icon">✨</div>
            <h3 className="sessions-scan__title">Scanning your library...</h3>
            <p className="sessions-scan__subtitle">Analyzing topics and content locally with AI</p>
            <div className="sessions-scan__progress-text">Processing {scanProgress.current.toLocaleString()} / {scanProgress.total.toLocaleString()} bookmarks...</div>
            <div className="sessions-progress">
              <div className="sessions-progress__fill" style={{ width: `${scanProgress.total > 0 ? (scanProgress.current / scanProgress.total) * 100 : 0}%` }}></div>
            </div>
            <div className="sessions-skeletons">
              <div className="skeleton-card">
                <div className="skeleton-line skeleton-line--lg"></div>
                <div className="skeleton-line skeleton-line--md"></div>
                <div className="skeleton-line skeleton-line--xl"></div>
                <div className="skeleton-line skeleton-line--md"></div>
              </div>
              <div className="skeleton-card">
                <div className="skeleton-line skeleton-line--lg"></div>
                <div className="skeleton-line skeleton-line--md"></div>
                <div className="skeleton-line skeleton-line--xl"></div>
                <div className="skeleton-line skeleton-line--md"></div>
              </div>
              <div className="skeleton-card">
                <div className="skeleton-line skeleton-line--lg"></div>
                <div className="skeleton-line skeleton-line--md"></div>
                <div className="skeleton-line skeleton-line--xl"></div>
                <div className="skeleton-line skeleton-line--md"></div>
              </div>
            </div>
          </>
        ) : aiCategorizedBookmarks ? (
          <>
            {hasAppliedChanges ? (
              <>
                <h3 className="sessions-card__title">Organization Complete</h3>
                <p className="sessions-card__subtitle">Your bookmarks have been organized into {foldersCount} {foldersCount === 1 ? 'folder' : 'folders'}. You can review or revert anytime.</p>
                <div className="sessions-result__meta">
                  <span className="sessions-result__label">Folders created</span>
                  <span className="sessions-result__pill">{foldersCount} {foldersCount === 1 ? 'folder' : 'folders'}</span>
                </div>
                <div className="sessions-result__actions">
                  <button onClick={handleUndoChanges} className="sessions-btn sessions-btn--outline">↩️ Undo Changes</button>
                  <button onClick={handleNavigateQueue} className="sessions-btn sessions-btn--primary" onMouseDown={(e) => e.preventDefault()}>Next: View your Reading Queue →</button>
                </div>
              </>
            ) : (
              <>
                <h3 className="sessions-card__title">Research Sessions</h3>
                <p className="sessions-card__subtitle">Organize your open tabs and bookmarks with AI-powered clustering.</p>
                <div className="sessions-result__meta">
                  <span className="sessions-result__label">Suggested Organization</span>
                  <span className="sessions-result__pill">{foldersCount} {foldersCount === 1 ? 'folder' : 'folders'}</span>
                </div>
                <div className="sessions-result__actions">
                  <button onClick={handlePreviewChanges} className="sessions-btn sessions-btn--outline">👁️ Preview Changes</button>
                  <button onClick={handleApplyChanges} className="sessions-btn sessions-btn--primary">✅ Apply Changes</button>
                  <button onClick={handleNewScan} className="sessions-btn sessions-btn--outline">🔄 New Scan</button>
                </div>
                <div className="sessions-result__list">
                  {Object.entries(aiCategorizedBookmarks).map(([category, bookmarks]) => {
                    const entries = Object.entries(bookmarks);
                    const count = entries.length;
                    const previewItems = entries.slice(0, 2);
                    const collapsed = resultsExpanded[category] === false;
                    return (
                      <div key={category} className="result-card">
                        <div className="result-card__header" onClick={() => toggleResultCategory(category)}>
                          <div className="result-card__title">
                            <span className="result-card__folder">📁</span>
                            <span className="result-card__name">{category}</span>
                            <span className="result-card__count">{count}</span>
                          </div>
                          <button className="result-card__chevron" aria-label="toggle">{collapsed ? '▶' : '▼'}</button>
                        </div>
                        <div className="result-card__subtitle">{count} {count === 1 ? 'item' : 'items'} related to {category.toLowerCase()}</div>
                        {collapsed ? null : (
                          <div className="result-card__items">
                            {previewItems.map(([title, url]) => (
                              <div key={title} className="result-item">
                                <div className="result-item__text">
                                  <div className="result-item__title">{title}</div>
                                  <div className="result-item__url">{url}</div>
                                </div>
                                <button className="result-item__open" onClick={() => handleBookmarkClick(url)}>Open</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <h3 className="sessions-card__title">Research Sessions</h3>
            <p className="sessions-card__subtitle">Organize your open tabs and bookmarks with AI-powered clustering.</p>
            <div className="sessions-card__what">
              <div className="sessions-card__what-header">
                <span className="sessions-card__icon-box">🔍</span>
                <span className="sessions-card__what-title">What scanning does</span>
              </div>
              <div className="sessions-card__bullet">
                <span className="sessions-card__check">✓</span>
                <div className="sessions-card__bullet-body">
                  <div className="sessions-card__bullet-title">Analyzes your bookmarks and tabs</div>
                  <div className="sessions-card__bullet-desc">AI reads titles, URLs, and content to understand what you've saved</div>
                </div>
              </div>
              <div className="sessions-card__bullet">
                <span className="sessions-card__check">✓</span>
                <div className="sessions-card__bullet-body">
                  <div className="sessions-card__bullet-title">Groups by topic and relevance</div>
                  <div className="sessions-card__bullet-desc">Creates smart folders based on themes, not just keywords</div>
                </div>
              </div>
              <div className="sessions-card__bullet">
                <span className="sessions-card__check">✓</span>
                <div className="sessions-card__bullet-body">
                  <div className="sessions-card__bullet-title">Suggests personalized organization</div>
                  <div className="sessions-card__bullet-desc">You review and approve before any changes are made</div>
                </div>
              </div>
              <div className="sessions-card__divider"></div>
              <div className="sessions-card__note">Takes 10–15 seconds • Nothing changes until you approve</div>
            </div>
            <div className="sessions-card__actions">
              <div className="sessions-card__option" title="This feature, in addition to scanning all current bookmarks, will also scan and categorize all your currently open tabs.">
                <label className="sessions-option__label">
                  <input
                    type="checkbox"
                    className="sessions-option__checkbox"
                    checked={scanEntireSession}
                    onChange={(e) => setScanEntireSession(e.target.checked)}
                  />
                  <span className="sessions-option__text">Scan entire session</span>
                </label>
              </div>
              <button
                onClick={handleScanLibrary}
                disabled={!isInitialized || aiLoading}
                className="sessions-card__scan-btn"
              >
                {(!isInitialized || aiLoading) ? (
                  <>
                    <span className="sessions-card__btn-icon">⚙️</span>
                    Initializing AI...
                  </>
                ) : (
                  <>
                    <span className="sessions-card__btn-icon">✨</span>
                    Scan My Library
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {aiError && (
          <div className="sessions-tab__ai-error">
            <p>Error: {aiError}</p>
          </div>
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
