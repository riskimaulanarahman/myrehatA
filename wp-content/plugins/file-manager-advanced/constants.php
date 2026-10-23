<?php
if ( ! defined( 'ABSPATH' ) ) exit;
/**
 * File Manager Version
 */
if ( !defined('FMA_VERSION') ) {
	define( 'FMA_VERSION', '6.0.0' );
}
/**
 * File Manager UI
 */
if ( !defined('FMA_UI') ) {
   define('FMA_UI', ['toolbar', 'tree', 'path', 'stat']);
}
/**
 * File Manager path
 */
if ( !defined('FMAFILEPATH') ) {
   define('FMAFILEPATH', plugin_dir_path( __FILE__ ));
}
/**
 * Code mirror themes path
 */
if(!defined('FMA_CM_THEMES_PATH')) {
   define('FMA_CM_THEMES_PATH', FMAFILEPATH.'application/library/codemirror/theme');
}
/**
 * File Manager Operations
 */
if ( !defined('FMA_OPERATIONS') ) {
    define('FMA_OPERATIONS', ['mkdir', 'mkfile', 'rename', 'duplicate', 'paste', 'ban', 'archive', 'extract', 'copy', 'cut', 'edit','rm','download', 'upload', 'search', 'info', 'help','empty','resize','preference']);
}

if ( ! defined( 'FMA_PLUGIN_URL' ) ) {
	define( 'FMA_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
}

if ( ! defined( 'FMA_PLUGIN_FILE' ) ) {
	define( 'FMA_PLUGIN_FILE', dirname( __FILE__ ) . '/file_manager_advanced.php' );
}
if ( ! defined( 'FMA_PLUGIN_BASENAME' ) ) {
	define( 'FMA_PLUGIN_BASENAME', plugin_basename( FMA_PLUGIN_FILE ) );
}
if ( ! defined( 'FMA_PLUGIN_SLUG' ) ) {
	define( 'FMA_PLUGIN_SLUG', dirname( FMA_PLUGIN_BASENAME ) );
}

if ( ! function_exists( 'fma_get_pro_plugin_main_file' ) ) {
	/**
	 * Locate the active Pro bootstrap file without hard-coded directory names.
	 *
	 * @return string Absolute path or empty string.
	 */
	function fma_get_pro_plugin_main_file() {
		static $cache = null;
		if ( null !== $cache ) {
			return $cache;
		}
		$cache = '';
		if ( defined( 'FMAP_PLUGIN_FILE' ) && is_string( FMAP_PLUGIN_FILE ) && file_exists( FMAP_PLUGIN_FILE ) ) {
			$cache = FMAP_PLUGIN_FILE;
			return $cache;
		}
		if ( ! defined( 'WP_PLUGIN_DIR' ) || ! is_dir( WP_PLUGIN_DIR ) ) {
			return $cache;
		}
		$patterns = array( '/*/file-manager-advanced-shortcode.php' );
		$active_plugins = function_exists( 'get_option' ) ? (array) get_option( 'active_plugins', array() ) : array();
		$network_plugins = function_exists( 'get_site_option' ) ? (array) get_site_option( 'active_sitewide_plugins', array() ) : array();
		$first_match = '';
		foreach ( $patterns as $pat ) {
			$hits = glob( WP_PLUGIN_DIR . $pat, GLOB_NOSORT );
			if ( is_array( $hits ) ) {
				foreach ( $hits as $path ) {
					if ( file_exists( $path ) ) {
						if ( $first_match === '' ) {
							$first_match = $path;
						}
						$plugin = plugin_basename( $path );
						if ( in_array( $plugin, $active_plugins, true ) || isset( $network_plugins[ $plugin ] ) ) {
							$cache = $path;
							return $cache;
						}
					}
				}
			}
		}
		$cache = $first_match;
		return $cache;
	}
}

if ( ! function_exists( 'fma_get_rest_api_root' ) ) {
	/**
	 * REST API root URL that works when /wp-json/ rewrites are unavailable.
	 *
	 * @return string
	 */
	function fma_get_rest_api_root() {
		return home_url( '/?rest_route=/' );
	}
}

if ( ! function_exists( 'fma_has_react_admin_navigation' ) ) {
	/**
	 * Whether the installed Free plugin exposes Integrations/Logs via the React admin UI.
	 *
	 * @return bool
	 */
	function fma_has_react_admin_navigation() {
		return defined( 'FMA_VERSION' ) && version_compare( FMA_VERSION, '6.0.0', '>=' );
	}
}
