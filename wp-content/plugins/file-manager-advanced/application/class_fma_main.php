<?php
/**
 * File Manager Advanced Main Class
 *
 * @package: File Manager Advanced
 * @Class: fma_main
 */

defined( 'ABSPATH' ) || exit;

if ( class_exists( 'class_fma_main' ) ) {
	return;
}

/**
 * Main Class
 */
class class_fma_main {
	/**
	 * Known SMTP plugin main files.
	 *
	 * @var array
	 */
	private $smtp_plugins = array(
		'post-smtp/postman-smtp.php',
		'wp-mail-smtp/wp_mail_smtp.php',
		'wp-mail-smtp-pro/wp_mail_smtp_pro.php',
		'easy-wp-smtp/easy-wp-smtp.php',
		'fluent-smtp/fluent-smtp.php',
		'gosmtp/gosmtp.php',
		'smtp-mailer/smtp-mailer.php',
		'suremails/suremails.php',
		'mailin/mailin.php',
		'site-mailer/site-mailer.php',
		'wp-smtp/wp-smtp.php',
	);
	/**
	 * Settings
	 *
	 * @var false|mixed|null $settings Plugin settings.
	 */
	public $settings;

	/**
	 * SMTP Recommendation instance (optional)
	 *
	 * @var mixed
	 */
	public $recommend_smtp;

	/**
	 * Constructor
	 */
	public function __construct() {
		add_action( 'admin_menu', array( &$this, 'fma_menus' ) );
		add_action( 'admin_menu', array( &$this, 'fma_prioritize_fm_submenu' ), 99999 );
		add_action( 'admin_print_footer_scripts', array( &$this, 'fma_sidebar_fm_tab_link_script' ), 20 );
		add_action( 'admin_enqueue_scripts', array( &$this, 'fma_scripts' ) );
		add_action( 'admin_head', array( &$this, 'hide_smtp_submenu_css' ) );
		add_action( 'wp_ajax_fma_load_fma_ui', array( &$this, 'fma_load_fma_ui' ) );
		add_action( 'wp_ajax_fma_review_ajax', array( $this, 'fma_review_ajax' ) );
		add_action( 'wp_ajax_fma_save_php_file', array( $this, 'fma_save_php_file' ) );
		add_action( 'wp_ajax_fma_debug_php', array( $this, 'fma_debug_php' ) );
		$this->settings = get_option( 'fmaoptions' );

		add_action( 'admin_init', array( $this, 'admin_init' ) );
		
		// Initialize SMTP recommendation
		$this->init_smtp_recommendation();
	}

	/**
	 * Load Menus
	 */
	public function fma_menus() {
		include 'class_fma_admin_menus.php';
		$fma_menus = new class_fma_admin_menus();
		$fma_menus->load_menus();
	}

	/**
	 * Keep the React UI submenu first so the parent menu item does not point at another module (e.g. DB tools).
	 */
	public function fma_prioritize_fm_submenu() {
		global $submenu;
		$parent = 'file_manager_advanced_ui';
		if ( empty( $submenu[ $parent ] ) || ! is_array( $submenu[ $parent ] ) ) {
			return;
		}
		$items = array_values( $submenu[ $parent ] );
		$idx   = -1;
		foreach ( $items as $i => $item ) {
			if ( isset( $item[2] ) && $parent === $item[2] ) {
				$idx = $i;
				break;
			}
		}
		if ( $idx <= 0 ) {
			return;
		}
		$row = $items[ $idx ];
		unset( $items[ $idx ] );
		array_unshift( $items, $row );
		$submenu[ $parent ] = array_values( $items );
	}

