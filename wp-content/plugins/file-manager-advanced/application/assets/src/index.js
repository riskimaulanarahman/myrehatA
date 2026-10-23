/**
 * Main entry point for AFM React Admin
 * Replaces WordPress React module with proper React setup
 */

import React from 'react';
import { createRoot } from 'react-dom/client';

// Set public path for dynamic chunk loading
/* eslint-disable camelcase */
if (window.afmReact?.pluginUrl) {
  __webpack_public_path__ = window.afmReact.pluginUrl + 'application/assets/dist/';
} else if (window.afm_object?.plugin_url) {
  __webpack_public_path__ = window.afm_object.plugin_url + 'application/assets/dist/';
}
/* eslint-enable camelcase */

import App from './components/App';

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  const rootElement = document.getElementById('afm-react-root');
  if (!rootElement) {
    console.warn('AFM React root element not found');
    return;
  }

  // Check if WordPress element is available (for fallback)
  if (!window.wp || !window.wp.element) {
    console.warn('WordPress React not available, using React directly');
  }

  // Check if this is a redirect after Pro activation/license entry
  // IMPORTANT: do NOT use search.includes('connect') — it false-matches
  // onedrive_connected / dropbox_connected / googledrive_connected and forces File Manager.
  const urlParams = new URLSearchParams(window.location.search);
  const isIntegrationOauthReturn = [
    'onedrive_connected', 'onedrive_disconnected', 'onedrive_error',
    'dropbox_connected', 'dropbox_disconnected', 'dropbox_error',
    'googledrive_connected', 'googledrive_disconnected', 'googledrive_error',
    'pcloud_connected', 'pcloud_disconnected', 'pcloud_error',
    'redirect_hash',
  ].some((key) => urlParams.has(key));

  const hasActivationParam = !isIntegrationOauthReturn && (
    urlParams.has('fs_action') ||
    urlParams.has('activation') ||
    urlParams.has('activated') ||
    urlParams.has('fs_message') ||
    urlParams.has('afm_pro_activation') ||
    urlParams.has('connect') // Freemius exact param — not substring match
  );

  // Check if flag was set by inline script (from check_and_redirect_after_activation)
  let filemanagerRedirect = sessionStorage.getItem('afm-filemanager-redirect');
  const currentHash = window.location.hash.replace(/^#/, '').replace(/^\//, '');

  // OAuth reconnect must never inherit a stale filemanager-redirect flag.
  if (isIntegrationOauthReturn) {
    sessionStorage.removeItem('afm-filemanager-redirect');
    filemanagerRedirect = null;
    sessionStorage.setItem('afm-oauth-redirect', 'true');
    sessionStorage.setItem('afm-should-restore-tab', 'true');
    sessionStorage.setItem('afm-active-tab', 'extension');
  }

  // Hard restore: if hash was stripped on reload, restore last non-filemanager tab before app mounts.
  if (!currentHash && filemanagerRedirect !== 'true') {
    const savedTab = sessionStorage.getItem('afm-active-tab');
    if (savedTab && savedTab !== 'filemanager') {
      let restoreHash = `#/${savedTab}`;
      if (savedTab === 'settings') {
        const sub = sessionStorage.getItem('afm-settings-subtab') || 'general-settings';
        restoreHash = `#/settings/${sub}`;
      } else if (savedTab === 'notifications') {
        const sub = sessionStorage.getItem('afm-notifications-subtab') || 'email';
        restoreHash = `#/notifications/${sub}`;
      } else if (savedTab === 'extension') {
        const integration = sessionStorage.getItem('afm-extension-integration');
        restoreHash = integration ? `#/extension/${integration}` : '#/extension';
      }
      if (window.history && window.history.replaceState) {
        const url = window.location.href.split('#')[0] + restoreHash;
        window.history.replaceState(null, '', url);
      } else {
        window.location.hash = restoreHash;
      }
    }
  }

  if (!isIntegrationOauthReturn && (filemanagerRedirect === 'true' || hasActivationParam)) {
    // This is a redirect after Pro activation - set/keep the flag for useHashNavigation to handle
    // Set flag to ensure filemanager is shown (in case it wasn't set by inline script)
    sessionStorage.setItem('afm-filemanager-redirect', 'true');
    // Clear restore flags - CRITICAL: This prevents restoring previous tab
    sessionStorage.removeItem('afm-should-restore-tab');
    sessionStorage.removeItem('afm-active-tab');
  } else if (!currentHash || currentHash.startsWith('elf_')) {
    // No hash or elFinder hash - likely a File Manager menu click
    // BUT: Only clear restore flag if filemanagerRedirect is NOT set
    // (to avoid clearing it when Pro activation redirect happens)
    if (filemanagerRedirect !== 'true') {
      sessionStorage.removeItem('afm-should-restore-tab');
      // Don't clear afm-active-tab here - let useHashNavigation handle it
    }
  }

  const root = createRoot(rootElement);
  root.render(React.createElement(App));
}

