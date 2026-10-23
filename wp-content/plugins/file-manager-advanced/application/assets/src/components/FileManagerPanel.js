import React, { useEffect, useRef, useState } from 'react';
import ProSideBanner from './ProSideBanner';

function normalizeToCurrentOrigin(url) {
  if (!url || typeof url !== 'string') return url;
  try {
    const parsed = new URL(url, window.location.origin);
    parsed.protocol = window.location.protocol;
    parsed.host = window.location.host;
    return parsed.toString();
  } catch (e) {
    if (url.startsWith('/')) return `${window.location.origin}${url}`;
    return url;
  }
}

function ensureLocaleScript(locale, libraryUrl) {
  if (!locale || locale === 'en' || !libraryUrl) return Promise.resolve();
  const hasLocale =
    !!(window.elFinder && window.elFinder.prototype && window.elFinder.prototype.i18 && window.elFinder.prototype.i18[locale]);
  if (hasLocale) return Promise.resolve();

  const scriptId = `elfinder-i18n-${locale}`;
  if (document.getElementById(scriptId)) return Promise.resolve();

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `${libraryUrl}js/i18n/elfinder.${locale}.js`;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
    setTimeout(resolve, 1200);
  });
}

function mountElfinderInstance($container) {
  const libraryUrl = window.afm_object?.plugin_url ? `${window.afm_object.plugin_url}application/library/` : '';
  const locale = window.afm_object?.locale || 'en';
  return ensureLocaleScript(locale, libraryUrl).then(() => {
    if (typeof window.afmMountElfinder === 'function') {
      window.afmMountElfinder($container);
    }
    setTimeout(() => {
      if (typeof window.afmResizeElfinder === 'function') {
        window.afmResizeElfinder();
      }
      window.dispatchEvent(new Event('resize'));
    }, 100);
  });
}

