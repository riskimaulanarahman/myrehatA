<?php
/**
 * Redirect legacy Pro OAuth result pages back to the React admin UI.
 *
 * @package File_Manager_Advanced
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'fma_oauth_should_redirect_legacy_to_react_ui' ) ) {
	/**
	 * Whether OAuth callbacks on legacy afmp-* pages should return to React UI.
	 *
	 * @return bool
	 */
	function fma_oauth_should_redirect_legacy_to_react_ui() {
		return function_exists( 'fma_has_react_admin_navigation' ) && fma_has_react_admin_navigation();
	}
}

if ( ! function_exists( 'fma_oauth_react_redirect_url' ) ) {
	/**
	 * Build a React admin URL for post-OAuth redirects.
	 *
	 * @param array $query_args Query args without the page slug.
	 * @return string
	 */
	function fma_oauth_react_redirect_url( $query_args = array() ) {
		$args = array_merge(
			array(
				'page' => 'file_manager_advanced_ui',
			),
			$query_args
		);

		return add_query_arg( $args, admin_url( 'admin.php' ) );
	}
}

if ( ! function_exists( 'fma_oauth_resolve_redirect_hash' ) ) {
	/**
	 * Resolve the React hash route from OAuth callback query args.
	 *
	 * @param string $default_hash Default hash when state is missing.
	 * @return string
	 */
	function fma_oauth_resolve_redirect_hash( $default_hash ) {
		if ( isset( $_GET['redirect_hash'] ) ) {
			$candidate = sanitize_text_field( wp_unslash( $_GET['redirect_hash'] ) );
			if ( is_string( $candidate ) && strpos( $candidate, '#/' ) === 0 ) {
				return $candidate;
			}
		}

		if ( isset( $_GET['state'] ) ) {
			$state = sanitize_text_field( wp_unslash( $_GET['state'] ) );
			if ( is_string( $state ) && strpos( $state, '#/' ) === 0 ) {
				return $state;
			}
			if ( is_string( $state ) && strpos( $state, 'afm_google_auth_' ) === 0 ) {
				$candidate = substr( $state, strlen( 'afm_google_auth_' ) );
				if ( is_string( $candidate ) && strpos( $candidate, '#/' ) === 0 ) {
					return $candidate;
				}
			}
		}

		return $default_hash;
	}
}

