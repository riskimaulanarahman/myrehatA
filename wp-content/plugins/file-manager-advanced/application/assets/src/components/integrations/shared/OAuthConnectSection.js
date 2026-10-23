import React from 'react';
import { formStyles } from './IntegrationFormStyles';

/**
 * Shared Connect / Disconnect section for OAuth integrations (OneDrive-style flow).
 */
export function OAuthConnectSection({
  serviceName,
  isConnected,
  canConnect,
  hasPro = true,
  onConnect,
  onDisconnect,
  brandColor = '#3F6972',
  credentialsHint = 'Please enter your credentials, then save changes before connecting.',
  showCredentialsHint = true,
}) {
  if (isConnected) {
    return (
      <div style={{ marginTop: '20px' }}>
        <div style={{ padding: '15px', background: '#d4edda', border: '1px solid #c3e6cb', borderRadius: '4px', maxWidth: '500px' }}>
          <p style={{ margin: '0 0 10px 0', color: '#155724', fontWeight: 600 }}>
            ✓ Connected to {serviceName}
          </p>
          <button
            type="button"
            onClick={onDisconnect}
            style={{
              padding: '8px 16px',
              background: '#dc3545',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Disconnect {serviceName}
          </button>
        </div>
      </div>
    );
  }

  const connectEnabled = hasPro && canConnect;

  return (
    <div style={{ marginTop: '20px' }}>
      <button
        type="button"
        onClick={onConnect}
        disabled={!connectEnabled}
        style={{
          ...formStyles.installButton,
          background: connectEnabled ? brandColor : '#ccc',
          cursor: connectEnabled ? 'pointer' : 'not-allowed',
        }}
      >
        Connect {serviceName}
      </button>
      {showCredentialsHint && !canConnect && (
        <p style={{ ...formStyles.description, marginTop: '10px', color: '#64748b', maxWidth: '500px' }}>
          {credentialsHint}
        </p>
      )}
    </div>
  );
}
