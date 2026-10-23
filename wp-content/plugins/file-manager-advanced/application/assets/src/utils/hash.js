/**
 * Hash utility functions for URL hash management
 * Uses #/tab format instead of #tab
 */

const VALID_TABS = ['dashboard', 'filemanager', 'settings', 'logs', 'notifications', 'extension', 'docs', 'pro', 'planaccess'];

/**
 * Check if a hash is an elFinder hash
 */
export function isElFinderHash(hash) {
  if (!hash) return false;
  const normalized = String(hash).replace(/^#/, '').replace(/^\//, '').toLowerCase();
  const mainTab = normalized.split('/')[0];

  // Never treat known app routes (including sub-routes) as elFinder hashes.
  if (VALID_TABS.includes(mainTab)) {
    return false;
  }

  return normalized.startsWith('elf_') ||
    (/^[a-z0-9_./=+-]+$/i.test(normalized) && normalized.length > 20);
}

/**
 * Get tab from hash (supports both #tab and #/tab formats)
 * Also handles sub-tabs like #/notifications/email or #/notifications/slack
 */
export function getTabFromHash() {
  let hash = window.location.hash.replace(/^#/, '').replace(/^\//, '');
  
  // Return empty if no hash
  if (!hash) {
    return '';
  }
  
  // Handle sub-tabs (e.g., notifications/email, notifications/slack)
  const parts = hash.split('/');
  const mainTab = parts[0] ? parts[0].toLowerCase() : '';
  
  const isValidTab = VALID_TABS.includes(mainTab);
  
  // Ignore elFinder hashes - return empty so current tab is preserved
  if (isElFinderHash(mainTab)) {
    return '';
  }
  
  if (isValidTab) {
    return mainTab;
  }
  
  // Return empty if hash doesn't match any valid tab
  return '';
}

/**
 * Set hash in format #/tab
 * For settings, notifications, and extension tabs, preserves sub-tabs
 */
export function setHash(tab) {
  if (!tab || !VALID_TABS.includes(tab.toLowerCase())) {
    tab = 'filemanager';
  }
  
  // For settings, notifications, and extension, preserve sub-tabs if they exist
  if (tab === 'settings' || tab === 'notifications' || tab === 'extension') {
    const currentHash = window.location.hash;
    const hashParts = currentHash.replace('#/', '').split('/');
    
    // If current hash already has sub-tab, preserve it
    if (hashParts.length > 1 && hashParts[0] === tab) {
      // Hash already has sub-tab, don't change it
      return;
    }
    
    // If no sub-tab, check sessionStorage and add it
    if (tab === 'settings') {
      const savedSubTab = sessionStorage.getItem('afm-settings-subtab') || 'general-settings';
      const hash = `#/${tab.toLowerCase()}/${savedSubTab}`;
      if (window.history && window.history.replaceState) {
        const url = window.location.href.split('#')[0] + hash;
        window.history.replaceState(null, '', url);
      } else {
        window.location.hash = hash;
      }
      return;
    } else if (tab === 'notifications') {
      const savedSubTab = sessionStorage.getItem('afm-notifications-subtab') || 'email';
      const hash = `#/${tab.toLowerCase()}/${savedSubTab}`;
      if (window.history && window.history.replaceState) {
        const url = window.location.href.split('#')[0] + hash;
        window.history.replaceState(null, '', url);
      } else {
        window.location.hash = hash;
      }
      return;
    } else if (tab === 'extension') {
      const savedIntegration = sessionStorage.getItem('afm-extension-integration');
      if (savedIntegration) {
        const hash = `#/${tab.toLowerCase()}/${savedIntegration}`;
        if (window.history && window.history.replaceState) {
          const url = window.location.href.split('#')[0] + hash;
          window.history.replaceState(null, '', url);
        } else {
          window.location.hash = hash;
        }
        return;
      }
    }
  }
  
  const hash = `#/${tab.toLowerCase()}`;
  
  if (window.history && window.history.replaceState) {
    const url = window.location.href.split('#')[0] + hash;
    window.history.replaceState(null, '', url);
  } else {
    window.location.hash = hash;
  }
}

/**
 * Get current hash without # and /
 */
export function getCurrentHash() {
  return window.location.hash.replace(/^#/, '').replace(/^\//, '');
}

