import React, { useState, useEffect } from 'react';
import { useIntegrationLibrary } from './shared/useIntegrationLibrary';
import { formStyles } from './shared/IntegrationFormStyles';

const WASABI_REGIONS = [
  { value: 'us-east-1', label: 'US East 1 (N. Virginia)' },
  { value: 'us-east-2', label: 'US East 2 (N. Virginia)' },
  { value: 'us-central-1', label: 'US Central 1 (Texas)' },
  { value: 'us-west-1', label: 'US West 1 (Oregon)' },
  { value: 'us-west-2', label: 'US West 2 (San Jose)' },
  { value: 'ca-central-1', label: 'CA Central 1 (Toronto)' },
  { value: 'eu-central-1', label: 'EU Central 1 (Amsterdam)' },
  { value: 'eu-central-2', label: 'EU Central 2 (Frankfurt)' },
  { value: 'eu-west-1', label: 'EU West 1 (United Kingdom)' },
  { value: 'eu-west-2', label: 'EU West 2 (Paris)' },
  { value: 'eu-west-3', label: 'EU West 3 (United Kingdom)' },
  { value: 'eu-south-1', label: 'EU South 1 (Milan)' },
  { value: 'ap-northeast-1', label: 'AP Northeast 1 (Tokyo)' },
  { value: 'ap-northeast-2', label: 'AP Northeast 2 (Osaka)' },
  { value: 'ap-southeast-1', label: 'AP Southeast 1 (Singapore)' },
  { value: 'ap-southeast-2', label: 'AP Southeast 2 (Sydney)' },
];

function endpointForRegion(region) {
  const r = (region || '').trim();
  if (!r) return '';
  return `https://s3.${r}.wasabisys.com`;
}

export default function Wasabi({ settings, hasPro, root, nonce, setMessage, onLibraryInstalled }) {
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [region, setRegion] = useState(settings.region || 'us-east-1');
  const [endpoint, setEndpoint] = useState(settings.endpoint || endpointForRegion(settings.region || 'us-east-1'));

  const { libraryInstalled, setLibraryInstalled, installing, installLibrary } = useIntegrationLibrary(
    'wasabi',
    root,
    nonce,
    hasPro
  );

  useEffect(() => {
    if (settings.library_installed !== undefined) {
      setLibraryInstalled(settings.library_installed);
    }
  }, [settings.library_installed, setLibraryInstalled]);

  useEffect(() => {
    const r = settings.region || 'us-east-1';
    setRegion(r);
    setEndpoint(settings.endpoint || endpointForRegion(r));
  }, [settings.region, settings.endpoint]);

  const handleInstallLibrary = async () => {
    const result = await installLibrary();
    if (result.success) {
      setLibraryInstalled(true);
      setMessage({ type: 'success', text: result.message });
      setTimeout(() => setMessage(null), 3000);
      if (onLibraryInstalled) {
        onLibraryInstalled();
      }
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
            Wasabi uses the same S3 SDK library as Amazon S3 / R2. Install the library to continue.
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
            {installing ? 'Installing Library...' : 'Install Wasabi Library'}
          </button>
        </div>
      )}

      <div>
        <label htmlFor="title" style={formStyles.label}>Alias</label>
        <input
          type="text"
          id="title"
          name="title"
          defaultValue={settings.title || settings.alias || 'Wasabi'}
          disabled={fieldsDisabled}
          style={{ ...formStyles.input, maxWidth: '500px' }}
        />
        <p style={formStyles.description}>Enter a title which will be displayed on File Manager</p>
      </div>

      <div>
        <label htmlFor="access_key" style={formStyles.label}>Access Key <span style={{ color: 'red' }}>*</span></label>
        <input
          type="text"
          id="access_key"
          name="access_key"
          defaultValue={settings.access_key || ''}
          disabled={fieldsDisabled}
          style={{ ...formStyles.input, maxWidth: '500px' }}
        />
        <p style={formStyles.description}>
          Wasabi access key.{' '}
          <a href="https://console.wasabisys.com/" target="_blank" rel="noopener noreferrer" style={formStyles.link}>
            Wasabi console
          </a>
        </p>
      </div>

      <div>
        <label htmlFor="secret_key" style={formStyles.label}>Secret Key <span style={{ color: 'red' }}>*</span></label>
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
              color: '#666',
              opacity: fieldsDisabled ? 0.5 : 1,
            }}
            title={showSecretKey ? 'Hide secret' : 'Show secret'}
          >
            {showSecretKey ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="wasabi_region_select" style={formStyles.label}>Region <span style={{ color: 'red' }}>*</span></label>
        <select
          id="region"
          name="region"
          value={region}
          disabled={fieldsDisabled}
          onChange={(e) => {
            const v = e.target.value;
            setRegion(v);
            setEndpoint(endpointForRegion(v));
          }}
          style={{ ...formStyles.input, maxWidth: '500px' }}
        >
          {WASABI_REGIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <p style={formStyles.description}>Region where your bucket lives</p>
      </div>

      <div>
        <label htmlFor="endpoint" style={formStyles.label}>Endpoint <span style={{ color: 'red' }}>*</span></label>
        <input
          type="url"
          id="endpoint"
          name="endpoint"
          value={endpoint}
          readOnly
          disabled={fieldsDisabled}
          style={{ ...formStyles.input, maxWidth: '500px', background: '#f5f5f5' }}
        />
        <p style={formStyles.description}>Auto-generated from region (S3 path-style)</p>
      </div>

      <div>
        <label htmlFor="bucket" style={formStyles.label}>Bucket <span style={{ color: 'red' }}>*</span></label>
        <input
          type="text"
          id="bucket"
          name="bucket"
          defaultValue={settings.bucket || ''}
          disabled={fieldsDisabled}
          style={{ ...formStyles.input, maxWidth: '500px' }}
        />
      </div>

      <div>
        <label style={formStyles.label}>User Role Access</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {roles.map((role) => {
            const roleId = `afm-wasabi-role-${role}`;
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
          placeholder="Optional subfolder prefix"
        />
      </div>
    </>
  );
}
