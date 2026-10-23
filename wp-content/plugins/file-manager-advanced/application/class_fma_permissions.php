<?php
/**
 * File Manager Advanced permission helpers.
 *
 * @package File Manager Advanced
 */

defined( 'ABSPATH' ) || exit;

if ( class_exists( 'class_fma_permissions' ) ) {
	return;
}

/**
 * Centralized access control for the file manager.
 */
class class_fma_permissions {

	/**
	 * Whether the current user may use the file manager.
	 *
	 * @return bool
	 */
	public static function user_has_file_manager_access() {
		if ( ! is_user_logged_in() ) {
			return false;
		}

		$capability = self::get_required_capability();

		if ( ! current_user_can( $capability ) ) {
			return false;
		}

		// The `read` capability is granted to every logged-in user; require an allowed role too.
		if ( 'read' === $capability && ! self::user_role_is_allowed() ) {
			return false;
		}

		return true;
	}

	/**
	 * Capability required to render and use the file manager UI.
	 *
	 * @return string
	 */
	public static function get_required_capability() {
		if ( is_multisite() && ! is_network_admin() ) {
			return self::get_network_capability();
		}

		return self::get_fma_capability();
	}

	/**
	 * Single-site capability logic (mirrors class_fma_admin_menus::fmaPer).
	 *
	 * @return string
	 */
	public static function get_fma_capability() {
		$settings               = get_option( 'fmaoptions' );
		$user                   = wp_get_current_user();
		$allowed_fma_user_roles = isset( $settings['fma_user_roles'] ) ? $settings['fma_user_roles'] : array( 'administrator' );

		if ( ! in_array( 'administrator', $allowed_fma_user_roles, true ) ) {
			$fma_user_roles = array_merge( array( 'administrator' ), $allowed_fma_user_roles );
		} else {
			$fma_user_roles = $allowed_fma_user_roles;
		}

		$check_user_role_existence = array_intersect( $fma_user_roles, $user->roles );

		if ( count( $check_user_role_existence ) > 0 && ! in_array( 'administrator', $check_user_role_existence, true ) ) {
			return 'read';
		}

		return 'manage_options';
	}

	/**
	 * Multisite capability logic (mirrors class_fma_admin_menus::networkPer).
	 *
	 * @return string
	 */
	public static function get_network_capability() {
		$settings               = get_option( 'fmaoptions' );
		$user                   = wp_get_current_user();
		$allowed_fma_user_roles = isset( $settings['fma_user_roles'] ) ? $settings['fma_user_roles'] : array();

		$check_user_role_existence = array_intersect( $allowed_fma_user_roles, $user->roles );

		if ( count( $check_user_role_existence ) > 0 ) {
			if ( ! in_array( 'administrator', $check_user_role_existence, true ) ) {
				return 'read';
			}

			return 'manage_options';
		}

		return 'manage_network';
	}

	/**
	 * Whether the current user's role is explicitly allowed in plugin settings.
	 *
	 * @return bool
	 */
	public static function user_role_is_allowed() {
		$settings = get_option( 'fmaoptions' );
		$user     = wp_get_current_user();

		if ( in_array( 'administrator', $user->roles, true ) ) {
			return true;
		}

		$allowed_fma_user_roles = isset( $settings['fma_user_roles'] ) ? $settings['fma_user_roles'] : array( 'administrator' );

		return ! empty( array_intersect( $allowed_fma_user_roles, $user->roles ) );
	}

	/**
	 * Whether the current user has unrestricted filesystem access.
	 *
	 * @return bool
	 */
	public static function has_unrestricted_filesystem_access() {
		return current_user_can( 'manage_options' );
	}

	/**
	 * Base WordPress uploads directory (full sandbox ceiling for non-admins).
	 *
	 * @return string
	 */
	public static function get_uploads_base_path() {
		$upload_dir = wp_upload_dir();

		if ( ! empty( $upload_dir['basedir'] ) ) {
			$path = wp_normalize_path( $upload_dir['basedir'] );
		} else {
			$path = wp_normalize_path( WP_CONTENT_DIR . '/uploads' );
		}

		if ( ! is_dir( $path ) ) {
			wp_mkdir_p( $path );
		}

		return $path;
	}

