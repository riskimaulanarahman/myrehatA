<?php
/**
 * @package: File Manager Advanced
 * @Class: fma_connector
 */
if ( class_exists( 'class_fma_connector' ) ) {
	return;
}

class class_fma_connector {
	// elfinder defaults:
	//read:https://github.com/Studio-42/elFinder/wiki/Connector-configuration-options
	public function fma_local_file_system() {
		if ( function_exists( 'wp_raise_memory_limit' ) ) {
			wp_raise_memory_limit( 'admin' );
		}

		$afmp_restore_deprecations = null;
		if ( function_exists( 'afmp_suppress_vendor_deprecation_notices' ) ) {
			$afmp_restore_deprecations = afmp_suppress_vendor_deprecation_notices();
		}

		try {
			if ( function_exists( 'afmp_maybe_set_elfinder_json_header' ) ) {
				afmp_maybe_set_elfinder_json_header();
			}

			$settings = get_option( 'fmaoptions' );
			$is_admin = class_fma_permissions::has_unrestricted_filesystem_access();

			// Administrators keep Public Root Path / ABSPATH (unchanged behaviour).
			$path = ABSPATH;
			$url  = site_url();

			if ( isset( $settings['public_path'] ) && ! empty( $settings['public_path'] ) ) {
				$path = $settings['public_path'];
			}

			if ( isset( $settings['public_url'] ) && ! empty( $settings['public_url'] ) ) {
				$url = $settings['public_url'];
			}

			// Non-admins are sandboxed according to resolve_restricted_root.
			if ( ! $is_admin ) {
				$restricted = class_fma_permissions::resolve_restricted_root(
					isset( $settings['public_path'] ) ? $settings['public_path'] : '',
					isset( $settings['public_url'] ) ? $settings['public_url'] : ''
				);
				$path = $restricted['path'];
				$url  = $restricted['url'];
			}

			// Keep elFinder file links valid when an old/default URL was saved.
			$root_path = untrailingslashit( wp_normalize_path( $path ) );
			$base_path = untrailingslashit( wp_normalize_path( ABSPATH ) );
			$root_is_inside_site = $root_path === $base_path || 0 === strpos( $root_path . '/', trailingslashit( $base_path ) );

			if ( $root_is_inside_site ) {
				$root_relative_path = ltrim( substr( $root_path, strlen( $base_path ) ), '/' );
				$url = '' === $root_relative_path ? site_url() : trailingslashit( site_url() ) . $root_relative_path;
			}

			if ( isset( $settings['hide_path'] ) && ( $settings['hide_path'] == '1' ) ) {
				$url = '';
			}

			if ( ! function_exists( 'elFinderAutoloader' ) ) {
				require_once FMAFILEPATH . 'application/library/php/autoload.php';
			}

			if ( ! class_exists( 'fma_elFinderConnector' ) ) {
				require_once FMAFILEPATH . 'application/class_fma_elfinder_connector.php';
			}

			// Load custom filesystem driver for content search
			if ( defined( 'FMAFILEPATH' ) ) {
				require_once FMAFILEPATH . 'application/class_fma_local_filesystem.php';
			} else {
				require_once dirname( __FILE__ ) . '/class_fma_local_filesystem.php';
			}

			if ( isset( $settings['enable_trash'] ) && ( $settings['enable_trash'] == '1' ) ) {
				$trash   = array(
					'id'            => '1',
					'driver'        => 'Trash',
					'path'          => FMAFILEPATH . 'application/library/files/.trash/',
					'tmbURL'        => site_url() . '/application/library/files/.trash/.tmb/',
					'winHashFix'    => DIRECTORY_SEPARATOR !== '/', // to make hash same to Linux one on windows too
					'uploadDeny'    => array( '' ),                // Recomend the same settings as the original volume that uses the trash
					'uploadAllow'   => array( 'all' ),// Same as above
					'uploadOrder'   => array( 'deny', 'allow' ),      // Same as above
					'accessControl' => 'access',                    // Same as above
					'attributes'    => array(
						array(
							'pattern' => '/.tmb/',
							'read'    => false,
							'write'   => false,
							'hidden'  => true,
							'locked'  => false,
						),
						array(
							'pattern' => '/.quarantine/',
							'read'    => false,
							'write'   => false,
							'hidden'  => true,
							'locked'  => false,
						),
						array(
							'pattern' => '/.gitkeep/',
							'read'    => false,
							'write'   => false,
							'hidden'  => true,
							'locked'  => false,
						),
					),
				);
				$trash_f = 't1_Lw';
			} else {
				$trash   = array();
				$trash_f = '';
			}

			$hide_htaccess = array(
				'pattern' => '/.htaccess/',
				'read'    => false,
				'write'   => false,
				'hidden'  => true,
				'locked'  => false,
			);

			if ( isset( $settings['enable_htaccess'] ) && ! empty( $settings['enable_htaccess'] ) && $settings['enable_htaccess'] == '1' ) {
				$hide_htaccess = array(
					'pattern' => '/.htaccess/',
					'read'    => true,
					'write'   => false,
					'hidden'  => false,
					'locked'  => false,
				);
			}

			// getting allowed upload
			$allowUpload = array( 'all' );

			if ( isset( $settings['fma_upload_allow'] ) && ! empty( $settings['fma_upload_allow'] ) ) {
				$allowUpload = explode( ',', $settings['fma_upload_allow'] );
			}

			// restricting max upload size
			$max_upload_size = isset( $settings['upload_max_size'] ) ? $settings['upload_max_size'] : '0';

			$opts = array(
				'roots' => array(
					// Items volume
					array(
						'driver'        => 'fma_local_filesystem',           // custom driver with content search support
						'path'          => $path,                 // path to files (REQUIRED)
						'URL'           => $url, // URL to files (REQUIRED)
						'trashHash'     => $trash_f,                     // elFinder's hash of trash folder
						'winHashFix'    => DIRECTORY_SEPARATOR !== '/', // to make hash same to Linux one on windows too
						'uploadDeny'    => $is_admin ? array( 'all' ) : class_fma_permissions::get_restricted_upload_deny_mimes(),
						'uploadAllow'   => $allowUpload,// Mimetype `image` and `text/plain` allowed to upload
						'uploadOrder'   => $is_admin ? array( 'deny', 'allow' ) : array( 'allow', 'deny' ),
						'disabled'      => array( 'help', 'preference' ),
						'accessControl' => 'access',
						'acceptedName'  => $is_admin ? '' : 'afm_plugin_file_validName',
						'uploadMaxSize' => $max_upload_size,
						'searchTimeout' => 300,
						'attributes'    => array(
							array(
								'pattern' => '/.tmb/',
								'read'    => false,
								'write'   => false,
								'hidden'  => true,
								'locked'  => false,
							),
							array(
								'pattern' => '/.quarantine/',
								'read'    => false,
								'write'   => false,
								'hidden'  => true,
								'locked'  => false,
							),
							array(
								'pattern' => '/.gitkeep/',
								'read'    => false,
								'write'   => false,
								'hidden'  => true,
								'locked'  => false,
							),
							$hide_htaccess,
						),
					),
					// Trash volume
					$trash,
				),
			);

			if ( ! $is_admin ) {
				$opts['roots'][0]['attributes'] = array_merge(
					$opts['roots'][0]['attributes'],
					class_fma_permissions::get_restricted_file_attributes()
				);
				// Same filename policy on every read/write path (not only get/put).
				$opts['bind']['put.pre']     = array( $this, 'on_put_command' );
				$opts['bind']['get.pre']     = array( $this, 'on_get_command' );
				$opts['bind']['file.pre']    = array( $this, 'on_file_command' );
				$opts['bind']['zipdl.pre']   = array( $this, 'on_zipdl_command' );
				$opts['bind']['archive.pre'] = array( $this, 'on_archive_command' );
				$opts['bind']['rm.pre']      = array( $this, 'on_rm_command' );
				$opts['bind']['rename.pre']  = array( $this, 'on_rename_command' );
			}

			// SVG sanitiser + post-write policy for every command that can create/change files
			// (AFM-885 WPScan: extract bypassed upload/put-only binds; rename/content sniff follow-up).
			$opts['bind']['upload']    = array( $this, 'on_files_written_event' );
			$opts['bind']['extract']   = array( $this, 'on_files_written_event' );
			$opts['bind']['duplicate'] = array( $this, 'on_files_written_event' );
			$opts['bind']['paste']     = array( $this, 'on_files_written_event' );
			$opts['bind']['put']       = array( $this, 'on_put_event' );
			$opts['bind']['rename']    = array( $this, 'on_rename_event' );
			if ( function_exists( 'afmp_normalize_elfinder_upload_mimes' ) ) {
				$opts['bind']['upload'][] = 'afmp_normalize_elfinder_upload_mimes';
			}
			// Cache invalidation for commands not covered by write handlers above.
			$opts['bind']['rm mkfile archive'] = array( $this, 'on_storage_cache_invalidate' );

			$opts = apply_filters( 'fma__opts_override', $opts );
			foreach ( $opts['roots'] as &$root ) {
				if ( isset( $root['disabled'] ) && is_array( $root['disabled'] ) ) {
					$root['disabled'] = array_values( array_diff( $root['disabled'], array( 'help', 'preference' ) ) );
				}
			}
			unset( $root );
			$blocked_integrations = ( isset( $settings['blocked_integrations'] ) && is_array( $settings['blocked_integrations'] ) ) ? $settings['blocked_integrations'] : array();
			$opts                 = $this->filter_blocked_integrations_admin( $opts, $blocked_integrations );

			// So cloud drivers building onetime/temp URLs hit the WP ajax connector.
			if ( ! defined( 'ELFINDER_CONNECTOR_URL' ) ) {
				define(
					'ELFINDER_CONNECTOR_URL',
					add_query_arg(
						array(
							'action'  => 'fma_load_fma_ui',
							'_fmakey' => wp_create_nonce( 'fmaskey' ),
						),
						admin_url( 'admin-ajax.php' )
					)
				);
			}

			// elFinder ctor only registers $opts['bind'] keys when the current HTTP cmd matches that bind group.
			// That can skip registering `search.pre` so content search never runs. Always bind search.pre on the instance.
			unset( $opts['bind']['search.pre'] );

			$elf = new elFinder( $opts );
			$elf->bind( 'search.pre', array( $this, 'on_search_command' ) );

			// run elFinder
			$fma_connector = new fma_elFinderConnector( $elf );
			try {
				$fma_connector->run();
				die;
			} catch ( Throwable $e ) {
				if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
					error_log( 'AFM elFinder connector error: ' . $e->getMessage() ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
				}
				status_header( 500 );
				exit;
			}
		} finally {
			if ( is_callable( $afmp_restore_deprecations ) ) {
				$afmp_restore_deprecations();
			}
		}
	}

