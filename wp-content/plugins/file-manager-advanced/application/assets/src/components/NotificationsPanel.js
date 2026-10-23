import React, { useState, useEffect, useLayoutEffect, Suspense, useRef, useMemo, useCallback } from 'react';
import { getCurrentHash, setHash } from '../utils/hash';
import { getApiRoot } from '../utils/api';
import { isFeatureAvailable } from '../utils/planFeatures';
import ProOverlay from './ProOverlay';

const LazyReactQuill = React.lazy(async () => {
  await import('react-quill/dist/quill.snow.css');
  const mod = await import('react-quill');
  return { default: mod.default };
});

const QUILL_HEADER_LABELS = {
  '1': 'Heading 1',
  '2': 'Heading 2',
  '3': 'Heading 3',
  '4': 'Heading 4',
};

const quillHeaderText = (value) => {
  if (value == null || value === '' || value === 'false') return 'Normal';
  return QUILL_HEADER_LABELS[String(value)] || 'Normal';
};

/** Quill header labels rely on CSS ::before; WP admin often blanks those — paint real text nodes. */
const paintQuillHeaderPicker = (root) => {
  if (!root) return;
  root.querySelectorAll('.ql-picker.ql-header .ql-picker-item').forEach((item) => {
    const text = quillHeaderText(item.getAttribute('data-value'));
    if (item.textContent !== text) item.textContent = text;
  });
  root.querySelectorAll('.ql-picker.ql-header .ql-picker-label').forEach((label) => {
    let textEl = label.querySelector('.afm-ql-header-text');
    if (!textEl) {
      textEl = document.createElement('span');
      textEl.className = 'afm-ql-header-text';
      label.insertBefore(textEl, label.firstChild);
    }
    const text = quillHeaderText(label.getAttribute('data-value'));
    if (textEl.textContent !== text) textEl.textContent = text;
  });
};

const getQuillButtonLabel = (btn) => {
  if (btn.classList.contains('ql-bold')) return 'Bold';
  if (btn.classList.contains('ql-italic')) return 'Italic';
  if (btn.classList.contains('ql-underline')) return 'Underline';
  if (btn.classList.contains('ql-strike')) return 'Strikethrough';
  if (btn.classList.contains('ql-link')) return 'Insert link';
  if (btn.classList.contains('ql-image')) return 'Insert image';
  if (btn.classList.contains('ql-clean')) return 'Clear formatting';
  if (btn.classList.contains('ql-list')) {
    const listType = btn.getAttribute('value');
    return listType === 'ordered' ? 'Numbered list' : 'Bullet list';
  }
  if (btn.classList.contains('ql-align')) {
    const alignType = btn.getAttribute('value') || 'left';
    return alignType === 'center'
      ? 'Align center'
      : alignType === 'right'
        ? 'Align right'
        : 'Align left';
  }
  return '';
};

const paintQuillToolbarA11y = (root) => {
  if (!root) return;
  root.querySelectorAll('.ql-toolbar button').forEach((btn) => {
    const label = getQuillButtonLabel(btn);
    if (!label) return;
    btn.setAttribute('title', label);
    btn.setAttribute('aria-label', label);
  });

  root.querySelectorAll('.ql-toolbar .ql-picker.ql-header .ql-picker-label').forEach((label) => {
    label.setAttribute('title', 'Text style');
    label.setAttribute('aria-label', 'Text style');
  });
};

const applyQuillLink = (quill) => {
  if (!quill) return;

  const range = quill.getSelection(true);
  if (!range) return;

  const existingLink = (quill.getFormat(range).link || '').trim();
  const entered = window.prompt('Enter URL', existingLink || 'https://');
  if (entered === null) return;

  const raw = entered.trim();
  if (raw === '') {
    quill.format('link', false, 'user');
    return;
  }

  const normalized = /^(https?:\/\/|mailto:|tel:)/i.test(raw) ? raw : `https://${raw}`;

  if (range.length === 0) {
    const text = normalized.replace(/^https?:\/\//i, '');
    quill.insertText(range.index, text, 'link', normalized, 'user');
    quill.setSelection(range.index + text.length, 0, 'user');
    return;
  }

  quill.format('link', normalized, 'user');
};

function NotifQuillEditor({ value, onChange, readOnly, modules, formats }) {
  const wrapRef = useRef(null);

  useEffect(() => {
    const root = wrapRef.current;
    if (!root) return undefined;
    const run = () => {
      paintQuillHeaderPicker(root);
      paintQuillToolbarA11y(root);
    };
    run();
    const t1 = window.setTimeout(run, 50);
    const t2 = window.setTimeout(run, 250);
    const obs = new MutationObserver(run);
    obs.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-value', 'class'],
    });
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      obs.disconnect();
    };
  }, [value, readOnly]);

  return (
    <div className="afm-notif-editor" ref={wrapRef}>
      <Suspense fallback={<div className="afm-notif-editor__loading">Loading editor...</div>}>
        <LazyReactQuill
          theme="snow"
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          modules={modules}
          formats={formats}
        />
      </Suspense>
    </div>
  );
}