	/**
	 * Whether a filesystem path is the same as or inside a base directory.
	 *
	 * @param string $path Candidate path.
	 * @param string $base Base directory.
	 * @return bool
	 */
	public static function is_path_within( $path, $base ) {
		$path = wp_normalize_path( untrailingslashit( (string) $path ) );
		$base = wp_normalize_path( untrailingslashit( (string) $base ) );

		if ( '' === $path || '' === $base ) {
			return false;
		}

		return ( $path === $base || 0 === strpos( $path, $base . '/' ) );
	}

	/**
	 * Root directory used to sandbox non-administrator users.
	 * Uses Web Root Path when it is inside uploads; otherwise falls back to uploads.
	 *
	 * @param array|null $settings Optional fmaoptions override.
	 * @return string
	 */
	public static function get_restricted_root_path( $settings = null ) {
		$uploads  = self::get_uploads_base_path();
		$settings = is_array( $settings ) ? $settings : get_option( 'fmaoptions', array() );

		if ( ! empty( $settings['public_path'] ) ) {
			$public_path = wp_normalize_path( $settings['public_path'] );
			if ( self::is_path_within( $public_path, $uploads ) && is_dir( $public_path ) ) {
				return $public_path;
			}
		}

		return $uploads;
	}

	/**
	 * Public URL for the restricted root directory.
	 *
	 * @param array|null $settings Optional fmaoptions override.
	 * @return string
	 */
	public static function get_restricted_root_url( $settings = null ) {
		$settings = is_array( $settings ) ? $settings : get_option( 'fmaoptions', array() );
		$path     = self::get_restricted_root_path( $settings );
		$uploads  = self::get_uploads_base_path();

		if ( function_exists( 'fma_resolve_local_volume_url' ) ) {
			$url = fma_resolve_local_volume_url( $settings, $path );
			if ( '' !== $url ) {
				return untrailingslashit( $url );
			}
		}

		$upload_dir = wp_upload_dir();
		if ( self::is_path_within( $path, $uploads ) && $path !== $uploads ) {
			$relative = ltrim( substr( $path, strlen( $uploads ) ), '/' );
			$baseurl  = ! empty( $upload_dir['baseurl'] ) ? $upload_dir['baseurl'] : content_url( 'uploads' );
			return trailingslashit( untrailingslashit( $baseurl ) . ( $relative ? '/' . $relative : '' ) );
		}

		if ( ! empty( $upload_dir['baseurl'] ) ) {
			return $upload_dir['baseurl'];
		}

		return content_url( 'uploads' );
	}

	/**
	 * Uses the configured Public Root Path when it differs from the default root.
	 *
	 * @param string $configured_path Public Root Path.
	 * @param string $configured_url  Public Root URL.
	 * @return array{path:string,url:string}
	 */
	public static function resolve_restricted_root( $configured_path = '', $configured_url = '' ) {
		$uploads_path    = self::get_restricted_root_path();
		$uploads_url     = self::get_restricted_root_url();
		$configured_path = is_string( $configured_path ) ? trim( $configured_path ) : '';
		$configured_url  = is_string( $configured_url ) ? trim( $configured_url ) : '';

		$default_path = untrailingslashit( wp_normalize_path( ABSPATH ) );

		if ( '' === $configured_path || false !== strpos( $configured_path, '..' ) || $default_path === untrailingslashit( wp_normalize_path( $configured_path ) ) ) {
			return array( 'path' => $uploads_path, 'url' => $uploads_url );
		}

		$real_candidate = realpath( $configured_path );
		$candidate      = untrailingslashit( wp_normalize_path( $real_candidate ? $real_candidate : $configured_path ) );

		if ( '' !== $configured_url && untrailingslashit( site_url() ) !== untrailingslashit( $configured_url ) ) {
			return array( 'path' => $candidate, 'url' => $configured_url );
		}

		$relative = ltrim( substr( $candidate, strlen( $default_path ) ), '/' );
		$url      = '' === $relative ? site_url() : trailingslashit( site_url() ) . $relative;

		return array( 'path' => $candidate, 'url' => $url );
	}