	/**
	 * Block restricted overwrite operations for non-administrator users.
	 */
	public function on_put_command( $cmd, &$args, $elfinder, $volume ) {
		if ( empty( $args['target'] ) || ! $volume ) {
			return;
		}

		$file = $volume->file( $args['target'] );
		if ( ! $file || empty( $file['name'] ) ) {
			return;
		}

		if ( ! class_fma_permissions::is_restricted_write_filename_allowed( $file['name'] ) ) {
			return array(
				'preventexec' => true,
				'results'     => array(
					'error' => array( elFinder::ERROR_UPLOAD_FILE_MIME ),
				),
			);
		}
	}

	/**
	 * Block restricted editor read operations (get cmd for code editor).
	 */
	public function on_get_command( $cmd, &$args, $elfinder, $volume ) {
		if ( empty( $args['target'] ) || ! $volume ) {
			return;
		}

		$file = $volume->file( $args['target'] );
		if ( ! $file || empty( $file['name'] ) ) {
			return;
		}

		if ( ! class_fma_permissions::is_restricted_write_filename_allowed( $file['name'] ) ) {
			return array(
				'preventexec' => true,
				'results'     => array(
					'error' => array( elFinder::ERROR_ACCESS_DENIED ),
				),
			);
		}
	}

	/**
	 * Block restricted single file download operations (file cmd).
	 * Allows downloading PHP files for authorized non-admin roles (AFM-989).
	 */
	public function on_file_command( $cmd, &$args, $elfinder, $volume ) {
		if ( empty( $args['target'] ) || ! $volume ) {
			return;
		}

		$file = $volume->file( $args['target'] );
		if ( ! $file || empty( $file['name'] ) ) {
			return;
		}

		if ( ! class_fma_permissions::is_restricted_download_filename_allowed( $file['name'] ) ) {
			return array(
				'preventexec' => true,
				'results'     => array(
					'error' => array( elFinder::ERROR_ACCESS_DENIED ),
				),
			);
		}
	}

