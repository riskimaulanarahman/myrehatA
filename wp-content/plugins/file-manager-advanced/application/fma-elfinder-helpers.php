<?php
/**
 * elFinder connector helpers (admin + frontend blocks).
 *
 * Restored for backward compatibility when Pro is not upgraded alongside Free.
 *
 * @package File_Manager_Advanced
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! function_exists( 'fma_resolve_local_volume_url' ) ) {
	/**
	 * Resolve the public URL for the local filesystem volume (AFM-906).
	 *
	 * Prefer an explicit Files URL only when it is safe. When the File Manager
	 * root sits above the WordPress install (common on InstaWP: public_html root
	 * while WP lives under /i/), return an empty URL so elFinder streams files
	 * through the connector instead of building broken /{subdir}/wp-content links.
	 *
	 * @param array  $settings Plugin fmaoptions.
	 * @param string $path     Absolute filesystem root for the volume.
	 * @return string Trailing-slash URL, or empty to force connector streaming.
	 */
	function fma_resolve_local_volume_url( $settings, $path = '' ) {
		$settings = is_array( $settings ) ? $settings : array();

		if ( isset( $settings['hide_path'] ) && (string) $settings['hide_path'] === '1' ) {
			return '';
		}

		$path        = wp_normalize_path( ! empty( $path ) ? $path : ABSPATH );
		$abspath     = wp_normalize_path( untrailingslashit( ABSPATH ) );
		$content_dir = wp_normalize_path( untrailingslashit( WP_CONTENT_DIR ) );
		$home_url    = trailingslashit( home_url( '/' ) );
		$site_url    = trailingslashit( site_url( '/' ) );

		$root_above_wp = ( $path !== $abspath && strpos( $abspath, trailingslashit( $path ) ) === 0 );

		// Explicit Files URL — ignore defaults that simply copy home/site URL when root is above WP.
		if ( ! empty( $settings['public_url'] ) ) {
			$configured = trailingslashit( esc_url_raw( $settings['public_url'] ) );
			$is_default_wp_url = ( $configured === $home_url || $configured === $site_url );
			if ( ! ( $root_above_wp && $is_default_wp_url ) ) {
				return $configured;
			}
		}

		// Root is the web docroot / parent of WP → connector streaming avoids /i/wp-content 404s.
		if ( $root_above_wp ) {
			return '';
		}

		if ( $path === $content_dir || strpos( $path, $content_dir . '/' ) === 0 ) {
			$relative = ltrim( substr( $path, strlen( $content_dir ) ), '/' );
			return trailingslashit( content_url( $relative ) );
		}

		if ( $path === $abspath || strpos( $path, $abspath . '/' ) === 0 ) {
			$relative = ltrim( substr( $path, strlen( $abspath ) ), '/' );
			return trailingslashit( home_url( '/' . $relative ) );
		}

		// Unknown root outside WP — safer to stream via connector than guess a public URL.
		return '';
	}
}

if ( ! function_exists( 'fma_create_elfinder_connector' ) ) {
	/**
	 * Create a stream-safe elFinder connector instance.
	 *
	 * @param elFinder $elfinder Configured elFinder instance.
	 * @return elFinderConnector|fma_elFinderConnector
	 */
	function fma_create_elfinder_connector( $elfinder ) {
		if ( ! class_exists( 'elFinderConnector' ) ) {
			$autoload = defined( 'FMAFILEPATH' )
				? FMAFILEPATH . 'application/library/php/autoload.php'
				: WP_PLUGIN_DIR . '/file-manager-advanced/application/library/php/autoload.php';
			if ( file_exists( $autoload ) ) {
				require_once $autoload;
			}
		}

		if ( ! class_exists( 'fma_elFinderConnector' ) ) {
			$connector_file = defined( 'FMAFILEPATH' )
				? FMAFILEPATH . 'application/class_fma_elfinder_connector.php'
				: WP_PLUGIN_DIR . '/file-manager-advanced/application/class_fma_elfinder_connector.php';
			if ( file_exists( $connector_file ) && class_exists( 'elFinderConnector' ) ) {
				require_once $connector_file;
			}
		}

		if ( class_exists( 'fma_elFinderConnector' ) ) {
			return new fma_elFinderConnector( $elfinder );
		}

		return new elFinderConnector( $elfinder );
	}
}
