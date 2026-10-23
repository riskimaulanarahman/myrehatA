import React, { useState, useEffect, useRef, useCallback } from 'react';
import { formStyles } from './shared/IntegrationFormStyles';
import ConfirmationModal from './shared/ConfirmationModal';
import GitHubCommitsModal from './shared/GitHubCommitsModal';
import GitHubPushModal from './shared/GitHubPushModal';

/**
 * GitHub Integration Component
 */
export default function GitHub({ settings, hasPro, root, nonce, setMessage, onSettingsRefresh }) {
  // Use GitHub-specific AJAX nonce if available, otherwise fallback to REST nonce
  const githubNonce = settings.ajax_nonce || nonce;
  const ajaxUrl = settings.ajax_url || window.afmReact?.ajaxUrl || '/wp-admin/admin-ajax.php';
  const storedPat = settings.pat || settings.token || '';
  const [fetchingRepos, setFetchingRepos] = useState(false);
  const [fetchingBranches, setFetchingBranches] = useState(false);
  const [repositories, setRepositories] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(settings.repo || '');
  const [selectedBranch, setSelectedBranch] = useState(settings.branch || '');
  const [tokenValid, setTokenValid] = useState(false);
  const [validatingToken, setValidatingToken] = useState(false);
  const [pullingFiles, setPullingFiles] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [pushingFiles, setPushingFiles] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState(null);
  const [showCommitsModal, setShowCommitsModal] = useState(false);
  const [commits, setCommits] = useState([]);
  const [loadingCommits, setLoadingCommits] = useState(false);
  const [showPushModal, setShowPushModal] = useState(false);
  const [changedFiles, setChangedFiles] = useState([]);
  const [loadingChangedFiles, setLoadingChangedFiles] = useState(false);
  const [showPat, setShowPat] = useState(false);
  const initialRestoreDoneRef = useRef(false);

  const getCredentials = useCallback(() => ({
    username: document.getElementById('username')?.value || settings.username || '',
    token: document.getElementById('pat')?.value || storedPat,
  }), [settings.username, storedPat]);

  const loadRepositories = useCallback(async ({ silent = false } = {}) => {
    const { username, token } = getCredentials();

    if (!username || !token) {
      if (!silent && setMessage) {
        setMessage({ type: 'error', text: 'Please enter GitHub Username and PAT first.' });
        setTimeout(() => setMessage(null), 3000);
      }
      return false;
    }

    setFetchingRepos(true);
    try {
      const response = await fetch(`${root}file-manager-advanced/v1/integrations/github/fetch-repositories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': nonce
        },
        body: JSON.stringify({
          username,
          token
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setRepositories(data.repositories || []);
        if (!silent && setMessage) {
          setMessage({ type: 'success', text: `Successfully fetched ${data.repositories.length} repositories!` });
          setTimeout(() => setMessage(null), 3000);
        }
        return true;
      }

      const errorMessage = data.message || data.data?.message || 'Failed to fetch repositories';
      if (!silent && setMessage) {
        setMessage({ type: 'error', text: errorMessage });
        setTimeout(() => setMessage(null), 3000);
      }
      return false;
    } catch (error) {
      console.error('Error fetching repositories:', error);
      if (!silent && setMessage) {
        setMessage({ type: 'error', text: 'Failed to fetch repositories. Please try again.' });
        setTimeout(() => setMessage(null), 3000);
      }
      return false;
    } finally {
      setFetchingRepos(false);
    }
  }, [getCredentials, root, nonce, setMessage]);

  const loadBranchesForRepo = useCallback(async (repo, {
    silent = false,
    preferredBranch = '',
    autoSaveDefault = false,
  } = {}) => {
    const { username, token } = getCredentials();

    if (!repo || !username || !token) {
      return false;
    }

    setFetchingBranches(true);
    try {
      const response = await fetch(`${root}file-manager-advanced/v1/integrations/github/fetch-branches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': nonce
        },
        body: JSON.stringify({
          username,
          token,
          repo
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const branchList = data.branches || [];
        setBranches(branchList);

        let branchToSelect = preferredBranch;
        if (!branchToSelect || !branchList.find((b) => b.name === branchToSelect)) {
          const defaultBranch = branchList.find((b) => b.default);
          if (defaultBranch) {
            branchToSelect = defaultBranch.name;
          }
        }

        if (branchToSelect) {
          setSelectedBranch(branchToSelect);
        }

        if (autoSaveDefault && branchToSelect) {
          try {
            const saveFormData = new FormData();
            saveFormData.append('action', 'afmp_save_github_settings');
            saveFormData.append('nonce', githubNonce);
            saveFormData.append('repo', repo);
            saveFormData.append('branch', branchToSelect);

            const saveResponse = await fetch(ajaxUrl, {
              method: 'POST',
              body: saveFormData
            });

            const saveData = await saveResponse.json();

            if (saveData.success) {
              if (onSettingsRefresh) {
                onSettingsRefresh();
              }
              if (!silent && setMessage) {
                setMessage({ type: 'success', text: 'Repository and branch saved successfully!' });
                setTimeout(() => setMessage(null), 3000);
              }
            } else {
              console.error('Failed to save GitHub settings');
            }
          } catch (saveError) {
            console.error('Error saving GitHub settings:', saveError);
          }
        } else if (!silent && setMessage) {
          setMessage({ type: 'success', text: `Successfully fetched branches for ${repo}!` });
          setTimeout(() => setMessage(null), 3000);
        }

        return true;
      }

      const errorMessage = data.message || data.data?.message || 'Failed to fetch branches';
      if (!silent && setMessage) {
        setMessage({ type: 'error', text: errorMessage });
        setTimeout(() => setMessage(null), 3000);
      }
      return false;
    } catch (error) {
      console.error('Error fetching branches:', error);
      if (!silent && setMessage) {
        setMessage({ type: 'error', text: 'Failed to fetch branches. Please try again.' });
        setTimeout(() => setMessage(null), 3000);
      }
      return false;
    } finally {
      setFetchingBranches(false);
    }
  }, [ajaxUrl, getCredentials, githubNonce, nonce, onSettingsRefresh, root, setMessage]);

  // Check if connection is established (username, PAT, and token valid)
  useEffect(() => {
    const checkConnection = async () => {
      // Connection is established if username, PAT exist and token is valid
      if (!settings.username || !storedPat) {
        setIsConnected(false);
        setTokenValid(false);
        return;
      }

      setValidatingToken(true);
      try {
        const response = await fetch(`${root}file-manager-advanced/v1/integrations/github/validate-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': nonce
          },
          body: JSON.stringify({
            token: storedPat
          })
        });

        const data = await response.json();
        const valid = response.ok && data.success;
        setTokenValid(valid);
        setIsConnected(valid);
      } catch (error) {
        console.error('Error validating token:', error);
        setTokenValid(false);
        setIsConnected(false);
      } finally {
        setValidatingToken(false);
      }
    };

    checkConnection();
  }, [settings.username, storedPat, root, nonce]);

  // Restore repository and branch lists after page reload (same as legacy GitHub UI)
  useEffect(() => {
    if (!isConnected || validatingToken || initialRestoreDoneRef.current) {
      return;
    }

    initialRestoreDoneRef.current = true;

    const restoreSavedSelections = async () => {
      const reposLoaded = await loadRepositories({ silent: true });
      if (!reposLoaded || !settings.repo) {
        return;
      }

      setSelectedRepo(settings.repo);
      await loadBranchesForRepo(settings.repo, {
        silent: true,
        preferredBranch: settings.branch || '',
      });
    };

    restoreSavedSelections();
  }, [
    isConnected,
    validatingToken,
    settings.repo,
    settings.branch,
    loadRepositories,
    loadBranchesForRepo,
  ]);

  // Reset restore flag when credentials are cleared
  useEffect(() => {
    if (!settings.username || !storedPat) {
      initialRestoreDoneRef.current = false;
    }
  }, [settings.username, storedPat]);

  // Update selected repo and branch when settings change
  useEffect(() => {
    if (settings.repo) {
      setSelectedRepo(settings.repo);
    }
    if (settings.branch) {
      setSelectedBranch(settings.branch);
    }
  }, [settings.repo, settings.branch]);

  const handleFetchRepositories = async () => {
    await loadRepositories({ silent: false });
  };

  const handleRepoChange = async (e) => {
    const repo = e.target.value;
    setSelectedRepo(repo);
    setBranches([]);
    setSelectedBranch('');

    if (!repo) {
      return;
    }

    await loadBranchesForRepo(repo, {
      silent: false,
      preferredBranch: '',
      autoSaveDefault: true,
    });
  };

  const handlePullFiles = async () => {
    if (!selectedRepo || !selectedBranch) {
      if (setMessage) {
        setMessage({ type: 'error', text: 'Please select a repository and branch first.' });
        setTimeout(() => setMessage(null), 3000);
      }
      return;
    }

    const accessDir = settings.access_dir || 'uploads/afmp-includes/github';
    const confirmMessage = `Are you sure you want to pull all files from <strong>${selectedRepo}</strong> (${selectedBranch} branch)?<br><br>This will download all files from the selected branch to <strong>${accessDir}</strong>. This will overwrite any local changes with the GitHub versions.`;
    
    setConfirmModalConfig({
      title: 'Pull Files from GitHub',
      message: confirmMessage,
      confirmText: 'Yes, Pull Files',
      cancelText: 'Cancel',
      type: 'warning',
      onConfirm: async () => {
        setPullingFiles(true);
        try {
          const formData = new FormData();
          formData.append('action', 'afmp_pull_files');
          formData.append('nonce', githubNonce);
          formData.append('repo', selectedRepo);
          formData.append('branch', selectedBranch);

          const response = await fetch(ajaxUrl, {
            method: 'POST',
            body: formData
          });

          const data = await response.json();

          if (data.success) {
            if (setMessage) {
              setMessage({ type: 'success', text: data.data || 'Files pulled successfully from GitHub!' });
              setTimeout(() => setMessage(null), 5000);
            }
          } else {
            const errorMessage = data.data || 'Failed to pull files from GitHub';
            if (setMessage) {
              setMessage({ type: 'error', text: errorMessage });
              setTimeout(() => setMessage(null), 5000);
            }
          }
        } catch (error) {
          console.error('Error pulling files:', error);
          if (setMessage) {
            setMessage({ type: 'error', text: 'Failed to pull files. Please try again.' });
            setTimeout(() => setMessage(null), 5000);
          }
        } finally {
          setPullingFiles(false);
        }
      }
    });
    setShowConfirmModal(true);
  };

  const handleCheckStatus = async () => {
    if (!selectedRepo || !selectedBranch) {
      if (setMessage) {
        setMessage({ type: 'error', text: 'Please select a repository and branch first.' });
        setTimeout(() => setMessage(null), 3000);
      }
      return;
    }

    setCheckingStatus(true);
    setLoadingCommits(true);
    setShowCommitsModal(true);
    
    try {
      const formData = new FormData();
      formData.append('action', 'afmp_get_commits');
      formData.append('nonce', githubNonce);

      const response = await fetch(ajaxUrl, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        // Set commits data for modal
        const commitsData = data.data?.commits || [];
        setCommits(commitsData);
      } else {
        const errorMessage = data.data || 'Failed to fetch commits';
        setCommits([]);
        if (setMessage) {
          setMessage({ type: 'error', text: errorMessage });
          setTimeout(() => setMessage(null), 5000);
        }
      }
    } catch (error) {
      console.error('Error checking status:', error);
      setCommits([]);
      if (setMessage) {
        setMessage({ type: 'error', text: 'Failed to check status. Please try again.' });
        setTimeout(() => setMessage(null), 5000);
      }
    } finally {
      setCheckingStatus(false);
      setLoadingCommits(false);
    }
  };

  const handlePushFiles = async () => {
    if (!selectedRepo || !selectedBranch) {
      if (setMessage) {
        setMessage({ type: 'error', text: 'Please select a repository and branch first.' });
        setTimeout(() => setMessage(null), 3000);
      }
      return;
    }

    setPushingFiles(true);
    setLoadingChangedFiles(true);
    setShowPushModal(true);
    
    try {
      // Get changed files
      const formData = new FormData();
      formData.append('action', 'afmp_get_changed_files_for_push');
      formData.append('nonce', githubNonce);

      const changedFilesResponse = await fetch(ajaxUrl, {
        method: 'POST',
        body: formData
      });

      const changedFilesData = await changedFilesResponse.json();

      if (changedFilesData.success && changedFilesData.data && changedFilesData.data.files) {
        setChangedFiles(changedFilesData.data.files || []);
      } else {
        setChangedFiles([]);
        if (setMessage) {
          const errorMessage = changedFilesData.data || 'Failed to get changed files';
          setMessage({ type: 'error', text: errorMessage });
          setTimeout(() => setMessage(null), 5000);
        }
      }
    } catch (error) {
      console.error('Error fetching changed files:', error);
      setChangedFiles([]);
      if (setMessage) {
        setMessage({ type: 'error', text: 'Failed to fetch changed files. Please try again.' });
        setTimeout(() => setMessage(null), 5000);
      }
    } finally {
      setPushingFiles(false);
      setLoadingChangedFiles(false);
    }
  };

  const handlePushComplete = () => {
    // Refresh settings or reload if needed
    if (onSettingsRefresh) {
      setTimeout(() => {
        onSettingsRefresh();
      }, 1000);
    }
  };

  const handleDiscardComplete = () => {
    // Page will reload automatically after discard
  };

  const handleChangeConnection = () => {
    const confirmMessage = 'Are you sure you want to change the GitHub connection? This will:<br><br>• Reset your current repository settings<br>• <strong>Remove the ENTIRE GitHub folder</strong> and all its contents<br>• Clear username and token fields<br><br>This action cannot be undone!';
    
    setConfirmModalConfig({
      title: 'Change GitHub Connection',
      message: confirmMessage,
      confirmText: 'Yes, Change Connection & Remove Folder',
      cancelText: 'Cancel',
      type: 'danger',
      onConfirm: async () => {
        // Clear repository and branch via AJAX (same as old system)
        try {
          const formData = new FormData();
          formData.append('action', 'afmp_save_github_settings');
          formData.append('nonce', githubNonce);
          formData.append('ref', 'reset');
          formData.append('repo', '');
          formData.append('branch', '');

          await fetch(ajaxUrl, {
            method: 'POST',
            body: formData
          });
        } catch (error) {
          console.error('Error resetting connection:', error);
        }

        // Clear repository and branch selections
        setSelectedRepo('');
        setSelectedBranch('');
        setRepositories([]);
        setBranches([]);
        initialRestoreDoneRef.current = false;
        setIsConnected(false);
        setTokenValid(false);
        
        // Clear the select elements
        const repoSelect = document.getElementById('repo');
        const branchSelect = document.getElementById('branch');
        if (repoSelect) repoSelect.value = '';
        if (branchSelect) branchSelect.value = '';

        // Clear username and PAT fields
        const usernameInput = document.getElementById('username');
        const patInput = document.getElementById('pat');
        if (usernameInput) {
          usernameInput.value = '';
          usernameInput.disabled = false;
        }
        if (patInput) {
          patInput.value = '';
          patInput.disabled = false;
        }

        // Reload settings to get updated values from backend
        if (setMessage) {
          setMessage({ type: 'success', text: 'Connection cleared. Please enter new GitHub Username and PAT, then save changes.' });
          setTimeout(() => setMessage(null), 3000);
        }

        // Trigger a settings reload by calling parent's refresh function
        if (onSettingsRefresh) {
          setTimeout(() => {
            onSettingsRefresh();
          }, 500);
        }
      }
    });
    setShowConfirmModal(true);
  };

  // Determine if fields should be disabled
  const fieldsDisabled = !hasPro || isConnected;
  const credentialsLocked = isConnected;
  const actionsReady = Boolean(selectedRepo && selectedBranch);
  const actionButtonsDisabled = !hasPro || !actionsReady;

  const getActionButtonStyle = (enabledColor, isBusy) => ({
    padding: '10px 20px',
    background: (actionButtonsDisabled || isBusy) ? '#ccc' : enabledColor,
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: (actionButtonsDisabled || isBusy) ? 'not-allowed' : 'pointer',
    transition: 'background-color 0.2s ease',
    marginRight: '10px',
  });

  return (
    <>
      {/* Alias */}
      <div>
        <label htmlFor="title" style={formStyles.label}>Alias</label>
        <input
          type="text"
          id="title"
          name="title"
          defaultValue={settings.title || 'Github'}
          disabled={!hasPro}
          style={{ ...formStyles.input, maxWidth: '500px' }}
        />
        <p style={formStyles.description}>Enter a title which will be displayed on File Manager</p>
      </div>

      {/* GitHub Email */}
      <div>
        <label htmlFor="email" style={formStyles.label}>GitHub Email</label>
        <input
          type="email"
          id="email"
          name="email"
          defaultValue={settings.email || ''}
          disabled={!hasPro}
          style={{ ...formStyles.input, maxWidth: '500px' }}
        />
        <p style={formStyles.description}>Enter your email which you use for your GitHub account</p>
      </div>

      {/* GitHub Username */}
      <div>
        <label htmlFor="username" style={formStyles.label}>
          GitHub Username <span style={{ color: 'red' }}>*</span>
        </label>
        <input
          type="text"
          id="username"
          name="username"
          defaultValue={settings.username || ''}
          disabled={!hasPro}
          readOnly={credentialsLocked}
          style={{
            ...formStyles.input,
            maxWidth: '500px',
            ...(credentialsLocked ? { background: '#f5f5f5', cursor: 'not-allowed' } : {}),
          }}
        />
        <p style={formStyles.description}>Enter your GitHub username</p>
      </div>

      {/* GitHub PAT */}
      <div>
        <label htmlFor="pat" style={formStyles.label}>
          GitHub PAT <span style={{ color: 'red' }}>*</span>
        </label>
        <div style={{ position: 'relative', maxWidth: '500px' }}>
          <input
            type={showPat ? 'text' : 'password'}
            id="pat"
            name="pat"
            defaultValue={storedPat}
            disabled={!hasPro}
            readOnly={credentialsLocked}
            style={{
              ...formStyles.input,
              paddingRight: '40px',
              ...(credentialsLocked ? { background: '#f5f5f5', cursor: 'not-allowed' } : {}),
            }}
          />
          <button
            type="button"
            onClick={() => setShowPat(!showPat)}
            disabled={!hasPro || credentialsLocked}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: (!hasPro || credentialsLocked) ? 'not-allowed' : 'pointer',
              padding: '5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666',
              zIndex: 10,
              opacity: (!hasPro || credentialsLocked) ? 0.5 : 1,
            }}
            title={showPat ? 'Hide PAT' : 'Show PAT'}
          >
            {showPat ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            )}
          </button>
        </div>
        <p style={formStyles.description}>
          Enter GitHub Personal Access Token (PAT) for your account{' '}
          <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" style={formStyles.link}>
            Click here to get Github PAT
          </a>
        </p>
      </div>

      {/* GitHub Access Directory */}
      <div>
        <label htmlFor="access_dir" style={formStyles.label}>GitHub Access Directory</label>
        <input
          type="text"
          id="access_dir"
          value={settings.access_dir || 'uploads/afmp-includes/github'}
          readOnly
          disabled={!hasPro}
          style={{ ...formStyles.input, maxWidth: '500px', background: '#f5f5f5', cursor: 'not-allowed' }}
        />
        <p style={formStyles.description}>Your GitHub files will be saved in this directory.</p>
      </div>

      {/* GitHub Master Access Directory */}
      <div>
        <label htmlFor="master_dir" style={formStyles.label}>GitHub Master Access Directory</label>
        <input
          type="text"
          id="master_dir"
          name="master_dir"
          defaultValue={settings.master_dir || ''}
          disabled={!hasPro}
          style={{ ...formStyles.input, maxWidth: '500px' }}
        />
        <p style={formStyles.description}>This field is not a required, and if left empty all configuration will apply to the whole repository</p>
      </div>

      {/* GitHub Actions Section - Only show if connection is established */}
      {isConnected && !validatingToken ? (
        <>
          {/* Fetch Repositories Button */}
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e5e5e5' }}>
            <label style={formStyles.label}>GitHub Actions</label>
            <div style={{ marginTop: '10px' }}>
              <button
                type="button"
                onClick={handleFetchRepositories}
                disabled={!hasPro || fetchingRepos || fetchingBranches}
                style={{
                  ...formStyles.installButton,
                  background: (!hasPro || fetchingRepos) ? '#ccc' : '#3F6972',
                  cursor: (!hasPro || fetchingRepos) ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (!e.target.disabled) {
                    e.target.style.background = '#2d555e';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.target.disabled) {
                    e.target.style.background = '#3F6972';
                  }
                }}
              >
                {fetchingRepos ? 'Fetching...' : (fetchingBranches && repositories.length === 0 ? 'Restoring...' : 'Fetch Repositories')}
              </button>
              <p style={formStyles.description}>
                Click this button to fetch your GitHub repositories. Make sure you have entered your Username and PAT above.
              </p>
            </div>
          </div>

          {/* GitHub Repository */}
          <div style={{ marginTop: '20px' }}>
            <label htmlFor="repo" style={formStyles.label}>GitHub Repository</label>
            <select
              id="repo"
              name="repo"
              value={selectedRepo}
              onChange={handleRepoChange}
              disabled={!hasPro || fetchingBranches}
              style={{ ...formStyles.input, maxWidth: '500px' }}
            >
              <option value="">Select Repository</option>
              {repositories.map((repo) => (
                <option key={repo.full_name} value={repo.name}>
                  {repo.full_name}
                </option>
              ))}
              {selectedRepo && !repositories.find(r => r.name === selectedRepo) && (
                <option value={selectedRepo} selected>{selectedRepo}</option>
              )}
            </select>
            <p style={formStyles.description}>Click the drop-down and select a repository</p>
          </div>

          {/* GitHub Branch */}
          <div>
            <label htmlFor="branch" style={formStyles.label}>GitHub Branch</label>
            <select
              id="branch"
              name="branch"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              disabled={!hasPro || !selectedRepo || fetchingBranches}
              style={{ ...formStyles.input, maxWidth: '500px' }}
            >
              <option value="">Select Branch</option>
              {branches.map((branch) => (
                <option key={branch.name} value={branch.name}>
                  {branch.name} {branch.default ? '(Default)' : ''}
                </option>
              ))}
              {selectedBranch && !branches.find(b => b.name === selectedBranch) && (
                <option value={selectedBranch} selected>{selectedBranch}</option>
              )}
            </select>
            <p style={formStyles.description}>
              Click the drop-down and select a branch (Main/Master/Dev branch is selected by default)
            </p>
          </div>

          {/* GitHub Actions Buttons - visible when connected; enabled after repo + branch selected */}
          <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #e5e5e5' }}>
            <div style={{ marginTop: '15px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <button
                type="button"
                onClick={handlePullFiles}
                disabled={actionButtonsDisabled || pullingFiles}
                style={getActionButtonStyle('#28a745', pullingFiles)}
                onMouseEnter={(e) => {
                  if (!e.target.disabled) {
                    e.target.style.background = '#218838';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.target.disabled) {
                    e.target.style.background = '#28a745';
                  }
                }}
              >
                {pullingFiles ? 'Pulling files...' : 'Pull Files from GitHub'}
              </button>
              <button
                type="button"
                onClick={handleCheckStatus}
                disabled={actionButtonsDisabled || checkingStatus}
                style={getActionButtonStyle('#17a2b8', checkingStatus)}
                onMouseEnter={(e) => {
                  if (!e.target.disabled) {
                    e.target.style.background = '#138496';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.target.disabled) {
                    e.target.style.background = '#17a2b8';
                  }
                }}
              >
                {checkingStatus ? 'Checking...' : 'Check Status'}
              </button>
              <button
                type="button"
                onClick={handlePushFiles}
                disabled={actionButtonsDisabled || pushingFiles}
                style={getActionButtonStyle('#007cba', pushingFiles)}
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
                {pushingFiles ? 'Pushing...' : 'Push All Changes to GitHub'}
              </button>
              <button
                type="button"
                onClick={handleChangeConnection}
                disabled={!hasPro}
                style={{
                  padding: '10px 20px',
                  background: !hasPro ? '#ccc' : '#f8d7da',
                  color: !hasPro ? '#666' : '#dc3545',
                  border: !hasPro ? '1px solid #ccc' : '1px solid #dc3545',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: !hasPro ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s ease, border-color 0.2s ease',
                  marginRight: '10px',
                }}
                onMouseEnter={(e) => {
                  if (!e.target.disabled) {
                    e.target.style.background = '#f5c6cb';
                    e.target.style.borderColor = '#c82333';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.target.disabled) {
                    e.target.style.background = '#f8d7da';
                    e.target.style.borderColor = '#dc3545';
                  }
                }}
              >
                Change Connection
              </button>
            </div>
            {!actionsReady && (
              <p style={{ ...formStyles.description, marginTop: '12px' }}>
                Select a GitHub repository and branch to enable Pull, Check Status, and Push actions.
              </p>
            )}
          </div>
        </>
      ) : (
        !validatingToken && (
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e5e5e5' }}>
            <div style={{
              background: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderLeft: '4px solid #f39c12',
              padding: '12px',
              borderRadius: '4px'
            }}>
              <p style={{ margin: 0, color: '#856404', fontWeight: 600 }}>
                {!settings.username || !storedPat ? 
                  'Please enter your GitHub Username and PAT above, then save changes to enable GitHub Actions.' :
                  'GitHub credentials validation failed. Please check your Username and PAT, then save changes again.'}
              </p>
            </div>
          </div>
        )
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && confirmModalConfig && (
        <ConfirmationModal
          isOpen={showConfirmModal}
          onClose={() => {
            setShowConfirmModal(false);
            setConfirmModalConfig(null);
          }}
          onConfirm={confirmModalConfig.onConfirm}
          title={confirmModalConfig.title}
          message={confirmModalConfig.message}
          confirmText={confirmModalConfig.confirmText}
          cancelText={confirmModalConfig.cancelText}
          type={confirmModalConfig.type}
        />
      )}

      {/* GitHub Commits Modal */}
      <GitHubCommitsModal
        isOpen={showCommitsModal}
        onClose={() => setShowCommitsModal(false)}
        commits={commits}
        repo={selectedRepo}
        branch={selectedBranch}
        loading={loadingCommits}
      />

      {/* GitHub Push Modal */}
      <GitHubPushModal
        isOpen={showPushModal}
        onClose={() => {
          setShowPushModal(false);
          setChangedFiles([]);
        }}
        changedFiles={changedFiles}
        repo={selectedRepo}
        branch={selectedBranch}
        loading={loadingChangedFiles}
        onPush={handlePushComplete}
        onDiscard={handleDiscardComplete}
        githubNonce={githubNonce}
        ajaxUrl={ajaxUrl}
        setMessage={setMessage}
      />
    </>
  );
}