	/**
	 * Point the admin sidebar "File Manager" entry at the React File Manager tab (#/filemanager).
	 * Runs on all admin screens so it works when another tab is open on the same page load.
	 */
	public function fma_sidebar_fm_tab_link_script() {
		$base   = admin_url( 'admin.php?page=file_manager_advanced_ui' );
		$target = $base . '#/filemanager';
		?>
		<script>
		(function () {
			var root = document.getElementById('toplevel_page_file_manager_advanced_ui');
			if (!root) return;
			var target = <?php echo wp_json_encode( $target ); ?>;
			var base = <?php echo wp_json_encode( $base ); ?>;
			function isFmaReactAdminPage() {
				try {
					return new URLSearchParams(window.location.search).get('page') === 'file_manager_advanced_ui';
				} catch (e) {
					return false;
				}
			}
			function isOnFileManagerTab() {
				var hash = (window.location.hash || '').replace(/^#\/?/, '').toLowerCase();
				return hash === 'filemanager' || hash.indexOf('filemanager/') === 0;
			}
			function isMainFmUiLink(a) {
				var href = a.getAttribute('href');
				if (!href || href.indexOf('page=file_manager_advanced_ui') === -1) return false;
				var path = href.split('#')[0];
				try {
					var u = new URL(path, window.location.href);
					if (u.searchParams.get('page') !== 'file_manager_advanced_ui') return false;
					return u.searchParams.toString() === 'page=file_manager_advanced_ui';
				} catch (e) {
					return false;
				}
			}
			root.querySelectorAll('a[href]').forEach(function (a) {
				if (!isMainFmUiLink(a)) return;
				a.setAttribute('href', target);
				a.addEventListener('click', function (e) {
					if (e.defaultPrevented) return;
					if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
					if (!isFmaReactAdminPage()) return;
					e.preventDefault();
					try {
						sessionStorage.setItem('afm-active-tab', 'filemanager');
						sessionStorage.removeItem('afm-should-restore-tab');
					} catch (err) {}
					if (!isOnFileManagerTab()) {
						if (window.history && window.history.replaceState) {
							window.history.replaceState(null, '', base + '#/filemanager');
						} else {
							window.location.hash = '#/filemanager';
						}
						window.location.reload();
						return;
					}
					window.dispatchEvent(new CustomEvent('afm-filemanager-tab-activated'));
				});
			});
		})();
		</script>
		<?php
	}

	/**
	 * Hide SMTP submenu item visually while keeping page accessible.
	 *
	 * @return void
	 */
	public function hide_smtp_submenu_css() {
		$smtp_page = $this->get_smtp_recommend_page_slug();
		echo '<style>#adminmenu a[href*="' . esc_attr( $smtp_page ) . '"]{display:none!important;}</style>';

		// Embed mode for SMTP page inside Notifications tab iframe.
		if ( isset( $_GET['page'], $_GET['afm_embed'] )
			&& $smtp_page === sanitize_text_field( wp_unslash( $_GET['page'] ) )
			&& '1' === sanitize_text_field( wp_unslash( $_GET['afm_embed'] ) ) ) {
			echo '<style>
				html.wp-toolbar{padding-top:0!important;}
				#wpadminbar, #adminmenumain, #screen-meta, #screen-meta-links, #wpfooter, #wpbody-content > .notice{display:none!important;}
				#wpcontent, #wpbody, .auto-fold #wpcontent{margin-left:0!important;padding-left:0!important;}
				#wpbody-content{padding:0!important;margin:0!important;}
				.wrap{margin:0!important;padding:0!important;}
			</style>';
		}
	}

	/**
	 * Load File Manager UI
	 */
	public function fma_load_fma_ui() {
		// Keep binary download streams clean.
		while ( ob_get_level() ) {
			ob_end_clean();
		}

		class_fma_permissions::verify_ajax_access();

		$nonce = isset( $_REQUEST['_fmakey'] ) ? sanitize_text_field( wp_unslash( $_REQUEST['_fmakey'] ) ) : '';
		if ( '' === $nonce || ! wp_verify_nonce( $nonce, 'fmaskey' ) ) {
			status_header( 403 );
			exit;
		}

		if ( function_exists( 'wp_raise_memory_limit' ) ) {
			wp_raise_memory_limit( 'admin' );
		}

		if ( ! class_exists( 'class_fma_connector' ) ) {
			require_once FMAFILEPATH . 'application/class_fma_connector.php';
		}

		$fma_connector = new class_fma_connector();
		$fma_connector->fma_local_file_system();
	}

	/**
	 * Load Scripts
	 *
	 * @param string $hook The current admin page.
	 */
	public function fma_scripts( $hook ) {
		$locale             = isset( $this->settings['fma_locale'] ) ? sanitize_file_name( $this->settings['fma_locale'] ) : 'en';
		$display_ui_options = isset( $this->settings['display_ui_options'] ) ? $this->settings['display_ui_options'] : FMA_UI;
		$cm_theme           = isset( $this->settings['fma_cm_theme'] ) ? $this->settings['fma_cm_theme'] : 'default';
		$library_url        = FMA_PLUGIN_URL . 'application/library/';
		$hide_path          = false;
		if ( isset( $this->settings['hide_path'] ) && 1 === absint( $this->settings['hide_path'] ) ) {
			$hide_path = true;
		}

		if ( 'toplevel_page_file_manager_advanced_ui' === $hook ) {
			if ( isset( $_GET['page'] ) && 'file_manager_advanced_ui' === sanitize_text_field( wp_unslash( $_GET['page'] ) ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
				wp_enqueue_style( 'elfinder.jquery-ui', $library_url . 'jquery/jquery-ui.min.css', array(), FMA_VERSION, 'all' );
				wp_enqueue_style( 'elfinder', $library_url . 'css/elfinder.min.css', array(), FMA_VERSION, 'all' );
				wp_enqueue_style( 'elfinder.theme', $library_url . 'css/theme.css', array(), FMA_VERSION, 'all' );
				wp_enqueue_style( 'codemirror', $library_url . 'codemirror/lib/codemirror.css', array(), FMA_VERSION, 'all' );

				if ( isset( $this->settings['fma_theme'] ) && in_array( $this->settings['fma_theme'], array( 'dark', 'grey', 'windows10', 'bootstrap', 'mono', 'm-light', 'moono' ), true ) ) {
					wp_enqueue_style( 'elfinder.preview', $library_url . 'themes/' . $this->settings['fma_theme'] . '/css/theme.css', array(), FMA_VERSION, 'all' );
				}

				wp_enqueue_style( 'elfinder.styles', FMA_PLUGIN_URL . 'application/assets/css/custom_style_filemanager_advanced.css', array(), FMA_VERSION, 'all' );

				wp_enqueue_script( 'elfinder', $library_url . 'js/elfinder.min.js', array( 'jquery', 'jquery-ui-core', 'jquery-ui-selectable', 'jquery-ui-draggable', 'jquery-ui-droppable', 'jquery-ui-resizable', 'jquery-ui-dialog', 'jquery-ui-slider', 'jquery-ui-tabs' ), FMA_VERSION, true );
				wp_enqueue_script( 'codemirror', $library_url . 'codemirror/lib/codemirror.js', array(), FMA_VERSION, true );
				wp_enqueue_script( 'codemirror.htmlmixed', $library_url . 'codemirror/mode/htmlmixed/htmlmixed.js', array(), FMA_VERSION, true );
				wp_enqueue_script( 'codemirror.xml', $library_url . 'codemirror/mode/xml/xml.js', array(), FMA_VERSION, true );
				wp_enqueue_script( 'codemirror.css', $library_url . 'codemirror/mode/css/css.js', array(), FMA_VERSION, true );
				wp_enqueue_script( 'codemirror.javascript', $library_url . 'codemirror/mode/javascript/javascript.js', array(), FMA_VERSION, true );
				wp_enqueue_script( 'codemirror.clike', $library_url . 'codemirror/mode/clike/clike.js', array(), FMA_VERSION, true );
				wp_enqueue_script( 'codemirror.php', $library_url . 'codemirror/mode/php/php.js', array(), FMA_VERSION, true );

				if ( 'en' !== $locale ) {
					wp_enqueue_script( 'elfinder.language', $library_url . sprintf( 'js/i18n/elfinder.%s.js', $locale ), array( 'elfinder' ), FMA_VERSION, true );
				}

				if ( 'default' !== $cm_theme ) {
					wp_enqueue_style( 'codemirror.theme', $library_url . 'codemirror/theme/' . $cm_theme . '.css', array(), FMA_VERSION, 'all' );
				}

				$fma_elfinder_commands_file = FMAFILEPATH . 'application/assets/js/fma-elfinder-commands.js';
				$elfinder_script_file       = FMAFILEPATH . 'application/assets/js/elfinder_script.js';
				$fma_elfinder_security_file = FMAFILEPATH . 'application/assets/js/fma-elfinder-security.js';
				$fma_elfinder_shared_file   = FMAFILEPATH . 'application/assets/js/fma-elfinder-shared.js';
				$fma_elfinder_commands_ver  = file_exists( $fma_elfinder_commands_file ) ? filemtime( $fma_elfinder_commands_file ) : FMA_VERSION;
				$elfinder_script_ver        = file_exists( $elfinder_script_file ) ? filemtime( $elfinder_script_file ) : FMA_VERSION;
				$fma_elfinder_security_ver  = file_exists( $fma_elfinder_security_file ) ? filemtime( $fma_elfinder_security_file ) : FMA_VERSION;
				$fma_elfinder_shared_ver    = file_exists( $fma_elfinder_shared_file ) ? filemtime( $fma_elfinder_shared_file ) : FMA_VERSION;
				wp_enqueue_script( 'fma-elfinder-security', FMA_PLUGIN_URL . 'application/assets/js/fma-elfinder-security.js', array( 'jquery', 'elfinder' ), $fma_elfinder_security_ver, true );
				wp_enqueue_script( 'fma-elfinder-commands', FMA_PLUGIN_URL . 'application/assets/js/fma-elfinder-commands.js', array( 'jquery', 'elfinder', 'fma-elfinder-security' ), $fma_elfinder_commands_ver, true );
				wp_enqueue_script( 'fma-elfinder-shared', FMA_PLUGIN_URL . 'application/assets/js/fma-elfinder-shared.js', array( 'jquery', 'elfinder', 'fma-elfinder-security', 'fma-elfinder-commands' ), $fma_elfinder_shared_ver, true );
				wp_enqueue_script( 'elfinder.script', FMA_PLUGIN_URL . 'application/assets/js/elfinder_script.js', array( 'jquery', 'fma-elfinder-security', 'fma-elfinder-commands', 'fma-elfinder-shared' ), $elfinder_script_ver, true );
				wp_localize_script(
					'elfinder.script',
					'afm_object',
					array(
						'ajaxurl'   => admin_url( 'admin-ajax.php' ),
						'nonce'     => wp_create_nonce( 'fmaskey' ),
						'locale'    => $locale,
						'ui'        => $display_ui_options,
						'cm_theme'  => $cm_theme,
						'hide_path' => $hide_path,
						'plugin_url' => FMA_PLUGIN_URL,
						'debug_enabled' => ( isset( $this->settings['fma_debug_enabled'] ) && ( '1' === (string) $this->settings['fma_debug_enabled'] || 1 === absint( $this->settings['fma_debug_enabled'] ) ) ) ? '1' : '0',
						// When true, elfinder_script.js skips jQuery.elfinder() — React FileManagerPanel REST-fetches settings and owns init/reinit (fixes stale View Type / CodeMirror theme until full page reload).
						'react_shell' => true,
					)
				);

				// Enqueue React-based admin shell
				wp_enqueue_style( 'wp-components' );
				// Media library for notification Quill image picker.
				wp_enqueue_media();
				$afm_react_admin_css = FMAFILEPATH . 'application/assets/css/afm-react-admin.css';
				$afm_react_admin_ver = file_exists( $afm_react_admin_css ) ? (string) filemtime( $afm_react_admin_css ) : FMA_VERSION;
				wp_enqueue_style( 'afm-react-admin', FMA_PLUGIN_URL . 'application/assets/css/afm-react-admin.css', array( 'wp-components' ), $afm_react_admin_ver, 'all' );
				// Enqueue moment.js and daterangepicker for Logs tab if pro plugin files exist
				$pro_main         = function_exists( 'fma_get_pro_plugin_main_file' ) ? fma_get_pro_plugin_main_file() : '';
				$pro_logs_path    = $pro_main ? plugin_dir_path( $pro_main ) . 'includes/modules/filelogs/assets/' : '';
				if ( $pro_logs_path !== '' && file_exists( $pro_logs_path . 'js/moment.min.js' ) ) {
					wp_enqueue_script( 'afmp-moment', plugins_url( 'includes/modules/filelogs/assets/js/moment.min.js', $pro_main ), array(), FMA_VERSION, true );
				} elseif ( ! wp_script_is( 'moment', 'enqueued' ) && ! wp_script_is( 'afmp-moment', 'enqueued' ) ) {
					wp_enqueue_script( 'moment', 'https://cdn.jsdelivr.net/npm/moment@2.29.4/moment.min.js', array(), '2.29.4', true );
				}
				if ( $pro_logs_path !== '' && file_exists( $pro_logs_path . 'js/daterangepicker.js' ) && file_exists( $pro_logs_path . 'css/daterangepicker.css' ) ) {
					wp_enqueue_style( 'daterangepicker-css', plugins_url( 'includes/modules/filelogs/assets/css/daterangepicker.css', $pro_main ), array(), FMA_VERSION );
					$moment_handle = wp_script_is( 'afmp-moment', 'enqueued' ) ? 'afmp-moment' : 'moment';
					wp_enqueue_script( 'daterangepicker', plugins_url( 'includes/modules/filelogs/assets/js/daterangepicker.js', $pro_main ), array( 'jquery', $moment_handle ), FMA_VERSION, true );
				}
				// Enqueue built React app (use dist file if it exists, fallback to source)
				$react_admin_file = FMAFILEPATH . 'application/assets/dist/afm-react-admin.js';
				if ( file_exists( $react_admin_file ) ) {
					// Built file includes React (bundled)
					wp_enqueue_script(
						'afm-react-admin',
						FMA_PLUGIN_URL . 'application/assets/dist/afm-react-admin.js',
						array( 'jquery', 'elfinder', 'fma-elfinder-security', 'fma-elfinder-shared', 'elfinder.script' ),
						filemtime( $react_admin_file ),
						true
					);
				} else {
					// Fallback to source file if dist doesn't exist
					$react_admin_src_file = FMAFILEPATH . 'application/assets/js/afm-react-admin.js';
					$react_admin_src_ver  = file_exists( $react_admin_src_file ) ? filemtime( $react_admin_src_file ) : FMA_VERSION;
					wp_enqueue_script( 'afm-react-admin', FMA_PLUGIN_URL . 'application/assets/js/afm-react-admin.js', array( 'wp-element', 'wp-components', 'jquery' ), $react_admin_src_ver, true );
				}
				// Get current plan if Pro is active
				$current_plan = 'free';
				if ( class_exists( 'AFMP\\PlanFeatures' ) ) {
					$plan_features = \AFMP\PlanFeatures::get_instance();
					$current_plan = $plan_features->get_current_plan();
				}
				
				$fm_only_access = class_exists( 'class_fma_admin_menus' ) && class_fma_admin_menus::is_file_manager_only_user();
				$is_appsumo = defined( 'AFMP_IS_APPSUMO' ) && AFMP_IS_APPSUMO;

				wp_localize_script( 'afm-react-admin', 'afmReact', array(
					'settingsUrl' => admin_url( 'admin.php?page=file_manager_advanced_controls' ),
					'siteUrl' => untrailingslashit( site_url() ),
					'docsUrl' => 'https://advancedfilemanager.com/documentation/',
					'supportUrl' => 'https://objectsws.atlassian.net/servicedesk/customer/portal/37',
					'ajaxUrl' => admin_url( 'admin-ajax.php' ),
					'pluginUrl' => FMA_PLUGIN_URL,
					'pluginURL' => FMA_PLUGIN_URL,
					'roles' => wp_roles()->roles,
					'fmOnlyAccess' => $fm_only_access,
					'jsonURL' => fma_get_rest_api_root(),
					'nonce' => wp_create_nonce( 'wp_rest' ),
					'proImagesURL' => ( function_exists( 'fma_get_pro_plugin_main_file' ) && fma_get_pro_plugin_main_file() ) ? plugins_url( 'images/', fma_get_pro_plugin_main_file() ) : '',
					'hasPro' => class_fma_main::has_pro() || class_exists( 'file_manager_advanced_shortcode' ),
					'hideBanner' => ( 'yes' === get_option( '_fma_banner_hide', 'no' ) ) || class_fma_main::has_pro(),
					'hasFileLogs' => function_exists( 'afmp_is_feature_available' ) && afmp_is_feature_available( 'filelogs' ),
					'hasActiveSmtpPlugin' => $this->is_any_smtp_plugin_active(),
					'smtpSettingsUrl' => admin_url( 'admin.php?page=' . $this->get_smtp_recommend_page_slug() ),
					'currentPlan' => $current_plan, // 'free', 'basic', 'professional', 'business'
					'pricingUrl' => 'https://advancedfilemanager.com/pricing/?utm_source=plugin&utm_medium=dashboard_card&utm_campaign=plugin',
					'fmPricingUrl' => 'https://advancedfilemanager.com/pricing/?utm_source=plugin&utm_medium=file_manager_screen_side_banner&utm_campaign=plugin',
					'version' => FMA_VERSION,
					'proVersion' => defined('fmas_ver') ? fmas_ver : '',
					'isAppSumo' => $is_appsumo,
					'showPlanAccess' => ! $is_appsumo,
				) );
				// Force a stable REST root for environments where /wp-json/ rewrites are not active.
				wp_add_inline_script(
					'afm-react-admin',
					'window.wpApiSettings = Object.assign({}, window.wpApiSettings || {}, { root: ' . wp_json_encode( fma_get_rest_api_root() ) . ', nonce: ' . wp_json_encode( wp_create_nonce( 'wp_rest' ) ) . ' });',
					'before'
				);
			}
		}

		wp_register_style( 'afm-jquery.select2', FMA_PLUGIN_URL . 'application/assets/css/select2/jquery.select2.min.css', array(), FMA_VERSION, 'all' );
		wp_register_script( 'afm-jquery.select2', FMA_PLUGIN_URL . 'application/assets/js/select2/jquery.select2.min.js', array( 'jquery' ), FMA_VERSION, true );
		
		if ( in_array( $hook, array( 'file-manager_page_file_manager_advanced_controls', 'file-manager_page_file_manager_advanced_shortcodes', 'file-manager_page_afmp-adminer', 'file-manager_page_afmp-dropbox', 'file-manager_page_afmp-googledrive', 'file-manager_page_afmp-googlecloud', 'file-manager_page_afmp-github', 'toplevel_page_file_manager_advanced_ui', 'file-manager_page_afmp-file-logs', 'settings_page_afmp-file-logs', 'file-manager_page_afmp-onedrive', 'file-manager_page_afmp-aws', 'file-manager_page_afm-integrations-pro' ), true ) ) {
			wp_enqueue_style( 'afm-admin', FMA_PLUGIN_URL . 'application/assets/css/afm-styles.css', array( 'afm-jquery.select2' ), FMA_VERSION, 'all' );
			wp_enqueue_script( 'afm-admin', FMA_PLUGIN_URL . 'application/assets/js/afm-scripts.js', array( 'afm-jquery.select2' ), FMA_VERSION, true );
			wp_localize_script(
				'afm-admin',
				'afmAdmin',
				array(
					'assetsURL' => FMA_PLUGIN_URL . 'application/assets/',
					'jsonURL'  => fma_get_rest_api_root(),
				),
			);

			// Enqueue SMTP recommendation scripts on Settings (Controls) page
			if ( 'file-manager_page_file_manager_advanced_controls' === $hook && ! empty( $this->recommend_smtp ) && method_exists( $this->recommend_smtp, 'admin_enqueue_scripts' ) ) {
				$this->recommend_smtp->admin_enqueue_scripts();
			}
		}
	}

	/**
	 * Code Mirror Themes
	 */
	public static function cm_themes() {
		$cm_themes_dir = FMA_CM_THEMES_PATH;
		$cm_themes = [];
		$cm_themes['default'] = array(
			'title' => 'default',
			'pro'   => false,
		);

		$free_themes = array( '3024-day', '3024-night', 'base16-dark', 'base16-light', 'downtown-light' );
		foreach( glob( $cm_themes_dir . '/*.css' ) as $file ) {
			$bn = basename($file, ".css");
			$args = array(
				'title' => $bn,
				'pro'   => true,
			);
			if ( in_array( $bn, $free_themes, true ) ) {
				$args['pro'] = false;
			}
			$cm_themes[ $bn ] = $args;
		}

		usort(
			$cm_themes,
			function( $a, $b ) {
				if ( $a['pro'] === $b['pro'] ) {
					return 0;
				}
				return $a['pro'] ? 1 : -1;
			}
		);

		return $cm_themes;
	}

	/**
	 * Review Ajax
	 */
	public function fma_review_ajax() {
		$nonce = $_REQUEST['nonce'];
		if ( ! wp_verify_nonce( $nonce, 'afm_review' ) ) {
			die( __( 'Security check', 'file-manager-advanced' ) );
		} else {
			$task = sanitize_text_field( $_POST['task'] );
			$done = update_option( 'fma_hide_review_section', $task );
			if ( $done ) {
				echo '1';
			} else {
				echo '0';
			}
			die;
		}
	}

	/**
	 * Admin Init
	 *
	 * @since 3.3.1
	 */
	public function admin_init() {
		if ( function_exists( 'fma_get_pro_plugin_main_file' ) && fma_get_pro_plugin_main_file() !== '' ) {
			if ( ! function_exists( 'is_plugin_active' ) ) {
				require_once ABSPATH . 'wp-admin/includes/plugin.php';
			}
			if ( function_exists( 'is_plugin_active' ) && is_plugin_active( plugin_basename( fma_get_pro_plugin_main_file() ) ) ) {
				require_once FMAFILEPATH . 'application/logs/class-filelogs.php';
			}
		}
	}





	/**
	 * PHP Debug Analysis Ajax
	 */
	public function fma_debug_php() {
		class_fma_permissions::verify_ajax_access();

		// Check nonce for security
		if ( ! wp_verify_nonce( $_POST['nonce'], 'fmaskey' ) ) {
			wp_die( __( 'Security check failed', 'file-manager-advanced' ) );
		}

		// Get the PHP code from POST data
		$php_code = wp_unslash( $_POST['php_code'] );
		$filename = sanitize_text_field( $_POST['filename'] );

		// Load the debug analyzer
		$analyzer_path = FMAFILEPATH . 'application/library/php-parser/src/FMA_PhpDebugAnalyzer.php';
		if ( ! file_exists( $analyzer_path ) ) {
			wp_send_json( array(
				'valid' => false,
				'errors' => array(
					array(
						'line' => 0,
						'message' => 'PHP Debug Analyzer file not found',
						'type' => 'error'
					)
				),
				'debug_info' => array(),
				'message' => 'PHP Debug Analyzer file not found'
			) );
			return;
		}
		
		require_once $analyzer_path;

		// Analyze PHP code for debug information
		$debug_result = FMA_PhpDebugAnalyzer::analyze( $php_code, $filename );

		// Return JSON response
		wp_send_json( $debug_result );
	}

	/**
	 * Save PHP file with proper unescaping
	 */
	public function fma_save_php_file() {
		if ( ! class_fma_permissions::user_has_file_manager_access() ) {
			wp_send_json_error( array( 'message' => __( 'You do not have permission to access the file manager.', 'file-manager-advanced' ) ) );
			return;
		}

		if ( ! class_fma_permissions::has_unrestricted_filesystem_access() ) {
			wp_send_json_error( array( 'message' => __( 'You do not have permission to edit PHP files.', 'file-manager-advanced' ) ) );
			return;
		}

		// Check nonce for security
		if ( ! wp_verify_nonce( $_POST['nonce'], 'fmaskey' ) ) {
			wp_send_json_error( array( 'message' => __( 'Security check failed', 'file-manager-advanced' ) ) );
			return;
		}

		// Get the PHP code and file info from POST data.
		// Keep php_code slashed here; connector input_filter applies wp_unslash once on put content.
		$php_code  = isset( $_POST['php_code'] ) ? $_POST['php_code'] : '';
		$file_hash = sanitize_text_field( $_POST['file_hash'] );
		$filename  = sanitize_text_field( wp_unslash( $_POST['filename'] ) );

		// Skip validation since this is called when user chooses "Save Anyway"
		// The validation was already done and user explicitly chose to save with errors

		try {
			// Store original POST data
			$original_post = $_POST;
			
			// Set up POST data for elFinder save operation
			$_POST = array(
				'cmd'     => 'put',
				'target'  => $file_hash,
				'content' => $php_code,
				'action'  => 'fma_load_fma_ui',
				'_fmakey' => wp_create_nonce( 'fmaskey' ),
			);

			// Use elFinder connector to save the file
			if ( ! class_exists( 'class_fma_connector' ) ) {
				include_once 'class_fma_connector.php';
			}
			
			if ( class_exists( 'class_fma_connector' ) ) {
				if ( ! class_exists( 'fma_elFinderConnector' ) ) {
					require_once FMAFILEPATH . 'application/class_fma_elfinder_connector.php';
				}
				fma_elFinderConnector::$allow_internal_put = true;

				$fma_connector = new class_fma_connector();
				
				// Capture elFinder output
				ob_start();
				$fma_connector->fma_local_file_system();
				$elfinder_response = ob_get_clean();

				fma_elFinderConnector::$allow_internal_put = false;

				// Restore original POST data
				$_POST = $original_post;

				// Parse elFinder response
				$response_data = json_decode( $elfinder_response, true );
				
				if ( $response_data && isset( $response_data['changed'] ) && ! empty( $response_data['changed'] ) ) {
					wp_send_json_success( array( 
						'message' => __( 'File saved successfully', 'file-manager-advanced' ),
						'elfinder_response' => $response_data
					) );
				} else if ( $response_data && ! isset( $response_data['error'] ) ) {
					// Sometimes elFinder doesn't return 'changed' but save is successful
					wp_send_json_success( array( 
						'message' => __( 'File saved successfully', 'file-manager-advanced' ),
						'elfinder_response' => $response_data
					) );
				} else {
					$error_message = '';
					if ( $response_data && isset( $response_data['error'] ) ) {
						$error_message = $response_data['error'];
					} else {
						$error_message = __( 'Failed to save file through elFinder', 'file-manager-advanced' );
					}
					
					wp_send_json_error( array( 
						'message' => $error_message,
						'elfinder_response' => $elfinder_response
					) );
				}
			} else {
				// Restore original POST data
				$_POST = $original_post;
				
				wp_send_json_error( array( 
					'message' => __( 'elFinder connector class not found', 'file-manager-advanced' )
				) );
			}
			
		} catch ( Exception $e ) {
			fma_elFinderConnector::$allow_internal_put = false;
			// Restore original POST data in case of exception
			$_POST = $original_post;
			
			wp_send_json_error( array( 
				'message' => sprintf( __( 'Error saving file: %s', 'file-manager-advanced' ), $e->getMessage() ),
				'exception' => $e->getMessage()
			) );
		}
	}

	/**
	 * SMTP recommendation admin page slug (folder-safe).
	 *
	 * @return string
	 */
	private function get_smtp_recommend_page_slug() {
		$plugin_slug = defined( 'FMA_PLUGIN_SLUG' ) ? FMA_PLUGIN_SLUG : 'file-manager-advanced';
		return $plugin_slug . '-recommend-post-smtp';
	}

	/**
	 * Initialize SMTP recommendation using universal system
	 * @since 6.7.3
	 */
	private function init_smtp_recommendation() {
		// if ( ! class_exists( 'Recommend_Post_SMTP_Admin_Notice' ) ) {
		// 	require_once FMAFILEPATH . 'application/post-smtp-notice/recommend-post-smtp-admin-notice.php';
		// 	$recommend_smtp_admin_notice = Recommend_Post_SMTP_Admin_Notice::get_instance();
		// 	$recommend_smtp_admin_notice->set_plugin_info( 'fma', 'png' );
		// }
		require_once FMAFILEPATH . 'application/post-smtp-notice/recommend-post-smtp-loader.php';

		// Unique ID per plugin (slug, name, etc.)
		$this->recommend_smtp = recommend_smtp_loader(
			'fma',     // unique plugin ID
			defined( 'FMA_PLUGIN_SLUG' ) ? FMA_PLUGIN_SLUG : 'file-manager-advanced',   // plugin slug (folder basename)
			true,            // show admin notice
			( function_exists( 'fma_has_react_admin_navigation' ) && fma_has_react_admin_navigation() )
				? 'options.php' // keep page for Notifications iframe; do not show in WP sidebar
				: 'file_manager_advanced_ui',
			'png'            // logo format
		);

	}

	/**
	 * Check whether any supported SMTP plugin is active.
	 *
	 * @return bool
	 */
	private function is_any_smtp_plugin_active() {
		if ( ! function_exists( 'is_plugin_active' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		foreach ( $this->smtp_plugins as $plugin ) {
			if ( is_plugin_active( $plugin ) ) {
				return true;
			}
		}

		return false;
	}

	public static function has_pro() {
		$has_pro = apply_filters( 'fma__has_pro', false );
	   return $has_pro;
	}
}