import { useState, useEffect, useRef } from 'react';
import { getTabFromHash, setHash, isElFinderHash, getCurrentHash } from '../utils/hash';
import { isFmOnlyAccess } from '../utils/access';

const VALID_TABS = ['dashboard', 'filemanager', 'settings', 'logs', 'notifications', 'extension', 'docs', 'pro', 'planaccess'];
const VALID_INTEGRATION_IDS = ['ai-code-assistent', 'onedrive', 'google-drive', 'dropbox', 'amazon-s3', 'github', 'google-cloud-storage', 'pcloud', 'cloudflare-r2'];
let isUpdatingHashProgrammatically = false;

/**
 * Simple hook for managing tab navigation via URL hash
 * Each tab has its own URL (#/tab) and persists on page reload
 */
export function useHashNavigation() {
  const [activeTab, setActiveTab] = useState(() => {
    if (isFmOnlyAccess()) {
      return 'filemanager';
    }

    // Integration OAuth/disconnect query params must win over stale #/filemanager hash.
    const urlParams = new URLSearchParams(window.location.search);
    const redirectHash = urlParams.get('redirect_hash');
    const dropboxConnected = urlParams.get('dropbox_connected');
    const dropboxDisconnected = urlParams.get('dropbox_disconnected');
    const dropboxError = urlParams.get('dropbox_error');
    const onedriveConnected = urlParams.get('onedrive_connected');
    const onedriveDisconnected = urlParams.get('onedrive_disconnected');
    const onedriveError = urlParams.get('onedrive_error');
    const googledriveConnected = urlParams.get('googledrive_connected');
    const googledriveDisconnected = urlParams.get('googledrive_disconnected');
    const googledriveError = urlParams.get('googledrive_error');
    const errorMsg = urlParams.get('error_msg');
    const disconnectAction = urlParams.get('action');
    const redirectToParam = urlParams.get('redirect_to');
    const googleDriveDisconnectFlow = disconnectAction === 'disconnect-googledrive' ||
      (redirectToParam && (redirectToParam.includes('google-drive') || redirectToParam.includes('googledrive')));

    if (dropboxConnected || dropboxDisconnected || dropboxError ||
        onedriveConnected || onedriveDisconnected || onedriveError ||
        googledriveConnected || googledriveDisconnected || googledriveError) {
      if (dropboxConnected) sessionStorage.setItem('afm-dropbox-connected', '1');
      if (dropboxDisconnected) sessionStorage.setItem('afm-dropbox-disconnected', '1');
      if (dropboxError) sessionStorage.setItem('afm-dropbox-error', '1');
      if (onedriveConnected) sessionStorage.setItem('afm-onedrive-connected', '1');
      if (onedriveDisconnected) sessionStorage.setItem('afm-onedrive-disconnected', '1');
      if (onedriveError) sessionStorage.setItem('afm-onedrive-error', '1');
      if (googledriveConnected) sessionStorage.setItem('afm-googledrive-connected', '1');
      if (googledriveDisconnected) sessionStorage.setItem('afm-googledrive-disconnected', '1');
      if (googledriveError) sessionStorage.setItem('afm-googledrive-error', '1');
      if (errorMsg) {
        if (dropboxError) sessionStorage.setItem('afm-dropbox-error-msg', errorMsg);
        if (onedriveError) sessionStorage.setItem('afm-onedrive-error-msg', errorMsg);
        if (googledriveError) sessionStorage.setItem('afm-googledrive-error-msg', errorMsg);
      }
      if (redirectHash) sessionStorage.setItem('afm-oauth-redirect-hash', redirectHash);
    }

    if (redirectHash || dropboxConnected || dropboxDisconnected || dropboxError ||
        onedriveConnected || onedriveDisconnected || onedriveError ||
        googledriveConnected || googledriveDisconnected || googledriveError || googleDriveDisconnectFlow) {
      let integrationHash = redirectHash || '#/extension/dropbox';

      if (redirectHash) {
        integrationHash = redirectHash;
      } else if (dropboxConnected || dropboxDisconnected || dropboxError) {
        integrationHash = '#/extension/dropbox';
      } else if (onedriveConnected || onedriveDisconnected || onedriveError) {
        integrationHash = '#/extension/onedrive';
      } else if (googledriveConnected || googledriveDisconnected || googledriveError || googleDriveDisconnectFlow) {
        integrationHash = (redirectToParam && redirectToParam.startsWith('#/'))
          ? redirectToParam
          : '#/extension/google-drive';
      }

      if (!integrationHash.startsWith('#/extension/')) {
        if (integrationHash.includes('dropbox')) {
          integrationHash = '#/extension/dropbox';
        } else if (integrationHash.includes('onedrive')) {
          integrationHash = '#/extension/onedrive';
        } else if (integrationHash.includes('googledrive') || integrationHash.includes('google-drive')) {
          integrationHash = '#/extension/google-drive';
        } else {
          integrationHash = '#/extension/dropbox';
        }
      }

      sessionStorage.setItem('afm-oauth-redirect', 'true');
      sessionStorage.setItem('afm-extension-hash-just-set', 'true');
      sessionStorage.setItem('afm-should-restore-tab', 'true');
      sessionStorage.setItem('afm-active-tab', 'extension');
      // Prevent Pro-activation filemanager hijack after OAuth reconnect.
      sessionStorage.removeItem('afm-filemanager-redirect');

      const pageParam = urlParams.get('page') || 'file_manager_advanced_ui';
      const newUrl = window.location.pathname + '?page=' + encodeURIComponent(pageParam) + integrationHash;
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, '', newUrl);
      } else {
        window.location.hash = integrationHash;
      }

      const integrationMatch = integrationHash.match(/extension\/([^/?]+)/);
      if (integrationMatch) {
        sessionStorage.setItem('afm-extension-integration', integrationMatch[1]);
      }

      setTimeout(() => {
        sessionStorage.removeItem('afm-oauth-redirect');
        sessionStorage.removeItem('afm-extension-hash-just-set');
      }, 2000);

      return 'extension';
    }

    // On initial load, read hash immediately
    const hash = getCurrentHash();
    const tab = getTabFromHash();
    
    // CRITICAL: Check for valid tabs in hash FIRST (before any other checks)
    if (hash && tab && VALID_TABS.includes(tab)) {
      if (hash.startsWith('settings/')) {
        const parts = hash.split('/');
        if (parts.length > 1) {
          const subTab = parts[1].split('?')[0];
          sessionStorage.setItem('afm-settings-subtab', subTab);
        }
        sessionStorage.setItem('afm-active-tab', 'settings');
        sessionStorage.setItem('afm-should-restore-tab', 'true');
        return 'settings';
      }
      if (hash.startsWith('notifications/')) {
        const parts = hash.split('/');
        if (parts.length > 1) {
          const subTab = parts[1].split('?')[0];
          if (subTab === 'slack' || subTab === 'email') {
            sessionStorage.setItem('afm-notifications-subtab', subTab);
          }
        }
        sessionStorage.setItem('afm-active-tab', 'notifications');
        sessionStorage.setItem('afm-should-restore-tab', 'true');
        return 'notifications';
      }
      if (tab !== 'filemanager') {
        sessionStorage.setItem('afm-active-tab', tab);
        sessionStorage.setItem('afm-should-restore-tab', 'true');
        return tab;
      }
    }
    
    if (hash === 'settings' || tab === 'settings') {
      const savedSubTab = sessionStorage.getItem('afm-settings-subtab') || 'general-settings';
      const urlHash = `#/settings/${savedSubTab}`;
      if (window.history && window.history.replaceState) {
        const url = window.location.href.split('#')[0] + urlHash;
        window.history.replaceState({}, '', url);
      } else {
        window.location.hash = urlHash;
      }
      sessionStorage.setItem('afm-active-tab', 'settings');
      sessionStorage.setItem('afm-should-restore-tab', 'true');
      return 'settings';
    }
    
    if (hash && hash.startsWith('extension/')) {
      const parts = hash.split('/');
      if (parts.length > 1) {
        const integrationId = parts[1].split('?')[0];
        if (VALID_INTEGRATION_IDS.includes(integrationId)) {
          // Save integration ID to sessionStorage
          sessionStorage.setItem('afm-extension-integration', integrationId);
          // Set restore flags to preserve on reload
          sessionStorage.setItem('afm-should-restore-tab', 'true');
          sessionStorage.setItem('afm-active-tab', 'extension');
          return 'extension';
        }
      }
      return 'extension';
    }
    
    const savedIntegration = sessionStorage.getItem('afm-extension-integration');
    const shouldRestoreTab = sessionStorage.getItem('afm-should-restore-tab') === 'true';
    const savedTab = sessionStorage.getItem('afm-active-tab');
    if (savedIntegration && shouldRestoreTab && savedTab === 'extension') {
      if (VALID_INTEGRATION_IDS.includes(savedIntegration)) {
        // Restore extension hash
        const urlHash = `#/extension/${savedIntegration}`;
        if (window.history && window.history.replaceState) {
          const url = window.location.href.split('#')[0] + urlHash;
          window.history.replaceState(null, '', url);
        } else {
          window.location.hash = urlHash;
        }
        return 'extension';
      }
    }
    
    // Check if this is a redirect after Pro activation/license entry
    // Check this BEFORE elFinder hash check to ensure filemanager is shown
    const filemanagerRedirect = sessionStorage.getItem('afm-filemanager-redirect');
    if (filemanagerRedirect === 'true') {
      // Clear the flag
      sessionStorage.removeItem('afm-filemanager-redirect');
      // Clear any restore flags to ensure filemanager is shown
      sessionStorage.removeItem('afm-should-restore-tab');
      sessionStorage.removeItem('afm-active-tab');
      // Set filemanager hash explicitly
      const urlHash = '#/filemanager';
      if (window.history && window.history.replaceState) {
        const url = window.location.href.split('#')[0] + urlHash;
        window.history.replaceState(null, '', url);
      } else {
        window.location.hash = urlHash;
      }
      return 'filemanager';
    }
    
    // Also check URL parameters for activation indicators
    const hasActivationParam = urlParams.has('fs_action') || 
                               urlParams.has('activation') || 
                               urlParams.has('activated') ||
                               urlParams.has('fs_message') ||
                               urlParams.has('afm_pro_activation') ||
                               window.location.search.includes('activation') ||
                               window.location.search.includes('fs_action') ||
                               window.location.search.includes('afm_pro_activation');
    
    if (hasActivationParam && !hash) {
      // This is likely a redirect after Pro activation
      // Clear any restore flags
      sessionStorage.removeItem('afm-should-restore-tab');
      sessionStorage.removeItem('afm-active-tab');
      // Set filemanager hash explicitly
      const urlHash = '#/filemanager';
      if (window.history && window.history.replaceState) {
        const url = window.location.href.split('#')[0] + urlHash;
        window.history.replaceState(null, '', url);
      } else {
        window.location.hash = urlHash;
      }
      return 'filemanager';
    }
    
    // Check if this is a File Manager menu click (no hash or invalid hash)
    // File Manager menu click should always open filemanager tab
    // We detect this by checking if hash is empty OR if hash is dashboard (which shouldn't be default)
    // BUT: Don't treat as menu click if we have extension restore flags set (from OAuth redirect)
    // CRITICAL: Also don't treat as menu click if we have a valid tab in hash (settings, logs, etc.)
    // Reuse savedIntegration, shouldRestoreTab, savedTab from above (lines 89-92)
    const hasExtensionRestoreFlags = savedIntegration && shouldRestoreTab && savedTab === 'extension';
    
    // CRITICAL: If hash has a valid tab, it's NOT a menu click - preserve the tab
    const hasValidTabInHash = hash && tab && VALID_TABS.includes(tab) && tab !== 'filemanager';
    
    const isFileManagerMenuClick = (!hash || (hash === 'dashboard' && !shouldRestoreTab)) && !hasExtensionRestoreFlags && !hasValidTabInHash;
    
    if (isFileManagerMenuClick) {
      // Clear any restore flag to ensure filemanager is shown
      sessionStorage.removeItem('afm-should-restore-tab');
      sessionStorage.removeItem('afm-active-tab');
      // Set filemanager hash explicitly
      const urlHash = '#/filemanager';
      if (window.history && window.history.replaceState) {
        const url = window.location.href.split('#')[0] + urlHash;
        window.history.replaceState(null, '', url);
      } else {
        window.location.hash = urlHash;
      }
      return 'filemanager';
    }
    
    // Check if we just redirected to notifications (from Slack setup)
    const notificationsRedirect = sessionStorage.getItem('afm-notifications-redirect');
    if (notificationsRedirect === 'true') {
      // Clear the flag
      sessionStorage.removeItem('afm-notifications-redirect');
      // Force notifications tab even if hash is elFinder
      const savedSubTab = sessionStorage.getItem('afm-notifications-subtab') || 'slack';
      const urlHash = `#/notifications/${savedSubTab}`;
      // Set flag to prevent elFinder from overriding
      sessionStorage.setItem('afm-notifications-hash-just-set', 'true');
      if (window.history && window.history.replaceState) {
        const url = window.location.href.split('#')[0] + urlHash;
        window.history.replaceState(null, '', url);
      } else {
        window.location.hash = urlHash;
      }
      // Remove flag after delay
      setTimeout(() => {
        sessionStorage.removeItem('afm-notifications-hash-just-set');
      }, 2000);
      return 'notifications';
    }
    
    // Special handling for notifications - if hash is just 'notifications', fix it immediately
    // But if hash already has sub-tab (notifications/email or notifications/slack), preserve it
    if (hash === 'notifications') {
      const savedSubTab = sessionStorage.getItem('afm-notifications-subtab') || 'email';
      const urlHash = `#/notifications/${savedSubTab}`;
      if (window.history && window.history.replaceState) {
        const url = window.location.href.split('#')[0] + urlHash;
        window.history.replaceState(null, '', url);
      } else {
        window.location.hash = urlHash;
      }
      return 'notifications';
    }
    
    // If hash is notifications/email or notifications/slack, preserve it and save sub-tab to sessionStorage
    if (hash.startsWith('notifications/')) {
      const parts = hash.split('/');
      if (parts.length > 1) {
        const subTab = parts[1].split('?')[0];
        if (subTab === 'slack' || subTab === 'email') {
          // Save sub-tab to sessionStorage immediately on initial load
          sessionStorage.setItem('afm-notifications-subtab', subTab);
        }
      }
      return 'notifications';
    }
    
    // If hash is settings/sub-tab, preserve it and save sub-tab to sessionStorage
    if (hash.startsWith('settings/')) {
      const parts = hash.split('/');
      if (parts.length > 1) {
        const subTab = parts[1].split('?')[0];
        if (subTab === 'general-settings' || subTab === 'advanced-settings') {
          // Save sub-tab to sessionStorage immediately on initial load
          sessionStorage.setItem('afm-settings-subtab', subTab);
          // Preserve the full hash - don't normalize it
          return 'settings';
        }
      }
      return 'settings';
    }
    
    // If hash is just 'settings', check sessionStorage for saved sub-tab
    if (hash === 'settings') {
      const savedSubTab = sessionStorage.getItem('afm-settings-subtab') || 'general-settings';
      // Restore the full hash with sub-tab immediately
      const urlHash = `#/settings/${savedSubTab}`;
      // Set flag to prevent clearing
      sessionStorage.setItem('afm-settings-hash-just-set', 'true');
      if (window.history && window.history.replaceState) {
        const url = window.location.href.split('#')[0] + urlHash;
        window.history.replaceState(null, '', url);
        // Also set directly
        window.location.hash = urlHash;
      } else {
        window.location.hash = urlHash;
      }
      // Remove flag after delay
      setTimeout(() => {
        sessionStorage.removeItem('afm-settings-hash-just-set');
      }, 2000);
      return 'settings';
    }
    
    if (hash.startsWith('extension/')) {
      const parts = hash.split('/');
      if (parts.length > 1) {
        const integrationId = parts[1].split('?')[0];
        if (VALID_INTEGRATION_IDS.includes(integrationId)) {
          // Save integration ID to sessionStorage immediately on initial load
          sessionStorage.setItem('afm-extension-integration', integrationId);
          // Preserve the full hash - don't normalize it
          return 'extension';
        }
      }
      return 'extension';
    }
    
    // If hash is just 'extension', check sessionStorage for saved integration
    if (hash === 'extension') {
      const savedIntegration = sessionStorage.getItem('afm-extension-integration');
      if (savedIntegration) {
        // Restore the full hash with integration ID
        const urlHash = `#/extension/${savedIntegration}`;
        if (window.history && window.history.replaceState) {
          const url = window.location.href.split('#')[0] + urlHash;
          window.history.replaceState(null, '', url);
        } else {
          window.location.hash = urlHash;
        }
      }
      return 'extension';
    }
    
    // If hash has valid tab, use it (preserves tab on page reload)
    if (tab) {
      return tab;
    }
    
    // IMPORTANT: Check if hash is extension/ before elFinder hash check
    // This ensures extension tab is preserved on page reload even if elFinder hash exists
    if (hash && hash.startsWith('extension/')) {
      const parts = hash.split('/');
      if (parts.length > 1) {
        const integrationId = parts[1].split('?')[0];
        if (VALID_INTEGRATION_IDS.includes(integrationId)) {
          sessionStorage.setItem('afm-extension-integration', integrationId);
          sessionStorage.setItem('afm-should-restore-tab', 'true');
          sessionStorage.setItem('afm-active-tab', 'extension');
          return 'extension';
        }
      }
      return 'extension';
    }
    
    // Before checking for elFinder hash, verify we don't have a valid tab
    // This prevents elFinder hash from overriding valid tabs like settings, logs, etc.
    // If we already returned a valid tab above, we shouldn't reach here, but double-check anyway
    if (hash && tab && VALID_TABS.includes(tab) && tab !== 'filemanager') {
      if (tab === 'settings') {
        const savedSubTab = sessionStorage.getItem('afm-settings-subtab') || 'general-settings';
        sessionStorage.setItem('afm-active-tab', 'settings');
        sessionStorage.setItem('afm-should-restore-tab', 'true');
        return 'settings';
      }
      sessionStorage.setItem('afm-active-tab', tab);
      sessionStorage.setItem('afm-should-restore-tab', 'true');
      return tab;
    }
    
    // If hash is elFinder hash, check sessionStorage for saved tab
    if (isElFinderHash(hash)) {
      // Check if we just redirected to notifications (from Slack setup)
      const notificationsRedirect = sessionStorage.getItem('afm-notifications-redirect');
      if (notificationsRedirect === 'true') {
        sessionStorage.removeItem('afm-notifications-redirect');
        // Force notifications tab
        const savedSubTab = sessionStorage.getItem('afm-notifications-subtab') || 'slack';
        const urlHash = `#/notifications/${savedSubTab}`;
        sessionStorage.setItem('afm-notifications-hash-just-set', 'true');
        if (window.history && window.history.replaceState) {
          const url = window.location.href.split('#')[0] + urlHash;
          window.history.replaceState(null, '', url);
        } else {
          window.location.hash = urlHash;
        }
        setTimeout(() => {
          sessionStorage.removeItem('afm-notifications-hash-just-set');
        }, 2000);
        return 'notifications';
      }
      
      // Check for OAuth redirect FIRST (before filemanager redirect)
      // This ensures OAuth redirects to extension tab are not overridden by elFinder hash
      const oauthRedirect = sessionStorage.getItem('afm-oauth-redirect');
      if (oauthRedirect === 'true') {
        // OAuth redirect is being handled, don't override
        return 'extension';
      }
      
      // Also check URL parameters for OAuth redirect
      const urlParams = new URLSearchParams(window.location.search);
      const redirectHash = urlParams.get('redirect_hash');
      const dropboxConnected = urlParams.get('dropbox_connected');
      const dropboxDisconnected = urlParams.get('dropbox_disconnected');
      const onedriveConnected = urlParams.get('onedrive_connected');
      const onedriveDisconnected = urlParams.get('onedrive_disconnected');
      const googledriveConnected = urlParams.get('googledrive_connected');
      const googledriveDisconnected = urlParams.get('googledrive_disconnected');
      const googledriveError = urlParams.get('googledrive_error');
      const disconnectAction = urlParams.get('action');
      const redirectToParam = urlParams.get('redirect_to');
      const googleDriveDisconnectFlow = disconnectAction === 'disconnect-googledrive' ||
        (redirectToParam && (redirectToParam.includes('google-drive') || redirectToParam.includes('googledrive')));
      
      if (redirectHash || dropboxConnected || dropboxDisconnected || 
          onedriveConnected || onedriveDisconnected || 
          googledriveConnected || googledriveDisconnected || googledriveError || googleDriveDisconnectFlow) {
        // OAuth redirect parameters present, force extension tab
        let integrationHash = redirectHash || '#/extension/dropbox';
        
        if (redirectHash) {
          integrationHash = redirectHash;
        } else if (dropboxConnected || dropboxDisconnected) {
          integrationHash = '#/extension/dropbox';
        } else if (onedriveConnected || onedriveDisconnected) {
          integrationHash = '#/extension/onedrive';
        } else if (googledriveConnected || googledriveDisconnected || googledriveError || googleDriveDisconnectFlow) {
          integrationHash = (redirectToParam && redirectToParam.startsWith('#/'))
            ? redirectToParam
            : '#/extension/google-drive';
        }
        
        if (!integrationHash.startsWith('#/extension/')) {
          if (integrationHash.includes('dropbox')) {
            integrationHash = '#/extension/dropbox';
          } else if (integrationHash.includes('onedrive')) {
            integrationHash = '#/extension/onedrive';
          } else if (integrationHash.includes('googledrive') || integrationHash.includes('google-drive')) {
            integrationHash = '#/extension/google-drive';
          } else {
            integrationHash = '#/extension/dropbox';
          }
        }
        
        sessionStorage.setItem('afm-oauth-redirect', 'true');
        sessionStorage.setItem('afm-extension-hash-just-set', 'true');
        
        const pageParam = urlParams.get('page') || 'file_manager_advanced_ui';
        const newUrl = window.location.pathname + '?page=' + encodeURIComponent(pageParam) + integrationHash;
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, '', newUrl);
        } else {
          window.location.hash = integrationHash;
        }
        
        const integrationMatch = integrationHash.match(/extension\/([^/?]+)/);
        if (integrationMatch) {
          sessionStorage.setItem('afm-extension-integration', integrationMatch[1]);
        }
        
        setTimeout(() => {
          sessionStorage.removeItem('afm-oauth-redirect');
          sessionStorage.removeItem('afm-extension-hash-just-set');
        }, 2000);
        
        return 'extension';
      }
      
      // If elFinder hash, check if this is a redirect after Pro activation
      // Check this FIRST before checking restore flags
      // IMPORTANT: Check this BEFORE any restore logic
      const filemanagerRedirect = sessionStorage.getItem('afm-filemanager-redirect');
      if (filemanagerRedirect === 'true') {
        // Clear the flag
        sessionStorage.removeItem('afm-filemanager-redirect');
        // Clear any restore flags - this is critical!
        sessionStorage.removeItem('afm-should-restore-tab');
        sessionStorage.removeItem('afm-active-tab');
        // Set filemanager hash explicitly
        const urlHash = '#/filemanager';
        if (window.history && window.history.replaceState) {
          const url = window.location.href.split('#')[0] + urlHash;
          window.history.replaceState(null, '', url);
        } else {
          window.location.hash = urlHash;
        }
        return 'filemanager';
      }
      
      // SPECIAL CASE: If elFinder hash detected but we're on file_manager_advanced_ui page
      // AND there's no previous navigation state (no referrer or referrer is same page)
      // This likely means it's a fresh page load (not a page reload)
      // In this case, if shouldRestoreTab is true, it might be stale from previous session
      // Check if this is a fresh page load by checking navigation timing
      const navigationType = performance.getEntriesByType('navigation')[0]?.type;
      const referrer = document.referrer;
      
      // Activation / Freemius params only — never substring-match "connect"
      // (that false-matches onedrive_connected and hijacks OAuth returns).
      const hasActivationParam = urlParams.has('fs_action') ||
                                 urlParams.has('activation') ||
                                 urlParams.has('activated') ||
                                 urlParams.has('fs_message') ||
                                 urlParams.has('afm_pro_activation') ||
                                 urlParams.has('connect');
      
      if (hasActivationParam) {
        // This is likely a redirect after Pro activation
        // Set flag to ensure it persists
        sessionStorage.setItem('afm-filemanager-redirect', 'true');
        // Clear any restore flags
        sessionStorage.removeItem('afm-should-restore-tab');
        sessionStorage.removeItem('afm-active-tab');
        // Set filemanager hash explicitly
        const urlHash = '#/filemanager';
        if (window.history && window.history.replaceState) {
          const url = window.location.href.split('#')[0] + urlHash;
          window.history.replaceState(null, '', url);
        } else {
          window.location.hash = urlHash;
        }
        return 'filemanager';
      }
      
      // If elFinder hash, check if this is a direct menu click or page reload
      // We can't reliably detect direct menu click after elFinder sets hash,
      // so we use a different approach: only restore saved tab if it was explicitly set
      // (not from a previous session that might be stale)
      
      // IMPORTANT: Check filemanagerRedirect flag AGAIN here (in case it was set by inline script)
      // This is a second check because inline scripts might run after the first check
      const filemanagerRedirect2 = sessionStorage.getItem('afm-filemanager-redirect');
      if (filemanagerRedirect2 === 'true') {
        // Clear the flag
        sessionStorage.removeItem('afm-filemanager-redirect');
        // Clear any restore flags
        sessionStorage.removeItem('afm-should-restore-tab');
        sessionStorage.removeItem('afm-active-tab');
        // Set filemanager hash explicitly
        const urlHash = '#/filemanager';
        if (window.history && window.history.replaceState) {
          const url = window.location.href.split('#')[0] + urlHash;
          window.history.replaceState(null, '', url);
        } else {
          window.location.hash = urlHash;
        }
        return 'filemanager';
      }
      
      // IMPORTANT: Before checking restore flags, check if we have extension integration saved
      // This ensures extension tab is preserved even when elFinder hash is present
      const savedIntegration = sessionStorage.getItem('afm-extension-integration');
      if (savedIntegration) {
        if (VALID_INTEGRATION_IDS.includes(savedIntegration)) {
          // Check if current hash is extension/ or if we should restore extension tab
          const currentHash = getCurrentHash();
          if (currentHash && currentHash.startsWith('extension/')) {
            // Hash is already extension/, preserve it
            sessionStorage.setItem('afm-should-restore-tab', 'true');
            sessionStorage.setItem('afm-active-tab', 'extension');
            return 'extension';
          }
          // If shouldRestoreTab is true and savedTab is extension, restore it
          const shouldRestoreTab = sessionStorage.getItem('afm-should-restore-tab') === 'true';
          const savedTab = sessionStorage.getItem('afm-active-tab');
          if (shouldRestoreTab && savedTab === 'extension') {
            const urlHash = `#/extension/${savedIntegration}`;
            if (window.history && window.history.replaceState) {
              const url = window.location.href.split('#')[0] + urlHash;
              window.history.replaceState(null, '', url);
            } else {
              window.location.hash = urlHash;
            }
            return 'extension';
          }
        }
      }
      
      // Check if there's a flag indicating we should restore (set when user navigates to a tab)
      const shouldRestoreTab = sessionStorage.getItem('afm-should-restore-tab') === 'true';
      const savedTab = sessionStorage.getItem('afm-active-tab');

      // HARD GUARD: On browser reload, preserve previously active non-filemanager tab
      // even if restore flags are stale/cleared.
      if (navigationType === 'reload' && savedTab && VALID_TABS.includes(savedTab) && savedTab !== 'filemanager') {
        if (savedTab === 'settings') {
          const savedSubTab = sessionStorage.getItem('afm-settings-subtab') || 'general-settings';
          const urlHash = `#/settings/${savedSubTab}`;
          if (window.history && window.history.replaceState) {
            const url = window.location.href.split('#')[0] + urlHash;
            window.history.replaceState(null, '', url);
          } else {
            window.location.hash = urlHash;
          }
          sessionStorage.setItem('afm-should-restore-tab', 'true');
          return 'settings';
        }
        if (savedTab === 'notifications') {
          const savedSubTab = sessionStorage.getItem('afm-notifications-subtab') || 'email';
          const urlHash = `#/notifications/${savedSubTab}`;
          if (window.history && window.history.replaceState) {
            const url = window.location.href.split('#')[0] + urlHash;
            window.history.replaceState(null, '', url);
          } else {
            window.location.hash = urlHash;
          }
          sessionStorage.setItem('afm-should-restore-tab', 'true');
          return 'notifications';
        }
        if (savedTab === 'extension') {
          const savedIntegration = sessionStorage.getItem('afm-extension-integration');
          const urlHash = savedIntegration ? `#/extension/${savedIntegration}` : '#/extension';
          if (window.history && window.history.replaceState) {
            const url = window.location.href.split('#')[0] + urlHash;
            window.history.replaceState(null, '', url);
          } else {
            window.location.hash = urlHash;
          }
          sessionStorage.setItem('afm-should-restore-tab', 'true');
          return 'extension';
        }
        const urlHash = `#/${savedTab}`;
        if (window.history && window.history.replaceState) {
          const url = window.location.href.split('#')[0] + urlHash;
          window.history.replaceState(null, '', url);
        } else {
          window.location.hash = urlHash;
        }
        sessionStorage.setItem('afm-should-restore-tab', 'true');
        return savedTab;
      }
      
      // Double-check activation parameters here as well (in case they weren't caught earlier)
      const urlParams2 = new URLSearchParams(window.location.search);
      const hasOauthReturn2 = [
        'onedrive_connected', 'onedrive_disconnected', 'onedrive_error',
        'dropbox_connected', 'dropbox_disconnected', 'dropbox_error',
        'googledrive_connected', 'googledrive_disconnected', 'googledrive_error',
        'pcloud_connected', 'pcloud_disconnected', 'pcloud_error',
        'redirect_hash',
      ].some((key) => urlParams2.has(key));
      const hasActivationParam2 = !hasOauthReturn2 && (
        urlParams2.has('fs_action') ||
        urlParams2.has('activation') ||
        urlParams2.has('activated') ||
        urlParams2.has('fs_message') ||
        urlParams2.has('afm_pro_activation') ||
        urlParams2.has('connect')
      );
      
      // If activation parameters are present, ALWAYS force filemanager (even if restore flag is set)
      // This ensures Pro activation redirects to filemanager
      if (hasActivationParam2) {
        // Set flag to ensure it persists
        sessionStorage.setItem('afm-filemanager-redirect', 'true');
        // Clear any restore flags
        sessionStorage.removeItem('afm-should-restore-tab');
        sessionStorage.removeItem('afm-active-tab');
        // Set filemanager hash explicitly
        const urlHash = '#/filemanager';
        if (window.history && window.history.replaceState) {
          const url = window.location.href.split('#')[0] + urlHash;
          window.history.replaceState(null, '', url);
        } else {
          window.location.hash = urlHash;
        }
        return 'filemanager';
      }
      
      // If restore flag is NOT set, this is likely a File Manager menu click
      // In this case, default to filemanager
      if (!shouldRestoreTab) {
        // Preserve explicit URL tab on reload (e.g. #/settings/... or #/extension/...).
        // Without this guard, reload can incorrectly jump to filemanager.
        const explicitHash = getCurrentHash();
        const explicitTab = getTabFromHash();
        if (explicitHash && explicitTab && VALID_TABS.includes(explicitTab) && explicitTab !== 'filemanager') {
          return explicitTab;
        }

        // Clear any saved tab to ensure filemanager is shown
        sessionStorage.removeItem('afm-active-tab');
        // Set filemanager hash explicitly
        const urlHash = '#/filemanager';
        if (window.history && window.history.replaceState) {
          const url = window.location.href.split('#')[0] + urlHash;
          window.history.replaceState(null, '', url);
        } else {
          window.location.hash = urlHash;
        }
        return 'filemanager';
      }
      
      // NOTE: Do not force filemanager based on "fresh navigate" heuristics.
      // It caused valid tabs (settings/integrations) to be lost on page reload/navigation.
      
      // Only restore saved tab if:
      // 1. Flag is set (user was on this tab before)
      // 2. Saved tab exists and is valid
      // 3. Saved tab is NOT filemanager (filemanager is default)
      if (shouldRestoreTab && savedTab && VALID_TABS.includes(savedTab) && savedTab !== 'filemanager') {
        
        // Restore the hash for the saved tab
        if (savedTab === 'settings') {
          const savedSubTab = sessionStorage.getItem('afm-settings-subtab') || 'general-settings';
          const urlHash = `#/settings/${savedSubTab}`;
          if (window.history && window.history.replaceState) {
            const url = window.location.href.split('#')[0] + urlHash;
            window.history.replaceState(null, '', url);
          } else {
            window.location.hash = urlHash;
          }
          return savedTab;
        } else if (savedTab === 'notifications') {
          const savedSubTab = sessionStorage.getItem('afm-notifications-subtab') || 'email';
          const urlHash = `#/notifications/${savedSubTab}`;
          if (window.history && window.history.replaceState) {
            const url = window.location.href.split('#')[0] + urlHash;
            window.history.replaceState(null, '', url);
          } else {
            window.location.hash = urlHash;
          }
          return savedTab;
        } else if (savedTab === 'extension') {
          const savedIntegration = sessionStorage.getItem('afm-extension-integration');
          if (savedIntegration) {
            const urlHash = `#/extension/${savedIntegration}`;
            if (window.history && window.history.replaceState) {
              const url = window.location.href.split('#')[0] + urlHash;
              window.history.replaceState(null, '', url);
            } else {
              window.location.hash = urlHash;
            }
          } else {
            const urlHash = `#/${savedTab}`;
            if (window.history && window.history.replaceState) {
              const url = window.location.href.split('#')[0] + urlHash;
              window.history.replaceState(null, '', url);
            } else {
              window.location.hash = urlHash;
            }
          }
          return savedTab;
        } else {
          // For other tabs, just restore the hash
          const urlHash = `#/${savedTab}`;
          if (window.history && window.history.replaceState) {
            const url = window.location.href.split('#')[0] + urlHash;
            window.history.replaceState(null, '', url);
          } else {
            window.location.hash = urlHash;
          }
          return savedTab;
        }
      }
      
      // If elFinder hash and we shouldn't restore, or no saved tab, default to filemanager
      // This ensures File Manager is the default tab when menu is clicked
      // Clear restore flag since we're defaulting to filemanager
      sessionStorage.removeItem('afm-should-restore-tab');
      // Set filemanager hash explicitly
      if (window.history && window.history.replaceState) {
        const url = window.location.href.split('#')[0] + '#/filemanager';
        window.history.replaceState(null, '', url);
      } else {
        window.location.hash = '#/filemanager';
      }
      return 'filemanager';
    }
    
    // If hash exists but tab is not valid, try to preserve from sessionStorage
    // This handles edge cases where hash might be malformed
    if (hash && !tab) {
      const savedTab = sessionStorage.getItem('afm-active-tab');
      if (savedTab && VALID_TABS.includes(savedTab)) {
        // Restore the saved tab and its hash
        if (savedTab === 'settings') {
          const savedSubTab = sessionStorage.getItem('afm-settings-subtab') || 'general-settings';
          const urlHash = `#/settings/${savedSubTab}`;
          if (window.history && window.history.replaceState) {
            const url = window.location.href.split('#')[0] + urlHash;
            window.history.replaceState(null, '', url);
          } else {
            window.location.hash = urlHash;
          }
          return savedTab;
        } else if (savedTab === 'notifications') {
          const savedSubTab = sessionStorage.getItem('afm-notifications-subtab') || 'email';
          const urlHash = `#/notifications/${savedSubTab}`;
          if (window.history && window.history.replaceState) {
            const url = window.location.href.split('#')[0] + urlHash;
            window.history.replaceState(null, '', url);
          } else {
            window.location.hash = urlHash;
          }
          return savedTab;
        } else if (savedTab === 'extension') {
          const savedIntegration = sessionStorage.getItem('afm-extension-integration');
          if (savedIntegration) {
            const urlHash = `#/extension/${savedIntegration}`;
            if (window.history && window.history.replaceState) {
              const url = window.location.href.split('#')[0] + urlHash;
              window.history.replaceState(null, '', url);
            } else {
              window.location.hash = urlHash;
            }
          } else {
            const urlHash = `#/${savedTab}`;
            if (window.history && window.history.replaceState) {
              const url = window.location.href.split('#')[0] + urlHash;
              window.history.replaceState(null, '', url);
            } else {
              window.location.hash = urlHash;
            }
          }
          return savedTab;
        } else {
          // For other tabs, just restore the hash
          const urlHash = `#/${savedTab}`;
          if (window.history && window.history.replaceState) {
            const url = window.location.href.split('#')[0] + urlHash;
            window.history.replaceState(null, '', url);
          } else {
            window.location.hash = urlHash;
          }
          return savedTab;
        }
      }
    }
    
    // CRITICAL: Before defaulting to filemanager, check if we have a saved tab to restore
    // This handles cases where hash might have been lost but we have sessionStorage
    if (!hash || !tab) {
      const shouldRestoreTab = sessionStorage.getItem('afm-should-restore-tab') === 'true';
      const savedTab = sessionStorage.getItem('afm-active-tab');
      
      // Only restore if flag is set and saved tab is valid and not filemanager
      if (shouldRestoreTab && savedTab && VALID_TABS.includes(savedTab) && savedTab !== 'filemanager') {
        // Restore the hash for the saved tab
        if (savedTab === 'settings') {
          const savedSubTab = sessionStorage.getItem('afm-settings-subtab') || 'general-settings';
          const urlHash = `#/settings/${savedSubTab}`;
          if (window.history && window.history.replaceState) {
            const url = window.location.href.split('#')[0] + urlHash;
            window.history.replaceState({}, '', url);
          } else {
            window.location.hash = urlHash;
          }
          return savedTab;
        } else if (savedTab === 'notifications') {
          const savedSubTab = sessionStorage.getItem('afm-notifications-subtab') || 'email';
          const urlHash = `#/notifications/${savedSubTab}`;
          if (window.history && window.history.replaceState) {
            const url = window.location.href.split('#')[0] + urlHash;
            window.history.replaceState({}, '', url);
          } else {
            window.location.hash = urlHash;
          }
          return savedTab;
        } else if (savedTab === 'extension') {
          const savedIntegration = sessionStorage.getItem('afm-extension-integration');
          if (savedIntegration) {
            const urlHash = `#/extension/${savedIntegration}`;
            if (window.history && window.history.replaceState) {
              const url = window.location.href.split('#')[0] + urlHash;
              window.history.replaceState({}, '', url);
            } else {
              window.location.hash = urlHash;
            }
          } else {
            const urlHash = `#/${savedTab}`;
            if (window.history && window.history.replaceState) {
              const url = window.location.href.split('#')[0] + urlHash;
              window.history.replaceState({}, '', url);
            } else {
              window.location.hash = urlHash;
            }
          }
          return savedTab;
        } else {
          // For other tabs, just restore the hash
          const urlHash = `#/${savedTab}`;
          if (window.history && window.history.replaceState) {
            const url = window.location.href.split('#')[0] + urlHash;
            window.history.replaceState({}, '', url);
          } else {
            window.location.hash = urlHash;
          }
          return savedTab;
        }
      }
    }
    
    // Only default to filemanager if there's NO hash at all AND no saved tab to restore
    // This ensures File Manager is the default tab when no hash is present
    if (!hash) {
      return 'filemanager';
    }
    
    // If we reach here, hash exists but couldn't be parsed
    // Default to filemanager as fallback
    return 'filemanager';
  });

  // Save active tab to sessionStorage with restore flag
  useEffect(() => {
    if (activeTab) {
      sessionStorage.setItem('afm-active-tab', activeTab);
      // Set flag to indicate we should restore this tab on page reload
      // Only set if tab is NOT filemanager (filemanager is default)
      if (activeTab !== 'filemanager') {
        sessionStorage.setItem('afm-should-restore-tab', 'true');
      } else {
        // Clear flag when on filemanager (it's the default)
        sessionStorage.removeItem('afm-should-restore-tab');
      }
    }
  }, [activeTab]);

  // Track if this is the initial mount
  const isInitialMount = useRef(true);
  
  // Update URL hash when tab changes
  useEffect(() => {
    if (!activeTab) {
      return;
    }
    
    // Skip if we're updating hash programmatically to avoid loops
    if (isUpdatingHashProgrammatically) {
      return;
    }
    
    // Skip if hash was just set by handleSettings or SettingsPanel (prevent race condition)
    // Check this FIRST before doing anything
    // BUT: On initial mount, don't skip if we're restoring from elFinder hash
    const hashJustSet = sessionStorage.getItem('afm-extension-hash-just-set') || sessionStorage.getItem('afm-settings-hash-just-set');
    if (hashJustSet === 'true' && !isInitialMount.current) {
      return;
    }
    
    // On initial mount, clear the flag if it exists (it might be stale from previous session)
    if (isInitialMount.current && hashJustSet === 'true') {
      sessionStorage.removeItem('afm-extension-hash-just-set');
      sessionStorage.removeItem('afm-settings-hash-just-set');
    }

    const currentHash = getCurrentHash();
    const hashTab = getTabFromHash();
    
    // On initial mount, if hash already matches activeTab, preserve it and don't update
    if (isInitialMount.current) {
      // If hash exists and matches activeTab, preserve it
      if (hashTab === activeTab && currentHash) {
        isInitialMount.current = false;
        return;
      }
      
      // If hash exists but doesn't match, it means we need to preserve the hash
      // This happens when page reloads with a hash like #/settings/general-settings
      if (currentHash && hashTab && hashTab !== activeTab) {
        // Don't update - let the hash determine the tab
        isInitialMount.current = false;
        return;
      }
      
      // If no hash on initial mount, set default
      if (!currentHash) {
        isInitialMount.current = false;
        // Continue to set hash below
      } else {
        // Hash exists but we're here, so preserve it
        isInitialMount.current = false;
        return;
      }
    }

    // Special handling for notifications tab - should always have sub-tab
    if (activeTab === 'notifications') {
      // If hash is empty or just has notifications without sub-tab, check parts
      const hashParts = currentHash.split('/');
      const isNotificationsHash = hashParts[0] === 'notifications' || hashParts[0] === '';
      
      // If hash already has sub-tab (notifications/email or notifications/slack), preserve it
      // This is especially important on initial mount when reloading with a sub-tab
      if (hashParts[0] === 'notifications' && hashParts.length > 1) {
        const subTab = hashParts[1].split('?')[0];
        // Save sub-tab to sessionStorage immediately if valid
        if (subTab === 'slack' || subTab === 'email') {
          sessionStorage.setItem('afm-notifications-subtab', subTab);
        }
        // Don't update hash - let NotificationsPanel handle it
        isInitialMount.current = false;
        return;
      }
      
      // If hash is just 'notifications' without sub-tab, add saved sub-tab
      if (hashParts[0] === 'notifications' && hashParts.length === 1) {
        const savedSubTab = sessionStorage.getItem('afm-notifications-subtab') || 'email';
        isUpdatingHashProgrammatically = true;
        const urlHash = `#/notifications/${savedSubTab}`;
        if (window.history && window.history.replaceState) {
          const url = window.location.href.split('#')[0] + urlHash;
          window.history.replaceState(null, '', url);
        } else {
          window.location.hash = urlHash;
        }
        setTimeout(() => {
          isUpdatingHashProgrammatically = false;
        }, 50);
        isInitialMount.current = false;
        return;
      }
      
      // If no notifications hash at all, set default
      if (hashParts[0] !== 'notifications') {
        const savedSubTab = sessionStorage.getItem('afm-notifications-subtab') || 'email';
        isUpdatingHashProgrammatically = true;
        const urlHash = `#/notifications/${savedSubTab}`;
        if (window.history && window.history.replaceState) {
          const url = window.location.href.split('#')[0] + urlHash;
          window.history.replaceState(null, '', url);
        } else {
          window.location.hash = urlHash;
        }
        setTimeout(() => {
          isUpdatingHashProgrammatically = false;
        }, 50);
        isInitialMount.current = false;
        return;
      }
    }

            // Handle extension tab sub-paths (similar to notifications)
            // Check hash DIRECTLY from window.location.hash (not getCurrentHash) to preserve full path
            if (activeTab === 'extension') {
                // Skip if hash was just set by handleSettings (prevent race condition)
                const hashJustSet = sessionStorage.getItem('afm-extension-hash-just-set');
                if (hashJustSet === 'true') {
                  isInitialMount.current = false;
                  return;
                }
                
                const currentHashWithHash = window.location.hash;
                const hashParts = currentHashWithHash.replace('#/', '').split('/');
                
                // This is especially important on initial mount when reloading with a sub-tab
                if (hashParts[0] === 'extension' && hashParts.length > 1) {
                  const integrationId = hashParts[1].split('?')[0];
                  if (VALID_INTEGRATION_IDS.includes(integrationId)) {
                    // Save integration ID to sessionStorage immediately if valid
                    sessionStorage.setItem('afm-extension-integration', integrationId);
                    // Don't update hash - it's already correct
                    isInitialMount.current = false;
                    return;
                  }
                }
                
                // If hash is just 'extension' without sub-path, check sessionStorage
                if (hashParts[0] === 'extension' && hashParts.length === 1) {
                  const savedIntegration = sessionStorage.getItem('afm-extension-integration');
                  if (savedIntegration) {
                    isUpdatingHashProgrammatically = true;
                    const urlHash = `#/extension/${savedIntegration}`;
                    if (window.history && window.history.replaceState) {
                      const url = window.location.href.split('#')[0] + urlHash;
                      window.history.replaceState(null, '', url);
                    } else {
                      window.location.hash = urlHash;
                    }
                    setTimeout(() => {
                      isUpdatingHashProgrammatically = false;
                    }, 50);
                  }
                  isInitialMount.current = false;
                  return;
                }
                
                // If hash doesn't start with extension/, check sessionStorage and set it
                // Also check if it's an elFinder hash and replace it
                const isElFinder = isElFinderHash(currentHashWithHash.replace('#/', ''));
                if (!currentHashWithHash.startsWith('#/extension/') || isElFinder) {
                  const savedIntegration = sessionStorage.getItem('afm-extension-integration');
                  if (savedIntegration) {
                    isUpdatingHashProgrammatically = true;
                    const urlHash = `#/extension/${savedIntegration}`;
                    if (window.history && window.history.replaceState) {
                      const url = window.location.href.split('#')[0] + urlHash;
                      window.history.replaceState(null, '', url);
                    } else {
                      window.location.hash = urlHash;
                    }
                    setTimeout(() => {
                      isUpdatingHashProgrammatically = false;
                    }, 50);
                    isInitialMount.current = false;
                    return;
                  } else {
                    // No saved integration, just set to #/extension
                    isUpdatingHashProgrammatically = true;
                    const urlHash = '#/extension';
                    if (window.history && window.history.replaceState) {
                      const url = window.location.href.split('#')[0] + urlHash;
                      window.history.replaceState(null, '', url);
                    } else {
                      window.location.hash = urlHash;
                    }
                    setTimeout(() => {
                      isUpdatingHashProgrammatically = false;
                    }, 50);
                    isInitialMount.current = false;
                    return;
                  }
                }
            }

    // Special handling for settings tab - should preserve sub-tab
    if (activeTab === 'settings') {
      // Skip if hash was just set by SettingsPanel or App.js (prevent race condition)
      const settingsHashJustSet = sessionStorage.getItem('afm-settings-hash-just-set');
      if (settingsHashJustSet === 'true') {
        isInitialMount.current = false;
        return;
      }
      
      const currentHashWithHash = window.location.hash;
      const hashParts = currentHashWithHash.replace('#/', '').split('/');
      
      // If hash already has sub-tab (settings/general-settings or settings/advanced-settings), preserve it
      if (hashParts[0] === 'settings' && hashParts.length > 1) {
        const subTab = hashParts[1].split('?')[0];
        if (subTab === 'general-settings' || subTab === 'advanced-settings') {
          // Save sub-tab to sessionStorage
          sessionStorage.setItem('afm-settings-subtab', subTab);
          // Don't update hash - it's already correct
          isInitialMount.current = false;
          return;
        }
      }
      
      // If hash is just 'settings' without sub-tab, add saved sub-tab or default to general-settings
      if (hashParts[0] === 'settings' && hashParts.length === 1) {
        const savedSubTab = sessionStorage.getItem('afm-settings-subtab') || 'general-settings';
        isUpdatingHashProgrammatically = true;
        const urlHash = `#/settings/${savedSubTab}`;
        if (window.history && window.history.replaceState) {
          const url = window.location.href.split('#')[0] + urlHash;
          window.history.replaceState(null, '', url);
        } else {
          window.location.hash = urlHash;
        }
        setTimeout(() => {
          isUpdatingHashProgrammatically = false;
        }, 50);
        isInitialMount.current = false;
        return;
      }
      
      // If hash doesn't start with settings/, set it to default sub-tab
      if (!currentHashWithHash.startsWith('#/settings/')) {
        const savedSubTab = sessionStorage.getItem('afm-settings-subtab') || 'general-settings';
        isUpdatingHashProgrammatically = true;
        const urlHash = `#/settings/${savedSubTab}`;
        if (window.history && window.history.replaceState) {
          const url = window.location.href.split('#')[0] + urlHash;
          window.history.replaceState(null, '', url);
        } else {
          window.location.hash = urlHash;
        }
        setTimeout(() => {
          isUpdatingHashProgrammatically = false;
        }, 50);
        isInitialMount.current = false;
        return;
      }
    }

            // If hash already matches, don't update (for notifications, extension, and settings, check sub-paths)
            if (hashTab === activeTab) {
                if (activeTab === 'notifications' || activeTab === 'extension' || activeTab === 'settings') {
                  // For notifications, extension, and settings, preserve sub-paths - don't update if hash already has sub-path
                  // Check hash DIRECTLY from window.location.hash to preserve full path
                  const currentHashWithHash = window.location.hash;
                  const hashParts = currentHashWithHash.replace('#/', '').split('/');
                  
                  // For settings, check if hash was just set
                  if (activeTab === 'settings') {
                    const settingsHashJustSet = sessionStorage.getItem('afm-settings-hash-just-set');
                    if (settingsHashJustSet === 'true') {
                      isInitialMount.current = false;
                      return;
                    }
                    
                    // If hash doesn't have sub-tab, add it
                    if (hashParts.length === 1 && hashParts[0] === 'settings') {
                      const savedSubTab = sessionStorage.getItem('afm-settings-subtab') || 'general-settings';
                      isUpdatingHashProgrammatically = true;
                      const urlHash = `#/settings/${savedSubTab}`;
                      if (window.history && window.history.replaceState) {
                        const url = window.location.href.split('#')[0] + urlHash;
                        window.history.replaceState(null, '', url);
                        window.location.hash = urlHash; // Also set directly
                      } else {
                        window.location.hash = urlHash;
                      }
                      setTimeout(() => {
                        isUpdatingHashProgrammatically = false;
                      }, 50);
                      isInitialMount.current = false;
                      return;
                    }
                  }
                  
                  if (hashParts.length > 1) {
                    // Hash already has sub-path - preserve it
                    isInitialMount.current = false;
                    return;
                  }
                } else {
                  isInitialMount.current = false;
                  return;
                }
            }

    // Only update hash if it's elFinder hash or doesn't match (but not for notifications/extension/settings - handled above)
    if (activeTab !== 'notifications' && activeTab !== 'extension' && activeTab !== 'settings') {
      const isElFinder = isElFinderHash(currentHash);
      if (isElFinder || (!hashTab && currentHash !== activeTab)) {
        isUpdatingHashProgrammatically = true;
        setHash(activeTab);
        setTimeout(() => {
          isUpdatingHashProgrammatically = false;
        }, 50);
      }
    }
    // Extension tab is already handled above at line 171-227, so we don't need to handle it here again
    
    isInitialMount.current = false;
  }, [activeTab]);

  // Use ref to track active tab for interval (closure gets stale value)
  const activeTabRef = useRef(activeTab);
  
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // Intercept pushState/replaceState to prevent elFinder from changing hash on non-filemanager tabs
  useEffect(() => {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    // Override pushState
    history.pushState = function(...args) {
      const currentTab = activeTabRef.current || sessionStorage.getItem('afm-active-tab');
      
      // Check if elFinder is trying to change hash when we're on non-filemanager tab
      if (currentTab && currentTab !== 'filemanager' && VALID_TABS.includes(currentTab)) {
        const url = args[2] || '';
        
        // Extract hash from URL (could be full URL or just hash)
        let hash = '';
        if (url.includes('#')) {
          hash = url.split('#')[1].replace(/^\//, '');
        } else if (url.startsWith('#')) {
          hash = url.replace(/^#/, '').replace(/^\//, '');
        }
        
        // If elFinder hash detected, prevent it and restore our hash
        if (hash && isElFinderHash(hash)) {
          // Don't call original pushState - prevent elFinder hash
          // Restore our tab hash instead
          isUpdatingHashProgrammatically = true;
          if (currentTab === 'notifications') {
            const savedSubTab = sessionStorage.getItem('afm-notifications-subtab') || 'email';
            const urlHash = `#/notifications/${savedSubTab}`;
            const url = window.location.href.split('#')[0] + urlHash;
            originalReplaceState.call(history, null, '', url);
          } else if (currentTab === 'extension') {
            // Skip if hash was just set by handleSettings
            const hashJustSet = sessionStorage.getItem('afm-extension-hash-just-set');
            if (hashJustSet === 'true') {
              // Allow the pushState to proceed - it's from handleSettings
              return originalPushState.apply(history, args);
            }
            
            const savedIntegration = sessionStorage.getItem('afm-extension-integration');
            if (savedIntegration) {
              const urlHash = `#/extension/${savedIntegration}`;
              const url = window.location.href.split('#')[0] + urlHash;
              originalReplaceState.call(history, null, '', url);
            } else {
              setHash(currentTab);
            }
          } else {
            setHash(currentTab);
          }
          setTimeout(() => {
            isUpdatingHashProgrammatically = false;
          }, 10);
          return;
        }
      }
      
      // Allow pushState normally
      return originalPushState.apply(history, args);
    };
    
    // Override replaceState
    history.replaceState = function(...args) {
      const currentTab = activeTabRef.current || sessionStorage.getItem('afm-active-tab');
      
      // Check if elFinder is trying to change hash when we're on non-filemanager tab
      if (currentTab && currentTab !== 'filemanager' && VALID_TABS.includes(currentTab)) {
        const url = args[2] || '';
        
        // Extract hash from URL (could be full URL or just hash)
        let hash = '';
        if (url.includes('#')) {
          hash = url.split('#')[1].replace(/^\//, '');
        } else if (url.startsWith('#')) {
          hash = url.replace(/^#/, '').replace(/^\//, '');
        }
        
        // If elFinder hash detected, prevent it and restore our hash
        if (hash && isElFinderHash(hash)) {
          // Don't call original replaceState - prevent elFinder hash
          // Restore our tab hash instead
          isUpdatingHashProgrammatically = true;
          if (currentTab === 'notifications') {
            const savedSubTab = sessionStorage.getItem('afm-notifications-subtab') || 'email';
            const urlHash = `#/notifications/${savedSubTab}`;
            const url = window.location.href.split('#')[0] + urlHash;
            originalReplaceState.call(history, null, '', url);
          } else if (currentTab === 'extension') {
            // Skip if hash was just set by handleSettings
            const hashJustSet = sessionStorage.getItem('afm-extension-hash-just-set');
            if (hashJustSet === 'true') {
              // Allow the replaceState to proceed - it's from handleSettings
              return originalReplaceState.apply(history, args);
            }
            
            const savedIntegration = sessionStorage.getItem('afm-extension-integration');
            if (savedIntegration) {
              const urlHash = `#/extension/${savedIntegration}`;
              const url = window.location.href.split('#')[0] + urlHash;
              originalReplaceState.call(history, null, '', url);
            } else {
              setHash(currentTab);
            }
          } else {
            setHash(currentTab);
          }
          setTimeout(() => {
            isUpdatingHashProgrammatically = false;
          }, 10);
          return;
        }
      }
      
      // Allow replaceState normally
      return originalReplaceState.apply(history, args);
    };
    
    return () => {
      // Restore original functions on unmount
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, []);

  // Listen to hash changes from browser navigation and poll for elFinder changes
  useEffect(() => {
    function handleHashChange() {
      if (isUpdatingHashProgrammatically) return;

      const hash = getCurrentHash();
      const tab = getTabFromHash();
      
      // If hash has valid tab, switch to it
      if (tab) {
        setActiveTab((currentTab) => {
          return tab !== currentTab ? tab : currentTab;
        });
      }
      // If elFinder hash detected and we're not on filemanager, restore our tab
      else if (isElFinderHash(hash)) {
        setActiveTab((currentTab) => {
          if (currentTab === 'filemanager') {
            return currentTab;
          }
          
          // CRITICAL: Check if we have a restore flag set - if yes, preserve the tab
          const shouldRestoreTab = sessionStorage.getItem('afm-should-restore-tab') === 'true';
          const savedTab = sessionStorage.getItem('afm-active-tab');
          
          // If restore flag is set and we have a saved tab, use it instead of defaulting to filemanager
          if (shouldRestoreTab && savedTab && VALID_TABS.includes(savedTab) && savedTab !== 'filemanager') {
            // Restore the saved tab
            isUpdatingHashProgrammatically = true;
            if (savedTab === 'settings') {
              const savedSubTab = sessionStorage.getItem('afm-settings-subtab') || 'general-settings';
              const urlHash = `#/settings/${savedSubTab}`;
              if (window.history && window.history.replaceState) {
                const url = window.location.href.split('#')[0] + urlHash;
                window.history.replaceState(null, '', url);
              } else {
                window.location.hash = urlHash;
              }
            } else if (savedTab === 'notifications') {
              const savedSubTab = sessionStorage.getItem('afm-notifications-subtab') || 'email';
              const urlHash = `#/notifications/${savedSubTab}`;
              if (window.history && window.history.replaceState) {
                const url = window.location.href.split('#')[0] + urlHash;
                window.history.replaceState(null, '', url);
              } else {
                window.location.hash = urlHash;
              }
            } else if (savedTab === 'extension') {
              const savedIntegration = sessionStorage.getItem('afm-extension-integration');
              if (savedIntegration) {
                const urlHash = `#/extension/${savedIntegration}`;
                if (window.history && window.history.replaceState) {
                  const url = window.location.href.split('#')[0] + urlHash;
                  window.history.replaceState(null, '', url);
                } else {
                  window.location.hash = urlHash;
                }
              } else {
                setHash(savedTab);
              }
            } else {
              setHash(savedTab);
            }
            setTimeout(() => {
              isUpdatingHashProgrammatically = false;
            }, 10);
            return savedTab;
          }
          
          // Restore our tab hash
          const tabToRestore = currentTab || sessionStorage.getItem('afm-active-tab') || 'filemanager';
          if (tabToRestore !== 'filemanager') {
            isUpdatingHashProgrammatically = true;
            if (tabToRestore === 'notifications') {
              const savedSubTab = sessionStorage.getItem('afm-notifications-subtab') || 'email';
              const urlHash = `#/notifications/${savedSubTab}`;
              if (window.history && window.history.replaceState) {
                const url = window.location.href.split('#')[0] + urlHash;
                window.history.replaceState(null, '', url);
              } else {
                window.location.hash = urlHash;
              }
            } else if (tabToRestore === 'extension') {
              const savedIntegration = sessionStorage.getItem('afm-extension-integration');
              if (savedIntegration) {
                const urlHash = `#/extension/${savedIntegration}`;
                if (window.history && window.history.replaceState) {
                  const url = window.location.href.split('#')[0] + urlHash;
                  window.history.replaceState(null, '', url);
                } else {
                  window.location.hash = urlHash;
                }
              } else {
                setHash(tabToRestore);
              }
            } else if (tabToRestore === 'settings') {
              const savedSubTab = sessionStorage.getItem('afm-settings-subtab') || 'general-settings';
              const urlHash = `#/settings/${savedSubTab}`;
              if (window.history && window.history.replaceState) {
                const url = window.location.href.split('#')[0] + urlHash;
                window.history.replaceState(null, '', url);
              } else {
                window.location.hash = urlHash;
              }
            } else {
              setHash(tabToRestore);
            }
            setTimeout(() => {
              isUpdatingHashProgrammatically = false;
            }, 50);
          }
          return currentTab;
        });
      }
    }

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);

    // Simple polling to catch elFinder hash changes (elFinder uses pushState, doesn't trigger hashchange)
    let lastHash = getCurrentHash();
    let consecutiveElFinderChecks = 0;
    
    const pollInterval = setInterval(() => {
      if (isUpdatingHashProgrammatically) return;
      
      const currentHash = getCurrentHash();
      const currentTab = activeTabRef.current || sessionStorage.getItem('afm-active-tab');
      
      // CRITICAL: If hash has a valid tab (settings, logs, notifications, etc.), preserve it
      // Don't let elFinder override valid tabs on page reload
      const hashTab = getTabFromHash();
      if (hashTab && VALID_TABS.includes(hashTab) && hashTab !== 'filemanager') {
        // Valid tab in hash - ensure we're on that tab
        // Also handle sub-tabs for settings, notifications, extension
        if (hashTab === 'settings' && currentHash.startsWith('settings/')) {
          const parts = currentHash.split('/');
          if (parts.length > 1) {
            const subTab = parts[1].split('?')[0];
            sessionStorage.setItem('afm-settings-subtab', subTab);
          }
        } else if (hashTab === 'notifications' && currentHash.startsWith('notifications/')) {
          const parts = currentHash.split('/');
          if (parts.length > 1) {
            const subTab = parts[1].split('?')[0];
            if (subTab === 'slack' || subTab === 'email') {
              sessionStorage.setItem('afm-notifications-subtab', subTab);
            }
          }
        } else if (hashTab === 'extension' && currentHash.startsWith('extension/')) {
          const parts = currentHash.split('/');
          if (parts.length > 1) {
            const integrationId = parts[1].split('?')[0];
            if (VALID_INTEGRATION_IDS.includes(integrationId)) {
              sessionStorage.setItem('afm-extension-integration', integrationId);
            }
          }
        }
        
        // Set restore flags to preserve on future reloads
        sessionStorage.setItem('afm-active-tab', hashTab);
        sessionStorage.setItem('afm-should-restore-tab', 'true');
        
        // Ensure we're on that tab
        if (activeTabRef.current !== hashTab) {
          activeTabRef.current = hashTab;
          setActiveTab(hashTab);
        }
        lastHash = currentHash;
        consecutiveElFinderChecks = 0;
        return;
      }
      
      // Only proceed if hash actually changed
      if (currentHash === lastHash) {
        consecutiveElFinderChecks = 0;
        return;
      }
      
      // If elFinder hash and we're on non-filemanager tab, restore IMMEDIATELY
      if (isElFinderHash(currentHash)) {
        // Check if we just redirected to notifications (from Slack setup)
        const notificationsRedirect = sessionStorage.getItem('afm-notifications-redirect');
        if (notificationsRedirect === 'true') {
          sessionStorage.removeItem('afm-notifications-redirect');
          const savedSubTab = sessionStorage.getItem('afm-notifications-subtab') || 'slack';
          const urlHash = `#/notifications/${savedSubTab}`;
          sessionStorage.setItem('afm-notifications-hash-just-set', 'true');
          isUpdatingHashProgrammatically = true;
          if (window.history && window.history.replaceState) {
            const url = window.location.href.split('#')[0] + urlHash;
            window.history.replaceState(null, '', url);
          } else {
            window.location.hash = urlHash;
          }
          lastHash = `notifications/${savedSubTab}`;
          setTimeout(() => {
            isUpdatingHashProgrammatically = false;
            sessionStorage.removeItem('afm-notifications-hash-just-set');
          }, 2000);
          return;
        }
        
        // Check if notifications hash was just set (prevent race condition)
        const notificationsHashJustSet = sessionStorage.getItem('afm-notifications-hash-just-set');
        if (notificationsHashJustSet === 'true') {
          // Don't restore - let the hash that was just set persist
          return;
        }
        
        if (currentTab && currentTab !== 'filemanager' && VALID_TABS.includes(currentTab)) {
          consecutiveElFinderChecks++;
          
          // Restore immediately - even faster on consecutive detections
          isUpdatingHashProgrammatically = true;
          if (currentTab === 'notifications') {
            const savedSubTab = sessionStorage.getItem('afm-notifications-subtab') || 'email';
            const urlHash = `#/notifications/${savedSubTab}`;
            if (window.history && window.history.replaceState) {
              const url = window.location.href.split('#')[0] + urlHash;
              window.history.replaceState(null, '', url);
            } else {
              window.location.hash = urlHash;
            }
            lastHash = `notifications/${savedSubTab}`;
          } else {
            setHash(currentTab);
            lastHash = currentTab;
          }
          
          setTimeout(() => {
            isUpdatingHashProgrammatically = false;
          }, 10);
        }
      } else {
        // Valid hash - update tracking
        consecutiveElFinderChecks = 0;
        lastHash = currentHash;
      }
    }, 50); // Check every 50ms - very fast to catch changes immediately

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
      clearInterval(pollInterval);
    };
  }, []);

  // Handle tab change: set URL first (sync) then state for instant feedback
  const changeTab = (tab) => {
    if (isFmOnlyAccess()) {
      tab = 'filemanager';
    } else if (!tab || !VALID_TABS.includes(tab)) {
      tab = 'filemanager';
    }
    isUpdatingHashProgrammatically = true;
    setHash(tab);
    setActiveTab(tab);
    setTimeout(() => {
      isUpdatingHashProgrammatically = false;
    }, 0);
  };

  return [activeTab, changeTab];
}
