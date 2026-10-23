<?php
/**
 * @package: File Manager Advanced
 * @Class: elFinderVolumefma_local_filesystem
 * Custom LocalFileSystem driver with content search support
 * This extends elFinderVolumeLocalFileSystem without modifying library files
 */
if ( class_exists( 'elFinderVolumefma_local_filesystem' ) ) {
	return;
}

if ( defined( 'FMAFILEPATH' ) ) {
	require_once FMAFILEPATH . 'application/library/php/elFinderVolumeLocalFileSystem.class.php';
} else {
	require_once dirname( __FILE__ ) . '/library/php/elFinderVolumeLocalFileSystem.class.php';
}

class elFinderVolumefma_local_filesystem extends elFinderVolumeLocalFileSystem {

	/**
	 * Store tag for content search
	 *
	 * @var string
	 */
	protected $contentSearchTag = '';

	/**
	 * Override search to handle content-based search via type parameter.
	 * We completely override parent search to ensure doSearch is called for content searches.
	 *
	 * @param string $q
	 * @param array  $mimes
	 * @param string $hash
	 * @param string $type
	 *
	 * @return array
	 */
	public function search( $q, $mimes, $hash = null, $type = null ) {
		$this->contentSearchTag = '';
		$tagFromHook            = self::getContentSearchTag();

		if ( empty( $tagFromHook ) && is_string( $q ) && preg_match( '/^__CONTENT_SEARCH__:(.*)$/is', $q, $m ) ) {
			$tagFromHook = trim( (string) $m[1] );
			$q           = '';
		}
		if ( empty( $tagFromHook ) && $type === 'SearchTag' && $q !== '' && $q !== 'CONTENTSEARCHPLACEHOLDER' ) {
			$tagFromHook = $q;
		}

		$isContentSearch = ( $type === 'SearchTag' || ( $tagFromHook !== '' && $tagFromHook !== false && $tagFromHook !== null ) );

		if ( $isContentSearch ) {
			$this->contentSearchTag = $tagFromHook;
			// Content search should not be blocked by incoming mimes[] filters.
			$mimes = array();
			if ( $q === '' ) {
				$q = 'CONTENTSEARCHPLACEHOLDER';
			}
		}

		// Start of parent search logic (from elFinderVolumeDriver.class.php).
		$res         = array();
		$matchMethod = empty( $type ) ? 'searchMatchName' : 'searchMatch' . $type;
		if ( ! method_exists( $this, $matchMethod ) ) {
			$matchMethod = 'searchMatchName';
		}

		$dir = null;
		if ( $hash ) {
			$dir  = $this->decode( $hash );
			$stat = $this->stat( $dir );
			$is_dir_mime = $stat && isset( $stat['mime'] ) && in_array( $stat['mime'], array( 'directory', 'inode/directory' ), true );
			if ( ! $stat || ! $is_dir_mime || ! $stat['read'] ) {
				$q = '';
			}
		}
		if ( $mimes && $this->onlyMimes ) {
			$mimes = array_intersect( $mimes, $this->onlyMimes );
			if ( ! $mimes ) {
				$q = '';
			}
		}
		$this->searchStart = time();

		$qs      = preg_split( '/\"([^\"]+)\"| +/', $q, -1, PREG_SPLIT_NO_EMPTY | PREG_SPLIT_DELIM_CAPTURE );
		$query   = array();
		$excludes = array();
		foreach ( $qs as $_q ) {
			$_q = trim( $_q );
			if ( $_q !== '' ) {
				if ( $_q[0] === '-' ) {
					if ( isset( $_q[1] ) ) {
						$excludes[] = substr( $_q, 1 );
					}
				} else {
					$query[] = $_q;
				}
			}
		}

		// For content search, ensure we don't return early even if query is empty.
		if ( ! $query && ! $isContentSearch ) {
			$q = '';
		} else {
			if ( $query ) {
				$q = join( ' ', $query );
			} else {
				// For content search, keep q as placeholder so doSearch is called.
				$q = 'CONTENTSEARCHPLACEHOLDER';
			}
			$this->doSearchCurrentQuery = array(
				'q'           => $q,
				'excludes'    => $excludes,
				'matchMethod' => $matchMethod,
			);
			if ( $isContentSearch ) {
				$this->doSearchCurrentQuery['type'] = 'SearchTag';
			}
		}

		if ( ( $q === '' && ! $isContentSearch ) || $this->commandDisabled( 'search' ) ) {
			return $res;
		}

		// validated regex $this->options['searchExDirReg'].
		if ( $this->options['searchExDirReg'] ) {
			if ( false === preg_match( $this->options['searchExDirReg'], '' ) ) {
				$this->options['searchExDirReg'] = '';
			}
		}

		// check the leaf root too.
		if ( ! $mimes && ( is_null( $dir ) || $dir == $this->root ) ) {
			$rootStat = $this->stat( $this->root );
			if ( ! empty( $rootStat['phash'] ) ) {
				if ( $isContentSearch || $this->stripos( $rootStat['name'], $q ) !== false ) {
					$res = array( $rootStat );
				}
			}
		}

		$result = array_merge( $res, $this->doSearch( is_null( $dir ) ? $this->root : $dir, $q, $mimes ) );
		return $result;
	}

