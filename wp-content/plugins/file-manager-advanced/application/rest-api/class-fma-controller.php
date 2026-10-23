<?php
/**
 * File Manager Advanced Rest API Controller
 * @since 5.3.0
 *
 * @package File Manager Advanced
 */

defined('ABSPATH') || exit;

if (!class_exists('FMA_Controller')):
	/**
	 * File Manager Advanced Rest API Controller
	 * @since 5.3.0
	 */
	class FMA_Controller
	{
		/**
		 * Singleton Instance
		 * @since 5.3.0
		 *
		 * @var FMA_Controller $instance Instance.
		 */
		private static $instance = null;

		/**
		 * Rest API Namespace
		 * @since 5.3.0
		 *
		 * @var string $namespace Rest API Namespace.
		 */
		private $namespace = 'file-manager-advanced/v1';

		/**
		 * File Manager Advanced Rest API Controller Constructor
		 * @since 5.3.0
		 */
		private function __construct()
		{
			add_action('rest_api_init', array($this, 'rest_api_init'));
		}

		/**
		 * Rest API Init
		 * @since 5.3.0
		 *
		 * @param WP_REST_Server $wp_rest_server Rest API Namespace.
		 */
		public function rest_api_init($wp_rest_server)
		{
			register_rest_route(
				$this->namespace,
				'/storage-usage',
				array(
					'methods' => $wp_rest_server::READABLE,
					'permission_callback' => array($this, 'permission_callback'),
					'callback' => array($this, 'get_storage_usage'),
				)
			);

			register_rest_route(
				$this->namespace,
				'/roles-counts',
				array(
					'methods' => $wp_rest_server::READABLE,
					'permission_callback' => array($this, 'permission_callback'),
					'callback' => array($this, 'get_roles_counts'),
				)
			);

			register_rest_route(
				$this->namespace,
				'/activity-logs',
				array(
					'methods' => $wp_rest_server::READABLE,
					'permission_callback' => array($this, 'permission_callback'),
					'callback' => array($this, 'get_activity_logs'),
				)
			);

			register_rest_route(
				$this->namespace,
				'/activity-logs/(?P<id>\\d+)',
				array(
					array(
						'methods' => $wp_rest_server::DELETABLE,
						'permission_callback' => array($this, 'permission_callback'),
						'callback' => array($this, 'delete_activity_log'),
					),
					array(
						'methods' => $wp_rest_server::CREATABLE,
						'permission_callback' => array($this, 'permission_callback'),
						'callback' => array($this, 'delete_activity_log'),
					),
				)
			);

			register_rest_route(
				$this->namespace,
				'/file-logs',
				array(
					'methods' => $wp_rest_server::READABLE,
					'permission_callback' => array($this, 'permission_callback'),
					'callback' => array($this, 'get_file_logs'),
				)
			);

			register_rest_route(
				$this->namespace,
				'/plan-access',
				array(
					'methods' => $wp_rest_server::READABLE,
					'permission_callback' => array($this, 'permission_callback'),
					'callback' => array($this, 'get_plan_access_content'),
				)
			);

			register_rest_route(
				$this->namespace,
				'/file-logs/all',
				array(
					array(
						'methods' => $wp_rest_server::DELETABLE,
						'permission_callback' => array($this, 'permission_callback'),
						'callback' => array($this, 'delete_all_file_logs'),
					),
					array(
						'methods' => $wp_rest_server::CREATABLE,
						'permission_callback' => array($this, 'permission_callback'),
						'callback' => array($this, 'delete_all_file_logs'),
					),
				)
			);

			register_rest_route(
				$this->namespace,
				'/file-logs/bulk-delete',
				array(
					'methods' => $wp_rest_server::CREATABLE,
					'permission_callback' => array($this, 'permission_callback'),
					'callback' => array($this, 'delete_bulk_file_logs'),
					'args' => array(
						'ids' => array(
							'required' => true,
							'type' => 'array',
							'items' => array(
								'type' => 'integer',
							),
						),
					),
				)
			);

			register_rest_route(
				$this->namespace,
				'/file-logs/(?P<id>\\d+)',
				array(
					array(
						'methods' => $wp_rest_server::DELETABLE,
						'permission_callback' => array($this, 'permission_callback'),
						'callback' => array($this, 'delete_file_log'),
					),
					array(
						'methods' => $wp_rest_server::CREATABLE,
						'permission_callback' => array($this, 'permission_callback'),
						'callback' => array($this, 'delete_file_log'),
					),
				)
			);

			register_rest_route(
				$this->namespace,
				'/integrations-status',
				array(
					'methods' => $wp_rest_server::READABLE,
					'permission_callback' => array($this, 'permission_callback'),
					'callback' => array($this, 'get_integrations_status'),
				)
			);

			register_rest_route(
				$this->namespace,
				'/recent-files',
				array(
					'methods' => $wp_rest_server::READABLE,
					'permission_callback' => array($this, 'permission_callback'),
					'callback' => array($this, 'get_recent_files'),
				)
			);

			register_rest_route(
				$this->namespace,
				'/plugin-settings',
				array(
					'methods' => $wp_rest_server::READABLE,
					'permission_callback' => array($this, 'permission_callback'),
					'callback' => array($this, 'get_plugin_settings'),
				)
			);

			register_rest_route(
				$this->namespace,
				'/settings',
				array(
					'methods' => $wp_rest_server::READABLE,
					'permission_callback' => array($this, 'permission_callback'),
					'callback' => array($this, 'get_settings'),
				)
			);

			register_rest_route(
				$this->namespace,
				'/settings',
				array(
					'methods' => $wp_rest_server::CREATABLE,
					'permission_callback' => array($this, 'permission_callback'),
					'callback' => array($this, 'save_settings'),
				)
			);

			register_rest_route(
				$this->namespace,
				'/hide-banner',
				array(
					'methods' => $wp_rest_server::CREATABLE,
					'permission_callback' => array($this, 'permission_callback'),
					'callback' => array($this, 'hide_banner'),
				)
			);

			register_rest_route(
				$this->namespace,
				'/minimize-maximize-banner',
				array(
					'methods' => $wp_rest_server::CREATABLE,
					'permission_callback' => array($this, 'permission_callback'),
					'callback' => array($this, 'minimize_maximize_banner'),
				)
			);

			register_rest_route(
				$this->namespace,
				'/roles-counts',
				array(
					'methods' => $wp_rest_server::READABLE,
					'permission_callback' => array($this, 'permission_callback'),
					'callback' => array($this, 'get_roles_counts'),
				)
			);

			register_rest_route(
				$this->namespace,
				'/notifications',
				array(
					'methods' => $wp_rest_server::READABLE,
					'permission_callback' => array($this, 'permission_callback'),
					'callback' => array($this, 'get_notifications'),
				)
			);

			register_rest_route(
				$this->namespace,
				'/notifications',
				array(
					'methods' => $wp_rest_server::CREATABLE,
					'permission_callback' => array($this, 'permission_callback'),
					'callback' => array($this, 'save_notifications'),
				)
			);

			// Install Dropbox library endpoint (register specific routes FIRST)
			register_rest_route(
				$this->namespace,
				'/integrations/dropbox/install-library',
				array(
					'methods' => $wp_rest_server::CREATABLE,
					'permission_callback' => array($this, 'permission_callback'),
					'callback' => array($this, 'install_dropbox_library'),
				)
			);

			// Install Amazon S3 library endpoint (register specific routes FIRST)
			register_rest_route(
				$this->namespace,
				'/integrations/amazon-s3/install-library',
				array(
					'methods' => $wp_rest_server::CREATABLE,
					'permission_callback' => array($this, 'permission_callback'),
					'callback' => array($this, 'install_amazons3_library'),
				)
			);

			// Install Google Cloud library endpoint (register specific routes FIRST)
			register_rest_route(
				$this->namespace,
				'/integrations/google-cloud-storage/install-library',
				array(
					'methods' => $wp_rest_server::CREATABLE,
					'permission_callback' => array($this, 'permission_callback'),
					'callback' => array($this, 'install_googlecloud_library'),
				)
			);

			// Install pCloud library endpoint (register specific routes FIRST)
			register_rest_route(
				$this->namespace,
				'/integrations/pcloud/install-library',
				array(
					'methods' => $wp_rest_server::CREATABLE,
					'permission_callback' => array($this, 'permission_callback'),
					'callback' => array($this, 'install_pcloud_library'),
				)
			);

			// Install Cloudflare R2 library endpoint (register specific routes FIRST)
			register_rest_route(
				$this->namespace,
				'/integrations/cloudflare-r2/install-library',
				array(
					'methods' => $wp_rest_server::CREATABLE,
					'permission_callback' => array($this, 'permission_callback'),
					'callback' => array($this, 'install_cloudflarer2_library'),
				)
			);

			// Install Wasabi library (same AWS SDK bundle as S3 / R2)
			register_rest_route(
				$this->namespace,
				'/integrations/wasabi/install-library',
				array(
					'methods' => $wp_rest_server::CREATABLE,
					'permission_callback' => array($this, 'permission_callback'),
					'callback' => array($this, 'install_wasabi_library'),
				)
			);

			// Google Cloud Storage file upload endpoint (register specific routes FIRST)
			register_rest_route(
				$this->namespace,
				'/integrations/google-cloud-storage/upload-key',
				array(
					'methods' => $wp_rest_server::CREATABLE,
					'permission_callback' => array($this, 'permission_callback'),
					'callback' => array($this, 'upload_googlecloud_key'),
				)
			);

			// Amazon S3 validate bucket endpoint (register specific routes FIRST)
			register_rest_route(
				$this->namespace,
				'/integrations/amazon-s3/validate-bucket',
				array(
					'methods' => $wp_rest_server::CREATABLE,
					'permission_callback' => array($this, 'permission_callback'),
					'callback' => array($this, 'validate_amazons3_bucket'),
				)
			);

			register_rest_route(
				$this->namespace,
				'/integrations/wasabi/validate-bucket',
				array(
					'methods' => $wp_rest_server::CREATABLE,
					'permission_callback' => array($this, 'permission_callback'),
					'callback' => array($this, 'validate_wasabi_bucket'),
				)
			);

			// Google Cloud Storage validate bucket endpoint (register specific routes FIRST)
			register_rest_route(
				$this->namespace,
				'/integrations/google-cloud-storage/validate-bucket',
				array(
					'methods' => $wp_rest_server::CREATABLE,
					'permission_callback' => array($this, 'permission_callback'),
					'callback' => array($this, 'validate_googlecloud_bucket'),
				)
			);

			// GitHub fetch repositories endpoint (register specific routes FIRST)
			register_rest_route(
				$this->namespace,
				'/integrations/github/fetch-repositories',
				array(
					'methods' => $wp_rest_server::CREATABLE,
					'permission_callback' => array($this, 'permission_callback'),
					'callback' => array($this, 'github_fetch_repositories'),
				)
			);

			// GitHub fetch branches endpoint (register specific routes FIRST)
			register_rest_route(
				$this->namespace,
				'/integrations/github/fetch-branches',
				array(
					'methods' => $wp_rest_server::CREATABLE,
					'permission_callback' => array($this, 'permission_callback'),
					'callback' => array($this, 'github_fetch_branches'),
				)
			);

			// GitHub validate token endpoint (register specific routes FIRST)
			register_rest_route(
				$this->namespace,
				'/integrations/github/validate-token',
				array(
					'methods' => $wp_rest_server::CREATABLE,
					'permission_callback' => array($this, 'permission_callback'),
					'callback' => array($this, 'github_validate_token'),
				)
			);

			// Integration settings endpoints (register generic routes AFTER specific ones)
			// Use [^/]+ to match any characters except slashes (more permissive for hyphenated IDs)
			register_rest_route(
				$this->namespace,
				'/integrations/(?P<id>[^/]+)',
				array(
					'methods' => $wp_rest_server::READABLE,
					'permission_callback' => array($this, 'permission_callback'),
					'callback' => array($this, 'get_integration_settings'),
				)
			);

			register_rest_route(
				$this->namespace,
				'/integrations/(?P<id>[^/]+)',
				array(
					'methods' => $wp_rest_server::CREATABLE,
					'permission_callback' => array($this, 'permission_callback'),
					'callback' => array($this, 'save_integration_settings'),
				)
			);

			// Test API Key endpoint for AI Code Pilot
			register_rest_route(
				$this->namespace,
				'/test-api-key',
				array(
					'methods' => $wp_rest_server::CREATABLE,
					'permission_callback' => array($this, 'permission_callback'),
					'callback' => array($this, 'test_api_key'),
				)
			);

			// Disconnect nonce endpoint for integrations
			register_rest_route(
				$this->namespace,
				'/disconnect-nonce',
				array(
					'methods' => $wp_rest_server::READABLE,
					'permission_callback' => array($this, 'permission_callback'),
					'callback' => array($this, 'get_disconnect_nonce'),
				)
			);

			// Backward-compatible Google Drive disconnect nonce (older React builds).
			register_rest_route(
				$this->namespace,
				'/googledrive-disconnect-nonce',
				array(
					'methods' => $wp_rest_server::READABLE,
					'permission_callback' => array($this, 'permission_callback'),
					'callback' => array($this, 'get_googledrive_disconnect_nonce'),
				)
			);

			// OneDrive OAuth callback (Azure-compatible redirect URI without admin query params)
			register_rest_route(
				$this->namespace,
				'/integrations/onedrive/callback',
				array(
					'methods' => $wp_rest_server::READABLE,
					'permission_callback' => array($this, 'permission_callback'),
					'callback' => array($this, 'onedrive_oauth_callback'),
				)
			);

			// OneDrive disconnect endpoint (React UI)
			register_rest_route(
				$this->namespace,
				'/integrations/onedrive/disconnect',
				array(
					'methods' => $wp_rest_server::CREATABLE,
					'permission_callback' => array($this, 'permission_callback'),
					'callback' => array($this, 'disconnect_onedrive'),
				)
			);

			// Dropbox disconnect endpoint (React UI)
			register_rest_route(
				$this->namespace,
				'/integrations/dropbox/disconnect',
				array(
					'methods' => $wp_rest_server::CREATABLE,
					'permission_callback' => array($this, 'permission_callback'),
					'callback' => array($this, 'disconnect_dropbox'),
				)
			);

			// pCloud disconnect endpoint (React UI)
			register_rest_route(
				$this->namespace,
				'/integrations/pcloud/disconnect',
				array(
					'methods' => $wp_rest_server::CREATABLE,
					'permission_callback' => array($this, 'permission_callback'),
					'callback' => array($this, 'disconnect_pcloud'),
				)
			);

			// Google Drive disconnect endpoint (React UI)
			register_rest_route(
				$this->namespace,
				'/integrations/googledrive/disconnect',
				array(
					'methods' => $wp_rest_server::CREATABLE,
					'permission_callback' => array($this, 'permission_callback'),
					'callback' => array($this, 'disconnect_googledrive'),
				)
			);

		}

		/**
		 * Try to resolve logs table name by heuristics
		 */
		private function resolve_logs_table($wpdb)
		{
			// Constant override
			if (defined('AFM_LOGS_TABLE') && AFM_LOGS_TABLE) {
				return AFM_LOGS_TABLE;
			}
			// Candidates - check Pro plugin table name first
			$candidates = array(
				$wpdb->prefix . 'fm_filelogs',  // Pro plugin table name
				$wpdb->prefix . 'afmp_file_logs',
				$wpdb->prefix . 'file_logs',
				$wpdb->prefix . 'afmp__file_logs',
			);
			foreach ($candidates as $cand) {
				if ($wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $cand)) === $cand)
					return $cand;
			}
			// Broad scan
			$tables = $wpdb->get_col('SHOW TABLES');
			foreach ((array) $tables as $t) {
				if (false === stripos($t, 'log'))
					continue;
				$cols = $wpdb->get_col("DESCRIBE `$t`", 0);
				$cols_l = array_map('strtolower', (array) $cols);
				$has_id = in_array('id', $cols_l, true) || in_array('log_id', $cols_l, true) || in_array('entry_id', $cols_l, true) || in_array('ID', $cols, true);
				$has_action = in_array('action', $cols_l, true) || in_array('event', $cols_l, true);
				$has_path = in_array('file_path', $cols_l, true) || in_array('path', $cols_l, true);
				if ($has_id && $has_action && $has_path)
					return $t;
			}
			return '';
		}

		/**
		 * Permission Callback
		 *
		 * @since 5.3.2
		 * @return bool
		 */
		public function permission_callback()
		{
			return is_user_logged_in() && current_user_can('manage_options');
		}

		/**
		 * Hide Banner
		 * @since 5.3.0
		 *
		 * @param WP_REST_Request $request Rest API Request.
		 *
		 * @return WP_REST_Response
		 */
		public function hide_banner($request)
		{
			update_option('_fma_banner_hide', 'yes');
			return new WP_REST_Response(array('success' => true), 200);
		}

		/**
		 * Minimize Maximize Banner
		 * @since 5.3.0
		 *
		 * @param WP_REST_Request $request Rest API Request.
		 *
		 * @return WP_REST_Response
		 */
		public function minimize_maximize_banner($request)
		{
			$action = $request->get_param('action');
			$action = sanitize_text_field(wp_unslash($action));
			update_option('_fma_banner_minimize', $action);
			return new WP_REST_Response(array('success' => true), 200);
		}

		/**
		 * Get user counts by role (for Roles & Counts card)
		 */
		public function get_roles_counts($request)
		{
			global $wp_roles;
			$roles = $wp_roles ? $wp_roles->roles : array();
			$result = array();
			global $wpdb;
			$table = $wpdb->prefix . 'fma_addon_shortcodes';
			$has_shortcode_table = ($wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table)) === $table);

			// Read plugin settings to determine which roles can access File Manager
			$settings = get_option('fmaoptions');
			$allowed_roles = array('administrator');
			if (isset($settings['fma_user_roles']) && is_array($settings['fma_user_roles'])) {
				$allowed_roles = array_unique(array_merge($allowed_roles, array_map('sanitize_text_field', $settings['fma_user_roles'])));
			}
			foreach ($roles as $role_key => $role) {
				$user_query = new WP_User_Query(array('role' => $role_key, 'fields' => 'ID', 'number' => 1));
				$count = in_array($role_key, $allowed_roles, true) ? (int) $user_query->get_total() : 0;
				$shortcodes_for_role = 0;
				if ($has_shortcode_table) {
					// Best-effort: shortcode_data is serialized; search for role key presence.
					$like = '%' . $wpdb->esc_like($role_key) . '%';
					$shortcodes_for_role = (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM `$table` WHERE `shortcode_data` LIKE %s", $like));
				}
				$result[] = array(
					'key' => $role_key,
					'label' => isset($role['name']) ? $role['name'] : $role_key,
					'file_manager' => $count,
					'shortcodes' => $shortcodes_for_role,
				);
			}
			return new WP_REST_Response(array('roles' => $result), 200);
		}

		/**
		 * Get recent activity logs from PRO table (best-effort)
		 */
		public function get_activity_logs($request)
		{
			global $wpdb;
			$limit = 10;
			$table = $this->resolve_logs_table($wpdb);
			if ('' === $table) {
				// last resort: scan for any table containing 'file' and 'logs'
				$like = $wpdb->esc_like($wpdb->prefix) . '%';
				$tables = $wpdb->get_col($wpdb->prepare('SHOW TABLES LIKE %s', $like));
				foreach ($tables as $t) {
					if (false !== strpos($t, 'file') && false !== strpos($t, 'log')) {
						$table = $t;
						break;
					}
				}
			}

			if ('' === $table) {
				return new WP_REST_Response(array('logs' => array(), 'found' => false), 200);
			}

			$rows = $wpdb->get_results("SELECT * FROM `$table` ORDER BY id DESC LIMIT $limit", ARRAY_A);
			$logs = array();
			foreach ((array) $rows as $row) {
				$uid = 0;
				if (isset($row['user_id'])) {
					$uid = (int) $row['user_id'];
				} elseif (isset($row['uid'])) {
					$uid = (int) $row['uid'];
				}
				$user_display = '';
				$user_email = isset($row['user_email']) ? $row['user_email'] : '';
				if ($uid > 0) {
					$u = get_userdata($uid);
					if ($u) {
						$user_display = $u->user_login;
						if (empty($user_email)) {
							$user_email = $u->user_email;
						}
					}
				}
				if (empty($user_display) && isset($row['user_name'])) {
					$user_display = $row['user_name'];
				}
				if (empty($user_display) && isset($row['user'])) {
					$user_display = $row['user'];
				}

				$file_type = isset($row['type']) ? $row['type'] : (isset($row['mime_type']) ? $row['mime_type'] : '');
				$item_type = ('directory' === strtolower((string) $file_type)) ? 'folder' : 'file';
				$message = sprintf(
					'The User (%s) with IP Address (%s) has just (%s) the %s (%s) of type (%s) on (%s) using File Manager on website (%s)',
					$user_display ? $user_display : '—',
					isset($row['ip']) ? $row['ip'] : (isset($row['ip_address']) ? $row['ip_address'] : ''),
					isset($row['action']) ? $row['action'] : (isset($row['event']) ? $row['event'] : ''),
					$item_type,
					isset($row['file_path']) ? $row['file_path'] : (isset($row['path']) ? $row['path'] : ''),
					$file_type,
					isset($row['time']) ? $row['time'] : (isset($row['created_at']) ? $row['created_at'] : ''),
					home_url()
				);

				$logs[] = array(
					'id' => isset($row['id']) ? (int) $row['id'] : 0,
					'user' => $user_display,
					'user_id' => $uid,
					'email' => $user_email,
					'time' => isset($row['time']) ? $row['time'] : (isset($row['created_at']) ? $row['created_at'] : ''),
					'event' => isset($row['action']) ? $row['action'] : (isset($row['event']) ? $row['event'] : ''),
					'file_path' => isset($row['file_path']) ? $row['file_path'] : (isset($row['path']) ? $row['path'] : ''),
					'type' => isset($row['type']) ? $row['type'] : (isset($row['mime_type']) ? $row['mime_type'] : ''),
					'ip' => isset($row['ip']) ? $row['ip'] : (isset($row['ip_address']) ? $row['ip_address'] : ''),
					'message' => $message,
				);
			}

			return new WP_REST_Response(array('logs' => $logs, 'found' => true), 200);
		}

		/**
		 * Delete single activity log by id
		 */
		public function delete_activity_log($request)
		{
			global $wpdb;
			$id = absint($request->get_param('id'));
			if ($id <= 0) {
				return new WP_REST_Response(array('success' => false, 'message' => 'Invalid id'), 400);
			}
			// Find table
			$table = $this->resolve_logs_table($wpdb);
			if ('' === $table) {
				return new WP_REST_Response(array('success' => false, 'message' => 'Logs table not found'), 404);
			}
			$deleted = $wpdb->delete($table, array('id' => $id), array('%d'));
			if (!$deleted) {
				// Try common alternate keys
				$alt_keys = array('log_id', 'entry_id', 'ID');
				foreach ($alt_keys as $k) {
					$deleted = $wpdb->delete($table, array($k => $id), array('%d'));
					if ($deleted)
						break;
				}
			}
			return new WP_REST_Response(array('success' => (bool) $deleted), 200);
		}

		/**
		 * Get all file logs (for Logs tab)
		 */
		public function get_file_logs($request)
		{
			// Suppress any PHP warnings/errors to ensure clean JSON response
			$error_reporting = error_reporting(E_ERROR | E_PARSE | E_CORE_ERROR | E_COMPILE_ERROR | E_USER_ERROR | E_RECOVERABLE_ERROR);
			$display_errors = ini_get('display_errors');
			ini_set('display_errors', '0');

			try {
				global $wpdb;
				$table = $this->resolve_logs_table($wpdb);
				if ('' === $table) {
					// Restore error reporting
					error_reporting($error_reporting);
					ini_set('display_errors', $display_errors);
					return new WP_REST_Response(array(
						'logs' => array(),
						'found' => false,
						'total_pages' => 1
					), 200);
				}

				// Get pagination params
				$page = absint($request->get_param('page')) ?: 1;
				$per_page = absint($request->get_param('per_page')) ?: 20;
				$offset = ($page - 1) * $per_page;

				// Get filter params
				$filter = $request->get_param('filter');
				$orderby = $request->get_param('orderby') ?: 'id';
				$order = strtoupper($request->get_param('order')) === 'ASC' ? 'ASC' : 'DESC';
				$date_range = $request->get_param('date_range');

				// Build WHERE clause
				$where = '1=1';
				if ($filter && 'all' !== $filter) {
					$action_column = $wpdb->get_var("SHOW COLUMNS FROM `$table` LIKE 'action'") ? 'action' : 'event';
					if ($action_column) {
						$where = $wpdb->prepare("$action_column = %s", $filter);
					}
				}

				// Add date range filter - exactly like original submenu implementation
				if ($date_range && is_string($date_range)) {
					$date_range_arr = explode(' - ', $date_range);
					if (count($date_range_arr) === 2) {
						$start_date_str = trim($date_range_arr[0]);
						$end_date_str = trim($date_range_arr[1]);

						// Include complete selected days (00:00:00 to 23:59:59).
						$start_date = strtotime($start_date_str . ' 00:00:00');
						$end_date = strtotime($end_date_str . ' 23:59:59');

						if ($start_date && $end_date) {
							$time_column = $wpdb->get_var("SHOW COLUMNS FROM `$table` LIKE 'time'") ? 'time' : 'created_at';
							if (!$time_column) {
								$time_column = 'created_at';
							}

							// Use BETWEEN exactly like original FileLogModel::find_all() does
							$where .= $wpdb->prepare(" AND $time_column BETWEEN %d AND %d", $start_date, $end_date);
						}
					}
				}

				// Get total count
				$total = (int) $wpdb->get_var("SELECT COUNT(*) FROM `$table` WHERE $where");

				// Get logs
				$rows = $wpdb->get_results($wpdb->prepare("SELECT * FROM `$table` WHERE $where ORDER BY $orderby $order LIMIT %d OFFSET %d", $per_page, $offset), ARRAY_A);

				$logs = array();
				foreach ((array) $rows as $row) {
					$uid = 0;
					if (isset($row['user_id'])) {
						$uid = (int) $row['user_id'];
					} elseif (isset($row['uid'])) {
						$uid = (int) $row['uid'];
					}

					$user_display = '';
					$user_email = isset($row['user_email']) ? $row['user_email'] : '';
					if ($uid > 0) {
						$u = get_userdata($uid);
						if ($u) {
							$user_display = $u->user_login;
							if (empty($user_email)) {
								$user_email = $u->user_email;
							}
						}
					}
					if (empty($user_display) && isset($row['user_name'])) {
						$user_display = $row['user_name'];
					}
					if (empty($user_display) && isset($row['user'])) {
						$user_display = $row['user'];
					}

					$file_type = isset($row['type']) ? $row['type'] : (isset($row['mime_type']) ? $row['mime_type'] : '');
					$item_type = ('directory' === strtolower((string) $file_type)) ? 'folder' : 'file';

					// Format time - check if it's a timestamp or already formatted
					$time_value = isset($row['time']) ? $row['time'] : (isset($row['created_at']) ? $row['created_at'] : '');
					$time_formatted = '';
					if (!empty($time_value)) {
						// Check if it's a Unix timestamp (numeric)
						if (is_numeric($time_value) && $time_value > 0) {
							$time_formatted = date('F d, Y h:i a', (int) $time_value);
						} else {
							// Try to parse as date string
							$parsed_timestamp = strtotime($time_value);
							if ($parsed_timestamp !== false && $parsed_timestamp > 0) {
								$time_formatted = date('F d, Y h:i a', $parsed_timestamp);
							} else {
								// If already formatted or can't parse, use as is
								$time_formatted = $time_value;
							}
						}
					}

					$message = sprintf(
						'The User ***(%s)*** with IP Address ***(%s)*** has just ***(%s)*** the %s ***(%s)*** of type ***(%s)*** on ***(%s)*** using File Manager on website ***(%s)***',
						$user_display ? $user_display : '—',
						isset($row['ip']) ? $row['ip'] : (isset($row['ip_address']) ? $row['ip_address'] : ''),
						isset($row['action']) ? $row['action'] : (isset($row['event']) ? $row['event'] : ''),
						$item_type,
						isset($row['file_path']) ? $row['file_path'] : (isset($row['path']) ? $row['path'] : ''),
						$file_type,
						isset($row['time']) ? $time_formatted : (isset($row['created_at']) ? $row['created_at'] : ''),
						home_url()
					);

					$logs[] = array(
						'id' => isset($row['id']) ? (int) $row['id'] : 0,
						'user' => $user_display,
						'user_id' => $uid,
						'email' => $user_email,
						'time' => $time_formatted,
						'time_raw' => $time_value, // Keep raw value for sorting/filtering
						'event' => isset($row['action']) ? $row['action'] : (isset($row['event']) ? $row['event'] : ''),
						'file_path' => isset($row['file_path']) ? $row['file_path'] : (isset($row['path']) ? $row['path'] : ''),
						'type' => isset($row['type']) ? $row['type'] : (isset($row['mime_type']) ? $row['mime_type'] : ''),
						'ip' => isset($row['ip']) ? $row['ip'] : (isset($row['ip_address']) ? $row['ip_address'] : ''),
						'message' => $message,
					);
				}

				// Restore error reporting before returning
				error_reporting($error_reporting);
				ini_set('display_errors', $display_errors);

				$total_pages = (int) ceil($total / $per_page);

				return new WP_REST_Response(array(
					'logs' => $logs,
					'found' => true,
					'total' => $total,
					'total_pages' => $total_pages,
					'page' => $page,
					'per_page' => $per_page,
				), 200);
			} catch (Exception $e) {
				// Restore error reporting
				error_reporting($error_reporting);
				ini_set('display_errors', $display_errors);

				// Return error response as JSON
				return new WP_REST_Response(array(
					'logs' => array(),
					'found' => false,
					'total_pages' => 1,
					'error' => 'An error occurred while fetching logs',
				), 500);
			}
		}

		/**
		 * Delete single file log by id
		 */
		public function delete_file_log($request)
		{
			global $wpdb;
			$id = absint($request->get_param('id'));
			if ($id <= 0) {
				return new WP_REST_Response(array('success' => false, 'message' => 'Invalid id'), 400);
			}

			if (class_exists('AFMP\\Modules\\FileLogs\\FileLogModel')) {
				$result = \AFMP\Modules\FileLogs\FileLogModel::destroy($id);
				return new WP_REST_Response(array('success' => false !== $result), 200);
			}

			$table = $this->resolve_logs_table($wpdb);
			if ('' === $table) {
				return new WP_REST_Response(array('success' => false, 'message' => 'Logs table not found'), 404);
			}
			$deleted = $wpdb->delete($table, array('id' => $id), array('%d'));
			if (!$deleted) {
				$alt_keys = array('log_id', 'entry_id', 'ID');
				foreach ($alt_keys as $k) {
					$deleted = $wpdb->delete($table, array($k => $id), array('%d'));
					if ($deleted)
						break;
				}
			}
			return new WP_REST_Response(array('success' => (bool) $deleted), 200);
		}

		/**
		 * Delete all file logs
		 */
		public function delete_all_file_logs($request)
		{
			global $wpdb;
			$table = $this->resolve_logs_table($wpdb);
			if ('' === $table) {
				return new WP_REST_Response(array('success' => false, 'message' => 'Logs table not found'), 404);
			}

			if (class_exists('AFMP\\Modules\\FileLogs\\FileLogModel')) {
				$result = \AFMP\Modules\FileLogs\FileLogModel::destroy('all');
				return new WP_REST_Response(array('success' => false !== $result), 200);
			}

			$result = $wpdb->query("DELETE FROM `$table`");
			return new WP_REST_Response(array('success' => false !== $result), 200);
		}

		/**
		 * Delete multiple file logs by id.
		 */
		public function delete_bulk_file_logs($request)
		{
			global $wpdb;
			$ids = $request->get_param('ids');
			if (! is_array($ids) || empty($ids)) {
				return new WP_REST_Response(array('success' => false, 'message' => 'No log ids provided'), 400);
			}

			$ids = array_values(array_filter(array_map('absint', $ids)));
			if (empty($ids)) {
				return new WP_REST_Response(array('success' => false, 'message' => 'Invalid log ids'), 400);
			}

			$table = $this->resolve_logs_table($wpdb);
			if ('' === $table) {
				return new WP_REST_Response(array('success' => false, 'message' => 'Logs table not found'), 404);
			}

			if (class_exists('AFMP\\Modules\\FileLogs\\FileLogModel')) {
				$result = \AFMP\Modules\FileLogs\FileLogModel::destroy($ids);
				return new WP_REST_Response(array('success' => false !== $result, 'deleted' => count($ids)), 200);
			}

			$deleted = 0;
			foreach ($ids as $id) {
				if ($id <= 0) {
					continue;
				}
				$row_deleted = $wpdb->delete($table, array('id' => $id), array('%d'));
				if ($row_deleted) {
					$deleted += (int) $row_deleted;
					continue;
				}
				$alt_keys = array('log_id', 'entry_id', 'ID');
				foreach ($alt_keys as $k) {
					$row_deleted = $wpdb->delete($table, array($k => $id), array('%d'));
					if ($row_deleted) {
						$deleted += (int) $row_deleted;
						break;
					}
				}
			}

			return new WP_REST_Response(array('success' => $deleted > 0, 'deleted' => $deleted), 200);
		}

		/**
		 * Quick Integrations connection status (heuristic)
		 */
		public function get_integrations_status($request)
		{
			$statuses = array();

			// Check GitHub
			$github_settings = get_option('afmp__github_settings', array());
			$statuses['github'] = $this->is_integration_settings_enabled($github_settings);

			// Check OneDrive
			$onedrive_settings = get_option('afmp__onedrive_settings', array());
			$statuses['onedrive'] = $this->is_integration_settings_enabled($onedrive_settings);

			// Check Google Drive
			$googledrive_settings = get_option('afmp__googledrive_settings', array());
			$statuses['googledrive'] = $this->is_integration_settings_enabled($googledrive_settings);

			// Check Google Cloud Storage
			$googlecloud_settings = get_option('afmp__googlecloud_settings', array());
			$statuses['googlecloud'] = $this->is_integration_settings_enabled($googlecloud_settings);

			// Check Dropbox
			$dropbox_settings = get_option('afmp__dropbox_settings', array());
			$statuses['dropbox'] = $this->is_integration_settings_enabled($dropbox_settings);

			// Check Amazon S3
			$amazons3_settings = get_option('afmp__amazons3_settings', array());
			$statuses['amazonses'] = $this->is_integration_settings_enabled($amazons3_settings);

			// Check pCloud
			$pcloud_settings = get_option('afmp__pcloud_settings', array());
			$statuses['pcloud'] = $this->is_integration_settings_enabled($pcloud_settings);

			// Check Cloudflare R2
			$cloudflarer2_settings = get_option('afmp__cloudflarer2_settings', array());
			$r2_enabled = $this->is_integration_settings_enabled($cloudflarer2_settings);
			$statuses['cloudflare-r2'] = $r2_enabled;
			$statuses['cloudflarer2'] = $r2_enabled;

			$wasabi_settings = get_option('afmp__wasabi_settings', array());
			$statuses['wasabi'] = $this->is_integration_settings_enabled($wasabi_settings);

			// Check AI Code Pilot (stored as user meta, not option)
			$current_user_id = get_current_user_id();
			$ai_enabled = get_user_meta($current_user_id, 'afmp_ai_enabled', true);
			$statuses['ai'] = ($ai_enabled === '1');

			return new WP_REST_Response(array('connected' => $statuses), 200);
		}

		/**
		 * Get recent files and quick access directories
		 * @return WP_REST_Response
		 */
		public function get_recent_files($request)
		{
			$root = WP_CONTENT_DIR;
			$recent_files = array();
			$quick_dirs = array(
				array(
					'name' => 'Uploads',
					'path' => wp_upload_dir()['basedir'],
					'short_path' => '/wp-content/uploads',
				),
				array(
					'name' => 'Themes',
					'path' => get_theme_root(),
					'short_path' => '/wp-content/themes',
				),
				array(
					'name' => 'Plugins',
					'path' => WP_PLUGIN_DIR,
					'short_path' => '/wp-content/plugins',
				),
			);

			// Get recent files (last 10 modified)
			if (is_dir($root)) {
				$files = array();
				$iterator = new RecursiveIteratorIterator(
					new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS),
					RecursiveIteratorIterator::LEAVES_ONLY
				);
				foreach ($iterator as $file) {
					if ($file->isFile()) {
						$files[] = array(
							'path' => $file->getPathname(),
							'name' => $file->getFilename(),
							'size' => $file->getSize(),
							'mtime' => $file->getMTime(),
							'ext' => strtolower(pathinfo($file->getFilename(), PATHINFO_EXTENSION)),
						);
					}
					// Limit to avoid memory issues - we only need the most recent
					if (count($files) > 1000) {
						break;
					}
				}
				// Sort by modification time (newest first)
				usort($files, function ($a, $b) {
					return $b['mtime'] - $a['mtime'];
				});
				// Take top 10
				$recent_files = array_slice($files, 0, 10);
			}

			// Format files with relative paths
			foreach ($recent_files as &$file) {
				$file['relative_path'] = str_replace(ABSPATH, '/', $file['path']);
				$file['time'] = date('Y-m-d H:i:s', $file['mtime']);
				unset($file['mtime']);
			}

			// Format quick directories with sizes
			foreach ($quick_dirs as &$dir) {
				if (is_dir($dir['path'])) {
					$dir['exists'] = true;
					$size = 0;
					$count = 0;
					$iterator = new RecursiveIteratorIterator(
						new RecursiveDirectoryIterator($dir['path'], FilesystemIterator::SKIP_DOTS),
						RecursiveIteratorIterator::LEAVES_ONLY
					);
					foreach ($iterator as $file) {
						if ($file->isFile()) {
							$size += $file->getSize();
							$count++;
						}
					}
					$dir['size'] = $size;
					$dir['files'] = $count;
				} else {
					$dir['exists'] = false;
					$dir['size'] = 0;
					$dir['files'] = 0;
				}
			}

			return new WP_REST_Response(array(
				'recent_files' => $recent_files,
				'quick_dirs' => $quick_dirs,
			), 200);
		}

		/**
		 * Get plugin settings and info
		 * @return WP_REST_Response
		 */
		public function get_plugin_settings($request)
		{
			// Get plugin version
			$plugin_data = get_file_data(plugin_dir_path(dirname(dirname(__FILE__))) . 'file_manager_advanced.php', array('Version' => 'Version'), 'plugin');
			$version = isset($plugin_data['Version']) ? $plugin_data['Version'] : '5.4.5';

			// Get plugin settings from options
			$fmaoptions = get_option('fmaoptions', array());

			// Root directory
			if (isset($fmaoptions['public_path']) && !empty($fmaoptions['public_path'])) {
				$root_dir = $fmaoptions['public_path'];
			} else {
				$root_dir = isset($fmaoptions['root']) ? $fmaoptions['root'] : ABSPATH;
			}
			if (empty($root_dir)) {
				$root_dir = ABSPATH;
			}

			// Who can access (user roles)
			$allowed_roles = isset($fmaoptions['fma_user_roles']) ? $fmaoptions['fma_user_roles'] : array('administrator');
			if (!is_array($allowed_roles)) {
				$allowed_roles = array('administrator');
			}
			$roles_display = array();
			$wp_roles = wp_roles();
			foreach ($allowed_roles as $role) {
				if (isset($wp_roles->roles[$role])) {
					$roles_display[] = $wp_roles->roles[$role]['name'];
				}
			}

			// Theme
			if (isset($fmaoptions['fma_theme']) && !empty($fmaoptions['fma_theme'])) {
				$theme = $fmaoptions['fma_theme'];
			} else {
				$theme = isset($fmaoptions['theme']) ? $fmaoptions['theme'] : 'default';
			}

			$themes_map = array(
				'light' => __('Default', 'file-manager-advanced'),
				'mono' => __('Mono', 'file-manager-advanced'),
				'dark' => __('Material Dark', 'file-manager-advanced'),
				'm-light' => __('Material Light', 'file-manager-advanced'),
				'grey' => __('Material Grey', 'file-manager-advanced'),
				'windows10' => __('Windows 10', 'file-manager-advanced'),
				'bootstrap' => __('Bootstrap', 'file-manager-advanced'),
			);

			if (isset($themes_map[$theme])) {
				$theme_display = $themes_map[$theme];
			} else {
				$theme_display = ucfirst(str_replace(array('-', '_'), ' ', $theme));
			}

			// Security features
			$hide_path = isset($fmaoptions['hide_path']) ? $fmaoptions['hide_path'] : 'no';
			$hide_path_display = ('yes' === $hide_path) ? 'Enabled' : 'Disabled';

			// Settings URLs
			$settings_url = admin_url('admin.php?page=file_manager_advanced_controls');
			$file_manager_url = admin_url('admin.php?page=file_manager_advanced_ui');

			return new WP_REST_Response(array(
				'version' => $version,
				'root_directory' => $root_dir,
				'allowed_roles' => $allowed_roles,
				'allowed_roles_display' => $roles_display,
				'theme' => $theme,
				'theme_display' => $theme_display,
				'hide_path' => $hide_path,
				'hide_path_display' => $hide_path_display,
				'settings_url' => $settings_url,
				'file_manager_url' => $file_manager_url,
			), 200);
		}

		/**
		 * Storage usage for the configured file manager root.
		 * @return WP_REST_Response
		 */
		public function get_storage_usage($request)
		{
			require_once dirname(__FILE__) . '/class-afm-storage-stats.php';

			$force_refresh = is_object($request) && method_exists($request, 'get_param') && $request->get_param('refresh') === '1';

			try {
				$data = AFM_Storage_Stats::get_usage($force_refresh);
			} catch (\Throwable $e) {
				// AFM-963: TasteWP / low-resource hosts can fatally abort the scan.
				$data = AFM_Storage_Stats::get_fallback_response($e->getMessage());
			}

			if (!is_array($data) || empty($data['breakdown'])) {
				$data = AFM_Storage_Stats::get_fallback_response('Invalid storage payload');
			}

			return new WP_REST_Response($data, 200);
		}

		/**
		 * Clear cached dashboard storage stats.
		 */
		public function clear_storage_usage_cache()
		{
			require_once dirname(__FILE__) . '/class-afm-storage-stats.php';
			AFM_Storage_Stats::clear_cache();
		}

		/**
		 * Get Settings
		 * @return WP_REST_Response
		 */
		public function get_settings($request)
		{
			require_once dirname(dirname(__FILE__)) . '/class_fma_main.php';
			require_once dirname(dirname(__FILE__)) . '/class_fma_admin_menus.php';
			$admin_menus = new class_fma_admin_menus();
			$settings = $admin_menus->get();

			// Ensure settings is always an array, even if Pro is deactivated
			if (!is_array($settings)) {
				$settings = array();
			}

			// Set default values if settings are empty
			$default_settings = array(
				'fma_locale' => 'en',
				'fma_cm_theme' => 'default',
				'fma_theme' => 'light',
				'fma_user_roles' => array('administrator'),
			);
			$settings = wp_parse_args($settings, $default_settings);

			// Get locales - handle case where langs might not be available
			$locales = array();
			if (isset($admin_menus->langs) && is_object($admin_menus->langs) && method_exists($admin_menus->langs, 'locales')) {
				$locales = $admin_menus->langs->locales();
			}
			if (!is_array($locales)) {
				$locales = array();
			}

			$path = str_replace('\\', '/', ABSPATH);
			$public_root_path = trailingslashit($path);
			$url = function_exists('fma_resolve_local_volume_url')
				? fma_resolve_local_volume_url($settings, $path)
				: home_url('/');
			$configured_public_path = isset($settings['public_path']) && !empty($settings['public_path']) ? $settings['public_path'] : '';
			$public_path_suffix = ( 0 === strpos($configured_public_path, $public_root_path) )
				? ltrim(substr($configured_public_path, strlen($public_root_path)), '/')
				: ( ( '' !== $configured_public_path && ! file_exists($configured_public_path) ) ? ltrim($configured_public_path, '/\\') : '' );
			$public_url = isset($settings['public_url']) && !empty($settings['public_url']) ? $settings['public_url'] : $url;

			// Get roles - handle case where method might not be available
			$roles = array();
			if (method_exists($admin_menus, 'wpUserRoles')) {
				$roles = $admin_menus->wpUserRoles();
			}
			if (!is_array($roles)) {
				$roles = array();
			}

			// Get CodeMirror themes - handle case where class might not be available
			$cm_themes = array();
			if (class_exists('class_fma_main') && method_exists('class_fma_main', 'cm_themes')) {
				$cm_themes = class_fma_main::cm_themes();
			}
			if (!is_array($cm_themes)) {
				$cm_themes = array();
			}

			// Get themes list
			$themes = array(
				'light' => array('title' => __('Default', 'file-manager-advanced'), 'pro' => false),
				'mono' => array('title' => __('Mono', 'file-manager-advanced'), 'pro' => false),
				'dark' => array('title' => __('Material Dark', 'file-manager-advanced'), 'pro' => true),
				'm-light' => array('title' => __('Material Light', 'file-manager-advanced'), 'pro' => true),
				'grey' => array('title' => __('Material Grey', 'file-manager-advanced'), 'pro' => true),
				'windows10' => array('title' => __('Windows 10', 'file-manager-advanced'), 'pro' => true),
				'bootstrap' => array('title' => __('Bootstrap', 'file-manager-advanced'), 'pro' => true),
			);

			// Get UI options - always return the full list of available options (not the saved selections)
			// This is used to show all checkboxes in the UI
			// The saved display_ui_options in settings is what the user has selected
			$ui_options = defined('FMA_UI') ? FMA_UI : array('toolbar', 'tree', 'path', 'stat');

			return new WP_REST_Response(array(
				'settings' => $settings,
				'locales' => $locales,
				'path' => $path,
				'public_root_path' => $public_root_path,
				'public_path_suffix' => $public_path_suffix,
				'public_url' => $public_url,
				'site_url' => site_url(),
				'url' => $url,
				'roles' => $roles,
				'themes' => $themes,
				'cm_themes' => $cm_themes,
				'ui_options' => $ui_options,
				'has_pro' => class_fma_main::has_pro() || class_exists('file_manager_advanced_shortcode'),
			), 200);
		}

		/**
		 * Save Settings
		 * @return WP_REST_Response
		 */
		public function save_settings($request)
		{
			if (!current_user_can('manage_options')) {
				return new WP_Error('forbidden', __('You do not have permission to save settings.', 'file-manager-advanced'), array('status' => 403));
			}

			require_once dirname(dirname(__FILE__)) . '/class_fma_main.php';
			require_once dirname(dirname(__FILE__)) . '/class_fma_admin_menus.php';
			$admin_menus = new class_fma_admin_menus();

			$params = $request->get_json_params();
			if (empty($params)) {
				$params = $request->get_body_params();
			}

			// Get existing settings to preserve values not being updated
			$existing_settings = $admin_menus->get();
			if (!is_array($existing_settings)) {
				$existing_settings = array();
			}

			$save = array();
			$defaultRole = array('administrator');
			if (is_multisite()) {
				$defaultRole = array();
			}

			$public_dir = isset($params['public_path']) ? sanitize_text_field($params['public_path']) : '';
			// Only update fields that are explicitly provided in the request
			if (isset($params['fma_user_role'])) {
				$save['fma_user_roles'] = array_map('sanitize_text_field', $params['fma_user_role']);
			} else {
				$save['fma_user_roles'] = isset($existing_settings['fma_user_roles']) ? $existing_settings['fma_user_roles'] : $defaultRole;
			}
			if (isset($params['fma_theme'])) {
				$save['fma_theme'] = sanitize_text_field($params['fma_theme']);
			} else {
				$save['fma_theme'] = isset($existing_settings['fma_theme']) ? $existing_settings['fma_theme'] : 'light';
			}
			if (isset($params['fma_locale'])) {
				$save['fma_locale'] = sanitize_text_field($params['fma_locale']);
			} else {
				$save['fma_locale'] = isset($existing_settings['fma_locale']) ? $existing_settings['fma_locale'] : 'en';
			}
			if (isset($params['public_path'])) {
				$clean_dir = method_exists($admin_menus, 'afm_sanitize_directory') ? $admin_menus->afm_sanitize_directory($public_dir) : sanitize_text_field($public_dir);
				$clean_dir = ltrim($clean_dir, '/\\');
				$default_root = trailingslashit(wp_normalize_path(ABSPATH));
				if ('' === $clean_dir || $default_root === trailingslashit(wp_normalize_path($clean_dir))) {
					$save['public_path'] = '';
				} elseif (0 === strpos(wp_normalize_path($clean_dir), $default_root)) {
					$save['public_path'] = wp_normalize_path($clean_dir);
				} else {
					$save['public_path'] = $default_root . $clean_dir;
				}
			} else {
				$save['public_path'] = isset($existing_settings['public_path']) ? $existing_settings['public_path'] : '';
			}
			if (isset($params['public_url'])) {
				$public_url = esc_url_raw($params['public_url']);
				$default_public_url = untrailingslashit(site_url());
				$configured_path = isset($save['public_path']) ? $save['public_path'] : '';
				$path_suffix = 0 === strpos(wp_normalize_path($configured_path), trailingslashit(wp_normalize_path(ABSPATH)))
					? ltrim(substr(wp_normalize_path($configured_path), strlen(trailingslashit(wp_normalize_path(ABSPATH)))), '/')
					: '';

				if (empty($public_url) || $default_public_url === untrailingslashit($public_url) || 0 === strpos($public_url, $default_public_url)) {
					$save['public_url'] = empty($path_suffix) ? $default_public_url : trailingslashit($default_public_url) . str_replace('\\', '/', $path_suffix);
				} else {
					$save['public_url'] = $public_url;
				}
			} else {
				$save['public_url'] = isset($existing_settings['public_url']) ? $existing_settings['public_url'] : '';
			}
			if (isset($params['upload_max_size'])) {
				$val = sanitize_text_field($params['upload_max_size']);
				$save['upload_max_size'] = ('' === $val) ? '0' : $val;
			} else {
				$save['upload_max_size'] = isset($existing_settings['upload_max_size']) ? $existing_settings['upload_max_size'] : '0';
			}
			// Only update display_ui_options if it's explicitly provided in the request
			// This prevents clearing it when submitting from General Settings tab
			$default_ui_options = defined('FMA_UI') ? FMA_UI : array('toolbar', 'tree', 'path', 'stat');
			if (isset($params['display_ui_options'])) {
				$save['display_ui_options'] = array_map('sanitize_text_field', $params['display_ui_options']);
			} elseif (array_key_exists('display_ui_options', $existing_settings) && is_array($existing_settings['display_ui_options'])) {
				// Preserve existing value (including an intentional empty array from Advanced Settings)
				$save['display_ui_options'] = $existing_settings['display_ui_options'];
			} else {
				// Never configured — default to all view types (matches legacy UI + elFinder init)
				$save['display_ui_options'] = $default_ui_options;
			}
			// Only update hide_path if it's explicitly provided in the request
			if (isset($params['hide_path'])) {
				$save['hide_path'] = absint($params['hide_path']);
			} else {
				// Preserve existing value if not provided
				$save['hide_path'] = isset($existing_settings['hide_path']) ? absint($existing_settings['hide_path']) : 0;
			}
			// Only update enable_trash if it's explicitly provided
			if (isset($params['enable_trash'])) {
				$save['enable_trash'] = absint($params['enable_trash']);
			} else {
				$save['enable_trash'] = isset($existing_settings['enable_trash']) ? absint($existing_settings['enable_trash']) : 0;
			}
			// Only update enable_htaccess if it's explicitly provided
			if (isset($params['enable_htaccess'])) {
				$save['enable_htaccess'] = absint($params['enable_htaccess']);
			} else {
				$save['enable_htaccess'] = isset($existing_settings['enable_htaccess']) ? absint($existing_settings['enable_htaccess']) : 0;
			}
			// Only update display_dot_files if it's explicitly provided
			if (isset($params['display_dot_files'])) {
				$save['display_dot_files'] = absint($params['display_dot_files']);
			} else {
				$save['display_dot_files'] = isset($existing_settings['display_dot_files']) ? absint($existing_settings['display_dot_files']) : 0;
			}
			// Only update allowed_extensions if it's explicitly provided
			if (isset($params['allowed_extensions'])) {
				$save['allowed_extensions'] = sanitize_text_field($params['allowed_extensions']);
			} else {
				$save['allowed_extensions'] = isset($existing_settings['allowed_extensions']) ? $existing_settings['allowed_extensions'] : '';
			}
			// Only update blocked_extensions if it's explicitly provided
			if (isset($params['blocked_extensions'])) {
				$save['blocked_extensions'] = sanitize_text_field($params['blocked_extensions']);
			} else {
				$save['blocked_extensions'] = isset($existing_settings['blocked_extensions']) ? $existing_settings['blocked_extensions'] : '';
			}
			// Only update hidden_paths if it's explicitly provided
			if (isset($params['hidden_paths'])) {
				$save['hidden_paths'] = sanitize_text_field($params['hidden_paths']);
			} else {
				$save['hidden_paths'] = isset($existing_settings['hidden_paths']) ? $existing_settings['hidden_paths'] : '';
			}
			// Only update storage_type if it's explicitly provided
			if (isset($params['storage_type'])) {
				$save['storage_type'] = sanitize_text_field($params['storage_type']);
			} else {
				$save['storage_type'] = isset($existing_settings['storage_type']) ? $existing_settings['storage_type'] : 'Local Storage';
			}
			// Only update blocked_integrations if it's explicitly provided
			if (isset($params['blocked_integrations'])) {
				$save['blocked_integrations'] = array_map('sanitize_text_field', $params['blocked_integrations']);
			} else {
				$save['blocked_integrations'] = isset($existing_settings['blocked_integrations']) ? $existing_settings['blocked_integrations'] : array();
			}
			// Only update fma_upload_allow if it's explicitly provided
			if (isset($params['fma_upload_allow'])) {
				$val = sanitize_text_field($params['fma_upload_allow']);
				$save['fma_upload_allow'] = ('' === $val) ? 'all' : $val;
			} else {
				$save['fma_upload_allow'] = isset($existing_settings['fma_upload_allow']) ? $existing_settings['fma_upload_allow'] : 'all';
			}
			// Only update fma_cm_theme if it's explicitly provided
			if (isset($params['fma_cm_theme'])) {
				$save['fma_cm_theme'] = sanitize_text_field($params['fma_cm_theme']);
			} else {
				$save['fma_cm_theme'] = isset($existing_settings['fma_cm_theme']) ? $existing_settings['fma_cm_theme'] : 'default';
			}
			// Only update fma_debug_enabled if it's explicitly provided
			if (isset($params['fma_debug_enabled'])) {
				// Handle fma_debug_enabled - can be '1', '0', 1, or 0
				$debug_enabled = $params['fma_debug_enabled'];
				// Convert to string '1' or '0' for consistency
				$save['fma_debug_enabled'] = ($debug_enabled === '1' || $debug_enabled === 1 || $debug_enabled === true) ? '1' : '0';
			} else {
				// Preserve existing value if not provided
				$save['fma_debug_enabled'] = isset($existing_settings['fma_debug_enabled']) ? $existing_settings['fma_debug_enabled'] : '0';
			}

			// Ensure administrator is always included in fma_user_roles
			if (empty($save['fma_user_roles']) || !in_array('administrator', $save['fma_user_roles'])) {
				if (!is_array($save['fma_user_roles'])) {
					$save['fma_user_roles'] = array();
				}
				array_unshift($save['fma_user_roles'], 'administrator');
				$save['fma_user_roles'] = array_unique($save['fma_user_roles']);
			}

			// Update option - update_option returns false if value didn't change, not necessarily an error
			// Note: $save already contains all fields with either new values or preserved existing values
			$updated = update_option('fmaoptions', $save);

			// If update_option returns false, check if it's because value didn't change or actual error
			// Get current saved value to compare
			$current_settings = get_option('fmaoptions', array());

			// Compare arrays - if they're the same, update_option returns false but that's OK
			if ($updated === false) {
				// Sort arrays for comparison
				$save_sorted = $save;
				$current_sorted = $current_settings;
				if (isset($save_sorted['fma_user_roles'])) {
					sort($save_sorted['fma_user_roles']);
				}
				if (isset($current_sorted['fma_user_roles'])) {
					sort($current_sorted['fma_user_roles']);
				}
				if (isset($save_sorted['display_ui_options'])) {
					sort($save_sorted['display_ui_options']);
				}
				if (isset($current_sorted['display_ui_options'])) {
					sort($current_sorted['display_ui_options']);
				}
				if ($save_sorted === $current_sorted) {
					// Value didn't change, but that's still success
					$updated = true;
				}
			}

			if ($updated !== false) {
				$this->clear_storage_usage_cache();
				$path = str_replace('\\', '/', ABSPATH);
				$public_root_path = trailingslashit($path);
				$url = function_exists('fma_resolve_local_volume_url')
					? fma_resolve_local_volume_url($save, $path)
					: home_url('/');
				$configured_public_path = isset($save['public_path']) && !empty($save['public_path']) ? $save['public_path'] : '';
				$public_path_suffix = ( 0 === strpos($configured_public_path, $public_root_path) )
					? ltrim(substr($configured_public_path, strlen($public_root_path)), '/')
					: ( ( '' !== $configured_public_path && ! file_exists($configured_public_path) ) ? ltrim($configured_public_path, '/\\') : '' );
				$public_url = isset($save['public_url']) && !empty($save['public_url']) ? $save['public_url'] : $url;

				return new WP_REST_Response(array(
					'success' => true,
					'message' => __('Settings saved successfully.', 'file-manager-advanced'),
					'settings' => $save,
					'public_root_path' => $public_root_path,
					'public_path_suffix' => $public_path_suffix,
					'public_url' => $public_url,
					'site_url' => site_url(),
					'url' => $url,
				), 200);
			} else {
				// Log error for debugging
				error_log('AFM Settings Save Error: Failed to update fmaoptions. Save data: ' . print_r($save, true) . ' Current: ' . print_r($current_settings, true));
				return new WP_Error('save_failed', __('Failed to save settings.', 'file-manager-advanced'), array('status' => 500));
			}
		}

		/**
		 * Get Notifications Settings
		 * @return WP_REST_Response
		 */
		public function get_notifications($request)
		{
			// Load class if not already loaded
			if (!class_exists('class_fma_main')) {
				$main_file = dirname(dirname(__FILE__)) . '/class_fma_main.php';
				if (file_exists($main_file)) {
					require_once $main_file;
				}
			}

			$hasPro = false;
			if (class_exists('class_fma_main')) {
				$hasPro = class_fma_main::has_pro();
			}
			$hasPro = $hasPro || class_exists('file_manager_advanced_shortcode');

			$email_settings = get_option('afmp__email_notification_settings', array());
			$slack_settings = get_option('afmp__slack_notification_settings', array());

			// Ensure settings are arrays
			if (!is_array($email_settings)) {
				$email_settings = array();
			}
			if (!is_array($slack_settings)) {
				$slack_settings = array();
			}

			$old_email_default = "Hi {admin_email},\n\nThe file action {event} was performed on {file_name} ({ext}) at {date_time} from IP {ip_address} on {site_name} by {username}.\n\nThank you for using Advanced File Manager.";
			$old_email_item_type_default = "Hi {admin_email},\n\nThe {item_type} action {event} was performed on {file_name} ({ext}) at {date_time} from IP {ip_address} on {site_name} by {username}.\n\nThank you for using Advanced File Manager.";
			$old_slack_default = "Hi {admin_email},\n\nA quick update from the Advanced File Manager plugin on your site {site_name}.\nA file was {event} by {username} on {date_time}. The file name is {file_name} with the extension {ext}, and the action was performed from the following IP Address: {ip_address}.";
			$new_slack_default = "Hi {admin_email},\n\nA quick update from the Advanced File Manager plugin on your site {site_name}.\nA {item_type} was {event} by {username} on {date_time}. The {item_type} name is {file_name} with the extension {ext}, and the action was performed from the following IP Address: {ip_address}.";
			$new_email_default = $new_slack_default;

			// Auto-migrate old defaults to new {item_type} defaults.
			if (
				isset($email_settings['message']) &&
				in_array(
					trim((string) $email_settings['message']),
					array($old_email_default, $old_email_item_type_default),
					true
				)
			) {
				$email_settings['message'] = $new_email_default;
				update_option('afmp__email_notification_settings', $email_settings);
			}
			if (isset($slack_settings['message']) && trim((string) $slack_settings['message']) === $old_slack_default) {
				$slack_settings['message'] = $new_slack_default;
				update_option('afmp__slack_notification_settings', $slack_settings);
			}
			if (isset($slack_settings['message']) && strpos((string) $slack_settings['message'], '{item_type}') === false) {
				$migrated_slack = str_replace(
					array('A file was {event}', 'The file name is {file_name}'),
					array('A {item_type} was {event}', 'The {item_type} name is {file_name}'),
					(string) $slack_settings['message']
				);
				if ($migrated_slack !== (string) $slack_settings['message']) {
					$slack_settings['message'] = $migrated_slack;
					update_option('afmp__slack_notification_settings', $slack_settings);
				}
			}

			// Default values
			$default_email_subject = 'AFM File Log Recent Activity';
			$emailDefaults = array(
				'enable' => 'no',
				'email' => '',
				'events' => array(),
				'subject' => $default_email_subject,
				'message' => $new_email_default
			);

			$slackDefaults = array(
				'enable' => 'no',
				'webhook_url' => '',
				'events' => array(),
				'message' => $new_slack_default
			);

			$email = wp_parse_args($email_settings, $emailDefaults);
			if ('' === trim((string) $email['subject'])) {
				$email['subject'] = $default_email_subject;
			}

			// Repair templates whose line breaks were wiped by older textarea sanitization.
			if (class_exists('class_fma_notification_message')) {
				$email_restored = class_fma_notification_message::restore_message_structure(
					isset($email['message']) ? (string) $email['message'] : ''
				);
				if ($email_restored !== (string) ($email['message'] ?? '')) {
					$email['message'] = $email_restored;
					$email_settings['message'] = $email_restored;
					update_option('afmp__email_notification_settings', $email_settings);
				}

				$slack = wp_parse_args($slack_settings, $slackDefaults);
				$slack_restored = class_fma_notification_message::restore_message_structure(
					isset($slack['message']) ? (string) $slack['message'] : ''
				);
				if ($slack_restored !== (string) ($slack['message'] ?? '')) {
					$slack['message'] = $slack_restored;
					$slack_settings['message'] = $slack_restored;
					update_option('afmp__slack_notification_settings', $slack_settings);
				}

				return new WP_REST_Response(array(
					'has_pro' => $hasPro,
					'email' => $email,
					'slack' => $slack,
				), 200);
			}

			return new WP_REST_Response(array(
				'has_pro' => $hasPro,
				'email' => $email,
				'slack' => wp_parse_args($slack_settings, $slackDefaults),
			), 200);
		}

		/**
		 * Save Notifications Settings
		 * @return WP_REST_Response
		 */
		public function save_notifications($request)
		{
			if (!current_user_can('manage_options')) {
				return new WP_Error('forbidden', __('You do not have permission to save settings.', 'file-manager-advanced'), array('status' => 403));
			}

			// Load class if not already loaded
			if (!class_exists('class_fma_main')) {
				$main_file = dirname(dirname(__FILE__)) . '/class_fma_main.php';
				if (file_exists($main_file)) {
					require_once $main_file;
				}
			}

			$hasPro = false;
			if (class_exists('class_fma_main')) {
				$hasPro = class_fma_main::has_pro();
			}
			$hasPro = $hasPro || class_exists('file_manager_advanced_shortcode');
			if (!$hasPro) {
				return new WP_Error('pro_required', __('Pro version is required for notifications.', 'file-manager-advanced'), array('status' => 403));
			}

			$params = $request->get_json_params();
			if (empty($params)) {
				$params = $request->get_body_params();
			}

			// Email notification settings
			if (isset($params['email'])) {
				// Get existing email settings to preserve values not being updated
				$existing_email_settings = get_option('afmp__email_notification_settings', array());
				if (!is_array($existing_email_settings)) {
					$existing_email_settings = array();
				}

				$default_email_subject = 'AFM File Log Recent Activity';
				$raw_subject = isset($params['email']['subject'])
					? sanitize_text_field($params['email']['subject'])
					: (isset($existing_email_settings['subject']) ? $existing_email_settings['subject'] : '');
				if ('' === trim((string) $raw_subject)) {
					$raw_subject = $default_email_subject;
				}

				// Merge existing settings with new ones (new values override existing)
				$email_settings = array_merge($existing_email_settings, array(
					'enable' => isset($params['email']['enable']) ? sanitize_text_field($params['email']['enable']) : (isset($existing_email_settings['enable']) ? $existing_email_settings['enable'] : 'no'),
					'email' => isset($params['email']['email']) ? sanitize_email($params['email']['email']) : (isset($existing_email_settings['email']) ? $existing_email_settings['email'] : ''),
					'events' => isset($params['email']['events']) && is_array($params['email']['events']) ? array_map('sanitize_text_field', $params['email']['events']) : (isset($existing_email_settings['events']) ? $existing_email_settings['events'] : array()),
					'subject' => $raw_subject,
					'message' => isset($params['email']['message']) && class_exists('class_fma_notification_message')
						? class_fma_notification_message::sanitize_message($params['email']['message'])
						: (isset($params['email']['message']) ? sanitize_textarea_field($params['email']['message']) : (isset($existing_email_settings['message']) ? $existing_email_settings['message'] : ''))
				));
				update_option('afmp__email_notification_settings', $email_settings);
			}

			// Slack notification settings
			if (isset($params['slack'])) {
				// Get existing Slack settings to preserve values not being updated
				$existing_slack_settings = get_option('afmp__slack_notification_settings', array());
				if (!is_array($existing_slack_settings)) {
					$existing_slack_settings = array();
				}

				// Merge existing settings with new ones (new values override existing)
				$slack_settings = array_merge($existing_slack_settings, array(
					'enable' => isset($params['slack']['enable']) ? sanitize_text_field($params['slack']['enable']) : (isset($existing_slack_settings['enable']) ? $existing_slack_settings['enable'] : 'no'),
					'webhook_url' => isset($params['slack']['webhook_url']) ? esc_url_raw($params['slack']['webhook_url']) : (isset($existing_slack_settings['webhook_url']) ? $existing_slack_settings['webhook_url'] : ''),
					'events' => isset($params['slack']['events']) && is_array($params['slack']['events']) ? array_map('sanitize_text_field', $params['slack']['events']) : (isset($existing_slack_settings['events']) ? $existing_slack_settings['events'] : array()),
					'message' => isset($params['slack']['message']) && class_exists('class_fma_notification_message')
						? class_fma_notification_message::sanitize_slack_message($params['slack']['message'])
						: (isset($params['slack']['message']) ? sanitize_textarea_field($params['slack']['message']) : (isset($existing_slack_settings['message']) ? $existing_slack_settings['message'] : ''))
				));
				update_option('afmp__slack_notification_settings', $slack_settings);
			}

			// Return saved templates so the React UI can keep Quill HTML without a stale refetch race.
			$email_saved = get_option('afmp__email_notification_settings', array());
			$slack_saved = get_option('afmp__slack_notification_settings', array());
			if (!is_array($email_saved)) {
				$email_saved = array();
			}
			if (!is_array($slack_saved)) {
				$slack_saved = array();
			}

			return new WP_REST_Response(array(
				'success' => true,
				'message' => __('Notification settings saved successfully.', 'file-manager-advanced'),
				'email' => $email_saved,
				'slack' => $slack_saved,
			), 200);
		}

		// ============================================
		// INTEGRATION METHODS - Settings Management
		// ============================================

		/**
		 * Get Integration Settings
		 * @param WP_REST_Request $request
		 * @return WP_REST_Response
		 */
		public function get_integration_settings($request)
		{
			if (!current_user_can('manage_options')) {
				return new WP_Error('forbidden', __('You do not have permission to view settings.', 'file-manager-advanced'), array('status' => 403));
			}

			$integration_id = sanitize_text_field($request->get_param('id'));

			// Special handling for AI Code Pilot - uses user meta instead of options
			if ($integration_id === 'ai-code-assistent') {
				$current_user_id = get_current_user_id();
				$enabled = get_user_meta($current_user_id, 'afmp_ai_enabled', true);
				$api_key = get_user_meta($current_user_id, 'afmp_gpt_api_key', true);

				$settings = array(
					'enable' => $enabled === '1' ? 'yes' : 'no',
					'gpt_api_key' => $api_key ? $api_key : ''
				);

				return new WP_REST_Response($settings, 200);
			}

			// Map integration IDs to option names
			$option_map = array(
				'onedrive' => 'afmp__onedrive_settings',
				'google-drive' => 'afmp__googledrive_settings',
				'dropbox' => 'afmp__dropbox_settings',
				'amazon-s3' => 'afmp__amazons3_settings',
				'pcloud' => 'afmp__pcloud_settings',
				'cloudflare-r2' => 'afmp__cloudflarer2_settings',
				'wasabi' => 'afmp__wasabi_settings',
				'github' => 'afmp__github_settings',
				'google-cloud-storage' => 'afmp__googlecloud_settings',
				'azure-cloud-storage' => 'afmp__azurecloud_settings',
			);

			$option_name = isset($option_map[$integration_id]) ? $option_map[$integration_id] : null;

			if (!$option_name) {
				return new WP_Error('invalid_integration', __('Invalid integration ID.', 'file-manager-advanced'), array('status' => 400));
			}

			$settings = get_option($option_name, array());

			// Ensure settings is an array
			if (!is_array($settings)) {
				$settings = array();
			}

			// Normalize legacy Pro GitHub keys (token) for React UI (pat).
			if ($integration_id === 'github') {
				$settings = $this->normalize_github_settings($settings);
				$settings['ajax_nonce'] = wp_create_nonce('afmp_github_nonce');
				$settings['ajax_url'] = admin_url('admin-ajax.php');
			}

			// OAuth redirect URIs — preserve legacy Pro 3.8.x setups when already connected.
			if (in_array($integration_id, array('dropbox', 'onedrive', 'google-drive', 'pcloud'), true)) {
				$settings['redirect_uri'] = $this->get_oauth_integration_redirect_uri($integration_id, $settings);
			} elseif (!isset($settings['redirect_uri'])) {
				$settings['redirect_uri'] = site_url();
			}

			if ($integration_id === 'google-drive' && empty($settings['javascript_origin'])) {
				$settings['javascript_origin'] = site_url();
			}

			// Add connection status for OneDrive
			if ($integration_id === 'onedrive') {
				$access_token = get_option('afmp__onedrive_access_token', '');
				$settings['is_connected'] = !empty($access_token);
			}

			// Add connection status for Google Drive
			if ($integration_id === 'google-drive') {
				$authentication_token = get_option('afmp__googledrive_authentication_token', '');
				$settings['is_connected'] = !empty($authentication_token);

				// Check for error message from transient
				$googledrive_error = get_transient('afmp_googledrive_error');
				if (!empty($googledrive_error)) {
					$settings['error_message'] = $googledrive_error;
					// Delete transient after reading it
					delete_transient('afmp_googledrive_error');
				}
			}

			// Add connection status and library installation status for integrations
			// Map integration IDs to library names for library check
			$library_map = array(
				'dropbox' => 'dropbox',
				'google-cloud-storage' => 'googlecloud',
				'amazon-s3' => 'amazons3',
				'pcloud' => 'pcloud',
				'cloudflare-r2' => 'cloudflarer2',
				'wasabi' => 'wasabi',
			);

			// Check library installation status for integrations that require libraries
			if (isset($library_map[$integration_id])) {
				$settings['library_installed'] = $this->is_integration_library_installed($library_map[$integration_id]);
			}

			// Integration-specific additional data
			if ($integration_id === 'dropbox') {
				$authentication_token = get_option('afmp__dropbox_authentication_token', '');
				$settings['is_connected'] = !empty($authentication_token);

				// Check for error message from transient
				$dropbox_error = get_transient('afmp_dropbox_error');
				if (!empty($dropbox_error)) {
					$settings['error_message'] = $dropbox_error;
					// Delete transient after reading it
					delete_transient('afmp_dropbox_error');
				}
			}
			if ($integration_id === 'pcloud') {
				$authentication_token = get_option('afmp__pcloud_authentication_token', '');
				$settings['is_connected'] = !empty($authentication_token);

				$pcloud_error = get_transient('afmp_pcloud_error');
				if (!empty($pcloud_error)) {
					$settings['error_message'] = $pcloud_error;
					delete_transient('afmp_pcloud_error');
				}
			}

			if ($integration_id === 'wasabi' && isset($settings['alias']) && (!isset($settings['title']) || '' === trim((string) $settings['title']))) {
				$settings['title'] = $settings['alias'];
			}

			// For Google Cloud Storage, verify auth_key file exists
			if ($integration_id === 'google-cloud-storage') {
				if (isset($settings['auth_key']) && !empty($settings['auth_key'])) {
					// Check if the file actually exists
					if (!file_exists($settings['auth_key'])) {
						// File doesn't exist, clear it from settings
						$settings['auth_key'] = '';
						// Also update the database to remove the invalid path
						$options = get_option('afmp__googlecloud_settings', array());
						if (is_array($options)) {
							$options['auth_key'] = '';
							update_option('afmp__googlecloud_settings', $options);
						}
					}
				}
			}

			if (array_key_exists('enable', $settings)) {
				$settings['enable'] = $this->is_integration_enabled_flag($settings['enable']) ? 'yes' : 'no';
			}

			return new WP_REST_Response($settings, 200);
		}

		/**
		 * Save Integration Settings
		 * @param WP_REST_Request $request
		 * @return WP_REST_Response
		 */
		public function save_integration_settings($request)
		{
			if (!current_user_can('manage_options')) {
				return new WP_Error('forbidden', __('You do not have permission to save settings.', 'file-manager-advanced'), array('status' => 403));
			}

			$integration_id = sanitize_text_field($request->get_param('id'));

			// Special handling for AI Code Pilot - uses user meta instead of options
			if ($integration_id === 'ai-code-assistent') {
				$params = $request->get_json_params();
				if (empty($params)) {
					$params = $request->get_body_params();
				}

				$current_user_id = get_current_user_id();

				// Handle enable state
				if (isset($params['enable'])) {
					$enable = sanitize_text_field($params['enable']);
					update_user_meta($current_user_id, 'afmp_ai_enabled', $enable === 'yes' ? '1' : '0');
				}

				// Handle API key
				if (isset($params['gpt_api_key'])) {
					$api_key = sanitize_text_field($params['gpt_api_key']);
					// Only update if API key is provided (don't overwrite with empty string unless explicitly set)
					if (!empty($api_key)) {
						update_user_meta($current_user_id, 'afmp_gpt_api_key', $api_key);
					}
				}

				// Return saved settings
				$enabled = get_user_meta($current_user_id, 'afmp_ai_enabled', true);
				$api_key = get_user_meta($current_user_id, 'afmp_gpt_api_key', true);

				$settings = array(
					'enable' => $enabled === '1' ? 'yes' : 'no',
					'gpt_api_key' => $api_key ? $api_key : ''
				);

				return new WP_REST_Response(array(
					'success' => true,
					'settings' => $settings
				), 200);
			}

			// Map integration IDs to option names
			$option_map = array(
				'onedrive' => 'afmp__onedrive_settings',
				'google-drive' => 'afmp__googledrive_settings',
				'dropbox' => 'afmp__dropbox_settings',
				'amazon-s3' => 'afmp__amazons3_settings',
				'pcloud' => 'afmp__pcloud_settings',
				'cloudflare-r2' => 'afmp__cloudflarer2_settings',
				'wasabi' => 'afmp__wasabi_settings',
				'github' => 'afmp__github_settings',
				'google-cloud-storage' => 'afmp__googlecloud_settings',
				'azure-cloud-storage' => 'afmp__azurecloud_settings',
			);

			$option_name = isset($option_map[$integration_id]) ? $option_map[$integration_id] : null;

			if (!$option_name) {
				return new WP_Error('invalid_integration', __('Invalid integration ID.', 'file-manager-advanced'), array('status' => 400));
			}

			$params = $request->get_json_params();
			if (empty($params)) {
				$params = $request->get_body_params();
			}

			// Get existing settings
			$existing_settings = get_option($option_name, array());
			if (!is_array($existing_settings)) {
				$existing_settings = array();
			}

			// Merge with new settings
			$settings = array_merge($existing_settings, $params);

			// Sanitize settings based on integration type
			$sanitized_settings = array();

			// Common fields
			if (isset($settings['enable'])) {
				$sanitized_settings['enable'] = sanitize_text_field($settings['enable']);
			}
			if (isset($settings['title']) || isset($settings['alias'])) {
				$sanitized_settings['title'] = sanitize_text_field($settings['title'] ?? $settings['alias'] ?? '');
			}

			// Integration-specific fields
			switch ($integration_id) {
				case 'onedrive':
					if (isset($settings['app_id'])) {
						$app_id = sanitize_text_field($settings['app_id']);
						if ('' !== $app_id || empty($existing_settings['app_id'])) {
							$sanitized_settings['app_id'] = $app_id;
						} elseif (isset($existing_settings['app_id'])) {
							$sanitized_settings['app_id'] = sanitize_text_field($existing_settings['app_id']);
						}
					}
					if (array_key_exists('app_secret', $settings)) {
						$app_secret = sanitize_text_field($settings['app_secret']);
						if ('' !== $app_secret) {
							$sanitized_settings['app_secret'] = $app_secret;
						} elseif (!empty($existing_settings['app_secret'])) {
							$sanitized_settings['app_secret'] = sanitize_text_field($existing_settings['app_secret']);
						} else {
							$sanitized_settings['app_secret'] = '';
						}
					}
					if (isset($settings['title']) || isset($settings['alias'])) {
						$title = sanitize_text_field($settings['title'] ?? $settings['alias'] ?? '');
						if ('' !== $title || empty($existing_settings['title'])) {
							$sanitized_settings['title'] = $title;
						} elseif (isset($existing_settings['title'])) {
							$sanitized_settings['title'] = sanitize_text_field($existing_settings['title']);
						}
					} elseif (isset($existing_settings['title'])) {
						$sanitized_settings['title'] = sanitize_text_field($existing_settings['title']);
					}
					$sanitized_settings['redirect_uri'] = $this->get_oauth_integration_redirect_uri(
						'onedrive',
						array_merge($existing_settings, $sanitized_settings)
					);
					// Allow saving/clearing OneDrive private folder access from new UI.
					if (isset($settings['private_folder_access'])) {
						$sanitized_settings['private_folder_access'] = sanitize_text_field($settings['private_folder_access']);
					} elseif (isset($existing_settings['private_folder_access'])) {
						$sanitized_settings['private_folder_access'] = sanitize_text_field($existing_settings['private_folder_access']);
					} else {
						$sanitized_settings['private_folder_access'] = '';
					}
					break;
				case 'google-drive':
					if (isset($settings['app_key'])) {
						$sanitized_settings['app_key'] = $this->preserve_credential_field($settings['app_key'], $existing_settings, 'app_key');
					}
					if (array_key_exists('app_secret', $settings)) {
						$sanitized_settings['app_secret'] = $this->preserve_credential_field($settings['app_secret'], $existing_settings, 'app_secret');
					}
					$sanitized_settings['redirect_uri'] = $this->get_oauth_integration_redirect_uri(
						'google-drive',
						array_merge($existing_settings, $sanitized_settings)
					);
					if (isset($settings['javascript_origin'])) {
						$sanitized_settings['javascript_origin'] = esc_url_raw($settings['javascript_origin']);
					} elseif (!empty($existing_settings['javascript_origin'])) {
						$sanitized_settings['javascript_origin'] = esc_url_raw($existing_settings['javascript_origin']);
					} else {
						$sanitized_settings['javascript_origin'] = site_url();
					}
					// Handle private_folder_access - allow empty string to clear it, preserve existing if not provided
					if (isset($settings['private_folder_access'])) {
						$sanitized_settings['private_folder_access'] = sanitize_text_field($settings['private_folder_access']);
					} elseif (isset($existing_settings['private_folder_access'])) {
						$sanitized_settings['private_folder_access'] = sanitize_text_field($existing_settings['private_folder_access']);
					} else {
						$sanitized_settings['private_folder_access'] = '';
					}
					break;
				case 'dropbox':
					if (isset($settings['app_key'])) {
						$sanitized_settings['app_key'] = $this->preserve_credential_field($settings['app_key'], $existing_settings, 'app_key');
					}
					if (array_key_exists('app_secret', $settings)) {
						$sanitized_settings['app_secret'] = $this->preserve_credential_field($settings['app_secret'], $existing_settings, 'app_secret');
					}
					$sanitized_settings['redirect_uri'] = $this->get_oauth_integration_redirect_uri(
						'dropbox',
						array_merge($existing_settings, $sanitized_settings)
					);
					// Handle private_folder_access - allow empty string to clear it, preserve existing if not provided
					if (isset($settings['private_folder_access'])) {
						$sanitized_settings['private_folder_access'] = sanitize_text_field($settings['private_folder_access']);
					} elseif (isset($existing_settings['private_folder_access'])) {
						$sanitized_settings['private_folder_access'] = sanitize_text_field($existing_settings['private_folder_access']);
					} else {
						$sanitized_settings['private_folder_access'] = '';
					}
					break;
				case 'pcloud':
					if (isset($settings['app_key'])) {
						$sanitized_settings['app_key'] = $this->preserve_credential_field($settings['app_key'], $existing_settings, 'app_key');
					}
					if (array_key_exists('app_secret', $settings)) {
						$sanitized_settings['app_secret'] = $this->preserve_credential_field($settings['app_secret'], $existing_settings, 'app_secret');
					}
					$sanitized_settings['redirect_uri'] = $this->get_oauth_integration_redirect_uri(
						'pcloud',
						array_merge($existing_settings, $sanitized_settings)
					);
					// Module uses private_folder key for pCloud.
					if (isset($settings['private_folder'])) {
						$sanitized_settings['private_folder'] = sanitize_text_field($settings['private_folder']);
					} elseif (isset($existing_settings['private_folder'])) {
						$sanitized_settings['private_folder'] = sanitize_text_field($existing_settings['private_folder']);
					} else {
						$sanitized_settings['private_folder'] = '';
					}
					break;
				case 'cloudflare-r2':
					if (isset($settings['access_key'])) {
						$sanitized_settings['access_key'] = $this->preserve_credential_field($settings['access_key'], $existing_settings, 'access_key');
					}
					if (array_key_exists('secret_key', $settings)) {
						$sanitized_settings['secret_key'] = $this->preserve_credential_field($settings['secret_key'], $existing_settings, 'secret_key');
					}
					if (isset($settings['endpoint']))
						$sanitized_settings['endpoint'] = esc_url_raw($settings['endpoint']);
					if (isset($settings['bucket']))
						$sanitized_settings['bucket'] = sanitize_text_field($settings['bucket']);
					if (isset($settings['user_role_access']) && is_array($settings['user_role_access'])) {
						$sanitized_settings['user_role_access'] = array_map('sanitize_text_field', $settings['user_role_access']);
					}
					// Module uses private_folder key for Cloudflare R2.
					if (isset($settings['private_folder'])) {
						$sanitized_settings['private_folder'] = sanitize_text_field($settings['private_folder']);
					} elseif (isset($existing_settings['private_folder'])) {
						$sanitized_settings['private_folder'] = sanitize_text_field($existing_settings['private_folder']);
					} else {
						$sanitized_settings['private_folder'] = '';
					}
					break;
				case 'wasabi':
					if (isset($settings['title']) || isset($settings['alias'])) {
						$alias_val = sanitize_text_field($settings['title'] ?? $settings['alias'] ?? '');
						$sanitized_settings['alias'] = $alias_val;
						$sanitized_settings['title'] = $alias_val;
					}
					if (isset($settings['access_key'])) {
						$sanitized_settings['access_key'] = $this->preserve_credential_field($settings['access_key'], $existing_settings, 'access_key');
					}
					if (array_key_exists('secret_key', $settings)) {
						$sanitized_settings['secret_key'] = $this->preserve_credential_field($settings['secret_key'], $existing_settings, 'secret_key');
					}
					if (isset($settings['region'])) {
						$sanitized_settings['region'] = sanitize_text_field($settings['region']);
					}
					if (isset($settings['endpoint'])) {
						$sanitized_settings['endpoint'] = esc_url_raw($settings['endpoint']);
					}
					if (isset($settings['bucket'])) {
						$sanitized_settings['bucket'] = sanitize_text_field($settings['bucket']);
					}
					if (isset($settings['user_role_access']) && is_array($settings['user_role_access'])) {
						$sanitized_settings['user_role_access'] = array_map('sanitize_text_field', $settings['user_role_access']);
					}
					if (isset($settings['private_folder'])) {
						$sanitized_settings['private_folder'] = sanitize_text_field($settings['private_folder']);
					} elseif (isset($existing_settings['private_folder'])) {
						$sanitized_settings['private_folder'] = sanitize_text_field($existing_settings['private_folder']);
					} else {
						$sanitized_settings['private_folder'] = '';
					}
					break;
				case 'amazon-s3':
					if (isset($settings['app_key'])) {
						$sanitized_settings['app_key'] = $this->preserve_credential_field($settings['app_key'], $existing_settings, 'app_key');
					}
					if (array_key_exists('app_secret', $settings)) {
						$sanitized_settings['app_secret'] = $this->preserve_credential_field($settings['app_secret'], $existing_settings, 'app_secret');
					}
					if (isset($settings['region']))
						$sanitized_settings['region'] = sanitize_text_field($settings['region']);
					if (isset($settings['bucket']))
						$sanitized_settings['bucket'] = sanitize_text_field($settings['bucket']);
					if (isset($settings['user_role_access']) && is_array($settings['user_role_access'])) {
						$sanitized_settings['user_role_access'] = array_map('sanitize_text_field', $settings['user_role_access']);
					}
					if (isset($settings['private_folder_access'])) {
						$sanitized_settings['private_folder_access'] = sanitize_text_field($settings['private_folder_access']);
					}
					break;
				case 'github':
					if (isset($settings['email'])) {
						$sanitized_settings['email'] = sanitize_email($settings['email']);
					}
					if (isset($settings['username'])) {
						$sanitized_settings['username'] = sanitize_text_field($settings['username']);
					}

					// Legacy Pro stores PAT as "token"; React UI uses "pat". Only treat request
					// body keys as user input so enable-toggle saves do not wipe credentials.
					if (array_key_exists('pat', $params) || array_key_exists('token', $params)) {
						$credential = $this->preserve_github_credential(
							array_key_exists('pat', $params) ? $params['pat'] : '',
							array_key_exists('token', $params) ? $params['token'] : '',
							$existing_settings
						);
						if ('' !== $credential) {
							$sanitized_settings['pat'] = $credential;
							$sanitized_settings['token'] = $credential;
						}
					} elseif (!empty($existing_settings['pat']) || !empty($existing_settings['token'])) {
						$credential = !empty($existing_settings['pat'])
							? sanitize_text_field((string) $existing_settings['pat'])
							: sanitize_text_field((string) $existing_settings['token']);
						$sanitized_settings['pat'] = $credential;
						$sanitized_settings['token'] = $credential;
					}

					$sanitized_settings['access_dir'] = !empty($existing_settings['access_dir'])
						? sanitize_text_field((string) $existing_settings['access_dir'])
						: 'uploads/afmp-includes/github';

					if (array_key_exists('master_dir', $params)) {
						$sanitized_settings['master_dir'] = sanitize_text_field($params['master_dir']);
					} elseif (isset($existing_settings['master_dir'])) {
						$sanitized_settings['master_dir'] = sanitize_text_field((string) $existing_settings['master_dir']);
					}

					if (array_key_exists('repo', $params)) {
						$sanitized_settings['repo'] = sanitize_text_field($params['repo']);
					} elseif (isset($existing_settings['repo'])) {
						$sanitized_settings['repo'] = sanitize_text_field((string) $existing_settings['repo']);
					}

					if (array_key_exists('branch', $params)) {
						$sanitized_settings['branch'] = sanitize_text_field($params['branch']);
					} elseif (isset($existing_settings['branch'])) {
						$sanitized_settings['branch'] = sanitize_text_field((string) $existing_settings['branch']);
					}
					break;
				case 'google-cloud-storage':
					// Preserve existing auth_key if not provided in new settings (file not uploaded)
					$auth_key_value = isset($settings['auth_key']) ? $settings['auth_key'] : '';
					// Ensure it's a string, not an array (file inputs can sometimes be arrays)
					if (is_array($auth_key_value)) {
						$auth_key_value = '';
					}

					if (empty($auth_key_value) || (is_string($auth_key_value) && empty(trim($auth_key_value)))) {
						// No new auth_key provided, preserve existing one
						if (isset($existing_settings['auth_key']) && !empty($existing_settings['auth_key']) && is_string($existing_settings['auth_key'])) {
							$sanitized_settings['auth_key'] = $existing_settings['auth_key'];
						}
					} else {
						// New auth_key provided (from file upload) - ensure it's a string
						if (is_string($auth_key_value)) {
							$sanitized_settings['auth_key'] = sanitize_text_field($auth_key_value);
						}
					}
					if (isset($settings['bucket']))
						$sanitized_settings['bucket'] = sanitize_text_field($settings['bucket']);
					if (isset($settings['user_role_access']) && is_array($settings['user_role_access'])) {
						$sanitized_settings['user_role_access'] = array_map('sanitize_text_field', $settings['user_role_access']);
					}
					// Handle private_folder_access - allow empty string to clear it, preserve existing if not provided
					if (isset($settings['private_folder_access'])) {
						$sanitized_settings['private_folder_access'] = sanitize_text_field($settings['private_folder_access']);
					} elseif (isset($existing_settings['private_folder_access'])) {
						// Preserve existing value if not provided in new settings
						$sanitized_settings['private_folder_access'] = sanitize_text_field($existing_settings['private_folder_access']);
					} else {
						// Set to empty string if not provided and doesn't exist
						$sanitized_settings['private_folder_access'] = '';
					}
					break;
				case 'azure-cloud-storage':
					if (isset($settings['account_name']))
						$sanitized_settings['account_name'] = sanitize_text_field($settings['account_name']);
					if (isset($settings['account_key']))
						$sanitized_settings['account_key'] = sanitize_text_field($settings['account_key']);
					if (isset($settings['container']))
						$sanitized_settings['container'] = sanitize_text_field($settings['container']);
					break;
			}

			if (in_array($integration_id, array('onedrive', 'google-drive', 'dropbox', 'pcloud'), true)) {
				if (isset($settings['user_role_access']) && is_array($settings['user_role_access'])) {
					$sanitized_settings['user_role_access'] = array_map('sanitize_text_field', $settings['user_role_access']);
				}
			}

			// Merge with existing to preserve other fields
			$final_settings = array_merge($existing_settings, $sanitized_settings);

			// Special handling for Google Cloud Storage: ensure auth_key is properly set
			if ($integration_id === 'google-cloud-storage') {
				// Check if auth_key was provided in original settings (from file upload)
				$auth_key_value = isset($settings['auth_key']) ? $settings['auth_key'] : '';
				// Ensure it's a string, not an array
				if (is_array($auth_key_value)) {
					$auth_key_value = '';
				}

				if (!empty($auth_key_value) && is_string($auth_key_value) && !empty(trim($auth_key_value))) {
					// File was uploaded, use the provided auth_key (even if it wasn't in sanitized_settings)
					$final_settings['auth_key'] = sanitize_text_field($auth_key_value);
				} else {
					// If auth_key is still empty, preserve existing one
					$existing_auth_key = isset($existing_settings['auth_key']) ? $existing_settings['auth_key'] : '';
					if (!empty($existing_auth_key) && is_string($existing_auth_key) && !empty(trim($existing_auth_key))) {
						$final_settings['auth_key'] = $existing_auth_key;
					}
				}
			}

			if ('github' === $integration_id) {
				$final_settings = $this->normalize_github_settings($final_settings);
			}

			update_option($option_name, $final_settings);

			if ('onedrive' === $integration_id && class_exists('\AFMP\Modules\Onedrive') && is_callable(array('\AFMP\Modules\Onedrive', 'reload_options'))) {
				\AFMP\Modules\Onedrive::reload_options();
			}

			// OneDrive private folder path cache invalidation for REST save flow.
			// (wp-admin settings page does this in module sanitize callback; REST save bypasses it)
			if ($integration_id === 'onedrive') {
				$old_folder_path = isset($existing_settings['private_folder_access']) ? trim((string) $existing_settings['private_folder_access']) : '';
				$new_folder_path = isset($final_settings['private_folder_access']) ? trim((string) $final_settings['private_folder_access']) : '';
				if ($old_folder_path !== $new_folder_path) {
					global $wpdb;
					$wpdb->query($wpdb->prepare(
						"DELETE FROM {$wpdb->options} WHERE option_name LIKE %s",
						$wpdb->esc_like('_transient_onedrive_folder_id_') . '%'
					));
					$wpdb->query($wpdb->prepare(
						"DELETE FROM {$wpdb->options} WHERE option_name LIKE %s",
						$wpdb->esc_like('_transient_timeout_onedrive_folder_id_') . '%'
					));
				}
			}

			return new WP_REST_Response(array(
				'success' => true,
				'message' => __('Integration settings saved successfully.', 'file-manager-advanced'),
				'settings' => $final_settings
			), 200);
		}

		// ============================================
		// INTEGRATION METHODS - Library Installation
		// ============================================

		/**
		 * Install Integration Library (Generic method)
		 * @param string $library_name Library name (e.g., 'dropbox', 'amazons3', 'googlecloud')
		 * @return WP_REST_Response|WP_Error
		 */
		private function install_integration_library($library_name)
		{
			if (!current_user_can('manage_options')) {
				return new WP_Error('forbidden', __('You do not have permission to install library.', 'file-manager-advanced'), array('status' => 403));
			}

			// Check if AFMP\Filesystem class exists
			if (!class_exists('\AFMP\Filesystem')) {
				return new WP_Error('class_not_found', __('Filesystem class not found. Pro plugin may not be active.', 'file-manager-advanced'), array('status' => 500));
			}

			$filesystem = new \AFMP\Filesystem();
			$install_path = $filesystem->install_library($library_name);

			if (is_bool($install_path) && $install_path) {
				return new WP_REST_Response(array(
					'success' => true,
					'message' => __('Library installed successfully.', 'file-manager-advanced')
				), 200);
			} else {
				$error_message = __('Library installation failed.', 'file-manager-advanced');
				if (is_array($install_path) && isset($install_path['error'])) {
					$error_message = $install_path['error'];
				}
				return new WP_Error('installation_failed', $error_message, array('status' => 500));
			}
		}

		/**
		 * Install Dropbox Library
		 * @param WP_REST_Request $request
		 * @return WP_REST_Response|WP_Error
		 */
		public function install_dropbox_library($request)
		{
			return $this->install_integration_library('dropbox');
		}

		/**
		 * Install Amazon S3 Library
		 * @param WP_REST_Request $request
		 * @return WP_REST_Response|WP_Error
		 */
		public function install_amazons3_library($request)
		{
			return $this->install_integration_library('amazons3');
		}

		/**
		 * Install Google Cloud Library
		 * @param WP_REST_Request $request
		 * @return WP_REST_Response|WP_Error
		 */
		public function install_googlecloud_library($request)
		{
			return $this->install_integration_library('googlecloud');
		}

		/**
		 * Install pCloud Library
		 * @param WP_REST_Request $request
		 * @return WP_REST_Response|WP_Error
		 */
		public function install_pcloud_library($request)
		{
			return $this->install_integration_library('pcloud');
		}

		/**
		 * Install Cloudflare R2 Library
		 * @param WP_REST_Request $request
		 * @return WP_REST_Response|WP_Error
		 */
		public function install_cloudflarer2_library($request)
		{
			return $this->install_integration_library('cloudflarer2');
		}

		/**
		 * Install Wasabi library (AWS SDK; same package as S3 / R2)
		 *
		 * @param WP_REST_Request $request Request.
		 * @return WP_REST_Response|WP_Error
		 */
		public function install_wasabi_library($request)
		{
			return $this->install_integration_library('wasabi');
		}

		/**
		 * Test API Key for AI Code Pilot
		 * @param WP_REST_Request $request
		 * @return WP_REST_Response
		 */
		public function test_api_key($request)
		{
			if (!current_user_can('manage_options')) {
				return new WP_Error('forbidden', __('You do not have permission to test API key.', 'file-manager-advanced'), array('status' => 403));
			}

			$params = $request->get_json_params();
			if (empty($params)) {
				$params = $request->get_body_params();
			}

			$api_key = isset($params['api_key']) ? sanitize_text_field($params['api_key']) : '';

			if (empty($api_key)) {
				return new WP_Error('missing_api_key', __('API key is required.', 'file-manager-advanced'), array('status' => 400));
			}

			// Test the API key by making a request to OpenAI API
			$response = wp_remote_get('https://api.openai.com/v1/models', array(
				'headers' => array(
					'Authorization' => 'Bearer ' . $api_key,
					'Content-Type' => 'application/json'
				),
				'timeout' => 10
			));

			if (is_wp_error($response)) {
				return new WP_Error('api_error', __('Failed to connect to OpenAI API.', 'file-manager-advanced'), array('status' => 500));
			}

			$status_code = wp_remote_retrieve_response_code($response);
			$body = wp_remote_retrieve_body($response);

			if ($status_code === 200) {
				return new WP_REST_Response(array(
					'success' => true,
					'message' => __('API key is valid!', 'file-manager-advanced')
				), 200);
			} else {
				$error_data = json_decode($body, true);
				$error_message = isset($error_data['error']['message']) ? $error_data['error']['message'] : __('API key is invalid.', 'file-manager-advanced');

				return new WP_Error('invalid_api_key', $error_message, array('status' => 400));
			}
		}

		// ============================================
		// INTEGRATION METHODS - File Upload
		// ============================================

		/**
		 * Upload Google Cloud Storage authentication key file
		 * @param WP_REST_Request $request
		 * @return WP_REST_Response|WP_Error
		 */
		public function upload_googlecloud_key($request)
		{
			if (!current_user_can('manage_options')) {
				return new WP_Error('forbidden', __('You do not have permission to upload files.', 'file-manager-advanced'), array('status' => 403));
			}

			// Try to get file from request (WordPress REST API handles multipart/form-data)
			$files = $request->get_file_params();
			$file = null;

			// Check get_file_params first
			if (isset($files['auth_key']) && is_array($files['auth_key']) && isset($files['auth_key']['error'])) {
				if ($files['auth_key']['error'] === UPLOAD_ERR_OK) {
					$file = $files['auth_key'];
				} else {
					$error_msg = __('File upload error code: ', 'file-manager-advanced') . $files['auth_key']['error'];
					error_log('Google Cloud file upload error: ' . $error_msg);
					return new WP_Error('upload_error', $error_msg, array('status' => 400));
				}
			}

			// Fallback to $_FILES if get_file_params doesn't work
			if (!$file && isset($_FILES['auth_key']) && is_array($_FILES['auth_key'])) {
				if (isset($_FILES['auth_key']['error']) && $_FILES['auth_key']['error'] === UPLOAD_ERR_OK) {
					$file = $_FILES['auth_key'];
				} else {
					$error_code = isset($_FILES['auth_key']['error']) ? $_FILES['auth_key']['error'] : 'unknown';
					error_log('Google Cloud file upload error (from $_FILES): ' . $error_code);
					return new WP_Error('upload_error', __('File upload error occurred.', 'file-manager-advanced'), array('status' => 400));
				}
			}

			if (!$file) {
				error_log('Google Cloud file upload: No file found in request. get_file_params: ' . print_r($files, true) . ' $_FILES: ' . print_r($_FILES, true));
				return new WP_Error('no_file', __('No file uploaded or upload error occurred.', 'file-manager-advanced'), array('status' => 400));
			}

			// Validate file type
			if ($file['type'] !== 'application/json' && pathinfo($file['name'], PATHINFO_EXTENSION) !== 'json') {
				return new WP_Error('invalid_file_type', __('Invalid file type. Please upload a JSON file.', 'file-manager-advanced'), array('status' => 400));
			}

			// Validate file size (max 1MB)
			if ($file['size'] > 1048576) {
				return new WP_Error('file_too_large', __('File is too large. Maximum size is 1MB.', 'file-manager-advanced'), array('status' => 400));
			}

			$upload_dir = wp_upload_dir();
			$target_dir = trailingslashit($upload_dir['basedir']) . 'afmp-googlecloud-keys/';

			if (!file_exists($target_dir)) {
				wp_mkdir_p($target_dir);
			}

			// Remove all previous files in the directory
			foreach (glob($target_dir . '*') as $old_file) {
				if (is_file($old_file)) {
					@unlink($old_file);
				}
			}

			$filename = sanitize_file_name($file['name']);
			$target_file = $target_dir . $filename;

			// Validate JSON content
			$file_content = file_get_contents($file['tmp_name']);
			if ($file_content === false) {
				return new WP_Error('read_error', __('Failed to read uploaded file.', 'file-manager-advanced'), array('status' => 500));
			}

			$key_data = json_decode($file_content, true);
			if (json_last_error() !== JSON_ERROR_NONE) {
				return new WP_Error('invalid_json', __('Invalid JSON file. Please upload a valid JSON key file.', 'file-manager-advanced'), array('status' => 400));
			}

			// Validate required fields
			$required_fields = array('type', 'project_id', 'private_key', 'client_email');
			foreach ($required_fields as $field) {
				if (!isset($key_data[$field]) || empty($key_data[$field])) {
					return new WP_Error('missing_field', sprintf(__('Invalid key file. Required field %s is missing.', 'file-manager-advanced'), $field), array('status' => 400));
				}
			}

			// Check if it's a service account key
			if ($key_data['type'] !== 'service_account') {
				return new WP_Error('invalid_type', __('Authentication key file must be a service account key.', 'file-manager-advanced'), array('status' => 400));
			}

			// Move uploaded file using WordPress function or direct move
			$moved = false;
			if (function_exists('wp_handle_upload')) {
				// Use WordPress upload handler
				$upload_overrides = array(
					'test_form' => false,
					'unique_filename_callback' => function ($dir, $name, $ext) use ($filename) {
						return $filename;
					}
				);

				// Create a temporary file array structure for wp_handle_upload
				$uploaded_file = array(
					'name' => $file['name'],
					'type' => $file['type'],
					'tmp_name' => $file['tmp_name'],
					'error' => $file['error'],
					'size' => $file['size']
				);

				// Use wp_handle_upload but override the upload directory
				$upload_result = wp_handle_upload($uploaded_file, $upload_overrides);

				if (isset($upload_result['error'])) {
					error_log('wp_handle_upload error: ' . $upload_result['error']);
					// Fallback to direct move
					$moved = move_uploaded_file($file['tmp_name'], $target_file);
				} else {
					// wp_handle_upload moved file to default uploads directory, move it to our target directory
					if (isset($upload_result['file']) && file_exists($upload_result['file'])) {
						if ($upload_result['file'] !== $target_file) {
							// Move from WordPress uploads directory to our target directory
							if (rename($upload_result['file'], $target_file)) {
								$moved = true;
							} else {
								// Try copy as fallback
								if (copy($upload_result['file'], $target_file)) {
									@unlink($upload_result['file']);
									$moved = true;
								}
							}
						} else {
							$moved = true;
						}
					}
				}
			} else {
				// Direct move if wp_handle_upload not available
				$moved = move_uploaded_file($file['tmp_name'], $target_file);
			}

			if (!$moved) {
				error_log('Failed to move uploaded file. tmp_name: ' . $file['tmp_name'] . ', target: ' . $target_file);
				return new WP_Error('upload_failed', __('Failed to save uploaded file.', 'file-manager-advanced'), array('status' => 500));
			}

			// Verify file was saved
			if (!file_exists($target_file)) {
				error_log('File does not exist after move. Target: ' . $target_file);
				return new WP_Error('upload_failed', __('File was not saved correctly.', 'file-manager-advanced'), array('status' => 500));
			}

			// Save file path in options
			$options = get_option('afmp__googlecloud_settings', array());
			if (!is_array($options)) {
				$options = array();
			}
			$options['auth_key'] = $target_file;
			$update_result = update_option('afmp__googlecloud_settings', $options);

			error_log('Google Cloud auth_key saved. File: ' . $target_file . ', Update result: ' . ($update_result ? 'success' : 'failed'));

			return new WP_REST_Response(array(
				'success' => true,
				'message' => __('Authentication key file uploaded successfully.', 'file-manager-advanced'),
				'filename' => $filename,
				'filepath' => $target_file
			), 200);
		}

		// ============================================
		// INTEGRATION METHODS - Validation
		// ============================================

		/**
		 * Validate Google Cloud Bucket
		 * @param WP_REST_Request $request
		 * @return WP_REST_Response|WP_Error
		 */
		public function validate_googlecloud_bucket($request)
		{
			if (!current_user_can('manage_options')) {
				return new WP_Error('forbidden', __('You do not have permission to validate bucket.', 'file-manager-advanced'), array('status' => 403));
			}

			// Check if GoogleCloud class exists
			if (!class_exists('\AFMP\Modules\GoogleCloud')) {
				return new WP_Error('class_not_found', __('GoogleCloud class not found. Pro plugin may not be active.', 'file-manager-advanced'), array('status' => 500));
			}

			$params = $request->get_json_params();
			if (empty($params)) {
				$params = $request->get_body_params();
			}

			$bucket = isset($params['bucket']) ? sanitize_text_field($params['bucket']) : '';
			$auth_key = isset($params['auth_key']) ? sanitize_text_field($params['auth_key']) : '';

			if (empty($bucket)) {
				return new WP_Error('invalid_bucket', __('Bucket name is required.', 'file-manager-advanced'), array('status' => 400));
			}

			// Temporarily update settings to validate bucket
			$options = get_option('afmp__googlecloud_settings', array());
			if (!is_array($options)) {
				$options = array();
			}

			$original_bucket = isset($options['bucket']) ? $options['bucket'] : '';
			$original_auth_key = isset($options['auth_key']) ? $options['auth_key'] : '';

			// Set temporary values for validation
			$options['bucket'] = $bucket;
			if (!empty($auth_key)) {
				$options['auth_key'] = $auth_key;
			}
			update_option('afmp__googlecloud_settings', $options);

			// Get GoogleCloud instance - need to pass the plugin directory path
			// Try to get the pro plugin directory
			$plugin_dir = '';
			if (defined('AFMP_PLUGIN_DIR')) {
				$plugin_dir = AFMP_PLUGIN_DIR;
			} elseif (defined('AFMP_PLUGIN_PATH')) {
				$plugin_dir = AFMP_PLUGIN_PATH;
			} else {
				$plugin_dir = '';
				if ( function_exists( 'fma_get_pro_plugin_main_file' ) ) {
					$pro_main = fma_get_pro_plugin_main_file();
					if ( $pro_main ) {
						$plugin_dir = dirname( $pro_main );
					}
				}
				if ( $plugin_dir === '' ) {
					// Fallback to current plugin directory
					$plugin_dir = dirname( dirname( dirname( __FILE__ ) ) );
				}
			}
			$googlecloud = \AFMP\Modules\GoogleCloud::get_instance($plugin_dir);
			if (!$googlecloud) {
				// Restore original settings
				$options['bucket'] = $original_bucket;
				$options['auth_key'] = $original_auth_key;
				update_option('afmp__googlecloud_settings', $options);
				return new WP_Error('instance_not_found', __('Failed to get GoogleCloud instance.', 'file-manager-advanced'), array('status' => 500));
			}

			// Ensure Google Cloud SDK is loaded before testing connection.
			if (!class_exists('Google\Cloud\Storage\StorageClient')) {
				$autoload_loaded = false;
				if (class_exists('\AFMP\Filesystem')) {
					$library_path = \AFMP\Filesystem::library_already_installed('googlecloud');
					if ($library_path && file_exists($library_path . 'vendor/autoload.php')) {
						require_once $library_path . 'vendor/autoload.php';
						$autoload_loaded = class_exists('Google\Cloud\Storage\StorageClient');
					}
				}
				if (!$autoload_loaded) {
					$upload_dir = wp_upload_dir();
					$fallback_autoload = trailingslashit($upload_dir['basedir']) . 'afmp-includes/googlecloud/vendor/autoload.php';
					if (file_exists($fallback_autoload)) {
						require_once $fallback_autoload;
					}
				}
			}

			// Validate bucket using module helper
			$validation_result = $googlecloud->test_gc_connection($options['auth_key'], $bucket);

			// Restore original settings
			$options['bucket'] = $original_bucket;
			$options['auth_key'] = $original_auth_key;
			update_option('afmp__googlecloud_settings', $options);

			if (!empty($validation_result['success'])) {
				return new WP_REST_Response(array(
					'success' => true,
					'valid' => true,
					'message' => $validation_result['message']
				), 200);
			} else {
				return new WP_Error('validation_failed', $validation_result['message'], array('status' => 400));
			}
		}

		/**
		 * Validate Amazon S3 Bucket
		 * @param WP_REST_Request $request
		 * @return WP_REST_Response|WP_Error
		 */
		public function validate_amazons3_bucket($request)
		{
			if (!current_user_can('manage_options')) {
				return new WP_Error('forbidden', __('You do not have permission to validate bucket.', 'file-manager-advanced'), array('status' => 403));
			}

			// Check if AmazonS3 class exists
			if (!class_exists('\AFMP\Modules\AmazonS3')) {
				return new WP_Error('class_not_found', __('AmazonS3 class not found. Pro plugin may not be active.', 'file-manager-advanced'), array('status' => 500));
			}

			$params = $request->get_json_params();
			if (empty($params)) {
				$params = $request->get_body_params();
			}

			$bucket = isset($params['bucket']) ? sanitize_text_field($params['bucket']) : '';
			$app_key = isset($params['app_key']) ? sanitize_text_field($params['app_key']) : '';
			$app_secret = isset($params['app_secret']) ? sanitize_text_field($params['app_secret']) : '';
			$region = isset($params['region']) ? sanitize_text_field($params['region']) : '';

			if (empty($bucket)) {
				return new WP_Error('invalid_bucket', __('Bucket name is required.', 'file-manager-advanced'), array('status' => 400));
			}

			if (empty($app_key) || empty($app_secret) || empty($region)) {
				return new WP_Error('invalid_credentials', __('App Key, App Secret, and Region are required for validation.', 'file-manager-advanced'), array('status' => 400));
			}

			// Check if AWS library is installed and load it
			$upload_dir = wp_upload_dir();
			$library_path = $upload_dir['basedir'] . '/afmp-includes/amazons3/vendor/autoload.php';

			if (!file_exists($library_path)) {
				return new WP_Error('library_not_installed', __('AWS S3 library is not installed. Please install the library first.', 'file-manager-advanced'), array('status' => 400));
			}

			// Load the library
			if (!class_exists('Aws\S3\S3Client')) {
				require_once $library_path;
			}

			// Check if library loaded successfully
			if (!class_exists('Aws\S3\S3Client')) {
				return new WP_Error('library_not_loaded', __('AWS S3 library could not be loaded. Please reinstall the library.', 'file-manager-advanced'), array('status' => 500));
			}

			// Temporarily update settings to validate bucket
			$options = get_option('afmp__amazons3_settings', array());
			if (!is_array($options)) {
				$options = array();
			}

			$original_bucket = isset($options['bucket']) ? $options['bucket'] : '';
			$original_app_key = isset($options['app_key']) ? $options['app_key'] : '';
			$original_app_secret = isset($options['app_secret']) ? $options['app_secret'] : '';
			$original_region = isset($options['region']) ? $options['region'] : '';

			// Set temporary values for validation
			$options['bucket'] = $bucket;
			$options['app_key'] = $app_key;
			$options['app_secret'] = $app_secret;
			$options['region'] = $region;
			update_option('afmp__amazons3_settings', $options);

			// Get AmazonS3 instance - need to pass the plugin directory path
			$plugin_dir = '';
			if (defined('AFMP_PLUGIN_DIR')) {
				$plugin_dir = AFMP_PLUGIN_DIR;
			} elseif (defined('AFMP_PLUGIN_PATH')) {
				$plugin_dir = AFMP_PLUGIN_PATH;
			} else {
				$plugin_dir = '';
				if ( function_exists( 'fma_get_pro_plugin_main_file' ) ) {
					$pro_main = fma_get_pro_plugin_main_file();
					if ( $pro_main ) {
						$plugin_dir = dirname( $pro_main );
					}
				}
				if ( $plugin_dir === '' ) {
					$plugin_dir = dirname( dirname( dirname( __FILE__ ) ) );
				}
			}

			$amazons3 = \AFMP\Modules\AmazonS3::get_instance($plugin_dir);

			// Validate bucket using library
			$validation_result = $amazons3->test_aws_connection($app_key, $app_secret, $region, $bucket);

			// Restore original settings
			$options['bucket'] = $original_bucket;
			$options['app_key'] = $original_app_key;
			$options['app_secret'] = $original_app_secret;
			$options['region'] = $original_region;
			update_option('afmp__amazons3_settings', $options);

			if ($validation_result['success']) {
				return new WP_REST_Response(array(
					'success' => true,
					'valid' => true,
					'message' => $validation_result['message']
				), 200);
			} else {
				return new WP_Error('validation_failed', $validation_result['message'], array('status' => 400));
			}
		}

		/**
		 * Validate Wasabi bucket / credentials
		 *
		 * @param WP_REST_Request $request Request.
		 * @return WP_REST_Response|WP_Error
		 */
		public function validate_wasabi_bucket($request)
		{
			if (!current_user_can('manage_options')) {
				return new WP_Error('forbidden', __('You do not have permission to validate bucket.', 'file-manager-advanced'), array('status' => 403));
			}

			if (!class_exists('\AFMP\Modules\Wasabi')) {
				return new WP_Error('class_not_found', __('Wasabi module not found. Pro plugin may not be active.', 'file-manager-advanced'), array('status' => 500));
			}

			$params = $request->get_json_params();
			if (empty($params)) {
				$params = $request->get_body_params();
			}

			$bucket = isset($params['bucket']) ? sanitize_text_field($params['bucket']) : '';
			$access_key = isset($params['access_key']) ? sanitize_text_field($params['access_key']) : '';
			$secret_key = isset($params['secret_key']) ? sanitize_text_field($params['secret_key']) : '';
			$region = isset($params['region']) ? sanitize_text_field($params['region']) : '';
			$endpoint = isset($params['endpoint']) ? esc_url_raw($params['endpoint']) : '';

			if (empty($bucket) || empty($access_key) || empty($secret_key) || empty($region) || empty($endpoint)) {
				return new WP_Error('invalid_params', __('Bucket, access key, secret key, region, and endpoint are required.', 'file-manager-advanced'), array('status' => 400));
			}

			$upload_dir = wp_upload_dir();
			$library_path = $upload_dir['basedir'] . '/afmp-includes/amazons3/vendor/autoload.php';
			if (!file_exists($library_path)) {
				return new WP_Error('library_not_installed', __('AWS S3 library is not installed. Install the library from the Wasabi integration screen first.', 'file-manager-advanced'), array('status' => 400));
			}
			if (!class_exists('Aws\S3\S3Client')) {
				require_once $library_path;
			}
			if (!class_exists('Aws\S3\S3Client')) {
				return new WP_Error('library_not_loaded', __('Could not load S3 client library.', 'file-manager-advanced'), array('status' => 500));
			}

			$plugin_dir = '';
			if (defined('AFMP_PLUGIN_DIR')) {
				$plugin_dir = AFMP_PLUGIN_DIR;
			} elseif (defined('AFMP_PLUGIN_PATH')) {
				$plugin_dir = AFMP_PLUGIN_PATH;
			} else {
				$plugin_dir = '';
				if ( function_exists( 'fma_get_pro_plugin_main_file' ) ) {
					$pro_main = fma_get_pro_plugin_main_file();
					if ( $pro_main ) {
						$plugin_dir = dirname( $pro_main );
					}
				}
				if ( $plugin_dir === '' ) {
					$plugin_dir = dirname( dirname( dirname( __FILE__ ) ) );
				}
			}

			$wasabi = \AFMP\Modules\Wasabi::get_instance($plugin_dir);
			$validation_result = $wasabi->test_wasabi_connection($access_key, $secret_key, $region, $endpoint, $bucket);

			if (!empty($validation_result['success'])) {
				return new WP_REST_Response(array(
					'success' => true,
					'valid' => true,
					'message' => $validation_result['message'],
				), 200);
			}

			return new WP_Error('validation_failed', $validation_result['message'], array('status' => 400));
		}

		/**
		 * Get Plan Access content
		 * @since 5.3.0
		 *
		 * @param WP_REST_Request $request Request object.
		 * @return WP_REST_Response|WP_Error
		 */
		public function get_plan_access_content($request)
		{
			if (defined('AFMP_IS_APPSUMO') && AFMP_IS_APPSUMO) {
				return new WP_Error('not_found', __('Plan Access feature not available.', 'file-manager-advanced'), array('status' => 404));
			}

			if (!class_exists('AFMP\\PlanFeaturesAdmin')) {
				return new WP_Error('not_found', __('Plan Access feature not available.', 'file-manager-advanced'), array('status' => 404));
			}

			// Capture the output of the admin page
			ob_start();
			$plan_features_admin = \AFMP\PlanFeaturesAdmin::get_instance();
			$plan_features_admin->admin_page();
			$content = ob_get_clean();

			return new WP_REST_Response(array(
				'content' => $content,
			), 200);
		}

		/**
		 * GitHub fetch repositories endpoint
		 * @since 6.7.2
		 */
		public function github_fetch_repositories($request)
		{
			if (!current_user_can('manage_options')) {
				return new WP_Error('forbidden', __('You do not have permission to fetch repositories.', 'file-manager-advanced'), array('status' => 403));
			}

			$params = $request->get_json_params();
			$username = isset($params['username']) ? sanitize_text_field($params['username']) : '';
			$token = isset($params['token']) ? sanitize_text_field($params['token']) : '';

			if (empty($username) || empty($token)) {
				return new WP_Error('missing_credentials', __('Username and token are required.', 'file-manager-advanced'), array('status' => 400));
			}

			// Use GitHub API to fetch repositories
			$url = "https://api.github.com/users/{$username}/repos";
			$response = wp_remote_get($url, array(
				'headers' => array(
					'Authorization' => "token {$token}",
					'User-Agent' => $username,
					'Accept' => 'application/vnd.github.v3+json'
				),
				'timeout' => 30
			));

			if (is_wp_error($response)) {
				return new WP_Error('api_error', $response->get_error_message(), array('status' => 500));
			}

			$http_code = wp_remote_retrieve_response_code($response);
			if ($http_code !== 200) {
				$body = wp_remote_retrieve_body($response);
				return new WP_Error('api_error', __('Failed to fetch repositories. Please check your GitHub credentials.', 'file-manager-advanced'), array('status' => $http_code));
			}

			$repos = json_decode(wp_remote_retrieve_body($response), true);
			if (!is_array($repos)) {
				return new WP_Error('invalid_response', __('Invalid response from GitHub API.', 'file-manager-advanced'), array('status' => 500));
			}

			$options = array();
			foreach ($repos as $repo) {
				$options[] = array(
					'name' => isset($repo['name']) ? $repo['name'] : '',
					'full_name' => isset($repo['full_name']) ? $repo['full_name'] : ''
				);
			}

			return new WP_REST_Response(array(
				'success' => true,
				'repositories' => $options
			), 200);
		}

		/**
		 * GitHub fetch branches endpoint
		 * @since 6.7.2
		 */
		public function github_fetch_branches($request)
		{
			if (!current_user_can('manage_options')) {
				return new WP_Error('forbidden', __('You do not have permission to fetch branches.', 'file-manager-advanced'), array('status' => 403));
			}

			$params = $request->get_json_params();
			$username = isset($params['username']) ? sanitize_text_field($params['username']) : '';
			$token = isset($params['token']) ? sanitize_text_field($params['token']) : '';
			$repo = isset($params['repo']) ? sanitize_text_field($params['repo']) : '';

			if (empty($username) || empty($token) || empty($repo)) {
				return new WP_Error('missing_credentials', __('Username, token, and repository are required.', 'file-manager-advanced'), array('status' => 400));
			}

			// Fetch branches
			$url = "https://api.github.com/repos/{$username}/{$repo}/branches";
			$response = wp_remote_get($url, array(
				'headers' => array(
					'Authorization' => "token {$token}",
					'User-Agent' => $username,
					'Accept' => 'application/vnd.github.v3+json'
				),
				'timeout' => 30
			));

			if (is_wp_error($response)) {
				return new WP_Error('api_error', $response->get_error_message(), array('status' => 500));
			}

			$http_code = wp_remote_retrieve_response_code($response);
			if ($http_code !== 200) {
				return new WP_Error('api_error', __('Failed to fetch branches. Please check your GitHub credentials and repository name.', 'file-manager-advanced'), array('status' => $http_code));
			}

			$branches = json_decode(wp_remote_retrieve_body($response), true);
			if (!is_array($branches)) {
				return new WP_Error('invalid_response', __('Invalid response from GitHub API.', 'file-manager-advanced'), array('status' => 500));
			}

			// Fetch default branch
			$repo_url = "https://api.github.com/repos/{$username}/{$repo}";
			$repo_response = wp_remote_get($repo_url, array(
				'headers' => array(
					'Authorization' => "token {$token}",
					'User-Agent' => $username,
					'Accept' => 'application/vnd.github.v3+json'
				),
				'timeout' => 30
			));

			$default_branch = 'main';
			if (!is_wp_error($repo_response) && wp_remote_retrieve_response_code($repo_response) === 200) {
				$repo_data = json_decode(wp_remote_retrieve_body($repo_response), true);
				if (isset($repo_data['default_branch'])) {
					$default_branch = $repo_data['default_branch'];
				}
			}

			$options = array();
			foreach ($branches as $branch) {
				if (isset($branch['name'])) {
					$options[] = array(
						'name' => $branch['name'],
						'default' => ($branch['name'] === $default_branch)
					);
				}
			}

			if (empty($options)) {
				return new WP_Error('no_branches', __('No branches found in the repository.', 'file-manager-advanced'), array('status' => 404));
			}

			return new WP_REST_Response(array(
				'success' => true,
				'branches' => $options
			), 200);
		}

		/**
		 * GitHub validate token endpoint
		 * @since 6.7.2
		 */
		public function github_validate_token($request)
		{
			if (!current_user_can('manage_options')) {
				return new WP_Error('forbidden', __('You do not have permission to validate token.', 'file-manager-advanced'), array('status' => 403));
			}

			$params = $request->get_json_params();
			$token = isset($params['token']) ? sanitize_text_field($params['token']) : '';

			if (empty($token)) {
				return new WP_Error('missing_token', __('Token is required.', 'file-manager-advanced'), array('status' => 400));
			}

			// Test GitHub API endpoint
			$api_url = 'https://api.github.com/user';
			$response = wp_remote_get($api_url, array(
				'headers' => array(
					'Authorization' => 'token ' . $token,
					'User-Agent' => 'AFM-Pro-Plugin',
					'Accept' => 'application/vnd.github.v3+json'
				),
				'timeout' => 10
			));

			if (is_wp_error($response)) {
				return new WP_Error('api_error', $response->get_error_message(), array('status' => 500));
			}

			$response_code = wp_remote_retrieve_response_code($response);

			if ($response_code === 200) {
				$body = wp_remote_retrieve_body($response);
				$data = json_decode($body, true);
				return new WP_REST_Response(array(
					'success' => true,
					'message' => __('Token is valid.', 'file-manager-advanced'),
					'user_data' => $data
				), 200);
			} elseif ($response_code === 401) {
				return new WP_Error('invalid_token', __('Invalid Personal Access Token. Please check your token.', 'file-manager-advanced'), array('status' => 401));
			} elseif ($response_code === 403) {
				return new WP_Error('rate_limit', __('API rate limit exceeded or insufficient token permissions.', 'file-manager-advanced'), array('status' => 403));
			} else {
				return new WP_Error('api_error', sprintf(__('GitHub API error (Code: %d). Please try again.', 'file-manager-advanced'), $response_code), array('status' => $response_code));
			}
		}

		/**
		 * Get disconnect nonce for integrations
		 * @since 5.3.0
		 *
		 * @param WP_REST_Request $request Request object.
		 * @return WP_REST_Response|WP_Error
		 */
		public function get_disconnect_nonce($request)
		{
			if (!current_user_can('manage_options')) {
				return new WP_Error('forbidden', __('You do not have permission to get disconnect nonce.', 'file-manager-advanced'), array('status' => 403));
			}

			$action = $request->get_param('action');

			// Determine the nonce action based on the integration
			$nonce_action = 'disconnect-dropbox';
			if ($action === 'disconnect-onedrive') {
				$nonce_action = 'disconnect-onedrive';
			} elseif ($action === 'disconnect-dropbox') {
				$nonce_action = 'disconnect-dropbox';
			} elseif ($action === 'disconnect-google-drive' || $action === 'disconnect-googledrive') {
				$nonce_action = 'disconnect-googledrive';
			} elseif ($action === 'upload-googlecloud-key') {
				$nonce_action = 'afmp_upload_googlecloud_key';
			}

			$nonce = wp_create_nonce($nonce_action);

			return new WP_REST_Response(array(
				'nonce' => $nonce,
				'action' => $nonce_action
			), 200);
		}

		/**
		 * Backward-compatible nonce endpoint for older Google Drive disconnect flows.
		 *
		 * @since 5.3.0
		 *
		 * @return WP_REST_Response|WP_Error
		 */
		public function get_googledrive_disconnect_nonce()
		{
			if (!current_user_can('manage_options')) {
				return new WP_Error('forbidden', __('You do not have permission to get disconnect nonce.', 'file-manager-advanced'), array('status' => 403));
			}

			return new WP_REST_Response(array(
				'nonce' => wp_create_nonce('disconnect-googledrive'),
				'action' => 'disconnect-googledrive',
			), 200);
		}

		/**
		 * Normalize integration enable flags from wp_options (yes/no, 1/0, true/false).
		 *
		 * @param mixed $enable Raw enable value.
		 * @return bool
		 */
		private function is_integration_enabled_flag($enable)
		{
			if ($enable === true || $enable === 1) {
				return true;
			}

			if (is_string($enable)) {
				$normalized = strtolower(trim($enable));
				return in_array($normalized, array('yes', '1', 'true', 'on'), true);
			}

			return false;
		}

		/**
		 * @param array $settings Integration settings array from get_option().
		 * @return bool
		 */
		private function is_integration_settings_enabled($settings)
		{
			if (!is_array($settings) || !array_key_exists('enable', $settings)) {
				return false;
			}

			return $this->is_integration_enabled_flag($settings['enable']);
		}

		/**
		 * Normalize GitHub settings between legacy Pro (token) and React UI (pat).
		 *
		 * @param array $settings GitHub settings option array.
		 * @return array
		 */
		private function normalize_github_settings($settings)
		{
			if (!is_array($settings)) {
				return array();
			}

			$credential = '';
			if (!empty($settings['pat'])) {
				$credential = sanitize_text_field((string) $settings['pat']);
			} elseif (!empty($settings['token'])) {
				$credential = sanitize_text_field((string) $settings['token']);
			}

			if ('' !== $credential) {
				$settings['pat'] = $credential;
				$settings['token'] = $credential;
			}

			if (empty($settings['access_dir'])) {
				$settings['access_dir'] = 'uploads/afmp-includes/github';
			}

			return $settings;
		}

		/**
		 * Preserve GitHub PAT across legacy token key and empty React password fields.
		 *
		 * @param mixed $incoming_pat      Incoming pat value.
		 * @param mixed $incoming_token    Incoming token value.
		 * @param array $existing_settings Existing option values.
		 * @return string
		 */
		private function preserve_github_credential($incoming_pat, $incoming_token, $existing_settings)
		{
			$incoming_pat = sanitize_text_field((string) $incoming_pat);
			$incoming_token = sanitize_text_field((string) $incoming_token);
			$credential = '' !== $incoming_pat ? $incoming_pat : $incoming_token;

			if ('' !== $credential) {
				return $credential;
			}

			if (!empty($existing_settings['pat'])) {
				return sanitize_text_field((string) $existing_settings['pat']);
			}

			if (!empty($existing_settings['token'])) {
				return sanitize_text_field((string) $existing_settings['token']);
			}

			return '';
		}

		/**
		 * Preserve stored credentials when React UI submits empty masked fields.
		 *
		 * @param mixed $new_value         Incoming value.
		 * @param array $existing_settings Existing option values.
		 * @param string $field_key        Field key.
		 * @return string
		 */
		private function preserve_credential_field($new_value, $existing_settings, $field_key)
		{
			$sanitized = sanitize_text_field((string) $new_value);
			if ('' !== $sanitized || empty($existing_settings[$field_key])) {
				return $sanitized;
			}

			return isset($existing_settings[$field_key])
				? sanitize_text_field((string) $existing_settings[$field_key])
				: '';
		}

		/**
		 * Safe wrapper for Pro library installation checks.
		 *
		 * @param string $library_name Library slug.
		 * @return bool
		 */
		private function is_integration_library_installed($library_name)
		{
			return class_exists('\AFMP\Filesystem')
				&& is_callable(array('\AFMP\Filesystem', 'library_already_installed'))
				&& \AFMP\Filesystem::library_already_installed($library_name);
		}

		/**
		 * Whether the active Pro plugin still handles OAuth on legacy admin submenu pages.
		 *
		 * Released Pro (pre-4.x) only processes callbacks on afmp-* pages, not the React UI page.
		 *
		 * @return bool
		 */
		private function uses_legacy_pro_oauth_handlers()
		{
			if (!class_exists('AFMP\Modules\Dropbox')) {
				return false;
			}

			return !(class_exists('\AFMP\Modules\Onedrive') && is_callable(array('\AFMP\Modules\Onedrive', 'redirect_uri')));
		}

		/**
		 * Legacy OAuth redirect admin page slug for an integration.
		 *
		 * @param string $integration_id Integration slug.
		 * @return string Empty when not applicable.
		 */
		private function get_legacy_oauth_admin_page($integration_id)
		{
			$legacy_admin_pages = array(
				'dropbox' => 'afmp-dropbox',
				'google-drive' => 'afmp-googledrive',
				'pcloud' => 'afmp-pcloud',
			);

			return isset($legacy_admin_pages[$integration_id]) ? $legacy_admin_pages[$integration_id] : '';
		}

		/**
		 * Default OneDrive OAuth redirect URI.
		 *
		 * Release Pro/Azure apps use site_url(). Prefer Pro helper when available;
		 * never default to admin.php (that blanked reconnects with released Pro + Azure).
		 *
		 * @return string
		 */
		private function get_canonical_onedrive_redirect_uri()
		{
			if (class_exists('\AFMP\Modules\Onedrive') && is_callable(array('\AFMP\Modules\Onedrive', 'redirect_uri'))) {
				return untrailingslashit(\AFMP\Modules\Onedrive::redirect_uri());
			}

			return untrailingslashit(site_url());
		}

		/**
		 * Whether a stored OAuth redirect URI points at the public frontend (not wp-admin).
		 *
		 * @param string $uri Redirect URI to check.
		 * @return bool
		 */
		private function is_frontend_oauth_redirect_uri($uri)
		{
			$uri = untrailingslashit((string) $uri);
			if ('' === $uri) {
				return false;
			}

			$frontend_candidates = array_filter(
				array(
					untrailingslashit(site_url()),
					untrailingslashit(home_url()),
					untrailingslashit(network_site_url()),
				)
			);

			return in_array($uri, $frontend_candidates, true);
		}

		/**
		 * OAuth redirect URI compatible with legacy Pro admin pages and new React UI.
		 *
		 * @param string $integration_id  Integration slug.
		 * @param array  $stored_settings Stored settings array.
		 * @return string
		 */
		private function get_oauth_integration_redirect_uri($integration_id, $stored_settings = array())
		{
			if (!is_array($stored_settings)) {
				$stored_settings = array();
			}

			// OneDrive: keep Azure-registered URI when already stored (often site_url from release).
			// Default matches release: site_url() — admin.php forced blank reconnects on existing Azure apps.
			if ('onedrive' === $integration_id) {
				if (!empty($stored_settings['redirect_uri'])) {
					return untrailingslashit(esc_url_raw($stored_settings['redirect_uri']));
				}
				if (class_exists('\AFMP\Modules\Onedrive') && is_callable(array('\AFMP\Modules\Onedrive', 'redirect_uri'))) {
					return untrailingslashit(\AFMP\Modules\Onedrive::redirect_uri());
				}
				return untrailingslashit(site_url());
			}

			if (!empty($stored_settings['redirect_uri']) && !$this->is_frontend_oauth_redirect_uri($stored_settings['redirect_uri'])) {
				return esc_url_raw($stored_settings['redirect_uri']);
			}

			if ($this->uses_legacy_pro_oauth_handlers()) {
				$legacy_page = $this->get_legacy_oauth_admin_page($integration_id);
				if ('' !== $legacy_page) {
					return admin_url('admin.php?page=' . $legacy_page);
				}
			}

			$legacy_admin_pages = array(
				'dropbox' => 'afmp-dropbox',
				'google-drive' => 'afmp-googledrive',
				'pcloud' => 'afmp-pcloud',
			);

			$token_options = array(
				'dropbox' => 'afmp__dropbox_authentication_token',
				'google-drive' => 'afmp__googledrive_authentication_token',
				'pcloud' => 'afmp__pcloud_authentication_token',
			);

			if (!isset($legacy_admin_pages[$integration_id])) {
				return site_url();
			}

			if (isset($token_options[$integration_id]) && !empty(get_option($token_options[$integration_id], ''))) {
				return admin_url('admin.php?page=' . $legacy_admin_pages[$integration_id]);
			}

			return admin_url('admin.php?page=file_manager_advanced_ui');
		}

		/**
		 * Canonical OneDrive OAuth redirect URI (admin.php without ?page= query params).
		 *
		 * @return string
		 */
		private function get_onedrive_redirect_uri()
		{
			$stored_settings = get_option('afmp__onedrive_settings', array());
			return $this->get_oauth_integration_redirect_uri('onedrive', is_array($stored_settings) ? $stored_settings : array());
		}

		/**
		 * Redirect back to the React admin UI after OneDrive OAuth.
		 *
		 * @param string $redirect_hash Hash route in React admin UI.
		 * @param array  $query_args    Additional query args.
		 * @return string
		 */
		private function get_onedrive_admin_ui_redirect_url($redirect_hash = '#/extension/onedrive', $query_args = array())
		{
			if (class_exists('\AFMP\Modules\Onedrive') && is_callable(array('\AFMP\Modules\Onedrive', 'admin_ui_redirect_url'))) {
				return \AFMP\Modules\Onedrive::admin_ui_redirect_url($redirect_hash, $query_args);
			}

			$args = array_merge(
				array(
					'page' => 'file_manager_advanced_ui',
					'redirect_hash' => $redirect_hash,
				),
				$query_args
			);

			return add_query_arg($args, admin_url('admin.php'));
		}

		/**
		 * Handle OneDrive OAuth callback from Microsoft.
		 *
		 * @since 5.3.0
		 *
		 * @param WP_REST_Request $request Request object.
		 * @return void
		 */
		public function onedrive_oauth_callback($request)
		{
			if (!class_exists('\AFMP\Modules\Onedrive')) {
				wp_die(esc_html__('OneDrive integration is not available.', 'file-manager-advanced'));
			}

			$oauth_error = $request->get_param('error');
			if (!empty($oauth_error)) {
				$error_description = sanitize_text_field((string) $request->get_param('error_description'));
				if (empty($error_description)) {
					$error_description = __('OneDrive authorization was denied or failed.', 'file-manager-advanced');
				}
				set_transient('afmp_onedrive_error', $error_description, 30);
				$state = sanitize_text_field((string) $request->get_param('state'));
				$redirect_hash = (strpos($state, '#/') === 0) ? $state : '#/extension/onedrive';
				wp_safe_redirect(
					$this->get_onedrive_admin_ui_redirect_url(
						$redirect_hash,
						array(
							'onedrive_error' => '1',
							'error_msg' => $error_description,
						)
					)
				);
				exit;
			}

			$code = sanitize_text_field((string) $request->get_param('code'));
			$state = sanitize_text_field((string) $request->get_param('state'));

			if (!is_callable(array('\AFMP\Modules\Onedrive', 'handle_oauth_callback'))) {
				wp_die(esc_html__('OneDrive OAuth callback requires an updated Pro plugin.', 'file-manager-advanced'));
			}

			$result = \AFMP\Modules\Onedrive::handle_oauth_callback($code, $state);

			if (is_wp_error($result)) {
				wp_die(esc_html($result->get_error_message()));
			}

			wp_safe_redirect($result);
			exit;
		}

		/**
		 * Disconnect OneDrive integration from React UI.
		 *
		 * @since 5.3.0
		 *
		 * @param WP_REST_Request $request Request object.
		 * @return WP_REST_Response|WP_Error
		 */
		public function disconnect_onedrive($request)
		{
			if (!current_user_can('manage_options')) {
				return new WP_Error('forbidden', __('You do not have permission to disconnect OneDrive.', 'file-manager-advanced'), array('status' => 403));
			}

			delete_option('afmp__onedrive_access_token');
			delete_option('afmp__onedrive_refresh_token');
			delete_option('afmp__onedrive_token_expiry');

			// Do not overwrite redirect_uri on disconnect — Azure apps may still be registered
			// to site_url (release) or admin.php (newer). Changing it here causes blank reconnects.

			global $wpdb;
			if ($wpdb) {
				$wpdb->query(
					$wpdb->prepare(
						"DELETE FROM {$wpdb->options} WHERE option_name LIKE %s OR option_name LIKE %s",
						$wpdb->esc_like('_transient_onedrive_folder_id_') . '%',
						$wpdb->esc_like('_transient_timeout_onedrive_folder_id_') . '%'
					)
				);
			}

			return new WP_REST_Response(array(
				'success' => true,
				'message' => __('OneDrive disconnected successfully!', 'file-manager-advanced'),
			), 200);
		}

		/**
		 * Disconnect Dropbox integration from React UI.
		 *
		 * @since 5.3.0
		 *
		 * @param WP_REST_Request $request Request object.
		 * @return WP_REST_Response|WP_Error
		 */
		public function disconnect_dropbox($request)
		{
			if (!current_user_can('manage_options')) {
				return new WP_Error('forbidden', __('You do not have permission to disconnect Dropbox.', 'file-manager-advanced'), array('status' => 403));
			}

			delete_option('afmp__dropbox_authentication_token');
			delete_option('afmp__dropbox_refresh_token');
			delete_option('afmp__dropbox_token_expiry');

			return new WP_REST_Response(array(
				'success' => true,
				'message' => __('Dropbox disconnected successfully!', 'file-manager-advanced'),
			), 200);
		}

		/**
		 * Disconnect pCloud integration from React UI.
		 *
		 * @since 5.3.0
		 *
		 * @param WP_REST_Request $request Request object.
		 * @return WP_REST_Response|WP_Error
		 */
		public function disconnect_pcloud($request)
		{
			if (!current_user_can('manage_options')) {
				return new WP_Error('forbidden', __('You do not have permission to disconnect pCloud.', 'file-manager-advanced'), array('status' => 403));
			}

			delete_option('afmp__pcloud_authentication_token');
			delete_option('afmp__pcloud_locationid');

			return new WP_REST_Response(array(
				'success' => true,
				'message' => __('pCloud disconnected successfully!', 'file-manager-advanced'),
			), 200);
		}

		/**
		 * Disconnect Google Drive integration from React UI.
		 *
		 * @since 5.3.0
		 *
		 * @param WP_REST_Request $request Request object.
		 * @return WP_REST_Response|WP_Error
		 */
		public function disconnect_googledrive($request)
		{
			if (!current_user_can('manage_options')) {
				return new WP_Error('forbidden', __('You do not have permission to disconnect Google Drive.', 'file-manager-advanced'), array('status' => 403));
			}

			delete_option('afmp__googledrive_authentication_token');
			delete_option('afmp__googledrive_refresh_token');
			delete_option('afmp__googledrive_token_expiry');
			delete_option('afmp__googledrive_access_token');

			return new WP_REST_Response(array(
				'success' => true,
				'message' => __('Google Drive disconnected successfully!', 'file-manager-advanced'),
			), 200);
		}

		/**
		 * Get Singleton Instance
		 * @since 5.3.0
		 *
		 * @return FMA_Controller
		 */
		public static function get_instance()
		{

			if (is_null(self::$instance)) {
				self::$instance = new FMA_Controller();
			}

			return self::$instance;
		}
	}

	FMA_Controller::get_instance();
endif;
