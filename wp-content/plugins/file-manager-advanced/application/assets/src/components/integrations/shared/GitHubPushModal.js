import React, { useState, useEffect } from 'react';
import ConfirmationModal from './ConfirmationModal';

/**
 * GitHub Push Modal Component
 * Shows changed files and allows pushing to GitHub
 */
export default function GitHubPushModal({ 
  isOpen, 
  onClose, 
  changedFiles, 
  repo, 
  branch, 
  loading,
  onPush,
  onDiscard,
  githubNonce,
  ajaxUrl,
  setMessage
}) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectAll, setSelectAll] = useState(true);
  const [commitMessage, setCommitMessage] = useState('Updated files via AFM');
  const [commitDescription, setCommitDescription] = useState('');
  const [pushing, setPushing] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Initialize with all files selected
      if (changedFiles && changedFiles.length > 0) {
        setSelectedFiles(changedFiles.map(f => f.path));
        setSelectAll(true);
      }
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, changedFiles]);

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

  useEffect(() => {
    // Update selectAll state based on selectedFiles
    if (changedFiles && changedFiles.length > 0) {
      setSelectAll(selectedFiles.length === changedFiles.length);
    }
  }, [selectedFiles, changedFiles]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSelectAll = (checked) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedFiles(changedFiles.map(f => f.path));
    } else {
      setSelectedFiles([]);
    }
  };

  const handleFileToggle = (filePath, checked) => {
    if (checked) {
      setSelectedFiles([...selectedFiles, filePath]);
    } else {
      setSelectedFiles(selectedFiles.filter(p => p !== filePath));
    }
  };

  const handlePush = async () => {
    if (selectedFiles.length === 0) {
      if (setMessage) {
        setMessage({ type: 'warning', text: 'Please select at least one file to push' });
        setTimeout(() => setMessage(null), 3000);
      }
      return;
    }

    if (!commitMessage.trim()) {
      if (setMessage) {
        setMessage({ type: 'warning', text: 'Please enter a commit message' });
        setTimeout(() => setMessage(null), 3000);
      }
      return;
    }

    setPushing(true);
    try {
      const formData = new FormData();
      formData.append('action', 'afmp_push_files_with_summary');
      formData.append('nonce', githubNonce);
      // Send each file separately as array (like jQuery does)
      // This ensures PHP receives it as an array, not a JSON string
      selectedFiles.forEach(file => {
        formData.append('selected_files[]', file);
      });
      formData.append('commit_message', commitMessage.trim());
      formData.append('commit_description', commitDescription.trim());

      const response = await fetch(ajaxUrl, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        const result = data.data;
        let message = `Successfully created commit with ${result.pushed_count} file(s)!`;
        
        if (result.commit_url) {
          message += `\n\nView Commit on GitHub: ${result.commit_url}`;
        }
        
        if (result.commit_sha) {
          message += `\nCommit SHA: ${result.commit_sha.substring(0, 7)}`;
        }
        
        if (result.failed_count > 0) {
          message += `\n\nSome files failed:`;
          result.failed_files.forEach(failed => {
            message += `\n• ${failed.file}: ${failed.error}`;
          });
        }
        
        if (setMessage) {
          setMessage({ type: 'success', text: message });
          setTimeout(() => setMessage(null), 10000);
        }
        
        onClose();
        if (onPush) {
          onPush();
        }
      } else {
        const errorData = data.data;
        let errorMessage = 'Failed to push files to GitHub!';
        
        if (errorData && errorData.message) {
          errorMessage += '\n\nError: ' + errorData.message;
        }
        
        if (errorData && errorData.failed_files && errorData.failed_files.length > 0) {
          errorMessage += '\n\nFailed files:';
          errorData.failed_files.forEach(failed => {
            errorMessage += `\n• ${failed.file}: ${failed.error}`;
          });
        }
        
        if (setMessage) {
          setMessage({ type: 'error', text: errorMessage });
          setTimeout(() => setMessage(null), 12000);
        }
      }
    } catch (error) {
      console.error('Error pushing files:', error);
      if (setMessage) {
        setMessage({ type: 'error', text: 'Network error occurred while pushing to GitHub' });
        setTimeout(() => setMessage(null), 5000);
      }
    } finally {
      setPushing(false);
    }
  };

  const handleDiscard = async () => {
    if (selectedFiles.length === 0) {
      if (setMessage) {
        setMessage({ type: 'warning', text: 'Please select at least one file to discard changes' });
        setTimeout(() => setMessage(null), 3000);
      }
      return;
    }

    setShowDiscardConfirm(true);
  };

  const confirmDiscard = async () => {
    setShowDiscardConfirm(false);
    setDiscarding(true);
    
    try {
      const formData = new FormData();
      formData.append('action', 'afmp_discard_file_changes');
      formData.append('nonce', githubNonce);
      // Send each file separately as array (like jQuery does)
      // This ensures PHP receives it as an array, not a JSON string
      selectedFiles.forEach(file => {
        formData.append('selected_files[]', file);
      });

      const response = await fetch(ajaxUrl, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        const result = data.data;
        let message = '';
        
        if (result.discarded_count > 0) {
          message = `Successfully discarded changes for ${result.discarded_count} file(s)!`;
        } else {
          message = 'No changes to discard. Files are already in sync with GitHub.';
        }
        
        if (result.failed_count > 0) {
          message += '\n\nFailed files:';
          result.failed_files.forEach(failed => {
            message += `\n• ${failed.file}: ${failed.error}`;
          });
        }
        
        if (setMessage) {
          setMessage({ type: 'success', text: message });
          setTimeout(() => setMessage(null), 7000);
        }
        
        onClose();
        if (onDiscard) {
          onDiscard();
        }
        
        // Reload page after 2 seconds to show updated status
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        const errorData = data.data;
        let errorMessage = 'Failed to discard changes!';
        
        if (errorData && errorData.failed_files && errorData.failed_files.length > 0) {
          errorMessage += '\n\nErrors:';
          errorData.failed_files.forEach(failed => {
            errorMessage += `\n• ${failed.file}: ${failed.error}`;
          });
        } else if (errorData && errorData.discarded_count === 0 && errorData.failed_count === 0) {
          errorMessage = 'No files were selected or files are already in sync.';
        }
        
        if (setMessage) {
          setMessage({ type: 'error', text: errorMessage });
          setTimeout(() => setMessage(null), 10000);
        }
      }
    } catch (error) {
      console.error('Error discarding changes:', error);
      if (setMessage) {
        setMessage({ type: 'error', text: 'Network error occurred while discarding changes' });
        setTimeout(() => setMessage(null), 5000);
      }
    } finally {
      setDiscarding(false);
    }
  };

  const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  const totalFiles = changedFiles ? changedFiles.length : 0;
  const totalChanges = changedFiles ? changedFiles.reduce((sum, file) => sum + (file.changes_count || 0), 0) : 0;

  return (
    <>
      <div 
        id="afmp-push-modal"
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
          maxWidth: '1200px',
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
            Push Changes to GitHub
          </h2>
          
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <p>Loading changed files...</p>
            </div>
          ) : !changedFiles || changedFiles.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <p>No changed files found. All files are up to date.</p>
            </div>
          ) : (
            <div 
              className="afmp-push-modal-content"
              style={{
                display: 'flex',
                flexDirection: windowWidth <= 1024 ? 'column' : 'row',
                gap: windowWidth <= 768 ? '15px' : '20px',
                maxHeight: windowWidth <= 768 ? '75vh' : '70vh',
                overflow: 'hidden',
              }}
            >
              {/* Left Side - Commit Details Section (Fixed) */}
              <div 
                className="afmp-commit-section"
                style={{
                  flex: windowWidth <= 1024 ? 'none' : '0 0 300px',
                  background: '#f8f9fa',
                  padding: windowWidth <= 480 ? '12px' : windowWidth <= 768 ? '15px' : '20px',
                  borderRadius: '6px',
                  border: '1px solid #e1e5e9',
                  position: windowWidth <= 1024 ? 'static' : 'sticky',
                  top: 0,
                  height: 'fit-content',
                  maxHeight: windowWidth <= 1024 ? 'none' : '60vh',
                  overflowY: 'auto',
                }}
              >
                <h3 style={{ 
                  margin: '0 0 15px 0', 
                  color: '#1d2327', 
                  fontSize: windowWidth <= 480 ? '14px' : '16px', 
                  borderBottom: '1px solid #ddd', 
                  paddingBottom: '10px',
                  wordBreak: 'break-word',
                }}>
                  <span style={{ marginRight: '8px' }}>📝</span> Commit Details
                </h3>
                
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, color: '#1d2327' }}>
                    Commit Message <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    type="text"
                    id="afmp-commit-message"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder="Updated files via AFM"
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, color: '#1d2327' }}>
                    Description (Optional)
                  </label>
                  <textarea
                    id="afmp-commit-description"
                    value={commitDescription}
                    onChange={(e) => setCommitDescription(e.target.value)}
                    rows={3}
                    placeholder="Detailed description of changes..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px',
                      resize: 'vertical',
                      minHeight: '60px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                
                {/* Action buttons */}
                <div 
                  className="afmp-commit-actions"
                  style={{
                    paddingTop: '15px',
                    borderTop: '1px solid #ddd',
                  }}
                >
                  <div 
                    className="afmp-bulk-actions"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: windowWidth <= 480 ? '8px' : '10px',
                    }}
                  >
                    <button
                      type="button"
                      id="afmp-push-selected-btn"
                      onClick={handlePush}
                      disabled={selectedFiles.length === 0 || pushing || !commitMessage.trim()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      padding: windowWidth <= 480 ? '12px 16px' : '10px 16px',
                      fontWeight: 500,
                      textAlign: 'center',
                      width: '100%',
                      boxSizing: 'border-box',
                      background: selectedFiles.length === 0 || pushing || !commitMessage.trim() ? '#ccc' : '#007cba',
                      border: 'none',
                      borderRadius: '4px',
                      color: 'white',
                      cursor: selectedFiles.length === 0 || pushing || !commitMessage.trim() ? 'not-allowed' : 'pointer',
                      fontSize: windowWidth <= 480 ? '12px' : '14px',
                      wordBreak: 'break-word',
                      whiteSpace: windowWidth <= 480 ? 'normal' : 'nowrap',
                    }}
                      onMouseEnter={(e) => {
                        if (!e.target.disabled) {
                          e.target.style.background = '#005a87';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!e.target.disabled) {
                          e.target.style.background = '#007cba';
                        }
                      }}
                    >
                      {pushing ? '⏳ Creating commit...' : selectedFiles.length > 0 ? `📤 Push ${selectedFiles.length} file(s) to GitHub` : '📤 Select files to push'}
                    </button>
                    
                    <button
                      type="button"
                      id="afmp-discard-selected-btn"
                      onClick={handleDiscard}
                      disabled={selectedFiles.length === 0 || discarding}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        padding: windowWidth <= 480 ? '12px 16px' : '10px 16px',
                        fontWeight: 500,
                        textAlign: 'center',
                        width: '100%',
                        boxSizing: 'border-box',
                        background: selectedFiles.length === 0 || discarding ? '#ccc' : '#dc3545',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'white',
                        cursor: selectedFiles.length === 0 || discarding ? 'not-allowed' : 'pointer',
                        fontSize: windowWidth <= 480 ? '12px' : '14px',
                        wordBreak: 'break-word',
                        whiteSpace: windowWidth <= 480 ? 'normal' : 'nowrap',
                      }}
                      onMouseEnter={(e) => {
                        if (!e.target.disabled) {
                          e.target.style.background = '#c82333';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!e.target.disabled) {
                          e.target.style.background = '#dc3545';
                        }
                      }}
                    >
                      {discarding ? '⏳ Discarding changes...' : selectedFiles.length > 0 ? `🗑️ Discard ${selectedFiles.length} file(s) changes` : '🗑️ Select files to discard'}
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Right Side - Files Section (Scrollable) */}
              <div 
                className="afmp-files-section"
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  minWidth: 0,
                }}
              >
                <h3 style={{ 
                  margin: '0 0 15px 0', 
                  color: '#1d2327', 
                  fontSize: windowWidth <= 480 ? '14px' : '16px', 
                  flexShrink: 0,
                  wordBreak: 'break-word',
                }}>
                  <span style={{ marginRight: '8px' }}>📄</span> Changed Files ({totalFiles})
                </h3>
                
                <div 
                  className="afmp-files-selection"
                  style={{
                    padding: '10px',
                    background: '#e7f3ff',
                    borderRadius: '4px',
                    marginBottom: '15px',
                    flexShrink: 0,
                  }}
                >
                  <label style={{ fontWeight: 600, color: '#004085', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      id="afmp-select-all-files"
                      checked={selectAll}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      style={{ margin: 0 }}
                    />
                    Select All Files
                  </label>
                </div>
                
                <div 
                  className="afmp-files-container"
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    maxHeight: windowWidth <= 768 ? '40vh' : '50vh',
                    paddingRight: windowWidth <= 768 ? '5px' : '10px',
                  }}
                >
                  {changedFiles.map((file, index) => {
                    const statusClass = file.status.toLowerCase();
                    const statusIcon = file.status === 'New' ? '➕' : '✏️';
                    const isSelected = selectedFiles.includes(file.path);
                    const borderColor = statusClass === 'new' ? '#28a745' : '#ffc107';
                    const bgColor = statusClass === 'new' ? '#f8fff8' : '#fffef8';
                    
                    return (
                      <div
                        key={index}
                        className={`afmp-file-item ${statusClass}`}
                        style={{
                          border: `1px solid #ddd`,
                          borderLeft: `4px solid ${borderColor}`,
                          borderRadius: '6px',
                          marginBottom: '12px',
                          overflow: 'hidden',
                          background: bgColor,
                        }}
                      >
                        <div
                          className="afmp-file-header"
                          style={{
                            padding: '12px 15px',
                            background: '#fff',
                            borderBottom: '1px solid #eee',
                          }}
                        >
                          <div
                            className="afmp-file-checkbox"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              width: '100%',
                            }}
                          >
                            <input
                              id={`afmp-file-select-${index}`}
                              type="checkbox"
                              className="afmp-file-select"
                              checked={isSelected}
                              onChange={(e) => handleFileToggle(file.path, e.target.checked)}
                              style={{ margin: 0, flexShrink: 0 }}
                            />
                            <span
                              className="afmp-file-status"
                              style={{
                                fontSize: '16px',
                                flexShrink: 0,
                              }}
                              aria-hidden="true"
                            >
                              {statusIcon}
                            </span>
                            <label
                              htmlFor={`afmp-file-select-${index}`}
                              style={{
                                margin: 0,
                                flex: 1,
                                wordBreak: 'break-word',
                                cursor: 'pointer',
                                fontWeight: 700,
                              }}
                            >
                              {escapeHtml(file.path)}
                            </label>
                            <span
                              className="afmp-file-meta"
                              style={{
                                color: '#666',
                                fontSize: '13px',
                                marginLeft: 'auto',
                                flexShrink: 0,
                              }}
                            >
                              ({file.status} - {file.changes_count || 0} changes)
                            </span>
                          </div>
                        </div>
                        
                        {/* File Details */}
                        {file.status === 'New' ? (
                          <div
                            className="afmp-file-details"
                            style={{
                              padding: '15px',
                              background: '#f8f9fa',
                            }}
                          >
                            <p style={{ margin: 0, fontStyle: 'italic' }}>
                              New file - {file.file_size || 0} bytes
                            </p>
                          </div>
                        ) : file.changes && file.changes.length > 0 ? (
                          <div
                            className="afmp-file-details"
                            style={{
                              padding: '15px',
                              background: '#f8f9fa',
                            }}
                          >
                            <div
                              className="afmp-changes-preview"
                              style={{
                                fontSize: '13px',
                              }}
                            >
                              <strong>All Changes ({file.changes.length}):</strong>
                              <div
                                className="afmp-changes-list afmp-scrollable-changes"
                                style={{
                                  marginTop: '10px',
                                  maxHeight: '200px',
                                  overflowY: 'auto',
                                  background: '#f8f9fa',
                                  border: '1px solid #dee2e6',
                                  borderRadius: '4px',
                                  padding: 0,
                                }}
                              >
                                {file.changes.map((change, changeIndex) => (
                                  <div
                                    key={changeIndex}
                                    className={`afmp-change-item change-${change.type}`}
                                    style={{
                                      padding: '8px 12px',
                                      borderBottom: changeIndex < file.changes.length - 1 ? '1px solid #eee' : 'none',
                                    }}
                                  >
                                    <span
                                      className="afmp-line-number"
                                      style={{
                                        color: '#666',
                                        fontWeight: 600,
                                        marginRight: '10px',
                                      }}
                                    >
                                      Line {change.line_number}:
                                    </span>
                                    {change.type === 'added' ? (
                                      <div
                                        className="afmp-change-line added"
                                        style={{
                                          fontFamily: 'monospace',
                                          fontSize: '12px',
                                          padding: '2px 4px',
                                          margin: '2px 0',
                                          borderRadius: '2px',
                                          wordBreak: 'break-all',
                                          background: '#d4edda',
                                          color: '#155724',
                                        }}
                                      >
                                        + {escapeHtml(change.local_line)}
                                      </div>
                                    ) : change.type === 'removed' ? (
                                      <div
                                        className="afmp-change-line removed"
                                        style={{
                                          fontFamily: 'monospace',
                                          fontSize: '12px',
                                          padding: '2px 4px',
                                          margin: '2px 0',
                                          borderRadius: '2px',
                                          wordBreak: 'break-all',
                                          background: '#f8d7da',
                                          color: '#721c24',
                                        }}
                                      >
                                        - {escapeHtml(change.github_line)}
                                      </div>
                                    ) : (
                                      <>
                                        <div
                                          className="afmp-change-line removed"
                                          style={{
                                            fontFamily: 'monospace',
                                            fontSize: '12px',
                                            padding: '2px 4px',
                                            margin: '2px 0',
                                            borderRadius: '2px',
                                            wordBreak: 'break-all',
                                            background: '#f8d7da',
                                            color: '#721c24',
                                          }}
                                        >
                                          - {escapeHtml(change.github_line)}
                                        </div>
                                        <div
                                          className="afmp-change-line added"
                                          style={{
                                            fontFamily: 'monospace',
                                            fontSize: '12px',
                                            padding: '2px 4px',
                                            margin: '2px 0',
                                            borderRadius: '2px',
                                            wordBreak: 'break-all',
                                            background: '#d4edda',
                                            color: '#155724',
                                          }}
                                        >
                                          + {escapeHtml(change.local_line)}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          
          {/* Summary Section */}
          {!loading && changedFiles && changedFiles.length > 0 && (
            <div
              className="afmp-status-summary"
              style={{
                flexShrink: 0,
                marginTop: '15px',
                padding: windowWidth <= 768 ? '12px' : '15px',
                background: '#f0f0f1',
                borderRadius: '4px',
                border: '1px solid #ddd',
                fontSize: windowWidth <= 768 ? '13px' : '14px',
              }}
            >
              <strong>Summary:</strong> {totalFiles} files with {totalChanges} total changes<br />
              <strong>Repository:</strong> {repo || 'N/A'} ({branch || 'N/A'} branch)
            </div>
          )}
        </div>
      </div>

      {/* Discard Confirmation Modal */}
      {showDiscardConfirm && (
        <ConfirmationModal
          isOpen={showDiscardConfirm}
          onClose={() => setShowDiscardConfirm(false)}
          onConfirm={confirmDiscard}
          title="Discard Changes"
          message={`Are you sure you want to discard changes for <strong>${selectedFiles.length} file(s)</strong>?<br><br>Modified files will be restored from GitHub. New local-only files will be deleted. This cannot be undone.`}
          confirmText="Yes, Discard Changes"
          cancelText="Cancel"
          type="danger"
        />
      )}
    </>
  );
}