	/**
	 * Static storage for content search tag (set by bind hook)
	 *
	 * @var string
	 */
	protected static $contentSearchTagStorage = '';

	public static function setContentSearchTag( $tag ) {
		self::$contentSearchTagStorage = $tag;
	}

	public static function getContentSearchTag() {
		return self::$contentSearchTagStorage;
	}

	/**
	 * Override doSearch to implement content-based search
	 */
	protected function doSearch( $path, $q, $mimes ) {
		$result      = array();
		$matchMethod = empty( $this->doSearchCurrentQuery['matchMethod'] ) ? 'searchMatchName' : $this->doSearchCurrentQuery['matchMethod'];
		$timeout     = $this->options['searchTimeout'] ? $this->searchStart + $this->options['searchTimeout'] : 0;
		if ( $timeout && $timeout < time() ) {
			$this->setError( elFinder::ERROR_SEARCH_TIMEOUT, $this->path( $this->encode( $path ) ) );
			return $result;
		}

		$tag = '';
		if ( ! empty( $this->contentSearchTag ) ) {
			$tag = $this->contentSearchTag;
		} else {
			$tag = self::getContentSearchTag();
		}

		$qInQuery       = ! empty( $this->doSearchCurrentQuery['q'] ) ? $this->doSearchCurrentQuery['q'] : $q;
		$isPlaceholderQ = ( $qInQuery === 'CONTENTSEARCHPLACEHOLDER' || $qInQuery === '' || trim( $qInQuery ) === '' );
		$searchType     = ! empty( $this->doSearchCurrentQuery['type'] ) ? $this->doSearchCurrentQuery['type'] : '';

		$hasTag          = ( $tag !== '' && $tag !== null && $tag !== false );
		$isContentSearch = false;

		if ( $hasTag ) {
			if ( $isPlaceholderQ || $searchType === 'SearchTag' ) {
				$isContentSearch = true;
				if ( ! isset( $this->doSearchCurrentQuery['type'] ) ) {
					$this->doSearchCurrentQuery['type'] = 'SearchTag';
				}
			}
		}

		foreach ( $this->scandirCE( $path ) as $p ) {
			elFinder::extendTimeLimit( $this->options['searchTimeout'] + 30 );

			if ( $timeout && ( $this->error || $timeout < time() ) ) {
				! $this->error && $this->setError( elFinder::ERROR_SEARCH_TIMEOUT, $this->path( $this->encode( $path ) ) );
				break;
			}

			$stat = $this->stat( $p );
			if ( ! $stat ) {
				continue;
			}

			if ( ! empty( $stat['hidden'] ) ) {
				continue;
			}
			if ( ! $isContentSearch && ! $this->mimeAccepted( $stat['mime'], $mimes ) ) {
				continue;
			}

			$name = $stat['name'];

			if ( $this->doSearchCurrentQuery['excludes'] ) {
				foreach ( $this->doSearchCurrentQuery['excludes'] as $exc ) {
					if ( $exc && $this->$matchMethod( $name, $exc ) ) {
						continue 2;
					}
				}
			}

			$matched = false;
			if ( $isContentSearch && $hasTag ) {
				$matched = $this->searchMatchSearchTag( $p, $tag, $stat );
			} else {
				$matched = $this->$matchMethod( $name, $q );
			}

			if ( $matched ) {
				$result[] = $stat;
			}

			if ( in_array( $stat['mime'], array( 'directory', 'inode/directory' ), true ) && $stat['read'] ) {
				if ( $this->options['searchExDirReg'] && preg_match( $this->options['searchExDirReg'], $stat['name'] ) ) {
					continue;
				}
				$result = array_merge( $result, $this->doSearch( $p, $q, $mimes ) );
			}
		}

		return $result;
	}

