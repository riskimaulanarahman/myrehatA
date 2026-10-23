import React, { useState, useEffect, useCallback } from 'react';
import { getApiRoot, buildRestUrl } from '../utils/api';
import ProOverlay from './ProOverlay';

const STORAGE_REFRESH_KEY = 'afm_storage_usage_v3';

const DONUT_COLORS = {
  video: '#E17351',
  images: '#FBBC04',
  documents: '#3F6972',
  code: '#A9E5BB',
  other: '#CED4DA'
};

function getDashboardAsset(filename) {
  const base = (window.afmReact?.pluginUrl || window.afm_object?.plugin_url || '/wp-content/plugins/file-manager-advanced/') + 'application/assets/images/dashboard/';
  return base + filename;
}

function getShellAsset(filename) {
  const base = (window.afmReact?.pluginUrl || window.afm_object?.plugin_url || '/wp-content/plugins/file-manager-advanced/') + 'application/assets/images/shell/';
  return base + filename;
}

function formatLogDateTime(val) {
  if (!val) return '—';
  const s = String(val);
  const num = Number(s);
  let date = null;
  if (!isNaN(num) && s.trim() !== '') {
    const timestamp = s.length <= 10 ? num * 1000 : num;
    date = new Date(timestamp);
  } else {
    date = new Date(s);
  }
  if (!date || isNaN(date.getTime())) return s;
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} ${hours}:${minutes}${ampm}`;
}

export default function Dashboard() {
  const hasPro = window.afmReact?.hasPro || false;
  const currentPlan = window.afmReact?.currentPlan || 'free';
  const pricingUrl = window.afmReact?.pricingUrl || 'https://advancedfilemanager.com/pricing/';
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [integrationsLoading, setIntegrationsLoading] = useState(true);
  const [pluginSettingsLoading, setPluginSettingsLoading] = useState(true);
  const [data, setData] = useState({
    roles: window.afmReact?.roles || {},
    storage: null,
    logs: [],
    integrations: {},
    pluginSettings: null
  });
  const [viewLog, setViewLog] = useState(null);
  const [hoveredSegment, setHoveredSegment] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [copiedId, setCopiedId] = useState(null);

  const copyTextWithFallback = async (text) => {
    const value = String(text || '');
    if (!value) return false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch (err) { }

    try {
      const textArea = document.createElement('textarea');
      textArea.value = value;
      textArea.setAttribute('readonly', '');
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textArea);
      return copied;
    } catch (err) {
      return false;
    }
  };

  const getApiConfig = () => {
    const root = getApiRoot();
    const nonce = window.wpApiSettings?.nonce || window.afmReact?.nonce || '';
    return { root, nonce };
  };

  const fetchStorage = useCallback((forceRefresh = false) => {
    const { root, nonce } = getApiConfig();
    if (!root || !nonce) {
      setLoading(false);
      return;
    }

    if (forceRefresh) {
      sessionStorage.removeItem(STORAGE_REFRESH_KEY);
    }

    const shouldRefresh = forceRefresh || !sessionStorage.getItem(STORAGE_REFRESH_KEY);
    const url = buildRestUrl('file-manager-advanced/v1/storage-usage', shouldRefresh ? { refresh: '1' } : {});
    setLoading(true);
    fetch(url, {
      method: 'GET',
      credentials: 'same-origin',
      headers: { 'X-WP-Nonce': nonce }
    })
      .then(r => r.ok ? r.json() : Promise.reject({ status: r.status }))
      .then(res => {
        if (res && res.breakdown) {
          sessionStorage.setItem(STORAGE_REFRESH_KEY, '1');
          setData(prev => ({ ...prev, storage: res }));
        } else {
          setData(prev => ({ ...prev, storage: null }));
        }
        setLoading(false);
      })
      .catch(() => {
        setData(prev => ({ ...prev, storage: null }));
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchStorage(false);
  }, [fetchStorage]);

  // Fetch activity logs only when Pro is active (Free uses upgrade banner)
  useEffect(() => {
    if (!hasPro) {
      setLogsLoading(false);
      return;
    }

    const { root, nonce } = getApiConfig();
    if (!root || !nonce) {
      setLogsLoading(false);
      return;
    }

    setTimeout(() => {
      fetch(buildRestUrl('file-manager-advanced/v1/activity-logs'), {
        credentials: 'same-origin',
        headers: { 'X-WP-Nonce': nonce },
        method: 'GET'
      })
        .then(r => r.ok ? r.json() : { logs: [] })
        .then(res => {
          const logs = res?.logs || res?.data?.logs || [];
          setData(prev => ({ ...prev, logs }));
          setLogsLoading(false);
        })
        .catch(() => {
          setData(prev => ({ ...prev, logs: [] }));
          setLogsLoading(false);
        });
    }, 100);
  }, [hasPro]);

  // Fetch integrations only when Pro is active
  useEffect(() => {
    if (!hasPro) {
      setIntegrationsLoading(false);
      return;
    }

    const { root, nonce } = getApiConfig();
    if (!root || !nonce) {
      setIntegrationsLoading(false);
      return;
    }

    setTimeout(() => {
      fetch(`${root}file-manager-advanced/v1/integrations-status`, {
        credentials: 'same-origin',
        headers: { 'X-WP-Nonce': nonce },
        method: 'GET'
      })
        .then(r => r.ok ? r.json() : { connected: {} })
        .then(res => {
          const connected = res?.connected || res?.data?.connected || {};
          setData(prev => ({ ...prev, integrations: connected }));
          setIntegrationsLoading(false);
        })
        .catch(() => {
          setData(prev => ({ ...prev, integrations: {} }));
          setIntegrationsLoading(false);
        });
    }, 150);
  }, [hasPro]);

  useEffect(() => {
    const { root, nonce } = getApiConfig();
    if (!root || !nonce) {
      setPluginSettingsLoading(false);
      return;
    }

    setTimeout(() => {
      fetch(`${root}file-manager-advanced/v1/plugin-settings`, {
        credentials: 'same-origin',
        headers: { 'X-WP-Nonce': nonce },
        method: 'GET'
      })
        .then(r => r.ok ? r.json() : null)
        .then(res => {
          setData(prev => ({ ...prev, pluginSettings: res }));
          setPluginSettingsLoading(false);
        })
        .catch(() => {
          setData(prev => ({ ...prev, pluginSettings: null }));
          setPluginSettingsLoading(false);
        });
    }, 200);
  }, []);

  const formatBytes = (b) => {
    if (!b) return '0 B';
    const u = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(b) / Math.log(1024));
    return (b / Math.pow(1024, i)).toFixed(2) + ' ' + u[i];
  };

  const st = data.storage;
  let legend = [];
  let donutStyle = {};
  let unusedPct = 0;
  let segments = [];

  if (st && st.breakdown) {
    const b = st.breakdown;
    const total = Math.max(1, (b.video?.bytes || 0) + (b.images?.bytes || 0) + (b.documents?.bytes || 0) + (b.code?.bytes || 0) + (b.other?.bytes || 0));
    const pct = (v) => (v / total * 100);
    const p1 = pct(b.video?.bytes || 0);
    const p2 = p1 + pct(b.images?.bytes || 0);
    const p3 = p2 + pct(b.documents?.bytes || 0);
    const p4 = p3 + pct(b.code?.bytes || 0);
    donutStyle = {
      background: `conic-gradient(${DONUT_COLORS.video} 0 ${p1}%, ${DONUT_COLORS.images} ${p1}% ${p2}%, ${DONUT_COLORS.documents} ${p2}% ${p3}%, ${DONUT_COLORS.code} ${p3}% ${p4}%, ${DONUT_COLORS.other} ${p4}% 100%)`
    };
    legend = [
      { color: DONUT_COLORS.video, label: 'Video', bytes: b.video?.bytes, files: b.video?.files },
      { color: DONUT_COLORS.images, label: 'Images', bytes: b.images?.bytes, files: b.images?.files },
      { color: DONUT_COLORS.documents, label: 'Documents', bytes: b.documents?.bytes, files: b.documents?.files },
      { color: DONUT_COLORS.code, label: 'Code', bytes: b.code?.bytes, files: b.code?.files },
      { color: DONUT_COLORS.other, label: 'Other', bytes: b.other?.bytes, files: b.other?.files }
    ];
    segments = [
      { color: DONUT_COLORS.video, label: 'Video', bytes: b.video?.bytes || 0, files: b.video?.files || 0, start: 0, end: p1 },
      { color: DONUT_COLORS.images, label: 'Images', bytes: b.images?.bytes || 0, files: b.images?.files || 0, start: p1, end: p2 },
      { color: DONUT_COLORS.documents, label: 'Documents', bytes: b.documents?.bytes || 0, files: b.documents?.files || 0, start: p2, end: p3 },
      { color: DONUT_COLORS.code, label: 'Code', bytes: b.code?.bytes || 0, files: b.code?.files || 0, start: p3, end: p4 },
      { color: DONUT_COLORS.other, label: 'Other', bytes: b.other?.bytes || 0, files: b.other?.files || 0, start: p4, end: 100 }
    ];
    if (st.fs && st.fs.total > 0) {
      unusedPct = Math.max(0, Math.round((st.fs.free / st.fs.total) * 100));
    } else {
      unusedPct = Math.max(0, Math.round(100 - p4));
    }
  }

  const handleDonutMouseMove = (e) => {
    if (!st || !st.breakdown || segments.length === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;

    const distance = Math.sqrt(mouseX * mouseX + mouseY * mouseY);
    const radius = rect.width / 2;
    const innerRadius = radius * 0.32;

    if (distance < innerRadius || distance > radius) {
      setHoveredSegment(null);
      return;
    }

    let angle = Math.atan2(mouseY, mouseX) * (180 / Math.PI);
    angle = (angle + 90 + 360) % 360;
    const anglePercent = (angle / 360) * 100;

    const segment = segments.find(s => {
      if (s.start === 0 && s.end === 0) return false;
      if (s.start > s.end) {
        return anglePercent >= s.start || anglePercent < s.end;
      }
      return anglePercent >= s.start && anglePercent < s.end;
    });

    if (segment && (segment.bytes > 0 || segment.files > 0)) {
      setHoveredSegment(segment);
      setTooltipPosition({ x: e.clientX, y: e.clientY });
    } else {
      setHoveredSegment(null);
    }
  };

  const handleDonutMouseLeave = () => {
    setHoveredSegment(null);
  };

  const handleStorageRefresh = (e) => {
    e.preventDefault();
    if (loading) return;
    fetchStorage(true);
  };

  const proFeatures = [
    ['DB Adminer Database Support', 'AI CodePilot'],
    ['Front-end Block Support', '5+ Cloud Storage Integrations'],
    ['Notifications', 'And More Pro Features']
  ];

  return (
    <div className="afm-dashboard">
      {/* Storage Usage Card */}
      <div className="afm-card">
        <div className="afm-card__header">
          Storage Usage
          <button
            type="button"
            className="afm-storage-refresh"
            onClick={handleStorageRefresh}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
        <div className="afm-card__body afm-storage-flex">
          {loading ? (
            <>
              <div className="afm-storage-stats">
                <div className="afm-storage-stats__head">
                  <div className="afm-skeleton afm-skeleton--label" />
                  <div className="afm-skeleton afm-skeleton--total" />
                </div>
                <div className="afm-donut-legend afm-donut-legend--skeleton">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="afm-legend-skeleton-row">
                      <div className="afm-skeleton afm-skeleton--dot" />
                      <div className="afm-skeleton afm-skeleton--legend-label" />
                      <div className="afm-skeleton afm-skeleton--legend-value" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="afm-donut-container afm-donut-container--skeleton" aria-hidden="true">
                <div className="afm-skeleton afm-skeleton--donut" />
              </div>
            </>
          ) : (
            <>
              <div className="afm-storage-stats">
                <div className="afm-storage-stats__label">Total Local Bytes / Files</div>
                <div className="afm-storage-stats__total">
                  {st ? formatBytes(st.total?.bytes || 0) : '—'}
                  {' '}
                  {st && (
                    <span className="afm-storage-stats__files">
                      / {st.total?.files ? st.total.files.toLocaleString() : '0'}
                    </span>
                  )}
                </div>
                <div className="afm-donut-legend">
                  {legend.map((item, i) => [
                    <span key={`dot-${i}`} className="afm-dot" style={{ background: item.color }} />,
                    <span key={`label-${i}`}>{item.label}</span>,
                    <span key={`value-${i}`}>{st ? (formatBytes(item.bytes || 0) + ' / ' + (item.files || 0)) : '—'}</span>
                  ])}
                </div>
              </div>
              <div
                className="afm-donut-container"
                onMouseMove={handleDonutMouseMove}
                onMouseLeave={handleDonutMouseLeave}
              >
                <div
                  className="afm-donut"
                  style={{ ...donutStyle, pointerEvents: 'none' }}
                />
                <div className="afm-donut-center">
                  {unusedPct}%
                  <div className="afm-donut-center__sub">Unused</div>
                </div>
                {hoveredSegment && (
                  <div
                    className="afm-donut-tooltip"
                    style={{
                      left: `${tooltipPosition.x + 10}px`,
                      top: `${tooltipPosition.y - 10}px`
                    }}
                  >
                    <div className="afm-donut-tooltip__title">
                      <div className="afm-dot" style={{ background: hoveredSegment.color }} />
                      <div>{hoveredSegment.label}</div>
                    </div>
                    <div className="afm-donut-tooltip__body">
                      <div>Size: {formatBytes(hoveredSegment.bytes)}</div>
                      <div>Files: {hoveredSegment.files.toLocaleString()}</div>
                      <div className="afm-donut-tooltip__pct">
                        {(hoveredSegment.end - hoveredSegment.start).toFixed(1)}% of storage
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Plugin Settings Card */}
      <div className="afm-card afm-plugin-settings">
        <div className="afm-card__header">Plugin Settings & Quick Access</div>
        <div className="afm-card__body">
          {pluginSettingsLoading ? (
            <div className="afm-plugin-settings-skeleton">
              <div className="afm-plugin-info-section">
                <div className="afm-skeleton afm-skeleton--section-title" />
                <div className="afm-plugin-info-list">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="afm-plugin-info-row afm-plugin-info-row--skeleton">
                      <div className="afm-skeleton afm-skeleton--info-label" />
                      <div className="afm-skeleton afm-skeleton--info-value" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="afm-quick-actions-section">
                <div className="afm-skeleton afm-skeleton--section-title" />
                <div className="afm-quick-actions-grid">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="afm-skeleton afm-skeleton--action" />
                  ))}
                </div>
              </div>
            </div>
          ) : (() => {
            const ps = data.pluginSettings || {};
            return (
              <div>
                <div className="afm-plugin-info-section">
                  <div className="afm-section-title">Plugin Information</div>
                  <div className="afm-plugin-info-list">
                    <div className="afm-plugin-info-row">
                      <span className="afm-plugin-info-row__label">Theme:</span>
                      <span className="afm-plugin-info-row__value">{ps.theme_display || '—'}</span>
                    </div>
                    <div className="afm-plugin-info-row">
                      <span className="afm-plugin-info-row__label">Root Directory:</span>
                      <span className="afm-plugin-info-row__value afm-plugin-info-row__value--path" title={ps.root_directory || ''}>
                        {ps.root_directory || '—'}
                      </span>
                    </div>
                    <div className="afm-plugin-info-row">
                      <span className="afm-plugin-info-row__label">Who Can Access:</span>
                      <span className="afm-plugin-info-row__value">
                        {ps.allowed_roles_display && ps.allowed_roles_display.length ? ps.allowed_roles_display.join(', ') : 'Administrator'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="afm-quick-actions-section">
                  <div className="afm-section-title">Quick Actions</div>
                  <div className="afm-quick-actions-grid">
                    <a
                      href="#/filemanager"
                      className="afm-quick-action-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        window.location.hash = '#/filemanager';
                      }}
                    >
                      Open File Manager
                    </a>
                    <a
                      href="#/settings/general-settings"
                      className="afm-quick-action-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        sessionStorage.setItem('afm-settings-hash-just-set', 'true');
                        sessionStorage.setItem('afm-settings-subtab', 'general-settings');
                        window.location.hash = '#/settings/general-settings';
                        setTimeout(() => {
                          sessionStorage.removeItem('afm-settings-hash-just-set');
                        }, 2000);
                      }}
                    >
                      Configure Settings
                    </a>
                    <a
                      href={(window.afmReact && window.afmReact.docsUrl) || 'https://advancedfilemanager.com/documentation/'}
                      className="afm-quick-action-btn"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Documentation
                    </a>
                    <a
                      href={(window.afmReact && window.afmReact.supportUrl) || 'https://objectsws.atlassian.net/servicedesk/customer/portal/37'}
                      className="afm-quick-action-btn"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Get Support
                    </a>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Free: Unlock AFM Pro banner */}
      {!hasPro && (
        <div className="afm-card afm-pro-upgrade-banner">
          <div className="afm-pro-upgrade-banner__inner">
            <div className="afm-pro-upgrade-banner__content">
              <div className="afm-pro-upgrade-banner__badge">
                <img src={getDashboardAsset('bolt.svg')} alt="" width={10} height={13} />
                <span>Unlock AFM Pro</span>
              </div>
              <h2 className="afm-pro-upgrade-banner__title">
                Take Complete Control of Your WordPress Files
              </h2>
              <p className="afm-pro-upgrade-banner__desc">
                Unlock powerful file management, cloud storage, database tools, AI assistance, and 5+ integrations, all from your WordPress dashboard.
              </p>
              <div className="afm-pro-upgrade-banner__features">
                {proFeatures.map((row, rowIndex) => (
                  <div key={rowIndex} className="afm-pro-upgrade-banner__feature-row">
                    {row.map((label) => (
                      <div key={label} className="afm-pro-upgrade-banner__feature">
                        <img src={getDashboardAsset('check.svg')} alt="" width={15} height={13} />
                        <span>{label}</span>
                        {label === 'Notifications' ? (
                          <img
                            src={getDashboardAsset('notifications-badge.png')}
                            alt=""
                            className="afm-pro-upgrade-banner__notif-badge"
                            width={52}
                            height={32}
                          />
                        ) : null}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <a
                href={pricingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="afm-pro-upgrade-banner__cta"
              >
                Upgrade Now
              </a>
            </div>
            <div className="afm-pro-upgrade-banner__art">
              <img
                src={getDashboardAsset('promo-art.png')}
                alt="AFM Pro features preview"
                width={532}
                height={360}
              />
            </div>
          </div>
        </div>
      )}

      {/* Pro: Activity Logs Card */}
      {hasPro && (
        <div className="afm-card afm-activity">
          <div className="afm-card__header">
            <span>Activity Logs</span>
            <a href="#/logs" className="afm-card__header-link">View All Logs</a>
          </div>
          <div className="afm-card__body">
            {logsLoading ? (
              <div className="afm-logs-table-wrap afm-logs-table-wrap--skeleton" aria-hidden="true">
                <div className="afm-dash-logs-skeleton">
                  <div className="afm-dash-logs-skeleton__head">
                    <span className="afm-skeleton afm-skeleton--check" />
                    <span className="afm-skeleton afm-skeleton--col-id" />
                    <span className="afm-skeleton afm-skeleton--col-user" />
                    <span className="afm-skeleton afm-skeleton--col-datetime" />
                    <span className="afm-skeleton afm-skeleton--col-event" />
                    <span className="afm-skeleton afm-skeleton--col-path" />
                    <span className="afm-skeleton afm-skeleton--col-type" />
                    <span className="afm-skeleton afm-skeleton--col-created" />
                    <span className="afm-skeleton afm-skeleton--col-actions" />
                  </div>
                  {[1, 2].map(i => (
                    <div key={i} className="afm-dash-logs-skeleton__row">
                      <span className="afm-skeleton afm-skeleton--check" />
                      <span className="afm-skeleton afm-skeleton--col-id" />
                      <span className="afm-skeleton afm-skeleton--col-user afm-skeleton--col-user-stack">
                        <span className="afm-skeleton afm-skeleton--line" />
                        <span className="afm-skeleton afm-skeleton--line afm-skeleton--line-wide" />
                      </span>
                      <span className="afm-skeleton afm-skeleton--col-datetime" />
                      <span className="afm-skeleton afm-skeleton--col-event" />
                      <span className="afm-skeleton afm-skeleton--col-path" />
                      <span className="afm-skeleton afm-skeleton--col-type" />
                      <span className="afm-skeleton afm-skeleton--col-created" />
                      <span className="afm-skeleton afm-skeleton--col-actions" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="afm-logs-table-wrap">
                <table className="afm-logs-table">
                  <colgroup>
                    <col style={{ width: '55px' }} />
                    <col style={{ width: '80px' }} />
                    <col style={{ width: '200px' }} />
                    <col style={{ width: '200px' }} />
                    <col style={{ width: '130px' }} />
                    <col style={{ width: '150px' }} />
                    <col style={{ width: '150px' }} />
                    <col style={{ width: '130px' }} />
                    <col style={{ width: '135px' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="afm-logs-col-check" scope="col">
                        <input type="checkbox" disabled aria-label="Select all logs" />
                      </th>
                      <th scope="col"><span>ID</span> <span className="afm-logs-sort" aria-hidden="true"><img src={getShellAsset('logs-sort.svg')} alt="" width="12" height="12" /><img src={getShellAsset('logs-sort.svg')} alt="" width="12" height="12" className="afm-logs-sort__up" /></span></th>
                      <th scope="col"><span>User</span> <span className="afm-logs-sort" aria-hidden="true"><img src={getShellAsset('logs-sort.svg')} alt="" width="12" height="12" /><img src={getShellAsset('logs-sort.svg')} alt="" width="12" height="12" className="afm-logs-sort__up" /></span></th>
                      <th scope="col"><span>Date &amp; Time</span> <span className="afm-logs-sort" aria-hidden="true"><img src={getShellAsset('logs-sort.svg')} alt="" width="12" height="12" /><img src={getShellAsset('logs-sort.svg')} alt="" width="12" height="12" className="afm-logs-sort__up" /></span></th>
                      <th scope="col"><span>Event</span> <span className="afm-logs-sort" aria-hidden="true"><img src={getShellAsset('logs-sort.svg')} alt="" width="12" height="12" /><img src={getShellAsset('logs-sort.svg')} alt="" width="12" height="12" className="afm-logs-sort__up" /></span></th>
                      <th scope="col"><span>File Path</span> <span className="afm-logs-sort" aria-hidden="true"><img src={getShellAsset('logs-sort.svg')} alt="" width="12" height="12" /><img src={getShellAsset('logs-sort.svg')} alt="" width="12" height="12" className="afm-logs-sort__up" /></span></th>
                      <th scope="col">Type</th>
                      <th scope="col">IP Address</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const displayLogs = (data.logs || []).slice(0, 5);
                      if (displayLogs.length === 0) {
                        return (
                          <tr>
                            <td colSpan="9" className="afm-logs-empty">No logs found.</td>
                          </tr>
                        );
                      }
                      return displayLogs.map((row) => (
                        <tr key={row.id}>
                          <td className="afm-logs-col-check">
                            <input type="checkbox" disabled aria-label={`Select log ${row.id}`} />
                          </td>
                          <td>{String(row.id || '')}</td>
                          <td>
                            <div className="afm-logs-user">
                              <span className="afm-logs-user__name">{row.user || '—'}</span>
                              {row.email ? <span className="afm-logs-user__email">{row.email}</span> : null}
                            </div>
                          </td>
                          <td>{formatLogDateTime(row.time)}</td>
                          <td>{row.event || '—'}</td>
                          <td>
                            <div className="afm-logs-path">
                              <span className="afm-logs-path__text" title={row.file_path || ''}>
                                {row.file_path || '—'}
                              </span>
                              {row.file_path ? (
                                <button
                                  type="button"
                                  className="afm-logs-icon-btn"
                                  onClick={async (e) => {
                                    e.preventDefault();
                                    const copied = await copyTextWithFallback(row.file_path || '');
                                    if (copied) {
                                      setCopiedId(row.id);
                                      setTimeout(() => setCopiedId(null), 2000);
                                    }
                                  }}
                                  title={copiedId === row.id ? 'Copied!' : 'Copy file path'}
                                >
                                  {copiedId === row.id ? (
                                    <span className="dashicons dashicons-yes" />
                                  ) : (
                                    <img src={getShellAsset('logs-copy.svg')} alt="" width="14" height="14" />
                                  )}
                                </button>
                              ) : null}
                            </div>
                          </td>
                          <td>{row.type || '—'}</td>
                          <td className="afm-logs-col-ip">
                            <span className="afm-logs-ip" title={row.ip || ''}>{row.ip || '—'}</span>
                          </td>
                          <td>
                            <div className="afm-logs-row-actions">
                              <button
                                type="button"
                                className="afm-logs-icon-btn"
                                onClick={(e) => { e.preventDefault(); setViewLog(row); }}
                                title="View details"
                              >
                                <img src={getShellAsset('logs-view.svg')} alt="" width="14" height="14" />
                              </button>
                              <button
                                type="button"
                                className="afm-logs-icon-btn"
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (!window.confirm('Are you sure you want to delete this log?')) return;
                                  const { nonce } = getApiConfig();
                                  setData(prev => ({ ...prev, logs: (prev.logs || []).filter(x => String(x.id) !== String(row.id)) }));
                                  fetch(buildRestUrl(`file-manager-advanced/v1/activity-logs/${String(row.id)}`), {
                                    method: 'POST',
                                    credentials: 'same-origin',
                                    headers: { 'X-WP-Nonce': nonce }
                                  })
                                    .then(r => r.json())
                                    .then(() => fetch(buildRestUrl('file-manager-advanced/v1/activity-logs'), {
                                      credentials: 'same-origin',
                                      headers: { 'X-WP-Nonce': nonce }
                                    }))
                                    .then(r => r.ok ? r.json() : { logs: [] })
                                    .then(res => {
                                      setData(prev => ({ ...prev, logs: Array.isArray(res.logs) ? res.logs : [] }));
                                    });
                                }}
                                title="Delete log"
                              >
                                <img src={getShellAsset('logs-row-trash.svg')} alt="" width="14" height="14" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pro: Integrations Card */}
      {hasPro && (
        <div className="afm-card afm-quick" style={{ position: 'relative' }}>
          <div className="afm-card__header">
            <span>Integrations</span>
            <a
              href="#/extension"
              className="afm-card__header-link"
              onClick={(e) => {
                e.preventDefault();
                window.location.hash = '#/extension';
              }}
            >
              Manage Settings
            </a>
          </div>
          <div className="afm-card__body" style={{ position: 'relative' }}>
            {integrationsLoading ? (
              <div className="qa-grid afm-card-content" aria-hidden="true">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                  <div key={i} className="qa-card qa-card--skeleton">
                    <div className="afm-skeleton afm-skeleton--qa-icon" />
                    <div className="afm-skeleton afm-skeleton--qa-name" />
                  </div>
                ))}
              </div>
            ) : (() => {
              const base = (window.afmReact?.pluginUrl || window.afm_object?.plugin_url || '/wp-content/plugins/file-manager-advanced/') + 'application/assets/images/';
              const integrationHashMap = {
                github: '#/extension/github',
                onedrive: '#/extension/onedrive',
                googledrive: '#/extension/google-drive',
                googlecloud: '#/extension/google-cloud-storage',
                dropbox: '#/extension/dropbox',
                amazonses: '#/extension/amazon-s3',
                pcloud: '#/extension/pcloud',
                cloudflarer2: '#/extension/cloudflare-r2',
                wasabi: '#/extension/wasabi',
                ai: '#/extension/ai-code-assistent'
              };
              const items = [
                { key: 'github', name: 'Github', img: base + 'github.svg', href: integrationHashMap.github },
                { key: 'onedrive', name: 'One Drive', img: base + 'onedrive.svg', href: integrationHashMap.onedrive },
                { key: 'googledrive', name: 'Google Drive', img: base + 'googledrive.svg', href: integrationHashMap.googledrive },
                { key: 'googlecloud', name: 'Google Cloud', img: base + 'googlecloud.svg', href: integrationHashMap.googlecloud },
                { key: 'dropbox', name: 'Dropbox', img: base + 'dropbox.svg', href: integrationHashMap.dropbox },
                { key: 'amazonses', name: 'Amazon S3', img: base + 'amazons3.svg', href: integrationHashMap.amazonses },
                { key: 'pcloud', name: 'pCloud', img: base + 'pcloud.svg', href: integrationHashMap.pcloud },
                { key: 'cloudflarer2', name: 'Cloudflare R2', img: base + 'cloudflarer2.svg', href: integrationHashMap.cloudflarer2 },
                { key: 'wasabi', name: 'Wasabi', img: base + 'wasabi.svg', href: integrationHashMap.wasabi },
                { key: 'ai', name: 'AI Integration', img: base + 'ai_integration.svg', href: integrationHashMap.ai }
              ];
              items.sort((a, b) => {
                const aConn = !!(data.integrations && (data.integrations[a.key] || (a.key === 'cloudflarer2' && data.integrations['cloudflare-r2'])));
                const bConn = !!(data.integrations && (data.integrations[b.key] || (b.key === 'cloudflarer2' && data.integrations['cloudflare-r2'])));
                if (aConn === bConn) return 0;
                return aConn ? -1 : 1;
              });

              const shouldBlurIntegrations = hasPro && currentPlan !== 'business';

              return (
                <ProOverlay shouldShow={shouldBlurIntegrations}>
                  <div className="qa-grid afm-card-content">
                    {items.map(it => {
                      const connected = !!(data.integrations && (data.integrations[it.key] || (it.key === 'cloudflarer2' && data.integrations['cloudflare-r2'])));
                      return (
                        <a
                          key={it.key}
                          className={`qa-card${connected ? ' connected' : ''}`}
                          href={it.href}
                          onClick={(e) => {
                            e.preventDefault();

                            if (shouldBlurIntegrations) {
                              return;
                            }

                            let integrationId;
                            if (it.key === 'googledrive') {
                              integrationId = 'google-drive';
                            } else if (it.key === 'googlecloud') {
                              integrationId = 'google-cloud-storage';
                            } else if (it.key === 'amazonses') {
                              integrationId = 'amazon-s3';
                            } else if (it.key === 'cloudflarer2') {
                              integrationId = 'cloudflare-r2';
                            } else if (it.key === 'wasabi') {
                              integrationId = 'wasabi';
                            } else if (it.key === 'ai') {
                              integrationId = 'ai-code-assistent';
                            } else {
                              integrationId = it.key;
                            }

                            sessionStorage.setItem('afm-extension-integration', integrationId);
                            sessionStorage.setItem('afm-extension-hash-just-set', 'true');
                            window.location.hash = it.href;
                            setTimeout(() => {
                              sessionStorage.removeItem('afm-extension-hash-just-set');
                            }, 2000);
                          }}
                        >
                          <div className="qa-icon">
                            {it.img && <img src={it.img} alt="" />}
                          </div>
                          <div className="qa-name">{it.name}</div>
                          {connected ? (
                            <span className="qa-connected-badge">
                              <span className="qa-connected-badge__dot" aria-hidden="true" />
                              Connected
                            </span>
                          ) : null}
                        </a>
                      );
                    })}
                  </div>
                </ProOverlay>
              );
            })()}
          </div>
        </div>
      )}

      {viewLog && (
        <div className="afm-log-detail-modal" onClick={() => setViewLog(null)}>
          <div className="afm-log-detail-dialog" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="afm-log-detail-close" onClick={() => setViewLog(null)} aria-label="Close">×</button>
            <h3>Log Detail</h3>
            <div className="afm-log-detail-body">{viewLog.message || ''}</div>
          </div>
        </div>
      )}
    </div>
  );
}