export default function FileManagerPanel({ activeTab }) {
  const prevTabRef = useRef(null);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const hasPro = !!(window.afmReact?.hasPro);
  const hideBannerFlag = window.afmReact?.hideBanner;
  const bannerAlreadyHidden =
    hideBannerFlag === true ||
    hideBannerFlag === 1 ||
    hideBannerFlag === '1' ||
    hideBannerFlag === 'yes';
  const [showProBanner, setShowProBanner] = useState(
    () => !hasPro && !bannerAlreadyHidden
  );
  const reloadElfinderIfReady = () => {
    const fmContainer = document.getElementById('file_manager_advanced');
    if (!fmContainer || !window.jQuery) return false;
    const $container = window.jQuery(fmContainer);
    try {
      const instance = $container.elfinder('instance');
      if (instance && typeof instance.exec === 'function') {
        instance.exec('reload');
        window.dispatchEvent(new Event('resize'));
        return true;
      }
    } catch (e) {
      // ignore if not initialized yet
    }
    return false;
  };

  const hardRefreshElfinder = () => {
    const fmContainer = document.getElementById('file_manager_advanced');
    if (!fmContainer || !window.jQuery) return false;
    const $container = window.jQuery(fmContainer);
    try {
      const instance = $container.elfinder('instance');
      if (!instance) return false;
      const rootIds = Object.keys(instance.roots || {});
      if (rootIds.length > 0 && instance.roots[rootIds[0]]) {
        instance.request({
          data: {
            cmd: 'open',
            target: instance.roots[rootIds[0]],
            init: 1,
            tree: 1,
          },
          notify: { type: 'open', cnt: 1, hideCnt: true },
          syncOnFail: true,
        });
      } else {
        instance.exec('reload');
      }
      window.dispatchEvent(new Event('resize'));
      return true;
    } catch (e) {
      return false;
    }
  };

  useEffect(() => {
    // Move existing FM container into our File Manager tab pane
    const fmRoot = document.getElementById('file_manager_advanced');
    const proxy = document.getElementById('file_manager_advanced_proxy');
    if (fmRoot && proxy && !proxy.hasChildNodes()) {
      proxy.appendChild(fmRoot);
    }

    // Move review/top banner if present
    const topBanner = document.getElementById('fma_rate_us');
    const topProxy = document.getElementById('afm-top-banner-proxy');
    if (topBanner && topBanner.parentElement && topProxy && !topProxy.hasChildNodes()) {
      topProxy.appendChild(topBanner);
    }

    // Remove right-side pro banner entirely if present
    const rightBanner = document.querySelector('.afm__right-side');
    if (rightBanner && rightBanner.parentElement) {
      rightBanner.parentElement.removeChild(rightBanner);
    }
  }, []); // Only run once on mount

  // Direct tab-click fallback: light refresh when File Manager tab pill is clicked.
  // Do NOT run this when a full embed rebuild is pending — it races with destroy+reinit and keeps stale theme/ui.
  useEffect(() => {
    const onActivated = () => {
      setTimeout(() => {
        if (sessionStorage.getItem('afm_force_fm_reinit') === 'true') {
          return;
        }
        if (!hardRefreshElfinder()) {
          reloadElfinderIfReady();
        }
      }, 120);
    };
    window.addEventListener('afm-filemanager-tab-activated', onActivated);
    return () => window.removeEventListener('afm-filemanager-tab-activated', onActivated);
  }, []);

  // elFinder lifecycle: scheduled on each transition TO the File Manager tab (no hasReloadedRef — React Strict
  // Mode remount otherwise skips the second init and leaves the spinner / stale instance).
  useEffect(() => {
    if (activeTab !== 'filemanager') {
      prevTabRef.current = activeTab;
      return;
    }

    const prevTab = prevTabRef.current;
    prevTabRef.current = activeTab;

    // Switching from any other tab → full page reload so elFinder remounts with fresh settings/volumes.
    if (prevTab && prevTab !== 'filemanager') {
      sessionStorage.setItem('afm-active-tab', 'filemanager');
      sessionStorage.removeItem('afm-should-restore-tab');
      window.location.reload();
      return;
    }

    const aiSettingsChanged = sessionStorage.getItem('afm_ai_settings_changed');
    if (aiSettingsChanged === 'true') {
      sessionStorage.removeItem('afm_ai_settings_changed');
      sessionStorage.setItem('afm_force_fm_reinit', 'true');
    }

    const oneDriveSettingsChanged = sessionStorage.getItem('afm_onedrive_settings_changed');
    if (oneDriveSettingsChanged === 'true') {
      sessionStorage.removeItem('afm_onedrive_settings_changed');
      sessionStorage.setItem('afm_force_fm_reinit', 'true');
      window.location.reload();
      return;
    }

    const uiOptionsChanged = sessionStorage.getItem('afm_ui_options_changed');
    if (uiOptionsChanged === 'true') {
      sessionStorage.removeItem('afm_ui_options_changed');
    }

    const localeChanged = sessionStorage.getItem('afm_locale_changed');
    if (localeChanged === 'true') {
      sessionStorage.removeItem('afm_locale_changed');
      window.location.reload();
      return;
    }

    const forceFmReinit = sessionStorage.getItem('afm_force_fm_reinit');
    const shouldQueueForceRebuild = forceFmReinit === 'true';
    if (shouldQueueForceRebuild) {
      sessionStorage.removeItem('afm_skip_reinit');
    }

    const skipReinit = sessionStorage.getItem('afm_skip_reinit');
    if (skipReinit === 'true' && forceFmReinit !== 'true') {
      sessionStorage.removeItem('afm_skip_reinit');
      return;
    }

    const reinitializeElFinder = () => {
      if (!window.jQuery || !window.jQuery.fn.elfinder) {
        // Try again after delay
        setTimeout(reinitializeElFinder, 500);
        return;
      }

      try {
        const fmContainer = document.getElementById('file_manager_advanced');
        if (!fmContainer) {
          // Container not found, try again
          setTimeout(reinitializeElFinder, 500);
          return;
        }

        const forceRebuild =
          sessionStorage.getItem('afm_force_fm_reinit') === 'true';
        if (forceRebuild) {
          sessionStorage.removeItem('afm_force_fm_reinit');
        }

        // Check if elFinder is already initialized
        const elFinderElement = fmContainer.querySelector('.elfinder');
        const $container = window.jQuery(fmContainer);
        // Keep existing instance, but force a backend refresh when tab becomes active.
        if ((elFinderElement || $container.data('elfinder')) && !forceRebuild) {
          reloadElfinderIfReady();
          return;
        }
        if (elFinderElement || $container.data('elfinder')) {
          try {
            if ($container.elfinder) {
              $container.elfinder('destroy');
            }
          } catch (e) { }
          fmContainer.innerHTML = '';
        }

        // Fetch latest settings from API to ensure theme and other settings are up to date
        // Handle both pretty permalinks (/wp-json/) and plain permalinks (index.php?rest_route=)
        const root = normalizeToCurrentOrigin(window.wpApiSettings?.root || window.afmReact?.jsonURL || '/wp-json/');
        const nonce = window.wpApiSettings?.nonce || window.afmReact?.nonce || '';

        let cleanRoot = root.endsWith('/') ? root : root + '/';
        let settingsUrl;
        if (cleanRoot.includes('rest_route=')) {
          const baseUrl = cleanRoot.split('rest_route=')[0] + 'rest_route=';
          settingsUrl = `${baseUrl}/file-manager-advanced/v1/settings&_=${Date.now()}`;
        } else {
          settingsUrl = `${cleanRoot}file-manager-advanced/v1/settings?_=${Date.now()}`;
        }

        fetch(settingsUrl, {
          credentials: 'same-origin',
          headers: { 'X-WP-Nonce': nonce }
        })
          .then(r => {
            if (!r.ok) {
              // If fetch fails, use fallback
              throw new Error('Failed to fetch settings');
            }
            return r.json();
          })
          .then(res => {
            // Handle case where response might not have settings (e.g., Pro deactivated)
            if (!res || !res.settings) {
              // If settings are missing, use existing afm_object as fallback
              if (!window.afm_object) {
                throw new Error('Invalid settings response');
              }
              // If afm_object exists, use fallback - don't throw error, just use existing settings
              // This will be caught by the catch block and handled gracefully
              throw new Error('Using fallback settings');
            }
            return res;
          })
          .then(res => {
            // Update afm_object with latest settings
            if (window.afm_object) {
              const settings = res.settings;
              // Update locale - ensure it's set properly
              if (settings.fma_locale) {
                window.afm_object.locale = settings.fma_locale;
              } else if (window.afm_object.locale === undefined || window.afm_object.locale === null) {
                window.afm_object.locale = 'en'; // Default fallback
              }
              window.afm_object.cm_theme = settings.fma_cm_theme || window.afm_object.cm_theme;
              window.afm_object.theme = settings.fma_theme || 'light'; // Store elFinder theme
              // Update hide_path setting
              window.afm_object.hide_path = settings.hide_path == '1' || settings.hide_path == 1 ? 1 : 0;
              // Update debug_enabled setting (CRITICAL: must be updated for debug feature to work after settings change)
              window.afm_object.debug_enabled = settings.fma_debug_enabled == '1' || settings.fma_debug_enabled == 1 ? '1' : '0';
              // Use saved display_ui_options from settings (not ui_options which is the full list)
              // If display_ui_options exists (even if empty array), use it
              // Only fallback to full list if display_ui_options is undefined/null (never been set)
              if (settings.display_ui_options !== undefined && settings.display_ui_options !== null) {
                // Use saved value (even if empty array - this means user explicitly unchecked all)
                window.afm_object.ui = Array.isArray(settings.display_ui_options) ? settings.display_ui_options : [];
              } else if (res.ui_options && Array.isArray(res.ui_options)) {
                // Fallback to full list only if display_ui_options was never set
                window.afm_object.ui = res.ui_options;
              }

              // Apply hide_path CSS if enabled
              const hidePathStyleId = 'hide-path';
              const existingStyle = document.getElementById(hidePathStyleId);
              if (window.afm_object.hide_path == 1) {
                if (!existingStyle) {
                  const custom_css = `<style id="${hidePathStyleId}" type="text/css">.elfinder-info-path { display:none; } .elfinder-info-tb tr:nth-child(2) { display:none; }</style>`;
                  document.head.insertAdjacentHTML('beforeend', custom_css);
                }
              } else {
                if (existingStyle) {
                  existingStyle.remove();
                }
              }
            }

            // Load/reload elFinder theme CSS if theme changed
            const newTheme = res.settings.fma_theme || 'light';

            // Remove all existing elFinder theme CSS files (WordPress enqueued ones)
            const existingThemeLinks = document.querySelectorAll('link[href*="themes/"][href*="/css/theme.css"]');
            existingThemeLinks.forEach(link => {
              if (link.href.includes('/themes/')) {
                link.remove();
              }
            });

            // Also remove by ID if exists
            const themeCssId = 'elfinder-theme-css';
            const existingThemeLink = document.getElementById(themeCssId);
            if (existingThemeLink) {
              existingThemeLink.remove();
            }

            // Only load theme CSS if it's a custom theme (not 'light')
            let themeCssLoaded = Promise.resolve();
            if (['dark', 'grey', 'windows10', 'bootstrap', 'mono', 'm-light', 'moono'].includes(newTheme)) {
              const libraryUrl = window.afm_object?.plugin_url || '';
              const themeCssUrl = libraryUrl + 'application/library/themes/' + newTheme + '/css/theme.css';

              // Add new theme CSS and wait for it to load
              const link = document.createElement('link');
              link.id = themeCssId;
              link.rel = 'stylesheet';
              link.type = 'text/css';
              link.href = themeCssUrl;

              themeCssLoaded = new Promise((resolve) => {
                link.onload = () => resolve();
                link.onerror = () => resolve(); // Continue even if CSS fails to load
                document.head.appendChild(link);
                // Fallback timeout
                setTimeout(() => resolve(), 1000);
              });
            }

            // Load/reload CodeMirror theme CSS if changed
            const newCmTheme = res.settings.fma_cm_theme || 'default';

            // Remove all existing CodeMirror theme CSS files (WordPress enqueued ones)
            const existingCmThemeLinks = document.querySelectorAll('link[href*="codemirror/theme/"]');
            existingCmThemeLinks.forEach(link => {
              if (link.href.includes('/codemirror/theme/') && !link.href.includes('/codemirror/lib/')) {
                link.remove();
              }
            });

            // Also remove by ID if exists
            const cmThemeCssId = 'codemirror-theme-css';
            const existingCmThemeLink = document.getElementById(cmThemeCssId);
            if (existingCmThemeLink) {
              existingCmThemeLink.remove();
            }

            // Only load CodeMirror theme if it's not 'default'
            let cmThemeCssLoaded = Promise.resolve();
            if (newCmTheme !== 'default') {
              const libraryUrl = window.afm_object?.plugin_url || '';
              const cmThemeCssUrl = libraryUrl + 'application/library/codemirror/theme/' + newCmTheme + '.css';

              // Add new CodeMirror theme CSS and wait for it to load
              const link = document.createElement('link');
              link.id = cmThemeCssId;
              link.rel = 'stylesheet';
              link.type = 'text/css';
              link.href = cmThemeCssUrl;

              cmThemeCssLoaded = new Promise((resolve) => {
                link.onload = () => resolve();
                link.onerror = () => resolve(); // Continue even if CSS fails to load
                document.head.appendChild(link);
                // Fallback timeout
                setTimeout(() => resolve(), 1000);
              });
            }

            // Wait for all CSS to load, then reinitialize
            Promise.all([themeCssLoaded, cmThemeCssLoaded]).then(() => {
              // Give browser a moment to apply CSS
              setTimeout(() => {
                if (!window.afm_object) {
                  return;
                }

                try {
                  mountElfinderInstance($container).catch((e) => {
                    console.error('elFinder reinitialize error:', e);
                    window.dispatchEvent(new Event('resize'));
                  });
                } catch (e) {
                  console.error('elFinder reinitialize error:', e);
                  window.dispatchEvent(new Event('resize'));
                }
              }, 300); // Wait 300ms for browser to apply CSS
            });
          })
          .catch(err => {
            // Only log error if it's not the expected fallback case
            if (err.message !== 'Using fallback settings') {
              console.error('Failed to fetch settings for elFinder reinitialization:', err);
            }
            // Fallback to existing afm_object if settings fetch fails (e.g., Pro deactivated)
            if (window.afm_object) {
              setTimeout(() => {
                try {
                  mountElfinderInstance($container).catch((e) => {
                    console.error('elFinder reinitialize error:', e);
                    window.dispatchEvent(new Event('resize'));
                  });
                } catch (e) {
                  console.error('elFinder reinitialize error:', e);
                  window.dispatchEvent(new Event('resize'));
                }
              }, 200);
            }
          });
      } catch (e) {
        console.error('elFinder reinitialize error:', e);
        window.dispatchEvent(new Event('resize'));
      }
    };

    const timer = setTimeout(reinitializeElFinder, shouldQueueForceRebuild ? 80 : 200);

    return () => {
      clearTimeout(timer);
    };
  }, [activeTab]); // Run when activeTab changes

  // Fallback trigger: if tab state is driven by hash routing and activeTab prop
  // is not updated in time, reload when hash lands on filemanager.
  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
      const main = hash.split('/')[0];
      if (main === 'filemanager') {
        setTimeout(() => {
          if (sessionStorage.getItem('afm_force_fm_reinit') === 'true') {
            return;
          }
          reloadElfinderIfReady();
        }, 120);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Listen for settings change events (e.g., UI options changed while on file manager tab)
  useEffect(() => {
    const handleSettingsChange = (event) => {
      if (event.detail && (event.detail.type === 'ui_options' || event.detail.type === 'locale') && activeTab === 'filemanager') {
        // Safer than runtime destroy/reinit: reload page with fresh settings.
        sessionStorage.removeItem('afm_ui_options_changed');
        sessionStorage.setItem('afm_force_fm_reinit', 'true');
        setTimeout(() => {
          if (!hardRefreshElfinder()) {
            reloadElfinderIfReady();
          }
        }, 100);
      }
    };

    window.addEventListener('afm-settings-changed', handleSettingsChange);
    return () => {
      window.removeEventListener('afm-settings-changed', handleSettingsChange);
    };
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'filemanager') return;

    setShowSkeleton(true);

    const checkReady = () => {
      const proxy = document.getElementById('file_manager_advanced_proxy');
      const fmRoot = document.getElementById('file_manager_advanced');
      const hasMountedRoot = !!(proxy && proxy.childNodes && proxy.childNodes.length > 0);
      const hasElfinderUi = !!(fmRoot && fmRoot.querySelector('.elfinder'));
      if (hasMountedRoot || hasElfinderUi) {
        setShowSkeleton(false);
        return true;
      }
      return false;
    };

    const onElfinderLoaded = () => {
      setShowSkeleton(false);
      if (typeof window.afmResizeElfinder === 'function') {
        window.afmResizeElfinder();
      }
    };

    if (checkReady()) return;

    window.addEventListener('afm-elfinder-loaded', onElfinderLoaded);

    const observer = new MutationObserver(() => {
      checkReady();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const interval = setInterval(() => {
      checkReady();
    }, 250);

    const failSafe = setTimeout(() => {
      setShowSkeleton(false);
    }, 8000);

    return () => {
      window.removeEventListener('afm-elfinder-loaded', onElfinderLoaded);
      observer.disconnect();
      clearInterval(interval);
      clearTimeout(failSafe);
    };
  }, [activeTab]);

  return (
    <div
      id="afm-file-manager-tab"
      className={`afm-fm-layout${showProBanner ? ' afm-fm-layout--with-banner' : ''}`}
    >
      <div className="afm-fm-layout__main">
        <div className="afm-fm-layout__card">
          {showSkeleton && (
            <div className="afm-fm-skeleton">
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
              <div className="afm-skeleton" style={{ height: '40px', width: '260px', borderRadius: '6px', marginBottom: '16px' }} />
              <div className="afm-skeleton" style={{ height: '480px', width: '100%', borderRadius: '8px' }} />
            </div>
          )}
          <div id="afm-top-banner-proxy" />
          <div id="file_manager_advanced_proxy" />
        </div>
      </div>
      {showProBanner && (
        <ProSideBanner
          onHidden={() => {
            setShowProBanner(false);
            setTimeout(() => {
              if (typeof window.afmResizeElfinder === 'function') {
                window.afmResizeElfinder();
              }
              window.dispatchEvent(new Event('resize'));
            }, 50);
          }}
        />
      )}
    </div>
  );
}

