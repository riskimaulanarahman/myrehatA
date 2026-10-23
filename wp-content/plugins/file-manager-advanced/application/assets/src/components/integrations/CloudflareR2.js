import React, { useState } from 'react';
import { useIntegrationLibrary } from './shared/useIntegrationLibrary';
import { formStyles } from './shared/IntegrationFormStyles';

export default function CloudflareR2({ settings, hasPro, root, nonce, setMessage }) {
  const [showSecretKey, setShowSecretKey] = useState(false);
  const { libraryInstalled, setLibraryInstalled, installing, installLibrary } = useIntegrationLibrary(
    'cloudflarer2',
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
  const roles = ['editor', 'author', 'contributor', 'subscriber'];

  return (
    <>
      {!libraryInstalled && (
        <div style={formStyles.warningBox}>
          <p style={formStyles.warningText}>
            Cloudflare R2 library is not installed. Please install the library first.
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
            {installing ? 'Installing Library...' : 'Install Cloudflare R2 Library'}
          </button>
        </div>
      )}

      <div>
        <label htmlFor="title" style={formStyles.label}>Alias</label>
        <input
          type="text"
          id="title"
          name="title"
          defaultValue={settings.title || settings.alias || 'Cloudflare R2'}
          disabled={fieldsDisabled}
          style={{ ...formStyles.input, maxWidth: '500px' }}
        />
        <p style={formStyles.description}>Enter a title which will be displayed on File Manager</p>
      </div>

      <div>
        <label htmlFor="access_key" style={formStyles.label}>Access Key ID <span style={{ color: 'red' }}>*</span></label>
        <input
          type="text"
          id="access_key"
          name="access_key"
          defaultValue={settings.access_key || ''}
          disabled={fieldsDisabled}
          style={{ ...formStyles.input, maxWidth: '500px' }}
        />
        <p style={formStyles.description}>
          Enter your Cloudflare R2 Access Key ID.{' '}
          <a href="https://dash.cloudflare.com/?to=/:account/r2/api-tokens" target="_blank" rel="noopener noreferrer" style={formStyles.link}>
            Manage R2 API Tokens
          </a>
        </p>
      </div>

      <div>
        <label htmlFor="secret_key" style={formStyles.label}>Secret Access Key <span style={{ color: 'red' }}>*</span></label>
        <div style={{ position: 'relative', maxWidth: '500px' }}>
          <input
            type={showSecretKey ? 'text' : 'password'}
            id="secret_key"
            name="secret_key"
            defaultValue={settings.secret_key || ''}
            disabled={fieldsDisabled}
            style={formStyles.input}
          />
          <button
            type="button"
            onClick={() => setShowSecretKey(!showSecretKey)}
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
            title={showSecretKey ? 'Hide Secret Access Key' : 'Show Secret Access Key'}
          >
            {showSecretKey ? (
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
        <p style={formStyles.description}>Enter your Cloudflare R2 Secret Access Key.</p>
      </div>

      <div>
        <label htmlFor="endpoint" style={formStyles.label}>Endpoint URL <span style={{ color: 'red' }}>*</span></label>
        <input
          type="text"
          id="endpoint"
          name="endpoint"
          defaultValue={settings.endpoint || ''}
          disabled={fieldsDisabled}
          placeholder="https://<accountid>.r2.cloudflarestorage.com"
          style={{ ...formStyles.input, maxWidth: '500px' }}
        />
        <p style={formStyles.description}>Enter your R2 Endpoint URL from Cloudflare dashboard.</p>
      </div>

      <div>
        <label htmlFor="bucket" style={formStyles.label}>Bucket Name <span style={{ color: 'red' }}>*</span></label>
        <input
          type="text"
          id="bucket"
          name="bucket"
          defaultValue={settings.bucket || ''}
          disabled={fieldsDisabled}
          style={{ ...formStyles.input, maxWidth: '500px' }}
        />
        <p style={formStyles.description}>Enter the name of your R2 bucket.</p>
      </div>

      <div>
        <label style={formStyles.label}>User Role Access</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {roles.map((role) => {
            const roleId = `afm-r2-role-${role}`;
            return (
              <div key={role} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', width: 'max-content', maxWidth: '100%' }}>
                <input
                  id={roleId}
                  type="checkbox"
                  name="user_role_access"
                  value={role}
                  defaultChecked={Array.isArray(settings.user_role_access) && settings.user_role_access.includes(role)}
                  disabled={fieldsDisabled}
                />
                <label htmlFor={roleId} style={{ margin: 0, textTransform: 'capitalize', cursor: fieldsDisabled ? 'not-allowed' : 'pointer' }}>
                  {role}
                </label>
              </div>
            );
          })}
        </div>
        <p style={formStyles.description}>Select the user roles allowed to access this storage.</p>
      </div>

      <div>
        <label htmlFor="private_folder" style={formStyles.label}>Private Folder Access</label>
        <input
          type="text"
          id="private_folder"
          name="private_folder"
          defaultValue={settings.private_folder || ''}
          disabled={fieldsDisabled}
          style={{ ...formStyles.input, maxWidth: '500px' }}
          placeholder="e.g. Documents"
        />
        <p style={formStyles.description}>Enter a subfolder name (optional) to restrict access.</p>
      </div>
    </>
  );
}

