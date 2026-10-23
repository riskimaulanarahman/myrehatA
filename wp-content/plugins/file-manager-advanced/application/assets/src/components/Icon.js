/**
 * Icon component for tab navigation — Figma shell SVGs (20×20).
 */
function getShellAssetUrl(filename) {
  const base = (window.afmReact?.pluginUrl || window.afm_object?.plugin_url || '/wp-content/plugins/file-manager-advanced/') + 'application/assets/images/shell/';
  return base + filename;
}

const ICON_FILES = {
  dashboard: 'icon-home.svg',
  filemanager: 'icon-folder.svg',
  settings: 'icon-settings.svg',
  logs: 'icon-logs.svg',
  notifications: 'icon-notifications.svg',
  extension: 'icon-extension.svg',
  docs: 'icon-docs.svg',
  pro: 'icon-crown.svg'
};

export default function Icon({ name, active = false }) {
  const file = ICON_FILES[name];
  if (!file) return null;

  const src = getShellAssetUrl(file);

  // Crown keeps its gold gradient — render as image
  if (name === 'pro') {
    return (
      <img
        className="afm-pill-icon-img"
        src={src}
        alt=""
        width={20}
        height={20}
      />
    );
  }

  // Mask so active/inactive can recolor to match Figma (#3F6972 / #B6BDC4)
  return (
    <span
      className={`afm-pill-icon${active ? ' is-active' : ''}`}
      style={{
        WebkitMaskImage: `url("${src}")`,
        maskImage: `url("${src}")`
      }}
      aria-hidden="true"
    />
  );
}