	/**
	 * MIME types denied for non-administrator upload and overwrite operations.
	 *
	 * @return array
	 */
	public static function get_restricted_upload_deny_mimes() {
		return array(
			'text/x-php',
			'application/x-httpd-php',
			'application/x-php',
			'text/javascript',
			'application/javascript',
			'application/x-javascript',
			'text/css',
			'application/x-executable',
			'text/html',
			'application/xhtml+xml',
		);
	}

	/**
	 * PHP/phtml: visible + downloadable, not editable (AFM-989 / AFM-982).
	 * - write:false → Code Editor / put blocked
	 * - locked:true → padlock; rename/cut/delete stay disabled
	 * - Duplicate / Copy / Archive still work (elFinder does not require unlock)
	 * Pattern is end-anchored so archive names like test.php.zip are not treated as PHP.
	 * Register before catch-all attribute patterns — elFinder uses first match.
	 *
	 * @return array
	 */
	public static function get_php_readonly_attributes() {
		return array(
			array(
				'pattern' => '/\.(php\d?|phtml)$/i',
				'read'    => true,
				'write'   => false,
				'hidden'  => false,
				'locked'  => true,
			),
		);
	}

	/**
	 * Volume attribute rules blocking sensitive files for non-administrators.
	 *
	 * @return array
	 */
	public static function get_restricted_file_attributes() {
		return array_merge(
			self::get_php_readonly_attributes(),
			array(
				array(
					'pattern' => '/\.js(\.|$)/i',
					'read'    => false,
					'write'   => false,
					'hidden'  => true,
					'locked'  => true,
				),
				array(
					'pattern' => '/\.css(\.|$)/i',
					'read'    => false,
					'write'   => false,
					'hidden'  => true,
					'locked'  => true,
				),
				array(
					'pattern' => '/\.htaccess$/i',
					'read'    => false,
					'write'   => false,
					'hidden'  => true,
					'locked'  => true,
				),
				array(
					'pattern' => '/wp-config(\.|$)/i',
					'read'    => false,
					'write'   => false,
					'hidden'  => true,
					'locked'  => true,
				),
				array(
					'pattern' => '/\.(html?|xhtml|shtml)$/i',
					'read'    => false,
					'write'   => false,
					'hidden'  => true,
					'locked'  => true,
				),
			)
		);
	}

	/**
	 * Abort AJAX requests from users without file manager access.
	 *
	 * @return void
	 */
	public static function verify_ajax_access() {
		if ( ! self::user_has_file_manager_access() ) {
			wp_die( esc_html__( 'You do not have permission to access the file manager.', 'file-manager-advanced' ), esc_html__( 'Forbidden', 'file-manager-advanced' ), array( 'response' => 403 ) );
		}
	}

	/**
	 * Whether a filename is allowed for non-administrator write operations.
	 *
	 * @param string $name File name.
	 * @return bool
	 */
	public static function is_restricted_write_filename_allowed( $name ) {
		if ( empty( $name ) ) {
			return false;
		}

		return (bool) afm_plugin_file_validName( $name );
	}

	/**
	 * Whether a filename is allowed for non-administrator download operations (AFM-989).
	 * Allows downloading PHP files while keeping sensitive server configuration files blocked.
	 *
	 * @param string $name File name.
	 * @return bool
	 */
	public static function is_restricted_download_filename_allowed( $name ) {
		if ( empty( $name ) ) {
			return false;
		}

		$lower_name = strtolower( $name );

		if (
			strpos( $lower_name, '.htaccess' ) !== false
			|| strpos( $lower_name, 'wp-config' ) !== false
			|| strpos( $lower_name, '.ini' ) !== false
			|| strpos( $lower_name, '.config' ) !== false
		) {
			return false;
		}

		return true;
	}
}
