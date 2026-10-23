import React from 'react';
import { useIntegrationLibrary } from './shared/useIntegrationLibrary';
import { formStyles } from './shared/IntegrationFormStyles';

/**
 * Google Cloud Storage Integration Component
 */
export default function GoogleCloudStorage({ settings, hasPro, root, nonce, setMessage, selectedAuthKeyFile, setSelectedAuthKeyFile, onLibraryInstalled }) {
  const { libraryInstalled, setLibraryInstalled, installing, installLibrary } = useIntegrationLibrary(
    'google-cloud-storage',
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
          <p style={{ ...formStyles.warningText, marginBottom: '12px' }}>
            Google Cloud library is not installed. Please install the library first to configure authentication settings.
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
            {installing ? 'Installing Library...' : 'Install Google Cloud Library'}
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
          defaultValue={settings.title || 'Google Cloud Storage'}
          disabled={fieldsDisabled}
          style={{ ...formStyles.input, maxWidth: '500px' }}
        />
        <p style={formStyles.description}>Enter a title which will be displayed on File Manager</p>
      </div>

      {/* Authentication Key File */}
      <div>
        <label htmlFor="auth_key" style={formStyles.label}>
          Authentication Key File <span style={{ color: 'red' }}>*</span>
        </label>
        {settings.auth_key && settings.auth_key.trim() !== '' && (
          <div style={{ marginBottom: '12px', padding: '10px', background: '#f0f0f0', borderRadius: '4px', maxWidth: '500px' }}>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#333' }}>
              Current File: {settings.auth_key.split('/').pop()}
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
              Upload a new file to replace the current one
            </p>
          </div>
        )}
        <input
          type="file"
          id="auth_key"
          name="auth_key"
          accept=".json"
          disabled={fieldsDisabled}
          style={{ ...formStyles.input, maxWidth: '500px' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setSelectedAuthKeyFile(file);
            } else {
              setSelectedAuthKeyFile(null);
            }
          }}
        />
        <p style={formStyles.description}>Upload your Google Cloud service account key file (.json format)</p>
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
        <p style={formStyles.description}>Enter the name of your Google Cloud Storage bucket</p>
      </div>

      {/* User Role Access */}
      <div>
        <label style={formStyles.label}>User Role Access</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {roles.map(role => {
            const roleId = `afm-gcs-role-${role}`;
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
        <p style={formStyles.description}>Select the user roles allowed to access the Google Cloud file manager</p>
      </div>

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
          Enter a subfolder path within your bucket. Leave blank to use the root directory
        </p>
        <p style={{ ...formStyles.description, color: 'red', marginTop: '4px' }}>
          <strong>Note: </strong>Folder paths and user role values are case-sensitive
        </p>
      </div>
    </>
  );
}

