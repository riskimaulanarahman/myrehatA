/**
 * Copy text to clipboard with fallback for non-secure (HTTP) contexts.
 *
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export async function copyTextWithFallback(text) {
  const value = String(text || '');
  if (!value) {
    return false;
  }

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch (err) {
    // Fall through to execCommand fallback.
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = value;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, value.length);
    const copied = document.execCommand('copy');
    document.body.removeChild(textArea);
    return copied;
  } catch (err) {
    return false;
  }
}

/**
 * Copy text and show success/error via setMessage callback.
 *
 * @param {string} text
 * @param {Function|null} setMessage
 * @param {string} successMessage
 * @returns {Promise<boolean>}
 */
export async function copyWithMessage(text, setMessage, successMessage = 'Copied to clipboard!') {
  const copied = await copyTextWithFallback(text);
  if (!setMessage) {
    return copied;
  }

  if (copied) {
    setMessage({ type: 'success', text: successMessage });
    setTimeout(() => setMessage(null), 2000);
  } else {
    setMessage({ type: 'error', text: 'Failed to copy to clipboard' });
    setTimeout(() => setMessage(null), 3000);
  }

  return copied;
}
