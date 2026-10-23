import React, { useState } from 'react';
import { useIntegrationLibrary } from './shared/useIntegrationLibrary';
import { formStyles } from './shared/IntegrationFormStyles';
import { OAuthConnectSection } from './shared/OAuthConnectSection';
import { CopyButton } from './shared/CopyButton';
import UserRoleAccessField from './shared/UserRoleAccessField';

export default function PCloud({
  settings,
  hasPro,
  root,
  nonce,
  setMessage,
  isConnected,
  setShowDisconnectModal,
  setDisconnectIntegration
}) {
  const [showAppSecret, setShowAppSecret] = useState(false);
  const { libraryInstalled, setLibraryInstalled, installing, installLibrary } = useIntegrationLibrary(
    'pcloud',
    root,
    nonce,
    hasPro
  );

  React.useEffect(() => {
    if (settings.library_installed !== undefined) {
      setLibraryInstalled(settings.library_installed);
    }
  }, [settings.library_installed, setLibraryInstalled]);

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

  const fieldsDisabled = !hasPro || !libraryInstalled;
  const redirectUri = settings.redirect_uri || '';
  const canConnect = !!(settings.app_key && settings.app_secret && redirectUri);

  const handleConnect = () => {
    if (!canConnect || fieldsDisabled) {
      if (setMessage) {
        if (!redirectUri) {
          setMessage({ type: 'error', text: 'Redirect URI is missing. Please reload the page and try again.' });
        } else {
          setMessage({ type: 'error', text: 'Please enter App Key and App Secret, then save settings before connecting.' });
        }
        setTimeout(() => setMessage(null), 4000);
      }
      return;
    }

    const redirectHash = window.location.hash || '#/extension/pcloud';
    sessionStorage.setItem('afm-oauth-redirect-hash', redirectHash);
    const connectUrl = `https://my.pcloud.com/oauth2/authorize?client_id=${encodeURIComponent(settings.app_key)}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(redirectHash)}`;
    window.location.href = connectUrl;
  };

  return (
    <>
      {!libraryInstalled && (
        <div style={formStyles.warningBox}>
          <p style={formStyles.warningText}>
            pCloud library is not installed. Please install the library first.
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
            {installing ? 'Installing Library...' : 'Install pCloud Library'}
          </button>
        </div>
      )}

      <div>
        <label htmlFor="title" style={formStyles.label}>Alias</label>
        <input
          type="text"
          id="title"
          name="title"
          defaultValue={settings.title || 'pCloud'}
          disabled={fieldsDisabled}
          style={{ ...formStyles.input, maxWidth: '500px' }}
        />
        <p style={formStyles.description}>Enter a title which will be displayed on File Manager</p>
      </div>

      <div>
        <label htmlFor="app_key" style={formStyles.label}>App Key</label>
        <input
          type="text"
          id="app_key"
          name="app_key"
          defaultValue={settings.app_key || ''}
          disabled={fieldsDisabled}
          style={{ ...formStyles.input, maxWidth: '500px' }}
        />
        <p style={formStyles.description}>
          Enter your pCloud App Key.{' '}
          <a href="https://docs.pcloud.com/my_apps/" target="_blank" rel="noopener noreferrer" style={formStyles.link}>
            pCloud My Apps
          </a>
        </p>
      </div>

      <div>
        <label htmlFor="app_secret" style={formStyles.label}>App Secret</label>
        <div style={{ position: 'relative', maxWidth: '500px' }}>
          <input
            type={showAppSecret ? 'text' : 'password'}
            id="app_secret"
            name="app_secret"
            defaultValue={settings.app_secret || ''}
            disabled={fieldsDisabled}
            style={formStyles.input}
          />
          <button
            type="button"
            onClick={() => setShowAppSecret(!showAppSecret)}
            disabled={fieldsDisabled}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: fieldsDisabled ? 'not-allowed' : 'pointer',
              padding: '5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666',
              opacity: fieldsDisabled ? 0.5 : 1,
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
      </div>

      <UserRoleAccessField
        settings={settings}
        disabled={fieldsDisabled}
        description="Select the user roles allowed to access the pCloud file manager"
      />

      <div>
        <label htmlFor="private_folder" style={formStyles.label}>Private access folder</label>
        <input
          type="text"
          id="private_folder"
          name="private_folder"
          defaultValue={settings.private_folder || ''}
          disabled={fieldsDisabled}
          style={{ ...formStyles.input, maxWidth: '500px' }}
          placeholder="e.g. /Documents"
        />
        <p style={formStyles.description}>
          Optional: Enter a folder path to show only that folder. Leave empty to show full pCloud root.
        </p>
      </div>

      <div>
        <label htmlFor="redirect_uri" style={formStyles.label}>Redirect URI</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '500px' }}>
          <input
            type="text"
            id="redirect_uri"
            name="redirect_uri"
            value={redirectUri}
            readOnly
            disabled={!hasPro}
            style={{ ...formStyles.input, background: '#f5f5f5' }}
          />
          <CopyButton
            text={redirectUri}
            disabled={!hasPro}
            setMessage={setMessage}
            successMessage="Redirect URI copied to clipboard!"
          />
        </div>
        <p style={formStyles.description}>
          Copy this URL and paste it in{' '}
          <strong style={formStyles.emphasis}>pCloud My Apps → Redirect URI</strong>
        </p>
      </div>

      {libraryInstalled && (
        <OAuthConnectSection
          serviceName="pCloud"
          isConnected={isConnected}
          canConnect={canConnect}
          hasPro={hasPro}
          brandColor="#2D7FC4"
          credentialsHint="Please enter your App Key and App Secret, then save changes before connecting."
          onConnect={handleConnect}
          onDisconnect={() => {
            if (setDisconnectIntegration && setShowDisconnectModal) {
              setDisconnectIntegration('pcloud');
              setShowDisconnectModal(true);
            }
          }}
        />
      )}
    </>
  );
}