const DEFAULT_EMAIL_SUBJECT = 'AFM File Log Recent Activity';

const resolveEmailSubject = (subject) => {
  const trimmed = typeof subject === 'string' ? subject.trim() : '';
  return trimmed || DEFAULT_EMAIL_SUBJECT;
};

export default function NotificationsPanel({ onContentReady } = {}) {
  const root = getApiRoot();
  const nonce = window.wpApiSettings?.nonce || window.afmReact?.nonce || '';
  const notificationsEndpoint = (params = null) => {
    const base = `${root}file-manager-advanced/v1/notifications`;
    if (!params || typeof params !== 'object') return base;
    const query = new URLSearchParams(params).toString();
    if (!query) return base;
    return `${base}${base.includes('?') ? '&' : '?'}${query}`;
  };

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!loading) onContentReady?.();
  }, [loading, onContentReady]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Initialize with default, then use useLayoutEffect to set correct value immediately
  const [activeSubTab, setActiveSubTab] = useState('email');
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [slackEnabled, setSlackEnabled] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  // Helper function to convert plain text with \n to HTML for ReactQuill
  const textToHtml = (text) => {
    if (!text) return '';
    return text.split('\n\n').map(para => `<p>${para.split('\n').join('<br>')}</p>`).join('');
  };

  const isHtmlMessage = (content) => {
    if (!content || typeof content !== 'string') return false;
    return /<(?:p|br|strong|b|em|i|u|s|strike|h[1-6]|ul|ol|li|a|img|div|span)\b/i.test(content);
  };

  const hasMessageStructure = (content) => {
    if (!content || typeof content !== 'string') return false;
    if (content.includes('\n')) return true;
    if (/<br\s*\/?>/i.test(content)) return true;
    return (content.match(/<p\b/gi) || []).length >= 2;
  };

  const messageFingerprint = (content) =>
    String(content || '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, '')
      .toLowerCase();

  const DEFAULT_MESSAGE_PLAIN = 'Hi {admin_email},\n\nA quick update from the Advanced File Manager plugin on your site {site_name}.\nA {item_type} was {event} by {username} on {date_time}. The {item_type} name is {file_name} with the extension {ext}, and the action was performed from the following IP Address: {ip_address}.';
  const DEFAULT_MESSAGE_HTML = '<p>Hi {admin_email},</p><p>A quick update from the Advanced File Manager plugin on your site {site_name}.<br>A {item_type} was {event} by {username} on {date_time}. The {item_type} name is {file_name} with the extension {ext}, and the action was performed from the following IP Address: {ip_address}.</p>';

  const restoreMessageStructure = (content, fallbackPlain) => {
    const raw = (typeof content === 'string' && content.trim() !== '') ? content : fallbackPlain;
    if (!raw) return '';
    if (hasMessageStructure(raw)) {
      return isHtmlMessage(raw) ? raw : textToHtml(raw);
    }
    const fp = messageFingerprint(raw);
    const defaultFp = messageFingerprint(fallbackPlain || DEFAULT_MESSAGE_PLAIN);
    const oldFileFp = messageFingerprint(
      'Hi {admin_email},\n\nA quick update from the Advanced File Manager plugin on your site {site_name}.\nA file was {event} by {username} on {date_time}. The file name is {file_name} with the extension {ext}, and the action was performed from the following IP Address: {ip_address}.'
    );
    if (fp && (fp === defaultFp || fp === oldFileFp)) {
      return DEFAULT_MESSAGE_HTML;
    }
    return isHtmlMessage(raw) ? raw : textToHtml(raw);
  };

  const toEditorHtml = (content, fallbackPlain) => restoreMessageStructure(content, fallbackPlain);

  const normalizeEditorHtml = (html) => {
    if (!html || html === '<p><br></p>') return '';
    return html;
  };

  const [emailMessage, setEmailMessage] = useState(textToHtml('Hi {admin_email},\n\nA quick update from the Advanced File Manager plugin on your site {site_name}.\nA {item_type} was {event} by {username} on {date_time}. The {item_type} name is {file_name} with the extension {ext}, and the action was performed from the following IP Address: {ip_address}.'));
  const [slackMessage, setSlackMessage] = useState(textToHtml('Hi {admin_email},\n\nA quick update from the Advanced File Manager plugin on your site {site_name}.\nA {item_type} was {event} by {username} on {date_time}. The {item_type} name is {file_name} with the extension {ext}, and the action was performed from the following IP Address: {ip_address}.'));
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
  const [emailEvents, setEmailEvents] = useState([]);
  const [slackEvents, setSlackEvents] = useState([]);

  const hasPro = window.afmReact?.hasPro || false;
  const hasActiveSmtpPlugin = !!window.afmReact?.hasActiveSmtpPlugin;
  const currentPlan = window.afmReact?.currentPlan || 'free';
  const pricingUrl = window.afmReact?.pricingUrl || 'https://advancedfilemanager.com/pricing/';
  const smtpSettingsUrl = window.afmReact?.smtpSettingsUrl
    || `${window.location.origin}/wp-admin/admin.php?page=file-manager-advanced-recommend-post-smtp`;
  const smtpEmbedUrl = smtpSettingsUrl + (smtpSettingsUrl.includes('?') ? '&' : '?') + 'afm_embed=1';
  const isNotifSubTab = (tab) => tab === 'email' || tab === 'slack' || tab === 'smtp';

  // Check plan-based feature availability
  const slackNotificationAvailable = isFeatureAvailable('slack_notification', currentPlan, hasPro);

  // Free (no Pro): show Email + Slack toggles ON and full forms as read-only demo (saves stay blocked).
  const notificationsFreeDemo = !hasPro;
  const emailToggleDisplayed = notificationsFreeDemo || emailEnabled;
  const slackToggleDisplayed = notificationsFreeDemo || slackEnabled;
  const showEmailDetailSections = notificationsFreeDemo || emailEnabled;
  const showSlackDetailSections =
    (notificationsFreeDemo || slackEnabled) &&
    (notificationsFreeDemo || slackNotificationAvailable);

  // Use useLayoutEffect to read hash synchronously before paint
  // This ensures we get the correct hash before any other effects run
  // Priority: sessionStorage > hash (because elFinder might have changed hash)
  useLayoutEffect(() => {
    // FIRST: Check sessionStorage - this is most reliable because we saved it
    const savedSubTab = sessionStorage.getItem('afm-notifications-subtab');

    if (isNotifSubTab(savedSubTab) && (savedSubTab !== 'smtp' || !hasActiveSmtpPlugin)) {
      setActiveSubTab(savedSubTab);
      return;
    }

    // SECOND: Check hash if sessionStorage doesn't have it
    const rawHash = window.location.hash || '';
    const hash = rawHash.replace(/^#/, '').replace(/^\//, '');

    // If hash has sub-tab, use it immediately
    if (hash.startsWith('notifications/')) {
      const parts = hash.split('/');
      if (parts.length > 1) {
        const subTab = parts[1].split('?')[0].toLowerCase();
        if (isNotifSubTab(subTab) && (subTab !== 'smtp' || !hasActiveSmtpPlugin)) {
          sessionStorage.setItem('afm-notifications-subtab', subTab);
          setActiveSubTab(subTab);
          return;
        }
      }
    }

    // If hash is just 'notifications', default to email
    if (hash === 'notifications') {
      sessionStorage.setItem('afm-notifications-subtab', 'email');
      setActiveSubTab('email');
      return;
    }

    // Default to email
    sessionStorage.setItem('afm-notifications-subtab', 'email');
    setActiveSubTab('email');
  }, []); // Only run once on mount

  // Save sub-tab to sessionStorage
  useEffect(() => {
    if (activeSubTab) {
      sessionStorage.setItem('afm-notifications-subtab', activeSubTab);
    }
  }, [activeSubTab]);

  // Function to fix hash if it's missing sub-tab
  const fixNotificationsHash = () => {
    const hash = getCurrentHash();

    // If hash is just 'notifications' without sub-tab, add sub-tab
    if (hash === 'notifications') {
      const savedSubTab = sessionStorage.getItem('afm-notifications-subtab');
      const subTabToUse = isNotifSubTab(savedSubTab) ? savedSubTab : 'email';

      // Update URL immediately
      const urlHash = `#/notifications/${subTabToUse}`;
      if (window.history && window.history.replaceState) {
        const url = window.location.href.split('#')[0] + urlHash;
        window.history.replaceState(null, '', url);
      } else {
        window.location.hash = urlHash;
      }

      // Update state if needed
      if (activeSubTab !== subTabToUse) {
        setActiveSubTab(subTabToUse);
      }
    }
  };

  // Listen for hash changes and sync sub-tab
  useEffect(() => {
    const syncSubTabFromHash = () => {
      // Read directly from window.location.hash to ensure we get the actual current value
      const rawHash = window.location.hash || '';
      const hash = rawHash.replace(/^#/, '').replace(/^\//, '');

      // If hash already has sub-tab (notifications/email|slack|smtp), use it
      if (hash.startsWith('notifications/')) {
        const parts = hash.split('/');
        if (parts.length > 1) {
          const subTab = parts[1].split('?')[0].toLowerCase();
          if (isNotifSubTab(subTab) && (subTab !== 'smtp' || !hasActiveSmtpPlugin)) {
            sessionStorage.setItem('afm-notifications-subtab', subTab);
            setActiveSubTab(prev => prev !== subTab ? subTab : prev);
            return;
          }
        }
      }

      // If hash is just 'notifications' (without sub-tab), fix it
      if (hash === 'notifications') {
        const savedSubTab = sessionStorage.getItem('afm-notifications-subtab') || 'email';
        const subTabToUse = isNotifSubTab(savedSubTab) ? savedSubTab : 'email';

        // Update URL immediately
        const urlHash = `#/notifications/${subTabToUse}`;
        if (window.history && window.history.replaceState) {
          const url = window.location.href.split('#')[0] + urlHash;
          window.history.replaceState(null, '', url);
        } else {
          window.location.hash = urlHash;
        }

        // Update state
        setActiveSubTab(prev => prev !== subTabToUse ? subTabToUse : prev);
      }
    };

    // Listen for hash changes
    window.addEventListener('hashchange', syncSubTabFromHash);

    return () => {
      window.removeEventListener('hashchange', syncSubTabFromHash);
    };
  }, []); // Only run on mount, hash changes will trigger hashchange event

  // Update URL hash when sub-tab changes (but not on initial mount to avoid overriding URL)
  const isInitialMountRef = useRef(true);
  useEffect(() => {
    // Skip URL update on initial mount - let the URL hash drive the initial state
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    const hash = `#/notifications/${activeSubTab}`;
    if (window.history && window.history.replaceState) {
      const url = window.location.href.split('#')[0] + hash;
      window.history.replaceState(null, '', url);
    } else {
      window.location.hash = hash;
    }
  }, [activeSubTab]);

  // Available events
  const events = [
    { value: 'rm', label: 'Delete File/Folder' },
    { value: 'mkfile', label: 'Create File' },
    { value: 'mkdir', label: 'Create Folder' }
  ];

  // Placeholders for both email and Slack
  const placeholders = [
    { code: '{username}', desc: 'This will fetch the user\'s name who did the action' },
    { code: '{ip_address}', desc: 'This will fetch the user\'s IP Address' },
    { code: '{event}', desc: 'This will fetch which action the user performed (created/deleted)' },
    { code: '{item_type}', desc: 'This will fetch whether the target is a file or folder' },
    { code: '{file_name}', desc: 'This will fetch the file name on which that action was done' },
    { code: '{ext}', desc: 'This will fetch the extension or mime type for the target item' },
    { code: '{date_time}', desc: 'This will fetch the date the user acted on the file' },
    { code: '{site_name}', desc: 'This will fetch the site name on which the action was performed' }
  ];

  // Fetch notifications data and handle webhook_url return
  useEffect(() => {
    if (!root || !nonce) {
      console.warn('AFM Notifications: Missing API root or nonce');
      return;
    }

    // Check if webhook_url is in URL parameters (returning from slack.advancedfilemanager.com)
    const urlParams = new URLSearchParams(window.location.search);
    const webhookUrl = urlParams.get('webhook_url');

    let requestChain = Promise.resolve();

    if (webhookUrl) {
      // Auto-save webhook URL via API
      requestChain = fetch(notificationsEndpoint(), {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'X-WP-Nonce': nonce,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          slack: {
            webhook_url: decodeURIComponent(webhookUrl),
            enable: 'yes'
          }
        })
      })
        .then(() => {
          // Remove webhook_url from URL to clean it up
          const newUrl = window.location.href.split('&webhook_url=')[0].split('?webhook_url=')[0];
          window.history.replaceState({}, '', newUrl);
        })
        .catch(err => {
          console.error('AFM Notifications webhook save error:', err);
        });
    }

    // Fetch data after potential webhook save
    requestChain.then(() => {
      // Add a small delay to ensure DB write propagation
      setTimeout(() => {
        fetch(notificationsEndpoint({ _t: String(Date.now()) }), {
          credentials: 'same-origin',
          headers: { 'X-WP-Nonce': nonce }
        })
          .then(r => r.ok ? r.json() : Promise.reject('Failed to fetch'))
          .then(res => {
            setData(res);
            setEmailEnabled(res?.email?.enable === 'yes');
            setSlackEnabled(res?.slack?.enable === 'yes');
            // Set email fields with defaults
            setEmailAddress(res?.email?.email || '');
            setEmailSubject(resolveEmailSubject(res?.email?.subject));
            // Set email events
            setEmailEvents(Array.isArray(res?.email?.events) ? res.email.events : []);
            // Convert plain text to HTML for ReactQuill
            setEmailMessage(toEditorHtml(res?.email?.message, DEFAULT_MESSAGE_PLAIN));
            // Set slack fields with defaults
            setSlackEvents(Array.isArray(res?.slack?.events) ? res.slack.events : []);
            setSlackMessage(toEditorHtml(res?.slack?.message, DEFAULT_MESSAGE_PLAIN));
            // Set webhook URL from response or from URL parameter (fallback)
            const webhookFromUrl = webhookUrl ? decodeURIComponent(webhookUrl) : '';
            setSlackWebhookUrl(webhookFromUrl || res?.slack?.webhook_url || '');
            setLoading(false);
          })
          .catch(err => {
            console.error('AFM Notifications fetch error:', err);
            setLoading(false);
          });
      }, 500);
    });
  }, [root, nonce]);

  // Save handler - separated to allow calling with overrides
  const handleSave = (e, overrideData = null) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!hasPro) {
      alert('Pro version is required for notifications.');
      return;
    }

    if (!data || saving) return;
    setSaving(true);
    setMessage(null);

    // Use state for events instead of formData to ensure both email and slack events are always included
    // Merge overrideData if provided
    const submitData = {
      email: {
        enable: emailEnabled ? 'yes' : 'no',
        email: emailAddress || '',
        events: emailEvents || [], // Use state directly
        subject: resolveEmailSubject(emailSubject),
        message: normalizeEditorHtml(emailMessage) || '',
        ...(overrideData?.email || {})
      },
      slack: {
        enable: slackEnabled ? 'yes' : 'no',
        webhook_url: slackWebhookUrl || '',
        events: slackEvents || [], // Use state directly
        message: normalizeEditorHtml(slackMessage) || '',
        ...(overrideData?.slack || {})
      }
    };

    fetch(notificationsEndpoint(), {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'X-WP-Nonce': nonce,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(submitData)
    })
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(res => {
        setMessage({ type: 'success', text: res.message || 'Notification settings saved successfully.' });
        setSaving(false);
        setTimeout(() => setMessage(null), 5000);

        // Prefer saved payload from POST — keeps Quill HTML intact (no second-fetch race).
        if (res?.email || res?.slack) {
          const next = {
            ...(data || {}),
            email: res.email || data?.email,
            slack: res.slack || data?.slack,
          };
          setData(next);
          if (res.email) {
            setEmailEnabled(res.email.enable === 'yes');
            setEmailAddress(res.email.email || '');
            setEmailSubject(resolveEmailSubject(res.email.subject));
            setEmailEvents(Array.isArray(res.email.events) ? res.email.events : []);
            setEmailMessage(toEditorHtml(res.email.message, DEFAULT_MESSAGE_PLAIN));
          }
          if (res.slack) {
            setSlackEnabled(res.slack.enable === 'yes');
            setSlackEvents(Array.isArray(res.slack.events) ? res.slack.events : []);
            setSlackMessage(toEditorHtml(res.slack.message, DEFAULT_MESSAGE_PLAIN));
            setSlackWebhookUrl(res.slack.webhook_url || '');
          }
          return;
        }

        return fetch(notificationsEndpoint(), {
          credentials: 'same-origin',
          headers: { 'X-WP-Nonce': nonce }
        }).then(r => r.ok ? r.json() : Promise.reject(r)).then(fresh => {
          setData(fresh);
          setEmailEnabled(fresh?.email?.enable === 'yes');
          setSlackEnabled(fresh?.slack?.enable === 'yes');
          setEmailAddress(fresh?.email?.email || '');
          setEmailSubject(resolveEmailSubject(fresh?.email?.subject));
          setEmailEvents(Array.isArray(fresh?.email?.events) ? fresh.email.events : []);
          setEmailMessage(toEditorHtml(fresh?.email?.message, DEFAULT_MESSAGE_PLAIN));
          setSlackEvents(Array.isArray(fresh?.slack?.events) ? fresh.slack.events : []);
          setSlackMessage(toEditorHtml(fresh?.slack?.message, DEFAULT_MESSAGE_PLAIN));
          setSlackWebhookUrl(fresh?.slack?.webhook_url || '');
        });
      })
      .catch(err => {
        console.error('AFM Notifications save error:', err);
        setMessage({ type: 'error', text: err.message || 'Failed to save notification settings.' });
        setSaving(false);
        setTimeout(() => setMessage(null), 5000);
      });
  };

  // Form submit handler wrapper
  const handleSubmit = (e) => handleSave(e);

  const pluginUrl = window.afmReact?.pluginUrl || window.afm_object?.plugin_url || '/wp-content/plugins/file-manager-advanced/';
  const webhookHelpUrl = `https://slack.advancedfilemanager.com?install_application=true&redirect_to=${encodeURIComponent(
    `${window.location.origin}/wp-admin/admin.php?page=file_manager_advanced_ui#/notifications/slack`
  )}`;

  const insertQuillImage = useCallback((quill, url) => {
    const src = (url || '').trim();
    if (!src || !quill) return;
    if (!/^https?:\/\//i.test(src) && !src.startsWith('data:image/')) {
      window.alert('Please enter a valid image URL (http:// or https://).');
      return;
    }
    const range = quill.getSelection(true) || { index: quill.getLength() };
    quill.insertEmbed(range.index, 'image', src, 'user');
    quill.setSelection(range.index + 1, 0, 'user');
  }, []);

  // Email: full Quill toolbar (HTML email supports these).
  const emailQuillModules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [1, 2, 3, 4, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ align: '' }, { align: 'center' }, { align: 'right' }],
        ['clean'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['image', 'link'],
      ],
      handlers: {
        image() {
          const quill = this.quill;
          if (!quill) return;
          if (window.wp && wp.media) {
            const frame = wp.media({
              title: 'Select or Upload Image',
              button: { text: 'Use this image' },
              multiple: false,
              library: { type: 'image' },
            });
            frame.on('select', () => {
              const attachment = frame.state().get('selection').first();
              if (!attachment) return;
              const data = attachment.toJSON();
              insertQuillImage(quill, data.url || data.link || '');
            });
            frame.open();
            return;
          }
          const url = window.prompt('Enter image URL');
          if (url) insertQuillImage(quill, url);
        },
        link() {
          applyQuillLink(this.quill);
        },
      },
    },
  }), [insertQuillImage]);

  const emailQuillFormats = useMemo(() => ([
    'header',
    'bold', 'italic', 'underline', 'strike',
    'align',
    'list',
    'image', 'link',
  ]), []);

  // Slack: only formats Slack mrkdwn can actually render.
  // No image (local/media URLs break Slack webhooks), underline, or align.
  const slackQuillModules = useMemo(() => ({
    toolbar: {
      container: [
        ['bold', 'italic', 'strike'],
        ['clean'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link'],
      ],
      handlers: {
        link() {
          applyQuillLink(this.quill);
        },
      },
    },
  }), []);

  const slackQuillFormats = useMemo(() => ([
    'bold', 'italic', 'strike',
    'list',
    'link',
  ]), []);

  const onEmailMessageChange = useCallback((html) => {
    setEmailMessage(typeof html === 'string' ? html : '');
  }, []);
  const onSlackMessageChange = useCallback((html) => {
    setSlackMessage(typeof html === 'string' ? html : '');
  }, []);

  const switchNotifSubTab = (next) => {
    sessionStorage.setItem('afm-notifications-hash-just-set', 'true');
    setActiveSubTab(next);
    const urlHash = `#/notifications/${next}`;
    if (window.history && window.history.replaceState) {
      const url = window.location.href.split('#')[0] + urlHash;
      window.history.replaceState(null, '', url);
    } else {
      window.location.hash = urlHash;
    }
    setTimeout(() => {
      sessionStorage.removeItem('afm-notifications-hash-just-set');
    }, 2000);
  };

  if (loading) {
    return (
      <div className="afm-settings-shell">
        <div className="afm-settings-subnav" aria-hidden="true">
          <span className="afm-settings-subnav__tab is-active">Email Notifications</span>
          <span className="afm-settings-subnav__tab">Slack Notifications</span>
          {!hasActiveSmtpPlugin && <span className="afm-settings-subnav__tab">SMTP</span>}
        </div>
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
            <div className="afm-skeleton" style={{ height: '40px', width: '260px', borderRadius: '6px', marginBottom: '30px' }} />
            <div className="afm-skeleton" style={{ height: '42px', width: '100%', maxWidth: '600px', borderRadius: '6px', marginBottom: '12px' }} />
            <div className="afm-skeleton" style={{ height: '42px', width: '100%', maxWidth: '600px', borderRadius: '6px', marginBottom: '12px' }} />
            <div className="afm-skeleton" style={{ height: '120px', width: '100%', maxWidth: '600px', borderRadius: '6px' }} />
          </div>
        </div>
      </div>
    );
  }

  const showSaveButton =
    activeSubTab !== 'smtp' &&
    ((activeSubTab === 'email' && showEmailDetailSections) ||
      (activeSubTab === 'slack' && showSlackDetailSections));
  const saveDisabled =
    saving ||
    !hasPro ||
    (activeSubTab === 'slack' && !slackNotificationAvailable);

  const Toggle = ({ id, name, checked, disabled, onChange }) => (
    <button
      type="button"
      id={id}
      name={name}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={`afm-switch${checked ? ' is-on' : ''}`}
      onClick={(e) => {
        e.preventDefault();
        if (!disabled && onChange) onChange({ target: { checked: !checked } });
      }}
    >
      <span className="afm-switch__knob" aria-hidden="true" />
    </button>
  );

  const PlaceholdersBox = () => (
    <div className="afm-notif-placeholders">
      <p className="afm-notif-placeholders__title">Available placeholders:</p>
      <div className="afm-notif-placeholders__list">
        {placeholders.map((ph, i) => (
          <p key={i} className="afm-notif-placeholders__item">
            <span className="afm-notif-placeholders__code">{ph.code}</span>
            - {ph.desc}
          </p>
        ))}
      </div>
    </div>
  );

  const EventsField = ({ name, selected, onToggle, disabled }) => (
    <div className="afm-form-field">
      <div className="afm-field-head">
        <label className="afm-field-label">Events Notification</label>
      </div>
      <div className="afm-notif-events">
        {events.map((event) => {
          const eventId = `${name.replace(/[^a-z0-9_-]/gi, '-')}-${event.value}`;
          return (
            <div
              key={event.value}
              className={`afm-notif-events__item${disabled ? ' is-disabled' : ''}`}
            >
              <input
                id={eventId}
                type="checkbox"
                name={name}
                value={event.value}
                checked={selected.includes(event.value)}
                onChange={(e) => onToggle(event.value, e.target.checked)}
                disabled={disabled}
              />
              <label htmlFor={eventId}>{event.label}</label>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="afm-settings-shell">
      <nav className="afm-settings-subnav" aria-label="Notification channels">
        <a
          href="#/notifications/email"
          onClick={(e) => {
            e.preventDefault();
            switchNotifSubTab('email');
          }}
          className={`afm-settings-subnav__tab${activeSubTab === 'email' ? ' is-active' : ''}`}
        >
          Email Notifications
        </a>
        <a
          href="#/notifications/slack"
          onClick={(e) => {
            e.preventDefault();
            switchNotifSubTab('slack');
          }}
          className={`afm-settings-subnav__tab${activeSubTab === 'slack' ? ' is-active' : ''}`}
        >
          Slack Notifications
        </a>
        {!hasActiveSmtpPlugin && (
          <a
            href="#/notifications/smtp"
            onClick={(e) => {
              e.preventDefault();
              switchNotifSubTab('smtp');
            }}
            className={`afm-settings-subnav__tab${activeSubTab === 'smtp' ? ' is-active' : ''}`}
          >
            SMTP
          </a>
        )}
      </nav>

      <div className="afm-settings-body">
        <div className="afm-settings-card">
          {message && (
            <div
              className={`afm-snackbar afm-snackbar-${message.type === 'success' ? 'success' : 'error'}`}
              onClick={() => setMessage(null)}
              style={{ animation: 'afm-slideIn 0.3s ease-out' }}
            >
              <span style={{ fontSize: '14px', lineHeight: '1.5', flex: '1' }}>{message.text}</span>
              <button
                type="button"
                className="afm-snackbar-close"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMessage(null); }}
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          )}

          {activeSubTab === 'smtp' && !hasActiveSmtpPlugin && (
            <iframe
              title="SMTP"
              src={smtpEmbedUrl}
              className="afm-notif-smtp-frame"
            />
          )}

          {activeSubTab !== 'smtp' && (
            <form onSubmit={handleSubmit} className="afm-stacked-form afm-notif-form">
              {activeSubTab === 'email' && (
                <ProOverlay shouldShow={!hasPro}>
                  <div className="afm-notif-channel">
                    <div className="afm-notif-channel__head">
                      <div className="afm-notif-channel__title">
                        <span className="afm-notif-channel__icon" aria-hidden="true">
                          <img
                            src={`${pluginUrl}application/assets/images/email_notification.svg`}
                            alt=""
                            width="24"
                            height="24"
                          />
                        </span>
                        <span className="afm-field-label">Email Notifications</span>
                      </div>
                      <Toggle
                        id="email_enable"
                        name="email_enable"
                        checked={emailToggleDisplayed}
                        disabled={!hasPro}
                        onChange={() => {
                          const newValue = !emailEnabled;
                          setEmailEnabled(newValue);
                          handleSave(null, { email: { enable: newValue ? 'yes' : 'no' } });
                        }}
                      />
                    </div>

                    {showEmailDetailSections && (
                      <>
                        <div className="afm-form-field">
                          <div className="afm-field-head">
                            <label className="afm-field-label" htmlFor="email_address">Emails</label>
                          </div>
                          <div className="afm-field-input">
                            <input
                              type="email"
                              id="email_address"
                              name="email_address"
                              value={emailAddress}
                              onChange={(e) => setEmailAddress(e.target.value)}
                              disabled={!hasPro}
                              placeholder="Enter email address"
                            />
                            <p className="afm-field-help">Email address to send notification.</p>
                          </div>
                        </div>

                        <EventsField
                          name="email_events[]"
                          selected={emailEvents}
                          disabled={!hasPro}
                          onToggle={(value, checked) => {
                            setEmailEvents((prev) =>
                              checked ? [...prev, value] : prev.filter((ev) => ev !== value)
                            );
                          }}
                        />

                        <div className="afm-form-field">
                          <div className="afm-field-head">
                            <label className="afm-field-label" htmlFor="email_subject">Emails Subject</label>
                          </div>
                          <div className="afm-field-input">
                            <input
                              type="text"
                              id="email_subject"
                              name="email_subject"
                              value={emailSubject}
                              onChange={(e) => setEmailSubject(e.target.value)}
                              disabled={!hasPro}
                              placeholder={DEFAULT_EMAIL_SUBJECT}
                            />
                            <p className="afm-field-help">Subject of the email notification.</p>
                          </div>
                        </div>

                        <div className="afm-form-field afm-form-field--editor">
                          <div className="afm-field-head">
                            <label className="afm-field-label">Emails Message</label>
                          </div>
                          <div className="afm-field-input">
                            <NotifQuillEditor
                              value={emailMessage}
                              onChange={onEmailMessageChange}
                              readOnly={!hasPro}
                              modules={emailQuillModules}
                              formats={emailQuillFormats}
                            />
                            <input type="hidden" name="email_message" value={emailMessage} />
                            <p className="afm-field-help">
                              Message body of the email notification. You can use placeholders like {`{file_name}`}, {`{action}`} etc.
                            </p>
                            <PlaceholdersBox />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </ProOverlay>
              )}

              {activeSubTab === 'slack' && (
                <ProOverlay shouldShow={!hasPro || !slackNotificationAvailable}>
                  <div className="afm-notif-channel">
                    <div className="afm-notif-channel__head">
                      <div className="afm-notif-channel__title">
                        <span className="afm-notif-channel__icon" aria-hidden="true">
                          <img
                            src={`${pluginUrl}application/assets/images/slack_notification.svg`}
                            alt=""
                            width="24"
                            height="24"
                          />
                        </span>
                        <span className="afm-field-label">Slack Notifications</span>
                      </div>
                      <Toggle
                        id="slack_enable"
                        name="slack_enable"
                        checked={slackToggleDisplayed}
                        disabled={!hasPro || !slackNotificationAvailable}
                        onChange={() => {
                          const newValue = !slackEnabled;
                          setSlackEnabled(newValue);
                          handleSave(null, { slack: { enable: newValue ? 'yes' : 'no' } });
                        }}
                      />
                    </div>

                    {showSlackDetailSections && (
                      <>
                        <div className="afm-form-field">
                          <div className="afm-field-head">
                            <label className="afm-field-label" htmlFor="slack_webhook_url">Slack Webhook URL</label>
                          </div>
                          <div className="afm-field-input">
                            <input
                              type="url"
                              id="slack_webhook_url"
                              name="slack_webhook_url"
                              value={slackWebhookUrl}
                              onChange={(e) => setSlackWebhookUrl(e.target.value)}
                              disabled={!hasPro || !slackNotificationAvailable}
                              placeholder="Webhook.slack.com"
                            />
                            <p className="afm-field-help">
                              Enable your Slack Webhook URL to receive notifications.{' '}
                              <a
                                className="afm-field-link"
                                href={webhookHelpUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Click here to get your webhook URL.
                              </a>
                            </p>
                          </div>
                        </div>

                        <EventsField
                          name="slack_events[]"
                          selected={slackEvents}
                          disabled={!hasPro || !slackNotificationAvailable}
                          onToggle={(value, checked) => {
                            setSlackEvents((prev) =>
                              checked ? [...prev, value] : prev.filter((ev) => ev !== value)
                            );
                          }}
                        />

                        <div className="afm-form-field afm-form-field--editor">
                          <div className="afm-field-head">
                            <label className="afm-field-label">Slack Message</label>
                          </div>
                          <div className="afm-field-input">
                            <NotifQuillEditor
                              value={slackMessage}
                              onChange={onSlackMessageChange}
                              readOnly={!hasPro || !slackNotificationAvailable}
                              modules={slackQuillModules}
                              formats={slackQuillFormats}
                            />
                            <input type="hidden" name="slack_message" value={slackMessage} />
                            <p className="afm-field-help">
                              Customize the message to be sent to Slack. You can use placeholders like {`{file_name}`}, {`{action}`} etc.
                            </p>
                            <PlaceholdersBox />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </ProOverlay>
              )}

              {showSaveButton && (
                <div className="afm-notif-actions">
                  <button
                    type="submit"
                    name="submit"
                    id="submit"
                    className="button button-primary afm-teal-button"
                    disabled={saveDisabled}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
