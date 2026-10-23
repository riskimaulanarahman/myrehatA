import React, { useState } from 'react';
import { formStyles } from './shared/IntegrationFormStyles';
import { OAuthConnectSection } from './shared/OAuthConnectSection';
import { CopyButton } from './shared/CopyButton';
import UserRoleAccessField from './shared/UserRoleAccessField';

/**
 * Google Drive Integration Component
 */
export default function GoogleDrive({
  settings,
  hasPro,
  isConnected,
  setShowDisconnectModal,
  setDisconnectIntegration,
  setMessage,
}) {
  const [showAppSecret, setShowAppSecret] = useState(false);
  const defaultRedirectUri = settings.redirect_uri || '';
  const canConnect = !!(settings.app_key && settings.app_secret && defaultRedirectUri);

  const handleConnect = () => {
    if (!canConnect || !hasPro) {
      if (!defaultRedirectUri && setMessage) {
        setMessage({ type: 'error', text: 'Redirect URI is missing. Please reload the page and try again.' });
        setTimeout(() => setMessage(null), 4000);
      }
      return;
    }
    const redirectHash = window.location.hash || '#/extension/google-drive';
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(settings.app_key)}&response_type=code&redirect_uri=${encodeURIComponent(defaultRedirectUri)}&scope=https://www.googleapis.com/auth/drive&access_type=offline&prompt=consent&state=${encodeURIComponent(redirectHash)}`;
  };

  return (
    <>
      {/* Alias */}
      <div>
        <label htmlFor="title" style={formStyles.label}>Alias</label>
        <input
          type="text"
          id="title"
          name="title"
          defaultValue={settings.title || 'Google Drive'}
          disabled={!hasPro}
          style={{ ...formStyles.input, maxWidth: '500px' }}
        />
        <p style={formStyles.description}>Enter a title which will be displayed on File Manager</p>
      </div>

      {/* App Key */}
      <div>
        <label htmlFor="app_key" style={formStyles.label}>App Key</label>
        <input
          type="text"
          id="app_key"
          name="app_key"
          defaultValue={settings.app_key || ''}
          disabled={!hasPro}
          style={{ ...formStyles.input, maxWidth: '500px' }}
        />
        <p style={formStyles.description}>
          Enter your Google Drive App key, you will get your app key from{' '}
          <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" style={formStyles.link}>
            Google Drive App Console
          </a>
        </p>
      </div>

      {/* App Secret */}
      <div>
        <label htmlFor="app_secret" style={formStyles.label}>App Secret</label>
        <div style={{ position: 'relative', maxWidth: '500px' }}>
          <input
            type={showAppSecret ? 'text' : 'password'}
            id="app_secret"
            name="app_secret"
            defaultValue={settings.app_secret || ''}
            disabled={!hasPro}
            style={formStyles.input}
          />
          <button
            type="button"
            onClick={() => setShowAppSecret(!showAppSecret)}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666',
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
          Enter your Google Drive App secret, you will get your app secret from{' '}
          <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" style={formStyles.link}>
            Google Drive App Console
          </a>
        </p>
      </div>

      {/* JavaScript Origin */}
      <div>
        <label htmlFor="javascript_origin" style={formStyles.label}>Javascript Origin</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '500px' }}>
          <input
            type="text"
            id="javascript_origin"
            name="javascript_origin"
            value={window.location.origin}
            readOnly
            disabled={!hasPro}
            style={{ ...formStyles.input, background: '#f5f5f5', cursor: 'not-allowed', maxWidth: '500px' }}
          />
          <CopyButton
            text={window.location.origin}
            disabled={!hasPro}
            setMessage={setMessage}
            successMessage="JavaScript Origin copied to clipboard!"
          />
        </div>
        <p style={formStyles.description}>
          Copy this URL and paste it in your{' '}
          <strong style={formStyles.emphasis}>Google Drive App Console</strong> under{' '}
          <strong style={formStyles.emphasis}>JavaScript Origins</strong>
        </p>
      </div>

      {/* Redirect URL */}
      <div>
        <label htmlFor="redirect_uri" style={formStyles.label}>Redirect URL</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '500px' }}>
          <input
            type="text"
            id="redirect_uri"
            name="redirect_uri"
            value={defaultRedirectUri}
            readOnly
            disabled={!hasPro}
            style={{ ...formStyles.input, background: '#f5f5f5', cursor: 'not-allowed', maxWidth: '500px' }}
          />
          <CopyButton
            text={defaultRedirectUri}
            disabled={!hasPro}
            setMessage={setMessage}
            successMessage="Redirect URL copied to clipboard!"
          />
        </div>
        <p style={formStyles.description}>
          Copy this URL and paste it in your{' '}
          <strong style={formStyles.emphasis}>Google Drive App Console</strong> under{' '}
          <strong style={formStyles.emphasis}>Redirect URIs</strong>
        </p>
      </div>

      <UserRoleAccessField
        settings={settings}
        disabled={!hasPro}
        description="Select the user roles allowed to access the Google Drive file manager"
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
          Enter a folder path to restrict access to that folder only. Leave blank to use the root directory.
        </p>
      </div>

      <OAuthConnectSection
        serviceName="Google Drive"
        isConnected={isConnected}
        canConnect={canConnect}
        hasPro={hasPro}
        brandColor="#4285F4"
        credentialsHint="Please enter your App Key and App Secret, then save changes before connecting."
        onConnect={handleConnect}
        onDisconnect={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (setDisconnectIntegration && setShowDisconnectModal) {
            setDisconnectIntegration('google-drive');
            setShowDisconnectModal(true);
          }
        }}
      />
    </>
  );
}
