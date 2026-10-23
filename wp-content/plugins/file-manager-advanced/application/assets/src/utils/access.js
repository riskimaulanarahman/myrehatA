/**
 * FM-only users (wp_localize_script sends PHP true as 1, not boolean true).
 */
export function isFmOnlyAccess() {
  const value = typeof window !== 'undefined' ? window.afmReact?.fmOnlyAccess : false;
  return value === true || value === 1 || value === '1';
}
