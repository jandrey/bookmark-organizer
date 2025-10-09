/**
 * Health Tab Component
 * 
 * Features:
 * - Displays summary counters: Total Issues, Critical, Warnings
 * - Sections: Duplicates, Dead Links, Title Cleanup
 * - Each action updates state and triggers snackbar
 * - Fix actions for different issue types
 */

import React, { useState, useMemo } from 'react';
import type { HealthIssue } from '../types';

interface HealthTabProps {
  issues: HealthIssue[];
  onUpdateIssues: (issues: HealthIssue[]) => void;
}

export const HealthTab: React.FC<HealthTabProps> = ({
  issues,
  onUpdateIssues,
}) => {
  const [activeSection, setActiveSection] = useState<'duplicates' | 'dead_links' | 'titles' | 'all'>('all');
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  // Calculate health statistics
  const healthStats = useMemo(() => {
    const total = issues.length;
    const critical = issues.filter(i => i.severity === 'critical').length;
    const warnings = issues.filter(i => i.severity === 'warning').length;
    const info = issues.filter(i => i.severity === 'info').length;
    
    return { total, critical, warnings, info };
  }, [issues]);

  // Filter issues by section
  const filteredIssues = useMemo(() => {
    if (activeSection === 'all') return issues;
    
    return issues.filter(issue => {
      switch (activeSection) {
        case 'duplicates':
          return issue.type === 'duplicate';
        case 'dead_links':
          return issue.type === 'dead_link';
        case 'titles':
          return issue.type === 'bad_title';
        default:
          return true;
      }
    });
  }, [issues, activeSection]);

  const handleScanHealth = async () => {
    setIsScanning(true);
    try {
      // Simulate health scan
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate mock health issues
      const newIssues: HealthIssue[] = [
        {
          id: 'h1',
          type: 'duplicate',
          severity: 'critical',
          title: 'Duplicate Bookmarks Found',
          description: '3 duplicate bookmarks detected in your collection',
          affectedBookmarks: ['b1', 'b2', 'b3'],
          fixAction: 'Merge'
        },
        {
          id: 'h2',
          type: 'dead_link',
          severity: 'warning',
          title: 'Dead Links Detected',
          description: '2 bookmarks have broken or inaccessible URLs',
          affectedBookmarks: ['b4', 'b5'],
          fixAction: 'Fix'
        },
        {
          id: 'h3',
          type: 'bad_title',
          severity: 'warning',
          title: 'Poor Quality Titles',
          description: '5 bookmarks have unclear or generic titles',
          affectedBookmarks: ['b6', 'b7', 'b8', 'b9', 'b10'],
          fixAction: 'Clean'
        },
        {
          id: 'h4',
          type: 'missing_tags',
          severity: 'info',
          title: 'Missing Tags',
          description: '12 bookmarks could benefit from tags for better organization',
          affectedBookmarks: ['b11', 'b12', 'b13'],
          fixAction: 'Tag'
        }
      ];
      
      onUpdateIssues(newIssues);
      showSnackbarMessage('Health scan completed! Found ' + newIssues.length + ' issues.');
    } catch (error) {
      showSnackbarMessage('Health scan failed. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleFixIssue = async (issue: HealthIssue) => {
    try {
      // Simulate fix operation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Remove the fixed issue
      const updatedIssues = issues.filter(i => i.id !== issue.id);
      onUpdateIssues(updatedIssues);
      
      showSnackbarMessage(`Fixed: ${issue.title}`);
    } catch (error) {
      showSnackbarMessage('Failed to fix issue. Please try again.');
    }
  };

  const handleFixAll = async (issueType: HealthIssue['type']) => {
    try {
      const issuesToFix = issues.filter(i => i.type === issueType);
      
      for (const issue of issuesToFix) {
        await handleFixIssue(issue);
      }
      
      showSnackbarMessage(`Fixed all ${issueType} issues!`);
    } catch (error) {
      showSnackbarMessage('Failed to fix all issues. Please try again.');
    }
  };

  const showSnackbarMessage = (message: string) => {
    setSnackbarMessage(message);
    setShowSnackbar(true);
    setTimeout(() => setShowSnackbar(false), 3000);
  };

  const getSeverityColor = (severity: HealthIssue['severity']) => {
    switch (severity) {
      case 'critical': return '#ff4444';
      case 'warning': return '#ffaa00';
      case 'info': return '#4488ff';
      default: return '#888';
    }
  };

  const getSeverityIcon = (severity: HealthIssue['severity']) => {
    switch (severity) {
      case 'critical': return '🚨';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📋';
    }
  };

  const getTypeIcon = (type: HealthIssue['type']) => {
    switch (type) {
      case 'duplicate': return '📋';
      case 'dead_link': return '🔗';
      case 'bad_title': return '📝';
      case 'missing_tags': return '🏷️';
      default: return '❓';
    }
  };

  return (
    <div className="health-tab">
      <div className="health-tab__header">
        <h3>🔍 Health</h3>
        <p>Monitor and fix issues with your bookmark collection</p>
      </div>

      <div className="health-tab__actions">
        <button
          onClick={handleScanHealth}
          disabled={isScanning}
          className="health-scan-btn"
        >
          {isScanning ? (
            <>
              <div className="spinner"></div>
              Scanning...
            </>
          ) : (
            <>
              🔍 Scan Health
            </>
          )}
        </button>
      </div>

      <div className="health-tab__stats">
        <div className="health-stat">
          <span className="stat-number">{healthStats.total}</span>
          <span className="stat-label">Total Issues</span>
        </div>
        <div className="health-stat critical">
          <span className="stat-number">{healthStats.critical}</span>
          <span className="stat-label">Critical</span>
        </div>
        <div className="health-stat warning">
          <span className="stat-number">{healthStats.warnings}</span>
          <span className="stat-label">Warnings</span>
        </div>
        <div className="health-stat info">
          <span className="stat-number">{healthStats.info}</span>
          <span className="stat-label">Info</span>
        </div>
      </div>

      <div className="health-tab__sections">
        <div className="health-sections">
          <button
            className={`health-section-btn ${activeSection === 'all' ? 'active' : ''}`}
            onClick={() => setActiveSection('all')}
          >
            All Issues ({healthStats.total})
          </button>
          <button
            className={`health-section-btn ${activeSection === 'duplicates' ? 'active' : ''}`}
            onClick={() => setActiveSection('duplicates')}
          >
            📋 Duplicates ({issues.filter(i => i.type === 'duplicate').length})
          </button>
          <button
            className={`health-section-btn ${activeSection === 'dead_links' ? 'active' : ''}`}
            onClick={() => setActiveSection('dead_links')}
          >
            🔗 Dead Links ({issues.filter(i => i.type === 'dead_link').length})
          </button>
          <button
            className={`health-section-btn ${activeSection === 'titles' ? 'active' : ''}`}
            onClick={() => setActiveSection('titles')}
          >
            📝 Titles ({issues.filter(i => i.type === 'bad_title').length})
          </button>
        </div>
      </div>

      <div className="health-tab__issues">
        {filteredIssues.length === 0 ? (
          <div className="health-empty">
            <p>🎉 No issues found!</p>
            <p>Your bookmark collection is healthy</p>
          </div>
        ) : (
          filteredIssues.map(issue => (
            <div key={issue.id} className="health-issue">
              <div className="health-issue__header">
                <div className="health-issue__icon">
                  {getTypeIcon(issue.type)}
                </div>
                <div className="health-issue__title">
                  <h4>{issue.title}</h4>
                  <span
                    className="severity-badge"
                    style={{ backgroundColor: getSeverityColor(issue.severity) }}
                  >
                    {getSeverityIcon(issue.severity)} {issue.severity}
                  </span>
                </div>
              </div>
              
              <div className="health-issue__body">
                <p className="health-issue__description">{issue.description}</p>
                <div className="health-issue__affected">
                  <span>{issue.affectedBookmarks.length} bookmarks affected</span>
                </div>
              </div>
              
              <div className="health-issue__actions">
                <button
                  onClick={() => handleFixIssue(issue)}
                  className="health-fix-btn"
                >
                  {issue.fixAction || 'Fix'}
                </button>
                <button
                  onClick={() => handleFixAll(issue.type)}
                  className="health-fix-all-btn"
                >
                  Fix All {issue.type.replace('_', ' ')}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showSnackbar && (
        <div className="health-snackbar">
          <span>{snackbarMessage}</span>
          <button
            onClick={() => setShowSnackbar(false)}
            className="snackbar-close"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default HealthTab;
