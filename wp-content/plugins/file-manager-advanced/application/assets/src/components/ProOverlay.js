import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Reusable PRO Overlay Component (Figma 825:3775).
 * - With waitForContentReady: overlay shows only after child calls onContentReady(true).
 * - Without: overlay shows after content has height (ResizeObserver).
 * - Close control intentionally omitted — overlay stays until Pro unlocks the feature.
 */
export default function ProOverlay({ children, shouldShow, waitForContentReady = false }) {
  const pricingUrl = window.afmReact?.pricingUrl || 'https://advancedfilemanager.com/pricing/';
  const pluginUrl = window.afmReact?.pluginUrl || window.afm_object?.plugin_url || '/wp-content/plugins/file-manager-advanced/';
  const shellImg = `${pluginUrl}application/assets/images/shell/`;

  const [showOverlay, setShowOverlay] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    if (!shouldShow) {
      setShowOverlay(false);
      setContentReady(false);
      return;
    }
    if (waitForContentReady) {
      setShowOverlay(false);
      return;
    }
    const el = contentRef.current;
    if (!el) return;

    let rafId = null;
    const tryShow = () => {
      const height = el.offsetHeight || el.scrollHeight;
      if (height < 20) return;
      rafId = requestAnimationFrame(() => {
        requestAnimationFrame(() => setShowOverlay(true));
      });
    };

    const observer = new ResizeObserver(tryShow);
    observer.observe(el);
    tryShow();

    return () => {
      observer.disconnect();
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [shouldShow, waitForContentReady]);

  useEffect(() => {
    if (shouldShow && waitForContentReady && contentReady) {
      const rafId = requestAnimationFrame(() => {
        requestAnimationFrame(() => setShowOverlay(true));
      });
      return () => cancelAnimationFrame(rafId);
    }
    if (!contentReady) setShowOverlay(false);
  }, [shouldShow, waitForContentReady, contentReady]);

  const onContentReady = useCallback(() => setContentReady(true), []);

  if (!shouldShow) {
    return <>{children}</>;
  }

  const child = waitForContentReady && React.Children.only(children)
    ? React.cloneElement(children, { onContentReady })
    : children;

  return (
    <div className="afm-pro-overlay-root">
      {showOverlay && (
        <div className="afm-pro-overlay" role="presentation">
          <div className="afm-pro-popup" role="dialog" aria-modal="true" aria-labelledby="afm-pro-popup-title">
            <div className="afm-pro-popup__logo">
              <img
                src={`${shellImg}pro-popup-logo.svg`}
                alt="Advanced File Manager"
                width="239"
                height="58"
              />
            </div>

            <p id="afm-pro-popup-title" className="afm-pro-popup__desc">
              Get advanced features with Advanced File Manager Pro!
            </p>

            <a
              className="afm-pro-popup__cta"
              href={pricingUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src={`${shellImg}pro-popup-crown.svg`}
                alt=""
                width="18"
                height="15"
              />
              <span>Upgrade Now</span>
            </a>
          </div>
        </div>
      )}

      <div
        ref={contentRef}
        className={`afm-pro-overlay-content${showOverlay ? ' is-locked' : ''}`}
      >
        {child}
      </div>
    </div>
  );
}