	/**
	 * Whether a file is likely readable text/code for content search (MIME can be wrong on Windows/IIS).
	 *
	 * @param string $mime Reported MIME.
	 * @param string $path Absolute or relative path for extension fallback.
	 * @return bool
	 */
	protected function isContentSearchableFile( $mime, $path, $size = null ) {
		$mime = is_string( $mime ) ? strtolower( trim( $mime ) ) : '';

		if ( $mime === 'directory' || $mime === 'inode/directory' ) {
			return false;
		}

		// Local / Windows often mis-detect UTF-8 or PHP as octet-stream; still try small files.
		if ( in_array( $mime, array( 'application/octet-stream', 'application/x-empty' ), true ) ) {
			if ( null !== $size && $size > 0 && $size <= 5 * 1024 * 1024 ) {
				return true;
			}
		}

		$ext = strtolower( pathinfo( (string) $path, PATHINFO_EXTENSION ) );
		// Common source / config extensions when finfo returns generic or wrong types.
		$text_exts = array(
			'php', 'phtml', 'php3', 'php4', 'php5', 'phps', 'inc',
			'js', 'mjs', 'cjs', 'ts', 'jsx', 'tsx', 'vue', 'svelte',
			'css', 'scss', 'sass', 'less',
			'html', 'htm', 'xhtml', 'xml', 'svg', 'txt', 'text', 'md', 'markdown', 'rst',
			'json', 'yml', 'yaml', 'toml', 'ini', 'cfg', 'conf', 'env', 'dist', 'properties',
			'sql', 'sh', 'bash', 'zsh', 'ps1', 'bat', 'cmd',
			'java', 'c', 'h', 'cc', 'cpp', 'hpp', 'cs', 'go', 'rs', 'rb', 'pl', 'py', 'lua',
			'htaccess', 'gitignore', 'editorconfig', 'log',
		);
		if ( $ext !== '' && in_array( $ext, $text_exts, true ) ) {
			return true;
		}

		if ( $mime === '' ) {
			return false;
		}
		if ( strpos( $mime, 'text/' ) === 0 ) {
			return true;
		}
		$application_text = array(
			'application/json',
			'application/xml',
			'application/javascript',
			'application/x-javascript',
			'application/ecmascript',
			'application/x-php',
			'application/x-httpd-php',
			'application/php',
			'application/xml-dtd',
			'application/x-yaml',
			'application/sql',
			'application/graphql',
		);
		if ( in_array( $mime, $application_text, true ) ) {
			return true;
		}
		// e.g. application/xhtml+xml, application/ld+json
		if ( preg_match( '#^application/.+\+(?:json|xml|javascript)\b#i', $mime ) ) {
			return true;
		}

		return false;
	}

	/**
	 * Match method for SearchTag content search.
	 * Scans file content for the provided tag.
	 */
	protected function searchMatchSearchTag( $path, $tag, $stat = null ) {
		if ( null === $tag || false === $tag || (string) $tag === '' ) {
			return false;
		}

		$stat = $stat ? $stat : $this->stat( $path );
		if ( ! $stat ) {
			return false;
		}
		$smime = isset( $stat['mime'] ) ? (string) $stat['mime'] : '';
		if ( $smime === 'directory' || $smime === 'inode/directory' ) {
			return false;
		}

		// Limit search to reasonably sized text files.
		$max = 1024 * 1024 * 5; // 5MB
		if ( isset( $stat['size'] ) && $stat['size'] > $max ) {
			return false;
		}

		$mime = isset( $stat['mime'] ) ? $stat['mime'] : '';
		$fsize = isset( $stat['size'] ) ? (int) $stat['size'] : null;
		if ( ! $this->isContentSearchableFile( $mime, $path, $fsize ) ) {
			return false;
		}

		// $path comes from scandirCE() and is already a real filesystem path.
		// NOTE: elFinderVolumeDriver::realpath() expects a HASH, not a path.
		$realPath = $path;
		if ( ! is_string( $realPath ) || ! is_file( $realPath ) || ! is_readable( $realPath ) ) {
			return false;
		}

		$content = @file_get_contents( $realPath );
		if ( false === $content ) {
			return false;
		}

		return ( stripos( $content, $tag ) !== false );
	}

