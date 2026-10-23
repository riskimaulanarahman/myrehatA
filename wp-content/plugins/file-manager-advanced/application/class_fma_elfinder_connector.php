<?php
/**
 * elFinder connector wrapper — safe streaming without editing vendor library.
 *
 * @package File_Manager_Advanced
 */

if ( class_exists( 'fma_elFinderConnector' ) ) {
	return;
}

if ( ! function_exists( 'fma_elfinder_passthru' ) ) {
	/**
	 * Stream handle to output; fread fallback when fpassthru is disabled.
	 *
	 * @param resource $handle
	 * @return int
	 */
	function fma_elfinder_passthru( $handle ) {
		if ( function_exists( 'fpassthru' ) ) {
			$bytes = fpassthru( $handle );
			return is_int( $bytes ) ? $bytes : 0;
		}
		if ( ! is_resource( $handle ) ) {
			return 0;
		}
		$bytes = 0;
		while ( ! feof( $handle ) ) {
			$chunk = fread( $handle, 8192 );
			if ( $chunk === false ) {
				break;
			}
			$bytes += strlen( $chunk );
			echo $chunk; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		}
		return $bytes;
	}
}

if ( ! function_exists( 'fma_elfinder_stream_copy_to_stream' ) ) {
	/**
	 * Copy stream bytes with fread/fwrite fallback.
	 *
	 * @param resource $from
	 * @param resource $to
	 * @param int      $length
	 * @param int      $offset
	 * @return int|false
	 */
	function fma_elfinder_stream_copy_to_stream( $from, $to, $length = 0, $offset = 0 ) {
		if ( function_exists( 'stream_copy_to_stream' ) ) {
			return stream_copy_to_stream( $from, $to, $length, $offset );
		}
		if ( $offset > 0 && is_resource( $from ) ) {
			fseek( $from, $offset );
		}
		$bytes   = 0;
		$to_read = (int) $length;
		while ( is_resource( $from ) && ! feof( $from ) && ( $to_read <= 0 || $bytes < $to_read ) ) {
			$chunk_size = ( $to_read <= 0 ) ? 8192 : min( 8192, $to_read - $bytes );
			$chunk      = fread( $from, $chunk_size );
			if ( $chunk === false || $chunk === '' ) {
				break;
			}
			$written = fwrite( $to, $chunk );
			if ( $written === false ) {
				return false;
			}
			$bytes += $written;
		}
		return $bytes;
	}
}

/**
 * Connector subclass: only overrides binary streaming for disabled fpassthru hosts.
 */
class fma_elFinderConnector extends elFinderConnector {

	/**
	 * Allow one internal put from fma_save_php_file (capability already checked).
	 * elFinder 2.1.69 CSRF requires a browser header that internal PHP calls cannot send.
	 *
	 * @var bool
	 */
	public static $allow_internal_put = false;

	/**
	 * WordPress slashes $_POST; elFinder's parent filter only stripslashes when
	 * magic_quotes_gpc is on (removed in PHP 5.4+). Apply wp_unslash on scalar
	 * values only — parent recurses arrays via $this->input_filter(), so unslashing
	 * the full array again would double-strip put content (\" becomes ").
	 *
	 * @param mixed $args Request argument or array of arguments.
	 * @return mixed
	 */
	protected function input_filter( $args ) {
		if ( is_array( $args ) ) {
			return parent::input_filter( $args );
		}

		$args = parent::input_filter( $args );

		return function_exists( 'wp_unslash' ) ? wp_unslash( $args ) : $args;
	}

