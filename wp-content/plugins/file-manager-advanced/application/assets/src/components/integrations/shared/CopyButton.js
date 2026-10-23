import React from 'react';
import { copyWithMessage } from '../../../utils/clipboard';

const buttonStyle = (disabled) => ({
  background: 'transparent',
  border: '1px solid #ddd',
  borderRadius: '4px',
  padding: '10px 12px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  opacity: disabled ? 0.5 : 1,
});

/**
 * Copy-to-clipboard button for integration read-only fields.
 */
export function CopyButton({
  text,
  disabled = false,
  setMessage,
  successMessage = 'Copied to clipboard!',
  title = 'Copy to clipboard',
}) {
  const handleCopy = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) {
      return;
    }
    await copyWithMessage(text, setMessage, successMessage);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={disabled}
      style={buttonStyle(disabled)}
      title={title}
      aria-label={title}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="#666" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="#666" />
      </svg>
    </button>
  );
}
