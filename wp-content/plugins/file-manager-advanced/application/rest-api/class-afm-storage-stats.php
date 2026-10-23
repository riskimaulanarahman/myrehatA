<?php
/**
 * Dashboard storage usage — matches file manager Selection Info via elFinder countSize.
 *
 * @package File Manager Advanced
 */

defined('ABSPATH') || exit;

if (!class_exists('AFM_Storage_Stats')) {
	class AFM_Storage_Stats {
		/**
		 * @return array
		 */
		public static function get_usage($force_refresh = false)
		{
			$fmaoptions = get_option('fmaoptions', array());
			$root = self::resolve_root($fmaoptions);
			$cache_key = self::cache_key($fmaoptions, $root);

			if (!$force_refresh) {
				$cached = get_transient($cache_key);
				if (is_array($cached) && isset($cached['total'], $cached['breakdown'], $cached['fs'])) {
					$cached['cached'] = true;
					return $cached;
				}
			} else {
				// AFM-963: Prefer a recent cache over a blocking rescan that often
				// times out on TasteWP / constrained hosts.
				$cached = get_transient($cache_key);
				if (is_array($cached) && isset($cached['total'], $cached['breakdown'], $cached['fs'])) {
					$age = isset($cached['computed_at']) ? (time() - (int) $cached['computed_at']) : PHP_INT_MAX;
					$soft_ttl = (int) apply_filters('afm_storage_usage_soft_refresh_ttl', 5 * MINUTE_IN_SECONDS);
					if ($age >= 0 && $age < max(30, $soft_ttl)) {
						$cached['cached'] = true;
						$cached['soft_refresh_skipped'] = true;
						return $cached;
					}
				}
			}

			if (function_exists('set_time_limit')) {
				@set_time_limit(120);
			}

			try {
				$stats = self::scan_elfinder($fmaoptions, $root);
				if (null === $stats) {
					$stats = self::scan_native($root, $fmaoptions);
				}
			} catch (\Throwable $e) {
				$cached = get_transient($cache_key);
				if (is_array($cached) && isset($cached['total'], $cached['breakdown'], $cached['fs'])) {
					$cached['cached'] = true;
					$cached['stale'] = true;
					$cached['error'] = $e->getMessage();
					return $cached;
				}
				return self::get_fallback_response($e->getMessage(), $root);
			}

			if (!is_array($stats) || empty($stats['breakdown'])) {
				$cached = get_transient($cache_key);
				if (is_array($cached) && isset($cached['breakdown'])) {
					$cached['cached'] = true;
					$cached['stale'] = true;
					return $cached;
				}
				return self::get_fallback_response('Storage scan returned empty result', $root);
			}

			$stats['cached'] = false;
			$stats['computed_at'] = time();

			$cache_ttl = (int) apply_filters('afm_storage_usage_cache_ttl', HOUR_IN_SECONDS);
			if ($cache_ttl > 0) {
				set_transient($cache_key, $stats, $cache_ttl);
			}

			return $stats;
		}

		/**
		 * Minimal valid payload so the Dashboard widget can render.
		 *
		 * @param string $message Optional error detail.
		 * @param string $root Optional root path for disk capacity.
		 * @return array
		 */
		public static function get_fallback_response($message = '', $root = '')
		{
			if ($root === '') {
				$fmaoptions = get_option('fmaoptions', array());
				$root = self::resolve_root(is_array($fmaoptions) ? $fmaoptions : array());
			}

			$response = self::build_response($root, 0, 0, self::empty_breakdown());
			$response['scan_method'] = 'fallback';
			$response['cached'] = false;
			$response['computed_at'] = time();
			if ($message !== '') {
				$response['error'] = $message;
			}
			return $response;
		}

		public static function clear_cache()
		{
			$fmaoptions = get_option('fmaoptions', array());
			$root = self::resolve_root($fmaoptions);
			delete_transient(self::cache_key($fmaoptions, $root));
			// Drop legacy cache keys from earlier implementations.
			delete_transient('afm_storage_usage_' . md5(wp_json_encode(array(
				$root,
				isset($fmaoptions['public_path']) ? $fmaoptions['public_path'] : '',
				isset($fmaoptions['display_dot_files']) ? $fmaoptions['display_dot_files'] : '',
				isset($fmaoptions['enable_htaccess']) ? $fmaoptions['enable_htaccess'] : '',
			))));
		}

		public static function resolve_root($fmaoptions)
		{
			if (!empty($fmaoptions['public_path'])) {
				return $fmaoptions['public_path'];
			}
			if (!empty($fmaoptions['root'])) {
				return $fmaoptions['root'];
			}
			return ABSPATH;
		}

		private static function cache_key($fmaoptions, $root)
		{
			$parts = array(
				$root,
				isset($fmaoptions['public_path']) ? $fmaoptions['public_path'] : '',
				isset($fmaoptions['display_dot_files']) ? $fmaoptions['display_dot_files'] : '',
				isset($fmaoptions['enable_htaccess']) ? $fmaoptions['enable_htaccess'] : '',
			);
			return 'afm_storage_usage_v3_' . md5(wp_json_encode($parts));
		}

		/**
		 * Scan using elFinder countSize — same source as File Manager Selection Info.
		 *
		 * @param array  $fmaoptions Plugin options.
		 * @param string $root Root directory path.
		 * @return array|null
		 */
		private static function scan_elfinder($fmaoptions, $root)
		{
			$volume = self::mount_volume($fmaoptions);
			if (!$volume) {
				return null;
			}

			$categories = self::categories();
			$totals = self::empty_breakdown();
			$root_hash = $volume->root();

			// Authoritative totals — identical to file manager "Selection Info".
			$size_info = $volume->size($root_hash);
			$total_bytes = 0;
			$total_files = 0;
			if (is_array($size_info)) {
				$total_bytes = !empty($size_info['size']) && is_numeric($size_info['size']) ? (int) $size_info['size'] : 0;
				$total_files = !empty($size_info['files']) && is_numeric($size_info['files']) ? (int) $size_info['files'] : 0;
			}

			// Category breakdown via the same visible-file rules as the volume.
			self::walk_breakdown($volume, $root_hash, $categories, $totals);

			$response = self::build_response($root, $total_bytes, $total_files, $totals);
			$response['scan_method'] = 'elfinder';
			return $response;
		}

		/**
		 * Same dot-file rules as class_fma_connector.php::access().
		 *
		 * @param string $attr Attribute name.
		 * @param string $path Absolute path.
		 * @param string $data Stat data.
		 * @param mixed  $volume Volume instance.
		 * @param bool   $isDir Is directory.
		 * @param string $relpath Relative path.
		 * @return bool|null
		 */
		public static function access_control($attr, $path, $data, $volume, $isDir, $relpath)
		{
			$basename = basename($path);
			if ($basename === '.htaccess') {
				return null;
			}

			$settings = get_option('fmaoptions');
			$display_dot_files = isset($settings['display_dot_files']) ? absint($settings['display_dot_files']) : 0;

			if ($basename !== '' && $basename[0] === '.' && strlen($relpath) !== 1) {
				if ($display_dot_files === 1) {
					return !($attr === 'read' || $attr === 'write');
				}
				return null;
			}

			return null;
		}

		/**
		 * @param array $fmaoptions Plugin options.
		 * @return elFinderVolumefma_local_filesystem|null
		 */
		private static function mount_volume($fmaoptions)
		{
			if (!defined('FMAFILEPATH')) {
				return null;
			}

			$autoload = FMAFILEPATH . 'application/library/php/autoload.php';
			if (!is_readable($autoload)) {
				return null;
			}

			require_once $autoload;
			require_once FMAFILEPATH . 'application/class_fma_local_filesystem.php';
			self::ensure_elfinder_constants();

			if (!class_exists('elFinderVolumefma_local_filesystem')) {
				return null;
			}

			$volume_opts = self::build_volume_options($fmaoptions);
			if (empty($volume_opts['path']) || !is_dir($volume_opts['path'])) {
				return null;
			}

			$volume_opts['accessControl'] = array(__CLASS__, 'access_control');

			$filtered = apply_filters('fma__opts_override', array('roots' => array($volume_opts)));
			$volume_opts = self::find_local_root_opts($filtered);
			if (empty($volume_opts)) {
				$volume_opts = self::build_volume_options($fmaoptions);
				$volume_opts['accessControl'] = array(__CLASS__, 'access_control');
			}

			require_once dirname(__FILE__) . '/class-afm-storage-volume.php';
			if (!class_exists('AFM_Storage_Session')) {
				return null;
			}

			$session = new AFM_Storage_Session();
			$session->start();

			// Prefer elFinder core mount — same code path as the file manager connector.
			if (class_exists('elFinder')) {
				$elf = new elFinder(array(
					'session' => $session,
					'roots' => array($volume_opts),
					'sessionCloseEarlier' => false,
				));
				$volume = self::extract_local_volume($elf);
				if ($volume) {
					return $volume;
				}
			}

			// Direct mount fallback.
			$volume_class = class_exists('AFM_Storage_Volume') ? 'AFM_Storage_Volume' : 'elFinderVolumefma_local_filesystem';
			$volume = new $volume_class();
			$volume->setSession($session);
			if (!$volume->mount($volume_opts)) {
				return null;
			}

			return $volume;
		}

		/**
		 * @param array $opts elFinder options after filters.
		 * @return array|null
		 */
		private static function find_local_root_opts($opts)
		{
			if (empty($opts['roots']) || !is_array($opts['roots'])) {
				return null;
			}

			foreach ($opts['roots'] as $root) {
				if (!is_array($root) || empty($root['driver'])) {
					continue;
				}
				if ($root['driver'] === 'fma_local_filesystem' && !empty($root['path']) && is_dir($root['path'])) {
					$root['accessControl'] = array(__CLASS__, 'access_control');
					return $root;
				}
			}

			return null;
		}

		/**
		 * @param elFinder $elf elFinder instance.
		 * @return elFinderVolumefma_local_filesystem|null
		 */
		private static function extract_local_volume($elf)
		{
			if (!is_object($elf)) {
				return null;
			}

			try {
				$ref = new ReflectionClass($elf);
				if (!$ref->hasProperty('volumes')) {
					return null;
				}
				$prop = $ref->getProperty('volumes');
				$prop->setAccessible(true);
				$volumes = $prop->getValue($elf);
				if (!is_array($volumes)) {
					return null;
				}
				foreach ($volumes as $volume) {
					if ($volume instanceof elFinderVolumefma_local_filesystem) {
						return $volume;
					}
				}
			} catch (Exception $e) {
				return null;
			}

			return null;
		}

		private static function build_volume_options($fmaoptions)
		{
			$path = self::resolve_root($fmaoptions);
			$url = function_exists('fma_resolve_local_volume_url')
				? fma_resolve_local_volume_url($fmaoptions, $path)
				: (!empty($fmaoptions['public_url']) ? $fmaoptions['public_url'] : home_url('/'));
			if (isset($fmaoptions['hide_path']) && $fmaoptions['hide_path'] == '1') {
				$url = '';
			}

			$hide_htaccess = array(
				'pattern' => '/.htaccess/',
				'read' => false,
				'write' => false,
				'hidden' => true,
				'locked' => false,
			);
			if (isset($fmaoptions['enable_htaccess']) && !empty($fmaoptions['enable_htaccess']) && $fmaoptions['enable_htaccess'] == '1') {
				$hide_htaccess = array(
					'pattern' => '/.htaccess/',
					'read' => true,
					'write' => false,
					'hidden' => false,
					'locked' => false,
				);
			}

			return array(
				'driver' => 'fma_local_filesystem',
				'path' => $path,
				'URL' => $url,
				'winHashFix' => DIRECTORY_SEPARATOR !== '/',
				'accessControl' => array(__CLASS__, 'access_control'),
				'attributes' => array(
					array(
						'pattern' => '/.tmb/',
						'read' => false,
						'write' => false,
						'hidden' => true,
						'locked' => false,
					),
					array(
						'pattern' => '/.quarantine/',
						'read' => false,
						'write' => false,
						'hidden' => true,
						'locked' => false,
					),
					array(
						'pattern' => '/.gitkeep/',
						'read' => false,
						'write' => false,
						'hidden' => true,
						'locked' => false,
					),
					$hide_htaccess,
				),
			);
		}

		private static function ensure_elfinder_constants()
		{
			!defined('ELFINDER_TAR_PATH') && define('ELFINDER_TAR_PATH', 'tar');
			!defined('ELFINDER_GZIP_PATH') && define('ELFINDER_GZIP_PATH', 'gzip');
			!defined('ELFINDER_BZIP2_PATH') && define('ELFINDER_BZIP2_PATH', 'bzip2');
			!defined('ELFINDER_XZ_PATH') && define('ELFINDER_XZ_PATH', 'xz');
			!defined('ELFINDER_ZIP_PATH') && define('ELFINDER_ZIP_PATH', 'zip');
			!defined('ELFINDER_UNZIP_PATH') && define('ELFINDER_UNZIP_PATH', 'unzip');
			!defined('ELFINDER_RAR_PATH') && define('ELFINDER_RAR_PATH', 'rar');
			!defined('ELFINDER_RAR_MA4') && define('ELFINDER_RAR_MA4', false);
			!defined('ELFINDER_UNRAR_PATH') && define('ELFINDER_UNRAR_PATH', 'unrar');
			!defined('ELFINDER_7Z_PATH') && define('ELFINDER_7Z_PATH', (substr(PHP_OS, 0, 3) === 'WIN') ? '7z' : '7za');
			!defined('ELFINDER_CONVERT_PATH') && define('ELFINDER_CONVERT_PATH', 'convert');
			!defined('ELFINDER_IDENTIFY_PATH') && define('ELFINDER_IDENTIFY_PATH', 'identify');
			!defined('ELFINDER_EXIFTRAN_PATH') && define('ELFINDER_EXIFTRAN_PATH', 'exiftran');
			!defined('ELFINDER_JPEGTRAN_PATH') && define('ELFINDER_JPEGTRAN_PATH', 'jpegtran');
			!defined('ELFINDER_FFMPEG_PATH') && define('ELFINDER_FFMPEG_PATH', 'ffmpeg');
			!defined('ELFINDER_DISABLE_ZIPEDITOR') && define('ELFINDER_DISABLE_ZIPEDITOR', false);
			!defined('ELFINDER_IMAGEMAGICK_PS') && define('ELFINDER_IMAGEMAGICK_PS', false);
		}

		/**
		 * @param AFM_Storage_Volume $volume Mounted volume.
		 * @param string             $hash Directory hash.
		 * @param array              $categories Extension buckets.
		 * @param array              $totals Breakdown totals (by reference).
		 */
		private static function walk_breakdown($volume, $hash, $categories, &$totals)
		{
			static $deadline = null;
			if ($deadline === null) {
				$budget = (int) apply_filters('afm_storage_walk_budget_seconds', 45);
				$deadline = microtime(true) + max(10, $budget);
			}
			if (microtime(true) > $deadline) {
				return;
			}

			$entries = $volume->scandir($hash);
			if (!is_array($entries)) {
				return;
			}

			foreach ($entries as $stat) {
				if (microtime(true) > $deadline) {
					return;
				}
				if (!empty($stat['hidden'])) {
					continue;
				}

				if (isset($stat['mime']) && $stat['mime'] === 'directory') {
					if (!empty($stat['read']) && !empty($stat['hash'])) {
						self::walk_breakdown($volume, $stat['hash'], $categories, $totals);
					}
					continue;
				}

				if (empty($stat['read'])) {
					continue;
				}

				$filename = isset($stat['name']) ? $stat['name'] : '';
				$ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
				$size = isset($stat['size']) ? (int) $stat['size'] : 0;
				$bucket = 'other';

				foreach ($categories as $key => $exts) {
					if (in_array($ext, $exts, true)) {
						$bucket = $key;
						break;
					}
				}

				$totals[$bucket]['bytes'] += $size;
				$totals[$bucket]['files'] += 1;
			}
		}

		/**
		 * Fallback native scan when elFinder mount fails.
		 *
		 * @param string $root Root directory path.
		 * @param array  $fmaoptions Plugin options.
		 * @return array
		 */
		private static function scan_native($root, $fmaoptions)
		{
			$categories = self::categories();
			$totals = self::empty_breakdown();
			$total_bytes = 0;
			$total_files = 0;

			if (is_dir($root)) {
				$root_prefix = rtrim(wp_normalize_path($root), '/') . '/';
				$root_prefix_len = strlen($root_prefix);
				$rules = self::native_visibility_rules($fmaoptions);

				try {
					$directory = new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS);
					$filtered = new RecursiveCallbackFilterIterator(
						$directory,
						array(__CLASS__, 'iterator_allows_entry')
					);
					$iterator = new RecursiveIteratorIterator($filtered);

					foreach ($iterator as $file) {
						if (!$file->isFile()) {
							continue;
						}

						$normalized_path = wp_normalize_path($file->getPathname());
						if (!self::native_path_is_visible($normalized_path, $root_prefix, $root_prefix_len, $rules)) {
							continue;
						}

						$filename = $file->getFilename();
						$ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
						$size = (int) $file->getSize();
						$bucket = 'other';

						foreach ($categories as $key => $exts) {
							if (in_array($ext, $exts, true)) {
								$bucket = $key;
								break;
							}
						}

						$totals[$bucket]['bytes'] += $size;
						$totals[$bucket]['files'] += 1;
						$total_bytes += $size;
						$total_files += 1;
					}
				} catch (Exception $e) {
					// Leave zeroed totals.
				}
			}

			return self::build_response($root, $total_bytes, $total_files, $totals) + array('scan_method' => 'native');
		}

		private static function categories()
		{
			return array(
				'video' => array('mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv', 'flv'),
				'images' => array('jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'),
				'documents' => array('pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'csv', 'zip', 'rar', '7z'),
				'code' => array('php', 'js', 'css', 'html', 'htm', 'json', 'xml', 'ts', 'tsx', 'scss', 'less'),
			);
		}

		private static function empty_breakdown()
		{
			return array(
				'video' => array('bytes' => 0, 'files' => 0),
				'images' => array('bytes' => 0, 'files' => 0),
				'documents' => array('bytes' => 0, 'files' => 0),
				'code' => array('bytes' => 0, 'files' => 0),
				'other' => array('bytes' => 0, 'files' => 0),
			);
		}

		private static function build_response($root, $total_bytes, $total_files, $totals)
		{
			$fs_source = 'disk';
			$fs_total = 0;
			$fs_free = 0;

			if (defined('AFM_TOTAL_CAPACITY_BYTES') && AFM_TOTAL_CAPACITY_BYTES > 0) {
				$fs_total = (int) AFM_TOTAL_CAPACITY_BYTES;
				$fs_source = 'override';
				$fs_free = defined('AFM_TOTAL_FREE_BYTES')
					? (int) AFM_TOTAL_FREE_BYTES
					: max(0, $fs_total - $total_bytes);
			} elseif (function_exists('disk_total_space') && function_exists('disk_free_space')) {
				// AFM-963: TasteWP and some hosts disable disk_* via disable_functions.
				$disk_total = @disk_total_space($root);
				$disk_free = @disk_free_space($root);
				$fs_total = $disk_total ? (int) $disk_total : 0;
				$fs_free = $disk_free ? (int) $disk_free : 0;
			} else {
				// No disk capacity APIs — still report scanned usage; UI hides Disk Capacity when total is 0.
				$fs_source = 'unavailable';
				$fs_total = 0;
				$fs_free = 0;
			}

			return array(
				'total' => array('bytes' => $total_bytes, 'files' => $total_files),
				'breakdown' => $totals,
				'fs' => array('total' => $fs_total, 'free' => $fs_free, 'source' => $fs_source),
			);
		}

		private static function native_visibility_rules($fmaoptions)
		{
			$patterns = array('/.tmb/', '/.quarantine/', '/.gitkeep/');
			if (!isset($fmaoptions['enable_htaccess']) || $fmaoptions['enable_htaccess'] != '1') {
				$patterns[] = '/.htaccess/';
			}
			return array(
				'patterns' => $patterns,
				'hide_dot_files' => isset($fmaoptions['display_dot_files']) && absint($fmaoptions['display_dot_files']) === 1,
			);
		}

		private static function native_path_is_visible($normalized_path, $root_prefix, $root_prefix_len, $rules)
		{
			if (strncmp($normalized_path, $root_prefix, $root_prefix_len) !== 0) {
				return false;
			}
			$relative = substr($normalized_path, $root_prefix_len);
			$relpath = '/' . ltrim(str_replace('\\', '/', $relative), '/');
			foreach ($rules['patterns'] as $pattern) {
				if (preg_match('#' . $pattern . '#', $relpath)) {
					return false;
				}
			}
			if ($rules['hide_dot_files']) {
				$basename = basename($normalized_path);
				if ($basename !== '' && $basename[0] === '.' && strlen($relpath) !== 1) {
					return false;
				}
			}
			return true;
		}

		public static function iterator_allows_entry($current)
		{
			if (!$current->isDir()) {
				return true;
			}
			$name = $current->getFilename();
			return !in_array($name, array('.tmb', '.quarantine'), true);
		}
	}
}
