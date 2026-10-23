/**
 * Centralized Hash Manager
 * Inspired by surerank's router approach but lightweight
 * Handles all hash navigation with a single source of truth
 */

const VALID_TABS = ['dashboard', 'filemanager', 'settings', 'logs', 'notifications', 'extension', 'docs', 'pro', 'planaccess'];

// Default sub-tabs for tabs that support them
const DEFAULT_SUB_TABS = {
  settings: 'general-settings',
  notifications: 'email',
  extension: null
};

/**
 * Check if a hash is an elFinder hash
 */
export function isElFinderHash(hash) {
  if (!hash) return false;
  const isValidTab = VALID_TABS.includes(hash.toLowerCase());
  return hash.startsWith('elf_') || (!isValidTab && /^[a-zA-Z0-9_./=+-]+$/.test(hash) && hash.length > 20);
}

/**
 * Parse hash into tab and sub-tab
 * @returns {Object} { tab: string, subTab: string|null }
 */
export function parseHash() {
  const hash = window.location.hash.replace(/^#/, '').replace(/^\//, '');
  
  if (!hash) {
    return { tab: null, subTab: null };
  }
  
  // Handle elFinder hashes
  if (isElFinderHash(hash)) {
    return { tab: null, subTab: null, isElFinder: true };
  }
  
  // Split by / to get tab and sub-tab
  const parts = hash.split('/');
  const tab = parts[0] ? parts[0].toLowerCase() : '';
  const subTab = parts.length > 1 ? parts[1].split('?')[0] : null;
  
  // Validate tab
  if (!VALID_TABS.includes(tab)) {
    return { tab: null, subTab: null };
  }
  
  return { tab, subTab };
}

/**
 * Build hash string from tab and sub-tab
 * @param {string} tab - The main tab
 * @param {string|null} subTab - Optional sub-tab
 * @returns {string} Hash string (e.g., "#/settings/general-settings")
 */
export function buildHash(tab, subTab = null) {
  if (!tab || !VALID_TABS.includes(tab)) {
    return '#/filemanager';
  }
  
  // For tabs that support sub-tabs, always include sub-tab
  if (tab === 'settings' || tab === 'notifications' || tab === 'extension') {
    const finalSubTab = subTab || DEFAULT_SUB_TABS[tab] || null;
    if (finalSubTab) {
      return `#/${tab}/${finalSubTab}`;
    }
  }
  
  return `#/${tab}`;
}

/**
 * Set hash in URL
 * @param {string} tab - The main tab
 * @param {string|null} subTab - Optional sub-tab
 * @param {boolean} replace - Use replaceState instead of pushState
 */
export function setHash(tab, subTab = null, replace = true) {
  const hash = buildHash(tab, subTab);
  
  if (replace && window.history && window.history.replaceState) {
    const url = window.location.href.split('#')[0] + hash;
    window.history.replaceState(null, '', url);
  } else {
    window.location.hash = hash;
  }
  
  // Save to sessionStorage for persistence
  if (tab) {
    sessionStorage.setItem('afm-active-tab', tab);
    if (subTab) {
      if (tab === 'settings') {
        sessionStorage.setItem('afm-settings-subtab', subTab);
      } else if (tab === 'notifications') {
        sessionStorage.setItem('afm-notifications-subtab', subTab);
      } else if (tab === 'extension') {
        sessionStorage.setItem('afm-extension-integration', subTab);
      }
    }
  }
}

/**
 * Get current hash without # and /
 */
export function getCurrentHash() {
  return window.location.hash.replace(/^#/, '').replace(/^\//, '');
}

/**
 * Get tab from hash
 */
export function getTabFromHash() {
  const { tab } = parseHash();
  return tab;
}

/**
 * Hash Manager Class - Single source of truth for hash state
 */
class HashManager {
  constructor() {
    this.listeners = new Set();
    this.currentTab = null;
    this.currentSubTab = null;
    this.isInitialized = false;
    
    // Intercept elFinder hash changes
    this.interceptElFinder();
    
    // Listen to hash changes
    window.addEventListener('hashchange', this.handleHashChange.bind(this));
    
    // Initialize from current hash
    this.syncFromHash();
    this.isInitialized = true;
  }
  
  /**
   * Intercept elFinder's hash changes
   */
  interceptElFinder() {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    const self = this;
    
    history.pushState = function(...args) {
      const url = args[2] || '';
      if (self.shouldPreventElFinder(url)) {
        return; // Prevent elFinder hash
      }
      return originalPushState.apply(history, args);
    };
    
    history.replaceState = function(...args) {
      const url = args[2] || '';
      if (self.shouldPreventElFinder(url)) {
        return; // Prevent elFinder hash
      }
      return originalReplaceState.apply(history, args);
    };
  }
  
  /**
   * Check if elFinder hash should be prevented
   */
  shouldPreventElFinder(url) {
    // Only prevent if we're on a non-filemanager tab
    if (!this.currentTab || this.currentTab === 'filemanager') {
      return false;
    }
    
    // Extract hash from URL
    let hash = '';
    if (url.includes('#')) {
      hash = url.split('#')[1].replace(/^\//, '');
    } else if (url.startsWith('#')) {
      hash = url.replace(/^#/, '').replace(/^\//, '');
    }
    
    // Prevent elFinder hashes
    if (hash && isElFinderHash(hash)) {
      // Restore our hash
      const currentHash = buildHash(this.currentTab, this.currentSubTab);
      if (window.history && window.history.replaceState) {
        const url = window.location.href.split('#')[0] + currentHash;
        window.history.replaceState(null, '', url);
      }
      return true;
    }
    
    return false;
  }
  
  /**
   * Handle hash change event
   */
  handleHashChange() {
    this.syncFromHash();
    this.notifyListeners();
  }
  
  /**
   * Sync state from current hash
   */
  syncFromHash() {
    const { tab, subTab, isElFinder } = parseHash();
    
    // If elFinder hash and we're on a non-filemanager tab, restore our hash
    if (isElFinder && this.currentTab && this.currentTab !== 'filemanager') {
      const hash = buildHash(this.currentTab, this.currentSubTab);
      setHash(this.currentTab, this.currentSubTab, true);
      return;
    }
    
    // If no tab in hash, try to restore from sessionStorage
    if (!tab && this.currentTab) {
      const savedTab = sessionStorage.getItem('afm-active-tab');
      if (savedTab && VALID_TABS.includes(savedTab)) {
        let savedSubTab = null;
        if (savedTab === 'settings') {
          savedSubTab = sessionStorage.getItem('afm-settings-subtab') || DEFAULT_SUB_TABS.settings;
        } else if (savedTab === 'notifications') {
          savedSubTab = sessionStorage.getItem('afm-notifications-subtab') || DEFAULT_SUB_TABS.notifications;
        } else if (savedTab === 'extension') {
          savedSubTab = sessionStorage.getItem('afm-extension-integration');
        }
        setHash(savedTab, savedSubTab, true);
        this.currentTab = savedTab;
        this.currentSubTab = savedSubTab;
        return;
      }
    }
    
    // Update state
    if (tab) {
      this.currentTab = tab;
      this.currentSubTab = subTab || this.getDefaultSubTab(tab);
      
      // If tab supports sub-tabs but hash doesn't have one, add default
      if ((tab === 'settings' || tab === 'notifications' || tab === 'extension') && !subTab) {
        const defaultSubTab = this.getDefaultSubTab(tab);
        if (defaultSubTab) {
          setHash(tab, defaultSubTab, true);
          this.currentSubTab = defaultSubTab;
        }
      }
    } else {
      // Default to filemanager if no valid tab
      if (!this.currentTab) {
        this.currentTab = 'filemanager';
        this.currentSubTab = null;
        setHash('filemanager', null, true);
      }
    }
  }
  
  /**
   * Get default sub-tab for a tab
   */
  getDefaultSubTab(tab) {
    if (tab === 'settings') {
      return sessionStorage.getItem('afm-settings-subtab') || DEFAULT_SUB_TABS.settings;
    } else if (tab === 'notifications') {
      return sessionStorage.getItem('afm-notifications-subtab') || DEFAULT_SUB_TABS.notifications;
    } else if (tab === 'extension') {
      return sessionStorage.getItem('afm-extension-integration');
    }
    return null;
  }
  
  /**
   * Navigate to a tab
   */
  navigate(tab, subTab = null) {
    setHash(tab, subTab, true);
    this.currentTab = tab;
    this.currentSubTab = subTab || this.getDefaultSubTab(tab);
    this.notifyListeners();
  }
  
  /**
   * Subscribe to hash changes
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  
  /**
   * Notify all listeners
   */
  notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentTab, this.currentSubTab);
      } catch (error) {
        console.error('HashManager listener error:', error);
      }
    });
  }
  
  /**
   * Get current tab
   */
  getCurrentTab() {
    return this.currentTab;
  }
  
  /**
   * Get current sub-tab
   */
  getCurrentSubTab() {
    return this.currentSubTab;
  }
}

// Create singleton instance
export const hashManager = new HashManager();

