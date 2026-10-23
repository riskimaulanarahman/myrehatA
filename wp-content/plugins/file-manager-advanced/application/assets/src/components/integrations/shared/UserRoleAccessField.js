import React from 'react';
import { formStyles } from './IntegrationFormStyles';

const ROLES = ['editor', 'author', 'contributor', 'subscriber'];

/**
 * User Role Access checkboxes for integration settings forms.
 */
export default function UserRoleAccessField({ settings = {}, disabled = false, description }) {
  const selected = Array.isArray(settings.user_role_access) ? settings.user_role_access : [];

  return (
    <div>
      <label style={formStyles.label}>User Role Access</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {ROLES.map((role) => {
          const roleId = `afm-user-role-${role}`;
          return (
            <div
              key={role}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                width: 'max-content',
                maxWidth: '100%',
              }}
            >
              <input
                id={roleId}
                type="checkbox"
                name="user_role_access"
                value={role}
                defaultChecked={selected.includes(role)}
                disabled={disabled}
                style={{ margin: 0 }}
              />
              <label
                htmlFor={roleId}
                style={{
                  margin: 0,
                  textTransform: 'capitalize',
                  fontSize: '14px',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                }}
              >
                {role}
              </label>
            </div>
          );
        })}
      </div>
      {description ? <p style={formStyles.description}>{description}</p> : null}
    </div>
  );
}
