import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getApiRoot, buildRestUrl } from '../utils/api';

const formatLogDetailContent = (message) => {
  const text = String(message || '').trim();
  if (!text) {
    return 'No details available.';
  }
  const parts = text.split(/(\*\*\*.*?\*\*\*)/g);
  return parts.map((part, index) => {
    const match = part.match(/^\*\*\*(.*?)\*\*\*$/);
    if (match) {
      return <strong key={index} style={{ fontWeight: 700 }}>{match[1]}</strong>;
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
};

const PER_PAGE = 20;

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'uploaded', label: 'Uploaded' },
  { value: 'created', label: 'Created' },
  { value: 'deleted', label: 'Deleted' },
  { value: 'renamed', label: 'Renamed' },
  { value: 'duplicated', label: 'Duplicated' },
  { value: 'pasted', label: 'Pasted' },
  { value: 'updated', label: 'Updated' },
];

export default function LogsPanel({ onContentReady } = {}) {
  const root = getApiRoot();
  const nonce = window.wpApiSettings?.nonce || window.afmReact?.nonce || '';
  const pluginUrl = window.afmReact?.pluginUrl || window.afm_object?.plugin_url || '/wp-content/plugins/file-manager-advanced/';
  const shellImg = `${pluginUrl}application/assets/images/shell/`;

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!loading) onContentReady?.();
  }, [loading, onContentReady]);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [dateRangeDisplay, setDateRangeDisplay] = useState('');
  const [viewLog, setViewLog] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const pickerInitializedRef = useRef(false);

  const getDummyLogs = () => {
    const now = Math.floor(Date.now() / 1000);
    return [
      {
        id: 1001,
        user: 'admin',
        email: 'admin@example.com',
        time: now - 3600,
        event: 'Uploaded',
        file_path: '/wp-content/uploads/2024/11/demo-image.jpg',
        type: 'Image',
        ip: '192.168.1.100',
      },
      {
        id: 1002,
        user: 'editor',
        email: 'editor@example.com',
        time: now - 7200,
        event: 'Deleted',
        file_path: '/wp-content/uploads/old-document.pdf',
        type: 'Document',
        ip: '192.168.1.101',
      },
      {
        id: 1003,
        user: 'admin',
        email: 'admin@example.com',
        time: now - 10800,
        event: 'Created',
        file_path: '/wp-content/uploads/new-folder/',
        type: 'Folder',
        ip: '192.168.1.100',
      },
      {
        id: 1004,
        user: 'author',
        email: 'author@example.com',
        time: now - 14400,
        event: 'Renamed',
        file_path: '/wp-content/uploads/renamed-file.txt',
        type: 'Text',
        ip: '192.168.1.102',
      },
      {
        id: 1005,
        user: 'admin',
        email: 'admin@example.com',
        time: now - 18000,
        event: 'Duplicated',
        file_path: '/wp-content/uploads/copy-of-file.png',
        type: 'Image',
        ip: '192.168.1.100',
      },
    ];
  };

  const buildLogsUrl = (pageNum) => {
    const params = {
      page: pageNum,
      per_page: PER_PAGE,
    };
    if (filter && filter !== 'all') {
      params.filter = filter;
    }
    if (dateRange && typeof dateRange === 'string' && dateRange.trim() !== '') {
      const dateRangeParts = dateRange.split(' - ');
      if (dateRangeParts.length === 2) {
        const startDate = dateRangeParts[0].trim();
        const endDate = dateRangeParts[1].trim();
        if (startDate.match(/^\d{4}-\d{2}-\d{2}$/) && endDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
          params.date_range = dateRange;
        }
      }
    }
    return buildRestUrl('file-manager-advanced/v1/file-logs', params);
  };

  const restFetch = (endpoint, options = {}) => {
    const headers = {
      'X-WP-Nonce': nonce,
      ...(options.headers || {}),
    };
    return fetch(buildRestUrl(endpoint), {
      credentials: 'same-origin',
      ...options,
      headers,
    });
  };

  const refreshLogs = (pageNum = page) => fetch(buildLogsUrl(pageNum), {
    credentials: 'same-origin',
    headers: { 'X-WP-Nonce': nonce },
  }).then((r) => {
    if (!r.ok) {
      throw new Error(`HTTP ${r.status}`);
    }
    return r.json();
  }).then((res) => {
    setLogs(res.logs || []);
    setTotalPages(res.total_pages || 1);
    setTotalItems(Number(res.total || res.total_items || 0) || 0);
  });

  useEffect(() => {
    if (!root || !nonce) {
      console.warn('AFM Logs: Missing API root or nonce');
      return;
    }
    setLoading(true);
    fetch(buildLogsUrl(page), {
      credentials: 'same-origin',
      headers: { 'X-WP-Nonce': nonce },
    })
      .then((r) => {
        if (!r.ok) {
          return r.text().then(() => {
            throw new Error(`HTTP ${r.status}: ${r.statusText}`);
          });
        }
        return r.json();
      })
      .then((res) => {
        setLogs(res.logs || []);
        setTotalPages(res.total_pages || 1);
        setTotalItems(Number(res.total || res.total_items || 0) || 0);
        setSelectedIds([]);
        setLoading(false);
      })
      .catch((err) => {
        console.error('AFM Logs fetch error:', err);
        setLoading(false);
      });
  }, [page, filter, dateRange, root, nonce]);

  const deleteLog = (id) => {
    if (!window.confirm('Are you sure you want to delete this file log?')) return;
    restFetch(`file-manager-advanced/v1/file-logs/${id}`, { method: 'POST' })
      .then((r) => (r.ok ? r.json() : r.json().then((body) => Promise.reject(body))))
      .then((res) => {
        if (!res.success) {
          throw new Error(res.message || 'Delete failed');
        }
        return refreshLogs(page);
      })
      .then(() => {
        setSelectedIds((prev) => prev.filter((x) => String(x) !== String(id)));
      })
      .catch((err) => console.error('AFM Logs delete error:', err));
  };

  const deleteSelectedLogs = (ids) => {
    const uniqueIds = Array.from(new Set(ids.map((x) => Number(x)).filter((x) => x > 0)));
    if (!uniqueIds.length) return;
    const message = uniqueIds.length === 1
      ? 'Are you sure you want to delete this file log?'
      : `Are you sure you want to delete ${uniqueIds.length} selected file logs?`;
    if (!window.confirm(message)) return;

    restFetch('file-manager-advanced/v1/file-logs/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: uniqueIds }),
    })
      .then((r) => (r.ok ? r.json() : r.json().then((body) => Promise.reject(body))))
      .then((res) => {
        if (!res.success) {
          throw new Error(res.message || 'Bulk delete failed');
        }
        return refreshLogs(page);
      })
      .then(() => {
        setSelectedIds((prev) => prev.filter((id) => !uniqueIds.includes(Number(id))));
      })
      .catch((err) => console.error('AFM Logs bulk delete error:', err));
  };

  const deleteAllLogs = () => {
    if (selectedIds.length > 0) {
      deleteSelectedLogs(selectedIds);
      return;
    }
    if (!window.confirm('Are you sure you want to delete ALL file logs? This action cannot be undone.')) return;
    restFetch('file-manager-advanced/v1/file-logs/all', { method: 'POST' })
      .then((r) => (r.ok ? r.json() : r.json().then((body) => Promise.reject(body))))
      .then((res) => {
        if (!res.success) {
          throw new Error(res.message || 'Delete all failed');
        }
        setLogs([]);
        setPage(1);
        setTotalPages(1);
        setTotalItems(0);
        setSelectedIds([]);
      })
      .catch((err) => console.error('AFM Logs delete all error:', err));
  };

  const resetFilters = () => {
    setFilter('all');
    setSearch('');
    setDateRange('');
    setDateRangeDisplay('');
    setPage(1);
    if (typeof window.jQuery !== 'undefined') {
      window.jQuery('#date-range').val('');
    }
  };

  const copyTextWithFallback = async (text) => {
    const value = String(text || '');
    if (!value) return false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch (err) {}

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

  const copyToClipboard = async (text, id) => {
    const copied = await copyTextWithFallback(text);
    if (copied) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const formatDateTime = (timeValue) => {
    if (!timeValue) return '—';
    const timestamp = parseInt(timeValue, 10);
    if (!isNaN(timestamp) && timestamp > 0) {
      const date = new Date(timestamp * 1000);
      if (!isNaN(date.getTime())) {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const month = months[date.getMonth()];
        const day = date.getDate();
        const year = date.getFullYear();
        let hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const mins = minutes < 10 ? `0${minutes}` : minutes;
        return `${month} ${day}, ${year} ${hours}:${mins}${ampm}`;
      }
    }
    if (typeof timeValue === 'string') {
      const parsedDate = new Date(timeValue);
      if (!isNaN(parsedDate.getTime())) {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const month = months[parsedDate.getMonth()];
        const day = parsedDate.getDate();
        const year = parsedDate.getFullYear();
        let hours = parsedDate.getHours();
        const minutes = parsedDate.getMinutes();
        const ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const mins = minutes < 10 ? `0${minutes}` : minutes;
        return `${month} ${day}, ${year} ${hours}:${mins}${ampm}`;
      }
      if (timeValue.match(/[A-Za-z]+ \d+, \d{4}/)) {
        return timeValue;
      }
    }
    return timeValue;
  };

  useEffect(() => {
    if (!loading) {
      const initPicker = () => {
        if (typeof window.jQuery === 'undefined' || typeof window.jQuery.fn.daterangepicker !== 'function') {
          return;
        }
        const $input = window.jQuery('#date-range');
        if (!$input.length) return;
        if ($input.data('daterangepicker')) return;

        $input.daterangepicker({ autoUpdateInput: false });
        $input.off('cancel.daterangepicker').on('cancel.daterangepicker', () => {
          $input.val('');
          setDateRange('');
          setDateRangeDisplay('');
          setPage(1);
        });
        $input.off('apply.daterangepicker').on('apply.daterangepicker', (ev, picker) => {
          const displayRange = `${picker.startDate.format('MM/DD/YYYY')} - ${picker.endDate.format('MM/DD/YYYY')}`;
          const apiRange = `${picker.startDate.format('YYYY-MM-DD')} - ${picker.endDate.format('YYYY-MM-DD')}`;
          $input.val(displayRange);
          setDateRangeDisplay(displayRange);
          setDateRange(apiRange);
          setPage(1);
        });
        pickerInitializedRef.current = true;
      };
      const timeoutId = setTimeout(initPicker, 200);
      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [loading]);

  useEffect(() => {
    if (dateRange) {
      const parts = dateRange.split(' - ');
      if (parts.length === 2) {
        const startParts = parts[0].trim().split('-');
        const endParts = parts[1].trim().split('-');
        if (startParts.length === 3 && endParts.length === 3) {
          setDateRangeDisplay(`${startParts[1]}/${startParts[2]}/${startParts[0]} - ${endParts[1]}/${endParts[2]}/${endParts[0]}`);
        }
      }
    } else {
      setDateRangeDisplay('');
    }
  }, [dateRange]);

  const hasPro = window.afmReact?.hasPro || false;
  const currentPlan = window.afmReact?.currentPlan || 'free';
  const hasFileLogs = typeof window.afmReact?.hasFileLogs === 'boolean'
    ? window.afmReact.hasFileLogs
    : (hasPro && currentPlan !== 'free');
  const showDummy = !hasFileLogs;
  const baseLogs = showDummy ? getDummyLogs() : logs;
  const searchQ = search.trim().toLowerCase();
  const displayLogs = !searchQ
    ? baseLogs
    : baseLogs.filter((log) => {
      const hay = [log.user, log.email, log.event, log.file_path, log.type, log.ip, String(log.id)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(searchQ);
    });

  const allVisibleSelected = displayLogs.length > 0 && displayLogs.every((l) => selectedIds.includes(l.id));
  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !displayLogs.some((l) => l.id === id)));
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        displayLogs.forEach((l) => next.add(l.id));
        return Array.from(next);
      });
    }
  };
  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => (
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    ));
  };

  const rangeTotal = totalItems || (showDummy ? displayLogs.length : (totalPages > 1 ? totalPages * PER_PAGE : displayLogs.length));
  const rangeStart = displayLogs.length === 0 ? 0 : (showDummy || searchQ ? 1 : (page - 1) * PER_PAGE + 1);
  const rangeEnd = displayLogs.length === 0
    ? 0
    : (showDummy || searchQ ? displayLogs.length : (page - 1) * PER_PAGE + displayLogs.length);

  const SortIcon = () => (
    <span className="afm-logs-sort" aria-hidden="true">
      <img src={`${shellImg}logs-sort.svg`} alt="" width="12" height="12" />
      <img src={`${shellImg}logs-sort.svg`} alt="" width="12" height="12" className="afm-logs-sort__up" />
    </span>
  );

  if (loading) {
    return (
      <div className="afm-settings-shell">
        <div className="afm-settings-body">
          <div className="afm-settings-card">
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
            <div className="afm-skeleton" style={{ height: '20px', width: '140px', borderRadius: '6px', marginBottom: '20px' }} />
            <div className="afm-skeleton" style={{ height: '42px', width: '100%', borderRadius: '6px', marginBottom: '20px' }} />
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="afm-skeleton" style={{ height: '48px', width: '100%', borderRadius: '4px', marginBottom: '8px' }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="afm-settings-shell">
      <div className="afm-settings-body">
        <div className="afm-settings-card afm-logs-card">
          <div className="afm-logs-header">
            <h2 className="afm-logs-title">File Logs</h2>
          </div>

          <div className="afm-logs-toolbar">
            <label className="afm-logs-search">
              <img src={`${shellImg}logs-search.svg`} alt="" width="13" height="13" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                aria-label="Search logs"
              />
            </label>

            <div className="afm-logs-toolbar__actions">
              <select
                className="afm-logs-select"
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by event"
              >
                {FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Date Range"
                className="afm-logs-select afm-logs-daterange"
                id="date-range"
                autoComplete="off"
                readOnly
                value={dateRangeDisplay}
                aria-label="Date range"
              />

              <button type="button" className="afm-logs-btn afm-logs-btn--reset" onClick={resetFilters}>
                <span>Reset Filters</span>
                <img src={`${shellImg}logs-reset.svg`} alt="" width="14" height="10" />
              </button>

              <button
                type="button"
                className="afm-logs-btn afm-logs-btn--danger"
                onClick={deleteAllLogs}
                disabled={!hasFileLogs}
                title={
                  !hasFileLogs
                    ? 'Pro feature - Upgrade to unlock'
                    : (selectedIds.length > 0 ? 'Delete selected logs' : 'Delete all logs')
                }
              >
                <span>{selectedIds.length > 0 ? 'Delete Selected' : 'Delete All'}</span>
                <img src={`${shellImg}logs-trash.svg`} alt="" width="11" height="12" />
              </button>
            </div>
          </div>

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
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAll}
                      disabled={displayLogs.length === 0}
                      aria-label="Select all logs"
                    />
                  </th>
                  <th className="afm-logs-col-id" scope="col"><span>ID</span> <SortIcon /></th>
                  <th className="afm-logs-col-user" scope="col"><span>User</span> <SortIcon /></th>
                  <th className="afm-logs-col-datetime" scope="col"><span>Date &amp; Time</span> <SortIcon /></th>
                  <th className="afm-logs-col-event" scope="col"><span>Event</span> <SortIcon /></th>
                  <th className="afm-logs-col-path" scope="col"><span>File Path</span> <SortIcon /></th>
                  <th className="afm-logs-col-type" scope="col">Type</th>
                  <th className="afm-logs-col-ip" scope="col">IP Address</th>
                  <th className="afm-logs-col-actions" scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayLogs.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="afm-logs-empty">No logs found.</td>
                  </tr>
                ) : (
                  displayLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="afm-logs-col-check">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(log.id)}
                          onChange={() => toggleSelectOne(log.id)}
                          aria-label={`Select log ${log.id}`}
                        />
                      </td>
                      <td className="afm-logs-col-id">{log.id}</td>
                      <td className="afm-logs-col-user">
                        <div className="afm-logs-user">
                          <span className="afm-logs-user__name">{log.user || '—'}</span>
                          {log.email ? <span className="afm-logs-user__email">{log.email}</span> : null}
                        </div>
                      </td>
                      <td className="afm-logs-col-datetime">{formatDateTime(log.time) || '—'}</td>
                      <td className="afm-logs-col-event">{log.event || '—'}</td>
                      <td className="afm-logs-col-path">
                        <div className="afm-logs-path">
                          <span className="afm-logs-path__text" title={log.file_path || ''}>
                            {log.file_path || '—'}
                          </span>
                          {log.file_path ? (
                            <button
                              type="button"
                              className="afm-logs-icon-btn"
                              onClick={() => copyToClipboard(log.file_path, log.id)}
                              title={copiedId === log.id ? 'Copied!' : 'Copy file path'}
                            >
                              {copiedId === log.id ? (
                                <span className="dashicons dashicons-yes" />
                              ) : (
                                <img src={`${shellImg}logs-copy.svg`} alt="" width="14" height="14" />
                              )}
                            </button>
                          ) : null}
                        </div>
                      </td>
                      <td className="afm-logs-col-type">{log.type || '—'}</td>
                      <td className="afm-logs-col-ip">
                        <span className="afm-logs-ip" title={log.ip || ''}>{log.ip || '—'}</span>
                      </td>
                      <td className="afm-logs-col-actions">
                        <div className="afm-logs-row-actions">
                          <button
                            type="button"
                            className="afm-logs-icon-btn"
                            disabled={!hasFileLogs}
                            onClick={() => hasFileLogs && setViewLog(log)}
                            title={hasFileLogs ? 'View details' : 'View details (Pro feature)'}
                          >
                            <img src={`${shellImg}logs-view.svg`} alt="" width="14" height="14" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="afm-logs-icon-btn"
                            disabled={!hasFileLogs}
                            onClick={() => hasFileLogs && deleteLog(log.id)}
                            title={hasFileLogs ? 'Delete log' : 'Delete log (Pro feature)'}
                          >
                            <img src={`${shellImg}logs-row-trash.svg`} alt="" width="14" height="14" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="afm-logs-pagination">
            <button
              type="button"
              className="afm-logs-page-btn"
              disabled={showDummy || page <= 1}
              onClick={() => setPage(1)}
              aria-label="First page"
            >
              «
            </button>
            <button
              type="button"
              className="afm-logs-page-btn"
              disabled={showDummy || page <= 1}
              onClick={() => setPage(page - 1)}
              aria-label="Previous page"
            >
              ‹
            </button>
            <span className="afm-logs-page-meta">
              {rangeStart}-{rangeEnd} of {rangeTotal || rangeEnd}
            </span>
            <button
              type="button"
              className="afm-logs-page-btn"
              disabled={showDummy || page >= totalPages}
              onClick={() => setPage(page + 1)}
              aria-label="Next page"
            >
              ›
            </button>
            <button
              type="button"
              className="afm-logs-page-btn"
              disabled={showDummy || page >= totalPages}
              onClick={() => setPage(totalPages)}
              aria-label="Last page"
            >
              »
            </button>
          </div>

          {viewLog && createPortal(
            <div className="afm-log-detail-modal" onClick={() => setViewLog(null)}>
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="afm-log-detail-title"
                className="afm-log-detail-dialog"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="afm-log-detail-close"
                  onClick={() => setViewLog(null)}
                  aria-label="Close log details"
                >
                  &times;
                </button>
                <h3 id="afm-log-detail-title">Log Detail</h3>
                <p className="afm-log-detail-body">
                  {formatLogDetailContent(viewLog.message)}
                </p>
              </div>
            </div>,
            document.body
          )}
        </div>
      </div>
    </div>
  );
}