	/**
	 * Skip hidden items when scanning children for paste/move pre-checks.
	 *
	 * elFinder's copy() loop already ignores hidden files, but paste() calls
	 * closest('read', false) first and walks every child — including hidden
	 * .htaccess (read=false when "Display .htaccess?" is off). That blocked
	 * entire folder copy with "Permission denied".
	 *
	 * Exception: when looking for locked=true (rm safety), do NOT skip
	 * hidden items — restricted hidden files must still block recursive delete.
	 * Visible PHP (AFM-989) is locked (padlock) but still duplicatable/archivable.
	 *
	 * @param string $path Directory path.
	 * @param string $attr Attribute name.
	 * @param bool   $val  Attribute value to match.
	 * @return string|false
	 */
	protected function childsByAttr( $path, $attr, $val ) {
		foreach ( $this->scandirCE( $path ) as $p ) {
			$stat = $this->stat( $p );
			if ( 'locked' !== $attr && ! empty( $stat['hidden'] ) ) {
				continue;
			}
			if ( ( $_p = $this->closestByAttr( $p, $attr, $val ) ) != false ) {
				return $_p;
			}
		}
		return false;
	}

	/**
	 * AFM-989: PHP attrs set write:false, so stock allowCreate() rejects creating
	 * "abc copy.php" on duplicate/paste (same-folder Copy uses duplicate).
	 *
	 * Parent-dir write is enough. Do NOT re-enter nameAccepted()/validName here —
	 * duplicate() never calls nameAccepted itself, and validName would block PHP
	 * when cmd detection fails. mkfile/upload still blocked by nameAccepted +
	 * uploadDeny; edit stays blocked by write:false on the existing file.
	 *
	 * @param string    $dir   Parent directory path.
	 * @param string    $name  New file/dir name.
	 * @param bool|null $isDir Whether creating a directory.
	 * @return bool
	 */
	protected function allowCreate( $dir, $name, $isDir = null ) {
		if ( ! $isDir && preg_match( '/\.(php\d?|phtml)$/i', (string) $name ) ) {
			$parent = $this->stat( $dir );
			return ! empty( $parent['write'] );
		}

		return parent::allowCreate( $dir, $name, $isDir );
	}

	/**
	 * AFM-989: paste/duplicate of existing PHP must not be blocked by uploadDeny mimes.
	 * Upload / mkfile / put still deny PHP via nameAccepted + uploadDeny on those cmds.
	 *
	 * @param string $mime MIME type.
	 * @return bool
	 */
	protected function allowPutMime( $mime ) {
		$cmd = '';
		if ( isset( $_REQUEST['cmd'] ) ) {
			$cmd = sanitize_text_field( wp_unslash( $_REQUEST['cmd'] ) );
		} elseif ( isset( $_POST['cmd'] ) ) {
			$cmd = sanitize_text_field( wp_unslash( $_POST['cmd'] ) );
		}

		if ( in_array( $cmd, array( 'paste', 'duplicate' ), true ) && is_string( $mime ) && stripos( $mime, 'php' ) !== false ) {
			return true;
		}

		return parent::allowPutMime( $mime );
	}

	/**
	 * Fix session-cached archivers that still use deprecated array('self', ...).
	 * PHP 8.2+ prints a deprecation that corrupts elFinder JSON (errDataNotJSON).
	 *
	 * @return void
	 */
	protected function _checkArchivers() {
		parent::_checkArchivers();
		$this->afm_normalize_phpfunction_archivers();
	}

	/**
	 * Replace archiver argc "self" with a real class name.
	 *
	 * @return void
	 */
	protected function afm_normalize_phpfunction_archivers() {
		foreach ( array( 'create', 'extract' ) as $type ) {
			if ( empty( $this->archivers[ $type ] ) || ! is_array( $this->archivers[ $type ] ) ) {
				continue;
			}
			foreach ( $this->archivers[ $type ] as $mime => $conf ) {
				if ( empty( $conf['cmd'] ) || 'phpfunction' !== $conf['cmd'] ) {
					continue;
				}
				if ( empty( $conf['argc'] ) || ! is_array( $conf['argc'] ) || ! isset( $conf['argc'][0] ) ) {
					continue;
				}
				if ( 'self' === $conf['argc'][0] ) {
					$this->archivers[ $type ][ $mime ]['argc'][0] = 'elFinderVolumeDriver';
				}
			}
		}
	}
}