	/**
	 * Block zip download of restricted filenames.
	 * Allows downloading PHP files in zip archives for authorized non-admin roles (AFM-989).
	 */
	public function on_zipdl_command( $cmd, &$args, $elfinder, $volume ) {
		if ( empty( $args['targets'] ) || ! is_array( $args['targets'] ) || ! $volume ) {
			return;
		}

		foreach ( $args['targets'] as $target ) {
			$file = $volume->file( $target );
			if ( ! $file || empty( $file['name'] ) ) {
				continue;
			}
			if ( ! empty( $file['mime'] ) && 'directory' === $file['mime'] ) {
				// Directory zipdl is handled by archive.pre / volume locks.
				continue;
			}
			if ( ! class_fma_permissions::is_restricted_download_filename_allowed( $file['name'] ) ) {
				return array(
					'preventexec' => true,
					'results'     => array(
						'error' => array( elFinder::ERROR_ACCESS_DENIED ),
					),
				);
			}
		}
	}

	/**
	 * Refuse archiving targets that are hidden or have non-downloadable restricted names.
	 * Visible PHP with write:false (AFM-989) may be archived/downloaded; edit remains blocked.
	 */
	public function on_archive_command( $cmd, &$args, $elfinder, $volume ) {
		if ( empty( $args['targets'] ) || ! is_array( $args['targets'] ) || ! $volume ) {
			return;
		}

		// AFM-989: make-mixin often suggests "abc.php" / "abc 1.php" as the archive
		// base name. Rewrite to a non-PHP name before volume->archive() runs
		// nameAccepted(), so we never get a false Permission denied / invalid name
		// after the zip was already written (or while the UI still shows a zip).
		if ( ! empty( $args['name'] ) && is_string( $args['name'] ) ) {
			$archive_name = $args['name'];
			if ( preg_match( '/\.(php\d?|phtml)(\.(zip|tgz|tar\.gz|tar|gz|bz2|xz|rar|7z))?$/i', $archive_name ) ) {
				$args['name'] = preg_replace( '/\.(php\d?|phtml)/i', '', $archive_name );
				if ( '' === $args['name'] || strpos( $args['name'], '.' ) === 0 ) {
					$args['name'] = 'Archive';
				}
			}
		}

		foreach ( $args['targets'] as $target ) {
			$file = $volume->file( $target );
			if ( ! $file ) {
				continue;
			}
			if ( ! empty( $file['hidden'] ) ) {
				return array(
					'preventexec' => true,
					'results'     => array(
						'error' => array( elFinder::ERROR_PERM_DENIED ),
					),
				);
			}
			// Allow archiving downloadable PHP; still block htaccess/wp-config/etc.
			if ( ! empty( $file['name'] ) && ! class_fma_permissions::is_restricted_download_filename_allowed( $file['name'] ) ) {
				return array(
					'preventexec' => true,
					'results'     => array(
						'error' => array( elFinder::ERROR_PERM_DENIED ),
					),
				);
			}
			if ( ! empty( $file['mime'] ) && 'directory' === $file['mime'] && method_exists( $volume, 'closest' ) ) {
				// Only block folders that contain hidden restricted children, not locked-visible PHP.
				$hidden = $volume->closest( $target, 'hidden', true );
				if ( $hidden ) {
					return array(
						'preventexec' => true,
						'results'     => array(
							'error' => array( elFinder::ERROR_PERM_DENIED ),
						),
					);
				}
			}
		}
	}

	/**
	 * Refuse recursive directory delete when locked/hidden children exist.
	 */
	public function on_rm_command( $cmd, &$args, $elfinder, $volume ) {
		if ( empty( $args['targets'] ) || ! is_array( $args['targets'] ) || ! $volume ) {
			return;
		}

		foreach ( $args['targets'] as $target ) {
			$file = $volume->file( $target );
			if ( ! $file ) {
				continue;
			}
			if ( ! empty( $file['locked'] ) ) {
				return array(
					'preventexec' => true,
					'results'     => array(
						'error' => array( elFinder::ERROR_LOCKED, $file['name'] ),
					),
				);
			}
			if ( ! empty( $file['mime'] ) && 'directory' === $file['mime'] && method_exists( $volume, 'closest' ) ) {
				$locked = $volume->closest( $target, 'locked', true );
				if ( $locked ) {
					return array(
						'preventexec' => true,
						'results'     => array(
							'error' => array( elFinder::ERROR_PERM_DENIED ),
						),
					);
				}
			}
		}
	}

	/**
	 * Block renaming to a restricted filename for non-administrators.
	 */
	public function on_rename_command( $cmd, &$args, $elfinder, $volume ) {
		if ( empty( $args['name'] ) ) {
			return;
		}

		if ( ! class_fma_permissions::is_restricted_write_filename_allowed( $args['name'] ) ) {
			return array(
				'preventexec' => true,
				'results'     => array(
					'error' => array( elFinder::ERROR_UPLOAD_FILE_MIME ),
				),
			);
		}
	}