	/**
	 * AFM-966: Serve folder ZIP via a short-lived public uploads URL.
	 * Streaming zipdl through admin-ajax FastCGI fails on Local/nginx
	 * ("upstream prematurely closed" → Chrome "Site wasn't available").
	 *
	 * @param array $data elFinder output payload with open pointer.
	 * @return bool True when redirect was sent.
	 */
	protected function redirect_zipdl_to_public_file( array $data ) {
		$fp   = $data['pointer'];
		$meta = is_resource( $fp ) ? @stream_get_meta_data( $fp ) : array();
		$src  = ( is_array( $meta ) && ! empty( $meta['uri'] ) ) ? $meta['uri'] : '';

		$name = 'download.zip';
		if ( ! empty( $data['header'] ) && is_array( $data['header'] ) ) {
			foreach ( $data['header'] as $header_line ) {
				$header_line = (string) $header_line;
				if ( preg_match( "/filename\\*=UTF-8''([^;\\s]+)/i", $header_line, $m ) ) {
					$name = rawurldecode( $m[1] );
					break;
				}
				if ( preg_match( '/filename="([^"]+)"/i', $header_line, $m ) ) {
					$name = $m[1];
					break;
				}
			}
		}

		if ( is_resource( $fp ) ) {
			fclose( $fp );
		}

		if ( $src === '' || ! is_readable( $src ) ) {
			return false;
		}

		if ( ! function_exists( 'wp_upload_dir' ) ) {
			return false;
		}

		$upload = wp_upload_dir();
		if ( ! empty( $upload['error'] ) || empty( $upload['basedir'] ) || empty( $upload['baseurl'] ) ) {
			return false;
		}

		$dir = trailingslashit( $upload['basedir'] ) . 'afm-zipdl';
		if ( ! wp_mkdir_p( $dir ) ) {
			return false;
		}

		$index = trailingslashit( $dir ) . 'index.php';
		if ( ! file_exists( $index ) ) {
			file_put_contents( $index, "<?php\n// Silence is golden.\n" );
		}

		$this->cleanup_afm_zipdl_dir( $dir );

		$safe_name = sanitize_file_name( $name );
		if ( $safe_name === '' ) {
			$safe_name = 'download.zip';
		}

		try {
			$token = bin2hex( random_bytes( 8 ) );
		} catch ( Exception $e ) {
			$token = substr( md5( uniqid( (string) mt_rand(), true ) ), 0, 16 );
		}

		$dest_name = $token . '-' . $safe_name;
		$dest      = trailingslashit( $dir ) . $dest_name;

		if ( ! @copy( $src, $dest ) || ! is_readable( $dest ) ) {
			return false;
		}

		@unlink( $src );

		$url = trailingslashit( $upload['baseurl'] ) . 'afm-zipdl/' . rawurlencode( $dest_name );
		// AFM-966: Local often stores uploads as http:// while the UI is https:// —
		// Chrome then blocks the download ("File wasn't available on site").
		if ( function_exists( 'set_url_scheme' ) ) {
			$scheme = ( function_exists( 'is_ssl' ) && is_ssl() ) ? 'https' : null;
			if ( $scheme === null && ! empty( $_SERVER['HTTP_X_FORWARDED_PROTO'] ) ) {
				$scheme = ( strtolower( (string) $_SERVER['HTTP_X_FORWARDED_PROTO'] ) === 'https' ) ? 'https' : 'http';
			}
			if ( $scheme === null && ! empty( $_SERVER['REQUEST_SCHEME'] ) ) {
				$scheme = strtolower( (string) $_SERVER['REQUEST_SCHEME'] ) === 'https' ? 'https' : 'http';
			}
			if ( $scheme ) {
				$url = set_url_scheme( $url, $scheme );
			}
		}

		while ( ob_get_level() && ob_end_clean() ) {
		}

		if ( function_exists( 'nocache_headers' ) ) {
			nocache_headers();
		}

		if ( function_exists( 'wp_redirect' ) ) {
			wp_redirect( $url, 302 );
			exit;
		}

		header( 'Location: ' . $url, true, 302 );
		exit;
	}

	/**
	 * Delete afm-zipdl files older than one hour.
	 *
	 * @param string $dir Absolute directory path.
	 * @return void
	 */
	protected function cleanup_afm_zipdl_dir( $dir ) {
		$dir = trailingslashit( $dir );
		$files = glob( $dir . '*' );
		if ( ! is_array( $files ) ) {
			return;
		}
		$expire = time() - ( defined( 'HOUR_IN_SECONDS' ) ? HOUR_IN_SECONDS : 3600 );
		foreach ( $files as $file ) {
			$base = basename( $file );
			if ( $base === 'index.php' || $base === '.' || $base === '..' ) {
				continue;
			}
			if ( is_file( $file ) && filemtime( $file ) < $expire ) {
				@unlink( $file );
			}
		}
	}

