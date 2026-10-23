import React, { useState } from 'react';
import { buildRestUrl } from '../utils/api';

const FEATURES = [
  'Multiple Cloud Integrations.',
  'Frontend access.',
  'Built-in database access.',
  'Role-based access control.',
  'Private folder access.',
  'Hide sensitive files & folders.',
  'Advanced themes selection.',
  'Multilingual support.',
  'Operation controls for users.',
];

function getShellAsset(filename) {
  const base =
    (window.afmReact?.pluginUrl ||
      window.afm_object?.plugin_url ||
      '/wp-content/plugins/file-manager-advanced/') +
    'application/assets/images/shell/';
  return base + filename;
}

function getPricingUrl() {
  return (
    window.afmReact?.fmPricingUrl ||
    window.afmReact?.pricingUrl ||
    'https://advancedfilemanager.com/pricing/?utm_source=plugin&utm_medium=file_manager_screen_side_banner&utm_campaign=plugin'
  );
}

/**
 * Free-only Pro upsell sidebar for the File Manager tab (Figma 733:4609).
 */
export default function ProSideBanner({ onHidden }) {
  const [hiding, setHiding] = useState(false);

  const hideBanner = async (e) => {
    e.preventDefault();
    if (hiding) return;
    setHiding(true);

    try {
      const nonce = window.wpApiSettings?.nonce || window.afmReact?.nonce || '';
      await fetch(buildRestUrl('file-manager-advanced/v1/hide-banner'), {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': nonce,
        },
        body: '{}',
      });
    } catch (err) {
      // Still hide locally so the UI matches user intent.
      console.error('Failed to hide banner:', err);
    }

    if (typeof onHidden === 'function') {
      onHidden();
    }
  };

  return (
    <aside className="afm-fm-pro-banner" aria-label="Advanced File Manager Pro">
      <div className="afm-fm-pro-banner__inner">
        <div className="afm-fm-pro-banner__body">
          <h2 className="afm-fm-pro-banner__title">
            Simplify file management with more advanced features!
          </h2>
          <ul className="afm-fm-pro-banner__features">
            {FEATURES.map((label) => (
              <li key={label} className="afm-fm-pro-banner__feature">
                <img
                  src={getShellAsset('icon-thumb.svg')}
                  alt=""
                  width={16}
                  height={13}
                />
                <span>{label}</span>
              </li>
            ))}
          </ul>
          <div className="afm-fm-pro-banner__actions">
            <a
              className="afm-fm-pro-banner__cta"
              href={getPricingUrl()}
              target="_blank"
              rel="noopener noreferrer"
            >
              Upgrade Now
            </a>
            <button
              type="button"
              className="afm-fm-pro-banner__hide"
              onClick={hideBanner}
              disabled={hiding}
            >
              Hide Banner
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
