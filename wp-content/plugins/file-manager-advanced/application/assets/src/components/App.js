import React, { Suspense, useEffect } from 'react';
import { useHashNavigation } from '../hooks/useHashNavigation';
import { isFmOnlyAccess } from '../utils/access';
import Icon from './Icon';
import ProOverlay from './ProOverlay';

const Dashboard = React.lazy(() => import('./Dashboard'));
const FileManagerPanel = React.lazy(() => import('./FileManagerPanel'));
const SettingsPanel = React.lazy(() => import('./SettingsPanel'));
const LogsPanel = React.lazy(() => import('./LogsPanel'));
const NotificationsPanel = React.lazy(() => import('./NotificationsPanel'));
const IntegrationsPanel = React.lazy(() => import('./IntegrationsPanel'));
const DocumentationPanel = React.lazy(() => import('./DocumentationPanel'));
const PlanAccessPanel = React.lazy(() => import('./PlanAccessPanel'));

function getShellAssetUrl(filename) {
  const base = (window.afmReact?.pluginUrl || window.afm_object?.plugin_url || '/wp-content/plugins/file-manager-advanced/') + 'application/assets/images/shell/';
  return base + filename;
}

export default function App() {
  const fmOnlyAccess = isFmOnlyAccess();
  const [activeTab, changeTab] = useHashNavigation();

  useEffect(() => {
    if (!fmOnlyAccess) {
      return;
    }
    if (activeTab !== 'filemanager') {
      changeTab('filemanager');
    }
  }, [fmOnlyAccess, activeTab, changeTab]);

  useEffect(() => {
    if (activeTab !== 'settings') {
      sessionStorage.setItem('afm-settings-subtab', 'general-settings');
    }
    if (activeTab !== 'notifications') {
      sessionStorage.setItem('afm-notifications-subtab', 'email');
    }
    if (activeTab !== 'extension') {
      sessionStorage.removeItem('afm-extension-integration');
    }
  }, [activeTab]);

  const hasPro = window.afmReact?.hasPro || false;
  const currentPlan = window.afmReact?.currentPlan || 'free';
  const pricingUrl = window.afmReact?.pricingUrl || 'https://advancedfilemanager.com/pricing/';
  const showPlanAccess = window.afmReact?.showPlanAccess !== false;
  const freeVersion = window.afmReact?.version || '6.0.0';
  const proVersion = window.afmReact?.proVersion;

  const showGetProTab = showPlanAccess && !fmOnlyAccess && (!hasPro || (hasPro && (currentPlan === 'basic' || currentPlan === 'professional')));

  useEffect(() => {
    if (!showPlanAccess && activeTab === 'planaccess') {
      changeTab('dashboard');
    }
  }, [showPlanAccess, activeTab, changeTab]);

  const isTabAvailable = (tabId) => {
    if (!hasPro) {
      return ['dashboard', 'filemanager', 'settings', 'docs'].includes(tabId);
    }

    if (currentPlan === 'business') {
      return true;
    }

    if (currentPlan === 'professional') {
      if (tabId === 'extension') {
        return false;
      }
      return true;
    }

    if (currentPlan === 'basic') {
      if (tabId === 'extension') {
        return false;
      }
      return true;
    }

    return true;
  };

  // Free Figma: no PRO badges on tabs. Pro tiers keep badges for locked features.
  const showProBadge = (tabId) => hasPro && !isTabAvailable(tabId);

  const allTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'filemanager', label: 'File Manager', icon: 'filemanager' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
    { id: 'logs', label: 'Logs', icon: 'logs' },
    { id: 'notifications', label: 'Notifications', icon: 'notifications' },
    { id: 'extension', label: 'Integrations', icon: 'extension' },
    { id: 'docs', label: 'Documentation', icon: 'docs' },
  ];
  const tabs = fmOnlyAccess ? allTabs.filter((tab) => tab.id === 'filemanager') : allTabs;

  return (
    <div className="afm-admin-shell">
      {/* Header — Figma 749:8778 */}
      <div className="afm-header-banner">
        <div className="afm-header-banner__brand">
          <img
            className="afm-header-banner__logo"
            src={getShellAssetUrl('logo-new.svg')}
            alt="Advanced File Manager"
            width={184}
            height={40}
          />
        </div>
        <div className="afm-header-versions">
          <span className="afm-version-badge afm-version-badge--free">
            FREE v{freeVersion}
          </span>
          {proVersion ? (
            <span className="afm-version-badge afm-version-badge--pro">
              PRO v{proVersion}
            </span>
          ) : null}
        </div>
      </div>

      {/* Nav bar — Figma 749:8813 */}
      {!fmOnlyAccess && (
        <div className="afm-topbar">
          <div className="afm-pills-bar">
            <div className="afm-pills">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const tabHref = tab.id === 'settings'
                  ? '#/settings/general-settings'
                  : tab.id === 'notifications'
                    ? '#/notifications/email'
                    : tab.id === 'extension'
                      ? '#/extension'
                      : `#/${tab.id}`;
                return (
                  <a
                    key={tab.id}
                    className={`afm-pill${isActive ? ' is-active' : ''}`}
                    href={tabHref}
                    onClick={(e) => {
                      e.preventDefault();
                      if (tab.id === 'filemanager' && activeTab !== 'filemanager') {
                        sessionStorage.setItem('afm-active-tab', 'filemanager');
                        sessionStorage.removeItem('afm-should-restore-tab');
                        const url = `${window.location.href.split('#')[0]}#/filemanager`;
                        if (window.history && window.history.replaceState) {
                          window.history.replaceState(null, '', url);
                        } else {
                          window.location.hash = '#/filemanager';
                        }
                        window.location.reload();
                        return;
                      }
                      changeTab(tab.id);
                    }}
                  >
                    <Icon name={tab.icon} active={isActive} />
                    <span className="afm-pill__label">{tab.label}</span>
                    {showProBadge(tab.id) && (
                      <span className="afm-pill__pro-tag">PRO</span>
                    )}
                  </a>
                );
              })}
              {showGetProTab && (
                <a
                  className="afm-pill afm-pill-pro"
                  href={!hasPro ? pricingUrl : '#/planaccess'}
                  target={!hasPro ? '_blank' : undefined}
                  rel={!hasPro ? 'noopener noreferrer' : undefined}
                  onClick={(e) => {
                    if (!hasPro) {
                      e.preventDefault();
                      window.open(pricingUrl, '_blank');
                    } else {
                      e.preventDefault();
                      changeTab('planaccess');
                    }
                  }}
                >
                  <Icon name="pro" />
                  <span className="afm-pill__label">Get Pro</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      <Suspense fallback={
        <div style={{ padding: '50px', display: 'flex', justifyContent: 'center' }}>
          <div className="spinner is-active" style={{ float: 'none' }}></div>
        </div>
      }>
        {!fmOnlyAccess && activeTab === 'dashboard' && (
          <div className="afm-tab-panel">
            <Dashboard />
          </div>
        )}

        <div
          className="afm-tab-panel afm-tab-panel--filemanager"
          style={{ display: activeTab === 'filemanager' || fmOnlyAccess ? 'block' : 'none' }}
        >
          <FileManagerPanel activeTab={fmOnlyAccess ? 'filemanager' : activeTab} />
        </div>

        {!fmOnlyAccess && activeTab === 'settings' && (
          <SettingsPanel />
        )}

        {!fmOnlyAccess && activeTab === 'logs' && (
          <ProOverlay shouldShow={!isTabAvailable('logs')} waitForContentReady>
            <LogsPanel />
          </ProOverlay>
        )}

        {!fmOnlyAccess && activeTab === 'notifications' && (
          <NotificationsPanel />
        )}

        {!fmOnlyAccess && activeTab === 'extension' && (
          <ProOverlay shouldShow={!isTabAvailable('extension')}>
            <IntegrationsPanel />
          </ProOverlay>
        )}

        {!fmOnlyAccess && activeTab === 'docs' && (
          <DocumentationPanel />
        )}

        {showPlanAccess && !fmOnlyAccess && activeTab === 'planaccess' && (
          <PlanAccessPanel />
        )}
      </Suspense>
    </div>
  );
}