	/**
	 * Sanitize SVG after put (mkfile+put path skips upload sanitiser).
	 */
	public function on_put_event( $cmd, &$result, $args, $elfinder, $volume = null ) {
		$this->invalidate_storage_usage_cache();

		if ( 'put' !== $cmd || empty( $args['target'] ) || ! $volume ) {
			return;
		}

		$file = $volume->file( $args['target'] );
		if ( ! $file || empty( $file['name'] ) ) {
			return;
		}

		$content_hint = isset( $args['content'] ) ? $args['content'] : null;
		if ( $this->should_sanitize_as_svg( $file, $volume, $content_hint ) ) {
			$this->sanitize_svg_file_content( $file, $volume );
		}
	}

	/**
	 * After rename: sanitise if the new name is .svg or contents look like SVG.
	 */
	public function on_rename_event( $cmd, &$result, $args, $elfinder, $volume = null ) {
		$this->invalidate_storage_usage_cache();

		if ( 'rename' !== $cmd || ! $volume ) {
			return;
		}

		$candidates = array();
		if ( ! empty( $result['added'] ) && is_array( $result['added'] ) ) {
			$candidates = array_merge( $candidates, $result['added'] );
		}
		if ( ! empty( $result['changed'] ) && is_array( $result['changed'] ) ) {
			$candidates = array_merge( $candidates, $result['changed'] );
		}

		foreach ( $candidates as $file ) {
			if ( empty( $file['hash'] ) || empty( $file['name'] ) ) {
				continue;
			}
			if ( ! empty( $file['mime'] ) && 'directory' === $file['mime'] ) {
				continue;
			}
			if ( $this->should_sanitize_as_svg( $file, $volume ) ) {
				$this->sanitize_svg_file_content( $file, $volume );
			}
		}
	}

	/**
	 * Post-write handler for upload / extract / duplicate / paste (AFM-885).
	 */
	public function on_files_written_event( $cmd, &$result, $args, $elfinder, $volume = null ) {
		$this->invalidate_storage_usage_cache();

		if ( empty( $result['added'] ) || ! is_array( $result['added'] ) || ! $volume ) {
			return;
		}

		$is_admin = class_fma_permissions::has_unrestricted_filesystem_access();
		$written  = $this->collect_written_file_stats( $result['added'], $volume );
		// AFM-989: duplicate/paste may copy existing visible PHP; do not delete those copies.
		$allow_php_copy = in_array( $cmd, array( 'duplicate', 'paste' ), true );

		foreach ( $written as $file ) {
			if ( empty( $file['name'] ) || empty( $file['hash'] ) ) {
				continue;
			}

			if ( ! $is_admin && ! class_fma_permissions::is_restricted_write_filename_allowed( $file['name'] ) ) {
				$is_php_copy = $allow_php_copy && preg_match( '/\.(php\d?|phtml)$/i', $file['name'] );
				if ( ! $is_php_copy ) {
					$this->remove_volume_file( $file, $volume );
					continue;
				}
			}

			if ( $this->should_sanitize_as_svg( $file, $volume ) ) {
				$this->sanitize_svg_file_content( $file, $volume );
			}
		}

		if ( ! $is_admin ) {
			$result['added'] = array_values(
				array_filter(
					$result['added'],
					function ( $file ) use ( $allow_php_copy ) {
						if ( empty( $file['name'] ) ) {
							return true;
						}
						if ( ! empty( $file['mime'] ) && 'directory' === $file['mime'] ) {
							return true;
						}
						if ( class_fma_permissions::is_restricted_write_filename_allowed( $file['name'] ) ) {
							return true;
						}
						return $allow_php_copy && (bool) preg_match( '/\.(php\d?|phtml)$/i', $file['name'] );
					}
				)
			);
		}
	}

	/**
	 * BC alias — older references may still call on_upload_event.
	 */
	public function on_upload_event( $cmd, &$result, $args, $elfinder, $volume = null ) {
		return $this->on_files_written_event( $cmd, $result, $args, $elfinder, $volume );
	}

	/**
	 * Invalidate dashboard storage stats after file manager changes.
	 */
	public function on_storage_cache_invalidate( $cmd, &$args, $elfinder, $volume ) {
		$this->invalidate_storage_usage_cache();
	}

	/**
	 * Clear cached dashboard storage usage.
	 */
	private function invalidate_storage_usage_cache() {
		if ( class_exists( 'FMA_Controller' ) ) {
			FMA_Controller::get_instance()->clear_storage_usage_cache();
		}
	}

	/**
	 * Decide whether stat looks like SVG by name or elFinder MIME.
	 *
	 * @param array $file elFinder file stat.
	 * @return bool
	 */
	private function is_svg_file_stat( $file ) {
		$lower = isset( $file['name'] ) ? strtolower( $file['name'] ) : '';
		$mime  = isset( $file['mime'] ) ? (string) $file['mime'] : '';

		return (bool) preg_match( '/\.(?:svg|svgz)$/i', $lower )
			|| ( false !== stripos( $mime, 'svg' ) );
	}

	/**
	 * Decide if SVG sanitiser should run (name/MIME or content sniff).
	 *
	 * @param array       $file         elFinder file stat.
	 * @param object      $volume       Volume driver.
	 * @param string|null $content_hint Optional in-memory content (e.g. put body).
	 * @return bool
	 */
	private function should_sanitize_as_svg( $file, $volume, $content_hint = null ) {
		if ( $this->is_svg_file_stat( $file ) ) {
			return true;
		}

		if ( null !== $content_hint ) {
			return $this->file_content_looks_like_svg( $content_hint );
		}

		if ( empty( $file['hash'] ) || ! method_exists( $volume, 'getPath' ) ) {
			return false;
		}

		$path = $volume->getPath( $file['hash'] );
		if ( ! $path || ! is_file( $path ) || ! is_readable( $path ) ) {
			return false;
		}

		$size = filesize( $path );
		if ( false === $size || $size < 1 ) {
			return false;
		}

		// Full check for files up to 10MB; stream-chunk check for larger files.
		if ( $size <= 10485760 ) {
			$content = file_get_contents( $path );
			return $this->file_content_looks_like_svg( $content );
		}

		return $this->stream_scan_file_for_svg( $path );
	}

