import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  AmazonS3,
  GoogleCloudStorage,
  Dropbox,
  OneDrive,
  GoogleDrive,
  GitHub,
  AICodeAssistent,
  PCloud,
  CloudflareR2,
  Wasabi
} from './integrations';
import { isFeatureAvailable } from '../utils/planFeatures';
import { getApiRoot, buildRestUrl, getAjaxUrl } from '../utils/api';
import { copyWithMessage } from '../utils/clipboard';
import ProOverlay from './ProOverlay';

function afmRestUrl(path) {
  return buildRestUrl(`file-manager-advanced/v1/${String(path || '').replace(/^\//, '')}`);
}

function parseIntegrationEnabled(data) {
  if (!data || typeof data !== 'object') return null;
  const enable = data.enable;
  if (enable === 'yes' || enable === true || enable === 1 || enable === '1') return true;
  if (enable === 'no' || enable === false || enable === 0 || enable === '0') return false;
  return null;
}

// Per-ID GET /integrations/{id} — all integrations with REST settings endpoints.
const INTEGRATIONS_SETTINGS_API_IDS = new Set([
  'ai-code-assistent',
  'onedrive',
  'google-drive',
  'dropbox',
  'amazon-s3',
  'github',
  'google-cloud-storage',
  'pcloud',
  'cloudflare-r2',
  'wasabi',
]);