if ( ! function_exists( 'fma_maybe_redirect_legacy_oauth_to_react_ui' ) ) {
	/**
	 * Intercept released Pro legacy integration pages after OAuth connect/disconnect.
	 */
	function fma_maybe_redirect_legacy_oauth_to_react_ui() {
		if ( ! is_admin() || wp_doing_ajax() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
			return;
		}
		if ( ! fma_oauth_should_redirect_legacy_to_react_ui() || ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$page = isset( $_GET['page'] ) ? sanitize_text_field( wp_unslash( $_GET['page'] ) ) : '';
		if ( '' === $page ) {
			return;
		}

		$integrations = array(
			'afmp-googledrive' => array(
				'connected_transient' => 'afmp_googledrive_connected',
				'connected_param'     => 'googledrive_connected',
				'error_transient'     => 'afmp_googledrive_error',
				'error_param'         => 'googledrive_error',
				'disconnected_transient' => 'afmp_googledrive_disconnected',
				'disconnected_param'  => 'googledrive_disconnected',
				'default_hash'        => '#/extension/google-drive',
			),
			'afmp-dropbox'     => array(
				'connected_transient'       => 'afmp_dropbox_success',
				'connected_transient_value' => 'connected',
				'connected_param'           => 'dropbox_connected',
				'error_transient'           => 'afmp_dropbox_error',
				'error_param'               => 'dropbox_error',
				'disconnected_transient'    => 'afmp_dropbox_success',
				'disconnected_transient_value' => 'disconnected',
				'disconnected_param'        => 'dropbox_disconnected',
				'default_hash'              => '#/extension/dropbox',
			),
			'afmp-pcloud'      => array(
				'connected_param'    => 'pcloud_connected',
				'error_transient'    => 'afmp_pcloud_error',
				'error_param'        => 'pcloud_error',
				'disconnected_param' => 'pcloud_disconnected',
				'default_hash'       => '#/extension/pcloud',
			),
			'afmp-onedrive'    => array(
				'connected_transient' => 'afmp_onedrive_connected',
				'connected_param'     => 'onedrive_connected',
				'error_transient'     => 'afmp_onedrive_error',
				'error_param'         => 'onedrive_error',
				'disconnected_transient' => 'afmp_onedrive_disconnected',
				'disconnected_param'  => 'onedrive_disconnected',
				'default_hash'        => '#/extension/onedrive',
			),
		);

		if ( ! isset( $integrations[ $page ] ) ) {
			return;
		}

		$config        = $integrations[ $page ];
		$redirect_hash = fma_oauth_resolve_redirect_hash( $config['default_hash'] );
		$args          = array(
			'redirect_hash' => $redirect_hash,
		);
		$should_redirect = false;

		if ( ! empty( $config['connected_transient'] ) ) {
			$transient_value = get_transient( $config['connected_transient'] );
			if ( false !== $transient_value ) {
				$expected = isset( $config['connected_transient_value'] ) ? $config['connected_transient_value'] : null;
				if ( null === $expected || $transient_value === $expected ) {
					delete_transient( $config['connected_transient'] );
					$args[ $config['connected_param'] ] = '1';
					$should_redirect                    = true;
				}
			}
		}

		if ( ! $should_redirect && ! empty( $config['connected_param'] ) && isset( $_GET[ $config['connected_param'] ] ) && '1' === sanitize_text_field( wp_unslash( $_GET[ $config['connected_param'] ] ) ) ) {
			$args[ $config['connected_param'] ] = '1';
			$should_redirect                    = true;
		}

		if ( ! empty( $config['error_transient'] ) ) {
			$error_message = get_transient( $config['error_transient'] );
			if ( false !== $error_message ) {
				delete_transient( $config['error_transient'] );
				$args[ $config['error_param'] ] = '1';
				if ( is_string( $error_message ) && '' !== $error_message ) {
					$args['error_msg'] = $error_message;
				}
				$should_redirect = true;
			}
		}

		if ( ! empty( $config['disconnected_transient'] ) ) {
			$transient_value = get_transient( $config['disconnected_transient'] );
			if ( false !== $transient_value ) {
				$expected = isset( $config['disconnected_transient_value'] ) ? $config['disconnected_transient_value'] : null;
				if ( null === $expected || $transient_value === $expected ) {
					delete_transient( $config['disconnected_transient'] );
					$args[ $config['disconnected_param'] ] = '1';
					$should_redirect                       = true;
				}
			}
		}

		if ( ! $should_redirect && ! empty( $config['disconnected_param'] ) && isset( $_GET[ $config['disconnected_param'] ] ) && '1' === sanitize_text_field( wp_unslash( $_GET[ $config['disconnected_param'] ] ) ) ) {
			$args[ $config['disconnected_param'] ] = '1';
			$should_redirect                       = true;
		}

		if ( ! $should_redirect ) {
			return;
		}

		wp_safe_redirect( fma_oauth_react_redirect_url( $args ) );
		exit;
	}

	add_action( 'admin_init', 'fma_maybe_redirect_legacy_oauth_to_react_ui', 0 );
}

if ( ! function_exists( 'fma_maybe_handle_onedrive_site_oauth_callback' ) ) {
	/**
	 * Handle OneDrive OAuth return on site_url (frontend).
	 *
	 * New Free React UI uses site_url as redirect_uri (Azure-compatible with release apps).
	 * Released Pro often never consumes ?code= on the homepage, so users get stuck on
	 * https://example.com/?code=...&state=#/extension/onedrive — Free must finish the exchange.
	 *
	 * @return void
	 */
	function fma_maybe_handle_onedrive_site_oauth_callback() {
		if ( is_admin() || wp_doing_ajax() || wp_doing_cron() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
			return;
		}
		if ( empty( $_GET['code'] ) || ! is_user_logged_in() || ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$state = isset( $_GET['state'] ) ? wp_unslash( $_GET['state'] ) : '';
		$state = is_string( $state ) ? rawurldecode( $state ) : '';
		// Only OneDrive — Dropbox/Google also use #/extension/* as state on site_url.
		if ( ! is_string( $state ) || false === stripos( $state, 'onedrive' ) ) {
			return;
		}

		$code = sanitize_text_field( wp_unslash( $_GET['code'] ) );
		if ( '' === $code ) {
			return;
		}

		$redirect_hash = ( is_string( $state ) && 0 === strpos( $state, '#/' ) )
			? $state
			: '#/extension/onedrive';

		// Prefer Pro helper when available (new Pro).
		if ( class_exists( '\AFMP\Modules\Onedrive' ) && is_callable( array( '\AFMP\Modules\Onedrive', 'handle_oauth_callback' ) ) ) {
			$result = \AFMP\Modules\Onedrive::handle_oauth_callback( $code, $state );
			if ( is_wp_error( $result ) ) {
				wp_safe_redirect(
					fma_oauth_react_redirect_url(
						array(
							'onedrive_error' => '1',
							'error_msg'      => $result->get_error_message(),
							'redirect_hash'  => $redirect_hash,
						)
					)
				);
				exit;
			}
			wp_safe_redirect( $result );
			exit;
		}

		// Released Pro fallback: exchange the code here using stored credentials + site_url.
		$settings = get_option( 'afmp__onedrive_settings', array() );
		if ( ! is_array( $settings ) ) {
			$settings = array();
		}
		$app_id     = isset( $settings['app_id'] ) ? (string) $settings['app_id'] : '';
		$app_secret = isset( $settings['app_secret'] ) ? (string) $settings['app_secret'] : '';
		$enabled    = ! empty( $settings['enable'] ) && 'yes' === $settings['enable'];
		if ( ! $enabled || '' === $app_id || '' === $app_secret ) {
			return;
		}

		$redirect_uri = ! empty( $settings['redirect_uri'] )
			? untrailingslashit( esc_url_raw( $settings['redirect_uri'] ) )
			: untrailingslashit( site_url() );

		$response = wp_remote_post(
			'https://login.microsoftonline.com/common/oauth2/v2.0/token',
			array(
				'timeout' => 30,
				'body'    => array(
					'client_id'     => $app_id,
					'scope'         => 'files.readwrite.all offline_access',
					'code'          => $code,
					'grant_type'    => 'authorization_code',
					'redirect_uri'  => $redirect_uri,
					'client_secret' => $app_secret,
				),
			)
		);

		$error_redirect = fma_oauth_react_redirect_url(
			array(
				'onedrive_error' => '1',
				'redirect_hash'  => $redirect_hash,
			)
		);

		if ( is_wp_error( $response ) ) {
			set_transient( 'afmp_onedrive_error', __( 'OneDrive connection failed: Unable to communicate with Microsoft servers.', 'file-manager-advanced' ), 30 );
			wp_safe_redirect( $error_redirect );
			exit;
		}

		$body = json_decode( wp_remote_retrieve_body( $response ) );
		if ( isset( $body->access_token ) && isset( $body->refresh_token ) ) {
			update_option( 'afmp__onedrive_access_token', sanitize_text_field( $body->access_token ) );
			update_option( 'afmp__onedrive_refresh_token', sanitize_text_field( $body->refresh_token ) );
			$expires_in = isset( $body->expires_in ) ? (int) $body->expires_in : 3600;
			update_option( 'afmp__onedrive_token_expiry', time() + $expires_in );
			set_transient( 'afmp_onedrive_connected', __( 'Successfully connected to OneDrive.', 'file-manager-advanced' ), 30 );

			wp_safe_redirect(
				fma_oauth_react_redirect_url(
					array(
						'onedrive_connected' => '1',
						'redirect_hash'      => $redirect_hash,
					)
				)
			);
			exit;
		}

		$error_description = isset( $body->error_description ) ? (string) $body->error_description : '';
		if ( '' === $error_description ) {
			$error_description = __( 'OneDrive connection failed. Please check your credentials.', 'file-manager-advanced' );
		}
		set_transient( 'afmp_onedrive_error', $error_description, 30 );
		wp_safe_redirect(
			add_query_arg(
				array( 'error_msg' => $error_description ),
				$error_redirect
			)
		);
		exit;
	}

	add_action( 'init', 'fma_maybe_handle_onedrive_site_oauth_callback', 5 );
}
