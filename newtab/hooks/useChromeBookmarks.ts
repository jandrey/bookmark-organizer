import { useMemo } from 'react';
import {
	chromeBookmarkService,
} from '../services/chromeBookmarkService';
import type {
	ChromeBookmark,
	BookmarkTreeNode,
	BookmarkSearchResult,
	BookmarkStats,
} from '../services/chromeBookmarkService';

export type UseChromeBookmarksReturn = {
	getBookmarkTree: () => Promise<BookmarkTreeNode[]>;
	getAllBookmarks: () => Promise<ChromeBookmark[]>;
	searchBookmarks: (query: string) => Promise<BookmarkSearchResult>;
	createBookmark: (bookmark: {
		parentId?: string;
		title: string;
		url?: string;
		index?: number;
	}) => Promise<ChromeBookmark>;
	updateBookmark: (
		id: string,
		changes: { title?: string; url?: string }
	) => Promise<ChromeBookmark>;
	moveBookmark: (
		id: string,
		destination: { parentId?: string; index?: number }
	) => Promise<ChromeBookmark>;
	removeBookmark: (id: string) => Promise<void>;
	removeBookmarkTree: (id: string) => Promise<void>;
	getBookmarkStats: () => Promise<BookmarkStats>;
	getOpenTabs: () => Promise<ChromeBookmark[]>;
	bookmarkCurrentTab: () => Promise<ChromeBookmark>;
	checkUrlHealth: (
		url: string
	) => Promise<{ isAccessible: boolean; statusCode?: number; error?: string }>; 
	findDuplicates: () => Promise<Array<{ group: ChromeBookmark[]; similarity: number }>>;
	getSubTree: (id: string) => Promise<BookmarkTreeNode[]>;
	getChildren: (parentId: string) => Promise<BookmarkTreeNode[]>;
};

/**
 * useChromeBookmarks
 *
 * Hook that exposes only Chrome bookmark operations via the centralized service.
 * Provides stable function references suitable for passing to components/handlers.
 */
export const useChromeBookmarks = (): UseChromeBookmarksReturn => {
	const api = useMemo<UseChromeBookmarksReturn>(() => ({
		getBookmarkTree: () => chromeBookmarkService.getBookmarkTree(),
		getAllBookmarks: () => chromeBookmarkService.getAllBookmarks(),
		searchBookmarks: (query: string) => chromeBookmarkService.searchBookmarks(query),
		createBookmark: (bookmark) => chromeBookmarkService.createBookmark(bookmark),
		updateBookmark: (id, changes) => chromeBookmarkService.updateBookmark(id, changes),
		moveBookmark: (id, destination) => chromeBookmarkService.moveBookmark(id, destination),
		removeBookmark: (id) => chromeBookmarkService.removeBookmark(id),
		removeBookmarkTree: (id) => chromeBookmarkService.removeBookmarkTree(id),
		getBookmarkStats: () => chromeBookmarkService.getBookmarkStats(),
		getOpenTabs: () => chromeBookmarkService.getOpenTabs(),
		bookmarkCurrentTab: () => chromeBookmarkService.bookmarkCurrentTab(),
		checkUrlHealth: (url) => chromeBookmarkService.checkUrlHealth(url),
		findDuplicates: () => chromeBookmarkService.findDuplicates(),
		getSubTree: (id) => chromeBookmarkService.getSubTree(id),
		getChildren: (parentId) => chromeBookmarkService.getChildren(parentId),
	}), []);

	return api;
};

export default useChromeBookmarks;


