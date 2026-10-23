import React, { useState } from 'react';
import { formStyles } from './shared/IntegrationFormStyles';

/**
 * AI Code Assistent Integration Component
 */
export default function AICodeAssistent({ settings, hasPro, root, nonce, setMessage, onApiKeyValidated }) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingApiKey, setTestingApiKey] = useState(false);
  const [apiKeyTestResult, setApiKeyTestResult] = useState(null);

  const handleTestApiKey = async () => {
    const apiKeyInput = document.getElementById('gpt_api_key');
    const apiKey = apiKeyInput?.value || settings.gpt_api_key || '';

    if (!apiKey) {
      setApiKeyTestResult({ success: false, message: 'Please enter an API key first.' });
      return;
    }

    setTestingApiKey(true);
    setApiKeyTestResult(null);

    try {
      const response = await fetch(`${root}file-manager-advanced/v1/test-api-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': nonce
        },
        body: JSON.stringify({ api_key: apiKey })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setApiKeyTestResult({ success: true, message: 'API key is valid!' });
        onApiKeyValidated?.();
      } else {
        const errorMessage = data.message || data.data?.message || 'API key is invalid';
        setApiKeyTestResult({ success: false, message: errorMessage });
      }
    } catch (error) {
      console.error('Error testing API key:', error);
      setApiKeyTestResult({ success: false, message: 'Failed to test API key. Please try again.' });
    } finally {
      setTestingApiKey(false);
    }
  };

  return (
    <>
      {/* GPT API Key - input with eye inside, Test API Key on same line */}
      <div>
        <label htmlFor="gpt_api_key" style={formStyles.label}>
          GPT API Key <span style={{ color: 'red' }}>*</span>
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '560px' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
            <input
              type={showApiKey ? 'text' : 'password'}
              id="gpt_api_key"
              name="gpt_api_key"
              defaultValue={settings.gpt_api_key || ''}
              disabled={!hasPro}
              style={{
                ...formStyles.input,
                paddingRight: '42px',
                width: '100%'
              }}
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              disabled={!hasPro}
              style={{
                position: 'absolute',
                right: '6px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                padding: '6px',
                cursor: !hasPro ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: !hasPro ? 0.5 : 1,
                color: '#666'
              }}
              title={showApiKey ? 'Hide API Key' : 'Show API Key'}
            >
              {showApiKey ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          <button
            type="button"
            onClick={handleTestApiKey}
            disabled={!hasPro || testingApiKey}
            style={{
              flexShrink: 0,
              background: testingApiKey ? '#ccc' : '#3F6972',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              padding: '10px 16px',
              cursor: !hasPro || testingApiKey ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              opacity: !hasPro || testingApiKey ? 0.5 : 1
            }}
          >
            {testingApiKey ? 'Testing...' : 'Test API Key'}
          </button>
        </div>
        {apiKeyTestResult && (
          <p style={{
            ...formStyles.description,
            color: apiKeyTestResult.success ? '#28a745' : '#dc3545',
            marginTop: '8px',
            fontWeight: 500
          }}>
            {apiKeyTestResult.message}
          </p>
        )}
        <p style={formStyles.description}>
          Enter your OpenAI GPT API key. This key is stored only for your user account.{' '}
          <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" style={formStyles.link}>
            Click here to get your API key
          </a>
        </p>
      </div>
    </>
  );
}

