export function normalizeToCurrentOrigin(url) {
  if (!url || typeof url !== 'string') return url;
  try {
    const parsed = new URL(url, window.location.origin);
    parsed.protocol = window.location.protocol;
    parsed.host = window.location.host;
    return parsed.toString();
  } catch (e) {
    if (url.startsWith('/')) return `${window.location.origin}${url}`;
    return url;
  }
}

export function getApiRoot() {
  return normalizeToCurrentOrigin(
    window.wpApiSettings?.root || window.afmReact?.jsonURL || `${window.location.origin}/?rest_route=/`
  );
}

function getRestRouteOrigin(root) {
  try {
    return new URL(root, window.location.origin).origin;
  } catch (e) {
    return window.location.origin;
  }
}

/**
 * Build a REST API URL for plain (?rest_route=) and pretty (/wp-json/) permalinks.
 *
 * @param {string} endpoint Route after the REST namespace root (no leading slash required).
 * @param {Record<string, string|number|boolean>} [params] Query parameters.
 * @returns {string}
 */
export function buildRestUrl(endpoint, params = {}) {
  const root = getApiRoot();
  const cleanRoot = root.endsWith('/') ? root : `${root}/`;
  const endpointPath = String(endpoint || '').replace(/^\//, '');
  const queryParts = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);

  if (cleanRoot.includes('rest_route=')) {
    const baseUrl = `${cleanRoot.split('rest_route=')[0]}rest_route=`;
    let url = `${baseUrl}/${endpointPath}`;
    if (queryParts.length) {
      url += `&${queryParts.join('&')}`;
    }
    return url;
  }

  // Managed hosts (e.g. InstaWP) often expose REST only via ?rest_route=, not /wp-json/.
  if (cleanRoot.includes('/wp-json')) {
    const origin = getRestRouteOrigin(cleanRoot);
    let url = `${origin}/?rest_route=/${endpointPath}`;
    if (queryParts.length) {
      url += `&${queryParts.join('&')}`;
    }
    return url;
  }

  let url = `${cleanRoot}${endpointPath}`;
  if (queryParts.length) {
    url += `?${queryParts.join('&')}`;
  }
  return url;
}

export function getAjaxUrl() {
  return normalizeToCurrentOrigin(window.ajaxurl || window.afm_object?.ajaxurl || '/wp-admin/admin-ajax.php');
}
