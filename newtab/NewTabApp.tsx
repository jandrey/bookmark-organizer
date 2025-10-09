import './styles.css'
import React, { useState } from 'react'
import reactLogo from '../images/react.png'
import { WindowsExplorerBookmarks } from './components/WindowsExplorerBookmarks'
import SidePanel from './components/SidePanel'

/**
 * Main application component for Bookmark Organizer
 * 
 * Features:
 * - Windows Explorer-style bookmark tree
 * - AI-powered bookmark organization
 * - Smart search and categorization
 * - Clean, minimal interface
 * - TypeScript type safety
 * - Performance optimizations
 */
export default function NewTabApp(): React.JSX.Element {
  const [bookmarks, setBookmarks] = useState<Array<{ title: string; url: string }>>([]);
  const [showSidePanel, setShowSidePanel] = useState(false);

  const handleBookmarksOrganized = (organizedFolders: Record<string, number[]>) => {
    console.log('Bookmarks organized into folders:', organizedFolders);
    // You could implement logic to actually reorganize bookmarks here
  };

  const handleBookmarkAnalyzed = (index: number, analysis: any) => {
    console.log(`Bookmark ${index} analyzed:`, analysis);
    // You could update bookmark metadata or UI here
  };

  const handleSearchResults = (indices: number[]) => {
    console.log('Search results:', indices);
    // You could highlight search results in the bookmark tree
  };

  return (
    <div className="app">
      <header>
        <h1>
          <img
            className="react"
            src={reactLogo}
            alt="The React logo"
            width="120px"
          />
          <br />
          Bookmark Organizer
        </h1>
        <p>
          Browse your bookmarks in a Windows Explorer-style tree view with AI-powered organization.
        </p>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            onClick={() => setShowSidePanel(!showSidePanel)}
            style={{
              padding: '0.8rem 1.5rem',
              backgroundColor: '#ff6b35',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1.2rem',
              fontWeight: '500'
            }}
          >
            {showSidePanel ? 'Hide Manager' : 'Show Manager'} 📋
          </button>
        </div>
      </header>

      <main>
        <WindowsExplorerBookmarks />

      </main>

      <SidePanel
        isOpen={showSidePanel}
        onClose={() => setShowSidePanel(false)}
      />
    </div>
  );
}