	/**
	 * Detect text encoding (UTF-8, UTF-16LE, UTF-16BE, UTF-32LE, UTF-32BE) with or without BOM.
	 *
	 * @param string $content Raw content.
	 * @return string|null Encoding name or null.
	 */
	private function detect_content_encoding( $content ) {
		if ( ! is_string( $content ) || strlen( $content ) < 2 ) {
			return null;
		}

		if ( 0 === strncmp( $content, "\xEF\xBB\xBF", 3 ) ) {
			return 'UTF-8-BOM';
		}
		if ( 0 === strncmp( $content, "\xFF\xFE\x00\x00", 4 ) ) {
			return 'UTF-32LE-BOM';
		}
		if ( 0 === strncmp( $content, "\x00\x00\xFE\xFF", 4 ) ) {
			return 'UTF-32BE-BOM';
		}
		if ( 0 === strncmp( $content, "\xFF\xFE", 2 ) ) {
			return 'UTF-16LE-BOM';
		}
		if ( 0 === strncmp( $content, "\xFE\xFF", 2 ) ) {
			return 'UTF-16BE-BOM';
		}

		// Sniff alternating null bytes in ASCII range
		$sample_len = min( strlen( $content ), 512 );
		if ( $sample_len >= 4 ) {
			$even_nulls = 0;
			$odd_nulls  = 0;
			for ( $i = 0; $i < $sample_len; $i += 2 ) {
				if ( "\0" === $content[ $i ] ) {
					$even_nulls++;
				}
				if ( $i + 1 < $sample_len && "\0" === $content[ $i + 1 ] ) {
					$odd_nulls++;
				}
			}

			if ( $even_nulls > 4 && $odd_nulls < 2 ) {
				return 'UTF-16BE';
			}
			if ( $odd_nulls > 4 && $even_nulls < 2 ) {
				return 'UTF-16LE';
			}
		}

		return null;
	}

	/**
	 * Normalize content across encodings (UTF-8, UTF-16, UTF-32, BOMs, gzip/svgz).
	 *
	 * @param string $content Raw file contents.
	 * @return string UTF-8 decoded content.
	 */
	private function normalize_content_for_svg_inspection( $content ) {
		if ( ! is_string( $content ) || '' === $content ) {
			return '';
		}

		// Handle gzip / svgz (magic bytes \x1f\x8b).
		if ( 0 === strncmp( $content, "\x1f\x8b", 2 ) && function_exists( 'gzdecode' ) ) {
			$decompressed = @gzdecode( $content );
			if ( false !== $decompressed && is_string( $decompressed ) ) {
				$content = $decompressed;
			}
		}

		$encoding = $this->detect_content_encoding( $content );

		if ( 'UTF-8-BOM' === $encoding ) {
			$content = substr( $content, 3 );
		} elseif ( 'UTF-32LE-BOM' === $encoding && function_exists( 'mb_convert_encoding' ) ) {
			$content = (string) @mb_convert_encoding( substr( $content, 4 ), 'UTF-8', 'UTF-32LE' );
		} elseif ( 'UTF-32BE-BOM' === $encoding && function_exists( 'mb_convert_encoding' ) ) {
			$content = (string) @mb_convert_encoding( substr( $content, 4 ), 'UTF-8', 'UTF-32BE' );
		} elseif ( 'UTF-16LE-BOM' === $encoding && function_exists( 'mb_convert_encoding' ) ) {
			$content = (string) @mb_convert_encoding( substr( $content, 2 ), 'UTF-8', 'UTF-16LE' );
		} elseif ( 'UTF-16BE-BOM' === $encoding && function_exists( 'mb_convert_encoding' ) ) {
			$content = (string) @mb_convert_encoding( substr( $content, 2 ), 'UTF-8', 'UTF-16BE' );
		} elseif ( ( 'UTF-16LE' === $encoding || 'UTF-16BE' === $encoding ) && function_exists( 'mb_convert_encoding' ) ) {
			$content = (string) @mb_convert_encoding( $content, 'UTF-8', $encoding );
		}

		return is_string( $content ) ? $content : '';
	}

	/**
	 * Content-based SVG detection from parsed XML (AFM-974 / AFM-999).
	 *
	 * Root elements in the SVG namespace are detected regardless of prefix;
	 * when XML cannot be parsed but still looks SVG-like, fail closed.
	 *
	 * @param string $content File contents.
	 * @return bool
	 */
	private function file_content_looks_like_svg( $content ) {
		if ( ! is_string( $content ) || '' === $content ) {
			return false;
		}

		$normalized = $this->normalize_content_for_svg_inspection( $content );
		if ( '' === $normalized ) {
			return false;
		}

		$trimmed = ltrim( $normalized, " \t\n\r\0\x0B" );
		if ( '' === $trimmed ) {
			return false;
		}

		if ( $this->parsed_content_has_svg_root( $trimmed ) ) {
			return true;
		}

		return $this->unparsed_content_may_be_svg( $trimmed );
	}

	/**
	 * Detect SVG root via DOM (namespace-aware, full document).
	 *
	 * @param string $content XML/SVG file contents.
	 * @return bool
	 */
	private function parsed_content_has_svg_root( $content ) {
		if ( ! class_exists( 'DOMDocument' ) ) {
			return false;
		}

		$previous = libxml_use_internal_errors( true );

		$dom = new DOMDocument();
		$loaded = $dom->loadXML(
			$content,
			LIBXML_NONET | LIBXML_COMPACT
		);

		libxml_clear_errors();
		libxml_use_internal_errors( $previous );

		if ( ! $loaded ) {
			return false;
		}

		$root = $dom->documentElement;
		if ( ! $root instanceof DOMElement ) {
			return false;
		}

		return $this->dom_element_is_svg( $root );
	}

