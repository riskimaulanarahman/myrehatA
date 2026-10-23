import React, { useState } from 'react';
import { formStyles } from './shared/IntegrationFormStyles';
import { OAuthConnectSection } from './shared/OAuthConnectSection';
import { CopyButton } from './shared/CopyButton';
import UserRoleAccessField from './shared/UserRoleAccessField';

/**
 * OneDrive Integration Component
 */
export default function OneDrive({ settings, hasPro, isConnected, onConnect, setMessage, setShowDisconnectModal, setDisconnectIntegration }) {
  const [showAppSecret, setShowAppSecret] = useState(false);
  const defaultRedirectUri = settings.redirect_uri || '';
  const canConnect = !!(settings.app_id && settings.app_secret && defaultRedirectUri);

  return (
    <>
      {/* Alias */}
      <div>
        <label htmlFor="title" style={formStyles.label}>Alias</label>
        <input
          type="text"
          id="title"
          name="title"
          defaultValue={settings.title || 'OneDrive'}
          disabled={!hasPro}
          style={{ ...formStyles.input, maxWidth: '500px' }}
        />
        <p style={formStyles.description}>Enter a title which will be displayed on File Manager</p>
      </div>

      {/* Application (client) ID */}
      <div>
        <label htmlFor="app_id" style={formStyles.label}>Application (client) ID</label>
        <input
          type="text"
          id="app_id"
          name="app_id"
          defaultValue={settings.app_id || ''}
          disabled={!hasPro}
          style={{ ...formStyles.input, maxWidth: '500px' }}
        />
        <p style={formStyles.description}>
          Enter your OneDrive Application (client) ID from your{' '}
          <a href="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade" target="_blank" rel="noopener noreferrer" style={formStyles.link}>
            Azure AD app registration.
          </a>
        </p>
      </div>

      {/* Client secret */}
      <div>
        <label htmlFor="app_secret" style={formStyles.label}>Client secret</label>
        <div style={{ position: 'relative', maxWidth: '500px' }}>
          <input
            type={showAppSecret ? 'text' : 'password'}
            id="app_secret"
            name="app_secret"
            defaultValue={settings.app_secret || ''}
            disabled={!hasPro}
            style={{ ...formStyles.input, paddingRight: '40px' }}
          />
          <button
            type="button"
            onClick={() => setShowAppSecret(!showAppSecret)}
            disabled={!hasPro}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: !hasPro ? 'not-allowed' : 'pointer',
              padding: '5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666',
              zIndex: 10,
              opacity: !hasPro ? 0.5 : 1,
            }}
            title={showAppSecret ? 'Hide App Secret' : 'Show App Secret'}
          >
            {showAppSecret ? (
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
          Enter your OneDrive Client secret from your{' '}
          <a href="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade" target="_blank" rel="noopener noreferrer" style={formStyles.link}>
            Azure AD app registration.
          </a>
        </p>
      </div>

      {/* Redirect URI (Read-only) */}
      <div>
        <label htmlFor="redirect_uri" style={formStyles.label}>Redirect URI</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '500px' }}>
          <input
            type="text"
            id="redirect_uri"
            value={defaultRedirectUri}
            readOnly
            disabled={!hasPro}
            style={{ ...formStyles.input, background: '#f5f5f5', cursor: 'not-allowed' }}
          />
          <CopyButton
            text={defaultRedirectUri}
            disabled={!hasPro}
            setMessage={setMessage}
            successMessage="Redirect URI copied to clipboard!"
          />
        </div>
        <p style={formStyles.description}>
          Copy this exact URL into{' '}
          <strong style={formStyles.emphasis}>Azure AD app registration → Authentication → Redirect URIs (Web)</strong>.
          Do not add ?page= or other query parameters.
        </p>
      </div>

      <UserRoleAccessField
        settings={settings}
        disabled={!hasPro}
        description="Select the user roles allowed to access the OneDrive file manager"
      />

      {/* Private Folder Access */}
      <div>
        <label htmlFor="private_folder_access" style={formStyles.label}>Private Folder Access</label>
        <input
          type="text"
          id="private_folder_access"
          name="private_folder_access"
          defaultValue={settings.private_folder_access || ''}
          disabled={!hasPro}
          style={{ ...formStyles.input, maxWidth: '500px' }}
          placeholder="e.g. Documents"
        />
        <p style={formStyles.description}>
          Enter a folder name/path to restrict access to that folder only. Leave blank to use the root directory.
        </p>
      </div>

      <OAuthConnectSection
        serviceName="OneDrive"
        isConnected={isConnected}
        canConnect={canConnect}
        hasPro={hasPro}
        brandColor="#0078d4"
        credentialsHint="Please enter your Application (client) ID and Client secret, then save changes before connecting."
        onConnect={onConnect}
        onDisconnect={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (setDisconnectIntegration && setShowDisconnectModal) {
            setDisconnectIntegration('onedrive');
            setShowDisconnectModal(true);
          }
        }}
      />
    </>
  );
}

