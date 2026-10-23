import React, { useState } from 'react';
import { useIntegrationLibrary } from './shared/useIntegrationLibrary';
import { formStyles } from './shared/IntegrationFormStyles';
import { OAuthConnectSection } from './shared/OAuthConnectSection';
import { CopyButton } from './shared/CopyButton';
import UserRoleAccessField from './shared/UserRoleAccessField';

/**
 * Dropbox Integration Component
 */
export default function Dropbox({ settings, hasPro, root, nonce, setMessage, isConnected, setShowDisconnectModal, setDisconnectIntegration }) {
  const { libraryInstalled, setLibraryInstalled, installing, installLibrary } = useIntegrationLibrary(
    'dropbox',
    root,
    nonce,
    hasPro
  );

  const [showAppSecret, setShowAppSecret] = useState(false);

  const handleInstallLibrary = async () => {
    const result = await installLibrary();
    if (result.success) {
      setMessage({ type: 'success', text: result.message });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: 'error', text: result.message });
      setTimeout(() => setMessage(null), 5000);
    }
  };

  // Update library installed status from settings
  React.useEffect(() => {
    if (settings.library_installed !== undefined) {
      setLibraryInstalled(settings.library_installed);
    }
  }, [settings.library_installed, setLibraryInstalled]);

  const dropboxRedirectUri = settings.redirect_uri || '';
  const fieldsDisabled = !hasPro || !libraryInstalled;
  const canConnect = !!(settings.app_key && settings.app_secret && dropboxRedirectUri);

  const handleConnect = () => {
    if (!canConnect || !hasPro) {
      if (!dropboxRedirectUri && setMessage) {
        setMessage({ type: 'error', text: 'Redirect URI is missing. Please reload the page and try again.' });
        setTimeout(() => setMessage(null), 4000);
      }
      return;
    }

    const redirectTo = window.location.hash || '#/extension/dropbox';
    sessionStorage.setItem('afm-dropbox-redirect-to', redirectTo);
    const connectUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${encodeURIComponent(settings.app_key)}&response_type=code&token_access_type=offline&redirect_uri=${encodeURIComponent(dropboxRedirectUri)}&state=${encodeURIComponent(redirectTo)}`;
    window.location.href = connectUrl;
  };

  return (
    <>
      {!libraryInstalled && (
        <div style={formStyles.warningBox}>
          <p style={formStyles.warningText}>
            Dropbox library is not installed. Please install the library first to configure authentication settings.
          </p>
          <button
            type="button"
            onClick={handleInstallLibrary}
            disabled={!hasPro || installing}
            style={{
              ...formStyles.installButton,
              background: installing ? '#ccc' : '#3F6972',
              cursor: !hasPro || installing ? 'not-allowed' : 'pointer',
            }}
          >
            {installing ? 'Installing Library...' : 'Install Dropbox Library'}
          </button>
        </div>
      )}

      {/* Alias */}
      <div>
        <label htmlFor="title" style={formStyles.label}>Alias</label>
        <input
          type="text"
          id="title"
          name="title"
          defaultValue={settings.title || 'Dropbox'}
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
          Enter your Dropbox App key, you will get your app key from{' '}
          <a href="https://www.dropbox.com/developers/apps" target="_blank" rel="noopener noreferrer" style={formStyles.link}>
            Dropbox App Console
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
          Enter your Dropbox App secret, you will get your app secret from{' '}
          <a href="https://www.dropbox.com/developers/apps" target="_blank" rel="noopener noreferrer" style={formStyles.link}>
            Dropbox App Console
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
            name="redirect_uri"
            value={dropboxRedirectUri}
            readOnly
            disabled={!hasPro}
            style={{ ...formStyles.input, background: '#f5f5f5' }}
          />
          <CopyButton
            text={dropboxRedirectUri}
            disabled={!hasPro}
            setMessage={setMessage}
            successMessage="Redirect URI copied to clipboard!"
          />
        </div>
        <p style={formStyles.description}>
          Copy this URL and paste it in your{' '}
          <strong style={formStyles.emphasis}>Dropbox App Console</strong> under{' '}
          <strong style={formStyles.emphasis}>Redirect URIs</strong>
        </p>
      </div>

      <UserRoleAccessField
        settings={settings}
        disabled={fieldsDisabled}
        description="Select the user roles allowed to access the Dropbox file manager"
      />

      {/* Private Folder Access */}
      <div>
        <label htmlFor="private_folder_access" style={formStyles.label}>Private Folder Access</label>
        <input
          type="text"
          id="private_folder_access"
          name="private_folder_access"
          defaultValue={settings.private_folder_access || ''}
          disabled={fieldsDisabled}
          style={{ ...formStyles.input, maxWidth: '500px' }}
          placeholder="e.g. Documents"
        />
        <p style={formStyles.description}>
          Enter a folder name/path to restrict access to that folder only. Leave blank to use the root directory.
        </p>
      </div>

      {libraryInstalled && (
        <OAuthConnectSection
          serviceName="Dropbox"
          isConnected={isConnected}
          canConnect={canConnect}
          hasPro={hasPro}
          brandColor="#0061FF"
          credentialsHint="Please enter your App Key and App Secret, then save changes before connecting."
          onConnect={handleConnect}
          onDisconnect={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (setDisconnectIntegration && setShowDisconnectModal) {
              setDisconnectIntegration('dropbox');
              setShowDisconnectModal(true);
            }
          }}
        />
      )}
    </>
  );
}