	/**
	 * Whether a DOM element is an SVG document root.
	 *
	 * @param DOMElement $element Document root element.
	 * @return bool
	 */
	private function dom_element_is_svg( DOMElement $element ) {
		if ( 'svg' !== strtolower( $element->localName ) ) {
			return false;
		}

		$namespace = $element->namespaceURI;

		return ( null === $namespace || '' === $namespace || 'http://www.w3.org/2000/svg' === $namespace );
	}

	/**
	 * Fail-closed fallback when XML parsing fails but payload may still be SVG (AFM-999).
	 *
	 * @param string $content File contents.
	 * @return bool
	 */
	private function unparsed_content_may_be_svg( $content ) {
		if ( ! is_string( $content ) || '' === $content ) {
			return false;
		}

		// Check for <svg or <prefix:svg tag
		if ( preg_match( '/<\s*(?:[\w.-]+:)?svg\b/i', $content ) ) {
			return true;
		}

		// Check for DOCTYPE svg
		if ( preg_match( '/<!DOCTYPE\s+[^>]*\bsvg\b/i', $content ) ) {
			return true;
		}

		// Check for SVG namespace definition
		if ( preg_match( '/xmlns(?::\w+)?\s*=\s*["\']http:\/\/www\.w3\.org\/2000\/svg["\']/i', $content ) ) {
			return true;
		}

		return false;
	}

	/**
	 * Stream scan large files (>10MB) for SVG patterns to prevent comment-padding bypass (AFM-999).
	 *
	 * @param string $path Absolute file path on disk.
	 * @return bool
	 */
	private function stream_scan_file_for_svg( $path ) {
		$fh = @fopen( $path, 'rb' );
		if ( ! $fh ) {
			return false;
		}

		$header = fread( $fh, 8192 );
		if ( false === $header || '' === $header ) {
			fclose( $fh );
			return false;
		}

		// Check if it's gzip (svgz)
		if ( 0 === strncmp( $header, "\x1f\x8b", 2 ) ) {
			fclose( $fh );
			$content = @file_get_contents( $path );
			return $this->file_content_looks_like_svg( $content );
		}

		$encoding = $this->detect_content_encoding( $header );
		$mb_encoding = null;
		if ( false !== strpos( (string) $encoding, 'UTF-16LE' ) ) {
			$mb_encoding = 'UTF-16LE';
		} elseif ( false !== strpos( (string) $encoding, 'UTF-16BE' ) ) {
			$mb_encoding = 'UTF-16BE';
		} elseif ( false !== strpos( (string) $encoding, 'UTF-32LE' ) ) {
			$mb_encoding = 'UTF-32LE';
		} elseif ( false !== strpos( (string) $encoding, 'UTF-32BE' ) ) {
			$mb_encoding = 'UTF-32BE';
		}

		rewind( $fh );
		$overlap    = '';
		$chunk_size = 524288; // 512 KB

		while ( ! feof( $fh ) ) {
			$chunk = fread( $fh, $chunk_size );
			if ( false === $chunk || '' === $chunk ) {
				break;
			}

			$data    = $overlap . $chunk;
			$overlap = strlen( $chunk ) > 1024 ? substr( $chunk, -1024 ) : $chunk;

			if ( null !== $mb_encoding && function_exists( 'mb_convert_encoding' ) ) {
				$converted = @mb_convert_encoding( $data, 'UTF-8', $mb_encoding );
				if ( false !== $converted && is_string( $converted ) ) {
					$data = $converted;
				}
			}

			if ( $this->unparsed_content_may_be_svg( $data ) ) {
				fclose( $fh );
				return true;
			}
		}

		fclose( $fh );
		return false;
	}

	/**
	 * Read volume file contents for SVG detection (full file, capped).
	 *
	 * @param array  $file      File stat.
	 * @param object $volume    Volume driver.
	 * @param int    $max_bytes Maximum bytes to read.
	 * @return string
	 */
	private function read_volume_file_content( $file, $volume, $max_bytes = 10485760 ) {
		if ( empty( $file['hash'] ) || ! method_exists( $volume, 'getPath' ) ) {
			return '';
		}

		$path = $volume->getPath( $file['hash'] );
		if ( ! $path || ! is_file( $path ) || ! is_readable( $path ) ) {
			return '';
		}

		$size = filesize( $path );
		if ( false === $size || $size < 1 ) {
			return '';
		}

		if ( $size <= $max_bytes ) {
			$content = file_get_contents( $path );
			return is_string( $content ) ? $content : '';
		}

		$fh = fopen( $path, 'rb' );
		if ( ! $fh ) {
			return '';
		}
		$content = fread( $fh, $max_bytes );
		fclose( $fh );

		return is_string( $content ) ? $content : '';
	}

	/**
	 * Flatten added stats so nested extract contents are included.
	 *
	 * @param array  $added  elFinder added stats.
	 * @param object $volume Volume driver.
	 * @return array
	 */
	private function collect_written_file_stats( $added, $volume ) {
		$files = array();

		foreach ( $added as $file ) {
			if ( empty( $file['hash'] ) ) {
				continue;
			}
			if ( ! empty( $file['mime'] ) && 'directory' === $file['mime'] ) {
				$files = array_merge( $files, $this->collect_files_under_hash( $file['hash'], $volume ) );
				continue;
			}
			$files[] = $file;
		}

		return $files;
	}

	/**
	 * Recursively list file stats under a directory hash.
	 *
	 * @param string $hash   Directory hash.
	 * @param object $volume Volume driver.
	 * @return array
	 */
	private function collect_files_under_hash( $hash, $volume ) {
		$files = array();

		if ( ! method_exists( $volume, 'scandir' ) ) {
			return $files;
		}

		$items = $volume->scandir( $hash );
		if ( ! is_array( $items ) ) {
			return $files;
		}

		foreach ( $items as $item ) {
			if ( empty( $item['hash'] ) ) {
				continue;
			}
			if ( ! empty( $item['mime'] ) && 'directory' === $item['mime'] ) {
				$files = array_merge( $files, $this->collect_files_under_hash( $item['hash'], $volume ) );
				continue;
			}
			$files[] = $item;
		}

		return $files;
	}

