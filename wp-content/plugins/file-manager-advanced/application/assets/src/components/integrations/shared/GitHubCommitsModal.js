import React, { useEffect, useState } from 'react';

/**
 * GitHub Commits Modal Component
 * Shows GitHub commits in a modal popup
 */
export default function GitHubCommitsModal({ 
  isOpen, 
  onClose, 
  commits, 
  repo, 
  branch, 
  loading 
}) {
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    if (isOpen) {
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  return (
    <div 
      id="afmp-commits-modal"
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.7)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: windowWidth <= 1024 ? '15px' : '20px',
        overflowY: 'auto',
      }}
    >
      <div 
        className="afmp-status-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          width: windowWidth <= 480 ? 'calc(100% - 40px)' : windowWidth <= 768 ? 'calc(100% - 40px)' : windowWidth <= 1024 ? '85%' : '90%',
          maxWidth: '900px',
          maxHeight: windowWidth <= 1024 ? '85vh' : 'calc(100vh - 40px)',
          padding: windowWidth <= 480 ? '15px' : windowWidth <= 768 ? '15px' : windowWidth <= 1024 ? '18px' : '20px',
          borderRadius: '5px',
          overflowY: 'auto',
          position: 'relative',
          margin: 'auto',
        }}
      >
        <span 
          className="afmp-close-modal"
          onClick={onClose}
          style={{
            position: 'absolute',
            right: windowWidth <= 480 ? '10px' : '15px',
            top: windowWidth <= 480 ? '10px' : '15px',
            cursor: 'pointer',
            fontSize: windowWidth <= 480 ? '28px' : '24px',
            color: '#666',
            background: 'none',
            border: 'none',
            padding: '5px',
            zIndex: 10,
            minWidth: '30px',
            minHeight: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => e.target.style.color = '#000'}
          onMouseLeave={(e) => e.target.style.color = '#666'}
        >
          &times;
        </span>
        
        <h2 style={{ 
          margin: '0 0 20px 0', 
          color: '#1d2327', 
          fontSize: windowWidth <= 768 ? '18px' : '20px',
          paddingRight: '30px',
        }}>
          GitHub Commits
        </h2>
        
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <p>Loading commits...</p>
          </div>
        ) : (
          <>
            {/* Repository Info Header */}
            <div 
              className="afmp-commits-header"
              style={{
                background: '#f8f9fa',
                padding: windowWidth <= 768 ? '12px' : '15px',
                margin: windowWidth <= 768 ? '-15px -15px 15px -15px' : '-20px -20px 20px -20px',
                borderBottom: '1px solid #dee2e6',
              }}
            >
              <p style={{ 
                margin: 0, 
                fontSize: windowWidth <= 768 ? '12px' : '14px', 
                color: '#495057',
                lineHeight: windowWidth <= 768 ? '1.6' : '1.5',
              }}>
                {windowWidth <= 768 ? (
                  <>
                    <div><strong>Repository:</strong> {repo || 'N/A'}</div>
                    <div><strong>Branch:</strong> {branch || 'N/A'}</div>
                    <div><strong>Total Commits:</strong> {commits ? commits.length : 0}</div>
                  </>
                ) : (
                  <>
                    <strong>Repository:</strong> {repo || 'N/A'} 
                    {' | '}
                    <strong>Branch:</strong> {branch || 'N/A'} 
                    {' | '}
                    <strong>Total Commits:</strong> {commits ? commits.length : 0}
                  </>
                )}
              </p>
            </div>

            {/* Commits List */}
            <div id="afmp-commits-list">
              {!commits || commits.length === 0 ? (
                <p style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                  No commits found in this branch.
                </p>
              ) : (
                <div 
                  className="afmp-commits-container"
                  style={{
                    maxHeight: windowWidth <= 768 ? '400px' : '500px',
                    overflowY: 'auto',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    background: 'white',
                  }}
                >
                  {commits.map((commit, index) => (
                    <div 
                      key={index}
                      className="afmp-commit-item"
                      style={{
                        padding: '15px',
                        borderBottom: index < commits.length - 1 ? '1px solid #ddd' : 'none',
                        background: '#f9f9f9',
                        marginBottom: index < commits.length - 1 ? '10px' : '0',
                        borderRadius: '4px',
                        position: 'relative',
                      }}
                    >
                      <div 
                        className="afmp-commit-header"
                        style={{
                          display: 'flex',
                          flexDirection: windowWidth <= 480 ? 'column' : 'row',
                          justifyContent: 'space-between',
                          alignItems: windowWidth <= 480 ? 'flex-start' : 'center',
                          marginBottom: '8px',
                          gap: windowWidth <= 480 ? '5px' : '0',
                        }}
                      >
                        <span 
                          className="afmp-commit-sha"
                          style={{
                            fontFamily: 'monospace',
                            background: '#e1e1e1',
                            padding: '2px 6px',
                            borderRadius: '3px',
                            fontSize: '12px',
                            color: '#666',
                          }}
                        >
                          {commit.sha}
                        </span>
                        <span 
                          className="afmp-commit-date"
                          style={{
                            fontSize: '12px',
                            color: '#666',
                          }}
                        >
                          {formatDate(commit.date)}
                        </span>
                      </div>
                      <div 
                        className="afmp-commit-message"
                        style={{
                          fontWeight: 600,
                          marginBottom: '5px',
                          color: '#333',
                          lineHeight: '1.4',
                        }}
                        dangerouslySetInnerHTML={{ __html: escapeHtml(commit.message) }}
                      />
                      <div 
                        className="afmp-commit-author"
                        style={{
                          fontSize: '12px',
                          color: '#666',
                          marginBottom: '10px',
                        }}
                      >
                        by {escapeHtml(commit.author)}
                      </div>
                      <div 
                        className="afmp-commit-actions-view-github"
                        style={{
                          textAlign: 'right',
                        }}
                      >
                        <a 
                          href={commit.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="button button-small"
                          style={{
                            fontSize: '11px',
                            padding: '4px 8px',
                            height: 'auto',
                            lineHeight: '1.2',
                            minHeight: '24px',
                            borderRadius: '3px',
                            textDecoration: 'none',
                            background: '#0073aa',
                            color: 'white',
                            border: '1px solid #0073aa',
                            display: 'inline-block',
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = '#005a87';
                            e.target.style.borderColor = '#005a87';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = '#0073aa';
                            e.target.style.borderColor = '#0073aa';
                          }}
                        >
                          View on GitHub
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