function withCacheBust(url) {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_=${Date.now()}`;
}

const GCS_BUCKET_NOT_FOUND_MESSAGE = 'Bucket not found. Please check your bucket name.';

function formatBucketValidationError(rawMessage, integration = '') {
  if (!rawMessage || typeof rawMessage !== 'string') {
    return integration === 'google-cloud-storage'
      ? GCS_BUCKET_NOT_FOUND_MESSAGE
      : 'Please check the bucket name and your credentials.';
  }

  let message = rawMessage.trim();
  if (!message) {
    return integration === 'google-cloud-storage'
      ? GCS_BUCKET_NOT_FOUND_MESSAGE
      : 'Please check the bucket name and your credentials.';
  }

  if (message.startsWith('{')) {
    try {
      const parsed = JSON.parse(message);
      message = parsed?.error?.message || parsed?.message || message;
    } catch (_) {
      // Keep original text when payload is not valid JSON.
    }
  }

  const lower = message.toLowerCase();
  if (integration === 'google-cloud-storage') {
    if (
      lower.includes('may not exist')
      || lower.includes('does not exist')
      || lower.includes('not found')
      || lower.includes('storage.buckets.get')
      || (lower.includes('invalid') && lower.includes('bucket'))
      || (lower.includes('permission') && lower.includes('denied'))
    ) {
      return GCS_BUCKET_NOT_FOUND_MESSAGE;
    }
  } else {
    if (lower.includes('not found') || lower.includes('does not exist') || lower.includes('may not exist')) {
      return GCS_BUCKET_NOT_FOUND_MESSAGE;
    }
    if (lower.includes('storage.buckets.get') || (lower.includes('permission') && lower.includes('denied'))) {
      return 'Bucket is invalid or inaccessible. Check the bucket name and ensure your service account has Storage permissions.';
    }
    if (lower.includes('invalid') && lower.includes('bucket')) {
      return GCS_BUCKET_NOT_FOUND_MESSAGE;
    }
  }

  if (message.length > 220) {
    return `${message.slice(0, 220).trim()}…`;
  }

  return message;
}

async function fetchJsonWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      ...options,
      signal: controller.signal,
    });
    const raw = await response.text();
    let data = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch (_) {
      data = { message: raw || 'Invalid server response' };
    }
    if (!response.ok) {
      const msg = data?.message || data?.data?.message || `Request failed (${response.status})`;
      throw new Error(msg);
    }
    return data;
  } finally {
    clearTimeout(timeoutId);
  }
}

export default function IntegrationsPanel() {
  const root = getApiRoot();
  const nonce = window.wpApiSettings?.nonce || window.afmReact?.nonce || '';
  const hasPro = window.afmReact?.hasPro || !!window.afmReact?.proVersion || false;
  const currentPlan = window.afmReact?.currentPlan || 'free';
  const pricingUrl = window.afmReact?.pricingUrl || 'https://advancedfilemanager.com/pricing/';

  // Check plan-based feature availability for cloud integrations
  const dropboxAvailable = isFeatureAvailable('dropbox', currentPlan, hasPro);
  const googledriveAvailable = isFeatureAvailable('googledrive', currentPlan, hasPro);
  const onedriveAvailable = isFeatureAvailable('onedrive', currentPlan, hasPro);
  const amazons3Available = isFeatureAvailable('amazons3', currentPlan, hasPro);
  const githubAvailable = isFeatureAvailable('github', currentPlan, hasPro);
  const googlecloudAvailable = isFeatureAvailable('googlecloud', currentPlan, hasPro);
  const pcloudAvailable = isFeatureAvailable('pcloud', currentPlan, hasPro);
  const cloudflarer2Available = isFeatureAvailable('cloudflarer2', currentPlan, hasPro);
  const wasabiAvailable = isFeatureAvailable('wasabi', currentPlan, hasPro);
  const aiIntegrationAvailable = isFeatureAvailable('ai_integration', currentPlan, hasPro);
  const [integrationSettings, setIntegrationSettings] = useState({});
  const [integrationsLoading, setIntegrationsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [selectedAuthKeyFile, setSelectedAuthKeyFile] = useState(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingApiKey, setTestingApiKey] = useState(false);
  const [apiKeyTestResult, setApiKeyTestResult] = useState(null);
  const [onedriveConnected, setOnedriveConnected] = useState(false);
  const [dropboxConnected, setDropboxConnected] = useState(false);
  const [pcloudConnected, setPcloudConnected] = useState(false);
  const [googleDriveConnected, setGoogleDriveConnected] = useState(false);
  const [dropboxLibraryInstalled, setDropboxLibraryInstalled] = useState(false);
  const [installingDropboxLibrary, setInstallingDropboxLibrary] = useState(false);
  // Note: Google Cloud and Amazon S3 library states are now handled by their respective components
  const [showAppSecret, setShowAppSecret] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [disconnectIntegration, setDisconnectIntegration] = useState(null);
  const [aiCodePilotKeyValidated, setAiCodePilotKeyValidated] = useState(false);
  const [integrationFormKey, setIntegrationFormKey] = useState(0);
  const toggleSavePromisesRef = useRef({});
  const activeSettingsRef = useRef(null);
  const integrationsRef = useRef([]);

  useEffect(() => {
    activeSettingsRef.current = activeSettings;
  }, [activeSettings]);

  const applyIntegrationStatusMap = useCallback((connected = {}) => {
    const stateByIntegrationId = {
      'ai-code-assistent': !!connected.ai,
      onedrive: !!connected.onedrive,
      'google-drive': !!connected.googledrive,
      dropbox: !!connected.dropbox,
      'amazon-s3': !!connected.amazonses,
      github: !!connected.github,
      'google-cloud-storage': !!connected.googlecloud,
      pcloud: !!connected.pcloud,
      'cloudflare-r2': !!connected['cloudflare-r2'],
      wasabi: !!connected.wasabi,
    };

    setIntegrations(prev => prev.map(int => (
      Object.prototype.hasOwnProperty.call(stateByIntegrationId, int.id)
        ? { ...int, enabled: stateByIntegrationId[int.id] }
        : int
    )));
  }, []);

  const refreshIntegrationEnabledStates = useCallback(async () => {
    try {
      const statusResponse = await fetch(afmRestUrl('integrations-status'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': nonce
        }
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        applyIntegrationStatusMap(statusData?.connected || {});
        return true;
      }
    } catch (error) {
      // Silently ignore — list view keeps current local state
    }
    return false;
  }, [applyIntegrationStatusMap, nonce]);

  const fetchIntegrationEnabledStatesFallback = useCallback(async () => {
    const validIntegrationIds = integrationsRef.current
      .map((int) => int.id)
      .filter((id) => INTEGRATIONS_SETTINGS_API_IDS.has(id));

    const states = await Promise.all(validIntegrationIds.map(async (id) => {
      try {
        const apiUrl = afmRestUrl(`integrations/${id}`);
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': nonce
          }
        });
        if (response.ok) {
          const data = await response.json();
          const parsed = parseIntegrationEnabled(data);
          return { id, enabled: parsed === true };
        }
        return { id, enabled: false };
      } catch (error) {
        return { id, enabled: false };
      }
    }));

    setIntegrations((prev) => prev.map((int) => {
      const savedState = states.find((s) => s.id === int.id);
      return savedState ? { ...int, enabled: savedState.enabled } : int;
    }));
  }, [nonce]);

  // Reset AI Code Pilot validation when switching away from that integration
  useEffect(() => {
    if (activeSettings !== 'ai-code-assistent') {
      setAiCodePilotKeyValidated(false);
    }
  }, [activeSettings]);

  // Initialize activeSettings from hash or sessionStorage
  const getInitialActiveSettings = () => {
    const hash = window.location.hash;
    // Check if hash is in format #/extension/integration-id
    const hashMatch = hash.match(/^#\/extension\/([^\/]+)/);
    if (hashMatch && hashMatch[1]) {
      const integrationId = hashMatch[1];
      // Check if this is a valid integration ID
      const validIntegrationIds = ['ai-code-assistent', 'onedrive', 'google-drive', 'dropbox', 'amazon-s3', 'github', 'google-cloud-storage', 'pcloud', 'cloudflare-r2', 'wasabi'];
      if (validIntegrationIds.includes(integrationId)) {
        return integrationId;
      }
    }
    // If hash doesn't have integration ID, check sessionStorage
    const savedIntegration = sessionStorage.getItem('afm-extension-integration');
    if (savedIntegration) {
      const validIntegrationIds = ['ai-code-assistent', 'onedrive', 'google-drive', 'dropbox', 'amazon-s3', 'github', 'google-cloud-storage', 'pcloud', 'cloudflare-r2', 'wasabi'];
      if (validIntegrationIds.includes(savedIntegration)) {
        return savedIntegration;
      }
    }
    return null;
  };

  // Initialize activeSettings from hash or sessionStorage
  const [activeSettings, setActiveSettings] = useState(() => getInitialActiveSettings());

  // Check hash on mount and on hash change to set activeSettings if hash contains integration name
  useEffect(() => {
    const checkHash = () => {
      const hash = window.location.hash;
      // Check if hash is in format #/extension/integration-id
      const hashMatch = hash.match(/^#\/extension\/([^\/]+)/);
      if (hashMatch && hashMatch[1]) {
        const integrationId = hashMatch[1];
        // Check if this is a valid integration ID
        const validIntegrationIds = ['ai-code-assistent', 'onedrive', 'google-drive', 'dropbox', 'amazon-s3', 'github', 'google-cloud-storage', 'pcloud', 'cloudflare-r2', 'wasabi'];
        if (validIntegrationIds.includes(integrationId)) {
          // Use functional update to get current state
          setActiveSettings(prev => {
            // Only update if different to avoid unnecessary re-renders
            return prev !== integrationId ? integrationId : prev;
          });
          return; // Exit early if we found a valid integration
        }
      }

      // Only clear activeSettings if hash is explicitly #/extension or #/integrations
      // Don't clear if hash has an integration ID (e.g., #/extension/ai-code-assistent)
      // Don't clear if hash was just set (prevent race conditions)
      // Don't clear if hash is empty or doesn't match - preserve current state
      const hashJustSet = sessionStorage.getItem('afm-extension-hash-just-set');
      if (hashJustSet === 'true') {
        // Hash was just set, don't clear activeSettings
        return;
      }

      if (hash === '#/extension' || hash === '#/integrations') {
        // Check if hash has an integration ID before clearing
        const hashMatch = hash.match(/^#\/extension\/([^\/]+)/);
        if (!hashMatch) {
          // Hash doesn't have integration ID, safe to clear
          setActiveSettings(prev => {
            return prev !== null ? null : prev;
          });
        }
      }
    };

    // Check hash after a delay to let useHashNavigation run first
    // This ensures useHashNavigation preserves the hash before we read it
    const timeoutId1 = setTimeout(checkHash, 100);

    // Also check immediately in case hash is already correct
    checkHash();

    // Also check after a longer delay to catch any race conditions
    const timeoutId2 = setTimeout(checkHash, 200);

    // Listen for hash changes (back/forward buttons)
    window.addEventListener('hashchange', checkHash);

    return () => {
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      window.removeEventListener('hashchange', checkHash);
    };
  }, []); // Only run on mount - hash changes are handled by hashchange event

  // Save activeSettings to sessionStorage when it changes (for useHashNavigation)
  useEffect(() => {
    if (activeSettings) {
      sessionStorage.setItem('afm-extension-integration', activeSettings);
    } else {
      sessionStorage.removeItem('afm-extension-integration');
    }
  }, [activeSettings]);

  // Update hash when activeSettings changes (if not already correct)
  // This runs after hash check to ensure hash matches activeSettings
  useEffect(() => {
    const hashJustSet = sessionStorage.getItem('afm-extension-hash-just-set');
    if (hashJustSet === 'true') {
      return;
    }

    // Small delay to avoid conflicts with hash check useEffect and handleSettings
    const timeoutId = setTimeout(() => {
      // Check flag again after delay
      const hashJustSetAfterDelay = sessionStorage.getItem('afm-extension-hash-just-set');
      if (hashJustSetAfterDelay === 'true') {
        return;
      }

      const currentHash = window.location.hash;

      // Check if current hash contains an integration ID
      const hashMatch = currentHash.match(/^#\/extension\/([^\/]+)/);
      const hashIntegrationId = hashMatch && hashMatch[1] ? hashMatch[1] : null;
      const validIntegrationIds = ['ai-code-assistent', 'onedrive', 'google-drive', 'dropbox', 'amazon-s3', 'github', 'google-cloud-storage', 'pcloud', 'cloudflare-r2', 'wasabi'];
      const isValidHashIntegration = hashIntegrationId && validIntegrationIds.includes(hashIntegrationId);

      // If hash contains a valid integration ID but activeSettings is null,
      // don't clear the hash - let the hash check useEffect set activeSettings from the hash
      if (!activeSettings && isValidHashIntegration) {
        // Don't modify hash - preserve it so hash check can set activeSettings
        return;
      }

      if (activeSettings) {
        const expectedHash = `#/extension/${activeSettings}`;
        // Only update if hash is different AND doesn't already have the correct integration ID
        if (currentHash !== expectedHash) {
          // Double-check: if hash already has the correct integration ID, don't modify
          if (hashIntegrationId === activeSettings) {
            return;
          }

          const hashJustSet = sessionStorage.getItem('afm-extension-hash-just-set');
          if (hashJustSet === 'true') {
            return;
          }
          if (window.history && window.history.replaceState) {
            const url = window.location.href.split('#')[0] + expectedHash;
            window.history.replaceState({}, '', url);
          } else {
            window.location.hash = expectedHash;
          }
        } else {
          // Hash already matches
        }
      } else {
        // If no activeSettings and hash is not a valid integration hash, clear it
        // But only if hash is explicitly #/extension/... (not empty or other format)
        // AND hash was not just set by handleSettings or Dashboard click
        const hashJustSet = sessionStorage.getItem('afm-extension-hash-just-set');
        if (hashJustSet === 'true') {
          return;
        }

        if (currentHash && currentHash.startsWith('#/extension/') && !isValidHashIntegration) {
          const newHash = '#/extension';
          if (window.history && window.history.replaceState) {
            const url = window.location.href.split('#')[0] + newHash;
            window.history.replaceState({}, '', url);
          } else {
            window.location.hash = newHash;
          }
        }
      }
    }, 500); // Increased delay to ensure handleSettings hash update completes first

    return () => clearTimeout(timeoutId);
  }, [activeSettings]);

  // Integration data
  const [integrations, setIntegrations] = useState([
    {
      id: 'ai-code-assistent',
      title: 'AI -- Code Pilot',
      description: 'Empower developers with AI-assisted coding, real-time suggestions, and automation inside Advanced File Manager.',
      iconBg: '#4CAF50',
      iconColor: '#fff',
      icon: 'image', // Use image instead of text
      iconImage: (window.afmReact?.pluginUrl || window.afm_object?.plugin_url || '/wp-content/plugins/file-manager-advanced/') + 'application/assets/images/codepilot.png',
      enabled: false,
      hasSettings: true,
      learnMoreUrl: 'https://advancedfilemanager.com/docs/integrations/ai-coding-assistant/'
    },
    {
      id: 'onedrive',
      title: 'OneDrive',
      description: 'Seamlessly integrate OneDrive to access, organize, and manage your stored files directly through WordPress.',
      iconBg: '#0078D4',
      iconColor: '#fff',
      icon: 'image',
      iconImage: (window.afmReact?.pluginUrl || window.afm_object?.plugin_url || '/wp-content/plugins/file-manager-advanced/') + 'application/assets/images/onedrive.svg',
      enabled: false,
      hasSettings: true,
      learnMoreUrl: 'https://advancedfilemanager.com/docs/integrations/onedrive/'
    },
    {
      id: 'google-drive',
      title: 'Google Drive',
      description: 'Link Google Drive to browse, upload, and manage cloud files from your WordPress file manager.',
      iconBg: '#4285F4',
      iconColor: '#fff',
      icon: 'image',
      iconImage: (window.afmReact?.pluginUrl || window.afm_object?.plugin_url || '/wp-content/plugins/file-manager-advanced/') + 'application/assets/images/googledrive.svg',
      enabled: false,
      hasSettings: true,
      learnMoreUrl: 'https://advancedfilemanager.com/docs/integrations/google-drive/'
    },
    {
      id: 'dropbox',
      title: 'Dropbox',
      description: 'Connect Dropbox to securely upload, manage, and synchronize your files directly within the WordPress dashboard.',
      iconBg: '#0061FF',
      iconColor: '#fff',
      icon: 'image',
      iconImage: (window.afmReact?.pluginUrl || window.afm_object?.plugin_url || '/wp-content/plugins/file-manager-advanced/') + 'application/assets/images/dropbox.svg',
      enabled: false,
      hasSettings: true,
      learnMoreUrl: 'https://advancedfilemanager.com/docs/integrations/dropbox/'
    },
    {
      id: 'amazon-s3',
      title: 'Amazon S3',
      description: 'Connect Amazon S3 for scalable file storage, secure uploads, and efficient access within WordPress.',
      iconBg: '#FF9900',
      iconColor: '#fff',
      icon: 'image',
      iconImage: (window.afmReact?.pluginUrl || window.afm_object?.plugin_url || '/wp-content/plugins/file-manager-advanced/') + 'application/assets/images/amazons3.svg',
      enabled: false,
      hasSettings: true,
      learnMoreUrl: 'https://advancedfilemanager.com/docs/integrations/amazon-s3/'
    },
    {
      id: 'github',
      title: 'Github',
      description: 'Integrate GitHub to browse repositories, edit files, and sync development projects directly through WordPress.',
      iconBg: '#181717',
      iconColor: '#fff',
      icon: 'image',
      iconImage: (window.afmReact?.pluginUrl || window.afm_object?.plugin_url || '/wp-content/plugins/file-manager-advanced/') + 'application/assets/images/github.svg',
      enabled: false,
      hasSettings: true,
      learnMoreUrl: 'https://advancedfilemanager.com/docs/integrations/github-integration-in-advanced-file-manager/'
    },
    {
      id: 'google-cloud-storage',
      title: 'Google Cloud Storage',
      description: 'Enable Google Cloud for secure storage, direct uploads, and high-performance file management in WordPress.',
      iconBg: '#4285F4',
      iconColor: '#fff',
      icon: 'image',
      iconImage: (window.afmReact?.pluginUrl || window.afm_object?.plugin_url || '/wp-content/plugins/file-manager-advanced/') + 'application/assets/images/googlecloud.svg',
      enabled: false,
      hasSettings: true,
      learnMoreUrl: 'https://advancedfilemanager.com/docs/integrations/google-cloud/'
    },
    {
      id: 'pcloud',
      title: 'pCloud',
      description: 'Connect and manage your pCloud files directly from the Advanced File Manager.',
      iconBg: '#2D7FC4',
      iconColor: '#fff',
      icon: 'image',
      iconImage: (window.afmReact?.pluginUrl || window.afm_object?.plugin_url || '/wp-content/plugins/file-manager-advanced/') + 'application/assets/images/pcloud.svg',
      enabled: false,
      hasSettings: true,
      learnMoreUrl: 'https://advancedfilemanager.com/docs/integrations/pcloud/'
    },
    {
      id: 'cloudflare-r2',
      title: 'Cloudflare R2',
      description: 'Connect and manage your Cloudflare R2 buckets/files directly from the Advanced File Manager.',
      iconBg: '#F38020',
      iconColor: '#fff',
      icon: 'image',
      iconImage: (window.afmReact?.pluginUrl || window.afm_object?.plugin_url || '/wp-content/plugins/file-manager-advanced/') + 'application/assets/images/cloudflarer2.svg',
      enabled: false,
      hasSettings: true,
      learnMoreUrl: 'https://advancedfilemanager.com/docs/integrations/clouflare-r2-wordpress-integration/'
    },
    {
      id: 'wasabi',
      title: 'Wasabi',
      description: 'Connect Wasabi hot cloud storage (S3-compatible) to browse and manage buckets from the file manager.',
      iconBg: '#00ce3e',
      iconColor: '#fff',
      icon: 'image',
      iconImage: (window.afmReact?.pluginUrl || window.afm_object?.plugin_url || '/wp-content/plugins/file-manager-advanced/') + 'application/assets/images/wasabi.svg',
      enabled: false,
      hasSettings: true,
      learnMoreUrl: 'https://advancedfilemanager.com/docs/integrations/wasabi/'
    },
  ]);

  useEffect(() => {
    integrationsRef.current = integrations;
  }, [integrations]);

  // Toggle component
  const Toggle = ({ id, checked, disabled, onChange }) => (
    <label
      onClick={(e) => {
        if (!disabled && onChange) {
          e.preventDefault();
          e.stopPropagation();
          onChange({ target: { checked: !checked } });
        }
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        margin: 0,
        padding: 0,
        userSelect: 'none'
      }}
    >
      <div style={{
        position: 'relative',
        width: '44px',
        height: '24px',
        background: checked ? '#3F6972' : '#ccc',
        borderRadius: '12px',
        transition: 'background 0.3s',
        pointerEvents: disabled ? 'none' : 'auto'
      }}>
        <div style={{
          position: 'absolute',
          top: '2px',
          left: checked ? '22px' : '2px',
          width: '20px',
          height: '20px',
          background: '#fff',
          borderRadius: '50%',
          transition: 'left 0.3s',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }} />
      </div>
    </label>
  );

  const handleToggle = (id) => {
    if (!hasPro) {
      alert('Pro version is required for integrations.');
      return Promise.resolve();
    }

    const integration = integrations.find(int => int.id === id);
    if (!integration) return Promise.resolve();

    const newEnabledState = !integration.enabled;
    const apiUrl = afmRestUrl(`integrations/${id}`);
    const settingsToSave = {
      enable: newEnabledState ? 'yes' : 'no'
    };

    setIntegrations((prev) => {
      const next = prev.map(int =>
        int.id === id ? { ...int, enabled: newEnabledState } : int
      );
      integrationsRef.current = next;
      return next;
    });

    const toggleWork = (async () => {
      const saveResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': nonce
        },
        body: JSON.stringify(settingsToSave)
      });

      const data = await saveResponse.json();

      if (!saveResponse.ok || !data.success) {
        setIntegrations(prev => prev.map(int =>
          int.id === id ? { ...int, enabled: !newEnabledState } : int
        ));
        setMessage({
          type: 'error',
          text: data.message || 'Failed to save toggle state'
        });
        setTimeout(() => setMessage(null), 3000);
        throw new Error(data.message || 'Failed to save toggle state');
      }

      setIntegrations((prev) => {
        const next = prev.map(int =>
          int.id === id ? { ...int, enabled: newEnabledState } : int
        );
        integrationsRef.current = next;
        return next;
      });

      if (activeSettingsRef.current === id) {
        const savedSettings = data.settings || settingsToSave;
        setIntegrationSettings({
          ...savedSettings,
          enable: newEnabledState ? 'yes' : 'no',
        });
      }

      setMessage({
        type: 'success',
        text: data.message || `${integration.title} ${newEnabledState ? 'enabled' : 'disabled'} successfully`
      });
      setTimeout(() => setMessage(null), 3000);

      if (id === 'ai-code-assistent') {
        sessionStorage.setItem('afm_ai_settings_changed', 'true');
      }

      return newEnabledState;
    })();

    toggleSavePromisesRef.current[id] = toggleWork;
    toggleWork.finally(() => {
      if (toggleSavePromisesRef.current[id] === toggleWork) {
        delete toggleSavePromisesRef.current[id];
      }
    });

    return toggleWork.catch((error) => {
      if (error?.message !== 'Failed to save toggle state') {
        console.error('Error saving toggle state:', error);
        setIntegrations(prev => prev.map(int =>
          int.id === id ? { ...int, enabled: !newEnabledState } : int
        ));
        setMessage({ type: 'error', text: 'Failed to save toggle state' });
        setTimeout(() => setMessage(null), 3000);
      }
    });
  };

  // Fetch all integration enabled states on mount (sync with legacy Integrations menu / wp_options).
  useEffect(() => {
    const fetchAllIntegrationStates = async () => {
      try {
        const statusLoaded = await refreshIntegrationEnabledStates();
        if (!statusLoaded) {
          // Fallback only for integrations with stable per-ID REST routes (avoids 404 noise).
          await fetchIntegrationEnabledStatesFallback();
        }
      } catch (error) {
        // Silently handle overall error
      } finally {
        setIntegrationsLoading(false);
      }
    };

    fetchAllIntegrationStates();
  }, [refreshIntegrationEnabledStates, fetchIntegrationEnabledStatesFallback]);

  // Install Dropbox library
  const installDropboxLibrary = async () => {
    setInstallingDropboxLibrary(true);
    try {
      // Use REST API endpoint for library installation
      const apiUrl = afmRestUrl('integrations/dropbox/install-library');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': nonce
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setDropboxLibraryInstalled(true);
        setMessage({ type: 'success', text: data.message || 'Dropbox library installed successfully!' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        const errorMessage = data.message || data.data?.message || 'Failed to install Dropbox library';
        setMessage({ type: 'error', text: errorMessage });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error('Error installing Dropbox library:', error);
      setMessage({ type: 'error', text: 'Failed to install Dropbox library' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setInstallingDropboxLibrary(false);
    }
  };

  // Note: Amazon S3 and Google Cloud library installation is now handled by their respective components

  // Function to refresh integration settings (can be called after library installation)
  const refreshIntegrationSettings = React.useCallback(() => {
    if (!activeSettings || !hasPro) return;

    const apiUrl = afmRestUrl(`integrations/${activeSettings}`);

    fetchJsonWithTimeout(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': nonce
      }
    })
      .then(data => {
        setIntegrationSettings(data || {});
      })
      .catch(error => {
        console.error('Error refreshing integration settings:', error);
      });
  }, [activeSettings, hasPro, root, nonce]);

  // Fetch integration settings when activeSettings changes
  useEffect(() => {
    if (!activeSettings || !hasPro) return;

    let cancelled = false;

    const loadIntegrationSettings = async () => {
      setLoading(true);

      let resolvedToggleEnabled;
      const pendingToggle = toggleSavePromisesRef.current[activeSettings];
      if (pendingToggle) {
        try {
          resolvedToggleEnabled = await pendingToggle;
        } catch (error) {
          // Toggle handler already reverted UI state on failure
        }
      }

      if (cancelled) return;

      const apiUrl = afmRestUrl(`integrations/${activeSettings}`);

      try {
        const data = await fetchJsonWithTimeout(withCacheBust(apiUrl), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': nonce
          }
        });

        if (cancelled) return;

        const parsedEnabled = parseIntegrationEnabled(data);
        setIntegrations(prev => prev.map(int => {
          if (int.id !== activeSettings) return int;
          if (typeof resolvedToggleEnabled === 'boolean') {
            return { ...int, enabled: resolvedToggleEnabled };
          }
          if (parsedEnabled !== null) {
            return { ...int, enabled: parsedEnabled };
          }
          return int;
        }));

        const nextEnabled = typeof resolvedToggleEnabled === 'boolean'
          ? resolvedToggleEnabled
          : (parsedEnabled !== null ? parsedEnabled : undefined);
        setIntegrationSettings({
          ...(data || {}),
          ...(typeof nextEnabled === 'boolean'
            ? { enable: nextEnabled ? 'yes' : 'no' }
            : {}),
        });
        setIntegrationFormKey((key) => key + 1);

        if (activeSettings === 'onedrive' && data.is_connected !== undefined) {
          setOnedriveConnected(data.is_connected);
        }
        if (activeSettings === 'google-drive' && data.is_connected !== undefined) {
          setGoogleDriveConnected(data.is_connected);
          if (data.error_message) {
            setMessage({ type: 'error', text: data.error_message });
            setTimeout(() => setMessage(null), 5000);
          }
        }
        if (activeSettings === 'dropbox') {
          if (data.is_connected !== undefined) {
            setDropboxConnected(data.is_connected);
          }
          if (data.library_installed !== undefined) {
            setDropboxLibraryInstalled(data.library_installed);
          } else {
            setDropboxLibraryInstalled(false);
          }
          if (data.error_message) {
            setMessage({ type: 'error', text: data.error_message });
            setTimeout(() => setMessage(null), 5000);
          }
        }
        if (activeSettings === 'pcloud' && data.is_connected !== undefined) {
          setPcloudConnected(data.is_connected);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error fetching integration settings:', error);
          setMessage({ type: 'error', text: `Failed to load ${activeSettings} settings. ${error.message || ''}`.trim() });
          setTimeout(() => setMessage(null), 5000);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadIntegrationSettings();

    return () => {
      cancelled = true;
    };
  }, [activeSettings, hasPro, root, nonce]);

  // (perf) removed verbose debug logging for modal state

  // Handle OAuth redirect parameters on mount - process messages immediately
  useEffect(() => {
    // First check URL params, then fallback to sessionStorage (in case URL was cleaned)
    const urlParams = new URLSearchParams(window.location.search);
    let dropboxConnectedParam = urlParams.get('dropbox_connected');
    let dropboxDisconnectedParam = urlParams.get('dropbox_disconnected');
    let dropboxErrorParam = urlParams.get('dropbox_error');
    let onedriveConnectedParam = urlParams.get('onedrive_connected');
    let onedriveDisconnectedParam = urlParams.get('onedrive_disconnected');
    let onedriveErrorParam = urlParams.get('onedrive_error');
    let googledriveConnectedParam = urlParams.get('googledrive_connected');
    let googledriveDisconnectedParam = urlParams.get('googledrive_disconnected');
    let googledriveErrorParam = urlParams.get('googledrive_error');
    let errorMsgParam = urlParams.get('error_msg');
    let redirectHash = urlParams.get('redirect_hash');

    // Fallback to sessionStorage if URL params are not available (URL was cleaned by useHashNavigation)
    if (!dropboxConnectedParam) {
      dropboxConnectedParam = sessionStorage.getItem('afm-dropbox-connected');
    }
    if (!dropboxDisconnectedParam) {
      dropboxDisconnectedParam = sessionStorage.getItem('afm-dropbox-disconnected');
    }
    if (!dropboxErrorParam) {
      dropboxErrorParam = sessionStorage.getItem('afm-dropbox-error');
    }
    if (!onedriveConnectedParam) {
      onedriveConnectedParam = sessionStorage.getItem('afm-onedrive-connected');
    }
    if (!onedriveDisconnectedParam) {
      onedriveDisconnectedParam = sessionStorage.getItem('afm-onedrive-disconnected');
    }
    if (!onedriveErrorParam) {
      onedriveErrorParam = sessionStorage.getItem('afm-onedrive-error');
    }
    if (!googledriveConnectedParam) {
      googledriveConnectedParam = sessionStorage.getItem('afm-googledrive-connected');
    }
    if (!googledriveDisconnectedParam) {
      googledriveDisconnectedParam = sessionStorage.getItem('afm-googledrive-disconnected');
    }
    if (!googledriveErrorParam) {
      googledriveErrorParam = sessionStorage.getItem('afm-googledrive-error');
    }
    if (!errorMsgParam) {
      errorMsgParam = sessionStorage.getItem('afm-dropbox-error-msg') || sessionStorage.getItem('afm-onedrive-error-msg') || sessionStorage.getItem('afm-googledrive-error-msg');
    }
    if (!redirectHash) {
      redirectHash = sessionStorage.getItem('afm-oauth-redirect-hash');
    }

    // (perf) removed verbose OAuth debug logging

    // Process Dropbox error message first (highest priority)
    if (dropboxErrorParam === '1') {
      setActiveSettings('dropbox');

      if (errorMsgParam) {
        const decodedError = decodeURIComponent(errorMsgParam);
        setMessage({ type: 'error', text: decodedError });
        setTimeout(() => {
          setMessage(null);
        }, 5000);
      } else {
        // Fallback error message if error_msg param is missing
        setMessage({ type: 'error', text: 'Dropbox connection failed. Please check your credentials.' });
        setTimeout(() => setMessage(null), 5000);
      }

      // Clean URL after a delay and set restore flags
      setTimeout(() => {
        const hash = redirectHash || '#/extension/dropbox';
        const pageParam = urlParams.get('page') || 'file_manager_advanced_ui';
        const newUrl = window.location.pathname + '?page=' + encodeURIComponent(pageParam) + hash;
        window.history.replaceState({}, '', newUrl);

        // Set restore flags to preserve extension tab on reload
        sessionStorage.setItem('afm-should-restore-tab', 'true');
        sessionStorage.setItem('afm-active-tab', 'extension');
        sessionStorage.setItem('afm-extension-integration', 'dropbox');
      }, 200);

      // Clear sessionStorage after processing
      sessionStorage.removeItem('afm-dropbox-error');
      sessionStorage.removeItem('afm-dropbox-error-msg');
      sessionStorage.removeItem('afm-oauth-redirect-hash');
      return; // Don't process connect/disconnect if error
    }

    // Process Dropbox connect message
    if (dropboxConnectedParam === '1') {
      console.log('Setting Dropbox connected message');
      setMessage({ type: 'success', text: 'Dropbox connected successfully!' });
      setTimeout(() => {
        console.log('Clearing Dropbox connected message');
        setMessage(null);
      }, 5000);

      setActiveSettings('dropbox');
      setDropboxConnected(true);

      // Clean URL after a delay and set restore flags
      setTimeout(() => {
        // Set flag to prevent useHashNavigation from overriding
        sessionStorage.setItem('afm-extension-hash-just-set', 'true');

        const hash = redirectHash || '#/extension/dropbox';
        const pageParam = urlParams.get('page') || 'file_manager_advanced_ui';
        const newUrl = window.location.pathname + '?page=' + encodeURIComponent(pageParam) + hash;
        window.history.replaceState({}, '', newUrl);

        // Set restore flags to preserve extension tab on reload
        sessionStorage.setItem('afm-should-restore-tab', 'true');
        sessionStorage.setItem('afm-active-tab', 'extension');
        sessionStorage.setItem('afm-extension-integration', 'dropbox');

        // Clear flag after delay
        setTimeout(() => {
          sessionStorage.removeItem('afm-extension-hash-just-set');
        }, 1000);
      }, 200);

      // Clear sessionStorage after processing
      sessionStorage.removeItem('afm-dropbox-connected');
      sessionStorage.removeItem('afm-oauth-redirect-hash');
    }

    // Process Dropbox disconnect message
    if (dropboxDisconnectedParam === '1') {
      console.log('Setting Dropbox disconnected message');
      setMessage({ type: 'success', text: 'Dropbox disconnected successfully!' });
      setTimeout(() => {
        console.log('Clearing Dropbox disconnected message');
        setMessage(null);
      }, 5000);

      setActiveSettings('dropbox');
      setDropboxConnected(false);

      // Clean URL after a delay and set restore flags
      setTimeout(() => {
        // Set flag to prevent useHashNavigation from overriding
        sessionStorage.setItem('afm-extension-hash-just-set', 'true');

        const hash = redirectHash || '#/extension/dropbox';
        const pageParam = urlParams.get('page') || 'file_manager_advanced_ui';
        const newUrl = window.location.pathname + '?page=' + encodeURIComponent(pageParam) + hash;
        window.history.replaceState({}, '', newUrl);

        // Set restore flags to preserve extension tab on reload
        sessionStorage.setItem('afm-should-restore-tab', 'true');
        sessionStorage.setItem('afm-active-tab', 'extension');
        sessionStorage.setItem('afm-extension-integration', 'dropbox');

        // Clear flag after delay
        setTimeout(() => {
          sessionStorage.removeItem('afm-extension-hash-just-set');
        }, 1000);
      }, 200);

      // Clear sessionStorage after processing
      sessionStorage.removeItem('afm-dropbox-disconnected');
      sessionStorage.removeItem('afm-oauth-redirect-hash');
    }

    // Process OneDrive error message first (highest priority)
    if (onedriveErrorParam === '1') {
      console.log('Setting OneDrive error message');
      setActiveSettings('onedrive');

      if (errorMsgParam) {
        const decodedError = decodeURIComponent(errorMsgParam);
        console.log('Error message:', decodedError);
        setMessage({ type: 'error', text: decodedError });
        setTimeout(() => {
          console.log('Clearing OneDrive error message');
          setMessage(null);
        }, 5000);
      } else {
        // Fallback error message if error_msg param is missing
        setMessage({ type: 'error', text: 'OneDrive connection failed. Please check your credentials.' });
        setTimeout(() => setMessage(null), 5000);
      }

      // Clean URL after a delay and set restore flags
      setTimeout(() => {
        const hash = redirectHash || '#/extension/onedrive';
        const pageParam = urlParams.get('page') || 'file_manager_advanced_ui';
        const newUrl = window.location.pathname + '?page=' + encodeURIComponent(pageParam) + hash;
        window.history.replaceState({}, '', newUrl);

        // Set restore flags to preserve extension tab on reload
        sessionStorage.setItem('afm-should-restore-tab', 'true');
        sessionStorage.setItem('afm-active-tab', 'extension');
        sessionStorage.setItem('afm-extension-integration', 'onedrive');
      }, 200);

      // Clear sessionStorage after processing
      sessionStorage.removeItem('afm-onedrive-error');
      sessionStorage.removeItem('afm-onedrive-error-msg');
      sessionStorage.removeItem('afm-oauth-redirect-hash');
      return; // Don't process connect/disconnect if error
    }

    // Process OneDrive connect message
    if (onedriveConnectedParam === '1') {
      console.log('Setting OneDrive connected message');
      setMessage({ type: 'success', text: 'OneDrive connected successfully!' });
      setTimeout(() => {
        console.log('Clearing OneDrive connected message');
        setMessage(null);
      }, 5000);

      setActiveSettings('onedrive');
      setOnedriveConnected(true);

      // Clean URL after a delay and set restore flags
      setTimeout(() => {
        // Set flag to prevent useHashNavigation from overriding
        sessionStorage.setItem('afm-extension-hash-just-set', 'true');

        const hash = redirectHash || '#/extension/onedrive';
        const pageParam = urlParams.get('page') || 'file_manager_advanced_ui';
        const newUrl = window.location.pathname + '?page=' + encodeURIComponent(pageParam) + hash;
        window.history.replaceState({}, '', newUrl);

        // Set restore flags to preserve extension tab on reload
        sessionStorage.setItem('afm-should-restore-tab', 'true');
        sessionStorage.setItem('afm-active-tab', 'extension');
        sessionStorage.setItem('afm-extension-integration', 'onedrive');

        // Clear flag after delay
        setTimeout(() => {
          sessionStorage.removeItem('afm-extension-hash-just-set');
        }, 1000);
      }, 200);

      // Clear sessionStorage after processing
      sessionStorage.removeItem('afm-onedrive-connected');
      sessionStorage.removeItem('afm-oauth-redirect-hash');
    }

    // Process OneDrive disconnect message
    if (onedriveDisconnectedParam === '1') {
      console.log('Setting OneDrive disconnected message');
      setMessage({ type: 'success', text: 'OneDrive disconnected successfully!' });
      setTimeout(() => {
        console.log('Clearing OneDrive disconnected message');
        setMessage(null);
      }, 5000);

      setActiveSettings('onedrive');
      setOnedriveConnected(false);

      // Clean URL after a delay and set restore flags
      setTimeout(() => {
        // Set flag to prevent useHashNavigation from overriding
        sessionStorage.setItem('afm-extension-hash-just-set', 'true');

        const hash = redirectHash || '#/extension/onedrive';
        const pageParam = urlParams.get('page') || 'file_manager_advanced_ui';
        const newUrl = window.location.pathname + '?page=' + encodeURIComponent(pageParam) + hash;
        window.history.replaceState({}, '', newUrl);

        // Set restore flags to preserve extension tab on reload
        sessionStorage.setItem('afm-should-restore-tab', 'true');
        sessionStorage.setItem('afm-active-tab', 'extension');
        sessionStorage.setItem('afm-extension-integration', 'onedrive');

        // Clear flag after delay
        setTimeout(() => {
          sessionStorage.removeItem('afm-extension-hash-just-set');
        }, 1000);
      }, 200);

      // Clear sessionStorage after processing
      sessionStorage.removeItem('afm-onedrive-disconnected');
      sessionStorage.removeItem('afm-oauth-redirect-hash');
    }

    // Process Google Drive error message first (highest priority)
    if (googledriveErrorParam === '1') {
      console.log('Setting Google Drive error message');
      setActiveSettings('google-drive');

      if (errorMsgParam) {
        const decodedError = decodeURIComponent(errorMsgParam);
        console.log('Error message:', decodedError);
        setMessage({ type: 'error', text: decodedError });
        setTimeout(() => {
          console.log('Clearing Google Drive error message');
          setMessage(null);
        }, 5000);
      } else {
        // Fallback error message if error_msg param is missing
        setMessage({ type: 'error', text: 'Google Drive connection failed. Please check your credentials.' });
        setTimeout(() => setMessage(null), 5000);
      }

      // Clean URL after a delay and set restore flags
      setTimeout(() => {
        sessionStorage.setItem('afm-extension-hash-just-set', 'true'); // Prevent useHashNavigation from overriding
        const hash = redirectHash || '#/extension/google-drive';
        const pageParam = urlParams.get('page') || 'file_manager_advanced_ui';
        const newUrl = window.location.pathname + '?page=' + encodeURIComponent(pageParam) + hash;
        window.history.replaceState({}, '', newUrl);

        sessionStorage.setItem('afm-should-restore-tab', 'true');
        sessionStorage.setItem('afm-active-tab', 'extension');
        sessionStorage.setItem('afm-extension-integration', 'google-drive');
        setTimeout(() => {
          sessionStorage.removeItem('afm-extension-hash-just-set');
        }, 1000);
      }, 200);

      // Clear sessionStorage after processing
      sessionStorage.removeItem('afm-googledrive-error');
      sessionStorage.removeItem('afm-googledrive-error-msg');
      sessionStorage.removeItem('afm-oauth-redirect-hash');
      return; // Don't process connect/disconnect if error
    }

    // Process Google Drive connect message
    if (googledriveConnectedParam === '1') {
      console.log('Setting Google Drive connected message');
      setMessage({ type: 'success', text: 'Google Drive connected successfully!' });
      setTimeout(() => {
        console.log('Clearing Google Drive connected message');
        setMessage(null);
      }, 5000);

      setActiveSettings('google-drive');
      setGoogleDriveConnected(true);

      // Clean URL after a delay and set restore flags
      setTimeout(() => {
        sessionStorage.setItem('afm-extension-hash-just-set', 'true'); // Prevent useHashNavigation from overriding
        const hash = redirectHash || '#/extension/google-drive';
        const pageParam = urlParams.get('page') || 'file_manager_advanced_ui';
        const newUrl = window.location.pathname + '?page=' + encodeURIComponent(pageParam) + hash;
        window.history.replaceState({}, '', newUrl);

        sessionStorage.setItem('afm-should-restore-tab', 'true');
        sessionStorage.setItem('afm-active-tab', 'extension');
        sessionStorage.setItem('afm-extension-integration', 'google-drive');
        setTimeout(() => {
          sessionStorage.removeItem('afm-extension-hash-just-set');
        }, 1000);
      }, 200);

      // Clear sessionStorage after processing
      sessionStorage.removeItem('afm-googledrive-connected');
      sessionStorage.removeItem('afm-oauth-redirect-hash');
    }

    // Process Google Drive disconnect message
    if (googledriveDisconnectedParam === '1') {
      console.log('Setting Google Drive disconnected message');
      setMessage({ type: 'success', text: 'Google Drive disconnected successfully!' });
      setTimeout(() => {
        console.log('Clearing Google Drive disconnected message');
        setMessage(null);
      }, 5000);

      setActiveSettings('google-drive');
      setGoogleDriveConnected(false);

      // Clean URL after a delay and set restore flags
      setTimeout(() => {
        sessionStorage.setItem('afm-extension-hash-just-set', 'true'); // Prevent useHashNavigation from overriding
        const hash = redirectHash || '#/extension/google-drive';
        const pageParam = urlParams.get('page') || 'file_manager_advanced_ui';
        const newUrl = window.location.pathname + '?page=' + encodeURIComponent(pageParam) + hash;
        window.history.replaceState({}, '', newUrl);

        sessionStorage.setItem('afm-should-restore-tab', 'true');
        sessionStorage.setItem('afm-active-tab', 'extension');
        sessionStorage.setItem('afm-extension-integration', 'google-drive');
        setTimeout(() => {
          sessionStorage.removeItem('afm-extension-hash-just-set');
        }, 1000);
      }, 200);

      // Clear sessionStorage after processing
      sessionStorage.removeItem('afm-googledrive-disconnected');
      sessionStorage.removeItem('afm-oauth-redirect-hash');
    }
  }, []); // Run only on mount

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const onedriveConnectedParam = urlParams.get('onedrive_connected');
    const onedriveDisconnectedParam = urlParams.get('onedrive_disconnected');
    const googledriveConnectedParam = urlParams.get('googledrive_connected');
    const googledriveDisconnectedParam = urlParams.get('googledrive_disconnected');
    const dropboxConnectedParam = urlParams.get('dropbox_connected');
    const dropboxDisconnectedParam = urlParams.get('dropbox_disconnected');
    const dropboxErrorParam = urlParams.get('dropbox_error');
    const pcloudConnectedParam = urlParams.get('pcloud_connected');
    const pcloudDisconnectedParam = urlParams.get('pcloud_disconnected');
    const pcloudErrorParam = urlParams.get('pcloud_error');
    const errorMsgParam = urlParams.get('error_msg');
    const redirectHash = urlParams.get('redirect_hash');

    // Handle redirect_hash if present (from OAuth redirect)
    if (redirectHash) {
      // Read page parameter BEFORE modifying URL (must be read from original URL)
      const pageParam = urlParams.get('page') || 'file_manager_advanced_ui';

      // Check if redirectHash is in old format (#/integrations) or new format (#/extension/integration-id)
      let finalHash = redirectHash;
      if (redirectHash.includes('onedrive')) {
        // If it's old format, convert to new format
        if (!redirectHash.startsWith('#/extension/')) {
          finalHash = '#/extension/onedrive';
        }
        setActiveSettings('onedrive');
      } else if (redirectHash.includes('googledrive') || redirectHash.includes('google-drive')) {
        // If it's old format, convert to new format
        if (!redirectHash.startsWith('#/extension/')) {
          finalHash = '#/extension/google-drive';
        }
        setActiveSettings('google-drive');
      } else if (redirectHash.includes('dropbox')) {
        // If it's old format, convert to new format
        if (!redirectHash.startsWith('#/extension/')) {
          finalHash = '#/extension/dropbox';
        }
        setActiveSettings('dropbox');
      }

      // Clean URL by removing query params but preserve page parameter and hash
      // Always include page parameter in the cleaned URL
      let newUrl = window.location.pathname;
      newUrl += '?page=' + encodeURIComponent(pageParam);
      newUrl += finalHash;
      window.history.replaceState({}, '', newUrl);
    }

    if (onedriveConnectedParam === '1') {
      // Ensure OneDrive settings are open
      if (activeSettings !== 'onedrive') {
        setActiveSettings('onedrive');
      }
      setOnedriveConnected(true);
      setMessage({ type: 'success', text: 'OneDrive connected successfully!' });
      setTimeout(() => setMessage(null), 3000);
      // Clean URL - use extension/onedrive format
      const hash = redirectHash || '#/extension/onedrive';
      const pageParam = urlParams.get('page') || 'file_manager_advanced_ui';
      const newUrl = window.location.pathname + '?page=' + encodeURIComponent(pageParam) + hash;
      window.history.replaceState({}, '', newUrl);
    }

    if (onedriveDisconnectedParam === '1') {
      // Ensure OneDrive settings are open
      if (activeSettings !== 'onedrive') {
        setActiveSettings('onedrive');
      }
      setOnedriveConnected(false);
      setMessage({ type: 'success', text: 'OneDrive disconnected successfully!' });
      setTimeout(() => setMessage(null), 3000);
      // Clean URL - use extension/onedrive format
      const hash = redirectHash || '#/extension/onedrive';
      const pageParam = urlParams.get('page') || 'file_manager_advanced_ui';
      const newUrl = window.location.pathname + '?page=' + encodeURIComponent(pageParam) + hash;
      window.history.replaceState({}, '', newUrl);
    }

    // Clean URL for Dropbox connect/disconnect (message already handled in mount useEffect)
    if (dropboxConnectedParam === '1' || dropboxDisconnectedParam === '1') {
      const hash = redirectHash || '#/extension/dropbox';
      const pageParam = urlParams.get('page') || 'file_manager_advanced_ui';
      const newUrl = window.location.pathname + '?page=' + encodeURIComponent(pageParam) + hash;
      window.history.replaceState({}, '', newUrl);
    }

    if (pcloudConnectedParam === '1') {
      if (activeSettings !== 'pcloud') {
        setActiveSettings('pcloud');
      }
      setPcloudConnected(true);
      setMessage({ type: 'success', text: 'pCloud connected successfully!' });
      setTimeout(() => setMessage(null), 3000);
      const hash = redirectHash || '#/extension/pcloud';
      const pageParam = urlParams.get('page') || 'file_manager_advanced_ui';
      const newUrl = window.location.pathname + '?page=' + encodeURIComponent(pageParam) + hash;
      window.history.replaceState({}, '', newUrl);
    }

    if (pcloudDisconnectedParam === '1') {
      if (activeSettings !== 'pcloud') {
        setActiveSettings('pcloud');
      }
      setPcloudConnected(false);
      setMessage({ type: 'success', text: 'pCloud disconnected successfully!' });
      setTimeout(() => setMessage(null), 3000);
      const hash = redirectHash || '#/extension/pcloud';
      const pageParam = urlParams.get('page') || 'file_manager_advanced_ui';
      const newUrl = window.location.pathname + '?page=' + encodeURIComponent(pageParam) + hash;
      window.history.replaceState({}, '', newUrl);
    }

    if (pcloudErrorParam === '1') {
      if (activeSettings !== 'pcloud') {
        setActiveSettings('pcloud');
      }
      if (errorMsgParam) {
        setMessage({ type: 'error', text: decodeURIComponent(errorMsgParam) });
        setTimeout(() => setMessage(null), 5000);
      }
      const hash = redirectHash || '#/extension/pcloud';
      const pageParam = urlParams.get('page') || 'file_manager_advanced_ui';
      const newUrl = window.location.pathname + '?page=' + encodeURIComponent(pageParam) + hash;
      window.history.replaceState({}, '', newUrl);
    }

    // I will search for `dropbox_connected` to find the backend redirect logic.
    // Handle Dropbox error parameter
    if (dropboxErrorParam === '1' && !googledriveConnectedParam && !googledriveDisconnectedParam && !redirectHash?.includes('google')) {
      // Ensure Dropbox settings are open
      if (activeSettings !== 'dropbox') {
        setActiveSettings('dropbox');
      }

      // Show error message from URL parameter if available
      if (errorMsgParam) {
        setMessage({ type: 'error', text: decodeURIComponent(errorMsgParam) });
        setTimeout(() => setMessage(null), 5000);
      }

      // Clean URL - use extension/dropbox format
      const hash = redirectHash || '#/extension/dropbox';
      const pageParam = urlParams.get('page') || 'file_manager_advanced_ui';
      const newUrl = window.location.pathname + '?page=' + encodeURIComponent(pageParam) + hash;
      window.history.replaceState({}, '', newUrl);
    } else if (dropboxErrorParam === '1') {
      // Clean up stale dropbox error param if we are processing another integration
      const hash = redirectHash || window.location.hash || '#/extension';
      const pageParam = urlParams.get('page') || 'file_manager_advanced_ui';
      const newUrl = window.location.pathname + '?page=' + encodeURIComponent(pageParam) + hash;
      window.history.replaceState({}, '', newUrl);
    }
  }, [activeSettings]);

  const handleSettings = async (id) => {
    if (!hasPro) {
      alert('Pro version is required for integrations.');
      return;
    }
    console.log('handleSettings called with id:', id);

    let resolvedToggleEnabled;
    const pendingToggle = toggleSavePromisesRef.current[id];
    if (pendingToggle) {
      try {
        resolvedToggleEnabled = await pendingToggle;
      } catch (error) {
        // Toggle handler already reverted UI state on failure
      }
    }

    const currentIntegration = integrationsRef.current.find((int) => int.id === id);
    const enabled = typeof resolvedToggleEnabled === 'boolean'
      ? resolvedToggleEnabled
      : !!currentIntegration?.enabled;

    // Save to sessionStorage FIRST (synchronously) so useHashNavigation can see it
    sessionStorage.setItem('afm-extension-integration', id);
    console.log('Saved to sessionStorage:', id);

    // Set a flag to prevent useHashNavigation from clearing hash immediately
    sessionStorage.setItem('afm-extension-hash-just-set', 'true');
    setTimeout(() => {
      sessionStorage.removeItem('afm-extension-hash-just-set');
    }, 2000); // Increased to 2 seconds to prevent race conditions

    setActiveSettings(id);
    setIntegrationSettings({ enable: enabled ? 'yes' : 'no' });

    // Update URL hash to include integration name - do this immediately and forcefully
    const newHash = `#/extension/${id}`;
    const currentUrl = window.location.href.split('#')[0];
    const fullUrl = currentUrl + newHash;
    console.log('Setting hash to:', newHash, 'Full URL:', fullUrl);

    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, '', fullUrl);
      console.log('Hash set via replaceState');
    } else {
      window.location.hash = newHash;
      console.log('Hash set via location.hash');
    }

    // Force verify and set again multiple times to ensure it sticks
    setTimeout(() => {
      const verifyHash = window.location.hash;
      console.log('Hash verification after 50ms:', verifyHash);
      if (verifyHash !== newHash) {
        console.warn('Hash mismatch! Expected:', newHash, 'Got:', verifyHash);
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, '', fullUrl);
        } else {
          window.location.hash = newHash;
        }
      }
    }, 50);

    setTimeout(() => {
      const verifyHash = window.location.hash;
      console.log('Hash verification after 150ms:', verifyHash);
      if (verifyHash !== newHash) {
        console.warn('Hash mismatch! Expected:', newHash, 'Got:', verifyHash);
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, '', fullUrl);
        } else {
          window.location.hash = newHash;
        }
      }
    }, 150);

    setTimeout(() => {
      const verifyHash = window.location.hash;
      console.log('Hash verification after 300ms:', verifyHash);
      if (verifyHash !== newHash) {
        console.warn('Hash mismatch! Expected:', newHash, 'Got:', verifyHash);
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, '', fullUrl);
        } else {
          window.location.hash = newHash;
        }
      }
    }, 300);
  };

  const handleBackToIntegrations = () => {
    setActiveSettings(null);
    setIntegrationSettings({});
    setMessage(null);
    if (hasPro) {
      refreshIntegrationEnabledStates();
    }
    // Update URL hash to just extension tab
    const newHash = '#/extension';
    if (window.history && window.history.replaceState) {
      const url = window.location.href.split('#')[0] + newHash;
      window.history.replaceState({}, '', url);
    } else {
      window.location.hash = newHash;
    }
  };

  const handleCopyRedirectUri = async (uri) => {
    await copyWithMessage(uri, setMessage, 'Redirect URI copied to clipboard!');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!hasPro || !activeSettings) {
      return;
    }

    const currentIntegrationForSave = integrationsRef.current.find((int) => int.id === activeSettings);
    if (!currentIntegrationForSave?.enabled) {
      setMessage({
        type: 'error',
        text: 'Please enable this integration first before saving settings.'
      });
      setTimeout(() => setMessage(null), 5000);
      return;
    }

    setSaving(true);
    setMessage(null);

    const formData = new FormData(e.target);
    const settings = {};

    // Handle file upload for Google Cloud Storage separately
    let authKeyUploaded = false;

    // Validation for Amazon S3
    if (activeSettings === 'amazon-s3') {
      // Check if library is installed first (from settings)
      if (!integrationSettings.library_installed) {
        setMessage({ type: 'error', text: 'Please install Amazon S3 library first before saving settings.' });
        setTimeout(() => setMessage(null), 5000);
        setSaving(false);
        return;
      }

      // Get values directly from input elements (since they use defaultValue, not value)
      const bucketInput = document.getElementById('bucket');
      const appKeyInput = document.getElementById('app_key');
      const appSecretInput = document.getElementById('app_secret');
      const regionInput = document.getElementById('region');

      if (!bucketInput || !appKeyInput || !appSecretInput || !regionInput) {
        setMessage({ type: 'error', text: 'Required input fields not found. Please refresh the page.' });
        setTimeout(() => setMessage(null), 5000);
        setSaving(false);
        return;
      }

      const bucket = (bucketInput.value || '').trim();
      const appKey = (appKeyInput.value || '').trim();
      const appSecret = (appSecretInput.value || '').trim();
      const region = (regionInput.value || '').trim();

      // Validate required fields
      if (!bucket || bucket.length === 0) {
        setMessage({ type: 'error', text: 'Please enter your Amazon S3 Bucket Name.' });
        setTimeout(() => setMessage(null), 5000);
        setSaving(false);
        return;
      }

      if (!appKey || appKey.length === 0) {
        setMessage({ type: 'error', text: 'Please enter your Amazon S3 App Key.' });
        setTimeout(() => setMessage(null), 5000);
        setSaving(false);
        return;
      }

      if (!appSecret || appSecret.length === 0) {
        setMessage({ type: 'error', text: 'Please enter your Amazon S3 App Secret.' });
        setTimeout(() => setMessage(null), 5000);
        setSaving(false);
        return;
      }

      if (!region || region.length === 0) {
        setMessage({ type: 'error', text: 'Please enter your AWS Region.' });
        setTimeout(() => setMessage(null), 5000);
        setSaving(false);
        return;
      }

      if (bucket.length < 3 || bucket.length > 63) {
        setMessage({ type: 'error', text: 'Bucket name must be between 3 and 63 characters long.' });
        setTimeout(() => setMessage(null), 5000);
        setSaving(false);
        return;
      }

      const bucketFormatValid = /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(bucket) || /^[a-z0-9]$/.test(bucket);

      if (!bucketFormatValid) {
        setMessage({ type: 'error', text: 'Bucket name format is invalid. Use lowercase letters, numbers, dots, and hyphens. Must start and end with a letter or number.' });
        setTimeout(() => setMessage(null), 5000);
        setSaving(false);
        return;
      }

      if (appKey.length < 10) {
        setMessage({ type: 'error', text: 'App Key appears to be too short. Please check your AWS Access Key ID.' });
        setTimeout(() => setMessage(null), 5000);
        setSaving(false);
        return;
      }

      if (appSecret.length < 20) {
        setMessage({ type: 'error', text: 'App Secret appears to be too short. Please check your AWS Secret Access Key.' });
        setTimeout(() => setMessage(null), 5000);
        setSaving(false);
        return;
      }

      if (region.length < 2) {
        setMessage({ type: 'error', text: 'Region appears to be invalid. Please check your AWS Region.' });
        setTimeout(() => setMessage(null), 5000);
        setSaving(false);
        return;
      }
    }

    if (activeSettings === 'wasabi') {
      if (!integrationSettings.library_installed) {
        setMessage({ type: 'error', text: 'Please install the Wasabi library first (same SDK as S3).' });
        setTimeout(() => setMessage(null), 5000);
        setSaving(false);
        return;
      }
      const bucketInputW = document.getElementById('bucket');
      const accessKeyInputW = document.getElementById('access_key');
      const secretKeyInputW = document.getElementById('secret_key');
      const regionInputW = document.getElementById('region');
      const endpointInputW = document.getElementById('endpoint');
      if (!bucketInputW || !accessKeyInputW || !secretKeyInputW || !regionInputW || !endpointInputW) {
        setMessage({ type: 'error', text: 'Required Wasabi fields not found. Please refresh the page.' });
        setTimeout(() => setMessage(null), 5000);
        setSaving(false);
        return;
      }
      const bucketW = (bucketInputW.value || '').trim();
      const accessKeyW = (accessKeyInputW.value || '').trim();
      const secretKeyW = (secretKeyInputW.value || '').trim();
      const regionW = (regionInputW.value || '').trim();
      const endpointW = (endpointInputW.value || '').trim();
      if (!bucketW || !accessKeyW || !secretKeyW || !regionW || !endpointW) {
        setMessage({ type: 'error', text: 'Please fill Access Key, Secret Key, Region, Endpoint, and Bucket for Wasabi.' });
        setTimeout(() => setMessage(null), 5000);
        setSaving(false);
        return;
      }
      if (bucketW.length < 3 || bucketW.length > 63) {
        setMessage({ type: 'error', text: 'Bucket name must be between 3 and 63 characters long.' });
        setTimeout(() => setMessage(null), 5000);
        setSaving(false);
        return;
      }
      const bucketFormatValidW = /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(bucketW) || /^[a-z0-9]$/.test(bucketW);
      if (!bucketFormatValidW) {
        setMessage({ type: 'error', text: 'Bucket name format is invalid for Wasabi (S3 rules).' });
        setTimeout(() => setMessage(null), 5000);
        setSaving(false);
        return;
      }
    }

    if (activeSettings === 'google-cloud-storage') {
      // Check if library is installed first (from settings)
      if (!integrationSettings.library_installed) {
        setMessage({ type: 'error', text: 'Please install Google Cloud library first before saving settings.' });
        setTimeout(() => setMessage(null), 5000);
        setSaving(false);
        return;
      }

      // Validation for Google Cloud Storage
      // Get bucket value directly from input element (since it uses defaultValue, not value)
      const bucketInput = document.getElementById('bucket');
      if (!bucketInput) {
        setMessage({ type: 'error', text: 'Bucket input field not found. Please refresh the page.' });
        setTimeout(() => setMessage(null), 5000);
        setSaving(false);
        return;
      }

      const bucketValue = bucketInput.value || '';
      const bucket = bucketValue.trim();

      // Validate bucket name - required
      if (!bucket || bucket.length === 0) {
        setMessage({ type: 'error', text: 'Please enter your Google Cloud Bucket Name.' });
        setTimeout(() => setMessage(null), 5000);
        setSaving(false);
        return;
      }

      // Validate bucket name format
      // Bucket names must:
      // - Start and end with a lowercase letter or number
      // - Contain only lowercase letters, numbers, hyphens (-), underscores (_), and dots (.)
      // - Be 3-63 characters long (but we check length separately)
      // For single character: /^[a-z0-9]$/
      // For two characters: /^[a-z0-9][a-z0-9]$/
      // For three or more: /^[a-z0-9][a-z0-9\-_.]*[a-z0-9]$/
      let bucketFormatValid = false;
      if (bucket.length === 1) {
        bucketFormatValid = /^[a-z0-9]$/.test(bucket);
      } else if (bucket.length === 2) {
        bucketFormatValid = /^[a-z0-9][a-z0-9]$/.test(bucket);
      } else {
        bucketFormatValid = /^[a-z0-9][a-z0-9\-_.]*[a-z0-9]$/.test(bucket);
      }

      if (!bucketFormatValid) {
        setMessage({ type: 'error', text: 'Bucket name format is invalid. Use lowercase letters, numbers, hyphens, underscores, and dots. Must start and end with a letter or number.' });
        setTimeout(() => setMessage(null), 5000);
        setSaving(false);
        return;
      }

      // Validate bucket name length
      if (bucket.length > 63) {
        setMessage({ type: 'error', text: 'Bucket name is too long. Maximum 63 characters allowed.' });
        setTimeout(() => setMessage(null), 5000);
        setSaving(false);
        return;
      }

      // Validate auth_key file
      const fileInput = document.getElementById('auth_key');
      const hasNewFile = (selectedAuthKeyFile && selectedAuthKeyFile instanceof File) ||
        (fileInput && fileInput.files && fileInput.files.length > 0);
      const hasExistingFile = integrationSettings.auth_key && integrationSettings.auth_key.trim() !== '';

      if (!hasNewFile && !hasExistingFile) {
        setMessage({ type: 'error', text: 'Please upload a Google Cloud authentication key file (.json format).' });
        setTimeout(() => setMessage(null), 5000);
        setSaving(false);
        return;
      }

      // Get file from state, input element, or FormData (in order of preference)
      let authKeyFile = null;

      // Try multiple sources to get the file
      if (selectedAuthKeyFile && selectedAuthKeyFile instanceof File) {
        authKeyFile = selectedAuthKeyFile;
      } else if (fileInput && fileInput.files && fileInput.files.length > 0) {
        authKeyFile = fileInput.files[0];
      } else {
        const formDataFile = formData.get('auth_key');
        if (formDataFile instanceof File) {
          authKeyFile = formDataFile;
        }
      }

      if (authKeyFile && authKeyFile instanceof File && authKeyFile.size > 0) {
        // Upload file using REST endpoint (backend supports multipart upload here).
        try {
          const uploadFormData = new FormData();
          uploadFormData.append('auth_key', authKeyFile);

          const uploadResponse = await fetch(afmRestUrl('integrations/google-cloud-storage/upload-key'), {
            method: 'POST',
            headers: {
              'X-WP-Nonce': nonce
            },
            body: uploadFormData
          });

          const rawUploadResponse = await uploadResponse.text();
          let uploadData;
          try {
            uploadData = rawUploadResponse ? JSON.parse(rawUploadResponse) : {};
          } catch (parseError) {
            uploadData = { success: false, message: rawUploadResponse || 'Invalid upload response' };
          }
          if (!uploadData.success) {
            const errorMsg = uploadData.data?.message || uploadData.message || 'Failed to upload authentication key file';
            setMessage({ type: 'error', text: errorMsg });
            setTimeout(() => setMessage(null), 3000);
            setSaving(false);
            return;
          }

          // File uploaded successfully, extract filepath from response
          // wp_send_json_success wraps data in 'data' key
          const uploadedFilePath = uploadData.data?.filepath || uploadData.data?.filename || uploadData.filepath || uploadData.filename;

          if (uploadedFilePath) {
            settings.auth_key = uploadedFilePath;
          } else {
            // File was uploaded and saved in options, so reload settings to get the filepath
            setMessage({ type: 'info', text: 'File uploaded. Reloading settings to get filepath...' });

            // Wait a bit for the option to be saved
            await new Promise(resolve => setTimeout(resolve, 500));

            // Reload settings to get the filepath
            try {
              const updatedSettingsResponse = await fetch(afmRestUrl(`integrations/${activeSettings}`), {
                headers: {
                  'X-WP-Nonce': nonce
                }
              });
              const updatedSettings = await updatedSettingsResponse.json();

              if (updatedSettings.auth_key) {
                settings.auth_key = updatedSettings.auth_key;
              }
            } catch (reloadError) {
            }
          }

          authKeyUploaded = true;
        } catch (error) {
          setMessage({ type: 'error', text: 'Failed to upload authentication key file: ' + error.message });
          setTimeout(() => setMessage(null), 3000);
          setSaving(false);
          return;
        }
      } else {
        // No new file uploaded, preserve existing auth_key
        if (integrationSettings.auth_key) {
          settings.auth_key = integrationSettings.auth_key;
        }
      }
    }

    // Collect all form fields (excluding file inputs for Google Cloud Storage)
    for (let [key, value] of formData.entries()) {
      if (key === 'user_role_access') {
        if (!settings[key]) settings[key] = [];
        settings[key].push(value);
      } else if (key === 'auth_key' && activeSettings === 'google-cloud-storage') {
        // Skip auth_key for Google Cloud Storage - it's already handled above (file upload or preserve existing)
        // Don't overwrite the auth_key that was set during file upload or from existing settings
        continue;
      } else {
        settings[key] = value;
      }
    }

    // Add enable state
    const currentIntegration = integrationsRef.current.find(int => int.id === activeSettings);
    settings.enable = currentIntegration?.enabled ? 'yes' : 'no';

    // Validate required fields for integrations (before API call) – show error instead of saving
    const trim = (v) => (typeof v === 'string' ? v.trim() : (v || ''));
    if (activeSettings === 'dropbox') {
      if (!trim(settings.app_key)) {
        setMessage({ type: 'error', text: 'App Key is required.' });
        setTimeout(() => setMessage(null), 5000);
        setSaving(false);
        return;
      }
      if (!trim(settings.app_secret)) {
        setMessage({ type: 'error', text: 'App Secret is required.' });
        setTimeout(() => setMessage(null), 5000);
        setSaving(false);
        return;
      }
    }
    if (activeSettings === 'onedrive') {
      const appIdInput = document.getElementById('app_id');
      const appSecretInput = document.getElementById('app_secret');
      if ((!settings.app_id || !String(settings.app_id).trim()) && integrationSettings.app_id) {
        settings.app_id = integrationSettings.app_id;
      }
      if ((!settings.app_secret || !String(settings.app_secret).trim()) && integrationSettings.app_secret) {
        settings.app_secret = integrationSettings.app_secret;
      }
      if (appIdInput && (!settings.app_id || !String(settings.app_id).trim()) && appIdInput.value) {
        settings.app_id = appIdInput.value;
      }
      if (appSecretInput && (!settings.app_secret || !String(settings.app_secret).trim()) && appSecretInput.value) {
        settings.app_secret = appSecretInput.value;
      }
      if (!trim(settings.app_id)) {
        setMessage({ type: 'error', text: 'Application (client) ID is required.' });
        setTimeout(() => setMessage(null), 5000);
        setSaving(false);
        return;
      }
      if (!trim(settings.app_secret)) {
        setMessage({ type: 'error', text: 'Client secret is required.' });
        setTimeout(() => setMessage(null), 5000);
        setSaving(false);
        return;
      }
    }
    if (activeSettings === 'google-drive') {
      if (!trim(settings.app_key)) {
        setMessage({ type: 'error', text: 'App Key is required.' });
        setTimeout(() => setMessage(null), 5000);
        setSaving(false);
        return;
      }
      if (!trim(settings.app_secret)) {
        setMessage({ type: 'error', text: 'App Secret is required.' });
        setTimeout(() => setMessage(null), 5000);
        setSaving(false);
        return;
      }
    }
    if (activeSettings === 'github') {
      if (!trim(settings.username)) {
        settings.username = integrationSettings.username || '';
      }
      if (!trim(settings.pat)) {
        settings.pat = integrationSettings.pat || integrationSettings.token || '';
      }
      if (!trim(settings.username)) {
        setMessage({ type: 'error', text: 'GitHub Username is required.' });
        setTimeout(() => setMessage(null), 5000);
        setSaving(false);
        return;
      }
      if (!trim(settings.pat)) {
        setMessage({ type: 'error', text: 'GitHub PAT is required.' });
        setTimeout(() => setMessage(null), 5000);
        setSaving(false);
        return;
      }
    }
    if (activeSettings === 'ai-code-assistent') {
      if (settings.enable === 'yes' && !trim(settings.gpt_api_key)) {
        setMessage({ type: 'error', text: 'GPT API Key is required when AI integration is enabled.' });
        setTimeout(() => setMessage(null), 5000);
        setSaving(false);
        return;
      }
    }

    // Final check for Google Cloud Storage: ensure auth_key is preserved
    if (activeSettings === 'google-cloud-storage') {
      // If auth_key was set during file upload, make sure it's still there
      if (!settings.auth_key && integrationSettings.auth_key) {
        settings.auth_key = integrationSettings.auth_key;
      }
    }

    // For AI Code Pilot, validate API key format if provided
    if (activeSettings === 'ai-code-assistent') {
      const apiKey = (settings.gpt_api_key || '').trim();

      // Validate API key format if provided
      if (apiKey) {
        // Check if it starts with sk- and has reasonable length (allow hyphens and underscores)
        if (!apiKey.match(/^sk-[a-zA-Z0-9_-]{20,}$/)) {
          setMessage({ type: 'error', text: 'Invalid API key format. Should start with "sk-" followed by alphanumeric characters, hyphens, or underscores.' });
          setTimeout(() => setMessage(null), 3000);
          setSaving(false);
          return;
        }
      }
    }

    const apiUrl = afmRestUrl(`integrations/${activeSettings}`);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': nonce
        },
        body: JSON.stringify(settings)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // For Google Cloud Storage, validate bucket after saving settings
        if (activeSettings === 'google-cloud-storage') {
          // Reload settings first to get the updated auth_key filepath
          const reloadResponse = await fetch(afmRestUrl(`integrations/${activeSettings}`), {
            headers: {
              'Content-Type': 'application/json',
              'X-WP-Nonce': nonce
            }
          });
          const reloadedSettings = await reloadResponse.json();
          setIntegrationSettings(reloadedSettings || {});

          // Now validate bucket using Google Cloud library
          const savedBucket = reloadedSettings.bucket || settings.bucket || '';
          const savedAuthKey = reloadedSettings.auth_key || settings.auth_key || '';

          if (savedBucket && savedAuthKey) {
            try {
              const validateResponse = await fetch(afmRestUrl('integrations/google-cloud-storage/validate-bucket'), {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-WP-Nonce': nonce
                },
                body: JSON.stringify({
                  bucket: savedBucket,
                  auth_key: savedAuthKey
                })
              });

              const validateData = await validateResponse.json();

              if (!validateResponse.ok) {
                const rawError = validateData.message || validateData.data?.message || validateData.code || 'Bucket validation failed.';
                const errorMessage = formatBucketValidationError(rawError, 'google-cloud-storage');
                setMessage({ type: 'error', text: `Settings saved, but bucket validation failed: ${errorMessage}` });
                setTimeout(() => setMessage(null), 8000);
              } else if (!validateData.valid && !validateData.success) {
                const errorMessage = formatBucketValidationError(
                  validateData.message || 'Bucket validation failed.',
                  'google-cloud-storage'
                );
                setMessage({ type: 'error', text: `Settings saved, but bucket validation failed: ${errorMessage}` });
                setTimeout(() => setMessage(null), 8000);
              } else {
                setMessage({ type: 'success', text: data.message || 'Settings saved successfully! Bucket validated.' });
                setTimeout(() => setMessage(null), 3000);
              }
            } catch (validateError) {
              console.error('Error validating bucket:', validateError);
              setMessage({ type: 'success', text: data.message || 'Settings saved successfully!' });
              setTimeout(() => setMessage(null), 3000);
            }
          } else {
            setMessage({ type: 'success', text: data.message || 'Settings saved successfully!' });
            setTimeout(() => setMessage(null), 3000);
          }
        } else if (activeSettings === 'amazon-s3') {
          // For Amazon S3, validate bucket after saving settings
          // Reload settings first to get the updated values
          const reloadResponse = await fetch(afmRestUrl(`integrations/${activeSettings}`), {
            headers: {
              'Content-Type': 'application/json',
              'X-WP-Nonce': nonce
            }
          });
          const reloadedSettings = await reloadResponse.json();
          setIntegrationSettings(reloadedSettings || {});
          console.log('Settings reloaded after save:', reloadedSettings);

          // Now validate bucket using Amazon S3 library
          const savedBucket = reloadedSettings.bucket || settings.bucket || '';
          const savedAppKey = reloadedSettings.app_key || settings.app_key || '';
          const savedAppSecret = reloadedSettings.app_secret || settings.app_secret || '';
          const savedRegion = reloadedSettings.region || settings.region || '';

          if (savedBucket && savedAppKey && savedAppSecret && savedRegion) {
            console.log('Validating bucket using Amazon S3 library after save...');
            try {
              const validateResponse = await fetch(afmRestUrl('integrations/amazon-s3/validate-bucket'), {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-WP-Nonce': nonce
                },
                body: JSON.stringify({
                  bucket: savedBucket,
                  app_key: savedAppKey,
                  app_secret: savedAppSecret,
                  region: savedRegion
                })
              });

              const validateData = await validateResponse.json();

              if (!validateResponse.ok) {
                const rawError = validateData.message || validateData.data?.message || validateData.code || 'Bucket validation failed.';
                const errorMessage = formatBucketValidationError(rawError);
                console.log('Bucket validation failed:', errorMessage, validateData);
                setMessage({ type: 'error', text: `Settings saved, but bucket validation failed: ${errorMessage}` });
                setTimeout(() => setMessage(null), 8000);
              } else if (!validateData.valid && !validateData.success) {
                const errorMessage = formatBucketValidationError(validateData.message || 'Bucket validation failed.');
                console.log('Bucket validation failed:', errorMessage);
                setMessage({ type: 'error', text: `Settings saved, but bucket validation failed: ${errorMessage}` });
                setTimeout(() => setMessage(null), 8000);
              } else {
                console.log('Bucket validation passed:', validateData.message || 'Bucket is valid');
                setMessage({ type: 'success', text: data.message || 'Settings saved successfully! Bucket validated.' });
                setTimeout(() => setMessage(null), 3000);
              }
            } catch (validateError) {
              console.error('Error validating bucket:', validateError);
              setMessage({ type: 'success', text: data.message || 'Settings saved successfully!' });
              setTimeout(() => setMessage(null), 3000);
            }
          } else {
            setMessage({ type: 'success', text: data.message || 'Settings saved successfully!' });
            setTimeout(() => setMessage(null), 3000);
          }
        } else if (activeSettings === 'wasabi') {
          const reloadResponse = await fetch(afmRestUrl(`integrations/${activeSettings}`), {
            headers: {
              'Content-Type': 'application/json',
              'X-WP-Nonce': nonce
            }
          });
          const reloadedSettings = await reloadResponse.json();
          setIntegrationSettings(reloadedSettings || {});

          const savedBucket = reloadedSettings.bucket || settings.bucket || '';
          const savedAccess = reloadedSettings.access_key || settings.access_key || '';
          const savedSecret = reloadedSettings.secret_key || settings.secret_key || '';
          const savedRegion = reloadedSettings.region || settings.region || '';
          const savedEndpoint = reloadedSettings.endpoint || settings.endpoint || '';

          if (savedBucket && savedAccess && savedSecret && savedRegion && savedEndpoint) {
            try {
              const validateResponse = await fetch(afmRestUrl('integrations/wasabi/validate-bucket'), {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-WP-Nonce': nonce
                },
                body: JSON.stringify({
                  bucket: savedBucket,
                  access_key: savedAccess,
                  secret_key: savedSecret,
                  region: savedRegion,
                  endpoint: savedEndpoint
                })
              });

              const validateData = await validateResponse.json();

              if (!validateResponse.ok) {
                const errorMessage = formatBucketValidationError(
                  validateData.message || validateData.data?.message || validateData.code || 'Wasabi validation failed.'
                );
                setMessage({ type: 'error', text: `Settings saved, but Wasabi check failed: ${errorMessage}` });
                setTimeout(() => setMessage(null), 8000);
              } else if (!validateData.valid && !validateData.success) {
                const errorMessage = formatBucketValidationError(validateData.message || 'Wasabi validation failed.');
                setMessage({ type: 'error', text: `Settings saved, but Wasabi check failed: ${errorMessage}` });
                setTimeout(() => setMessage(null), 8000);
              } else {
                setMessage({ type: 'success', text: data.message || 'Settings saved successfully! Wasabi connection OK.' });
                setTimeout(() => setMessage(null), 3000);
              }
            } catch (validateError) {
              setMessage({ type: 'success', text: data.message || 'Settings saved successfully!' });
              setTimeout(() => setMessage(null), 3000);
            }
          } else {
            setMessage({ type: 'success', text: data.message || 'Settings saved successfully!' });
            setTimeout(() => setMessage(null), 3000);
          }
        } else {
          // For all other integrations (including OneDrive), reload settings after save
          // This ensures the UI updates with the latest values (e.g., Connect button appears for OneDrive)
          try {
            const reloadResponse = await fetch(afmRestUrl(`integrations/${activeSettings}`), {
              headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': nonce
              }
            });
            const reloadedSettings = await reloadResponse.json();
            setIntegrationSettings(reloadedSettings || {});
            setIntegrationFormKey((key) => key + 1);
            console.log('Settings reloaded after save:', reloadedSettings);

            // Update OneDrive connection status if applicable
            if (activeSettings === 'onedrive' && reloadedSettings.is_connected !== undefined) {
              setOnedriveConnected(reloadedSettings.is_connected);
            }

            // Update Google Drive connection status if applicable
            if (activeSettings === 'google-drive' && reloadedSettings.is_connected !== undefined) {
              setGoogleDriveConnected(reloadedSettings.is_connected);
            }

            setMessage({ type: 'success', text: data.message || 'Settings saved successfully!' });
            setTimeout(() => setMessage(null), 3000);
          } catch (reloadError) {
            console.error('Error reloading settings:', reloadError);
            setMessage({ type: 'success', text: data.message || 'Settings saved successfully!' });
            setTimeout(() => setMessage(null), 3000);
          }
        }

        // If AI Code Pilot settings were saved, set flag for File Manager tab to reload
        if (activeSettings === 'ai-code-assistent') {
          // Store flag in sessionStorage to trigger reload when switching to File Manager tab
          sessionStorage.setItem('afm_ai_settings_changed', 'true');
        }
        // OneDrive private folder access/path changes require fresh mount to avoid stale volume state.
        if (activeSettings === 'onedrive') {
          sessionStorage.setItem('afm_onedrive_settings_changed', 'true');
          sessionStorage.setItem('afm_filemanager_redirect', 'true');
          try {
            const toRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && key.indexOf('elfinder') !== -1) {
                toRemove.push(key);
              }
            }
            toRemove.forEach((k) => {
              try { localStorage.removeItem(k); } catch (_) { }
            });
          } catch (_) { }
        }
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to save settings' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error('Error saving integration settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  // Helper function to render form fields based on integration type
  const handleTestApiKey = async () => {
    const apiKeyInput = document.getElementById('gpt_api_key');
    const apiKey = apiKeyInput?.value || '';

    if (!apiKey) {
      setApiKeyTestResult({ success: false, message: 'Please enter an API key first' });
      return;
    }

    setTestingApiKey(true);
    setApiKeyTestResult(null);

    try {
      const response = await fetch(afmRestUrl('test-api-key'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': nonce
        },
        body: JSON.stringify({ api_key: apiKey })
      });

      const result = await response.json();

      if (result.success) {
        setApiKeyTestResult({ success: true, message: 'API key is valid!' });
      } else {
        setApiKeyTestResult({ success: false, message: result.message || 'API key is invalid' });
      }
    } catch (error) {
      setApiKeyTestResult({ success: false, message: 'Failed to test API key. Please try again.' });
    } finally {
      setTestingApiKey(false);
    }
  };

  const renderIntegrationFields = () => {
    if (!activeSettings || !currentIntegration) return null;

    const settings = integrationSettings;
    const commonInputStyle = {
      width: '100%',
      maxWidth: '500px',
      padding: '10px 12px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '14px'
    };

    const labelStyle = {
      display: 'block',
      marginBottom: '8px',
      fontSize: '14px',
      fontWeight: 600,
      color: '#0f172a'
    };

    const descriptionStyle = {
      marginTop: '8px',
      marginBottom: 0,
      fontSize: '13px',
      color: '#666'
    };

    const linkStyle = {
      color: '#3F6972',
      textDecoration: 'underline'
    };

    // Site origin only — never append /wp-admin/admin.php (that broke OneDrive Redirect URI display).
    const siteOrigin = (typeof window.afmReact?.siteUrl === 'string' && window.afmReact.siteUrl)
      ? window.afmReact.siteUrl.replace(/\/$/, '')
      : window.location.origin;
    const defaultRedirectUri = settings.redirect_uri || siteOrigin;

    switch (activeSettings) {
      case 'onedrive':
        return (
          <ProOverlay shouldShow={hasPro && !onedriveAvailable}>
            <OneDrive
              key={`onedrive-${integrationFormKey}`}
              settings={settings}
              hasPro={hasPro && onedriveAvailable}
              isConnected={onedriveConnected}
              onConnect={() => {
                const redirectUri = settings.redirect_uri || '';
                if (settings.app_id && settings.app_secret && redirectUri) {
                  // Pass redirect hash in state parameter (OAuth providers return state, not custom params)
                  const redirectHash = window.location.hash || '#/extension/onedrive';
                  window.location.href = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${encodeURIComponent(settings.app_id)}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=files.readwrite.all%20offline_access&state=${encodeURIComponent(redirectHash)}`;
                } else if (setMessage) {
                  setMessage({ type: 'error', text: 'Redirect URI is missing. Please reload the page and try again.' });
                  setTimeout(() => setMessage(null), 4000);
                }
              }}
              setMessage={setMessage}
              setShowDisconnectModal={setShowDisconnectModal}
              setDisconnectIntegration={setDisconnectIntegration}
            />
          </ProOverlay>
        );

      case 'google-drive':
        return (
          <ProOverlay shouldShow={hasPro && !googledriveAvailable}>
            <GoogleDrive
              settings={settings}
              hasPro={hasPro && googledriveAvailable}
              isConnected={googleDriveConnected}
              setShowDisconnectModal={setShowDisconnectModal}
              setDisconnectIntegration={setDisconnectIntegration}
              setMessage={setMessage}
            />
          </ProOverlay>
        );

      case 'dropbox':
        return (
          <ProOverlay shouldShow={hasPro && !dropboxAvailable}>
            <Dropbox
              settings={settings}
              hasPro={hasPro && dropboxAvailable}
              root={root}
              nonce={nonce}
              setMessage={setMessage}
              isConnected={dropboxConnected}
              setShowDisconnectModal={setShowDisconnectModal}
              setDisconnectIntegration={setDisconnectIntegration}
            />
          </ProOverlay>
        );

      case 'amazon-s3':
        return (
          <ProOverlay shouldShow={hasPro && !amazons3Available}>
            <AmazonS3
              settings={settings}
              hasPro={hasPro && amazons3Available}
              root={root}
              nonce={nonce}
              setMessage={setMessage}
              onLibraryInstalled={refreshIntegrationSettings}
            />
          </ProOverlay>
        );

      case 'github':
        return (
          <ProOverlay shouldShow={hasPro && !githubAvailable}>
            <GitHub
              settings={settings}
              hasPro={hasPro && githubAvailable}
              root={root}
              nonce={nonce}
              setMessage={setMessage}
              onSettingsRefresh={refreshIntegrationSettings}
            />
          </ProOverlay>
        );

      case 'google-cloud-storage':
        return (
          <ProOverlay shouldShow={hasPro && !googlecloudAvailable}>
            <GoogleCloudStorage
              settings={settings}
              hasPro={hasPro && googlecloudAvailable}
              root={root}
              nonce={nonce}
              setMessage={setMessage}
              selectedAuthKeyFile={selectedAuthKeyFile}
              setSelectedAuthKeyFile={setSelectedAuthKeyFile}
              onLibraryInstalled={refreshIntegrationSettings}
            />
          </ProOverlay>
        );

      case 'pcloud':
        return (
          <ProOverlay shouldShow={hasPro && !pcloudAvailable}>
            <PCloud
              settings={settings}
              hasPro={hasPro && pcloudAvailable}
              root={root}
              nonce={nonce}
              setMessage={setMessage}
              isConnected={pcloudConnected}
              setShowDisconnectModal={setShowDisconnectModal}
              setDisconnectIntegration={setDisconnectIntegration}
            />
          </ProOverlay>
        );

      case 'cloudflare-r2':
        return (
          <ProOverlay shouldShow={hasPro && !cloudflarer2Available}>
            <CloudflareR2
              settings={settings}
              hasPro={hasPro && cloudflarer2Available}
              root={root}
              nonce={nonce}
              setMessage={setMessage}
            />
          </ProOverlay>
        );

      case 'wasabi':
        return (
          <ProOverlay shouldShow={hasPro && !wasabiAvailable}>
            <Wasabi
              settings={settings}
              hasPro={hasPro && wasabiAvailable}
              root={root}
              nonce={nonce}
              setMessage={setMessage}
              onLibraryInstalled={refreshIntegrationSettings}
            />
          </ProOverlay>
        );

      case 'ai-code-assistent':
        return (
          <ProOverlay shouldShow={hasPro && !aiIntegrationAvailable}>
            <>
              <AICodeAssistent
                settings={settings}
                hasPro={hasPro && aiIntegrationAvailable}
                root={root}
                nonce={nonce}
                setMessage={setMessage}
                onApiKeyValidated={() => setAiCodePilotKeyValidated(true)}
              />
              {/* How to Use Code Pilot */}
              <div style={{
                marginTop: '30px',
                padding: '20px',
                background: '#f8f9fa',
                borderRadius: '4px',
                border: '1px solid #e9ecef'
              }}>
                <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '16px', fontWeight: 600 }}>How to Use Code Pilot</h3>
                <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#666' }}>
                  <li style={{ marginBottom: '8px' }}>Enter your OpenAI GPT API key above</li>
                  <li style={{ marginBottom: '8px' }}>Enable the AI Code Pilot integration using the toggle switch</li>
                  <li style={{ marginBottom: '8px' }}>Open any code file in the File Manager</li>
                  <li style={{ marginBottom: '8px' }}>Click the Code Pilot icon in the editor toolbar</li>
                  <li>Use AI-powered code suggestions and assistance</li>
                </ol>
              </div>
            </>
          </ProOverlay>
        );

      default:
        return (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            Settings form for this integration is not yet implemented.
          </div>
        );
    }
  };

  // Get current integration settings
  const currentIntegration = integrations.find(int => int.id === activeSettings);

  // Render settings form if activeSettings is set
  if (activeSettings && currentIntegration) {
    return (
      <div className="afm-tab-panel">
        <div className="wrap" style={{
          background: '#fff',
          padding: '20px',
          border: '1px solid #ccc',
          position: 'relative'
        }}>
            {/* Back to Integrations Link */}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                handleBackToIntegrations();
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                color: '#3F6972',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 500,
                marginBottom: '20px',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textDecoration = 'underline';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textDecoration = 'none';
              }}
            >
              ← Back To Integrations
            </a>

            {/* Settings Header with icon, title and toggle - same style as Notifications (Email/Slack) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              marginBottom: '30px',
              paddingBottom: '15px',
              borderBottom: '1px solid #e5e5e5',
              gap: '80px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {currentIntegration.iconImage && (
                  <img
                    src={currentIntegration.iconImage}
                    alt=""
                    style={{ width: '24px', height: '24px', flexShrink: 0 }}
                  />
                )}
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>
                  {currentIntegration.title} Settings
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', margin: 0, padding: 0 }}>
                <Toggle
                  id={`${currentIntegration.id}_enable`}
                  checked={currentIntegration.enabled}
                  disabled={!hasPro || (
                    (currentIntegration.id === 'dropbox' && !dropboxAvailable) ||
                    (currentIntegration.id === 'onedrive' && !onedriveAvailable) ||
                    (currentIntegration.id === 'google-drive' && !googledriveAvailable) ||
                    (currentIntegration.id === 'amazon-s3' && !amazons3Available) ||
                    (currentIntegration.id === 'github' && !githubAvailable) ||
                    (currentIntegration.id === 'google-cloud-storage' && !googlecloudAvailable) ||
                    (currentIntegration.id === 'pcloud' && !pcloudAvailable) ||
                    (currentIntegration.id === 'cloudflare-r2' && !cloudflarer2Available) ||
                    (currentIntegration.id === 'wasabi' && !wasabiAvailable) ||
                    (currentIntegration.id === 'ai-code-assistent' && !aiIntegrationAvailable)
                  )}
                  onChange={() => handleToggle(currentIntegration.id)}
                />
              </div>
            </div>

            {/* Snackbar message - same style as Settings/Notifications */}
            {message && (
              <div
                className={`afm-snackbar afm-snackbar-${message.type === 'success' ? 'success' : message.type === 'info' ? 'info' : 'error'}`}
                onClick={() => setMessage(null)}
                style={{ animation: 'afm-slideIn 0.3s ease-out' }}
              >
                <span style={{ fontSize: '14px', lineHeight: '1.5', flex: '1', wordBreak: 'break-word' }}>{message.text}</span>
                <button
                  type="button"
                  className="afm-snackbar-close"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMessage(null); }}
                  style={{ background: 'none', border: 'none', padding: '0', cursor: 'pointer', color: 'inherit', fontSize: '18px', lineHeight: '1', marginLeft: '12px', opacity: '0.7', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  ×
                </button>
              </div>
            )}

            {loading ? (
              <div style={{ padding: '10px 0' }}>
                <style>{`
                  @keyframes afm-skeleton-shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                  }
                  .afm-skeleton {
                    background-color: #e2e8f0;
                    background-image: linear-gradient(90deg, #e2e8f0 0%, #f1f5f9 50%, #e2e8f0 100%);
                    background-size: 200% 100%;
                    animation: afm-skeleton-shimmer 1.4s linear infinite;
                  }
                `}</style>
                <div className="afm-skeleton" style={{ height: '22px', width: '220px', borderRadius: '6px', marginBottom: '20px' }} />
                <div className="afm-skeleton" style={{ height: '42px', width: '100%', maxWidth: '500px', borderRadius: '6px', marginBottom: '14px' }} />
                <div className="afm-skeleton" style={{ height: '42px', width: '100%', maxWidth: '500px', borderRadius: '6px', marginBottom: '14px' }} />
                <div className="afm-skeleton" style={{ height: '42px', width: '100%', maxWidth: '500px', borderRadius: '6px', marginBottom: '14px' }} />
                <div className="afm-skeleton" style={{ height: '42px', width: '100%', maxWidth: '500px', borderRadius: '6px', marginBottom: '24px' }} />
                <div className="afm-skeleton" style={{ height: '40px', width: '160px', borderRadius: '6px' }} />
              </div>
            ) : (
              <form onSubmit={handleSubmit} encType={activeSettings === 'google-cloud-storage' ? 'multipart/form-data' : undefined}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {renderIntegrationFields()}
                </div>

                {/* Save Changes Button */}
                <div style={{ marginTop: '30px' }}>
                  <button
                    type="submit"
                    disabled={!hasPro || saving || (activeSettings === 'ai-code-assistent' && !aiCodePilotKeyValidated)}
                    style={{
                      background: hasPro && !saving && !(activeSettings === 'ai-code-assistent' && !aiCodePilotKeyValidated) ? '#3F6972' : '#ccc',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '12px 24px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: !hasPro || saving || (activeSettings === 'ai-code-assistent' && !aiCodePilotKeyValidated) ? 'not-allowed' : 'pointer',
                      opacity: !hasPro || saving || (activeSettings === 'ai-code-assistent' && !aiCodePilotKeyValidated) ? 0.5 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (hasPro && !saving && !(activeSettings === 'ai-code-assistent' && !aiCodePilotKeyValidated)) {
                        e.currentTarget.style.background = '#2d555e';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (hasPro && !saving && !(activeSettings === 'ai-code-assistent' && !aiCodePilotKeyValidated)) {
                        e.currentTarget.style.background = '#3F6972';
                      }
                    }}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
        </div>

        {/* Custom Disconnect Confirmation Modal */}
        {showDisconnectModal && disconnectIntegration && (
          <div
            id="afm-disconnect-modal"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 999999,
              margin: 0,
              padding: 0
            }}
            onClick={() => {
              console.log('Modal backdrop clicked');
              setShowDisconnectModal(false);
              setDisconnectIntegration(null);
            }}
          >
            <div
              id="afm-disconnect-modal-content"
              style={{
                background: '#fff',
                borderRadius: '8px',
                minWidth: '400px',
                maxWidth: '90%',
                padding: '24px',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
                position: 'relative',
                zIndex: 1000000,
                margin: '20px'
              }}
              onClick={(e) => {
                e.stopPropagation();
                console.log('Modal content clicked');
              }}
            >
              <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: 600, color: '#1f2937' }}>
                Disconnect {disconnectIntegration === 'dropbox' ? 'Dropbox' : disconnectIntegration === 'onedrive' ? 'OneDrive' : disconnectIntegration === 'google-drive' ? 'Google Drive' : disconnectIntegration === 'pcloud' ? 'pCloud' : 'Integration'}?
              </h3>
              <p style={{ margin: '0 0 24px 0', color: '#6b7280', lineHeight: '1.6' }}>
                Are you sure you want to disconnect {disconnectIntegration === 'dropbox' ? 'Dropbox' : disconnectIntegration === 'onedrive' ? 'OneDrive' : disconnectIntegration === 'google-drive' ? 'Google Drive' : disconnectIntegration === 'pcloud' ? 'pCloud' : 'this integration'}?
                You will need to reconnect to use this integration again.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowDisconnectModal(false);
                    setDisconnectIntegration(null);
                  }}
                  style={{
                    padding: '10px 20px',
                    background: '#f3f4f6',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = '#e5e7eb';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = '#f3f4f6';
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (disconnectIntegration === 'dropbox') {
                      try {
                        const response = await fetchJsonWithTimeout(afmRestUrl('integrations/dropbox/disconnect'), {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json; charset=utf-8',
                            'X-WP-Nonce': nonce
                          }
                        });

                        setDropboxConnected(false);
                        setIntegrationSettings((prev) => ({ ...(prev || {}), is_connected: false }));
                        setShowDisconnectModal(false);
                        setDisconnectIntegration(null);
                        setMessage({ type: 'success', text: response.message || 'Dropbox disconnected successfully!' });
                        setTimeout(() => setMessage(null), 3000);
                      } catch (error) {
                        console.error('Error disconnecting Dropbox:', error);
                        setShowDisconnectModal(false);
                        setDisconnectIntegration(null);
                        setMessage({ type: 'error', text: error.message || 'Failed to disconnect Dropbox' });
                        setTimeout(() => setMessage(null), 4000);
                      }
                    } else if (disconnectIntegration === 'onedrive') {
                      try {
                        const response = await fetchJsonWithTimeout(afmRestUrl('integrations/onedrive/disconnect'), {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json; charset=utf-8',
                            'X-WP-Nonce': nonce
                          }
                        });

                        setOnedriveConnected(false);
                        setIntegrationSettings((prev) => ({ ...(prev || {}), is_connected: false }));
                        setShowDisconnectModal(false);
                        setDisconnectIntegration(null);
                        setMessage({ type: 'success', text: response.message || 'OneDrive disconnected successfully!' });
                        setTimeout(() => setMessage(null), 3000);
                      } catch (error) {
                        console.error('Error disconnecting OneDrive:', error);
                        setShowDisconnectModal(false);
                        setDisconnectIntegration(null);
                        setMessage({ type: 'error', text: error.message || 'Failed to disconnect OneDrive' });
                        setTimeout(() => setMessage(null), 4000);
                      }
                    } else if (disconnectIntegration === 'google-drive') {
                      try {
                        const response = await fetchJsonWithTimeout(afmRestUrl('integrations/googledrive/disconnect'), {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json; charset=utf-8',
                            'X-WP-Nonce': nonce
                          }
                        });

                        setGoogleDriveConnected(false);
                        setIntegrationSettings((prev) => ({ ...(prev || {}), is_connected: false }));
                        setShowDisconnectModal(false);
                        setDisconnectIntegration(null);
                        setMessage({ type: 'success', text: response.message || 'Google Drive disconnected successfully!' });
                        setTimeout(() => setMessage(null), 3000);
                      } catch (error) {
                        console.error('Error disconnecting Google Drive:', error);
                        setShowDisconnectModal(false);
                        setDisconnectIntegration(null);
                        setMessage({ type: 'error', text: error.message || 'Failed to disconnect Google Drive' });
                        setTimeout(() => setMessage(null), 4000);
                      }
                    } else if (disconnectIntegration === 'pcloud') {
                      try {
                        const response = await fetchJsonWithTimeout(afmRestUrl('integrations/pcloud/disconnect'), {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json; charset=utf-8',
                            'X-WP-Nonce': nonce
                          }
                        });

                        setPcloudConnected(false);
                        setIntegrationSettings((prev) => ({ ...(prev || {}), is_connected: false }));
                        setShowDisconnectModal(false);
                        setDisconnectIntegration(null);
                        setMessage({ type: 'success', text: response.message || 'pCloud disconnected successfully!' });
                        setTimeout(() => setMessage(null), 3000);
                      } catch (error) {
                        console.error('Error disconnecting pCloud:', error);
                        setShowDisconnectModal(false);
                        setDisconnectIntegration(null);
                        setMessage({ type: 'error', text: error.message || 'Failed to disconnect pCloud' });
                        setTimeout(() => setMessage(null), 4000);
                      }
                    }
                  }}
                  style={{
                    padding: '10px 20px',
                    background: '#dc2626',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = '#b91c1c';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = '#dc2626';
                  }}
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="afm-tab-panel">
      <div className="wrap" style={{
        background: '#fff',
        padding: '20px',
        border: '1px solid #ccc',
        position: 'relative'
      }}>
        {/* Snackbar message - same style as Settings/Notifications */}
        {message && (
          <div
            className={`afm-snackbar afm-snackbar-${message.type === 'success' ? 'success' : message.type === 'info' ? 'info' : 'error'}`}
            onClick={() => setMessage(null)}
            style={{ animation: 'afm-slideIn 0.3s ease-out' }}
          >
            <span style={{ fontSize: '14px', lineHeight: '1.5', flex: '1', wordBreak: 'break-word' }}>{message.text}</span>
            <button
              type="button"
              className="afm-snackbar-close"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMessage(null); }}
              style={{ background: 'none', border: 'none', padding: '0', cursor: 'pointer', color: 'inherit', fontSize: '18px', lineHeight: '1', marginLeft: '12px', opacity: '0.7', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ×
            </button>
          </div>
        )}

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '20px',
            marginTop: '20px'
          }}>
            {integrationsLoading ? (
              <>
                <style>{`
                  @keyframes afm-skeleton-shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                  }
                  .afm-skeleton {
                    background-color: #e2e8f0;
                    background-image: linear-gradient(90deg, #e2e8f0 0%, #f1f5f9 50%, #e2e8f0 100%);
                    background-size: 200% 100%;
                    animation: afm-skeleton-shimmer 1.4s linear infinite;
                  }
                `}</style>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={`integration-skeleton-${i}`}
                    style={{
                      background: '#fff',
                      border: '1px solid #e5e5e5',
                      borderRadius: '8px',
                      padding: '20px',
                      minHeight: '200px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div className="afm-skeleton" style={{ width: '48px', height: '48px', borderRadius: '8px' }} />
                      <div className="afm-skeleton" style={{ width: '80px', height: '20px', borderRadius: '4px' }} />
                    </div>
                    <div className="afm-skeleton" style={{ width: '160px', height: '20px', borderRadius: '4px', marginBottom: '10px' }} />
                    <div className="afm-skeleton" style={{ width: '100%', height: '14px', borderRadius: '4px', marginBottom: '8px' }} />
                    <div className="afm-skeleton" style={{ width: '85%', height: '14px', borderRadius: '4px', marginBottom: '20px' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #e5e5e5' }}>
                      <div className="afm-skeleton" style={{ width: '80px', height: '14px', borderRadius: '4px' }} />
                      <div className="afm-skeleton" style={{ width: '44px', height: '24px', borderRadius: '12px' }} />
                    </div>
                  </div>
                ))}
              </>
            ) : integrations.map((integration) => (
              <div
                key={integration.id}
                style={{
                  background: '#fff',
                  border: '1px solid #e5e5e5',
                  borderRadius: '8px',
                  padding: '20px',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: '200px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  transition: 'box-shadow 0.2s',
                  cursor: 'default'
                }}
                onMouseEnter={(e) => {
                  if (hasPro) {
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (hasPro) {
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                  }
                }}
              >
                {/* Header with Icon and Settings */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '12px'
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '8px',
                    background: integration.icon === 'image' && integration.iconImage ? 'transparent' : (integration.iconBg || '#f8f9fa'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    fontWeight: 600,
                    color: integration.iconColor || '#0f172a',
                    overflow: 'hidden'
                  }}>
                    {integration.icon === 'image' && integration.iconImage ? (
                      <img
                        src={integration.iconImage}
                        alt={integration.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain'
                        }}
                      />
                    ) : (
                      integration.icon
                    )}
                  </div>
                  {integration.hasSettings && integration.enabled && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSettings(integration.id);
                      }}
                      disabled={!hasPro}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#3F6972',
                        cursor: !hasPro ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        opacity: !hasPro ? 0.5 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (hasPro) {
                          e.currentTarget.style.background = '#f0f0f0';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </svg>
                      Settings
                    </button>
                  )}
                </div>

                {/* Title */}
                <h3 style={{
                  margin: '0 0 8px 0',
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#0f172a',
                  lineHeight: '1.4',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap'
                }}>
                  {integration.title}
                  {integration.comingSoon && (
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 8px',
                      background: '#f0b90b',
                      color: '#fff',
                      fontSize: '10px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      borderRadius: '3px',
                      letterSpacing: '0.5px'
                    }}>
                      Coming Soon
                    </span>
                  )}
                </h3>

                {/* Description */}
                <p style={{
                  margin: '0 0 auto 0',
                  fontSize: '14px',
                  color: '#666',
                  lineHeight: '1.6',
                  flex: 1
                }}>
                  {integration.description}
                </p>

                {/* Footer with Learn More and Toggle */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '16px',
                  paddingTop: '16px',
                  borderTop: '1px solid #e5e5e5'
                }}>
                  <a
                    href={integration.learnMoreUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      if (!hasPro) {
                        e.preventDefault();
                        window.open(pricingUrl, '_blank');
                      }
                    }}
                    style={{
                      fontSize: '14px',
                      color: '#3F6972',
                      textDecoration: 'none',
                      fontWeight: 500
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.textDecoration = 'underline';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.textDecoration = 'none';
                    }}
                  >
                    Learn More
                  </a>
                  <Toggle
                    id={integration.id}
                    checked={integration.enabled}
                    disabled={!hasPro || integration.comingSoon}
                    onChange={() => handleToggle(integration.id)}
                  />
                </div>
              </div>
            ))}
          </div>
      </div>

      {/* Custom Disconnect Confirmation Modal */}
      {showDisconnectModal && disconnectIntegration && (
        <div
          id="afm-disconnect-modal"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            margin: 0,
            padding: 0
          }}
          onClick={() => {
            console.log('Modal backdrop clicked');
            setShowDisconnectModal(false);
            setDisconnectIntegration(null);
          }}
        >
          <div
            id="afm-disconnect-modal-content"
            style={{
              background: '#fff',
              borderRadius: '8px',
              minWidth: '400px',
              maxWidth: '90%',
              padding: '24px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
              position: 'relative',
              zIndex: 1000000,
              margin: '20px'
            }}
            onClick={(e) => {
              e.stopPropagation();
              console.log('Modal content clicked');
            }}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: 600, color: '#1f2937' }}>
              Disconnect {disconnectIntegration === 'dropbox' ? 'Dropbox' : disconnectIntegration === 'onedrive' ? 'OneDrive' : disconnectIntegration === 'google-drive' ? 'Google Drive' : disconnectIntegration === 'pcloud' ? 'pCloud' : 'Integration'}?
            </h3>
            <p style={{ margin: '0 0 24px 0', color: '#6b7280', lineHeight: '1.6' }}>
              Are you sure you want to disconnect {disconnectIntegration === 'dropbox' ? 'Dropbox' : disconnectIntegration === 'onedrive' ? 'OneDrive' : disconnectIntegration === 'google-drive' ? 'Google Drive' : disconnectIntegration === 'pcloud' ? 'pCloud' : 'this integration'}?
              You will need to reconnect to use this integration again.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowDisconnectModal(false);
                  setDisconnectIntegration(null);
                }}
                style={{
                  padding: '10px 20px',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = '#e5e7eb';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = '#f3f4f6';
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (disconnectIntegration === 'dropbox') {
                    try {
                      const response = await fetchJsonWithTimeout(afmRestUrl('integrations/dropbox/disconnect'), {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json; charset=utf-8',
                          'X-WP-Nonce': nonce
                        }
                      });

                      setDropboxConnected(false);
                      setIntegrationSettings((prev) => ({ ...(prev || {}), is_connected: false }));
                      setShowDisconnectModal(false);
                      setDisconnectIntegration(null);
                      setMessage({ type: 'success', text: response.message || 'Dropbox disconnected successfully!' });
                      setTimeout(() => setMessage(null), 3000);
                    } catch (error) {
                      console.error('Error disconnecting Dropbox:', error);
                      setShowDisconnectModal(false);
                      setDisconnectIntegration(null);
                      setMessage({ type: 'error', text: error.message || 'Failed to disconnect Dropbox' });
                      setTimeout(() => setMessage(null), 4000);
                    }
                  } else if (disconnectIntegration === 'onedrive') {
                    try {
                      const response = await fetchJsonWithTimeout(afmRestUrl('integrations/onedrive/disconnect'), {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json; charset=utf-8',
                          'X-WP-Nonce': nonce
                        }
                      });

                      setOnedriveConnected(false);
                      setIntegrationSettings((prev) => ({ ...(prev || {}), is_connected: false }));
                      setShowDisconnectModal(false);
                      setDisconnectIntegration(null);
                      setMessage({ type: 'success', text: response.message || 'OneDrive disconnected successfully!' });
                      setTimeout(() => setMessage(null), 3000);
                    } catch (error) {
                      console.error('Error disconnecting OneDrive:', error);
                      setShowDisconnectModal(false);
                      setDisconnectIntegration(null);
                      setMessage({ type: 'error', text: error.message || 'Failed to disconnect OneDrive' });
                      setTimeout(() => setMessage(null), 4000);
                    }
                  } else if (disconnectIntegration === 'google-drive') {
                    try {
                      const response = await fetchJsonWithTimeout(afmRestUrl('integrations/googledrive/disconnect'), {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json; charset=utf-8',
                          'X-WP-Nonce': nonce
                        }
                      });

                      setGoogleDriveConnected(false);
                      setIntegrationSettings((prev) => ({ ...(prev || {}), is_connected: false }));
                      setShowDisconnectModal(false);
                      setDisconnectIntegration(null);
                      setMessage({ type: 'success', text: response.message || 'Google Drive disconnected successfully!' });
                      setTimeout(() => setMessage(null), 3000);
                    } catch (error) {
                      console.error('Error disconnecting Google Drive:', error);
                      setShowDisconnectModal(false);
                      setDisconnectIntegration(null);
                      setMessage({ type: 'error', text: error.message || 'Failed to disconnect Google Drive' });
                      setTimeout(() => setMessage(null), 4000);
                    }
                  } else if (disconnectIntegration === 'pcloud') {
                    try {
                      const response = await fetchJsonWithTimeout(afmRestUrl('integrations/pcloud/disconnect'), {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json; charset=utf-8',
                          'X-WP-Nonce': nonce
                        }
                      });

                      setPcloudConnected(false);
                      setIntegrationSettings((prev) => ({ ...(prev || {}), is_connected: false }));
                      setShowDisconnectModal(false);
                      setDisconnectIntegration(null);
                      setMessage({ type: 'success', text: response.message || 'pCloud disconnected successfully!' });
                      setTimeout(() => setMessage(null), 3000);
                    } catch (error) {
                      console.error('Error disconnecting pCloud:', error);
                      setShowDisconnectModal(false);
                      setDisconnectIntegration(null);
                      setMessage({ type: 'error', text: error.message || 'Failed to disconnect pCloud' });
                      setTimeout(() => setMessage(null), 4000);
                    }
                  }
                }}
                style={{
                  padding: '10px 20px',
                  background: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = '#b91c1c';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = '#dc2626';
                }}
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )
      }
    </div >
  );
}