	/**
	 * Delete a volume file from disk (and best-effort via volume API).
	 *
	 * @param array  $file   File stat.
	 * @param object $volume Volume driver.
	 * @return void
	 */
	private function remove_volume_file( $file, $volume ) {
		if ( empty( $file['hash'] ) ) {
			return;
		}

		if ( method_exists( $volume, 'rm' ) ) {
			try {
				$volume->rm( $file['hash'] );
				return;
			} catch ( Exception $e ) {
				// Fall through to unlink.
			}
		}

		if ( method_exists( $volume, 'getPath' ) ) {
			$path = $volume->getPath( $file['hash'] );
			if ( $path && is_file( $path ) ) {
				@unlink( $path );
			}
		}
	}

	private function sanitize_svg_file_content( $uploaded_file, $volume ) {
		require_once FMAFILEPATH . 'application/svg-sanitizer/includes/autoload.php';
		if ( empty( $uploaded_file['hash'] ) || ! method_exists( $volume, 'getPath' ) ) {
			return;
		}

		$file_path = $volume->getPath( $uploaded_file['hash'] );
		if ( ! $file_path || ! file_exists( $file_path ) || ! is_readable( $file_path ) ) {
			return;
		}

		$raw_content = file_get_contents( $file_path );
		if ( false === $raw_content || '' === $raw_content ) {
			return;
		}

		$file_name  = isset( $uploaded_file['name'] ) ? (string) $uploaded_file['name'] : '';
		$is_gzipped = ( 0 === strncmp( $raw_content, "\x1f\x8b", 2 ) || preg_match( '/\.svgz$/i', $file_name ) );

		$content_to_sanitize = $raw_content;
		if ( $is_gzipped && function_exists( 'gzdecode' ) ) {
			$decompressed = @gzdecode( $raw_content );
			if ( false !== $decompressed && is_string( $decompressed ) ) {
				$content_to_sanitize = $decompressed;
			}
		}

		// Normalize encodings (UTF-16LE, UTF-16BE, UTF-32, BOMs) to UTF-8 before sanitizing
		$content_to_sanitize = $this->normalize_content_for_svg_inspection( $content_to_sanitize );

		$svg_sanitizer = new enshrined\svgSanitize\Sanitizer();
		$sanitized     = $svg_sanitizer->sanitize( $content_to_sanitize );

		// Sanitiser returns false or empty on hard failure — never leave the original XSS payload.
		if ( false === $sanitized || null === $sanitized ) {
			$sanitized = '';
		}

		if ( $is_gzipped && function_exists( 'gzencode' ) && '' !== $sanitized ) {
			$sanitized = gzencode( $sanitized );
		}

		file_put_contents( $file_path, $sanitized );
	}

	/**
	 * Intercept search command to handle content search tag parameter
	 * This hook is called before the search command executes
	 */
	public function on_search_command( $cmd, &$args, $elfinder, $volume ) {
		if ( $cmd !== 'search' ) {
			return;
		}

		// Recover dropped keys (e.g. PHP max_input_vars on huge mimes[] payloads).
		if ( ( ! isset( $args['type'] ) || $args['type'] === '' ) && isset( $_POST['type'] ) && ! is_array( $_POST['type'] ) ) {
			$args['type'] = sanitize_text_field( wp_unslash( $_POST['type'] ) );
		}
		if ( ( ! isset( $args['q'] ) || $args['q'] === '' ) && isset( $_POST['q'] ) && is_string( $_POST['q'] ) ) {
			$args['q'] = wp_unslash( $_POST['q'] );
		}

		$type = isset( $args['type'] ) ? (string) $args['type'] : '';
		if ( strcasecmp( $type, 'SearchTag' ) === 0 ) {
			$type         = 'SearchTag';
			$args['type'] = 'SearchTag';
		}

		$q_raw = isset( $args['q'] ) ? $args['q'] : '';
		if ( is_array( $q_raw ) ) {
			$q_raw = reset( $q_raw );
		}
		$q = trim( (string) $q_raw );

		// Content search: type is SearchTag and/or q contains our marker (case-insensitive prefix — some stacks alter case).
		$tag = '';
		if ( preg_match( '/^__CONTENT_SEARCH__:(.*)$/is', $q, $m ) ) {
			$tag = trim( (string) $m[1] );
		} elseif ( $type === 'SearchTag' && $q !== '' ) {
			$tag = $q;
		}

		if ( $type === 'SearchTag' || ( $q !== '' && preg_match( '/^__CONTENT_SEARCH__:/is', $q ) ) ) {
			if ( $tag !== '' ) {
				elFinderVolumefma_local_filesystem::setContentSearchTag( $tag );
				$args['q'] = '';
			} else {
				elFinderVolumefma_local_filesystem::setContentSearchTag( '' );
			}
		} else {
			// If another listener runs after us, q may already be cleared while the tag is still set — do not wipe it.
			$existing = elFinderVolumefma_local_filesystem::getContentSearchTag();
			if ( $existing !== '' && $existing !== null && $q === '' && strcasecmp( (string) $type, 'SearchName' ) === 0 ) {
				return;
			}
			elFinderVolumefma_local_filesystem::setContentSearchTag( '' );
		}
	}

