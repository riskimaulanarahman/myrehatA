import React, { useState } from 'react';
import { useIntegrationLibrary } from './shared/useIntegrationLibrary';
import { formStyles } from './shared/IntegrationFormStyles';

/**
 * Amazon S3 Integration Component
 */
export default function AmazonS3({ settings, hasPro, root, nonce, setMessage, onLibraryInstalled }) {
  const [showAppSecret, setShowAppSecret] = useState(false);
  const { libraryInstalled, setLibraryInstalled, installing, installLibrary } = useIntegrationLibrary(
    'amazon-s3',
    root,
    nonce,
    hasPro
  );

  const handleInstallLibrary = async () => {
    const result = await installLibrary();
    if (result.success) {
      setLibraryInstalled(true);
      setMessage({ type: 'success', text: result.message });
      setTimeout(() => setMessage(null), 3000);
      // Notify parent component to refresh settings
      if (onLibraryInstalled) {
        onLibraryInstalled();
      }
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

  const roles = ['editor', 'author', 'contributor', 'subscriber'];
  const fieldsDisabled = !hasPro || !libraryInstalled;

  return (
    <>
      {!libraryInstalled && (
        <div style={formStyles.warningBox}>
          <p style={formStyles.warningText}>
            Amazon S3 library is not installed
          </p>
          <button
            onClick={handleInstallLibrary}
            disabled={!hasPro || installing}
            style={{
              ...formStyles.installButton,
              background: installing ? '#ccc' : '#3F6972',
              cursor: !hasPro || installing ? 'not-allowed' : 'pointer',
            }}
          >
            {installing ? 'Installing Library...' : 'Install Amazon S3 Library'}
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
          defaultValue={settings.title || 'Amazon S3'}
          disabled={fieldsDisabled}
          style={{ ...formStyles.input, maxWidth: '500px' }}
        />
        <p style={formStyles.description}>Enter a title which will be displayed on File Manager</p>
      </div>

      {/* App Key */}
      <div>
        <label htmlFor="app_key" style={formStyles.label}>
          App Key <span style={{ color: 'red' }}>*</span>
        </label>
        <input
          type="text"
          id="app_key"
          name="app_key"
          defaultValue={settings.app_key || ''}
          disabled={fieldsDisabled}
          style={{ ...formStyles.input, maxWidth: '500px' }}
        />
        <p style={formStyles.description}>
          Enter your Amazon S3 (AWS) App key.{' '}
          <a href="https://aws.amazon.com/s3/" target="_blank" rel="noopener noreferrer" style={formStyles.link}>
            Learn how to get your credentials
          </a>
        </p>
      </div>

      {/* App Secret */}
      <div>
        <label htmlFor="app_secret" style={formStyles.label}>
          App Secret <span style={{ color: 'red' }}>*</span>
        </label>
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
        <p style={formStyles.description}>
          Enter your Amazon S3 (AWS) App secret.{' '}
          <a href="https://aws.amazon.com/s3/" target="_blank" rel="noopener noreferrer" style={formStyles.link}>
            Learn how to get your credentials
          </a>
        </p>
      </div>

      {/* Region */}
      <div>
        <label htmlFor="region" style={formStyles.label}>
          Region <span style={{ color: 'red' }}>*</span>
        </label>
        <input
          type="text"
          id="region"
          name="region"
          defaultValue={settings.region || ''}
          placeholder="e.g. us-east-1"
          disabled={fieldsDisabled}
          style={{ ...formStyles.input, maxWidth: '500px' }}
        />
        <p style={formStyles.description}>Enter the AWS region where your bucket is located (e.g. us-east-1)</p>
      </div>

      {/* Bucket */}
      <div>
        <label htmlFor="bucket" style={formStyles.label}>
          Bucket <span style={{ color: 'red' }}>*</span>
        </label>
        <input
          type="text"
          id="bucket"
          name="bucket"
          defaultValue={settings.bucket || ''}
          disabled={fieldsDisabled}
          style={{ ...formStyles.input, maxWidth: '500px' }}
        />
        <p style={formStyles.description}>Enter the name of your Amazon S3 bucket</p>
      </div>

      {/* User Role Access */}
      <div>
        <label style={formStyles.label}>User Role Access</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {roles.map(role => {
            const roleId = `afm-s3-role-${role}`;
            return (
              <div key={role} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', width: 'max-content', maxWidth: '100%' }}>
                <input
                  id={roleId}
                  type="checkbox"
                  name="user_role_access"
                  value={role}
                  defaultChecked={settings.user_role_access && settings.user_role_access.includes(role)}
                  disabled={fieldsDisabled}
                  style={{ margin: 0 }}
                />
                <label
                  htmlFor={roleId}
                  style={{ margin: 0, textTransform: 'capitalize', fontSize: '14px', cursor: fieldsDisabled ? 'not-allowed' : 'pointer' }}
                >
                  {role}
                </label>
              </div>
            );
          })}
        </div>
        <p style={formStyles.description}>Select the user roles allowed to access the AWS-connected file manager</p>
      </div>

      {/* Private Folder Access */}
      <div>
        <label htmlFor="private_folder_access" style={formStyles.label}>Private Folder Access</label>
        <input
          type="text"
          id="private_folder_access"
          name="private_folder_access"
          defaultValue={settings.private_folder_access || ''}
          placeholder="e.g. awsfolder"
          disabled={fieldsDisabled}
          style={{ ...formStyles.input, maxWidth: '500px' }}
        />
        <p style={formStyles.description}>
          Enter a folder name to restrict access to that folder only. Leave blank to use the root directory (e.g. awsfolder)
        </p>
      </div>
    </>
  );
}