	/**
	 * @param array $data
	 * @return void
	 */
	protected function output( array $data ) {
		if ( ! isset( $data['pointer'] ) ) {
			parent::output( $data );
			return;
		}

		try {
			$session = $this->elFinder->getSession();
			if ( $session && method_exists( $session, 'close' ) ) {
				$session->close();
			}
		} catch ( Throwable $e ) {
		}
		// AFM-966: keep streaming when the browser switches to its download manager
		// (iframe/GET attachment aborts otherwise → nginx "upstream prematurely closed").
		ignore_user_abort( true );

		$cmd = '';
		if ( isset( $_REQUEST['cmd'] ) && ! is_array( $_REQUEST['cmd'] ) ) {
			$cmd = sanitize_text_field( wp_unslash( $_REQUEST['cmd'] ) );
		}
		// AFM-966: zipdl binary stream via FastCGI dies on Local; redirect to uploads instead.
		if ( $cmd === 'zipdl' && ! empty( $_REQUEST['download'] ) ) {
			$this->redirect_zipdl_to_public_file( $data ); // exits on success
			status_header( 500 );
			header( 'Content-Type: text/plain; charset=utf-8' );
			echo 'ZIP download failed.';
			exit;
		}

		if ( $this->header ) {
			self::sendHeader( $this->header );
		}

		elFinder::extendTimeLimit( 0 );

		if ( ! empty( $data['header'] ) ) {
			// Connection: close from zipdl confuses FastCGI/nginx on Local.
			if ( is_array( $data['header'] ) ) {
				$data['header'] = array_values(
					array_filter(
						$data['header'],
						static function ( $h ) {
							return stripos( (string) $h, 'Connection:' ) !== 0;
						}
					)
				);
			}
			self::sendHeader( $data['header'] );
		}

		while ( ob_get_level() && ob_end_clean() ) {
		}

		$toEnd    = true;
		$fp       = $data['pointer'];
		$sendData = ! ( $this->reqMethod === 'HEAD' || ! empty( $data['info']['xsendfile'] ) );
		$psize    = null;

		if ( ( $this->reqMethod === 'GET' || ! $sendData )
			&& ( elFinder::isSeekableStream( $fp ) || elFinder::isSeekableUrl( $fp ) )
			&& ( array_search( 'Accept-Ranges: none', headers_list(), true ) === false ) ) {
			header( 'Accept-Ranges: bytes' );
			if ( ! empty( $_SERVER['HTTP_RANGE'] ) ) {
				$size = $data['info']['size'];
				$end  = $size - 1;
				if ( preg_match( '/bytes=(\d*)-(\d*)(,?)/i', $_SERVER['HTTP_RANGE'], $matches ) ) {
					if ( empty( $matches[3] ) ) {
						if ( empty( $matches[1] ) && $matches[1] !== '0' ) {
							$start = $size - $matches[2];
						} else {
							$start = intval( $matches[1] );
							if ( ! empty( $matches[2] ) ) {
								$end   = intval( $matches[2] );
								if ( $end >= $size ) {
									$end = $size - 1;
								}
								$toEnd = ( $end === ( $size - 1 ) );
							}
						}
						$psize = $end - $start + 1;

						header( 'HTTP/1.1 206 Partial Content' );
						header( 'Content-Length: ' . $psize );
						header( 'Content-Range: bytes ' . $start . '-' . $end . '/' . $size );

						if ( isset( $data['info']['xsendfile'] ) && strtolower( $data['info']['xsendfile'] ) === 'x-sendfile' ) {
							if ( function_exists( 'header_remove' ) ) {
								header_remove( $data['info']['xsendfile'] );
							} else {
								header( $data['info']['xsendfile'] . ':' );
							}
							unset( $data['info']['xsendfile'] );
							if ( $this->reqMethod !== 'HEAD' ) {
								$sendData = true;
							}
						}

						$sendData && ! elFinder::isSeekableUrl( $fp ) && fseek( $fp, $start );
					}
				}
			}
			if ( $sendData && is_null( $psize ) ) {
				elFinder::rewind( $fp );
			}
		} else {
			header( 'Accept-Ranges: none' );
			if ( isset( $data['info'] ) && ! $data['info']['size'] ) {
				if ( function_exists( 'header_remove' ) ) {
					header_remove( 'Content-Length' );
				} else {
					header( 'Content-Length:' );
				}
			}
		}

		if ( $sendData ) {
			if ( $toEnd || elFinder::isSeekableUrl( $fp ) ) {
				if ( version_compare( PHP_VERSION, '5.6', '<' ) ) {
					file_put_contents( 'php://output', $fp );
				} elseif ( function_exists( 'fma_elfinder_passthru' ) ) {
					fma_elfinder_passthru( $fp );
				} elseif ( function_exists( 'fpassthru' ) ) {
					fpassthru( $fp );
				} else {
					while ( ! feof( $fp ) ) {
						$chunk = fread( $fp, 8192 );
						if ( $chunk === false || $chunk === '' ) {
							break;
						}
						echo $chunk; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
					}
				}
			} else {
				$out = fopen( 'php://output', 'wb' );
				fma_elfinder_stream_copy_to_stream( $fp, $out, $psize );
				fclose( $out );
			}
		}

		if ( ! empty( $data['volume'] ) ) {
			$data['volume']->close( $fp, $data['info']['hash'] );
		} else {
			fclose( $fp );
		}
		exit();
	}

	/**
	 * @return bool
	 */
	protected function validateCsrfToken() {
		if ( self::$allow_internal_put ) {
			return true;
		}
		return parent::validateCsrfToken();
	}
}