	/**
	 * Filter blocked integrations for admin file manager roots.
	 *
	 * @param array $opts
	 * @param array $blocked_integrations
	 * @return array
	 */
	private function filter_blocked_integrations_admin( $opts, $blocked_integrations = array() ) {
		if ( empty( $blocked_integrations ) || ! isset( $opts['roots'] ) || ! is_array( $opts['roots'] ) ) {
			return $opts;
		}

		$integration_identifiers = array(
			'dropbox'      => array( 'driver' => 'Dropbox2' ),
			'googledrive'  => array( 'driver' => 'GoogleDrive' ),
			'onedrive'     => array( 'driver' => 'OneDrive' ),
			'amazonses'    => array( 'driver' => 'AwsS3Flysystem', 'csscls' => 'amazons3-icon' ),
			'github'       => array( 'driver' => 'GitHub' ),
			'googlecloud'  => array( 'driver' => 'AFMGoogleCloud', 'csscls' => 'googlecloud-icon', 'alt_driver' => 'Flysystem' ),
			'pcloud'       => array( 'driver' => 'Flysystem', 'icon_contains' => 'pcloud' ),
			'cloudflarer2' => array( 'driver' => 'AwsS3Flysystem', 'csscls' => 'cloudflarer2-icon' ),
			'wasabi'       => array( 'driver' => 'AwsS3Flysystem', 'csscls' => 'wasabi-icon' ),
		);

		$filtered_roots = array();
		foreach ( $opts['roots'] as $root ) {
			$driver = isset( $root['driver'] ) ? trim( $root['driver'] ) : '';

			// Always include local/trash roots.
			if ( $driver === 'fma_local_filesystem' || $driver === 'LocalFileSystem' || $driver === 'Trash' || $driver === '' ) {
				$filtered_roots[] = $root;
				continue;
			}

			$integration_blocked = false;
			foreach ( $integration_identifiers as $integration_key => $identifiers ) {
				if ( ! in_array( $integration_key, $blocked_integrations, true ) ) {
					continue;
				}

				$expected_driver = $identifiers['driver'];
				$driver_match    = ( $driver === $expected_driver );
				if ( ! $driver_match && ! empty( $identifiers['alt_driver'] ) ) {
					$driver_match = ( $driver === $identifiers['alt_driver'] );
				}

				if ( isset( $identifiers['csscls'] ) ) {
					$csscls_match = isset( $root['csscls'] ) && trim( $root['csscls'] ) === $identifiers['csscls'];
					if ( $driver_match && $csscls_match ) {
						$integration_blocked = true;
						break;
					}
				} elseif ( isset( $identifiers['icon_contains'] ) ) {
					$icon = isset( $root['icon'] ) ? $root['icon'] : '';
					if ( $driver_match && is_string( $icon ) && strpos( $icon, $identifiers['icon_contains'] ) !== false ) {
						$integration_blocked = true;
						break;
					}
				} elseif ( $driver_match ) {
					$integration_blocked = true;
					break;
				}
			}

			if ( ! $integration_blocked ) {
				$filtered_roots[] = $root;
			}
		}

		$opts['roots'] = $filtered_roots;
		return $opts;
	}
}
/**
 * Hook to fix invalid and malicious files
 */
function afm_plugin_file_validName( $name ) {

	if ( ! empty( $name ) ) {
		// Check for dangerous characters (but allow spaces)
		// Block characters that could be used for path traversal or command injection
		if ( preg_match( '/[<>:"|?*\x00-\x1F]/', $name ) ) {
			return false;
		}

		// Block files starting with dot (except for special cases handled elsewhere)
		if ( strpos( $name, '.' ) === 0 && $name !== '.' && $name !== '..' ) {
			return false;
		}

		$lower_name = strtolower( $name );
		$cmd        = '';
		if ( isset( $_REQUEST['cmd'] ) ) {
			$cmd = sanitize_text_field( wp_unslash( $_REQUEST['cmd'] ) );
		} elseif ( isset( $_POST['cmd'] ) ) {
			$cmd = sanitize_text_field( wp_unslash( $_POST['cmd'] ) );
		}

		// AFM-995 / AFM-989: archive always appends a safe archive extension server-side.
		// Accept the client-provided base name (e.g. "abc.php") so nameAccepted does not
		// reject before ".zip" is added — that was causing a false Permission denied
		// after the zip was still written, or INVALID_NAME on archive of PHP files.
		if ( 'archive' === $cmd ) {
			return true;
		}

		// AFM-989: allow duplicating / pasting existing PHP (copy of already-visible files).
		// Upload / extract / mkfile of PHP stay blocked below.
		if ( in_array( $cmd, array( 'duplicate', 'paste' ), true ) ) {
			if ( preg_match( '/\.(php\d?|phtml)$/i', $lower_name ) ) {
				return true;
			}
		}

		// Block dangerous file extensions (substring check — reject .php.bak etc.)
		if (
			strpos( $lower_name, '.php' ) !== false
			|| strpos( $lower_name, '.phtml' ) !== false
			|| strpos( $lower_name, '.ini' ) !== false
			|| strpos( $lower_name, '.htaccess' ) !== false
			|| strpos( $lower_name, '.config' ) !== false
			|| strpos( $lower_name, '.css' ) !== false
			|| strpos( $lower_name, '.js' ) !== false
		) {
			return false;
		}

		// Filename is valid (allows spaces)
		return true;
	}

	return false;
}
function access( $attr, $path, $data, $volume, $isDir, $relpath ) {
	$basename = basename( $path );
	//skipping htaccess
	if ( $basename == '.htaccess' ) {
		return null;
	} else {
		// Check display_dot_files setting
		$settings          = get_option( 'fmaoptions' );
		$display_dot_files = isset( $settings['display_dot_files'] ) ? absint( $settings['display_dot_files'] ) : 0;

		// If display_dot_files is 1 (hide dot files), hide them
		// If display_dot_files is 0 (show dot files), allow them
		if ( $basename[0] === '.' && strlen( $relpath ) !== 1 ) {
			if ( $display_dot_files == 1 ) {
				// Hide dot files: set read+write to false
				return ! ( $attr == 'read' || $attr == 'write' );
			} else {
				// Show dot files: allow access
				return null;
			}
		}
		return null;   // else elFinder decide it itself
	}
}
