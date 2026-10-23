import React from 'react';

export default function DocumentationPanel() {
  return (
    <div className="afm-tab-panel">
      <div className="wrap" style={{ background: '#fff', padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a', marginBottom: '10px' }}>Documentation</h1>
        <p style={{ fontSize: '16px', color: '#666', marginBottom: '30px' }}>Everything you need to know about Advanced File Manager. Browse our guides and examples to get started.</p>
        
        {/* Documentation Preview Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '20px',
          marginBottom: '40px'
        }}>
          {/* Getting Started Card */}
          <div style={{
            background: '#fff',
            border: '1px solid #e5e5e5',
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            transition: 'box-shadow 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3F6972" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', margin: 0 }}>Getting Started</h3>
            </div>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px', fontWeight: 500 }}>2 Topics</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px 0' }}>
              <li style={{ fontSize: '14px', color: '#666', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#3F6972' }}>&gt;</span> Installation
              </li>
              <li style={{ fontSize: '14px', color: '#666', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#3F6972' }}>&gt;</span> Settings
              </li>
            </ul>
            <a
              href="https://advancedfilemanager.com/docs/getting-started/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '14px',
                color: '#3F6972',
                textDecoration: 'none',
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textDecoration = 'underline';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textDecoration = 'none';
              }}
            >
              View More
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </a>
          </div>

          {/* Shortcodes Card */}
          <div style={{
            background: '#fff',
            border: '1px solid #e5e5e5',
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            transition: 'box-shadow 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3F6972" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', margin: 0 }}>Shortcodes</h3>
            </div>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px', fontWeight: 500 }}>5 Topics</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px 0' }}>
              <li style={{ fontSize: '14px', color: '#666', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#3F6972' }}>&gt;</span> Logged In Users
              </li>
              <li style={{ fontSize: '14px', color: '#666', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#3F6972' }}>&gt;</span> Non Logged in Users
              </li>
              <li style={{ fontSize: '14px', color: '#666', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#3F6972' }}>&gt;</span> User Roles
              </li>
              <li style={{ fontSize: '14px', color: '#666', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#3F6972' }}>&gt;</span> Users
              </li>
              <li style={{ fontSize: '14px', color: '#666', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#3F6972' }}>&gt;</span> Multiple Shortcodes
              </li>
            </ul>
            <a
              href="https://advancedfilemanager.com/docs/shortcodes/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '14px',
                color: '#3F6972',
                textDecoration: 'none',
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textDecoration = 'underline';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textDecoration = 'none';
              }}
            >
              View More
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </a>
          </div>

          {/* Shortcode Parameters Card */}
          <div style={{
            background: '#fff',
            border: '1px solid #e5e5e5',
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            transition: 'box-shadow 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3F6972" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', margin: 0 }}>Shortcode Parameters</h3>
            </div>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px', fontWeight: 500 }}>4 Topics</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px 0' }}>
              <li style={{ fontSize: '14px', color: '#666', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#3F6972' }}>&gt;</span> List of Parameters
              </li>
              <li style={{ fontSize: '14px', color: '#666', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#3F6972' }}>&gt;</span> Themes
              </li>
              <li style={{ fontSize: '14px', color: '#666', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#3F6972' }}>&gt;</span> Languages
              </li>
              <li style={{ fontSize: '14px', color: '#666', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#3F6972' }}>&gt;</span> Operations
              </li>
            </ul>
            <a
              href="https://advancedfilemanager.com/docs/shortcode-parameters/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '14px',
                color: '#3F6972',
                textDecoration: 'none',
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textDecoration = 'underline';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textDecoration = 'none';
              }}
            >
              View More
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </a>
          </div>

          {/* Advanced Functionality Card */}
          <div style={{
            background: '#fff',
            border: '1px solid #e5e5e5',
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            transition: 'box-shadow 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3F6972" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', margin: 0 }}>Advanced Functionality</h3>
            </div>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px', fontWeight: 500 }}>4 Topics</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px 0' }}>
              <li style={{ fontSize: '14px', color: '#666', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#3F6972' }}>&gt;</span> Adminer (Data Manager)
              </li>
              <li style={{ fontSize: '14px', color: '#666', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#3F6972' }}>&gt;</span> Gutenberg Block Support
              </li>
              <li style={{ fontSize: '14px', color: '#666', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#3F6972' }}>&gt;</span> Email Notifications
              </li>
              <li style={{ fontSize: '14px', color: '#666', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#3F6972' }}>&gt;</span> Slack Notifications
              </li>
            </ul>
            <a
              href="https://advancedfilemanager.com/docs/advanced-functionality/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '14px',
                color: '#3F6972',
                textDecoration: 'none',
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textDecoration = 'underline';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textDecoration = 'none';
              }}
            >
              View More
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </a>
          </div>

          {/* Integrations Card */}
          <div style={{
            background: '#fff',
            border: '1px solid #e5e5e5',
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            transition: 'box-shadow 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3F6972" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', margin: 0 }}>Integrations</h3>
            </div>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px', fontWeight: 500 }}>8 Topics</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px 0' }}>
              <li style={{ fontSize: '14px', color: '#666', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#3F6972' }}>&gt;</span> Dropbox
              </li>
              <li style={{ fontSize: '14px', color: '#666', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#3F6972' }}>&gt;</span> Google Drive
              </li>
              <li style={{ fontSize: '14px', color: '#666', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#3F6972' }}>&gt;</span> OneDrive
              </li>
              <li style={{ fontSize: '14px', color: '#666', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#3F6972' }}>&gt;</span> Slack
              </li>
              <li style={{ fontSize: '14px', color: '#666', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#3F6972' }}>&gt;</span> Amazon S3
              </li>
            </ul>
            <a
              href="https://advancedfilemanager.com/docs/integrations/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '14px',
                color: '#3F6972',
                textDecoration: 'none',
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textDecoration = 'underline';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textDecoration = 'none';
              }}
            >
              View More
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </a>
          </div>
        </div>

        {/* Help Section */}
        <div style={{
          background: '#f0f7f9',
          borderRadius: '12px',
          padding: '32px',
          marginTop: '40px',
          display: 'flex',
          alignItems: 'center',
          gap: '24px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '8px',
            background: '#3F6972',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polyline>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>Need More Help?</h3>
            <p style={{ fontSize: '14px', color: '#666', margin: 0, lineHeight: '1.6' }}>Explore our complete documentation library for detailed guides, tutorials, and best practices.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
            <a
              href="https://advancedfilemanager.com/docs/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#3F6972',
                color: '#fff',
                padding: '12px 24px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 600,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#2d555e';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#3F6972';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
              View All Docs
            </a>
            <a
              href="https://objectsws.atlassian.net/servicedesk/customer/portal/37"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#f5f5f5',
                color: '#666',
                padding: '12px 24px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 600,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e5e5e5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f5f5f5';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              Get Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

