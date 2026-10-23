import React, { useEffect, useState } from 'react';
import { getApiRoot } from '../utils/api';

export default function PlanAccessPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [content, setContent] = useState(null);

  const root = getApiRoot();
  const nonce = window.wpApiSettings?.nonce || window.afmReact?.nonce || '';

  useEffect(() => {
    // Fetch Plan Access content via REST API
    fetch(`${root}file-manager-advanced/v1/plan-access`, {
      credentials: 'same-origin',
      headers: { 'X-WP-Nonce': nonce }
    })
      .then(r => {
        if (!r.ok) {
          throw new Error('Failed to fetch Plan Access content');
        }
        return r.json();
      })
      .then(res => {
        if (res && res.content) {
          setContent(res.content);
          setLoading(false);
        } else {
          throw new Error('Invalid response from server');
        }
      })
      .catch(err => {
        console.error('Plan Access fetch error:', err);
        setError('Failed to load Plan Access content. Please try refreshing the page.');
        setLoading(false);
      });
  }, [root, nonce]);

  if (loading) {
    return (
      <div className="afm-tab-panel" style={{ 
        minHeight: '600px',
        padding: '20px'
      }}>
        <style>{`
          @keyframes afm-skeleton-shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          .afm-skeleton {
            background-color: #e2e8f0;
            background-image: linear-gradient(90deg, #e2e8f0 0%, #f1f5f9 50%, #e2e8f0 100%);
            background-size: 200% 100%;
            animation: afm-skeleton-shimmer 1.4s linear infinite;
          }
        `}</style>
        <div style={{ background: '#fff', border: '1px solid #ccc', padding: '20px' }}>
          <div className="afm-skeleton" style={{ height: '24px', width: '240px', borderRadius: '6px', marginBottom: '18px' }} />
          <div className="afm-skeleton" style={{ height: '220px', width: '100%', borderRadius: '6px', marginBottom: '14px' }} />
          <div className="afm-skeleton" style={{ height: '220px', width: '100%', borderRadius: '6px' }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="afm-tab-panel" style={{ 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '600px',
        padding: '40px'
      }}>
        <div style={{
          fontSize: '16px',
          color: '#dc3232',
          textAlign: 'center',
          background: '#fff',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          {error}
          <br />
          <a 
            href={`${window.location.origin}/wp-admin/admin.php?page=afmp-plan-features`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#0061FF', textDecoration: 'underline', marginTop: '10px', display: 'inline-block' }}
          >
            Open Plan Access in new tab
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="afm-tab-panel" style={{ 
      width: '100%',
      padding: '0',
      margin: '0'
    }}>
      <style>
        {`
          .plan-feature-heading {
            display: none !important;
          }
        `}
      </style>
      <div 
        dangerouslySetInnerHTML={{ __html: content }}
        style={{
          width: '100%',
          minHeight: '600px'
        }}
      />
    </div>
  );
}

