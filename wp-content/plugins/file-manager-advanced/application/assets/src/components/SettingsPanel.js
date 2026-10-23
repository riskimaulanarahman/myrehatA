import React, { useState, useEffect, useLayoutEffect } from 'react';
import { isFeatureAvailable } from '../utils/planFeatures';
import { getApiRoot } from '../utils/api';

function getShellAsset(filename) {
  const base =
    (window.afmReact?.pluginUrl ||
      window.afm_object?.plugin_url ||
      '/wp-content/plugins/file-manager-advanced/') +
    'application/assets/images/shell/';
  return base + filename;
}

function SelectChevron() {
  return (
    <img
      className="afm-select__chevron"
      src={getShellAsset('icon-chevron.svg')}
      alt=""
      width={8}
      height={5}
    />
  );
}

export default function SettingsPanel() {
  const root = getApiRoot();
  const nonce = window.wpApiSettings?.nonce || window.afmReact?.nonce || '';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('general');

  // Initialize with default, then use useLayoutEffect to set correct value immediately
  const [subTab, setSubTab] = useState('general-settings');
  const [formValues, setFormValues] = useState({});
  const [publicPathSuffix, setPublicPathSuffix] = useState('');
  const [publicUrl, setPublicUrl] = useState('');
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const [showLocaleDropdown, setShowLocaleDropdown] = useState(false);
  const [showCmThemeDropdown, setShowCmThemeDropdown] = useState(false);
  const [showRolesDropdown, setShowRolesDropdown] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState(['administrator']);
  const [integrationsStatus, setIntegrationsStatus] = useState({});

  const hasPro = window.afmReact?.hasPro || false;
  const currentPlan = window.afmReact?.currentPlan || 'free';
  const pricingUrl = window.afmReact?.pricingUrl || 'https://advancedfilemanager.com/pricing/';

  // Check plan-based feature availability
  const advanceThemesAvailable = isFeatureAvailable('advance_themes', currentPlan, hasPro);
  const codeEditorThemesAvailable = isFeatureAvailable('code_editor_themes', currentPlan, hasPro);

  // Use useLayoutEffect to read hash synchronously before paint
  // This ensures we get the correct hash before any other effects run
  // Priority: sessionStorage > hash (because elFinder might have changed hash)
  useLayoutEffect(() => {
    // ONLY run this if we're actually on the settings tab
    // Check current hash to see if we're on settings
    const rawHash = window.location.hash || '';
    const hash = rawHash.replace(/^#/, '').replace(/^\//, '');

    // If hash doesn't start with 'settings', don't do anything - user is on a different tab
    if (!hash.startsWith('settings')) {
      return;
    }

    // Set flag to prevent useHashNavigation from clearing hash
    sessionStorage.setItem('afm-settings-hash-just-set', 'true');

    // FIRST: Check sessionStorage - this is most reliable because we saved it
    const savedSubTab = sessionStorage.getItem('afm-settings-subtab');

    let subTabToUse = 'general-settings';

    if (savedSubTab === 'general-settings' || savedSubTab === 'advanced-settings') {
      subTabToUse = savedSubTab;
    } else if (hash.startsWith('settings/')) {
      // SECOND: Check hash if sessionStorage doesn't have it
      const parts = hash.split('/');
      if (parts.length > 1) {
        const subTabFromHash = parts[1].split('?')[0];
        if (subTabFromHash === 'general-settings' || subTabFromHash === 'advanced-settings') {
          subTabToUse = subTabFromHash;
          sessionStorage.setItem('afm-settings-subtab', subTabFromHash);
        }
      }
    }

    // Set the sub-tab state
    setSubTab(subTabToUse);

    // Only set the hash if it's missing the sub-tab or incorrect
    const expectedHash = `#/settings/${subTabToUse}`;
    const currentHash = window.location.hash;

    // Only update hash if it's not already correct
    if (currentHash !== expectedHash) {
      if (window.history && window.history.replaceState) {
        const url = window.location.href.split('#')[0] + expectedHash;
        window.history.replaceState(null, '', url);
        // Also set directly to ensure it sticks
        window.location.hash = expectedHash;
      } else {
        window.location.hash = expectedHash;
      }
    }

    // Save to sessionStorage
    sessionStorage.setItem('afm-settings-subtab', subTabToUse);

    // Remove flag after delay
    setTimeout(() => {
      sessionStorage.removeItem('afm-settings-hash-just-set');
    }, 2000);
  }, []); // Only run once on mount

  // Save sub-tab to sessionStorage
  useEffect(() => {
    if (subTab) {
      sessionStorage.setItem('afm-settings-subtab', subTab);
    }
  }, [subTab]);

  // Function to fix hash if it's missing sub-tab
  const fixSettingsHash = () => {
    const rawHash = window.location.hash || '';
    const hash = rawHash.replace(/^#/, '').replace(/^\//, '');

    // If hash is just 'settings' without sub-tab, add sub-tab
    if (hash === 'settings') {
      const savedSubTab = sessionStorage.getItem('afm-settings-subtab');
      const subTabToUse = (savedSubTab === 'general-settings' || savedSubTab === 'advanced-settings') ? savedSubTab : 'general-settings';

      // Update URL immediately
      const urlHash = `#/settings/${subTabToUse}`;
      if (window.history && window.history.replaceState) {
        const url = window.location.href.split('#')[0] + urlHash;
        window.history.replaceState(null, '', url);
      } else {
        window.location.hash = urlHash;
      }

      // Update state if needed
      if (subTab !== subTabToUse) {
        setSubTab(subTabToUse);
      }
    }
  };

  // Listen for hash changes and sync sub-tab
  useEffect(() => {
    const syncSubTabFromHash = () => {
      // Read directly from window.location.hash to ensure we get the actual current value
      const rawHash = window.location.hash || '';
      const hash = rawHash.replace(/^#/, '').replace(/^\//, '');

      // ONLY process if we're actually on the settings tab
      // If hash doesn't start with 'settings', don't do anything - user is on a different tab
      if (!hash.startsWith('settings')) {
        return;
      }

      // If hash already has sub-tab (settings/general-settings or settings/advanced-settings), use it
      if (hash.startsWith('settings/')) {
        const parts = hash.split('/');
        if (parts.length > 1) {
          const subTabFromHash = parts[1].split('?')[0];
          if (subTabFromHash === 'general-settings' || subTabFromHash === 'advanced-settings') {
            sessionStorage.setItem('afm-settings-subtab', subTabFromHash);
            setSubTab(prev => prev !== subTabFromHash ? subTabFromHash : prev);
            return;
          }
        }
      }

      // If hash is just 'settings' (without sub-tab), fix it
      if (hash === 'settings') {
        const savedSubTab = sessionStorage.getItem('afm-settings-subtab') || 'general-settings';
        const subTabToUse = (savedSubTab === 'general-settings' || savedSubTab === 'advanced-settings') ? savedSubTab : 'general-settings';

        // Set flag to prevent useHashNavigation from clearing hash
        sessionStorage.setItem('afm-settings-hash-just-set', 'true');

        // Update URL immediately
        const urlHash = `#/settings/${subTabToUse}`;
        if (window.history && window.history.replaceState) {
          const url = window.location.href.split('#')[0] + urlHash;
          window.history.replaceState(null, '', url);
        } else {
          window.location.hash = urlHash;
        }

        // Update state if needed
        setSubTab(prev => prev !== subTabToUse ? subTabToUse : prev);

        // Remove flag after delay
        setTimeout(() => {
          sessionStorage.removeItem('afm-settings-hash-just-set');
        }, 2000);
      }
    };

    // Listen for hash changes
    window.addEventListener('hashchange', syncSubTabFromHash);

    // Also check immediately (but only if we're on settings tab)
    const rawHash = window.location.hash || '';
    const hash = rawHash.replace(/^#/, '').replace(/^\//, '');
    if (hash.startsWith('settings')) {
      syncSubTabFromHash();
    }

    return () => {
      window.removeEventListener('hashchange', syncSubTabFromHash);
    };
  }, []); // Only run on mount, hash changes will trigger hashchange event

  // Update URL hash when sub-tab changes (but not on initial mount to avoid overriding URL)
  const isInitialMountRef = React.useRef(true);
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      // On initial mount, still set the hash if it's missing
      const currentHash = window.location.hash.replace(/^#/, '').replace(/^\//, '');
      if (currentHash !== `settings/${subTab}` && !currentHash.startsWith('settings/')) {
        // Set flag to prevent useHashNavigation from clearing hash
        sessionStorage.setItem('afm-settings-hash-just-set', 'true');

        const hash = `#/settings/${subTab}`;
        if (window.history && window.history.replaceState) {
          const url = window.location.href.split('#')[0] + hash;
          window.history.replaceState(null, '', url);
          // Also set directly to ensure it sticks
          window.location.hash = hash;
        } else {
          window.location.hash = hash;
        }

        // Remove flag after delay
        setTimeout(() => {
          sessionStorage.removeItem('afm-settings-hash-just-set');
        }, 2000);
      }
      return;
    }

    // Set flag to prevent useHashNavigation from clearing hash
    sessionStorage.setItem('afm-settings-hash-just-set', 'true');

    const hash = `#/settings/${subTab}`;
    const currentHash = window.location.hash;

    // Only update if hash is different
    if (currentHash !== hash) {
      if (window.history && window.history.replaceState) {
        const url = window.location.href.split('#')[0] + hash;
        window.history.replaceState(null, '', url);
        // Also set directly to ensure it sticks
        window.location.hash = hash;
      } else {
        window.location.hash = hash;
      }
    }

    // Remove flag after delay
    setTimeout(() => {
      sessionStorage.removeItem('afm-settings-hash-just-set');
    }, 2000);
  }, [subTab]);

  // Fetch settings data
  useEffect(() => {
    if (!root || !nonce) {
      console.warn('AFM Settings: Missing API root or nonce');
      return;
    }
    setTimeout(() => {
      Promise.all([
        fetch(`${root}file-manager-advanced/v1/settings`, {
          credentials: 'same-origin',
          headers: { 'X-WP-Nonce': nonce }
        }),
        fetch(`${root}file-manager-advanced/v1/integrations-status`, {
          credentials: 'same-origin',
          headers: { 'X-WP-Nonce': nonce }
        }).catch(() => null)
      ])
        .then(async ([settingsRes, integrationsRes]) => {
          if (!settingsRes || !settingsRes.ok) {
            throw new Error('Failed to fetch settings');
          }

          const settingsData = await settingsRes.json();
          let integrationsData = null;

          if (integrationsRes && integrationsRes.ok) {
            try {
              integrationsData = await integrationsRes.json();
            } catch (e) {
              integrationsData = null;
            }
          }

          return [settingsData, integrationsData];
        })
        .then(([settingsData, integrationsData]) => {
          setData(settingsData);
          if (integrationsData && integrationsData.connected) {
            setIntegrationsStatus(integrationsData.connected);
          }
          if (settingsData && settingsData.settings) {
            const s = settingsData.settings;
            // Initialize formValues with all settings including checkboxes
            setFormValues({
              fma_debug_enabled: s.fma_debug_enabled || '0',
              fma_theme: s.fma_theme || 'light',
              fma_locale: s.fma_locale || 'en',
              fma_cm_theme: s.fma_cm_theme || 'default'
            });
            const rolesFromSettings = Array.isArray(s.fma_user_roles) && s.fma_user_roles.length
              ? [...s.fma_user_roles]
              : ['administrator'];
            if (!rolesFromSettings.includes('administrator')) {
              rolesFromSettings.unshift('administrator');
            }
            setSelectedRoles(rolesFromSettings);
            const initialSuffix = settingsData.public_path_suffix !== undefined
              ? settingsData.public_path_suffix
              : (s.public_path || '');
            const initialPublicUrl = settingsData.public_url || s.public_url || settingsData.url || '';
            setPublicPathSuffix(initialSuffix);
            setPublicUrl(initialPublicUrl);
          }
          setLoading(false);
        })
        .catch(err => {
          console.error('AFM Settings fetch error:', err);
          setLoading(false);
        });
    }, 100);
  }, [root, nonce]);

  // Live synchronization of Public Root Path and Files URL (AFM-992)
  const handlePublicPathChange = (e) => {
    const pathVal = e.target.value;
    setPublicPathSuffix(pathVal);

    const siteUrl = (data?.site_url || data?.url || window.location.origin).replace(/\/+$/, '');
    const cleanSuffix = pathVal.trim().replace(/^[\\\/]+|[\\\/]+$/g, '').replace(/\.\./g, '');
    const newUrl = cleanSuffix ? `${siteUrl}/${cleanSuffix}` : siteUrl;
    setPublicUrl(newUrl);
  };

  // Form submit handler
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!data || saving) return;
    setSaving(true);
    setMessage(null);

    const submitData = {};

    // Handle fma_user_role from controlled multi-select
    const userRoles = Array.isArray(selectedRoles) && selectedRoles.length
      ? Array.from(new Set(['administrator', ...selectedRoles]))
      : ['administrator'];
    submitData['fma_user_role'] = userRoles;

    // Handle text inputs
    const textInputs = ['fma_theme', 'fma_locale', 'public_path', 'public_url', 'upload_max_size', 'fma_upload_allow', 'fma_cm_theme'];
    textInputs.forEach(key => {
      const input = e.target.querySelector(`input[name="${key}"], select[name="${key}"], textarea[name="${key}"]`);
      if (input) {
        submitData[key] = input.value || '';
      }
    });

    // Handle single checkboxes - use formValues first, then fallback to DOM
    // Only include fields that are actually found or in formValues
    // If field is not found and we're on a different tab, don't include it (backend will preserve existing value)
    ['hide_path', 'enable_trash', 'enable_htaccess', 'fma_debug_enabled', 'display_dot_files'].forEach(key => {
      // For fma_debug_enabled, always use formValues if available
      if (key === 'fma_debug_enabled' && formValues.hasOwnProperty('fma_debug_enabled')) {
        submitData[key] = (formValues.fma_debug_enabled === '1' || formValues.fma_debug_enabled === true) ? '1' : '0';
        console.log('AFM Debug: Using formValues for fma_debug_enabled:', submitData[key], 'formValues:', formValues.fma_debug_enabled);
      } else if (formValues.hasOwnProperty(key)) {
        // First check formValues (for controlled components)
        submitData[key] = (formValues[key] === '1' || formValues[key] === true) ? '1' : '0';
      } else {
        // Fallback to DOM query
        const input = e.target.querySelector(`input[name="${key}"]`);
        if (input) {
          submitData[key] = input.checked ? '1' : '0';
          if (key === 'fma_debug_enabled') {
            console.log('AFM Debug: Using DOM for fma_debug_enabled:', submitData[key], 'checked:', input.checked);
          }
        }
        // If input not found in DOM, don't include it in submitData
        // Backend will preserve existing value if field is not provided
      }
    });

    // View type — only submit from Advanced Settings (General tab must not clear these)
    if (subTab === 'advanced-settings') {
      const displayUiOptions = [];
      e.target.querySelectorAll('input[name="display_ui_options[]"]:checked').forEach(cb => {
        displayUiOptions.push(cb.value);
      });
      submitData['display_ui_options'] = displayUiOptions;
    }

    // Blocked integrations — only on General Settings tab
    if (subTab === 'general-settings') {
      const blockedIntegrations = [];
      e.target.querySelectorAll('input[name="blocked_integrations[]"]:checked').forEach(cb => {
        blockedIntegrations.push(cb.value);
      });
      submitData['blocked_integrations'] = blockedIntegrations;
    }

    // Debug: Log submitData to see what's being sent
    console.log('AFM Settings: Submitting data:', submitData);

    fetch(`${root}file-manager-advanced/v1/settings`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'X-WP-Nonce': nonce,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(submitData)
    })
      .then(r => r.json())
      .then(res => {
        setSaving(false);
        console.log('AFM Settings: Save response:', res);
        if (res.success) {
          setMessage({ type: 'success', text: res.message || 'Settings saved successfully.' });
          // Check if display_ui_options changed before updating state
          const oldUiOptions = data?.settings?.display_ui_options || [];
          const newUiOptions = res.settings?.display_ui_options || [];
          const oldLocale = data?.settings?.fma_locale || formValues.fma_locale || 'en';
          const newLocale = res.settings?.fma_locale || oldLocale;
          const oldUiOptionsStr = JSON.stringify([...oldUiOptions].sort());
          const newUiOptionsStr = JSON.stringify([...newUiOptions].sort());
          const uiOptionsChanged = oldUiOptionsStr !== newUiOptionsStr;
          const localeChanged = oldLocale !== newLocale;

          const oldCmTheme = data?.settings?.fma_cm_theme || 'default';
          const newCmTheme = res.settings?.fma_cm_theme || 'default';
          const cmThemeChanged = oldCmTheme !== newCmTheme;

          const oldFmTheme = data?.settings?.fma_theme || 'light';
          const newFmTheme = res.settings?.fma_theme || 'light';
          const fmThemeChanged = oldFmTheme !== newFmTheme;

          const oldDebug = String(data?.settings?.fma_debug_enabled ?? '0');
          const newDebug = String(res.settings?.fma_debug_enabled ?? '0');
          const debugChanged = oldDebug !== newDebug;

          // elFinder only applies CodeMirror theme, view (ui:), skin theme, and debug hooks on init — force full reinit on next File Manager visit.
          const embedSettingsChanged =
            uiOptionsChanged || cmThemeChanged || fmThemeChanged || debugChanged;

          setData(prev => ({
            ...prev,
            settings: res.settings,
            public_root_path: res.public_root_path || prev?.public_root_path,
            public_path_suffix: res.public_path_suffix !== undefined ? res.public_path_suffix : prev?.public_path_suffix,
            public_url: res.public_url || res.settings?.public_url || prev?.public_url,
            url: res.url || prev?.url,
            site_url: res.site_url || prev?.site_url,
          }));
          if (res.public_path_suffix !== undefined) {
            setPublicPathSuffix(res.public_path_suffix);
          }
          if (res.public_url) {
            setPublicUrl(res.public_url);
          }
          // Update formValues with saved settings to keep them in sync
          if (res.settings) {
            console.log('AFM Settings: Updating formValues with saved settings:', res.settings);
            setFormValues(prev => {
              const updated = {
                ...prev,
                fma_debug_enabled: res.settings.fma_debug_enabled !== undefined ? String(res.settings.fma_debug_enabled) : (prev.fma_debug_enabled || '0'),
                fma_theme: res.settings.fma_theme || prev.fma_theme || 'light',
                fma_locale: res.settings.fma_locale || prev.fma_locale || 'en',
                fma_cm_theme: res.settings.fma_cm_theme || prev.fma_cm_theme || 'default',
                upload_max_size: res.settings.upload_max_size || '0',
                fma_upload_allow: res.settings.fma_upload_allow || 'all'
              };
              console.log('AFM Settings: Updated formValues:', updated);
              return updated;
            });

            // View type / CodeMirror / elFinder skin / debug only apply on elFinder init. Next FM open must destroy+reinit.
            // Also force after any Advanced Settings save — avoids false negatives when API/client values look unchanged.
            if (embedSettingsChanged || subTab === 'advanced-settings') {
              sessionStorage.setItem('afm_force_fm_reinit', 'true');
              sessionStorage.removeItem('afm_ui_options_changed');
            }
            // If locale changed, force full elFinder reinit on next File Manager tab open.
            if (localeChanged) {
              sessionStorage.setItem('afm_locale_changed', 'true');
              const currentHash = window.location.hash || '';
              if (currentHash.includes('filemanager')) {
                window.dispatchEvent(new CustomEvent('afm-settings-changed', { detail: { type: 'locale' } }));
              }
            }
          }
        } else {
          setMessage({ type: 'error', text: res.message || 'Failed to save settings.' });
        }
        setTimeout(() => setMessage(null), 5000);
      })
      .catch(err => {
        console.error('AFM Settings save error:', err);
        setSaving(false);
        setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
        setTimeout(() => setMessage(null), 5000);
      });
  };

  if (loading) {
    return (
      <div className="afm-settings-shell">
        <div className="afm-settings-subnav" aria-hidden="true">
          <span className="afm-settings-subnav__tab is-active">General</span>
          <span className="afm-settings-subnav__tab">Advanced</span>
        </div>
        <div className="afm-settings-body">
          <div className="afm-settings-card">
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
            <div className="afm-skeleton" style={{ height: '20px', width: '260px', borderRadius: '6px', marginBottom: '16px' }} />
            <div className="afm-skeleton" style={{ height: '42px', width: '100%', maxWidth: '600px', borderRadius: '6px', marginBottom: '12px' }} />
            <div className="afm-skeleton" style={{ height: '42px', width: '100%', maxWidth: '600px', borderRadius: '6px', marginBottom: '12px' }} />
            <div className="afm-skeleton" style={{ height: '42px', width: '180px', borderRadius: '6px', marginTop: '16px' }} />
          </div>
        </div>
      </div>
    );
  }

  if (!data || !data.settings) {
    return (
      <div className="afm-settings-shell">
        <div className="afm-settings-body">
          <div className="afm-settings-card">
            <p>Failed to load settings.</p>
          </div>
        </div>
      </div>
    );
  }

  const s = data.settings || {};
  const roles = data.roles || {};
  const locales = data.locales || {};
  const themes = data.themes || {};
  const cm_themes = data.cm_themes || [];
  const ui_options = data.ui_options || [];

  const switchSettingsSubTab = (next) => {
    sessionStorage.setItem('afm-settings-hash-just-set', 'true');
    setSubTab(next);
    const urlHash = `#/settings/${next}`;
    if (window.history && window.history.replaceState) {
      const url = window.location.href.split('#')[0] + urlHash;
      window.history.replaceState(null, '', url);
    }
    window.location.hash = urlHash;
    setTimeout(() => {
      sessionStorage.removeItem('afm-settings-hash-just-set');
    }, 2000);
  };

  return (
    <div className="afm-settings-shell">
      <nav className="afm-settings-subnav" aria-label="Settings sections">
        <a
          href="#/settings/general-settings"
          onClick={(e) => {
            e.preventDefault();
            switchSettingsSubTab('general-settings');
          }}
          className={`afm-settings-subnav__tab${subTab === 'general-settings' ? ' is-active' : ''}`}
        >
          General
        </a>
        <a
          href="#/settings/advanced-settings"
          onClick={(e) => {
            e.preventDefault();
            switchSettingsSubTab('advanced-settings');
          }}
          className={`afm-settings-subnav__tab${subTab === 'advanced-settings' ? ' is-active' : ''}`}
        >
          Advanced
        </a>
      </nav>

      <div className="afm-settings-body">
        <div className="afm-settings-card">
          {message && (
            <div
              className={`afm-snackbar afm-snackbar-${message.type === 'success' ? 'success' : 'error'}`}
              onClick={() => setMessage(null)}
              style={{ animation: 'afm-slideIn 0.3s ease-out' }}
            >
              <span style={{ fontSize: '14px', lineHeight: '1.5', flex: '1' }}>{message.text}</span>
              <button
                type="button"
                className="afm-snackbar-close"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMessage(null); }}
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          )}

        {subTab === 'general-settings' && (
          <form onSubmit={handleSubmit} className="afm-stacked-form">
            {/* Who can access File Manager? */}
            <div className="afm-form-field">
              <div className="afm-field-head">
                <label className="afm-field-label">Who can access File Manager?</label>
                <p className="afm-field-desc">Select which WordPress user roles can open Advanced File Manager.</p>
              </div>
              <div className="afm-field-input">
                <div className="afm-select">
                  <button
                    type="button"
                    className="afm-select__trigger"
                    onClick={() => {
                      setShowRolesDropdown(!showRolesDropdown);
                      setShowThemeDropdown(false);
                      setShowLocaleDropdown(false);
                      setShowCmThemeDropdown(false);
                    }}
                    aria-expanded={showRolesDropdown}
                  >
                    <span className="afm-select__value">
                      {selectedRoles
                        .map((k) => (k === 'administrator' ? 'Administrator' : ((roles[k] && roles[k].name) || k)))
                        .join(', ')}
                    </span>
                    <SelectChevron />
                  </button>
                  {showRolesDropdown && (
                    <>
                      <div className="afm-select__backdrop" onClick={() => setShowRolesDropdown(false)} />
                      <div className="afm-select__menu" role="listbox">
                        <div className="afm-select__option afm-select__option--check is-disabled">
                          <input type="checkbox" id="afm-role-administrator" checked disabled readOnly />
                          <label htmlFor="afm-role-administrator">Administrator</label>
                        </div>
                        {Object.keys(roles).filter((k) => k !== 'administrator').map((k) => {
                          const checked = selectedRoles.indexOf(k) !== -1;
                          const roleId = `afm-role-${k}`;
                          return (
                            <div key={k} className="afm-select__option afm-select__option--check" role="option">
                              <input
                                id={roleId}
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  setSelectedRoles((prev) => {
                                    const next = new Set(prev);
                                    next.add('administrator');
                                    if (e.target.checked) next.add(k);
                                    else next.delete(k);
                                    return Array.from(next);
                                  });
                                }}
                              />
                              <label htmlFor={roleId}>{(roles[k] && roles[k].name) ? roles[k].name : k}</label>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Hide Dot Files */}
            <div className="afm-form-field afm-form-field--check">
              <input type="checkbox" id="display_dot_files" name="display_dot_files" value="1" defaultChecked={s.display_dot_files == '1'} />
              <div className="afm-field-head">
                <label className="afm-field-label" htmlFor="display_dot_files">Hide Dot Files</label>
                <p className="afm-field-desc">Hide files and folders that start with a dot (.) from the file manager. Default: Disabled</p>
              </div>
            </div>

            {/* Hide File Path in Info Dialog */}
            <div className="afm-form-field afm-form-field--check">
              <input type="checkbox" id="hide_path" name="hide_path" value="1" defaultChecked={s.hide_path == '1'} />
              <div className="afm-field-head">
                <label className="afm-field-label" htmlFor="hide_path">Hide File Path in Info Dialog?</label>
                <p className="afm-field-desc">Hide real path of file in the Get Info dialog box. Default: Disabled</p>
              </div>
            </div>

            {/* Maximum Upload Size */}
            <div className="afm-form-field">
              <label className="afm-field-label" htmlFor="upload_max_size">Maximum Upload Size</label>
              <div className="afm-field-input">
                <input
                  type="text"
                  id="upload_max_size"
                  name="upload_max_size"
                  className="regular-text"
                  value={formValues.upload_max_size !== undefined ? formValues.upload_max_size : (s.upload_max_size || '0')}
                  onChange={(e) => setFormValues(prev => ({ ...prev, upload_max_size: e.target.value }))}
                />
                <p className="afm-field-help">
                  Maximum upload file size. This size is per files. Can be set as number with unit like 10M, 500K, 1G. 0 means unlimited upload.
                </p>
              </div>
            </div>

            {/* Mimetypes allowed to upload */}
            <div className="afm-form-field">
              <label className="afm-field-label" htmlFor="fma_upload_allow">Mimetypes allowed to upload</label>
              <div className="afm-field-input">
                <textarea
                  id="fma_upload_allow"
                  name="fma_upload_allow"
                  className="large-text"
                  rows={4}
                  value={formValues.fma_upload_allow !== undefined ? formValues.fma_upload_allow : (s.fma_upload_allow || 'all')}
                  onChange={(e) => setFormValues(prev => ({ ...prev, fma_upload_allow: e.target.value }))}
                />
                <p className="afm-field-help">
                  Enter MIME types allowed to upload, multiple comma(,) separated. Example: image/vnd.adobe.photoshop,image/png
                </p>
                <p className="afm-field-help">
                  Default: all{' '}
                  <a
                    className="afm-field-link"
                    href="https://advancedfilemanager.com/advanced-file-manager-mime-types/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    MIME Types Help
                  </a>
                </p>
              </div>
            </div>

            {hasPro && (
              <div className="afm-form-field">
                <div className="afm-field-head">
                  <label className="afm-field-label">Blocked Integrations</label>
                  <p className="afm-field-desc">Select integrations to block. Blocked integrations will not appear in the file manager.</p>
                </div>
                <div className="afm-field-input">
                    {(() => {
                      const base = window.afmReact?.proImagesURL || '';
                      const blockedIntegrations = s.blocked_integrations || [];
                      const integrationsList = [
                        { key: 'onedrive', name: 'OneDrive', img: base + 'onedrive.svg', dbKey: 'onedrive' },
                        { key: 'googledrive', name: 'Google Drive', img: base + 'googledrive.svg', dbKey: 'googledrive' },
                        { key: 'googlecloud', name: 'Google Cloud Storage', img: base + 'googlecloud.svg', dbKey: 'googlecloud' },
                        { key: 'dropbox', name: 'Dropbox', img: base + 'dropbox.svg', dbKey: 'dropbox' },
                        { key: 'amazonses', name: 'Amazon S3', img: base + 'amazons3.svg', dbKey: 'amazonses' },
                        { key: 'pcloud', name: 'pCloud', img: base + 'pcloud.svg', dbKey: 'pcloud' },
                        { key: 'cloudflarer2', name: 'Cloudflare R2', img: base + 'cloudflarer2.svg', dbKey: 'cloudflarer2' },
                        { key: 'wasabi', name: 'Wasabi', img: base + 'wasabi.svg', dbKey: 'wasabi' }
                      ];

                      const canManageBlocks = currentPlan === 'business';
                      const connectedIntegrations = canManageBlocks
                        ? integrationsList.filter(item => integrationsStatus[item.dbKey])
                        : [];

                      if (!canManageBlocks || connectedIntegrations.length === 0) {
                        return (
                          <div className="afm-integrations-empty">
                            No connected integrations found.
                          </div>
                        );
                      }

                      return (
                        <div className="afm-integrations-grid">
                          {connectedIntegrations.map(item => {
                            const isBlocked = blockedIntegrations.includes(item.dbKey);
                            const checkId = `afm-block-integration-${item.dbKey}`;
                            return (
                              <div
                                key={item.key}
                                className={`afm-integration-card${isBlocked ? ' is-blocked' : ''}`}
                              >
                                <label className="afm-integration-card__check" htmlFor={checkId}>
                                  <input
                                    id={checkId}
                                    type="checkbox"
                                    name="blocked_integrations[]"
                                    value={item.dbKey}
                                    defaultChecked={isBlocked}
                                  />
                                  <span className="screen-reader-text">Block {item.name}</span>
                                </label>
                                <div className="afm-integration-card__icon">
                                  {item.img && (
                                    <img
                                      src={item.img}
                                      alt=""
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                      }}
                                    />
                                  )}
                                </div>
                                <div className="afm-integration-card__meta">
                                  <span className="afm-integration-card__name">{item.name}</span>
                                  <span className="afm-integration-card__status">
                                    {isBlocked ? 'Blocked' : 'Connected'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                </div>
              </div>
            )}

            <p className="submit">
              <input
                type="submit"
                name="submit"
                id="submit"
                className="button button-primary afm-teal-button"
                value={saving ? 'Saving...' : 'Save Changes'}
                disabled={saving}
              />
            </p>
          </form>
        )}

        {subTab === 'advanced-settings' && (
          <form onSubmit={handleSubmit} className="afm-stacked-form">
            {/* Theme */}
            <div className="afm-form-field">
              <label className="afm-field-label" htmlFor="fma_theme">Theme</label>
              <div className="afm-field-input">
                <div className="afm-select">
                  <button
                    type="button"
                    className="afm-select__trigger"
                    onClick={() => {
                      setShowThemeDropdown(!showThemeDropdown);
                      setShowLocaleDropdown(false);
                      setShowCmThemeDropdown(false);
                      setShowRolesDropdown(false);
                    }}
                    aria-expanded={showThemeDropdown}
                  >
                    <span className="afm-select__value">
                      {themes[formValues.fma_theme || s.fma_theme || 'light']?.title || 'Light'}
                    </span>
                    <SelectChevron />
                  </button>
                  {showThemeDropdown && (
                    <>
                      <div className="afm-select__backdrop" onClick={() => setShowThemeDropdown(false)} />
                      <div className="afm-select__menu">
                        {Object.keys(themes).map(k => {
                          const theme = themes[k];
                          const isProTheme = theme.pro && !data.has_pro;
                          const isPlanRestricted = theme.pro && data.has_pro && !advanceThemesAvailable;
                          const disabled = isProTheme || isPlanRestricted;
                          const isSelected = (formValues.fma_theme || s.fma_theme || 'light') === k;
                          return (
                            <div
                              key={k}
                              className={`afm-select__option${isSelected ? ' is-selected' : ''}${disabled ? ' is-disabled' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (disabled) {
                                  setShowThemeDropdown(false);
                                  const pricingUrl = window.afmReact?.pricingUrl || 'https://advancedfilemanager.com/pricing/';
                                  if (typeof window.file_manager_advanced_popup === 'function') {
                                    window.file_manager_advanced_popup(pricingUrl);
                                  } else if (typeof window.jQuery !== 'undefined' && window.jQuery) {
                                    const $ = window.jQuery;
                                    const tempElement = $('<a>', {
                                      class: 'on-click-show-popup',
                                      'fma-href': pricingUrl,
                                      style: 'display: none;'
                                    }).appendTo('body');
                                    tempElement.trigger('click');
                                    setTimeout(() => { tempElement.remove(); }, 100);
                                  } else {
                                    window.open(pricingUrl, '_blank');
                                  }
                                } else {
                                  setFormValues(prev => ({ ...prev, fma_theme: k }));
                                  setShowThemeDropdown(false);
                                }
                              }}
                            >
                              <span>{theme.title}</span>
                              {disabled && (
                                <img src={getShellAsset('icon-crown.svg')} alt="" width={16} height={16} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                  <input type="hidden" name="fma_theme" value={formValues.fma_theme || s.fma_theme || 'light'} />
                </div>
                <p className="afm-field-help">
                  Select file manager advanced theme. Default: Light
                </p>
              </div>
            </div>

            {/* Language Selection */}
            <div className="afm-form-field">
              <label className="afm-field-label" htmlFor="fma_locale">Language</label>
              <div className="afm-field-input">
                <div className="afm-select">
                  <button
                    type="button"
                    className="afm-select__trigger"
                    onClick={() => {
                      setShowLocaleDropdown(!showLocaleDropdown);
                      setShowThemeDropdown(false);
                      setShowCmThemeDropdown(false);
                      setShowRolesDropdown(false);
                    }}
                    aria-expanded={showLocaleDropdown}
                  >
                    <span className="afm-select__value">
                      {Object.keys(locales).find(k => locales[k] === (formValues.fma_locale || s.fma_locale || 'en')) || 'en (English)'}
                    </span>
                    <SelectChevron />
                  </button>
                  {showLocaleDropdown && (
                    <>
                      <div className="afm-select__backdrop" onClick={() => setShowLocaleDropdown(false)} />
                      <div className="afm-select__menu">
                        {Object.keys(locales).map(k => {
                          const localeValue = locales[k];
                          const isSelected = (formValues.fma_locale || s.fma_locale || 'en') === localeValue;
                          return (
                            <div
                              key={k}
                              className={`afm-select__option${isSelected ? ' is-selected' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setFormValues(prev => ({ ...prev, fma_locale: localeValue }));
                                setShowLocaleDropdown(false);
                              }}
                            >
                              <span>{k}</span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                  <input type="hidden" name="fma_locale" value={formValues.fma_locale || s.fma_locale || 'en'} />
                </div>
                <p className="afm-field-help">
                  Select file manager advanced language. Default: en (English)
                </p>
              </div>
            </div>

            {/* View Type — Figma 2×2 checkbox grid */}
            <div className="afm-form-field">
              <label className="afm-field-label">View Type</label>
              <div className="afm-field-input">
                <div className="afm-view-type-grid">
                  {ui_options.map(opt => {
                    const checked = s.display_ui_options === undefined || s.display_ui_options === null
                      ? true
                      : (s.display_ui_options.length > 0 && s.display_ui_options.indexOf(opt) !== -1);
                    const optId = `afm-view-type-${opt.replace(/[^a-z0-9_-]/gi, '-')}`;
                    return (
                      <div key={opt} className="afm-view-type-grid__item">
                        <input
                          id={optId}
                          type="checkbox"
                          name="display_ui_options[]"
                          value={opt}
                          defaultChecked={checked}
                        />
                        <label htmlFor={optId}>{opt}</label>
                      </div>
                    );
                  })}
                </div>
                <p className="afm-field-help afm-field-help--md">
                  You can control the view of file manager. By default, all options are checked.
                </p>
              </div>
            </div>

            {/* Code Editor Theme Selection */}
            <div className="afm-form-field">
              <label className="afm-field-label" htmlFor="fma_cm_theme">
                Code Editor Theme
              </label>
              <div className="afm-field-input">
                <div className="afm-select">
                  <button
                    type="button"
                    className="afm-select__trigger"
                    onClick={() => {
                      setShowCmThemeDropdown(!showCmThemeDropdown);
                      setShowThemeDropdown(false);
                      setShowLocaleDropdown(false);
                      setShowRolesDropdown(false);
                    }}
                    aria-expanded={showCmThemeDropdown}
                  >
                    <span className="afm-select__value">
                      {formValues.fma_cm_theme || s.fma_cm_theme || 'default'}
                    </span>
                    <SelectChevron />
                  </button>
                  {showCmThemeDropdown && (
                    <>
                      <div className="afm-select__backdrop" onClick={() => setShowCmThemeDropdown(false)} />
                      <div className="afm-select__menu">
                        {cm_themes.map(theme => {
                          const isProTheme = theme.pro && !data.has_pro;
                          const isPlanRestricted = theme.pro && data.has_pro && !codeEditorThemesAvailable;
                          const disabled = isProTheme || isPlanRestricted;
                          const isSelected = (formValues.fma_cm_theme || s.fma_cm_theme || 'default') === theme.title;
                          return (
                            <div
                              key={theme.title}
                              className={`afm-select__option${isSelected ? ' is-selected' : ''}${disabled ? ' is-disabled' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (disabled) {
                                  setShowCmThemeDropdown(false);
                                  const pricingUrl = window.afmReact?.pricingUrl || 'https://advancedfilemanager.com/pricing/';
                                  if (typeof window.file_manager_advanced_popup === 'function') {
                                    window.file_manager_advanced_popup(pricingUrl);
                                  } else if (typeof window.jQuery !== 'undefined' && window.jQuery) {
                                    const $ = window.jQuery;
                                    const tempElement = $('<a>', {
                                      class: 'on-click-show-popup',
                                      'fma-href': pricingUrl,
                                      style: 'display: none;'
                                    }).appendTo('body');
                                    tempElement.trigger('click');
                                    setTimeout(() => { tempElement.remove(); }, 100);
                                  } else {
                                    window.open(pricingUrl, '_blank');
                                  }
                                } else {
                                  setFormValues(prev => ({ ...prev, fma_cm_theme: theme.title }));
                                  setShowCmThemeDropdown(false);
                                }
                              }}
                            >
                              <span>{theme.title}</span>
                              {disabled && (
                                <img src={getShellAsset('icon-crown.svg')} alt="" width={16} height={16} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                  <input type="hidden" name="fma_cm_theme" value={formValues.fma_cm_theme || s.fma_cm_theme || 'default'} />
                </div>
                <p className="afm-field-help">
                  Select code editor theme. Default: default
                </p>
              </div>
            </div>

            {/* Debug Mode Toggle */}
            <div className="afm-form-field afm-form-field--check">
              <input
                type="checkbox"
                id="fma_debug_enabled"
                name="fma_debug_enabled"
                value="1"
                checked={formValues.fma_debug_enabled === '1' || formValues.fma_debug_enabled === true || (formValues.fma_debug_enabled === undefined && s.fma_debug_enabled == '1')}
                onChange={(e) => {
                  const newValue = e.target.checked ? '1' : '0';
                  setFormValues(prev => ({
                    ...prev,
                    fma_debug_enabled: newValue
                  }));
                }}
              />
              <div className="afm-field-head">
                <label className="afm-field-label" htmlFor="fma_debug_enabled">
                  Debug in Code Editor <sup className="afm-field-new">New</sup>
                </label>
                <p className="afm-field-desc">Enable real-time PHP syntax error detection, highlighting, and debugging features in the code editor, Default: Disabled</p>
              </div>
            </div>

            {/* Enable Trash / Recycle Feature Toggle */}
            <div className="afm-form-field afm-form-field--check">
              <input type="checkbox" id="enable_trash" name="enable_trash" value="1" defaultChecked={s.enable_trash == '1'} />
              <div className="afm-field-head">
                <label className="afm-field-label" htmlFor="enable_trash">Enable Trash</label>
                <p className="afm-field-desc">Deleted files will go to trash folder, you can restore later. Default: Disabled</p>
              </div>
            </div>

            {/* Web Root Path — single Figma-style control */}
            <div className="afm-form-field">
              <label className="afm-field-label" htmlFor="public_path">Web Root Path</label>
              <div className="afm-field-input">
                <div className="afm-input afm-input--path">
                  <span className="afm-input__prefix" title={data.public_root_path || data.path || ''}>
                    {data.public_root_path || data.path || ''}
                  </span>
                  <input
                    type="text"
                    id="public_path"
                    name="public_path"
                    value={publicPathSuffix}
                    onChange={handlePublicPathChange}
                    placeholder="Enter relative folder path (e.g. wp-content/uploads)"
                  />
                </div>
                <p className="afm-field-help">
                  File Manager Advanced Root Path, you can change according to your choice. Default: {data.public_root_path || data.path || ''}
                </p>
              </div>
            </div>

            {/* Web Root URL */}
            <div className="afm-form-field">
              <label className="afm-field-label" htmlFor="public_url">Web Root URL</label>
              <div className="afm-field-input">
                <input
                  type="text"
                  id="public_url"
                  name="public_url"
                  className="regular-text"
                  value={publicUrl}
                  onChange={(e) => setPublicUrl(e.target.value)}
                />
                <p className="afm-field-help">
                  File Manager Advanced Files URL, you can change according to your choice. Default: {data.url || (data.site_url || '')}
                </p>
              </div>
            </div>

            <p className="submit">
              <input
                type="submit"
                name="submit"
                id="submit-advanced"
                className="button button-primary afm-teal-button"
                value={saving ? 'Saving...' : 'Save Changes'}
                disabled={saving}
              />
            </p>
          </form>
        )}
        </div>
      </div>
    </div>
  );
}
